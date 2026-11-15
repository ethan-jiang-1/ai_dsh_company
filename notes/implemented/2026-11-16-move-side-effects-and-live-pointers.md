# 2026-11-16 · 搬移副作用的非静态消费者：配置键、构建字面量、活指针、会漂计数

状态：implemented（2026-11-16 落地）

上游 = 用户 2026-11-16「_backlog/bugs 这里头有不少当借助 exploratory test 发现的 bug，你系统性地看一看，考虑考虑怎么修复，他们给你 setup goal 目标是修复所有的 bug」；
来源 = 探索卡 [Round 92](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C11 搬移副作用）；批次记录与逐卡判定 = [_backlog/bugs/README.md「2026-11-16 修复交接」](../../_backlog/bugs/README.md)；归档 = [_archive/fixed_bugs](../../_backlog/_archive/fixed_bugs/README.md)。

## 决定

三批纯搬移（`29ae8c94` tests 分轴 → `1eb14f46` src↔tests 对齐 → `57d34a34` tools 四组）之后，静态 import 之外的
四类消费者没有随迁，且**都对未命中静默**。本批把它们各收成一条机械判据，而不是只改这一轮的字节：

1. **配置键必须命中文件**（184/186）。`vitest.config.ts` 的 `coverage.thresholds` 是路径键表，vitest 对
   不存在的键不报错；host 分组搬移后 5 条 floor 静默失效。新 spec
   `tests/repo/budget/vitest-coverage-thresholds.spec.ts` 断言每个键存在、落在 pack 源码面（`packages/company-pack/src/`）内、
   同时给 statements 与 branches，且阈值表非空。同一语义扩到 pre-push 面规则：`tools/lib/asset-lanes.mjs` 的
   `SURFACE_RULES` 增 `src/lib/** → replay`（lib 的构建产物由 replay 直接 import）、`src/index.ts` /
   `cordis.patch.yml → preset`；**没有额外 lane 的面必须写 `coveredBy`**（词表 = `UNCONDITIONAL_STEPS`），
   `selectSurfaces` 返回 `covered` / `unseen`，`pre-push-surfaces.mjs` 逐条打印豁免、不再静默。
2. **构建产物路径字面量必须对到现行源码**（185）。`checks/` 的字符串 import 不在 tsconfig 解析面；新 spec
   `tests/repo/structure/built-path-literals.spec.ts` 把 `lib/types/<p>.js` 映射到 `src/<p>.ts(x)`，构建树在场时
   还要求产物存在——旧扁平字面量不能靠陈旧产物续命。
3. **live 载体的 `tests/*.spec.ts` 必须现行**（187/188/189/190）。注释、`notes/implemented`（反引号与纯文本都扫）、
   `checks/audit` 三面各一条判据（`tests/repo/docs/live-pointer-paths.spec.ts`）；`notes/archived`、归档卡与
   `snapshots/` 是冻结层，显式不扫。187 的同类补漏把两处更早的 cultivation 指针一并修掉。
4. **会漂的计数只留公式**（191）。live 文档不写 `x/y spec` 分数，写「覆盖 = 三个 `tsconfig.test-*` 的
   include 减 exclude」并指向配置；`tests/repo/docs/typecheck-coverage-claim.spec.ts` 守导航面。
   本批新增 4 份 spec 后实测并集 231→235 —— 分数写法在同一天就会再次过期，正是删掉它的理由。

共同不变量：**搬移只改静态 import 不算完成；每个「按路径找东西」的注册表都要有「键/路径必须命中真实文件」的
机械消费者，且豁免本身也要登记。**

## 输掉的方案

- **逐症状只改字节**（只改 5 个阈值键 / 6 条注释）：下一轮搬移会再制造同类；守卫才是修。
- **把 `src/host` / `tools` 映射到 `company-entry`**：该 lane 要 `_dist` tarball（缺则 exit 2）、成本 ~1–2 min、
  登记在 weekly；塞进 pre-push 同时违背成本边界与「没有 tarball 的开发树」可用性。`tools → preset` 语义也不成立
  （preset 不加载工具面）。采用 `coveredBy` 显式申报，而不是给每个面安一条假 lane。
- **把 `notes/implemented` 扩进 `command-refs` 的 activeDocs**：它只认反引号命令，189 的纯文本路径照样漏；
  用窄面 spec 只认 `tests/*.spec.ts`，噪声与语义都更可控。
- **给 `bare-path` 加源码注释扫描**：把 Markdown 的裸路径语义带进代码注释，且无法区分「历史叙述」；
  独立 keyless spec 才能按载体排除冻结层。
- **保留文档分数并加一致性断言**：断言要绑 `tsc --listFilesOnly`（慢、环境耦合），且每次搬移仍需人同步；
  公式没有数字可漂。
- **把 191 同步成 231/249**：本批新增 spec 后立刻变 235/253，证明「同步分数」是错误方向。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 配置键 / 构建产物字面量 / live 指针 / 文档计数四类载体必须命中真实文件；面规则必须有可执行的证据映射（asset 或 `coveredBy`），未命中不静默 |
| 唯一入口 | `vitest.config.ts`（阈值键）；`tools/lib/asset-lanes.mjs`（`SURFACE_RULES` / `UNCONDITIONAL_STEPS` / `selectSurfaces`）；`checks/pre-push-surfaces.mjs`（打印与 `--paths`）；`checks/lanes/replay.e2e.mjs`（动态 import） |
| 读载体 | `.githooks/pre-push`、`pnpm test`、`pnpm typecheck`、`pnpm verify`（bare-path / command-refs / script-index） |
| 契约测试 | `tests/repo/budget/vitest-coverage-thresholds.spec.ts`、`tests/repo/structure/built-path-literals.spec.ts`、`tests/repo/docs/live-pointer-paths.spec.ts`、`tests/repo/docs/typecheck-coverage-claim.spec.ts`、`tests/repo/budget/asset-lanes.spec.ts`、`tests/tools/lane-match.spec.ts` |
| 活载体修订 | 5 条源码注释 + 2 篇 implemented Note + 1 条 audit 注释 + 2 份 live 文档（`docs/testing.md` / `docs/guides/dev-loop.md` / `tests/README.md`） |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| keyless unit（4 份新 spec + 扩展的 asset-lanes = 26 passed；lane-match 10 passed；backlog-liveness 36 passed） | 配置组合 / 导出形态 / 文档指针 | 阈值键留旧路径 → 5 `MISSING`；replay 留旧字面量 → `MODULE_NOT_FOUND` + spec 红；`src/**` 5 条 + notes 2 条 + audit 1 条旧指针 → 红；两份文档分数 → 2 条红；删 `src/lib` 规则 → `unseen` 非空 + spec 红 |
| 真入口 `node checks/lanes/replay.e2e.mjs` | 导出形态 | 修前 `1 FAILURE(S)`（`Cannot find module …/lib/types/lib/presence.js`）；修后 `ALL PASS`（11s，归一化日志零 diff） |
| pre-push dry-run `--paths` | 配置组合 | `src/lib/presence/presence.ts` → 修前「未触发」、修后 `→ replay`；`tools/dev/company.mjs` → 「无额外 lane；证据 = 无条件 test:checks + coverage-ratchet + verify」 |
| 全量 `pnpm test` | — | 253 files / 2145 tests 全绿；`pnpm verify` ALL PASS；`pnpm typecheck` exit 0；`pnpm lint` / `pnpm dup` / `pnpm smoke:fast` / `pnpm test:checks` 全绿 |
| `pnpm coverage:ratchet` | — | PASS（197 文件）；`tools/lib/asset-lanes.mjs` 100/98.33、`tools/lib/backlog-liveness.mjs` 98.29/93.89 均高于基线（后者顺带补了 2026-11-15 新增分支的负例） |

## 未覆盖轴

- [unprovable] 「三批搬移之外是否还有别的搬移副作用」没有穷举 oracle；本批只证四类载体 → `_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md`
- [environment-gap] Windows 实机 / clean clone 未跑（本批只在本机 macOS + 完整构建树上验证）→ `_backlog/triggers.md`
- [covered] 面规则覆盖面与 `coveredBy` 词表 → `tests/repo/budget/asset-lanes.spec.ts`
- [policy] weekly 慢档（company-entry / release）不进 pre-push 的成本边界 → `docs/testing.md`
