# 文档地图、组织原则与决策台账

本目录是"虚拟公司多角色插件"项目的文档层。什么时候读 = 找某主题的事实家、查决策台账、或不确定该信哪份文档时（驾驭者白话速读 = [orient.md](./orient.md)）。性质：**当前合同 + 设计依据**——只写 now、随代码同 diff；决定、替代方案与验证证据归 `notes/`（`implemented/` 是当前 rationale owner；已落地且合同才是权威的冻结判定在 `archived/`）。

## 文档组织原则（为什么不是"初始化/"）

**docs/ 按"性质"分层，不按"时间"分层**；分层规矩（放什么/不放什么/长度棘轮/更新时机）唯一家 =
[docs/AGENTS.md](./AGENTS.md)——下面是本目录的**现状登记**，不是规矩。项目运行与目录导航 =
[project-map.md](./project-map.md)；脚本索引 = [checks/README.md](../checks/README.md)（触发与成本以脚本头注为准）。

### 现有文档

| 文档 | 层 | 回答什么 |
|---|---|---|
| [design/architecture.md](./design/architecture.md) | 设计 | repo 形态与组合层（Option A + 单 pack）；角色=preset 纠偏；插件计数（**1 个包**）；四条协作通道；KB 三载体 |
| [design/roles-isolation.md](./design/roles-isolation.md) | 设计 | 每角色独立六面的机制安排；composition 继承分水岭与 `mount()` 裂缝；M1–M4 编排选型；两个诚实的缺口（§4） |
| [design/ui-demo.md](./design/ui-demo.md) | 设计 | Web UI 演示层：现成团队 UI（零代码）、公司皮肤（slots/Remote）、demo 分镜 |
| [design/role-content-plan.md](./design/role-content-plan.md) | 设计 | 角色内容的设计原则与探针设计（persona/skills/KB 分工依据；现时语义唯一家 = [presets.md](./presets.md)） |
| [guides/budget-and-ops.md](./guides/budget-and-ops.md) | 指南 | 限流旋钮总表、成本结构、demo 运维 runbook（症状→动作）、回放复盘 |
| [guides/dev-loop.md](./guides/dev-loop.md) | 指南 | 开发操作手册：任务入口与授权（§0.5）、实施和证据交接（§1）；其余按改动面查调试、发布、双 home 等章节 |
| [guides/bootstrap.md](./guides/bootstrap.md) | 指南 | 冷启动引导（clean checkout → 可跑通）：配方、双面构建与实证坑（2026-09-27 自 dev-loop §7 迁入） |
| [profile.md](./profile.md) | 合同 | host 组合现在时：部署形状（源码直跑/持久安装实测）、行清单语义、开放点 |
| [delegation.md](./delegation.md) | 合同 | 汇报线现在时（R3 出生，0.2.1 复校）：命名委托 = activation（终稿走完成通知、人格由 `agentPreset` 给）与 team 的分工、team shadow 边界与证据、委派工具卡、分层验证 |
| [presets.md](./presets.md) | 合同 | 角色 preset 语义（R2：五角色定稿——CEO / VP-Eng / VP-Sales / COO / CFO；0.2.1 增设委派用的 researcher）；名册运行时实测；验证分层；培养回路与学习载体（D25/D43） |
| [demo.md](./demo.md) | 合同 | demo 操作合同（R4 立场景 C，2026-09-25 补场景 D 季度经营会 / E 事件复盘）：动议、前置、分镜与观测点、验收判据（含**交付物三态**的机器判据）、已知边界 |
| [release.md](./release.md) | 合同 | 发布形状现在时（R5a 出生）：peers / 兼容台账 / 真实安装冒烟（release-smoke）/ 升 pin 程序（sync-dsh） |
| [testing.md](./testing.md) | 合同 | **测试宪法**（2026-10-04 立）：什么算证据——分层与证明边界、改动面→最小证据**政策**（行级映射 = tests/README，2026-10-10 迁家）、证据纪律、资产三分法、自测轮授权、已知未覆盖面与升级地图 |
| [multi-human.md](./multi-human.md) | 合同 | **多人协作现在时**（2026-09-26 出生）：机制边界（卡按会话作用域、成员拉不到人）/ 形态 / 开门 runbook / 协作前提三条 / 迁移清单 / 边界 |
| [runtime-map.md](./runtime-map.md) | 合同 | **运行态地图**：profile / bundle / preset / session / cwd / 日志 / workspace / snapshot 的时序关系与四条状态轴 |
| [project-map.md](./project-map.md) | 合同 | 空间导航：目录逐件 owner、产物落点 |
| [repo-hygiene.md](./repo-hygiene.md) | 合同 | 什么进 git / 什么不进、跨环境规则、例外与执行面 |
| [guides/cdp-probe.md](./guides/cdp-probe.md) | 指南 | 观察窗「呈现即验证」机器腿：client 面改动后的呈现前走查、页面异常定位 |
| [guides/web-rpc.md](./guides/web-rpc.md) | 指南 | 驱动 Web 面会话的 HTTP RPC runbook：脚本化建会话/发 prompt/读日志 |
| [guides/release-runbook.md](./guides/release-runbook.md) | 指南 | 发布五步 runbook：bump/CHANGELOG/prepare/verify/check；产物、manifest 与失败定位 |
| [terminology.md](./terminology.md) | 导航 | 术语映射查表：本项目用法 ↔ DSH 官方 ↔ vendor/dsh 源码直达 |
| [external-research.md](./external-research.md) | 导航 | repo 外研究材料登记与吸收落点（2026-10-20 自 index 迁出） |
| [decisions.md](./decisions.md) | 导航 | 决策台账路由（D 号 → 一句话 → 家；2026-10-20 自 index 迁出） |
| [orient.md](./orient.md) | 导航 | 驾驭者白话七问（只导航，不复述事实） |
| [AGENTS.md](./AGENTS.md) | 规范 | 本层分层规矩唯一家（一处事实一个家 / 长度棘轮 / 更新时机 / 负知识） |

### notes/（决策与教训，不进 docs）

| 位置 | 回答什么 |
|---|---|
| `_backlog/issues/` → 用户裁决 → `notes/proposed/` → `notes/implemented/` | 一次决策的来龙去脉（含实际跑过的验证 + 环境状态）。提案纪律 / 状态轴 / 毕业规则 / 分类规矩唯一家 = [notes/README](../notes/README.md)；未成熟问题由 [_backlog/issues/](../_backlog/issues/README.md) 推敲，制度 = [_backlog/README](../_backlog/README.md) |
| [notes/archived/](../notes/archived/) · [notes/rejected/](../notes/rejected/) · [notes/postmortem/](../notes/postmortem/README.md) | 离场与复盘目录（D30 起；逐桶判据唯一家 = [notes/README](../notes/README.md)）：archived = 仍能阻止重开的冻结判定，rejected = 负知识，postmortem = **事故复盘** |
## 决策台账（路由表）

D 号 → 一句话 → 家的路由表已迁 [decisions.md](./decisions.md)（本页只留路由；决定正文仍住 Note）。
## 文档路由

主题事实的 owner；不代表该面在当前提交经过完整覆盖（验证状态见各合同与 Note）。

| 面 | 事实家 / 导航 |
|---|---|
| 机制——公司怎么组装、角色怎么隔离、UI 往哪挂 | design/architecture + design/roles-isolation + design/ui-demo；源码与运行结论按对应合同核对 |
| 内容——角色说什么话、带什么技能、KB 放哪 | design/role-content-plan + presets.md + `company-workspace/kb/` + `company-workspace/AGENTS.md` |
| 运营——token 怎么省、现场出状况怎么办 | guides/budget-and-ops |
| 流程——任务怎么进、证据怎么交、门禁怎么守 | guides/dev-loop + `notes/` + `checks/run-gates.mjs` |

## 外部研究材料登记（repo 外，只读引用）

登记表已迁 [external-research.md](./external-research.md)（本页只留路由；索引不再承载外部材料表）。
