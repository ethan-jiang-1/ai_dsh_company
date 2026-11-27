---
status: 修复已落地
severity: P1
opened: 2026-11-27
---

# BUG-406：`pre-push` 无并发上限重跑全量 Vitest 覆盖率触发 CPU 过载，导致多项 1–5s 测试膨胀超时与本机卡顿

> 严重级别：P1（研发效能与稳定性缺陷：单次 `git push` 经 `.githooks/pre-push` 链式执行全部门禁/构建检查后无 `maxWorkers` 上限重跑 304 份 spec 的 V8 覆盖率，单轮累计消耗 >1500s CPU 时间并抢占同机其他进程；高并发下原本 1–5s 通过的测试耗时膨胀 10–30 倍并频发 30s/90s 超时假红）｜发现：2026-11-27｜状态：修复已落地｜去向：note — [2026-11-27-prepush-fast-path-and-test-budget](../../notes/implemented/2026-11-27-prepush-fast-path-and-test-budget.md)｜审查：agent（3 轮独立只读盲审，末轮 BLOCKER: 0）

## 症状

1. **单次 `git push` 重度消耗 CPU 且总耗时失控**：
   - `.githooks/pre-push` 串联运行 `run-gates` + 4×`tsc` + `lint` + `dup` + `smoke:fast` + `pre-push-surfaces` + `test:checks`，最后再调用 [coverage-ratchet.mjs](../../checks/audit/coverage-ratchet.mjs#L48) 跑一遍不带并发限制的全量 `vitest run --coverage`。
   - 2026-11-27 实测单次全量覆盖率：不限 worker 时 `Duration 198.68s (transform 228.82s, import 615.35s, tests 656.43s, environment 80.14s)`（`task-3154`），`--maxWorkers=4` 时 `Duration 357.23s`（`task-2976`），不仅耗时数分钟，还会持续打满多核 CPU 拖慢同机其他并行进程。
2. **高并发 CPU 争抢导致原本正常的回归测试超时假红**：
   - 对比 `--maxWorkers=2 --testTimeout=60000` 全绿运行（304/304 文件，2897/2897 用例通过）与默认/`--maxWorkers=4` 运行的同一批 spec 耗时对比：
     - `company-client-composition.spec.ts`：`3.9s`（`--maxWorkers=2`）→ **`102,956ms` 超出 `90,000ms` 超时失败**（不限 worker）；
     - `structure-agreement.spec.ts`：`2.1s–8.6s` → **`47,836ms` 超出 `30,000ms` 超时失败**；
     - `markdown-shape.property.spec.ts`：`1.5s–1.8s` → **`32,479ms` 超出 `30,000ms` 超时失败**；
     - `bug-coverage.spec.ts`：`5.6s–20.7s` → **`107,413ms`**；
     - `tests/tools/company-static-audit.spec.ts`：单跑 `5.2s`，在 `--maxWorkers=4 --coverage` 并发下两个 `R1`/`R2` 用例命中 `30,000ms` 超时。

## 运行面

- **面 = infra / tests**：
  - [.githooks/pre-push](../../.githooks/pre-push)、[coverage-ratchet.mjs](../../checks/audit/coverage-ratchet.mjs#L47-L53)、[vitest.config.ts](../../vitest.config.ts#L12-L27)；
  - [company-static-audit.spec.ts](../../tests/tools/company-static-audit.spec.ts#L44-L48)（`runVirtual`）。

## 复现

```sh
node checks/audit/coverage-ratchet.mjs
```

- 在本机高并发下观察不带 `--maxWorkers` 限制的 `vitest run --coverage`：多 worker 同时加载 `tsconfigPaths`（指向 `vendor/dsh/tsconfig.base.json` 源码树）+ Vite transform + V8 覆盖率插桩，CPU 争抢导致 `transform/import/tests` 累计时间达上千秒并触发 30s/90s 超时。

## 根因与证据

1. **`coverage-ratchet` 与 `pre-push` 缺并发上限及缓存复用**：
   - [coverage-ratchet.mjs](../../checks/audit/coverage-ratchet.mjs#L48) 直接调用 `pnpm -s exec vitest run --coverage ...`，未限制 `--maxWorkers`；由于 [vitest.config.ts](../../vitest.config.ts#L12-L17) 通过 `vite-tsconfig-paths` 直接挂载 `./vendor/dsh/tsconfig.base.json` 全量源码解析，每个 Vitest worker 都要独立承担海量模块 import/transform 与 V8 coverage 收集开销（`import 615.35s`）。
   - [.githooks/pre-push](../../.githooks/pre-push) 注释原本按「热缓存 29–35s」设计，后续却在末尾无条件 `exec node checks/audit/coverage-ratchet.mjs`，且与 [vitest.config.ts](../../vitest.config.ts#L24)（`不塞进 pre-push`）注释自相矛盾；即便推前已刚跑过同一 HEAD 的全量覆盖率，push 时也不会复用既有 `coverage-summary.json`（`--from-existing`）。
2. **`runVirtual` 重复初始化 TypeScript `Program`**：
   - [company-static-audit.spec.ts](../../tests/tools/company-static-audit.spec.ts#L44-L48) 内每条单测调用 `runVirtual` 均经 `createVirtualProgram` 重建 `ts.createProgram` 并反复解析 TS 标准库声明，在 V8 插桩与多 worker 争抢下轻易突破 30s 默认 `testTimeout`。
3. **高开销全仓扫描 / 500 例属性差分无分组/轻重隔离**：
   - `structure-agreement.spec.ts`（500 例 × mdast）、`markdown-shape.property.spec.ts`（500 例 × mdast）、`company-client-composition.spec.ts` 与 `bug-coverage.spec.ts` 在无 worker 上限的覆盖率扫里与上百个小测试争抢同核 CPU。

## 原则与架构建议（快速迭代优先，仅立案不越界）

> **核心原则**：回归测试、探针和门禁是为快速自信往前跑服务的，**绝不能反过来成为堵死日常迭代的瓶颈**。一切跑得慢的测试、探针、门禁都要系统排查，能用更快等价手段的就替换，确实重型但必须留的则移出热路径并限定资源预算。

1. **审视并清理不合理的重测试 / 过慢测试**：
   - 系统排查耗时居高的 spec 与全量重扫项，识别「每次必跑但设计偏重、投入产出比低」的用例（如每用例冷建完整 `ts.createProgram` 的 `runVirtual`、固定 500 例 `mdast` 属性差分、无过滤每次重扫全仓的脚本，以及同池无 `maxWorkers` 上限触发的相互挤兑）。
   - 为 [company-static-audit.spec.ts](../../tests/tools/company-static-audit.spec.ts) 等 TS 编译期单测共享/缓存 TS 标准库 `SourceFile` 与 `Program`；重型随机属性测试（如 500 例）改为日常轻量抽样（几十例）+ 独立全量档。
2. **热路径（开发环与 `.githooks/pre-push`）严格保快，按改动面精准执行**：
   - 将 `.githooks/pre-push` 收紧为秒级高信号检查：**结构门禁 + 类型 + lint + 按改动面筛选的窄测试集**；与 [vitest.config.ts](../../vitest.config.ts#L24) 注释对齐，不再在每次 `push` 末尾无条件重跑全量 304 份 `vitest --coverage`。
   - 为 [coverage-ratchet.mjs](../../checks/audit/coverage-ratchet.mjs#L48) 增加默认 `maxWorkers` 上限并支持同 commit 复用（`--from-existing`），并将全量覆盖率棘轮下沉为显式发布前/CI 独立车道，避免同机开发多进程时 CPU 过载互相卡死。
3. **浏览器探针与 E2E 车道全量提速与替代降重**：
   - 同步排查 `checks/lanes/` 与 `probes/browser-visual/` 中一切慢链路（例如多个场景各自冷启临时 `dsh` 实例、大量固定 `sleep` 等待、无状态差异却重复起多轮浏览器）：能用事件/DOM 条件等待代替长 `sleep` 的改等待，能合并共享单个运行中实例跑完多个断言（`zh` / `en` / 场景切换 / 错误链）的就复用实例，能用无浏览器/happy-dom/静态契约前置拦截的不再堆进重型端到端。
   - 为所有门禁、回归测试、浏览器探针建立统一的耗时预算与慢项台账，超预算即视作同类性能缺陷优先优化。

## 失败类与同类排查

- **失败类**：性能（并发资源争抢 + O(N×M) 重复解析 + 热路径职责错位导致 30s/90s 假红超时）。
- **同类排查范围（全仓 5 层同步清扫）**：
  1. Vitest 执行底座：`vitest.config.ts`（`pool: 'threads'` + `maxWorkers` 上限）与 `checks/audit/coverage-ratchet.mjs`（并发上限 + 同 `HEAD` 干净缓存复用）；
  2. 全量 305 份 spec 前 6 大慢项：`company-static-audit`（只读 `.d.ts` `SourceFile` 缓存）、`company-client-composition`（去 40 次 `setTimeout(0)`）、`bug-coverage` / `repo-markdown`（消除 `headingSections` 双解析 + `parseMarkdownAst` 有界缓存）、`test-census` / `asset-consumers`（子串快速短路）、`structure-agreement` / `markdown-shape.property`（日常 60/27 抽样 + `generative.e2e.mjs` 1000/90 全量档）；
  3. non-Vitest 慢项：`checks/gates/fix-evidence.mjs`（单次 `git log` 替换 ~800 次子进程）、三个 `tsconfig.test-*.json`（增量 `.tsbuildinfo` 落 `runtime/tsc-cache/`）、`tools/repo/run-check-tests.mjs`（3 并发有序执行）、`tests/support/content-worlds.mjs`（缓存 `package.json`）；
  4. `.githooks/pre-push` 热路径按出站改动面精准分派（`planPrePush` + `checks/pre-push-surfaces.mjs --exec-plan`），`coverage:ratchet` 下沉至 `release:verify` / 周跑 CI / 手动；
  5. 浏览器车道与探针：`client-load.entry.mjs`、`multi-window-banner.entry.mjs`、`client-error-chain.entry.mjs`、`cdp-probe.mjs` 消除固定长 `sleep`。

## 已修判定

- `node checks/audit/coverage-ratchet.mjs --force` 在受限并发（`maxWorkers=4`）下 305/305 文件全绿通过且墙钟 ≤60s（实测 35.03s，累计 CPU 从 >1500s 降至 ~105s，零超时）；
- `checks/run-gates.mjs` 提速至 ~10s（原 28.95s），热 `pnpm typecheck` 提速至 ~3.3s（原 11.1s），`pnpm test:checks` 提速至 ~5.8s（原 21.5s，11/11 PASS）；
- `node checks/pre-push-surfaces.mjs --exec-plan --dry-run` 对 docs-only 走快速路径、对代码/探针按面精准触发且 `asset-lanes.spec.ts` / `lane-match.spec.ts` / `coverage-baseline.spec.ts` / `pre-push-surfaces.test.mjs` 全绿；
- `node checks/lanes/generative.e2e.mjs` 1000 例 + 90 组 + 14 项门禁分支变异全绿。
