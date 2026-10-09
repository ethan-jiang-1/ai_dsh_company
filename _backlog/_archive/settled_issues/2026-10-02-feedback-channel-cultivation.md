# 推敲（消费决定）：货架残余增量的三个消费候选——feedback 赞/踩、contextPressure、modelSelection

> 状态：已毕业（2026-10-03，D1 选型拍定 → 该做）｜批准：D1 消费面选型 = **两者都要**（读模型 + 手册引导；用户 2026-10-03 对话在案）｜去向 = 实施随培养回路/用量页签下一轮立项，届时以 RFC 回场引用本卡（「已毕业的卡永不复活」——回场 = 新 RFC 引旧卡）；读模型侧注意 client 面红线先例，先 spike 再立项

## 背景 / 触发（2026-10-02 消化对账轮 · 货架对照两遍）

两遍对照（第二遍逐 vendor 实路径核验、关键断言已由维护者抽验）的修正版结论：**货架对自建面的覆盖已近吃满**——真 opt-in 包增量只剩 web-search-exa（中档：VP-Sales 搜索质量，需 EXA key + 认证档）。剩下三个候选**不需要装任何东西**，都是"已在场、无人消费"：

| 候选 | 在场证据（vendor 实路径） | 消费价值 | 代价 |
|---|---|---|---|
| message-feedback + ui-message-feedback（人对分身回复的赞/踩） | web-app `cordis.patch.yml:69-70, 381-382`（出厂已挂） | 手册「人机接口四类」外的第五通道；可喂 CultivationTab / `src/lib/cultivation.ts` | 读模型加一个事件源；**叙事决定**（见 D1） |
| command-feedback `/feedback`（会话级反馈命令） | base `cordis.patch.yml:310-311`（出厂已挂） | 同族，轻量入口 | 手册一行引导 |
| contextPressure / contextBreakdown 投影（谁逼近 compaction） | `packages/llm/token-meter/src/usage-projection.ts:173-218` | 用量页签加"成员上下文压力"预警；budget.ts 头注自认只吃 tokenUsage+sessionStats，这是数据源补全 | `use-company-data` 多读一个 useProjection 键 |
| modelSelection 投影（每成员当前模型） | `packages/api/session-controller/src/model-selection-projection.ts:58-82` | 在场/用量页签显示成员模型（官方 client-ui-agent-team 的 TeamAction 已这么用） | 同上，纯投影读取 |

## 待答问题（毕业门）

| # | 问题 | 形状 |
|---|---|---|
| D1 | feedback 消费面选型：读模型（cultivation 读赞/踩事件）vs 手册引导（人主动赞/踩当轻量反馈）vs 两者 | 成本都低；**选型是叙事决定不是技术决定**；若 demo 要演"人点赞 → 培养面板出现一条"则必须选读模型侧 |
| D2 | 赞/踩语义进培养回路的权重（证据？只读展示？进 journal 在场盘点？） | 与 kb/owners.md 授权面、journal-presence 机制对齐 |
| D3 | 两条投影何时接：随用量/在场页签下一次改动顺带，还是单独轮 | 顺带最省；单独轮仅当 demo 需要模型列 |

## 已核对、不用再查（两遍对照的负结论，防重复评估）

- 官方团队面板（client-ui-agent-team）已被本 pack insert，与五页签**共存成立**（官方面板只读、无 DAG/用量/培养/台账；其 Known Limitations 自认）。
- 无增量组（第二遍逐组核验过）：storage（host 应用数据，与模型可见 kb/journal 设计相悖）、deliverables/session-query/identity/host/api（已挂或已用）、interaction 余项（user-questions 事件已被 attention.ts 消费）、client 68 目录（ui-subagent=导航、trajectory=调试、dockkit=布局引擎、jobs=会话头作业控件、goal=单会话目标条、product-analytics=Desktop 遥测——定位均不同）、experimental 余项（voice/inspector/webworker/ptc-python/computer-use/备选浏览器后端——同意排除）。
- 中档 opt-in 维持：web-search-exa（唯一真"要装"的包）；session-title-all-prompts-llm（title 策略**换行**变体，现挂的是 first-prompt 变体 base:62-63，有 token 成本）；inspector（Chrome DevTools 调试面，dev 工具非运行时增量）。
