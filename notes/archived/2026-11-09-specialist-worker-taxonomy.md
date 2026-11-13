# 2026-11-09 · worker family 与 specialist 的边界（researcher / SA / SQA）

状态：implemented（2026-11-09 交付；researcher→worker-researcher；SA/SQA→specialist；删 leaf；CEO 行改钉；P-L + 全门禁绿）
> 被取代：SA/SQA specialist 已退役，见 [退役 Note](../implemented/2026-11-09-retire-sa-sqa.md)。

上游 = [归档问题卡](../../_backlog/_archive/settled_issues/2026-11-09-specialist-worker-taxonomy.md)；
前序设计 = [presets 委派面的模型化重构](../implemented/2026-11-09-presets-delegation-model.md)（本 Note 修正其 `leaf` 混装）。

## 问题

新模型已有 `worker` family 与 `leaf`，但 `researcher` / `system-architect` / `system-qa` 仍是旧“子人格”形态：

- 模型里三者都是 `leaf`、`contracts: []`，看不出 `researcher` 的只读能力、SA 的 domain skill、SQA 的独立 veto。
- `researcher` 是 generic 只读执行，却占一个顶层角色 preset；`SA/SQA` 是 specialist，却与 generic leaf 同档。
- `namedDelegates` 只记工具名，不记目标 preset；模型不知道 CEO 的 `subagent_research` 指向谁。

## 决定

采用 **worker-researcher + specialist**：

1. `researcher` → `worker-researcher`：worker family 的只读、named-only 能力档。
   - `fs` 只读（`write:false/edit:false`）、fs-search、web、todo；无 bash/compaction/skill/委派。
   - CEO `subagent_research` 行改钉 `agentPreset: worker-researcher`；`researcher` 顶层 preset 删除。
2. `system-architect` / `system-qa` → `archetype: 'specialist'`；保留 preset/YAML 与工具面，模型显式声明：
   - SA：`skills: ['systems-architecture']`，`authority: 'architecture'`。
   - SQA：`skills: ['vv-playbook']`，`authority: 'veto'`。
   - specialist 无 channel/control/workflow/generic spawn；不是 worker profile。
3. 删除 `leaf`；archetype = `lead / full / specialist / worker`。
4. 模型新增 `namedProfiles`（工具 → 目标 preset）与 worker profile `exposure`（`named` / `generic`）；`modelProblems` 校验 specialist 必有 skills、namedProfiles 目标存在、非 specialist 不得有 authority。

## 输掉的方案

- **B：三者都留 specialist**。`researcher` 没有 skill、没有职权，只有只读能力；升 specialist 会把 generic 只读执行伪装成专业方法。
- **C：三者都变 worker profile**。SA 的 V 模型方法和 SQA 的独立 veto 会退化成 prompt/技能文本，制度性独立消失。
- **D：保持 leaf 不动**。模型继续看不见只读/skill/authority，旧 leaf 与新 worker family 并存，正是本次要消除的债。

## 后果

- worker family 现有 `worker` / `worker-researcher` / `worker-orchestrator` 三档；`worker-researcher` named-only，不进 vp-eng generic `allowedAgentPresets`。
- CEO 的 `subagent_research` 语义不变（工具名、brief、只读）；child preset 从 `researcher` 变为 `worker-researcher`。
- SA/SQA 的 persona、skills、工具面、veto 不变；变化只在模型/文档的表述与 spec。
- 旧 Note 的 `leaf` 表述由本 Note 修正；旧文保留决定史，文首加后续指针。
- `preset-smoke` 从 6+5 不变（researcher 换 worker-researcher）。

## 验证

实跑（2026-11-09）：

- `pnpm test tests/presets`：**90 passed**（model 10 / composition 18 / retry 6 / contract 4 / content 52）。
- 红配方：把 CEO 行临时改回 `agentPreset: researcher` → `delegation-composition` 的 `namedProfiles` 与 `presets.spec` 的 CEO 行断言 **2 failed**；还原 → **90 passed**。
- `preset-smoke`：**6 角色 + 5 委派子人格 ALL PASS**。
- P-L 真探针（`probes/team/worker-researcher-probe.mjs`，CEO 会话 `session-82a598aa-e297-4c1c-ab8c-fc1739d70827`）：child `15ec1e9d-78a6-44e9-9987-3641048448d4`，`agentPreset=worker-researcher`、depth=1；工具面无 `bash/write/edit/subagent`；host 注入的 `list_subagents/send_to_subagent` 仍在，它们不是 spawn/write 能力。
- `pnpm test`：**1314 / 163 files**；`pnpm typecheck` 绿；`pnpm lint` 0/0；`pnpm dup` 0 clones；`pnpm verify` **ALL PASS**（含 checks 索引重生成）。
- UI 代码未改；`ui-scene --isolated --golden` 重跑 **ALL PASS（9 页签）**；preset picker 文案来自 preset 列表，无页签/金样变化。

## 未验 / 边界

- `worker-researcher` 的只读能力由 tool-fs 配置强制；模型是否会在长 brief 下试图写盘，未做真模型攻击探针。
- host 注入的 `list_subagents/send_to_subagent` 控制名仍在；它们不等同 spawn/write，但未来若要求“完全无 control 面”需上游/宿主层处理。
- SA/SQA 的 `authority` 目前是模型字段 + persona/skill 约束，不是宿主强制；`veto` 仍是公司制度而非运行时闸。

## 相关

- 前序设计 Note：[presets 委派面的模型化重构](../implemented/2026-11-09-presets-delegation-model.md)（后续指针）。
- 归档卡：[2026-11-09-specialist-worker-taxonomy](../../_backlog/_archive/settled_issues/2026-11-09-specialist-worker-taxonomy.md)。
- 关键文件：[model](../../tools/lib/delegation-model.mjs)、[worker-researcher](../../packages/company-pack/presets/worker-researcher/agent.cordis.yml)、[CEO 行](../../packages/company-pack/presets/ceo/agent.cordis.yml)、[composition spec](../../tests/presets/delegation-composition.spec.ts)、[preset-smoke](../../checks/lanes/preset.entry.mjs)。
