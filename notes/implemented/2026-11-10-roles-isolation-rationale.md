# 2026-11-10 · 角色隔离决策：六个独立面与 composition 分水岭

状态：implemented（2026-11-10 由原 design/roles-isolation 稿转为 Note；现行语义以 `contracts/` 与 `presets/` 为准）
上游 = [docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)（步 3：design/ → notes/ + architecture.md）

> 现行语义（canonical）= 文末链接；本 Note 只留决定/理由/证据，不复制现行表。

## 决定

- 每角色独立六面：上下文 / 工具 / 知识 / 工作流 / 人格有硬机制；角色间常驻对话 + 每角色独立组合是结构性缺口，按场景选 A/B/C/D。
- composition 继承是机会性的；team 成员继承 Lead，命名 child 由 `agentPreset` 给组合。

## 为什么

- DSH 的 scope/registry 给五面硬隔离（上下文/工具/知识/工作流/人格）；第六面（角色间常驻对话 + 每角色独立组合）没有单一机制，只能按场景选 A/B/C/D。
- composition 继承是机会性的，不是硬依赖；0.2.1 起命名 child 由 `agentPreset` 给完整组合，team 成员仍继承 Lead。
- 选型：隔离优先 → 独立 preset 会话 / SDK；协作优先 → Agent Teams（软隔离 + 独立 session）；不新造调度器。

## 输掉的方案

- 自写 SubagentProvider（M2）作为“官方裂缝”：0.2.1 的 `agentPreset` 已覆盖，不再需要。
- 让 team 成员挂各自 preset、或 workflow 分支带人格：都不满足独立上下文/身份。
- 新建调度器/状态机/第二套记忆：违反“不发明”。

## 证据 / 历史

- 完整原稿：`git show ab0fd622^:docs/design/roles-isolation.md`。
- 0.2.1 源码核对：`packages/subagent/subagent/src/child-agent.ts`、`manager.ts`；活体探针 = `checks/lanes/delegation.entry.mjs`，身份字段 = `list_subagents`。
- 决策台账：[D18 / D22 / D58](../../docs/reference/decisions.md)。

## 现行语义（canonical）

- [contracts/delegation.md](../../docs/contracts/delegation.md) · [contracts/presets.md](../../docs/contracts/presets.md)（四形态）· [architecture.md](../../docs/architecture.md)（通道表）· [runtime-map.md](../../docs/runtime-map.md)。

## 相关

- 现行语义与地图：[docs/architecture.md](../../docs/architecture.md)；文档层规矩：[docs/AGENTS.md](../../docs/AGENTS.md)。
- 上游卡：[docs-dsh-alignment](../../_backlog/_archive/settled_issues/2026-11-10-docs-dsh-alignment.md)。
