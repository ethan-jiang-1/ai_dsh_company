# 文档地图、组织原则与决策台账

本目录是"虚拟公司多角色插件"项目的文档层。什么时候读 = 找某主题的事实家、查决策台账、或不确定该信哪份文档时（驾驭者白话速读 = [orient.md](./orient.md)）。性质：**当前合同 + 设计依据**——只写 now、随代码同 diff；决定、替代方案与验证证据归 `notes/`（`implemented/` 是当前 rationale owner；已落地且合同才是权威的冻结判定在 `archived/`）。

## 文档组织原则（为什么不是"初始化/"）

**docs/ 按"性质"分层，不按"时间"分层。** 分层规矩（哪层放什么、哪层**不放**什么、长度棘轮、
更新时机）唯一家 = [docs/AGENTS.md](./AGENTS.md)；下面是本目录的**现状登记**，不是规矩。

项目运行与目录导航 = [project-map.md](./project-map.md)；脚本索引 = [checks/README.md](../checks/README.md)（触发与成本以脚本头注为准）。

### 现有文档

| 文档 | 层 | 回答什么 |
|---|---|---|
| [design/architecture.md](./design/architecture.md) | 设计 | repo 形态与组合层（Option A + 单 pack）；角色=preset 纠偏；插件计数（**1 个包**）；四条协作通道；KB 三载体；目录树 |
| [design/roles-isolation.md](./design/roles-isolation.md) | 设计 | 每角色独立六面的机制安排；composition 继承分水岭与 `mount()` 裂缝；M1–M4 编排选型；两个诚实的缺口（§4） |
| [design/ui-demo.md](./design/ui-demo.md) | 设计 | Web UI 演示层：现成团队 UI（零代码）、公司皮肤（slots/Remote）、demo 分镜 |
| [design/role-content-plan.md](./design/role-content-plan.md) | 设计 | 角色内容设计（五角色 R2 定稿，现时语义见 [presets.md](./presets.md)）：persona 要素、skills 清单、KB/模板骨架、入戏探针 |
| [guides/budget-and-ops.md](./guides/budget-and-ops.md) | 指南 | 限流旋钮总表、成本结构、demo 运维 runbook（症状→动作）、回放复盘 |
| [guides/dev-loop.md](./guides/dev-loop.md) | 指南 | 开发操作手册：任务入口与授权（§0.5）、实施和证据交接（§1）；其余按改动面查调试、发布、双 home 等章节 |
| [guides/bootstrap.md](./guides/bootstrap.md) | 指南 | 冷启动引导（clean checkout → 可跑通）：配方、双面构建与实证坑（2026-09-27 自 dev-loop §7 迁入） |
| [profile.md](./profile.md) | 合同 | host 组合现在时：部署形状（源码直跑/持久安装实测）、行清单语义、开放点 |
| [delegation.md](./delegation.md) | 合同 | 汇报线现在时（R3 出生）：命名委托工具（one-shot 前台）与 team 的分工、team shadow 边界与证据、委派工具卡、分层验证 |
| [presets.md](./presets.md) | 合同 | 角色 preset 语义（R2：五角色定稿——CEO / VP-Eng / VP-Sales / COO / CFO）；名册运行时实测；验证分层；培养回路与学习载体（D25） |
| [demo.md](./demo.md) | 合同 | demo 操作合同（R4 立场景 C，2026-09-25 补场景 D 季度经营会 / E 事件复盘）：动议、前置、分镜与观测点、验收判据（含**交付物三态**的机器判据）、已知边界 |
| [release.md](./release.md) | 合同 | 发布形状现在时（R5a 出生）：peers / 兼容矩阵 / 真实安装冒烟（release-smoke）/ 升 pin 程序（sync-dsh） |
| [testing.md](./testing.md) | 合同 | **测试宪法**（2026-10-04 立）：什么算证据——分层与证明边界、改动面→最小证据**政策**（行级映射 = tests/README，2026-10-10 迁家）、证据纪律、资产三分法、自测轮授权、已知未覆盖面与升级地图 |
| [multi-human.md](./multi-human.md) | 合同 | **多人协作现在时**（2026-09-26 出生）：机制边界（卡按会话作用域、成员拉不到人）/ 形态 / 开门 runbook / 协作前提三条 / 迁移清单 / 边界 |
| [runtime-map.md](./runtime-map.md) | 合同 | **运行态地图**：profile / bundle / preset / session / cwd / 日志 / workspace / snapshot 的时序关系与四条状态轴 |
| [project-map.md](./project-map.md) | 合同 | 空间导航：目录逐件 owner、产物落点 |
| [cdp-probe.md](./cdp-probe.md) | 指南 | 观察窗「呈现即验证」机器腿：client 面改动后的呈现前走查、页面异常定位 |
| [orient.md](./orient.md) | 导航 | 驾驭者白话七问（只导航，不复述事实） |
| [AGENTS.md](./AGENTS.md) | 规范 | 本层分层规矩唯一家（一处事实一个家 / 长度棘轮 / 更新时机 / 负知识） |

### notes/（决策与教训，不进 docs）

| 位置 | 回答什么 |
|---|---|
| `notes/proposed/` → `notes/implemented/` | 一次决策的来龙去脉（含实际跑过的验证 + 环境状态）。提案纪律 / 状态轴 / 毕业规则 / 分类规矩唯一家 = [notes/README](../notes/README.md)；未成熟问题由 [_backlog/issues/](../_backlog/issues/README.md) 推敲，制度 = [_backlog/README](../_backlog/README.md) |
| [notes/archived/](../notes/archived/) · [notes/rejected/](../notes/rejected/) · [notes/postmortem/](../notes/postmortem/README.md) | 离场与复盘目录（D30 起；逐桶判据唯一家 = [notes/README](../notes/README.md)）：archived = 仍能阻止重开的冻结判定，rejected = 负知识，postmortem = **事故复盘** |

## 决策台账（路由表）

本表只是路由：**D 号 → 一句话 → 决定的家**。决定正文（理由 / 输掉的方案 / 验证证据）住 Note，本表不复述；冲突时以 Note 为准。历史适用范围见各行「历史」标注；编号不重用、不删行；新 D 号须带可解析的家（`ledger-routing` 门禁）。台账只有正向门禁（新 D 号有家）；反向（制度级重立必有台账行/登记行）无门禁——2026-10-09 `_backlog` 整体重立曾漏网（已由 D31 行与外部材料表第七处补路由），复发再按升格判据（dev-loop §9）议门禁。

| # | 一句话 | 决定的家 |
|---|---|---|
| D1 | 自写包只有一个（company-pack）；角色是 preset 目录不是包 | [architecture](./design/architecture.md) §2 |
| D2 | 角色 = agent preset（persona 行 + 自有 skills/ + 工具行），preset 只放差异 | [architecture](./design/architecture.md) §1/§6 |
| D3 | repo 形态 = 独立 repo + `vendor/dsh` pinned submodule + 双 home | [architecture](./design/architecture.md) §6 |
| D4 | demo 主通道 = Agent Teams；事件从 CEO 进出由 Lead-only 权威内建 | [architecture](./design/architecture.md) §2.2 |
| D5 | 第 0 天零自定义 JS：纯配置 pack 即可跑通 demo v0 | [architecture](./design/architecture.md) §2.1 |
| D6 | UI 分层：第 0 层用现成 `client-ui-agent-team`，皮肤层进同 pack client 面 | [ui-demo](./design/ui-demo.md) §0/§2 |
| D7 | KB 三载体：角色知识→preset skills；公司手册→project root；活数据→workspace | [architecture](./design/architecture.md) §5 |
| D8 | 跨会话角色记忆 = workspace journal 文件（`kb/<role>/journal/`） | [roles-isolation](./design/roles-isolation.md) §4.2 |
| D9 | 上游缺口若成刚需→提 seam，不 vendor patch | [roles-isolation](./design/roles-isolation.md) §4.1 |
| D10 | docs/ 按性质分层，不按时间分层；否决「初始化/」目录方案 | [docs/AGENTS.md](./AGENTS.md) |
| D11 | 迭代单位 = 垂直轮 **历史**：轮次制已退役 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D12 | patch 语义：`- id:` 只替换已有行，新增行必须 `- insert:` 子列表 | [dev-loop §4](./guides/dev-loop.md) |
| D13 | 开发纪律沿用 DSH；偏离须登记。默认适配自由已收紧 | [AGENTS.md](../AGENTS.md) |
| D14 | 显示名 `<公司名> <角色>` 序列化；preset id 保持 kebab；公司名现行 = 梦之队（D41） | [wochen-naming](../notes/archived/2026-09-22-wochen-naming.md) |
| D15 | 完成定义 = 该面最小「真检查」通过；发现权在代理一侧不在人 | [agent-workflow-community-practice](../notes/archived/2026-09-22-agent-workflow-community-practice.md) |
| D16 | 角色模型路由 = 全员同模型（不写 `agentOptions`） | [presets](./presets.md)；[tests/presets](../tests/presets/presets.spec.ts) |
| D17 | 公司事实全部留 workspace 活数据；pack 不含公司事实 | [presets](./presets.md)；[company-workspace/kb](../company-workspace/kb/) |
| D18 | CEO 命名委托 = one-shot 前台；续驶归 team；CEO preset 不放全局控制行 | [delegation](./delegation.md) |
| D19+D21 | R5 拆轮 + 搁置池准入 **历史**：轮次制已由 D23/D24 退役，整池已随 D32 退役 | [_misc/suspended.md](../_backlog/_archive/legacy/suspended.md) |
| D20 | 交付物三态判据：成品 = Lead 的 `present`；比对按 slug+角色身份不按路径 | [r4-workshop-flow](../notes/archived/2026-09-22-r4-workshop-flow.md) |
| D22 | 在场板主键 = team roster；冷启动 = 拉式 RPC + 5s 轮询 | [org-presence-board](../notes/archived/2026-09-22-org-presence-board.md) |
| D23+D24 | 开发流条目制 **历史**：队列 owner ROADMAP.md 已由 D32 退役 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D25 | 培养 = 改 `presets/<role>/`（生效边界按面）；学习 = journal 唯一载体 | [twin-cultivation](../notes/implemented/2026-09-24-twin-cultivation.md) |
| D26 | 文档卫生按指导价值取舍；文件/行数仅观察，不是完成门槛 | [dev-loop](./guides/dev-loop.md) |
| D27 | 升 pin 偏离官方事务（嵌套工作区不能 vendor 自建）⇒ 手工簿记 + 门禁留证 | [pin-upgrade-0.2.0-rc.2](../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md) |
| D28 | 枚举型事实的家 = 实现自己（文档只留分层原则 + 指针） | [entry-execution-chain-debt](../notes/implemented/2026-09-26-entry-execution-chain-debt.md) |
| D29 | 自主优先协议：先探索后发明、借鉴成熟插件、REVIEW 分级 | [dev-loop §13](./guides/dev-loop.md) |
| D30 | notes 侧旧 research 层退役（triage 归 notes/README）；现行调研家 = _backlog/research/ | [notes/README](../notes/README.md) |
| D31 | 推敲空间 `_backlog/`；只承载判断材料、不承载授权；现行制度 2026-10-09 自 ai_dsh_assitant/_backlog 整体重立 | [_backlog/README](../_backlog/README.md) · [backlog-issue-lifecycle](../notes/implemented/2026-10-09-backlog-issue-lifecycle.md) |
| D32 | 队列层退役（ROADMAP.md 删除）；已批→RFC 状态行「批准：」标记 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D33 | `_backlog` 章制回借（主干框架/章程账本二分/索引交叉核对门禁/全日期卡名） | [_backlog/README](../_backlog/README.md) |
| D34 | intents.md 退役（第三本账 + 胖行病史 + 违反上游 no-index 教义） | [notes/README](../notes/README.md) |
| D35 | notes/ 分类 owner 文件 + `notes-liveness` 门禁 | [notes/README](../notes/README.md) |
| D36 | 决策台账降级为纯路由表（第三本账同 D34 病）+ `ledger-routing` 门禁 | [ledger-routing-table](../notes/implemented/2026-10-09-ledger-routing-table.md) |
| D37 | `docs/` 分层规则唯一家住 `docs/AGENTS.md`（含「不属于这层」列）+ `doc-taxonomy` 门禁 | [docs-tier-taxonomy](../notes/implemented/2026-10-09-docs-tier-taxonomy.md) |
| D38 | implemented/ Note 的**事实落点**随改动就地改新（决定正文仍冻结）；生效日分档 + `zz-` 假路径记号 | [implemented-note-currency](../notes/implemented/2026-10-09-implemented-note-currency.md) |
| D39 | 完成定义 skills 住 `.agents/skills/`（清单 = 目录本身）；程序进 skill、可机械判断的才进 gate | [completion-definition-skills](../notes/implemented/2026-10-09-completion-definition-skills.md) |
| D40 | 事故护栏复原：`preset-required-config` 门禁（判据 = vendor committed config-catalog） | [postmortem-guard-restoration](../notes/implemented/2026-10-09-postmortem-guard-restoration.md) |
| D41 | 公司名 = 梦之队（Dream Team）；D14 显示名前缀序列化沿用，前缀随名换代 | [dreamteam-naming](../notes/implemented/2026-10-10-dreamteam-naming.md) |

### 待定与活动提案

旧问题 Q1–Q8 均已闭合（Q1→D18、Q2→D16、Q3→D17、Q4 于 2026-09-22 定案、Q5–Q8→D22）。这只结算该组问题；当前任务源 = [notes/proposed/](../notes/proposed/README.md) 已批 RFC 与用户点名（D32，无中心队列）；未成熟的问题在 [_backlog/issues/](../_backlog/issues/README.md) 澄清，不是实施任务。旧磨清单与搁置池按历史记录归 [_backlog/_archive/legacy/](../_backlog/_archive/legacy/README.md)，不是任务源；当前问题关闭、暂停和触发规则见 [_backlog/README](../_backlog/README.md)。

## 文档路由

主题事实的 owner；不代表该面在当前提交经过完整覆盖（验证状态见各合同与 Note）。

| 面 | 事实家 / 导航 |
|---|---|
| 机制——公司怎么组装、角色怎么隔离、UI 往哪挂 | design/architecture + design/roles-isolation + design/ui-demo；源码与运行结论按对应合同核对 |
| 内容——角色说什么话、带什么技能、KB 放哪 | design/role-content-plan + presets.md + `company-workspace/kb/` + `company-workspace/AGENTS.md` |
| 运营——token 怎么省、现场出状况怎么办 | guides/budget-and-ops |
| 流程——任务怎么进、证据怎么交、门禁怎么守 | guides/dev-loop + `notes/` + `checks/run-gates.mjs` |

## 外部研究材料登记（repo 外，只读引用）

本 repo 的形态与机制结论大量借鉴三处 repo 外材料（均在 `/Users/bowhead/deepseek-harness/`
工作树内、已被该 repo 的 git 跟踪；不在本 repo 版本控制范围，引用时注明是外部研究材料）：
`_faq_on_digested/`、`_digested/`、`_dsh_plugin_agent_ready_development/`（后者 = Agent-ready 语料，更名自 `_agent_ready_development` 并随上游 re-pin 演进）；另有第四处**独立外部仓** = `/Users/bowhead/ai_deerflow_deep_research_v2`（`_backlog` 借鉴源，D31）；第五处 = `/Users/bowhead/ai_dsh_loop_advisor/_backlog`（D31 制度演进宿主，D33 回借源）；第六处 = `/Users/bowhead/ai_dsh_assitant/notes`（notes/ 分类 owner 精神借源，D35——本仓 notes/README 落地后日常不依赖原文）；第七处 = `/Users/bowhead/ai_dsh_assitant/_backlog`（`_backlog` 现行制度整体借源，2026-10-09 重立——路由见 D31 行）。各材料的版本核对与其"想法落在哪儿"见下表；研究树 HEAD 持续演进，引用以注册行为准、不追新提交。
**思想吸收进本 repo 文档后，日常不再依赖原文**；下表是"哪个想法落在了哪儿"的地图：

| 材料 | 内容 | 吸收落点 |
|---|---|---|
| `_faq_on_digested/13_expert-plugin-repo-organization/answer.md` | 五决策框架（入口形态/包粒度/DSH 源码位置/UI 层/spec 流程） | D1–D3、D6；design/architecture §0–§2、§9 |
| `…/option-a-standalone-with-pinned-dsh.md` | **本 repo 形态依据（Option A）**：目录树、装法、取舍、升级阶梯 | design/architecture §6（目录树）、§8–§9；AGENTS.md 布局/簿记 |
| `…/dev-loop.md` | 开发过程生命周期（六步闭环/调试阶梯/设计四问/插拔速查） | guides/dev-loop（全文吸收）；AGENTS.md 纪律 |
| `…/dual-home-isolation.md` | 双 home 机制、崩溃半径、迁移方向 | run/env.sh；guides/dev-loop §6 |
| `…/research.md` | 第三方生态证据（peers/兼容矩阵/自包含/真实安装形状） | guides/dev-loop §5 发布纪律时点；design/architecture §8 |
| `_digested/`（源码消化笔记） | DSH 源码机制笔记（审计基线，版本唯一见 `AGENTS.md` §vendor 簿记——**基线可能落后当前钉住一代**，升 pin 未重审时以簿记注记为准） | design/ 各篇（architecture / roles-isolation / ui-demo）的机制核对引文；**权威仍在 `vendor/dsh/` 本体** |
| `_dsh_plugin_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`（语料更名前后路径同页） | DSH Agent Note 生命周期（状态/路径/格式/取代/归档；判定基于 0.1.7-rc.1 树，rc.2 收窄为「持久决定理由」后 D35 全量对齐） | [notes/README.md](../notes/README.md)（D35；六条点选已收进本文件，吸收稿已删） |
| `_dsh_plugin_agent_ready_development/`（三卷 + `_coverage` + `verify.mjs`；更名自 `_agent_ready_development`，0009–0013 轮演进后钉 `dsh-v0.2.0-rc.2` = 本仓当前 pin） | 插件仓视角开发语料：native-development-model（独立插件仓闭环——**直接以本仓这类 repo 为受众**）/ sdlc-reference / repo-harness 三卷 | 判定 = [plugin-corpus-realignment](../notes/implemented/2026-10-07-plugin-corpus-realignment.md)（不照搬清单在该 Note；全亲读零增量。体感不对的翻案 = 驾驶座缺仪表，见 orient 第七问与 dev-loop 轮次回执） |
| 人机交互 UX 研究来源集（Temporal/Claude Code/Warp/GitHub/PagerDuty/Slack/Horvitz 等） | 阶段 0 外部实践的决定在 [human-agent-integration](../notes/archived/2026-09-25-human-agent-integration.md)；引用全集已删（Horvitz 两篇 PDF 未逐字核） | 人机合一条目的 A2/B 切片依据 |
| `_faq_on_digested/07_borrowing-dsh-harness-idea/` | 「另一个项目怎么借 DSH」的可迁移框架：三条立场（agent 一等 / 规则可执行 / 事实唯一 owner）+ 十维评估 + 垂直切片 + 四边界（可读≠简单 / Skill≠enforcement / 清理≠回滚 / 查询≠沙箱） | 十维审计（2026-09-27）的唯一结构性缺口 = 反馈 enforcement 通道，同日修复 = [enforcement-channel-and-boundaries](../notes/archived/2026-09-27-enforcement-channel-and-boundaries.md) |
| `/Users/bowhead/ai_deerflow_deep_research_v2/_backlog`（独立外部仓，同机工作树） | 另一个 harness 仓的待办/推敲层规矩：plans（推敲卡）/ bugs（缺陷卡）/ `_done`（位置即状态）/ `_` 前缀语义 / 搬迁铁律（git mv、文件名不变、内容不重写、编号权威住归档侧）+ 它自己那份「借 DSH」总账（借精神不抄形式的方法论样本） | `_backlog/` 全套 + 毕业四门（D31）；判定、取舍与不借清单 = [implemented/2026-09-28-backlog-deliberation-space](../notes/archived/2026-09-28-backlog-deliberation-space.md) |
| `_faq_on_digested/04/05/11/15`（4 目录） | 根入口文档静态/运行时设计 + 原生开发环 + loop 工程 vs SDD | 判定 = [archived/faq-04-05-11-15-judgment](../notes/archived/2026-09-28-faq-04-05-11-15-judgment.md)：立即借的九条已在现行合同（dev-loop 等），有压力再借的六条带触发条件；「防重复评估」节防重读全文 |
| `/Users/bowhead/ai_dsh_loop_advisor/_backlog`（独立外部仓，同机工作树；2026-10-03 当日态） | D31 制度的直系后代（本仓 → ai_dsh_architect → advisor，其间又借 ai_deerflow_dr_v3 主干框架）：四门/主干框架/三条硬规则/章程账本二分/搁置池新纪律（搁置 = 队列决定，agent 不得自行判搁置）/索引交叉核对门禁/随卡归档的 reference/ | 章制回借（D33）：主干框架与硬规则、章程账本二分、backlog-liveness 升格、两桶解禁、全日期卡名；判定与不借边界 = [implemented/2026-10-03-backlog-charter-refit](../notes/archived/2026-10-03-backlog-charter-refit.md) |
| `/Users/bowhead/ai_dsh_assitant/_backlog`（独立外部仓，同机工作树；2026-10-09 当日态） | 问题卡/缺陷卡/研究/按需方法/结论交接/触发索引的完整章制（第七处借源，D31/D33 前朝制度的后继） | `_backlog/` 现行制度整体重立：判定、适配与验证 = [implemented/2026-10-09-backlog-issue-lifecycle](../notes/implemented/2026-10-09-backlog-issue-lifecycle.md) |

## 术语映射（本项目用法 ↔ DSH 官方 ↔ vendor/dsh 源码直达）

新会话查 DSH 机制先查这张表：概念 → 官方载体 → 源码路径一步到位（路径均核实存在于钉住 tag）。
探索路由（进 vendor 树）：`vendor/dsh/docs/architecture.md` → `docs/capability-seams.md` → 具体 package README——机制结论的权威在 vendor 树。

| 本项目 | DSH 官方 | vendor/dsh 落点（读源码从这进） |
|---|---|---|
| 角色（CEO/VP…） | agent preset（`presets/<id>/agent.cordis.yml` + persona + skills） | `packages/preset/agent-preset`（每预设一行声明，rc.2 形）+ `packages/preset/persona`；出厂范本 = `packages/bundle/web-app/presets/` |
| 组织/公司 | 一个 host profile + preset roster（rc.2：`agent-preset-registry` 装配，roots 目录扫描已废） | `packages/preset/agent-preset-registry`（default 装配）+ `docs/architecture.md`（组合链）；升 pin 迁移实证 = [pin-upgrade-0.2.0](../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md) |
| worker（角色底下干活的一次性代理） | one-shot subagent（`dsh-tool-subagent`，spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 派活/汇报线 | 命名委托工具（通道 A / M2） | 同上（per-instance persona 教义在其 README） |
| 会议/任务板/邮箱 | Agent Teams（`ctx.agentTeams`，experimental） | `packages/experimental/agent-team` + `packages/experimental/tool-agent-team` + `docs/subsystems/agent-team.md` |
| 通道 A/B/C/D（机制） | 命名委托 / Agent Teams / dsh-sdk 子进程 / workflow 脚本（architecture §3） | [architecture.md](./design/architecture.md) §3 篇首映射表（各通道包清单） |
| M1–M4（用法/编排） | 人中继 / 隔离委托 / SDK 编排器 / 团队（roles-isolation §3） | [roles-isolation.md](./design/roles-isolation.md) §3 选型速查 |
| 公司页签 / 公司视图 | 右栏五个平台页签（看板/依赖图/在场/用量/任务板，可 `float()` 拖出成浮窗）+ 整页视图（`conversation.view` 条目；命名表 = ui-demo §5） | `packages/client/ui-sidebar-right`（tab 注册与浮窗）+ `docs/subsystems/sidebar-right.md` + `packages/client/ui-dockkit`（浮窗手势） |
| 交付物 | `present` 工具的 explicit deliveries（ui-demo §1） | `packages/client/ui-deliverables` |
