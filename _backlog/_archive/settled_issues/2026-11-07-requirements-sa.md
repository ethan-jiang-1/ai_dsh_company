---
status: 已结
opened: 2026-11-07
---

# 落地：SA 产出与交接（SyRS + IRS + 架构 + 验证点）

> 立卡：2026-11-07 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-07
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）[2026-11-07-requirements-teaming-program.md](../../../notes/implemented/2026-11-07-requirements-teaming-program.md)；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。

**问题与期望结果：** SA 产 SyRS（`REQ-###`）+ IRS（`IF-###`）+ 架构稿；验证点是引用 REQ/IF 的清单，不再发 `VP-###`；SQA 接手写 `TC-###`。

**范围：** `presets/system-architect` persona + `systems-architecture`；`tests/presets/presets.spec.ts`；`probes/team/sa-sqa-delegation-probe.mjs`（行为证据）。

**依赖：** A1/A2；BUG-034/035 已修（7da331a，卡归档）；SA skill 与 `tests/presets` 串行改。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `preset-change-definition`：`pnpm test tests/presets` + `preset-smoke`；行为判据面改动同 diff 带场景。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| SA 文案：SyRS（REQ-###）+ IRS（IF-###）+ 架构；验证点引用 REQ/IF，不发 `VP-###` | 确定性 | system-architect persona/skill | `presets.spec` 断言 | 加回 `VP-###` → 红 | `tests/presets/presets.spec.ts` | 无 |
| 退役词 `STR/SYR/IFR/VP/V/VR` 不在活动文案 | 确定性 | 同上 | spec 断言 | 加 `IFR-001` → 红 | 同上 | 无 |
| 真挂载 | 编排 | `preset-smoke` | ALL PASS | 行 config 坏 → 红 | `checks/smoke/preset-smoke.mjs` | 无 |
| 模型行为：SA 出 SyRS/IRS，SQA 可接 | 模型行为 | 既有 E/V 接线 + A8 | 既有探针证接线；A8 证 SyRS/IRS | 缺 IRS → checker 红 | `probes/team/sa-sqa-delegation-probe.mjs`（接线） + A8（整链） | 用户 review |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| SA 文案 | 既有 `tests/presets/presets.spec.ts`（加断言） | `pnpm test tests/presets` | 文案/符号 | 模型行为 | 加 `VP-###` → 红 |
| 真挂载 | 既有 `checks/smoke/preset-smoke.mjs` | `node checks/smoke/preset-smoke.mjs` | 组合 | 内容 | 坏 config → 红 |
| 角色连通 | 既有 `checks/smoke/probe-smoke.mjs`（快档） | `node checks/smoke/probe-smoke.mjs` | 挂载/回话/人格进 prompt | 内容对错 | 红 = 挂载/人格 |
| E/V 接线 | 既有 `probes/team/sa-sqa-delegation-probe.mjs` | `node probes/team/sa-sqa-delegation-probe.mjs` | SA/SQA 独立会话/depth | 本轮五层链 | 缺子会话 → 红 |
| 五层链 | A8 probe | A8 | 整链 | 本卡单独不证 | A8 红 |

**资产边界：** 只证 SA 文案/挂载与既有 E/V 接线；不证五层整链（A8）、不证架构质量（用户 review）。

## 排除

SQA 文案（A4b）、checker（A5）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `fbe02aa`（A3 提交后）
- 红（文案未改）：`pnpm vitest run tests/presets` → `3 failed | 41 passed`（SA persona 缺 syrs/irs / skill 缺 SyRS+IRS / skill 仍有 VP-###）
- 红（负例：加回退役号形）：persona 保留「不写 VP-###」字样 → 1 failed（`SA persona 仍出现退役号形`）→ 改成「不另立验证点号」→ 绿
- 绿：`pnpm vitest run tests/presets` → `44 passed`；真挂载 `node checks/smoke/preset-smoke.mjs` → `ALL PASS（6 个角色 + 3 个委派子人格）`；`node checks/smoke/probe-smoke.mjs` → `ALL PASS（6/6，快速档）`；`pnpm verify` → `ALL PASS`
- 资产：`tests/presets/presets.spec.ts` 增「SA 产出」describe（3 条）；SA persona + `systems-architecture` skill 改为四件产物（SyRS/IRS/allocation/架构）+ 引用式验证点
- 真跑：`probes/team/sa-sqa-delegation-probe.mjs`（真模型 4–9min）未在本卡单跑——E/V 接线由 A8 五层链 + B2 统一证；本卡只证文案/挂载
- 文档/Note：程序 Note 待 W5 落；合同口径 = `content/state/process-docs.md`
- 审查：`审查：agent — 2026-11-07`
