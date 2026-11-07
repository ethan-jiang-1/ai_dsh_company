---
status: 待落地
opened: 2026-11-07
---

# 落地：VP-Eng 组队能力与机制合同修正

> 立卡：2026-11-07 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 提交即载体；Note 计划 `2026-11-07-vpeng-teaming.md`（待建）。

**问题与期望结果：** `vp-eng` 加 `vp_cmo`；`eng-teaming` skill（四档决策树）；persona 写明成员不是角色；docs/handbook/UI 的继承说法修正；根=Lead 探针；CEO 不变。

**范围：** `presets/vp-eng`（`vp_cmo` 行、persona、新 skill）；`docs/delegation.md`、`docs/presets.md`、`content/AGENTS.md`、`CultivationBoard.tsx` + 测试；`tests/presets/presets.spec.ts`。

**依赖：** A1/A3/A4a/A4b；BUG-034/035 先落地（SA/SQA/tests 同文件）。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `preset-change-definition` / `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `preset-change-definition`：`pnpm test tests/presets` + `preset-smoke`；行为判据面改动同 diff 带场景。
- 机制事实以 vendor 源码与 keyless 探针为准；不 invent 第二套团队机制。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| `vp-eng` 有 `vp_cmo` 行 maxDepth 2；CEO 的 `vp_cmo` 不动 | 确定性 | preset YAML | `presets.spec` | 删行/改 CEO → 红 | `tests/presets/presets.spec.ts` | 无 |
| `eng-teaming` skill 四档决策树 + 硬规则 | 确定性 | 新 skill | 内容断言 | 删档位 → 红 | 同上 | 用户 review 文案 |
| 文档/手册/UI 继承说法修正 | 文档形状 | delegation/presets/AGENTS/CultivationBoard | spec/verify | 旧说法残留 → 红 | `cultivation-board.spec.ts` 等（待补） + `pnpm verify` | 用户 review |
| 真挂载 + 根=Lead | 编排 | `preset-smoke` + keyless probe | ALL PASS；`agentTeam` lead | 根无 lead → 红 | `preset-smoke` + 新 `vp-eng-root-lead-probe.mjs`（待建，落 probes/team/） | 无 |
| CEO 组队不动 | 确定性 | CEO preset | 无 `vp_cmo` maxDepth 改动；控制行不回归 | 改动 → spec 红 | `presets.spec` | 无 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| preset 行/文案 | 既有 `tests/presets/presets.spec.ts`（加断言） | `pnpm test tests/presets` | 声明 | 模型行为 | 删 `vp_cmo` → 红 |
| 真挂载 | 既有 `checks/smoke/preset-smoke.mjs` | `node checks/smoke/preset-smoke.mjs` | 组合 | 内容 | 坏 config → 红 |
| 根=Lead | 新 keyless probe（web boot） | `node probes/team/vp-eng-root-lead-probe.mjs` | 投影 lead | spawn 成功 | root 无 lead → 红 |
| UI 文案 | 既有 `tests/client/cultivation/cultivation-board.spec.ts` | `pnpm test tests/client` | 文案 | 机制 | 旧文案 → 红 |
| 文档 | `pnpm verify` | `pnpm verify` | 链接/预算 | 语义 | 断链 → 红 |

**资产边界：** 只证 preset/文案/挂载/根=Lead；不证真模型是否组队成功（B2）、不证 teammate 人格（B2 查日志）。

## 排除

真模型 E2E（B2）；CEO 的 `vp_cmo` maxDepth；UI 角色徽标/委派卡 key。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；Note 落 `2026-11-07-vpeng-teaming.md`（待建）；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。
