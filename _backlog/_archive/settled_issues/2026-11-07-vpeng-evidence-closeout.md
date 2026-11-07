---
status: 已结
opened: 2026-11-07
---

# 落地：VP-Eng E2E、CEO 回归与程序收口

> 立卡：2026-11-07 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-07
>
> **结论/去向**：implementation — 提交即载体；程序 Note 由伞卡落 [2026-11-07-requirements-teaming-program.md](../../../notes/implemented/2026-11-07-requirements-teaming-program.md)；本卡负责 docs/decisions/归档，不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[三门材料](../research/vp-eng-teaming/2026-11-07-three-doors.md)；[探针规格](../research/requirements-identification-numbering/2026-11-07-probe-specs.md)。

**问题与期望结果：** 真模型 VP-Eng 包 E2E；teammate/命名 child 的 preset/depth 证据；CEO `product-team-e2e-smoke` 绿；程序 Note/D57/D58/docs/归档。

**范围：** 新 `vp-eng-teaming-probe.mjs`（待建，落 probes/team/）；`checks/smoke/product-team-e2e-smoke.mjs`；`checks/smoke/delegation-smoke.mjs`；程序 Note + `docs/index.md`、`docs/decisions.md`（D57/D58）、`docs/design/role-content-plan.md`（按需）；A1/B1 的合同页（`docs/guides/product-definition.md`、`docs/presets.md`、`docs/delegation.md`）只核对、不改正文；归档。

**依赖：** B1/A8。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `_backlog/methods/requirements-probes.md`：真模型证据；长证据进 teaming 研究材料，短结论回本卡。
- `agent-note-definition` / `close-out-definition`：Note 与收口六行回执。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| VP-Eng 根门 spawn 工程师 + 命名 CMO/SA/SQA；整包产出 | 模型行为 | 排练场真模型 | probe 绿 | 缺专家/缺产物 → 红 | 新 `vp-eng-teaming-probe.mjs`（待建，落 probes/team/） | 用户 review 包 |
| teammate preset=`vp-eng`；命名 child preset 正确；SQA 结论原样 | 模型行为 | child 日志 | probe 断言 | 冒充/删结论 → 红 | 同上 | 用户 review |
| CEO 两件套仍走 team | 模型行为/编排 | `product-team-e2e-smoke` | smoke 绿 | 红 = 破坏 | `checks/smoke/product-team-e2e-smoke.mjs` | 无 |
| 程序 Note（伞卡）/D57/D58 | 文档形状 | 伞卡 Note + decisions | `pnpm verify` + `pnpm notes:audit` | 缺路由 → 红 | 伞卡 + `pnpm verify` | 用户 review Note |
| 索引/台账/合同页核对 | 文档形状 | `docs/index.md` / `docs/decisions.md` + 核对 A1/B1 合同页 | `pnpm verify`（md-links/doc-budget） | 断链/超预算/旧说法 → 红 | `docs/*` + `pnpm verify` | 用户 review 文案 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| VP-Eng 包 | 新 probe（现有 `probes` 形状） | `node probes/team/vp-eng-teaming-probe.mjs` | 组队/专家/产物 | 一般可靠性 | 缺 SQA → 红 |
| CEO 回归 | 既有 `checks/smoke/product-team-e2e-smoke.mjs` | `node checks/smoke/product-team-e2e-smoke.mjs` | CEO team | VP-Eng 包 | 红 = 破坏 |
| 委派边界 | 既有 `checks/smoke/delegation-smoke.mjs` | `node checks/smoke/delegation-smoke.mjs` | 工具面 | VP-Eng 包 | 红 |
| 程序 Note（伞卡）/台账 | 伞卡 Note + docs/decisions + archive | `pnpm verify` + `pnpm notes:audit` | 路由/形状 | 内容 | 缺 D 号 → 红 |
| 索引/台账/合同页核对 | `docs/index.md` + `docs/decisions.md` + 核对 A1/B1 合同页 | `pnpm verify`（md-links/doc-budget） | 链接/预算 | 正文语义 | 断链/超预算 → 红 |

**资产边界：** 只证这一轮 VP-Eng 包与 CEO 回归；不证一般可靠性、不证组织设计好坏（用户 review）。真模型成本约 5–10 分钟，不进 `pnpm test`。

## 排除

重开边界争论；CEO 的 `vp_cmo` maxDepth；UI 徽标/委派卡；A1/B1 合同页正文（只核对）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；程序 Note（伞卡）已落；docs/decisions/归档完成；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `1cae832`（B1 提交后）
- **B2 真跑（VP-Eng 包）**：`node probes/team/vp-eng-teaming-probe.mjs` → **ALL PASS**（root `session-29d0a0bf-9975-403d-a75a-adff4b9bf02c`，slug `2026-11-07-recon-bank-autorecon-v3`）：P1 teammate `prd-detail` 继承 vp-eng 组合/depth 1/parent=根；P2 `cmo`/`system-architect`/`system-qa` 三个命名 child preset 正确；P3 产物 8/8；P4 SQA 裁决词在场 + 包索引点名 SQA；P5 无 final.md
- **CEO 回归**：`node checks/smoke/product-team-e2e-smoke.mjs` → **ALL PASS**（202s；members=[cmo,vp-eng]、任务板 2 条且 PRD blockedBy MRD、未越编）
- **委派边界**：`node checks/smoke/delegation-smoke.mjs` → **ALL PASS**（activation 回执、child 首帧 `agentPreset`、child 无 Team 工具、控制名仍团队版）
- 资产：新 `probes/team/vp-eng-teaming-probe.mjs`（P1–P5，逐次结果落 `runtime/vp-eng-teaming-probe/last-run.json`）；`checks/INDEX.generated.md` 重生成
- 程序 Note：`notes/implemented/2026-11-07-requirements-teaming-program.md`（决定 / 输掉的方案 / 落地提交表 / 验证 / 剩余风险 / 上游卡）；D57/D58 路由已进 `docs/decisions.md`（预算 62→64，论证 = 本 Note）
- docs：`docs/index.md` 两行更新（presets / product-definition）；A1/B1 合同页只核对未改正文
- 归档：11 张执行卡 + 伞卡 `git mv` → `_backlog/_archive/settled_issues/`；两个研究题整目录 → `_backlog/_archive/research/`；活跃/归档索引同步
- 门禁（W5 实跑）：`pnpm verify` ALL PASS；`pnpm test` 150 files / 1218 tests；`pnpm typecheck` 绿；`pnpm lint` 0/0；`pnpm dup` 0 clones；`pnpm notes:audit` 状态行不符 0；`release --check` 未跑（未发版）
- 审查：`审查：agent — 2026-11-07`；用户对照授权原文验收待办
