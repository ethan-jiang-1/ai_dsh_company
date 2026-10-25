# 外部研究材料登记（repo 外，只读引用）

> 性质：导航/参考——repo 外研究材料的登记与吸收落点。当前文档地图 = [index.md](./index.md)；
> 本页不承载合同事实，只回答「哪个外部想法落到了哪里」。研究树 HEAD 持续演进，引用以注册行为准、不追新提交。

本 repo 的形态与机制结论借鉴七处 repo 外材料（前三处在维护者本机的 vendor 研究树内、
已被其 git 跟踪；其余为独立外部仓；均不在本 repo 版本控制范围，引用时注明是外部研究材料）：
`_faq_on_digested/`、`_digested/`、`_dsh_plugin_agent_ready_development/`、外部仓 ai_deerflow_deep_research_v2（`_backlog` 借鉴源，D31）、外部仓 ai_dsh_loop_advisor/_backlog（D31 制度演进宿主，D33 回借源）、外部仓 ai_dsh_assitant/notes（notes/ 分类 owner 精神借源，D35）、外部仓 ai_dsh_assitant/_backlog（`_backlog` 现行制度整体借源，2026-10-09 重立——路由见 D31 行）。各材料的版本核对与其"想法落在哪儿"见下表；研究树 HEAD 持续演进，引用以注册行为准、不追新提交。**思想吸收进本 repo 文档后，日常不再依赖原文**；下表是"哪个想法落在了哪儿"的地图：

| 材料 | 内容 | 吸收落点 |
|---|---|---|
| `_faq_on_digested/13_expert-plugin-repo-organization/answer.md` | 五决策框架（入口形态/包粒度/DSH 源码位置/UI 层/spec 流程） | D1–D3、D6；design/architecture §0–§2、§9 |
| `…/option-a-standalone-with-pinned-dsh.md` | **本 repo 形态依据（Option A）**：目录树、装法、取舍、升级阶梯 | design/architecture §6、§8–§9；AGENTS.md 布局块 + [project-map](./project-map.md)（现行目录逐件） |
| `…/dev-loop.md` | 开发过程生命周期（六步闭环/调试阶梯/设计四问/插拔速查） | guides/dev-loop（全文吸收）；AGENTS.md 纪律 |
| `…/dual-home-isolation.md` | 双 home 机制、崩溃半径、迁移方向 | run/env.sh；guides/dev-loop §6 |
| `…/research.md` | 第三方生态证据（peers/兼容矩阵/自包含/真实安装形状） | release.md（依赖姿态/兼容矩阵/发布冒烟）；design/architecture §8 |
| `_digested/`（源码消化笔记） | DSH 源码机制笔记（审计基线，版本唯一见 `AGENTS.md` §vendor 簿记——**基线可能落后当前钉住一代**，升 pin 未重审时以簿记注记为准） | design/ 各篇（architecture / roles-isolation / ui-demo）的机制核对引文；**权威仍在 `vendor/dsh/` 本体** |
| `_dsh_plugin_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`（语料更名前后路径同页） | DSH Agent Note 生命周期（状态/路径/格式/取代/归档；判定基于 0.1.7-rc.1 树，rc.2 收窄为「持久决定理由」后 D35 全量对齐） | [notes/README.md](../notes/README.md)（D35；六条点选已收进本文件，吸收稿已删） |
| `_dsh_plugin_agent_ready_development/`（三卷 + `_coverage` + `verify.mjs`；更名自 `_agent_ready_development`，0009–0013 轮演进后钉 `dsh-v0.2.1-rc.2` = 本仓当前 pin） | 插件仓视角开发语料：native-development-model（独立插件仓闭环——**直接以本仓这类 repo 为受众**）/ sdlc-reference / repo-harness 三卷 | 判定 = [plugin-corpus-realignment](../notes/implemented/2026-10-07-plugin-corpus-realignment.md)（不照搬清单在该 Note；全亲读零增量。体感不对的翻案 = 驾驶座缺仪表，见 orient 第七问与 dev-loop 轮次回执） |
| 人机交互 UX 研究来源集（Temporal/Claude Code/Warp/GitHub/PagerDuty/Slack/Horvitz 等） | 阶段 0 外部实践的决定在 [human-agent-integration](../notes/archived/2026-09-25-human-agent-integration.md)；引用全集已删（Horvitz 两篇 PDF 未逐字核） | 人机合一条目的 A2/B 切片依据 |
| `_faq_on_digested/07_borrowing-dsh-harness-idea/` | 「另一个项目怎么借 DSH」的可迁移框架：三条立场（agent 一等 / 规则可执行 / 事实唯一 owner）+ 十维评估 + 垂直切片 + 四边界（可读≠简单 / Skill≠enforcement / 清理≠回滚 / 查询≠沙箱） | 十维审计（2026-09-27）的唯一结构性缺口 = 反馈 enforcement 通道，同日修复 = [enforcement-channel-and-boundaries](../notes/archived/2026-09-27-enforcement-channel-and-boundaries.md) |
| `_faq_on_digested/24_plugin-publish-and-agent-data-planes/` | DSH 发布形态/包六项检查/数据 6+2 平面/测试 T0–T8（rc.3 基线） | [Note faq24-alignment](../notes/implemented/2026-10-26-faq24-alignment.md)；README Data 节、release runbook、compat 台账迁移 |
| 外部仓 ai_deerflow_deep_research_v2 的 `_backlog`（独立外部仓，维护者本机） | 另一个 harness 仓的待办/推敲层规矩：plans（推敲卡）/ bugs（缺陷卡）/ `_done`（位置即状态）/ `_` 前缀语义 / 搬迁铁律（git mv、文件名不变、内容不重写、编号权威住归档侧）+ 它自己那份「借 DSH」总账（借精神不抄形式的方法论样本） | `_backlog/` 全套 + 毕业四门（D31）；判定、取舍与不借清单 = [implemented/2026-09-28-backlog-deliberation-space](../notes/archived/2026-09-28-backlog-deliberation-space.md) |
| `_faq_on_digested/04/05/11/15`（4 目录） | 根入口文档静态/运行时设计 + 原生开发环 + loop 工程 vs SDD | 判定 = [archived/faq-04-05-11-15-judgment](../notes/archived/2026-09-28-faq-04-05-11-15-judgment.md)：立即借的九条已在现行合同（dev-loop 等），有压力再借的六条带触发条件；「防重复评估」节防重读全文 |
| 外部仓 ai_dsh_loop_advisor 的 `_backlog`（独立外部仓，维护者本机；2026-10-03 当日态） | D31 制度的直系后代（本仓 → ai_dsh_architect → advisor，其间又借 ai_deerflow_dr_v3 主干框架）：四门/主干框架/三条硬规则/章程账本二分/搁置池新纪律（搁置 = 队列决定，agent 不得自行判搁置）/索引交叉核对门禁/随卡归档的 reference/ | 章制回借（D33）：主干框架与硬规则、章程账本二分、backlog-liveness 升格、两桶解禁、全日期卡名；判定与不借边界 = [implemented/2026-10-03-backlog-charter-refit](../notes/archived/2026-10-03-backlog-charter-refit.md) |
| 外部仓 ai_dsh_assitant 的 `_backlog`（独立外部仓，维护者本机；2026-10-09 当日态） | 问题卡/缺陷卡/研究/按需方法/结论交接/触发索引的完整章制（第七处借源，D31/D33 前朝制度的后继） | `_backlog/` 现行制度整体重立：判定、适配与验证 = [implemented/2026-10-09-backlog-issue-lifecycle](../notes/implemented/2026-10-09-backlog-issue-lifecycle.md) |
