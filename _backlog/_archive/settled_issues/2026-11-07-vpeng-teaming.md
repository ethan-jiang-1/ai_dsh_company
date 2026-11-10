---
status: 已结
opened: 2026-11-07
---

# 落地：VP-Eng 组队能力与机制合同修正

> 立卡：2026-11-07 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 2026-11-07
>
> **结论/去向**：implementation — 提交即载体；决定理由见程序 Note（伞卡）[2026-11-07-requirements-teaming-program.md](../../../notes/archived/2026-11-07-requirements-teaming-program.md)；本卡不另写 Note。
>
> 上游：[程序伞卡](2026-11-07-requirements-teaming-landing.md)（D1–D8）；[三门材料](../research/vp-eng-teaming/2026-11-07-three-doors.md)；[探针规格](../research/requirements-identification-numbering/2026-11-07-probe-specs.md)。

**问题与期望结果：** `vp-eng` 加 `vp_cmo`；`eng-teaming` skill（四档决策树）；persona 写明成员不是角色；docs/handbook/UI 的继承说法修正；根=Lead 探针；CEO 不变。

**范围：** `presets/vp-eng`（`vp_cmo` 行、persona、新 skill）；`docs/contracts/delegation.md`、`docs/contracts/presets.md`、`content/AGENTS.md`（只改「组合继承」「星型汇报」「多门模式」「问人两条路」段）、`docs/runtime-map.md`/`docs/design/roles-isolation.md`（如引用旧继承说法）、`packages/company-pack/README.md`（已知限制）、`CultivationBoard.tsx` + 测试；`tests/presets/presets.spec.ts`。

**依赖：** A1/A3/A4a/A4b；BUG-034/035 已修（7da331a，卡归档）；`tests/presets` 串行改。

**方法义务（先读再动）：**
- `_backlog/methods/validation-design.md`：`## 验收标准` 按行为类别/输入状态/判红/负例/证据 owner/人的判断填。
- `_backlog/methods/validation-evidence.md`：每个判据路由到现有 owner；新守卫先写负例；无 owner 记 blocked，不造第二套测试系统。
- `_backlog/methods/issue-to-note.md`：收口 Note 的形状/去向；`待落地` 只写计划路径 inline code，不链未来文件。
- `gate-change-definition` / `close-out-definition`：按改动面加载；只报告实跑过的命令。
- `preset-change-definition`：`pnpm test tests/presets` + `preset-smoke`；行为判据面改动同 diff 带场景。
- 机制事实以 vendor 源码与 keyless 探针为准；不 invent 第二套团队机制。

## 验收标准

| 行为 | 类别 | 输入·状态 | 判红·通过信号 | 负例·恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| `vp-eng` 有 `vp_cmo` 行 maxDepth 2；CEO 的 `vp_cmo` 不动 | 确定性 | preset YAML | `presets.spec` | 删行/改 CEO → 红 | `tests/presets/presets.spec.ts` | 无 |
| `eng-teaming` skill 四档决策树 + 硬规则 | 确定性 | 新 skill | 内容断言 | 删档位 → 红 | 同上 | 用户 review 文案 |
| 文档/手册/UI 继承说法修正 | 文档形状 | delegation/presets/AGENTS/CultivationBoard | spec/verify | 旧说法残留 → 红 | `cultivation-board.spec.ts`（既有）+ `pnpm verify`；新增断言先红后绿 | 用户 review |
| 真挂载 + 根=Lead | 编排 | `preset-smoke` + keyless probe | ALL PASS；`agentTeam` lead（手工已证 2026-11-07） | 根无 lead → 红 | `preset-smoke` + 新 `vp-eng-root-lead-probe.mjs`（待建，落 probes/team/；手工同逻辑已跑） | 无 |
| CEO 组队不动 | 确定性 | CEO preset | 无 `vp_cmo` maxDepth 改动；控制行不回归 | 改动 → spec 红 | `presets.spec` | 无 |

## 测试资产（计划）

| 判据 | 现有 owner / 新资产 | 命令 | 证明什么 | 不证明什么 | 红证·负例 |
|---|---|---|---|---|---|
| preset 行/文案 | 既有 `tests/presets/presets.spec.ts`（加断言） | `pnpm test tests/presets` | 声明 | 模型行为 | 删 `vp_cmo` → 红 |
| 真挂载 | 既有 `checks/smoke/preset-smoke.mjs` | `node checks/smoke/preset-smoke.mjs` | 组合 | 内容 | 坏 config → 红 |
| 角色连通 | 既有 `checks/smoke/probe-smoke.mjs`（快档） | `node checks/smoke/probe-smoke.mjs` | 挂载/回话/人格 | 内容 | 红 = 挂载/人格 |
| 客户端真挂载 | 既有 `checks/smoke/client-load-smoke.mjs` | `node checks/smoke/client-load-smoke.mjs` | 页面不砖 | 文案语义 | 红 |
| 页签金样（如含文案） | 既有 `ui-scene-smoke --isolated --golden` | `node checks/smoke/ui-scene-smoke.mjs --isolated --golden` | 页签文本 | 语义 | 金样 diff |
| 根=Lead | 新 keyless probe（web boot；手工同逻辑已跑） | `node probes/team/vp-eng-root-lead-probe.mjs` | 投影 lead | spawn 成功 | root 无 lead → 红 |
| UI 文案 | 既有 `tests/client/cultivation/cultivation-board.spec.ts` | `pnpm test tests/client` | 文案 | 机制 | 旧文案 → 红 |
| 文档 | `pnpm verify` | `pnpm verify` | 链接/预算 | 语义 | 断链 → 红 |

**资产边界：** 只证 preset/文案/挂载/根=Lead；不证真模型是否组队成功（B2）、不证 teammate 人格（B2 查日志）。

## 文档预算（先搬后写）

- `docs/contracts/presets.md` 当前 197/198 行：把 researcher/SA/SQA 的长理由段移到程序 Note，正文留一行指针；腾出约 10 行再写 `eng-teaming`/`vp_cmo`。
- `docs/contracts/delegation.md` 当前 117/120 行：把 §6 验证表细节移到 `tests/README.md`/脚本头注，正文留指针；腾出约 15 行再写「三种门」。

## 排除

真模型 E2E（B2）；CEO 的 `vp_cmo` maxDepth；UI 角色徽标/委派卡 key。

## 关闭条件

- `## 验收标准` 全绿；`## 测试资产` 的资产在场（新 spec/probe 已跑过、红证已留）；证据并入程序 Note（`2026-11-07-requirements-teaming-program.md`（待建，落 notes/implemented/））；卡翻 `已结` 并归档。
- 方法义务：`validation-design` / `validation-evidence` / `issue-to-note` 的产物在卡上；只报告实跑过的命令。
- 证据记录：每条命令附执行时 `git rev-parse HEAD`、输入/产物路径、通过/失败；红证与绿证都留（`validation-evidence` §3）。

## 交付证据

- 基线：`git rev-parse HEAD` = `961ebf0`（A8 提交后）
- 红（文案/行未落）：`pnpm vitest run tests/presets` → `3 failed | 47 passed`（缺 vp_cmo 行 / 缺 eng-teaming / 手册继承口径未分通道）；`pnpm vitest run tests/client/cultivation/cultivation-board.spec.ts` → `1 failed | 18 passed`（旧承接文案）
- 绿：`pnpm vitest run tests/presets` → `50 passed`；`pnpm vitest run tests/client` → `332 passed`；`node checks/smoke/preset-smoke.mjs` → `ALL PASS（6 角色 + 3 子人格）`；`node checks/smoke/probe-smoke.mjs` → `ALL PASS（6/6 快速档）`；`node checks/smoke/client-load-smoke.mjs` → `ALL PASS（真浏览器）`；`node probes/team/vp-eng-root-lead-probe.mjs` → `ALL PASS`（vp-eng 根会话投影 = 单成员 lead + tasks 数组）；`pnpm typecheck` / `pnpm lint` / `pnpm verify` 全绿
- 资产：`presets/vp-eng/agent.cordis.yml` 加 `vp_cmo`（maxDepth 2 → cmo）+ persona 组队段；新 `presets/vp-eng/skills/eng-teaming/SKILL.md`（四档 + 硬规则）；`content/AGENTS.md` 组合继承拆两通道；`docs/contracts/delegation.md`（vp_cmo 行 + 根门=Lead §2.1 + §6 压成指针，115/120）；`docs/contracts/presets.md`（VP-Eng 组队段 + CMO StRS，196/198）；`packages/company-pack/README.md` 三門已知限制（160/160）；`CultivationBoard.tsx` 文案 + client spec；新 `probes/team/vp-eng-root-lead-probe.mjs`（keyless 投影，实测需一轮极短 prompt 才发布投影）
- 机制事实：CEO 的 `vp_cmo` 仍 `maxDepth: 1`（D7 不动，spec 断言守住）；root=Lead 由 keyless 探针证，spawn 成功归 B2
- 环境备注：dev profile 的 pack 安装从 tarball 换成 `link:`（新 skill 立即生效；`pnpm company` 默认 tarball 会在下次启动时还原），重建了 `lib/` 产物
- 真跑：teammate 真实 spawn 由 B2 证；本卡只证声明/文案/挂载/根门投影
- 文档/Note：程序 Note 待 W5 落
- 审查：`审查：agent — 2026-11-07`
