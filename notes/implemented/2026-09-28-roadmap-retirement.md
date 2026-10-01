# 2026-09-28 · 队列层退役：ROADMAP 删除、职能重接（D32）

状态：implemented（2026-09-28。起因 = 用户在 D31 落地后指认「有了 _backlog，ROADMAP 不再有存在的
必要，流程搞复杂了」；代理先以技术事实反驳（见下「保留 ROADMAP 的反方论据」），用户维持裁决
「把 ROADMAP 的痕迹彻底清理干净」——**过程设计权在维护者，裁决生效**。本稿同 diff 执行并留档反方论据，
供将来评估是否回巢时对照）。

## 问题

队列层（ROADMAP.md：§队列 + §磨清单 + §搁置池，D23/D24 立）与 D31 新立的 `_backlog/` 并存后：
① 三张表混装，ROADMAP 实际是"多状态杂物间"而非纯队列；② 队列长期空转（交付节奏 = 用户当场点名，
队列没有承接过"排队"的真实负载）；③ backlog 性质的状态（磨/搁置）与调度表住在一起，分类学含混。
用户裁决：删。

## 职能去向（逐项重接，不留真空）

| 原 ROADMAP 职能 | 新家 | 机制 |
|---|---|---|
| §队列（次序唯一家、▶ 在办、已批待办） | **用户逐条点名** + RFC 状态行「批准：」 | 无中心排序文件；在办 = 会话 goal/用户指令；「继续下一条」分支改读任务源（dev-loop §0.5 分支②） |
| RFC 的"归宿"（proposal-scheduled 防停车场） | RFC 自身状态行的「批准：」标记 | 门禁改查标记（未批准的思考属 `_backlog/plans/` 推敲卡，不配进 proposed/）；proposal-graduated 不变 |
| §搁置池（20 行，准入判据+复活条件） | `_backlog/suspended.md`（**后迁 `_backlog/_done/_misc/suspended.md`**——2026-09-28 整池退役，intents D32 行声明初迁落点作废） | 整表迁入，行内容原样，只修链接前缀；升 pin 时回看规则照旧 |
| §磨清单（2 项，谁来磨/何时磨） | `_backlog/polish.md` | 整表迁入；"升队条件② 队列走空且用户点名"改"② 用户点名"（队列条件失效） |
| 完成即离队 | 完成即离场 | `_backlog` 表行/卡 git mv 或删行，证据留 Note（dev-loop §12 同步） |

## 同 diff 重接面

AGENTS.md（布局行/任务源句/纪律表行）、dev-loop §0.5（分支②/计划先落盘/Plan Mode/两形态 goal）
§1 交接⑤、§5 R5a 行依据、§12 两处、README.md、index.md（D19+D21 依据、notes 行提案纪律、
待定与活动提案、D23+D24 退役互链、D32 行）、architecture §7、roles-isolation、presets、
proposed/README（批准标记 + 开工段）、`_backlog/README`（性质/目录/毕业四门/读时机/不借表 + 回巢负知识行）、
pack README 已知限制、verify.mjs（proposal-scheduled 重构 + pin-currency 特例移除）、
markdown-links 扫描面 + foundation-links 夹具、entry-probe Q1/Q2/Q6/Q9/Q11 与 smoke 源清单、
tests/entry-probe.spec 夹具。

## 保留 ROADMAP 的反方论据（用户裁决前，代理原文存档）

1. **次序**：「列表顺序 = 默认执行次序」是全仓唯一调度权威；_backlog 红线就是不承载次序（D23 教训）。
   删队列 = 次序要么没家、要么搬进 _backlog——后者把刚拆开的层重新捏回去。
2. **▶ 当前在办**：fresh 会话入口协议（§0.5 分支②）靠它一眼定位"现在做哪条"。
3. **毕业四门的下游**：批准门开出去就是队列行、搁置门开出去就是搁置池行；删了 ROADMAP 四门开进空气。
4. D23/D24 是 2026-09-23 刚完成的转型（轮次制→条目制、队列 owner 唯一），反转需 D 号级证据。
5. 机制容量按忙时设计：队列此刻空 ≠ 机制死，下一条 feature 一批准队列就得接客。

用户侧反驳成立的部分（已吸收进本方案）：队列确无真实"排队"负载；三表混装确实含混；
搁置池/磨清单本来就是 backlog 性质——**这三条由 D32 采纳**（职能重接表 3/4/5 行）。
次序/在办两条的担忧由"用户逐条点名"承接（本仓一人维护者 + 少量并行会话的实际协作形状下，
中心排序的收益小于维护成本——这是裁决依据，也记为将来复查的判据：**若出现多条已批 RFC 无人
点名即互相等待/踩脚的实况，重开此裁决**）。

## 输掉的方案

- **保留 ROADMAP（纯队列形态，磨/搁置迁 _backlog）**：保留中心排序但本仓没有排队负载为其买单；
  用户裁决放弃。若回巢，这是首选形态。
- **队列文件搬进 _backlog（queue.md）**：换目录不换机制，"杂物间"体感照旧；且把未裁决卡与已批准
  任务混进同一目录，fresh agent 必须逐件区分"卡≠任务"——比根部分离更差。
- **搁置池 20 行卡片化（一行一卡）**：行级条目都是"一行+指针"，文件卡是给需要持续书写的推敲卡
  准备的形态；20 个 90% 模板的文件 = 增加仪式感。
- **proposal-scheduled 直接退役**：R4 实证过"登记了没人做"的病，门禁是那句防复发的机械形态；
  改查「批准：」标记 = 同一防病机理的最小等价物，比退役好。

## 验证（实际跑过的）

- `pnpm verify` ALL PASS（md-links/裸路径对全仓活层零死指针；proposal-scheduled ×0 空转）。
- **proposal-scheduled 反证**：塞一份无「批准」标记的 RFC → 红；移除 → 绿（红→还原→绿，
  记录于 verify.mjs 门禁注释）。
- `pnpm test` 230/230（foundation-links 发现面夹具已含 `_backlog` 递归 walk，替换 research/ROADMAP 两处）。
- 全仓活层 ROADMAP 引用清零。**notes 层的 13 处 markdown 活链接**（implemented ×10 / intents ×1 /
  postmortem ×1，notes-link 硬门禁抓出）已按链接语义修指针：搁置池→`_backlog/suspended.md`、
  磨清单→`_backlog/polish.md`、其余→本轮退役 Note——**链接文本（历史叙述）一字未改，只修 URL**。
  纯文本的历史叙述（无链接）与 snapshots/、dev/ 运行态按"当时事实"保留，不篡改记录。
- ROADMAP.md 末次全文 commit = `5018118`（git 即归档）。

## 登记与指针

- index.md：D32 行 + D23+D24 行退役互链（D19+D21 行依据同步换新家）。
- intents.md +1 行指针；AGENTS.md/README.md 活层指针已改。
- `scripts/entry-probe-smoke.mjs` 头注触发条件同步（下次入口链文档改动后照常跑）。
