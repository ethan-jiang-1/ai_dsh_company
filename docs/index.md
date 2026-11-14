# 文档地图与组织原则

> 什么时候读：找某主题的事实家、查决策台账、或不确定该信哪份文档时（白话入口 = [orient.md](./orient.md)）。
> 性质：**当前合同 + 设计依据**——只写 now、随代码同 diff；决定、替代方案与验证证据归 `notes/`。
> 组织原则：**按性质分层，不按时间分层**；**树就是 inventory**——本页只列书架与入口，不逐份登记；新增文档放进对应 tier，顶层门/宪法才逐项列出。分层规矩唯一家 = [docs/AGENTS.md](./AGENTS.md)。

## 先读（按目的）

| 我要… | 先读 | 再读 |
|---|---|---|
| 第一次接管 / 看全貌 | [orient.md](./orient.md) | [project-map.md](./project-map.md) |
| 跑起来 / 演示 | [演示 runbook](./guides/demo-scenes.md#前置本机) | [guides/bootstrap.md](./guides/bootstrap.md) |
| 改代码 / 改角色 | [project-map.md](./project-map.md) | [contracts/presets.md](./contracts/presets.md) / [src/README](../packages/company-pack/src/README.md) |
| 交证据 / 收尾 | [testing.md](./testing.md) | [guides/dev-loop.md](./guides/dev-loop.md) §1/§12 |
| 查某个决定 | [decisions.md](./decisions.md) → [reference/decisions.md](./reference/decisions.md) | 对应 Note |

## 书架（按层）

| 层 | 目录 | 放什么 | 读者怎么进 |
|---|---|---|---|
| 门/宪法 | 顶层 | 每个人都可能先读：入口、架构地图、规范、政策、测试宪法、git 边界、空间/运行态地图、决策门牌 | [AGENTS.md](./AGENTS.md) · [architecture.md](./architecture.md) · [decisions.md](./decisions.md) · [orient.md](./orient.md) · [policy.md](./policy.md) · [testing.md](./testing.md) · [repo-hygiene.md](./repo-hygiene.md) · [content-charter.md](./content-charter.md) · [project-map.md](./project-map.md) · [runtime-map.md](./runtime-map.md) |
| 合同 | [contracts/](./contracts/) | 按主题/子系统的当前语义；随代码同 diff | 进目录按文件名选；先看文件头「什么时候读」 |
| 指南 | [guides/](./guides/) | 怎么做：runbook、环境、排障、发布 | 进目录按任务选 |
| 参考 | [reference/](./reference/) | 查表与登记：D 号、术语、外部材料 | 进目录按需查 |

> 这张表是**书架**，不是清单：tier 内新增文档不逐份登记；目录本身就是 inventory。选文档先看文件头部的「什么时候读」。

### notes/（决策与教训，不进 docs）

| 位置 | 回答什么 |
|---|---|
| `_backlog/issues/` → 用户裁决 → `notes/proposed/` → `notes/implemented/` | 一次决策的来龙去脉（含实际跑过的验证 + 环境状态）。提案纪律 / 状态轴 / 毕业规则 / 分类规矩唯一家 = [notes/README](../notes/README.md)；未成熟问题由 [_backlog/issues/](../_backlog/issues/README.md) 推敲，制度 = [_backlog/README](../_backlog/README.md) |
| [notes/archived/](../notes/archived/) · [notes/rejected/](../notes/rejected/) | 离场目录（D30 起；逐桶判据唯一家 = [notes/README](../notes/README.md)）：archived = 顶层仍能阻止重开的冻结判定（`receipts/` = 只帮复核的历史证据，非否决），rejected = 负知识（`postmortem/` 已于 2026-11-09 裁撤，历史归 git） |

## 按面找 owner

主题事实的 owner；不代表该面在当前提交经过完整覆盖（验证状态见各合同与 Note）。

| 面 | 事实家 / 导航 |
|---|---|
| 机制——公司怎么组装、角色怎么隔离、UI 往哪挂 | [architecture.md](./architecture.md)（地图）+ contracts/（当前语义）+ notes/implemented/2026-11-10-*（why）；源码与运行结论按对应合同核对 |
| 内容——角色说什么话、带什么技能、KB 放哪 | contracts/presets.md + notes/implemented/2026-11-10-role-content-rationale.md（why）+ `company-workspace/.dsh-company/kb/` + `packages/company-pack/content/AGENTS.md`（host 注入，不落盘） |
| 运营——token 怎么省、现场出状况怎么办 | guides/budget-and-ops |
| 流程——任务怎么进、证据怎么交、门禁怎么守 | guides/dev-loop + `notes/` + `checks/run-gates.mjs` |
