# 00 · 文档地图、组织原则与决策台账

本目录是"虚拟公司多角色插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；单次决策与时间线归 `notes/`（intents → proposed →
implemented → archived）。

## 文档组织原则（为什么不是"初始化/"）

**docs/ 按"性质"分层，不按"时间"分层。** 时间维度的东西（初始意图、提案、已废方案）住
`notes/`：一份"初始化文档"要么始终为真（那它就是当前文档，按主题归位），要么已经失真
（那它是历史，归 notes/ 或交给 git）。按时间分目录必然长出"烂尾层"。

| 层 | 目录 | 性质 | 生命周期 |
|---|---|---|---|
| 导航 | 本文件 | 地图 + 台账 | 活（每决策/每新文档更新） |
| 设计 | `design/` | **为什么**：机制依据、方案取舍 | 稳定；被推翻时整个归档并在台账记 D 号 |
| 计划 | `plans/` | **接下来**：阶段表 | 被实现逐阶段吞掉（验收→合同，决策→notes） |
| 指南 | `guides/` | **怎么操作**：runbook、预算限流 | 活（随操作方式演进） |
| 合同 | 顶层（按主题） | **是什么**：某子系统现在时语义 | 随代码同 diff，只写 now |

## 文档地图

### 现有文档

| 文档 | 层 | 回答什么 |
|---|---|---|
| [design/10-architecture.md](./design/10-architecture.md) | 设计 | repo 形态与组合层（Option A + 单 pack）；角色=preset 纠偏；插件计数（**1 个包**）；四条协作通道；KB 三载体；目录树 |
| [design/20-roles-isolation.md](./design/20-roles-isolation.md) | 设计 | 每角色独立六面的机制安排；composition 继承分水岭与 `mount()` 裂缝；M1–M4 编排选型；两个结构性缺口 |
| [design/30-ui-demo.md](./design/30-ui-demo.md) | 设计 | Web UI 演示层：现成团队 UI（零代码）、公司皮肤（slots/Remote）、demo 分镜 |
| [design/40-role-content-plan.md](./design/40-role-content-plan.md) | 设计 | 四个角色的内容设计：persona 要素、skills 清单、KB/模板骨架、入戏探针（文案待 Q4） |
| [plans/roadmap.md](./plans/roadmap.md) | 计划 | 阶段表：0 立环 → 1 角色+内容 → 2 团队 demo → 3 汇报线 → 4 成品 → 5 UI+门禁 |
| [guides/50-budget-and-ops.md](./guides/50-budget-and-ops.md) | 指南 | 限流旋钮总表、成本结构、demo 运维 runbook（症状→动作）、回放复盘 |

### 合同出生地图（顶层，实现到哪生到哪——不预建空文件）

| 将出生的合同 | 诞生阶段 | 内容来源 |
|---|---|---|
| `profile.md` | 阶段 0 收尾 | host 行清单的"现在时"+ presets roots 的真实部署路径（消除 design/10 §6 的 TODO） |
| `presets.md` | 阶段 1 | 四角色 preset 的语义合同（persona 定稿、skills 清单、验证方式）——40 号骨架升格 |
| `demo.md` | 阶段 2 | demo 操作合同：剧本、分镜、观测点（30 §3 分镜落地后的现在时） |
| `delegation.md` | 阶段 3 | 命名委托工具的语义（工具行、persona 文案、续驶路径） |
| `release.md` | 阶段 5 | 发布形状：peers、compatibility 矩阵、真实安装冒烟程序 |

## 决策台账

### 已定（写代码前不再讨论）

| # | 决定 | 依据/出处 |
|---|---|---|
| D1 | **自写包 = 1 个**（company-pack）；行多包少，角色是 preset 目录不是包 | 10 §2；FAQ 13 决策 2 |
| D2 | 角色 = agent preset（persona row + 自有 skills/ + 角色工具行），共享行放 host/profile 层、preset 只放差异 | 10 §1/§6；cordis preset 两平面教义 |
| D3 | repo 形态 = FAQ 13 方案 A：独立 repo + `vendor/dsh` pinned submodule + 双 home | 10 §6；FAQ 13 |
| D4 | **demo 主通道 = Agent Teams（M4/通道 B）**；"事件从 CEO 进出"由 Lead-only 权威模型内建 | 10 §2.2 + plans/roadmap；用户 demo 需求 |
| D5 | 第 0 天零自定义 JS：纯配置 pack + 现成 team profile bundle 即可跑通 demo v0（注：阶段 3 加 continuable 委托前，把 team 两包改为直插我们 profile 的行——bundle 会 disable 全局续驶控制，见 10 §3 通道 A 冲突注） | 10 §2.1/§3；30 §1 |
| D6 | UI 分层：第 0 层用现成 `client-ui-agent-team`；皮肤层进同一 pack 的 client 面（`dsh.client` + tsdown） | 30 §0/§2 |
| D7 | KB 三载体分层：产品化角色知识→preset skills；公司手册→全局/project root；活数据→workspace 文件 | 10 §5 |
| D8 | 跨会话角色记忆 = workspace journal 文件（`kb/<role>/journal/`） | 20 §4.2 |
| D9 | 上游缺口（常驻对话+独立组合）若成刚需→走 FAQ 13 方案 B 提 seam（`ChildComposition` 加 preset 字段），不 vendor patch | 20 §4.1 |
| D10 | **docs/ 按性质分层（导航/设计/计划/指南/合同），不按时间分层**；初始意图归 `notes/intents.md`（否决"初始化/"目录方案） | notes/implemented/2026-09-21-docs-layering.md |

### 待定（阻塞项标 ⛔）

| # | 问题 | 影响面 | 何时必须定 |
|---|---|---|---|
| Q1 | M2 的 one-shot 形状是否满足"跟 VP 的连续对话"需求？若否→推 D9 上游 seam 或上 M3 | 阶段 3 之后的增强路线 | 阶段 2 跑完 demo 后 |
| Q2 | 角色是否需要不同模型路由？影响 preset 行与委托工具 `agentOptions` | 内容设计、成本 | 阶段 1 前（定 persona 时一起定） |
| Q3 | 公司手册哪些随 pack 发布、哪些留 workspace 活数据？ | KB 骨架 | 阶段 1 中 |
| Q4 ⛔ | 第一场 demo 的动议主题 | 探针任务、预算、剧本 | **开工前** |

## 覆盖状态（2026-09-21 审计 + 重构）

| 面 | 覆盖 | 文档 |
|---|---|---|
| 机制面（组合/隔离/协作/UI 扩展点） | ✅ 充分，全部钉到源码 | design/10、20、30 |
| 内容面（persona/skills/KB/模板实际内容） | ⚠️ 骨架已立，文案待填（Q4） | design/40 |
| 运营面（预算限流/runbook/回放） | ✅ 骨架+数值 | guides/50 |
| 流程面（notes/ 纪律、门禁脚本） | ✅ 方案已定，目录已落地 | 10 §6 + notes/ + scripts/verify.mjs |

## 术语映射（本项目用法 ↔ DSH 官方）

| 本项目 | DSH 官方 |
|---|---|
| 角色（CEO/VP…） | agent preset（`presets/<id>/agent.cordis.yml` + persona + skills） |
| 组织/公司 | 一个 host profile + preset roster（`dsh-agent-presets` roots） |
| worker（角色底下干活的一次性代理） | one-shot subagent（`dsh-tool-subagent`，spawn provider） |
| 派活/汇报线 | 命名委托工具（通道 A / M2） |
| 会议/任务板/邮箱 | Agent Teams（`ctx.agentTeams`，experimental） |
| 通道 A/B/C/D（机制） | 命名委托 / Agent Teams / dsh-sdk 子进程 / workflow 脚本（10 §3） |
| M1–M4（用法/编排） | 人中继 / 隔离委托 / SDK 编排器 / 团队（20 §3；与通道映射表在 10 §3 篇首） |
| 驾驶舱 | Company 右栏页签（`sidebarRightTabs` + Remote 读模型，30 §2） |
| 交付物 | `present` 工具的 explicit deliveries（30 §1） |
