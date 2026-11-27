# 2026-11-27 · `docs/` 架构主干补齐、全量对齐与单向依赖收口

状态：implemented（2026-11-27；批准：用户「整理整理，同步同步，对齐对齐……docs/ 尽量别依赖 _backlog/ 可以依赖 notes/……选项 B / 选项 A / doc-taxonomy 门禁」；部分取代 [2026-11-10-docs-dsh-alignment.md](./2026-11-10-docs-dsh-alignment.md) 的 tier 集合与导航结构，并部分演进 [2026-11-10-materiality-and-trace-decision.md](./2026-11-10-materiality-and-trace-decision.md) 将材料性唯一定义迁入 `docs/policy.md §P1-B`；部分被 [2026-11-27-docs-16-file-standard-alignment.md](./2026-11-27-docs-16-file-standard-alignment.md) 取代：合入顶层 6 文件 + 三分区 16 文件骨架）

## 决定

1. **确立内部技术架构主干层**：新增 [`docs/contracts/host-and-lib.md`](../../docs/contracts/host-and-lib.md) 与 [`docs/contracts/client-ui.md`](../../docs/contracts/client-ui.md)，保持原有 [`docs/architecture.md`](../../docs/architecture.md)（升级为架构总纲）、[`docs/README.md`](../../docs/README.md) 及全部 `contracts/`、`guides/` 路径不变（零历史归档断链），并在 [`docs/README.md`](../../docs/README.md) 统一呈现分层书架与 Agent/人类双起点导航。
2. **确立 `docs/` 单向依赖边界并收回跨仓政策**：
   - `docs/` 只能依赖代码实现与已定型 `notes/`，禁止出现指向 `_backlog/` 的 Markdown 链接（纯拓扑说明用反引号代码跨度）；
   - 将「材料性（materiality）」唯一定义与「缺陷修复自授权边界」收回 [`docs/policy.md`](../../docs/policy.md) `§P1-B`，[`_backlog/README.md`](../../_backlog/README.md) 与 [`close-out-definition`](../../.agents/skills/close-out-definition/SKILL.md) 改为单向引用 `docs/policy.md`；
   - `_backlog/methods/` 保留原地，在 [`_backlog/methods/README.md`](../../_backlog/methods/README.md) 明确定位为「`_backlog/` 专属内部作业手册」，切断 `docs/` 对其所有链接；
   - 将上述规则并入既有 [`checks/gates/doc-taxonomy.mjs`](../../checks/gates/doc-taxonomy.mjs)（`TIER_DIRS` 扩入 `architecture`，并消费共享 AST 原语 `parseMarkdownAst` 扫描 `docs/**/*.md` 的 `link` / `definition` / `image` 节点），不新增 gate 文件，遵守 [`docs/policy.md`](../../docs/policy.md) 门禁总数只降不升棘轮。
3. **全量内容与台账对齐（D70）**：
   - [`docs/decisions.md`](../../docs/decisions.md) 清零全部 `_backlog/` 链接、修正 D6 / D43 过期 UI 口径，并补齐 D67–D70；
   - 同步 [`docs/reference/glossary.md`](../../docs/reference/glossary.md)、[`docs/contracts/data-model.md`](../../docs/contracts/data-model.md)（补 `startup.json`/`startup-options.json`/`overrides/`/`logs/` 与宿主工作语言偏好，按此论证将 `doc-budget` 上限由 40 调至 44；[`docs/README.md`](../../docs/README.md) 棘轮下调 48→42）、[`docs/contracts/profile.md`](../../docs/contracts/profile.md)、[`docs/contracts/cultivation.md`](../../docs/contracts/cultivation.md)、[`docs/contracts/presets.md`](../../docs/contracts/presets.md)、[`docs/guides/demo-scenes.md`](../../docs/guides/demo-scenes.md)、[`docs/guides/multi-human-runbook.md`](../../docs/guides/multi-human-runbook.md)、[`docs/guides/dev-loop.md`](../../docs/guides/dev-loop.md) 与 [`docs/guides/run-ops.md`](../../docs/guides/run-ops.md)。

## 输掉的方案

- **大挪 `docs/` 顶层与 `guides/` 目录结构**：全仓相对链接中 `docs/contracts/` 被引用 601 次、`docs/guides/` 540 次（多在冻结归档层，`notes-archived-links` 强制查断链），物理搬迁会造成大面积归档链接失效；改用「稳定物理路径 + 新增 `docs/contracts/` + 重做 `index.md` 分层导览」零断链达成清晰心智模型。
- **把 `_backlog/methods/` 迁进 `docs/guides/` 或 `.agents/skills/`**：违背用户选定的轻改方案（选项 B），且这些作业手册强耦合 `_backlog/` 问题卡与缺陷卡流程；留在原地并切断 `docs/` 对其反向依赖边界最干净。
- **新建独立 `docs-no-backlog-links.mjs` 门禁文件**：违反 `policy §P2` 门禁总数只降不升棘轮；直接并入既有 `doc-taxonomy.mjs`（同样守护 `docs/` 分层规范）。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| `docs/` 分层与 `docs/` ↛ `_backlog/` 规则 | [`docs/AGENTS.md`](../../docs/AGENTS.md) · [`doc-taxonomy.mjs`](../../checks/gates/doc-taxonomy.mjs) | 门禁以 `parseMarkdownAst` 读 `docs/**/*.md` 与 `docs/README.md` |
| 内部技术架构主干（Host/Lib 与 Client UX） | [`docs/contracts/host-and-lib.md`](../../docs/contracts/host-and-lib.md) · [`docs/contracts/client-ui.md`](../../docs/contracts/client-ui.md) | 随 [`src/index.ts`](../../packages/company-pack/src/index.ts) 与 [`src/client/index.ts`](../../packages/company-pack/src/client/index.ts) 同 diff 维护 |
| 材料性与缺陷修复自授权边界 | [`docs/policy.md`](../../docs/policy.md) `§P1-B` | [`_backlog/README.md`](../../_backlog/README.md) 与 [`close-out-definition`](../../.agents/skills/close-out-definition/SKILL.md) 单向链接 |
| 架构决策路由 D1–D70 | [`docs/decisions.md`](../../docs/decisions.md) | `ledger-routing` 门禁核对锚点、字长与链接 |

## 验证

| 层 | 失败类 | 负控（见过红）与实跑结果 |
|---|---|---|
| 结构门禁 `pnpm verify` | 分层/依赖边界/预算/台账 | **真红→还原→绿（2026-11-27）**：`docs/README.md` 临时追加 `[probe](../_backlog/README.md)` → `FAIL doc-taxonomy: docs/README.md:40 → 禁止 docs/ 链接 _backlog/（../_backlog/README.md；_backlog 为上游探索区，重要结论请先升格 notes/ 再引用）`；还原并清零本 Note `bare-path` 假路径后，本变更所涉全部门禁（`bare-path`、`doc-taxonomy` 11 顶层 + 29 tier + 零 `_backlog` 链接、`doc-budget` 全部 80%–95% 窗口、`ledger-routing` D1–D70、`nav-count-claims` ×123、`md-links` ×8608 / 979 files、`notes-liveness`/`notes-axes`/`notes-supersession`）**均 PASS**（工作区另存在并行 BUG-396 未提交改动导致的 `guard-red-record` 失败，非本次改动面） |
| 门禁单测 `pnpm test:checks` | 门禁回归与双向边界 | 初跑因测试夹具相对层级少一层（将路径错误解析到 `docs/` 下不存在的子目录）红 1 项；修正夹具为 `../../_backlog/README.md` 后 **11/11 PASS**（`gates-negative.test.mjs` 验证 `architecture/`+反引号 `_backlog/` 绿、`_backlog` Markdown 链接红、未知 tier 红） |
| Notes 审计 `pnpm notes:audit --strict` | 取代回链与路径时效 | **PASS**（`implemented 133 / archived 197 / receipts 32`，硬项 0） |
| 结构/文档/工具回归 `npx vitest run tests/repo/structure/ tests/tools/lane-match.spec.ts tests/tools/repo-markdown.spec.ts tests/session/entry-probe.spec.ts` | 分层与入站入口 | **16 files / 104 tests passed**（注：全量 `pnpm test` 实跑 298/303 passed，剩余 5 项失败均属同工作区并行中的 BUG-394..396 事务：`company-static-audit` 报 `company-hq.tsx:428`、3 个 `BUG-396` client 用例、`BUG-COVERAGE.generated.md` 随 BUG-394/395 归档漂移，与本次 `docs/`+门禁改动面无关） |

## 语义审阅

- **首轮独立盲审（`1c1e44d9-fb64-454f-b0f6-d526170afbee`，`policy.md §P5` 四项判据）**：指出 1 项 Blocker（Note 第 37 行反引号写出不存在路径触发 `bare-path` 红，且不能在 `guard-red-record` 并行失败下泛称 `pnpm verify` 全绿）及 3 项建议（`docs/README.md` 与 `docs/architecture.md` 残留「公司视图」旧称、`docs/contracts/host-and-lib.md` 补写 `src/host/` 编译输入、`doc-taxonomy.mjs` 纳入 `image` 节点）；已全部清零并复验通过。
- **复核结论（`1c1e44d9-fb64-454f-b0f6-d526170afbee`）**：**PASS（0 Blocker）**。

## 未覆盖轴

- [covered] `docs/` 分层、`docs/` ↛ `_backlog/` AST 门禁、行数预算、链接封闭性、台账 D1–D70 连续性与无计数声明 → [`checks/gates/doc-taxonomy.mjs`](../../checks/gates/doc-taxonomy.mjs)
- [covered] `doc-taxonomy` 双向行为（合法 `architecture/` + 反引号 `_backlog/` 放行 vs `_backlog` 链接 / 未知 tier 报红） → [`tests/checks/gates-negative.test.mjs`](../../tests/checks/gates-negative.test.mjs)
- [policy] 本次为纯文档结构、政策边界与静态门禁变更，不涉及运行时行为、浏览器渲染或真模型推理路径改动 → [`docs/testing.md`](../../docs/testing.md)
