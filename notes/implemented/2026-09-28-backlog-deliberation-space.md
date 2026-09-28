# 2026-09-28 · 推敲空间 `_backlog/` 立层 + research 并入（D31）

状态：implemented（2026-09-28。起因 = 用户指认「进入正式加工之前少一个推敲的空间——正常 SDLC 借
GitHub flow 的核心是先推敲一阵子才知道该不该做、何时做、次序如何、还是放弃」；并点名借鉴
`/Users/bowhead/ai_deerflow_deep_research_v2/_backlog`，借 plans/bugs/done 三件，同时提出
「research 放这儿是不是更合理」——本稿两问一并落地，用户当日确认两裁）。

## 问题

决策**前**与**后**的状态都有家，唯独「推敲中」没有：

| 阶段 | 既有家 | 为何装不下推敲 |
|---|---|---|
| 已批待办 | ROADMAP §队列 | 进它 = 范围已获批，太晚 |
| 半成品提案 | notes/proposed/ | `proposal-scheduled` 门禁要求进它就有队列归宿 ⇒ 提前承诺 |
| 明确搁置 | ROADMAP §搁置池 | 准入判据「缺 seam / 缺需求，理由已核实」⇒ 已裁决过才进 |
| 低优先小活 | ROADMAP §磨清单 | 语义是"决定磨，只是不急" |
| 未完结调研 | notes/research/ | 被超载客串推敲空间——它一直别扭的根源（D30 是补丁，病根不在此） |

后果：四问的思考只活在对话里（散失）、被提前塞进不适配的桶、或不落盘直接丢。

## 决定

1. **立 `_backlog/` 推敲空间**（根目录）：`plans/`（推敲卡：设计/分析/调研）+ `bugs/`（缺陷卡：
   发现时决定不当场修的缺陷；当场修掉不建档）+ `_done/`（归档，位置即状态）。借鉴外部仓
   ai_deerflow_deep_research_v2 的同名层：借到 = 卡片定位（"不是 change 本身，结论被吸收即可关闭"）、
   搬迁铁律（git mv / 文件名不变 / 内容不重写——推敲过程是证据）、编号权威住归档侧、
   `_` 前缀语义（"不在活跃队列" ≠ 禁读；`_done` 默认忽略）。**推敲卡文件名 = `YYMMDD-<slug>.md`**
   （用户当日补令：立卡日期编码进文件名，时间轴在名字上，归档后日期流一眼可见；文件名跨迁移不变）。
2. **红线（D23 教训的正面化）**：`_backlog/` 只承载**判断材料**（问题、证据、候选、取舍），
   **不承载次序与授权**——次序唯一在 ROADMAP §队列，授权唯一在 dev-loop §0.5；
   fresh agent 开工照旧只读 ROADMAP。旧 plans 层 2026-09-24 因长成第二个队列被退役，本层永远不做调度。
3. **毕业四门**（每张卡的出路，覆盖用户四问）：批准 → RFC+队列行（小修进磨清单）；搁置 → 搁置池行；
   证伪/否决 → owner Note「输掉的方案」或 notes/rejected/；消化 → 并入 owner 并记落点。
   推敲的产出 = **一个毕业判断**，不是开工。队列走空的打磨型 goal 可把「成熟一张卡」当输入源
   （dev-loop §0.5 已同步）。
4. **research 并入（D31 修订 D30，用户确认）**：`notes/research/` 目录退役（当日未完结清零，
   零稿件迁移）；「未完结调研」降格为 plans 卡的一种性质（调研卡补「待答问题 / 喂给谁」字段，
   D30 户口精神保留）；**三态出口不推翻**：完结 → `_done/_closed_plans/` 或并入 owner、
   过时/证伪 → `notes/rejected/`；`notes/archived/` 存量证据台账不动。

## 关键取舍与约束

- **边界三句**（写进 `_backlog/README.md` 与 proposed/README）：推敲卡 ≠ 提案——卡可以只有问题没有
  方案，RFC 必须有问题/方案/验收；推敲卡不是任务（ROADMAP 头部已加防误取句）；立新卡前先检索
  （防重复推敲，同 Note 生命周期取代检查精神）。
- **门禁只动有复发依据的**（FAQ 15 升格判据自查）：`research-liveness` → `plans-liveness`
  （同一病：未完结思考稿缺户口挂着不动，D30 起因即复发证据）；bare-path/md-links 扫描面把
  `notes/research` 换成 `_backlog/`（硬档活文档）。索引一致性 / `_` 目录声明 / 编号撞号三道
  deerflow 门禁**不预铺**，按「有压力再借」登记在 `_backlog/README.md`（负知识表末行）。

## 输掉的方案

- **research 平移成 `_backlog/research/` 独立桶**：保住目录语义但保不住"一个思考一个家"——
  推敲卡与调研卡的差异只是字段侧重，分桶 = 重建"该进哪个桶"的老纠结（用户原话：research 一直别扭）。
  并入后 research 只是卡的一种性质，纠结消失。
- **给 ROADMAP 加"推敲中"第四状态**：队列是"已批准"的有序索引，混入未批准状态 = 把调度器变成
  停车场，正是 D23 退役 plans 层的病因原样复发。
- **宽容化 `proposal-scheduled` 门禁（允许 RFC 无归宿）**：放松既有门禁换临时容量，代价是
  proposed/ 退化成停车场（它自己 README 第一条就是"不是停车场"）；正确解 = 上游加一个真正的
  前置空间。
- **照搬 deerflow 全套（todos/ _suspended_ _reference_ 三桶 + 三道一致性门禁）**：todos 与
  _suspended 在本仓已有对应家（队列/磨清单/搁置池），照搬 = 第二事实家；门禁预铺违反
  FAQ 15 升格判据。不借清单带理由住 `_backlog/README.md`。

## 验证（实际跑过的）

- `pnpm verify` ALL PASS（plans-liveness ×0 空转；bare-path/md-links 对 `_backlog/` 六 README 全绿——
  新目录入扫描面后指针零腐化）。
- **plans-liveness 反证**：塞一张无状态行卡 `_backlog/plans/x.md` → 红（`缺活状态行`）；删除 → 绿
  （红→还原→绿，负例记录在 verify.mjs 门禁注释）。
- `pnpm test` 230/230。
- 借鉴源核对：deerflow `_backlog` 的 README/plans/bugs/todos/_done 五份规矩手册 + `_reference/`
  借鉴总账 + 三份实卡（closed plan / done todo / 活跃 todo 索引）读毕后定形状；引用版本 = 该仓
  工作树当日态（外部仓持续演进，机制结论以本仓 `_backlog/README.md` 为准）。

## 登记与指针

- 台账：docs/index.md D31 行（D30 行加修订互链）+ 外部材料登记表 +1 行（第四处外部源）；
  dev-loop §0.5（计划先落盘段 + 打磨型输入源）与 §12（research 段改写）；AGENTS.md 布局 +1 行；
  ROADMAP 头部防误取句；proposed/README 上游边界句；旧 Note
  [research-notes-lifecycle](./2026-09-25-research-notes-lifecycle.md) 加再修订互链。
- 并行会话备忘：本轮与「打磨轮 2」（同日另一会话）交错执行——其 owners.md 指针修复按协议移交
  本轮提交（commit `63f8024`）；双方各自整轮提交，零互相吞并。
