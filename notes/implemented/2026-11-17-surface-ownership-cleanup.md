# 2026-11-17 · 维护面归属清理：6 个移动 + 声明/实盘对齐

状态：implemented（2026-11-17；任务源 = 用户「把文件整理到最合适的位置，确保声明和真正一致；移动不要副作用，长期正确」）

> 上游 = [D65](../../docs/reference/decisions.md#d65) 的库归属分层。本轮把「声明 ↔ 实盘」的剩余漂移收口，并把归属变成 import 边级守卫。
> 决定台账 = [D66](../../docs/reference/decisions.md#d66)。

## 决定

1. **只移动归属确实错误的 6 个文件**，不做目录级重排：
   - `checks/lanes/lib/`（mutation）→ [`tests/support/mutation.mjs`](../../tests/support/mutation.mjs)：只有 `tests/checks` 消费。
   - `checks/gates/lib/`（pin）→ [`tools/lib/core/pin.mjs`](../../tools/lib/core/pin.mjs)：gates / lane / release / sync-dsh 共用，不是判据。
   - `checks/lib/`（candidate-scan）→ [`tools/lib/company/candidate-scan.mjs`](../../tools/lib/company/candidate-scan.mjs)：judge / show / tests 共用。
   - `checks/lib/`（delegation-model）→ [`tools/lib/company/delegation-model.mjs`](../../tools/lib/company/delegation-model.mjs)：preset/委派面的共享期望模型，judge / show / tests 共用。
   - `checks/gates/lib/`（compat-tags）→ [`tools/lib/core/compat-tags.json`](../../tools/lib/core/compat-tags.json)：gates / release / sync-dsh 共用的兼容台账。
   - `tests/support/`（coverage-baseline）→ [`checks/lib/coverage-baseline.json`](../../checks/lib/coverage-baseline.json)：judge audit 读取的棘轮基线；tests 只消费纯函数。
2. **保留 `candidate-scan-eval`**（不删除）：它是 `状态：已耗` 的可复跑仪器，[testing.md](../../docs/testing.md) 仍声明“恢复语料时重跑”；删除会让该声明失效。保留在 `checks/audit` + 例外表登记。
3. **归属规则写成两轴**：落点（shared / judge / show / gate-local / lane-local / test-only）+ 依赖方向。新增 [`face-boundaries.spec.ts`](../../tests/repo/structure/face-boundaries.spec.ts)：遍历 `tools`/`checks`/`probes`/`tests` 全树，逐 import 边判方向；`checks/lanes/lib` 与 `tests/support` 只许各自子树消费。
4. **清单口径从实现生成**：`checks/INDEX.generated.md` 增加 asset/runner/probe/fixture/tool/query 分类；`CENSUS` 增加 `tests/checks` 的 10 个门禁自测。两处数字不再同名不同义。
5. **文档是 agent 输入，不是普通注释**：README/合同改动同批做语义核对；不碰 `packages/company-pack/src/**`、`cordis.patch.yml` 与 preset 内容，避免改变运行时工具面。
6. **纯移动与语义修改分开 commit**；每个移动一个可回滚提交，先修守卫再搬。

## 输掉的方案

- **把 probes 五域 / tests/tools 一起重排**：高 churn、无行为收益；本轮只把“域按主要证据/失败模式选”写成规则，避免下一轮重复争论。
- **删除 `candidate-scan-eval`**：语料移出本仓但仪器可复跑；删除与 testing.md 的“恢复语料时重跑”冲突。
- **保留 pin 在 `checks/gates/lib`、delegation-model 在 `checks/lib`，只给 show→judge 加豁免**：等于承认“归属按目录不按依赖”，D65 的核心就空了；选择把共享件提升到 `tools/lib`。
- **把 `link-debt.archived` 基线从 4 抬到 20**：用提高天花板掩盖移动造成的断链；改为只修 archived 的 markdown 路径（正文/决定不动）。
- **给 doc-budget 提额来塞新说明**：`tests/README.md` 98/100、`checks/README.md` 58/59，已按“搬/压”处理，未提额。

## 状态事实与载体

- **移动后的家**：`tests/support/mutation.mjs`、`tools/lib/core/{pin.mjs,compat-tags.json}`、`tools/lib/company/{candidate-scan,delegation-model}.mjs`、`checks/lib/coverage-baseline.json`。
- **局部支撑**：`checks/gates/lib`（gate-local）、`checks/lanes/lib`（lane-local，剩 company-root-probe / lease-probe）、`tests/support`（test-only）。
- **唯一入口**：归属规则 = [surface-contract](../../docs/surface-contract.md)；库分组 = [tools/README](../../tools/README.md)；例外 = [surface-exceptions](../../docs/reference/surface-exceptions.md)；agent 导航 = [tests/README](../../tests/README.md) / [checks/README](../../checks/README.md) / [probes/README](../../probes/README.md)。
- **读载体 / 写载体**：读 = 新 agent 的三个 README 与本 Note；写 = 新模块先判 6 个落点，再改 `face-boundaries` 允许的形状。
- **环境坏法**：① 守卫空转（lib 拆组后只扫顶层）→ `layering.spec` 递归 + 非空断言；② 面库反向依赖 → `face-boundaries.spec`；③ 清单口径漂移 → `checks-index.spec` 对账；④ 冻结副本 README 与 wrapper 脱节 → 横幅 + MANIFEST 指纹；⑤ 纯移动触发覆盖率“新文件”误判 → 基线键随家迁移。

## 未覆盖轴

- [covered] keyless 守卫空转修复与负例 → `tests/repo/structure/layering.spec.ts`
- [covered] 例外表路径/类型对账 → `tests/repo/structure/surface-exceptions.spec.ts`
- [covered] 面库依赖方向与局部支撑 → `tests/repo/structure/face-boundaries.spec.ts`
- [covered] 库存 kind 计数与 asset-lanes 对账 → `tests/repo/docs/checks-index.spec.ts`
- [covered] 门禁自测计数 → `tests/repo/budget/test-census.spec.ts`
- [covered] 真挂载：`preset.entry` 6 角色 + 5 support 全过 → `checks/lanes/preset.entry.mjs`
- [environment-gap] 真模型认证档未跑：本轮不改 AGENTS/index/dev-loop/preset 内容；入口链未动 → `checks/lanes/entry-probe.entry.mjs`
- [policy] `probes` 五域与 `tests/*` 分区名不物理重排；只写判定规则，后续要重排另立 RFC → `probes/README.md`
- [environment-gap] `release --check` 只到“源码面通过”；manifest gitSha 因发布后新增提交而滞后，未做 `--prepare/--verify` 重打 → `tools/release/release.mjs`
- [policy] shipped src 的 delegation 注释仍指旧路径：不改，避免任何 pack 源码变更触发 `_dist` 重打；下次 release 重建时同步 → `packages/company-pack/src/lib/delegation/delegation-capabilities.ts`
- [unprovable] 未来新增模块会放对家没有 oracle；由 `face-boundaries` + 三份 README 的判定规则兜底 → `docs/surface-contract.md`

## 验证

| 判据 | 命令 | 层 / 失败类 / 负控（见过红） | 原话 |
|---|---|---|---|
| keyless 守卫不再空转 | `pnpm exec vitest run tests/repo/structure/layering.spec.ts` | 结构 / 服务装配 / 红 | 往 `tools/lib/core` 放 `import { spawn } from 'node:child_process'` → `forbidden builtin: node:child_process`；删除 → 4 passed |
| 例外表对账 | `pnpm exec vitest run tests/repo/structure/surface-exceptions.spec.ts` | 结构 / 文档指针 / 红 | 例外表加 `checks/lanes/zz-fake.mjs` → 路径不存在 + runner 形状不符两条红；删除 → 5 passed |
| 面库方向 | `pnpm exec vitest run tests/repo/structure/face-boundaries.spec.ts` | 结构 / 服务装配 / 红 | `tools/repo` 加 `import '../../checks/lib/entry-probe.mjs'` → `operate 面不得依赖 judge/show/test-only 实现`；删除 → 4 passed |
| 库存对账 | `pnpm exec vitest run tests/repo/docs/checks-index.spec.ts` | 结构 / 文档指针 / 无（纯断言） | 7 passed；INDEX 现为 `32 = 30 assets + 2 runners`、`67 = 66 probes + 1 fixture`、`19 = 17 tools + 1 runner + 1 query` |
| 门禁自测 | `pnpm test:checks` | 结构 / 全类 / 红 | 修前 8 PASS / 2 FAIL（库拆分后旧路径 ENOENT）；修后 10 PASS / 0 FAIL |
| 全量回归 | `pnpm test` | 回归 / 全类 / 见上 | `Test Files 256 passed (256)`；`Tests 2170 passed (2170)` |
| 类型面 | `pnpm typecheck` | 类型 / 工具定义 / 无 | 四个 tsc exit 0 |
| lint / dup | `pnpm lint` / `pnpm dup` | 回归 / 工具定义 / 无 | 0 warnings / 0 errors；0 clones |
| 覆盖率棘轮 | `pnpm coverage:ratchet` | 回归 / 纯逻辑 / 红 | 修前 3 FAILURE（delegation-model 新文件下限 / pin 0% hole）；键迁移 + 豁免后 `PASS（197 文件；豁免 6 条）` |
| 结构门禁 | `pnpm verify` | 结构 / 全类 / 红 | 修前 `link-debt archived 16 > 基线 4`；修后 `ALL PASS；2 门无对象` |
| 冻结副本指纹 | `pnpm verify`（security-scan） | 结构 / 导出形态 / 红 | README 加一行不抬 MANIFEST → `挂载件与冻结清单漂移`；抬 MANIFEST → `指纹 34 件 = 冻结副本` |
| 真挂载 | `node checks/lanes/preset.entry.mjs` | 组合 / 配置组合 / 无 | `preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset 全部可挂载）` |
| 运行态视图 | `pnpm orient` | 回归 / 会话持久化 / 无 | exit 0（含待核工作候选扫描） |

## 移动副作用账

- 6 个文件均为 `git mv`；移动文件内容零改动（`pin`/`mutation`/`delegation-model`/`compat-tags`/`coverage-baseline` 100% similarity；`candidate-scan` 99%，唯一差异是内部 `repo-markdown` 相对路径一层）。
- 消费者全部同 diff 改指新家：`pin` 9 处（含 `export-dist` / `sync-dsh` 的**路径字面量**）、`candidate-scan` 5 处、`delegation-model` 10 处、`mutation` 2 处、`compat-tags` 5 处（pack-shape/release-ready/release/sync-dsh/docs）、`coverage-baseline` 1 处 audit + 2 篇 Note + docs/testing。
- archived / backlog 的 markdown/backtick 路径只做机械修复（delegation-model 16 条；compat-tags / coverage-baseline 随移动改指新家），正文/决定未改；`link-debt` 回到基线 4。
- `checks/lib/ci-security-gates/README.md` 只加当前运行面横幅；MANIFEST 同 diff 抬指纹。
