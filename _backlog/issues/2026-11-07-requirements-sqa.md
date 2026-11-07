---
status: 待落地
opened: 2026-11-07
---

# 落地：SQA 产出与交接（TC + V&V + 独立结论）

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/）；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[编号共识](../research/requirements-identification-numbering/2026-11-07-consensus.md) / [落地材料](../research/requirements-identification-numbering/2026-11-07-landing-plan.md)。

**问题与期望结果：** SQA 用 `TC-###` 写 V&V（`covers` REQ/IF，层级 L1–L4）；结论原样；不再用 `VP/V/VR`；不写架构/PRD。

**范围：** `presets/system-qa` persona + `vv-playbook`；`tests/presets/presets.spec.ts`；`probes/team/sa-sqa-delegation-probe.mjs`、`probes/team/sa-sqa-quality-audit.mjs`。

**依赖：** A1/A2；BUG-034/035 已修（7da331a，卡归档）；SQA skill 与 `tests/presets` 串行改。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `preset-change-definition`：`pnpm test tests/presets` + `preset-smoke`；行为判据面改动同 diff 带场景。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| SQA 文案：`TC-###`；`covers` REQ/IF；L1–L4；不写 `VP/V/VR` | 确定性 | system-qa persona/vv-playbook | `presets.spec` 断言 | 加 `VP-###` → 红 | `tests/presets/presets.spec.ts` | 无 |
| SQA 结论原样（在场；删除会红） | 模型行为 | 既有 SA/SQA 探针/审计 | probe 断言 SQA 结论在场 | 删结论 → 红 | `probes/team/sa-sqa-delegation-probe.mjs` + `sa-sqa-quality-audit.mjs` | 用户 review |
| 真挂载 | 编排 | `preset-smoke` | ALL PASS | 坏 config → 红 | `checks/smoke/preset-smoke.mjs` | 无 |
| TC 覆盖 REQ/IF | 确定性/模型 | A8 产物 + checker | checker 绿 | 缺 TC → 红 | A8 | 无 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| SQA 文案 | 既有 `tests/presets/presets.spec.ts`（加断言） | `pnpm test tests/presets` | 文案/符号 | 模型行为 | 加 `VP-###` → 红 |
| 真挂载 | 既有 `checks/smoke/preset-smoke.mjs` | `node checks/smoke/preset-smoke.mjs` | 组合 | 内容 | 坏 config → 红 |
| 角色连通 | 既有 `checks/smoke/probe-smoke.mjs`（快档） | `node checks/smoke/probe-smoke.mjs` | 挂载/回话/人格进 prompt | 内容对错 | 红 = 挂载/人格 |
| 独立结论 | 既有 `probes/team/sa-sqa-delegation-probe.mjs`、`sa-sqa-quality-audit.mjs` | 对应 probe 命令 | 结论在场 | 本轮五层链 | 删结论 → 红 |
| 五层链/TC | A8 probe + A5 checker | A8/checker | TC 覆盖 | 语义质量 | 缺 TC → 红 |

**资产边界：** 只证 SQA 文案/挂载与既有 E/V 独立性；不证五层整链（A8）、不证验证判据的业务正确性（用户 review）。

## 排除

SA 文案（A4a）、checker（A5）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `a23ec20`（A4a 提交后）
- 红（文案未改）：`pnpm vitest run tests/presets` → `2 failed | 45 passed`（SQA persona 缺 TC/covers；vv-playbook 缺 layer: V&V/table-rows）
- 绿：`pnpm vitest run tests/presets` → `47 passed`；`node checks/smoke/preset-smoke.mjs` → `ALL PASS（6 角色 + 3 委派子人格）`；`node checks/smoke/probe-smoke.mjs` → `ALL PASS（6/6，快速档）`；`pnpm verify` → `ALL PASS`
- 资产：`tests/presets/presets.spec.ts` 增「SQA 产出」describe（3 条）；`presets/system-qa` persona + `vv-playbook` 改为 `layer: V&V` + `definition: table-rows` + 表头 `covers` + `TC-###`；合同 `content/state/process-docs.md` 补 V&V 层与 covers 列口径；`probes/team/sa-sqa-quality-audit.mjs` 前向兼容 headings 形态（旧表行 / 新标题都认，Q1 对 headings 记 skip）
- 审计探针实跑：`node probes/team/sa-sqa-quality-audit.mjs` → 历史 v8 全绿；旧 run（BUG-034/035 修前）Q8/Q10/Q11 红（10 FAILURE，非本卡引入；探针本来就按「声明了才判」的旧产物审计）
- 真跑：SQA 结论原样的行为证据由 `sa-sqa-delegation-probe`（真模型 4–9min）与 A8 证；本卡未单跑（成本归 A8/B2）
- 文档/Note：程序 Note 待 W5 落
- 审查：`审查：agent — 2026-11-07`
