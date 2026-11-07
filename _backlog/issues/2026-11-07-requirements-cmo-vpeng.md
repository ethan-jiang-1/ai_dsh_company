---
status: 待落地
opened: 2026-11-07
---

# 落地：CMO / VP-Eng 产出与交接（MRD+StRS / PRD only）

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；Note 计划 `2026-11-07-requirements-cmo-vpeng.md`（待建）。

**问题与期望结果：** CMO 产 MRD+StRS（`REQ-###` 任一层，不产 PRD）；VP-Eng 产 PRD（只产品层，`traces` 到 StRS/MR，不产 SyRS/IRS）；共享 `product-definition` 用新词表。

**范围：** `presets/cmo/agent.cordis.yml` + `mrd-playbook`；`presets/vp-eng` persona + `prd-playbook`/`eng-workflow`；`_shared/skills/product-definition`；`tests/presets/presets.spec.ts`。

**依赖：** A1/A2；BUG-034/035 的 `tests/presets` 改动先落地（同文件）。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `preset-change-definition` / `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `preset-change-definition`：`pnpm test tests/presets` + `preset-smoke`；行为判据面改动同 diff 带场景。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| CMO 文案写 MRD+StRS；REQ 任一层；不写 PRD | 确定性 | `presets/cmo` + `mrd-playbook` | `presets.spec` 断言 | 删 StRS → 红 | `tests/presets/presets.spec.ts` | 无 |
| VP-Eng 文案写 PRD only；`traces` 到 StRS/MR；不写 SyRS/IRS | 确定性 | `vp-eng` persona + `prd-playbook` | `presets.spec` 断言 | 加 SyRS → 红 | 同上 | 无 |
| 共享 `product-definition` 用新词表；无退役词 | 确定性 | `_shared/skills/product-definition` | spec 断言 | 加 `STR-001` → 红 | 同上 | 无 |
| 两个 preset 真挂载 | 编排 | `preset-smoke` | ALL PASS | 行 config 坏 → 红 | `checks/smoke/preset-smoke.mjs` | 无 |
| 模型实际产出 CMO/VP-Eng 两段 | 模型行为 | 真模型动议 | A8 probe 绿 | 缺层 → checker 红 | A8 probe（本卡不拥有） | 用户 review 结论 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| CMO/VP-Eng 文案 | 既有 `tests/presets/presets.spec.ts`（加断言） | `pnpm test tests/presets` | 文案/行声明 | 模型行为 | 删关键句 → 红 |
| 真挂载 | 既有 `checks/smoke/preset-smoke.mjs` | `node checks/smoke/preset-smoke.mjs` | 组合能挂 | 内容质量 | 改坏行 config → 红 |
| 模型行为 | A8 的 `requirements-chain-probe.mjs`（待建，落 probes/team/）（后置） | A8 命令 | 模型真产出 | 本卡单独不证 | A8 红 |
| 跨角色交接 | A8 checker | A8 命令 | `traces` 解析 | 语义正确 | 缺 trace → 红 |

**资产边界：** 本卡只证文案/挂载；模型是否照做由 A8 的五层真跑证；不证 MRD/PRD 的业务质量。

## 排除

SA/SQA 文案（A4a/A4b）、checker（A5）。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；Note 落 `2026-11-07-requirements-cmo-vpeng.md`（待建）；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
