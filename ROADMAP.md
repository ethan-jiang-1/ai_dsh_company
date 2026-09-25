# 队列 · 开发流（条目制，D23）

> 性质：**当前任务队列（D24）**。用户说“继续下一条”时查 §队列；只从当前条目/搁置项取任务，不从历史段推断。
> **完成即离队**：验收通过后删除队列行，交付证据留 Note。任务入口、授权、实施和收尾唯一流程见 `docs/guides/dev-loop.md` §0.5/§1/§12。
> 队列条目默认由新对话上下文接手（D23 本仓适配）；用户明确任务优先于队列顺序。
> **队列 = 有序索引，不是全文**：feature 条目配 `notes/proposed/` RFC；问题、取舍与验收留在 RFC。队列行 ≤3 行（主题 / 状态 / 链接 / 验收指针）。Plan Mode 条件唯一见[开发环 §0.5](./docs/guides/dev-loop.md)。卫生小修与触发型条目可不设 RFC。
> 历史决定按 `docs/index.md` 台账与对应 Note 查阅；本文件历史段不提供当前任务。

## 队列

▶ 表示明确在办；⏸ 不自动开工。用户指定任务优先于队列顺序；若只有暂停项，逐项报告其阻塞/触发条件及谁或什么能复活（例如等人裁决或等上游新 tag），不从历史条目推断任务。

- ⏸ **snapshots 与 live 盘差异逐项语义目录**（低优先磨活；机械层已过——`deliverables-check` ALL PASS +
  r3 重录随手册完成；可后台派活不占轮）。
- **记事面治腐化**（发散线索立家 + 指针修复，2026-09-25 盘点产出入队）：RFC =
  [proposed/notebook-hygiene](./notes/proposed/2026-09-25-notebook-hygiene.md)——「磨清单」立家（三条观察项）/
  触发型两条补索引 / intents 指针 / `rejected` 合同裁断 / index 研究树登记；验收 = verify ALL PASS + 无悬空引用与死链。
- **长程自主执行的目标形态**（交付型 vs 打磨型，2026-09-25 盘点产出入队）：RFC =
  [proposed/longrun-goal-shape](./notes/proposed/2026-09-25-longrun-goal-shape.md)——goal objective 写预算与输入源
  而非固定条目清单；落点 = dev-loop §0.5 一小段；验收 = 下次长程执行按预算式 objective 起 goal 并到点自评收口。
- ⏸ **升 pin dsh-v0.1.5-rc.2 → dsh-v0.1.7-rc.2（触发型搁置；2026-09-25 靶校正：上游已发 rc.2 = `477b4f42`）**：
  RFC = [proposed/pin-upgrade-0.1.7-rc.2](./notes/proposed/2026-09-25-pin-upgrade-0.1.7-rc.2.md)（阶段 0 靶校正 +
  七步程序，不捆绑 15 收割项）；材料 = [增量报告](./notes/research/2026-09-24-dsh-upstream-delta.md) + [迁移方案](./notes/research/2026-09-24-pin-upgrade-and-harvest.md)；复活条件 = 某条目需要新基座或用户重新拍板。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；被否决的方案不进（那归 D 号 / 复盘 / `rejected`）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **自主节律**（分身定期复盘） | [implemented/twin-cultivation](./notes/implemented/2026-09-22-twin-cultivation-and-self-learning.md) §四 | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在 live 会话投递且默认没装；webhook 起的会话进不了 goal 循环；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam——**提 seam，不自建调度器**（D9/D13） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](./docs/delegation.md) §4.4 | 本组合无干净解法：缺 per-child composition 与不撞名的控制面 | 上游 seam |
| **M2 自定义 provider** | [index](./docs/index.md) 待定 Q1（已闭合） | 只在需要**组合隔离**时才有价值；"跟 VP 连续对话"的需求已由 team 持久成员满足 | 出现必须隔离组合的具体需求 |
| **界面外推送 / 收件箱** | [org-presence-board（已毕业）](./notes/implemented/2026-09-22-org-presence-board.md) §背景 | egress 只有 `sessionTelemetry`（OTel）与 hooks，webhook 是 ingress；收件人是谁、粒度多细属部署选择 | 明确的物理人通知需求 + 选定部署面 |
| **消息级协作动态流**（在场板 v1 的动态流只含成员/任务迁移差分） | R5b 机制核实（[implemented/2026-09-23-r5b-cockpit](./notes/implemented/2026-09-23-r5b-cockpit.md)） | 消息内容要 host 侧折 lead 会话 team 事件（`sessionProjections.stateOf(…, 'agentTeam')` 通道已核实存在）→ 自建 Typert Remote——但其**客户端 stub 由 vendor codegen 管线生成**，本 pack 无接线；自建 codegen 不值一轮 | 上游提供 pack 侧 remote stub 生成，或公开 host-only 投影的客户端读 RPC |

## 维护规则

- 顺序、范围或阻塞变化：改 §队列并更新相关 Note；验收完成即删除队列项。当前任务与交接规则唯一见 [guides/dev-loop §0.5/§1/§12](./docs/guides/dev-loop.md)。

## 历史维护记录（非当前指令）

以下是历史记录，不是当前指令。旧轮次、完成标记、环境状态和旧探针结果仅说明当时状态；当前任务从 §队列读取，当前操作规则见对应合同与活跃 Note。

- 2026-09-23（**R5b 收尾**）：R5b ✅。开工前四条 Q5–Q8 手算 + 源码核对后钉死（D22）——
  "会话 × preset"主键被两份录制**证伪**（child 的 `agentPreset` 恒 `ceo`、
  `agent-preset/selected` 0 条）改判 team roster；冷启动改拉式 RPC（原计划的
  `session/event` 订阅 + `sessionQuery` 合并整个不需要）；成员空间入口照官方
  `openTeammate` 模式（catalog 对非 team child 亦可达）。r2-motion replay 场景新增
  **presence 判据档**（`replayJudges: presence`）：历史录制（内容快照）的全量零 diff
  必然红（persona/手册/工具表演进 = 重放灵敏度证据），改断言 member/task 集合等价 +
  在场板同形；queued 尾部 2 条投递差为重放时序固有边界（显式记录不判据）。
  提案毕业（条目全有归宿：消息级动态流进搁置池）。台账 D22。
- 2026-09-23（**R6 内容诊治插轮，原 R6「分身成长」改号 R7**，用户决定）：动因 = 五轮堆叠后内容腐化
  已有实证——① AGENTS.md「当前状态」沉积五轮收尾快照并与本表轮间待办整段双写（违反 D10
  「一处事实一个家，只写 now」）；② index 已闭合的待定 Q1 仍挂着；③ 本表计划层躺三段已 ✅ 的
  轮间待办历史；④ 原 R6 行「U1 只剩实证钉死」文字过期（探针已完成）——语义过期会复发
  （r5-plus §5 修过一次）。决定：插**纯整治轮 R6「内容诊治」**（不交付新功能），两条线：**线 A · 内容腐化诊治**（四面 =
  docs/ 全层 / AGENTS.md 入口链 / company-workspace（手册 + kb；R4「journal 不压」默认不重开，
  重开须带新证据）/ notes/ 指针核对（历史不重写））；**线 B · 流程对齐审计**（用户同日补充）：
  本仓是 DSH 研发纪律（D13）的**头一次实际使用**——对照 AGENTS.md 纪律表逐条核对已闭轮实践
  （届时 R0–R5b；权威在 vendor 树，不认本仓转述），抓两类偏差：没严格遵循的、把「灵活性」
  理解错的（哪些是允许的规模裁剪、哪些是违规偏离），弹性边界写清，目标 = **让今后的开发更舒适**；验收 = **入口链探针**（全新上下文只读入口链
  答「现在」问题）+ **防回堆机械门禁**进 `pnpm verify`（均带反证）；定位 = **首次全量 + 制度化
  「磨」**（用户原话：「打扫卫生要磨几次才可能磨好」），审计先行产两份清单（「腐化点清单」= 线 A 逐文件逐类；「流程偏离清单」= 线 B 逐条纪律），量超一轮按
  D11 拆轮。原 R6「分身成长」整体后移为 **R7**，范围与前置不变（行内过期的 U1 文字顺带改完成态）。
  **旧轮号处理**：本节 2026-09-22 各条与 `notes/intents.md`、`notes/implemented/` 旧行**保留旧轮号
  不改写**（历史就是历史——这正是诊治轮要立的榜样；映射以本条为准）。台账 D21。
- 2026-09-22（**立"提案消化"纪律**，用户要求"roadmap 一定要消化掉 `notes/proposed/` 里的东西"）：
  `notes/proposed/` 不是停车场，三条：
  ① **进 proposed/ 时就必须在本表有归宿**（某轮的行 / 轮间待办 / 搁置池）；
  ② **轮次收尾时逐条核对**它进的那一轮的提案——每条要么已交付、要么转轮间待办或搁置池、要么
     明确不做（逐条写进该提案的「条目去向」表）；
  ③ **消化完就毕业**：条目全有归宿后，文件从 `notes/proposed/` 搬到 `notes/implemented/`、状态行
     写「已消化」——**毕业 ≠ 全部实现**，而是"每一条都有归宿"。
  两条机械门禁已立（`pnpm verify`）：`proposal-scheduled`（提案必须在本表出现）、
  `proposal-graduated`（已消化的不许赖在 proposed/），均有反证。**门禁管不到的部分**：它只保证
  "有归宿且该毕业的毕业"，不保证"会实现"——那要靠在**验收列 / 轮内最窄验证列**里点名。
  首次执行：`workspace-hygiene` 已毕业（R4 ✅；1 条转轮间待办 ②、1 条按决定不做）。
- 2026-09-22（**R4 收尾后把 R5/R6 的排期理顺**，用户要求）：① **轮次顺序在表里显式化**——R5b 标
  `⏸ 待命（排在 R5a 之后）`、R6 标 `⏸ 待命（前置全清；排在 R5b 之后）`（原先一个 `—` 一个 ⏸，
  读不出先后）；② 原「轮间待办（R5a → R6）」的 U1 探针**已并入 R4 → R5a ①**，撤掉那节重复块
  （同一件事不占两处，最小步骤改作 ① 下的引用块）；③ **R5b 开工前必须钉的四条决策升为
  `docs/index.md` 待定 Q5–Q8**——原先只藏在 r5-plus-readiness §9 P2（文件已删，R6 D1），
  而新会话开工动作读的是「index 台账 + 待定 Q」，藏着的决策等于没有；④ `index` 的**合同出生
  地图**改 R5 → **R5a**，并补 R5b（不单独出生合同）与 R6（培养/学习合同，名字待定）；⑤ `AGENTS.md`
  命令表补上 R4 新增的两个脚本（`deliverables-check` / `snapshot-motion`），并把散落的 `R5` 旧指代
  统一到 `R5a`。
- 2026-09-22：**R3 收尾**——R3 ✅、R4 标 ▶ 下一轮。R3 的验收口径在本轮被实证改写两次：
  ① "team 两包改直插行"其实 R1 起就已直插（本轮只做验证）；② 原计划的 `continuable` 命名委托
  被"team shadow + 按成员名字寻址"三层证据否掉，改 one-shot 前台（D18）。同时立了
  **测试分层纪律**（guides/dev-loop §9.1：真模型/真浏览器不进回归）——起因是用户当轮指出
  "这种测试如果是 regression 的话跑得这样慢完全受不了"。详见
  [implemented/2026-09-22-r3-reporting-line.md](./notes/implemented/2026-09-22-r3-reporting-line.md)。
- 2026-09-22：三篇提案进轮（④ 共享盘卫生 → R4、① 组织在场板 → R5、②③ 分身成长 → 新增 R6 待命），
  R6 的阻塞项是轮间待办两条接线修复 + U1 实证；原因与验收判据见各自提案（`notes/proposed/`）。
- 2026-09-22：**R4 收尾**——R4 ✅、R5a 标 ▶ 下一轮。R4 的验收口径落地为**机器判据**：成品
  `deliverables/<slug>/final.md` 必须回溯到一次 **Lead（CEO）会话**的 `present`，判据同时守
  过程稿与"非 Lead 越权定稿"（`scripts/lib/deliverables.mjs` + `scripts/deliverables-check.mjs`
  + `tests/deliverables.spec.ts`，含反证）。三处判据设计决定与"成品归 Lead"的依据见
  [implemented/2026-09-22-r4-workshop-flow.md](./notes/implemented/2026-09-22-r4-workshop-flow.md)；
  台账 D20。同轮：R3 留的 `subagent` continuable footgun 关掉（四职能 preset 补控制面，teammate
  侧残留留 R5a）；**journal 回溯压缩决定不做**（规则已立，理由见该 Note）。
- 2026-09-22（**R4 收尾后按用户要求逐条核对 `notes/proposed/` 的条目归属**）：4 个提案文件在本表都有
  引用，但**按条目**核出一条漏的——`workspace-hygiene` 第 3 条「练习场 ≠ 运行场」写进了 R4 的
  **"做什么"列**却从没实现（全仓 scripts/tests/packages/dev/手册/指南零痕迹），而 R4 已标 ✅。
  **教训（升为规则）**：本表的"做什么"列是**描述性**的；**只有进了"验收"列或"轮内最窄验证"列的
  东西才会在收尾时被逐条核对**——本轮实测：进了两列的 2/2 都交付了，只在"做什么"列的 1/1 漏了。
  故两笔：① 该条转轮间待办（R4 → R5a）②；② 加**机械门禁** `proposal-scheduled`（`pnpm verify`）：
  `notes/proposed/` 下每个文件都必须在 当时的 `docs/plans/roadmap.md`（现迁至根部 `ROADMAP.md`）里被引用——提案被遗忘时门禁变红，不再
  依赖下一次有人想起来问。
- 2026-09-22：**轮间待办（R4 → R5a）新增"按问题组队"**——用户观察（"CEO 不需要每件事都让 4 个
  手下忙，我要的是团队随问题成形"）经查证属实：实测四场动议里三场是**人在指定名单**，没人指定
  的那场是 4/4 全员。归轮间（不占轮），且它就是 R6 那条 U1 活体探针的实操 ⇒ R6 前置全清。
- 2026-09-22（R4 轮内做的 R5+ 就绪度梳理）：**R6 的阻塞项已清、文字已过期**——两条接线修复 R2 后即已落地
  （`includeDefaultRoots: false` + `agent-instructions` 行），U1 已在源码层回答（skill 条目改动
  下一轮生效），U2/U3 随隔离作废。据此本轮同时做了三件事：① **R5 拆成 R5a（门禁与发布）/
  R5b（驾驶舱）**——原来 4–5 个面塞一轮，最不确定的 replay harness 会卡住皮肤；② 新增
  **搁置池**（自主节律 / 并行快捷派活 / M2 / 界面外推送，四条都是"缺 upstream seam 或明确需求"）；
  ③ 轮间待办加 U1 活体探针（R5a → R6）。判据、证据与打磨细节见
  台账 D19。（原依据 r5-plus-readiness.md 已删——R6 D1）
- 2026-09-23（**可视表达优先 · 队列次序调整**，用户决定）：用户判断现 UI「看着还是比较粗糙」、要
  「不讲解也能看懂」并要视觉表达力与动效 ⇒ 队列序改为 **① demo 可视表达 ② 面板窗口化 ③ 分身成长
  （原首条后移）④ 整治转待办**；**原「UX 打磨」被 ① 吸收并毕业**（`notes/implemented/2026-09-23-ux-polish.md`
  含逐条去向）。同日两条新 feature 的 RFC 落 `notes/proposed/`（demo-visual-expression / panel-float），
  依据 = 研究笔记 `notes/implemented/2026-09-23-visual-expression-for-demo.md`（三线调研：平台能力 / 生态与官方口径 /
  设计参照与库选型）。**依赖选型门槛（用户令）**：新引入的插件/依赖必须成熟 + 高采用 + 可审计，
  否则自建；第三方 DSH 看板插件因采用度与"git 安装会在沙箱外执行 prepare"风险被否决（借设计不装）。
- 2026-09-23（**research 层生命周期立规**，用户决定）：`notes/research/` 只放**活研究**（在飞 / 供未开工条目 /
  明确"今后才做才有意义"而留着的题）；**结论落地即毕业**到 `notes/implemented/`（与提案同一终态层），
  状态行写「已落地（研究）→ 落点」。判据 = **还有没有未完成的条目/决策在等它**。首批执行：3 篇已落地研究迁走
  （agent-workflow-community-practice / dsh-inround-task-surface / replay-harness-feasibility，引用同步改路径）；
  留 2 篇活研究（digital-twin-cultivation 供序 3 条目、visual-expression 供序 1/2 条目）。规则家 = guides/dev-loop §12。
- 2026-09-23（**条目 ①「demo 可视表达」收尾**）：公司视图 v1 交付（S0 地基 / S1 四面板 + `session/follow`
  流式动态 / S2 皮肤令牌化 + 团队工具卡 / S3 零依赖动效）；用户验收**通过**（原话「不错，这个超出了我的
  预期，尤其是结构上」）。**完成即离队**：队列删行，收尾 Note = `notes/implemented/2026-09-23-company-view.md`，
  RFC 毕业到 `notes/implemented/2026-09-23-demo-visual-expression.md`（状态「已消化」）。打磨点去向：
  视觉细修 → 新条目 **视觉打磨**；面板可移动 → 递补为队列首条的 **面板窗口化**（其首要决定 = 四面板是否
  提升为平台页签）；**命名在本条目内解决**（design/ui-demo §5 命名表：公司视图 / 公司驾驶舱 / 四面板）。
  同轮立规：**实施期发现要留痕**（真页面发现的行为缺陷登记回条目 RFC，不许只活在 commit 里）。
- 2026-09-23（**条目 ②「面板窗口化」收尾**）：公司页签 v4 交付（A1：看板/依赖图/在场/用量/任务板五个
  平台页签 + 页签头「浮出」+ 公司视图一键浮出 + 任务板按钮改 launcher ⇒ anchored 弹窗退役，原始投诉
  从根上消灭）；**驾驶舱并入「在场」**（`CompanyPane.tsx` 删除，行可点 + 流式动态保留）。真页面机器判据
  全绿（浮窗 grip/resize/dock 三件套 + dock 收回 + anchored 不在场）。**完成即离队**：收尾 Note =
  `notes/implemented/2026-09-23-panel-tabs.md`，RFC 毕业到 `notes/implemented/2026-09-23-panel-float.md`。
  命名表随迁（design/ui-demo §5：右栏 = 公司页签 ×5；改名映射追加 驾驶舱→在场）。实施期发现（已留痕）：
  `openTab` 落位对 `active()` 有延迟 ⇒ 推迟 + 重试 + kind 守卫；停靠 pane 上限 2 / 布局仅内存 = 平台事实。
- 2026-09-23（**条目「视觉打磨」收尾**）：★ 退役（→ 官方 `Tag`「Lead」）/ 内联样式收口（含 DAG 边样式进 CSS）/
  空态统一（`StateNote` 一处定义）/ **DAG 边对比度修正**（待办边 1.47→3.71、已走通边 2.28→4.14，用
  `color-mix(成功绿 70%, 标签墨色)` 做主题自适应、零字面色）。深色与窄窗**机器核对**全绿（读不了截图 ⇒
  全用 computed style 判据：主题翻转 + 对比度 + 无溢出）。**完成即离队**：收尾 Note =
  `notes/implemented/2026-09-23-visual-polish.md`。队列首条归位 = **分身成长**（原队列首条，两轮 UI 条目后回归）。
  新增整治待办：公司手册加「文件以单个换行结尾」（排练场产物两次撞 `md-newline`，根治在手册）。
- 2026-09-24（**条目「分身成长」收尾**）：培养 + 学习一次完整回路走通（教训源 = 用户 9-23 真动议
  `ent-agent-platform` 五份 journal，复用零新成本；人审 A/B〔用户批〕+ G〔授权代理裁定〕→
  `presets/ceo/skills/chairing-staff-meeting/` +4 行，四道检查全绿）。**生效边界按面钉死并修正 U1**
  （persona / 组合文件 = 新会话；**skill 正文 = 同会话下一轮**——活体探针量日志工具结果，证伪
  2026-09-22"只有新会话变"，与 vendor"每次 get() 读盘"一致）；合同落
  [presets.md §培养回路与学习载体](./docs/presets.md)（落现有家零新增；出生地图解决，台账 D25）；
  RFC 与 digital-twin 研究笔记双双毕业（**`notes/research/` 清空**——规则不变：活研究进、落地即出）；
  教训候选 C/D/E/F 留今后培养轮（清单住 RFC 条目去向表）。**完成即离队**：队列剩整治转待办
  （当夜按用户长程授权消化中——逐项进展见后续维护规则行与晨报）。
- 2026-09-24（**整治转待办四项销账**〔当夜长程执行第一批〕）：**W3** COO 模板指认改齐
  （pack persona + 三 skill → `ops-review-note.md`，CHARTER 勘误行随移；commit `0df46b6`）；
  **W11** 四份职能 CHARTER 收工动作对齐三态路径 + CEO 份对齐 final（`d012d10`）；
  **W9** 互审稿命名钉 `{role}-review` + **W10** 手册加「文件以单个换行结尾」（`95280df`，
  手册经符号链接同生效于排练场——根治排练产物撞 `md-newline`）；排练场参考镜像已刷新
  （rehearsal-init）。验证：verify 16 项 + test 91/91 + preset-smoke 真挂载 ALL PASS
  （COO preset 面改动的入戏认证归当夜培养轮 2 认证档一并跑——见后续行）。
- 2026-09-24（**W8 销账：invest-mobile-complement 两篇 journal 补记**）：实盘核实 vp-eng / vp-sales
  均参与该动议（`drafts/` 有各自权威稿）但未留 journal——违反手册「收工留痕」。处置 = **补记**
  （优于豁免：drafts 是各自会话真实产出，据此回填不属编造）；两篇补记纪要鲜明标记【补记 2026-09-24】
  + 指认权威稿 + 细节以稿为准。
- 2026-09-24（**培养轮 2（当夜）**）：候选余量 D/E/F 提升（D/F→CFO `project-economics`、
  E→VP-Sales `sales-workflow`；证据 = `ent-agent-platform` journal；执行依据 = 用户"其他的你来
  定夺"委托 + 睡前长程授权，可单 commit revert）；候选 C 仍留今后培养轮（跨角色载体 = 真分叉，
  提案要点进晨报）。验证 = verify + test + preset-smoke + `probe --full` **15/15 全部命中**（含
  §9 单题重试；该认证档同时覆盖 W3 的 COO 挂载）。收尾 Note =
  [implemented/2026-09-24-cultivation-round-2.md](./notes/implemented/2026-09-24-cultivation-round-2.md)。
- 2026-09-24（**磨审计（当夜，R6 缺口清单 6 项）**）：① journal 行号引用全量核——121 处提取比对，
  118 精确命中；2 处**先前已存在**的过期（coo journal `:8`"维护合同不在池内"现行无此行、vp-sales
  journal 引 coo `:14` 载体清单实为 `:13`）+ 3 处当晚预期错位（勘误历史记述）——全在冻结 journal 层，
  不改写、仅登记；② presets↔CHARTER↔persona 三方比对——**PASS**（W3 后指针零残留、数字不进 pack
  〔D17〕、veto 语义由当夜探针活证）；③ 0001/0003 深读——守卫全在岗，修 1 处过期指针（0001 行动项 3：
  plans/roadmap.md → guides/dev-loop §12）；④ guides/budget-and-ops 旋钮对 vendor 复校——**PASS 零漂移**
  （8/256/64/64KiB/maxDepth 3 全对钉住 tag）；⑤ research 即时性——3/3 已毕业且修正随行
  （digital-twin §6 当夜补）；⑥ snapshots 差异机械层——`deliverables-check` ALL PASS（0 违规）+
  **replay-smoke 抓到真漂移**（手册 W9/W10 进注入消息 ⇒ r3 录制过期）→ 按 §9.1 重录 + harness 修
  防再犯（commit `bc297b6`）；语义逐项目录留待办。**归档层评估（同夜）**：结论 = 暂不归档——
  r0-loop-acceptance 被 guides/dev-loop §7 引为实操出处（**活判据，待办原前提有误记正**）；其余五篇可归档
  但净文件数不减、33 篇信噪比尚可，等规模翻倍或合并整治轮再兑现。
- 2026-09-24（**entry-probe 判据时间不变化**〔整治转待办销账〕）：两案选**时间不变问法**（另一案
  "收尾程序加刷新步"否决——多一个会忘的人工程序，且同病同根「时变状态进时不变载体」）。Q1 判据
  弃锚条目名改断言路由 + 记录家（ROADMAP §队列 + 收尾 Note/台账/git）；Q2 改问「完成即离队」语义
  （原"下一项"锚 /UX 打磨/ 早已过期）；Q4 tag 判据改形状 `/dsh-v\d+\.\d+/`（升 pin 不烂）；归档
  同日重跑不再覆盖（时间戳后缀）。keyless 验证：node --check + 形状判据命中当前与假想未来 tag +
  期望 token 在入口链可读；真跑归当夜收尾认证档。
- 2026-09-24（**晚 · 统筹计划落盘 + 队列重排**）：用户四项裁决——主轴 = 自用+演示并重 / 升 pin
  dsh-v0.1.7-rc.1（增量报告确认后执行）/ N1 方案 A / 主线 = 支柱 1 经营深度；工作方式确认（计划先
  显性化 `notes/proposed/` 再按"继续下一条"逐条执行，已落 guides/dev-loop §0.5）。整治转待办块解散：
  N1 升队列首条、升 pin 转基座轮条目、教训候选 C 并入记忆收敛条目、snapshots 语义目录留 ⏸；
  四份新 RFC 落 proposed/。同日早些时候：基石整治收尾提交并推送（`da4405c`）；push 走显式 URL
  不更新 origin/master 引用（曾显 ahead-131、实为 5，push 后 fetch 即正——运维注意）。
- 2026-09-24（**晚 · Note 生命周期吸纳**）：按用户令"点选吸纳、不推翻现有"，从外部参考
  `01-agent-note-lifecycle`（DSH sdlc-reference）吸纳六条进 guides/dev-loop §12（状态行惯例 / 备选必载 /
  毕业即改写 / 新增触发取代检查 / rejected 去留 / implemented 只跟事实）；四项显式不吸纳（class
  子目录 / archived 冻结树 / 去中心化 INDEX / 严格格式门禁）理由与取舍 =
  [implemented/notes-lifecycle-absorption](./notes/implemented/2026-09-24-notes-lifecycle-absorption.md)；
  材料登记进 index 外部研究表。
- 2026-09-24（**晚 · 主线改向：驾驶舱·人机协作优先**）：用户裁定当前重点 = 驾驶舱体验（人的操作台）+
  人养 Agent + agent 协作之外的三个停点（通知人 / 问人 / 等人批）；升 pin **不是重点**——RFC 经用户
  手动移入研究层、队列降触发型 ⏸（材料全备）。机制面核实（rc.2）：三节点均有载体——`tool-ask-user`
  问询 / `user-approval`（`ctx.approval` + answerer waterfall，**pack 可组合 answerer 路由"这单谁批"**；
  请求轮内有效，跨轮审批上游 deferred）/ 通知可从会话事件推导（r2-motion 五份日志均含相关事件字样，
  精确形状切片一实证）——**驾驶舱线不需要升 pin**。
- 2026-09-24（**晚 · 驾驶舱线 RFC 落盘**）：
  [proposed/cockpit-human-loop](./notes/implemented/2026-09-24-cockpit-human-loop.md) 四切片进队列
  （①注意力中心 / ②审批闸门 / ③问询路径 / ④培养面板），三个待裁点写进 RFC（审批闸哪个动作 /
  问询路径甲乙 / 收件人模型）；既有条目顺位后移（记忆收敛+培养3、新动议 ×2 兼任驾驶舱验证场、
  呈现叙事殿后）。落盘后停笔待用户 review。
- 2026-09-24（**晚 · 驾驶舱线三分叉自裁**）：用户指示"设计分叉默认自裁、仅真卡住才问人"——①审批闸
  org.md 现行双签线（毛利 <30%/折扣 <9折 ⇒ CFO 触线请求；present 前闸与新增固定支出落选，理由在
  RFC）；②问询路径甲乙都做且作用域不重叠（甲 = 动议内升级中继，并入注意力中心第四类条目；乙 = 独立
  VP 会话加 ask-user——teammate 本无 preset 工具面，故不碰动议内承诺权）；③收件人模型 v1 单操作者 +
  owner 字段 + answerer 路由表形状。取舍全文 =
  [RFC](./notes/implemented/2026-09-24-cockpit-human-loop.md) 各节。执行转入长程 goal（用户令）。
- 2026-09-24（**晚 · N1 执行销账〔goal 第一条〕**）：方案 A 落地——7 文件改名 + 85 文件引用两遍改净 +
  标题去前缀；verify（md-links ×321）/ test 157 项全绿。**两笔顺手账**：① entry-probe 既有缺陷修复
  （prompt 未教转义内嵌双引号 ⇒ 非法 JSON；13:44 旧 run 已 0/8 但结果没被记录——门禁"立了没真跑"的
  教训）② 探针修后 8/8 且抓到真缺陷：「四角色」残影两处已改。收尾 =
  [implemented/n1-docs-naming](./notes/implemented/2026-09-24-n1-docs-naming.md)；RFC 毕业即改写。
- 2026-09-25（**凌晨 · 驾驶舱①「需要你」注意力中心销账〔goal 第二条〕**）：`src/lib/attention.ts` +
  `attention-registry` + `AttentionTab`（页签 `company-attention`，五页签之首）。**实施期机制升级**
  （留痕）：问询/审批改走 `ctx.remote.$on` 远端事件观察者（vendor `ui-approval`/`ui-user-questions`
  同款 waterfall，只登记不拦截）——比原计划的折会话日志更实时、跨会话、零流成本；完成/升级仍走
  follow 流折算。验收：keyless 9/9（全套 166/166）+ client-load 真页面零挂载 + 真模型证据（CEO 挂起
  `ask_user_question`：tool/call 无 result、turn 保持打开——agent 真停等人，排练场跑）。**登记缺口**：
  面板 DOM 最后一跳归切片二 e2e；「不讲解也能看懂」走查留用户。RFC §切片一标注实施实况。
- 2026-09-25（**凌晨 · 驾驶舱②审批闸门销账〔goal 第三条〕**）：`request_signoff` 工具（`ctx.approval`
  管线，挂既有 `company-client` bundle 行；应答 = 官方 ui-approval 面板，无需自建 answerer）+ CFO
  `project-economics` 触线触发 + keyless 5/5 + 培养四门禁（probe --full **15/15**）+ **总验收 e2e 7/7
  全回路**（`scripts/attention-e2e-smoke.mjs` 固化为认证档：触线→审批→注意力面板 DOM〔切片一缺口
  闭合〕→人批 allowed-once→同轮收口；截图归 snapshots/attention-e2e/）。**实施期两发现**：① COO 失控
  编排（事实题办成团队动议，27 步单轮）→ persona「事实直答」纪律线修复；② pack 双编译面拆分
  （host/client 类型增强冲突）+ §7 构建配方更新（`tsc -b`；不重建 lib = 代码改动永不生效的教训）。
- 2026-09-25（**凌晨 · 驾驶舱③问询乙销账〔goal 第四条〕**）：四 VP preset 加 `tool-ask-user` + 手册
  「问人两条路」两模式注记（动议内升级 CEO【待澄清】前缀 / 独立会话直问）；**机制修正留痕**——teammate
  团队面本就带 ask_user_question（r2-motion 实证），汇报线一直是内容层约束。验收 = 培养四门禁全绿
  （probe --full 15/15，ceo#1 一次并发抖动重试过）+ 真模型证据（独立 VP-Eng 直问挂起、turn 保持
  打开）。承诺权与单一对外口径不动（R3/D18 维持）。观察项：探针默认 90s 超时偏紧（coo#2 / ceo#1
  两例并发抖动）。
- 2026-09-25（**凌晨 · 驾驶舱④培养面板销账 + 人机协作线毕业〔goal 第五条，驾驶舱线收官〕**）：
  `remote.workspaceFiles`（list/read）数据面 + `src/lib/cultivation.ts` + `CultivationTab`（页签
  `company-cultivation`）——每角色 journal 待审收件箱 +「怎么养」三步指引；v1 登记缺口 = 最近提升
  skill / 探针状态（仓库侧数据，浏览器面够不到）。验收 = keyless 5/5（全套 173）+ client-load +
  **真数据走查 PASS**（46 篇真 journal 如实进面板，截图归档）。**四切片全交付 ⇒ RFC 毕业到
  implemented**（[cockpit-human-loop](./notes/implemented/2026-09-24-cockpit-human-loop.md)）——
  人机三节点（通知 / 问询 / 审批）+ 人养 Agent 全部机制化。走查留痕：新建空会话不进侧栏树；工作区
  切换 = 树上组节点展开 + 既有公司动议会话作上下文。
- 2026-09-25（**凌晨 · 记忆收敛+培养轮 3 销账〔goal 第六条〕**）：手册「轮末收敛」**首次执行**——
  46 篇 journal 压进五 CHARTER「历史纪要」（同题复核系列合并成条、全文 100% 归档
  memory-convergence-2026-09-25，git 记为干净 rename）；journal 清空 ⇒ 培养面板真实待审归 0；
  **候选 C 引用两分法提升进手册「路由规矩」**（载体自裁：跨角色一行；证据随归档固化）；ent-agent-platform
  归宿 = 教训提尽 + 六篇按角色前缀固化归档。验证 = verify / test 174 / deliverables-check 0 违规 /
  handbook-smoke。执行留痕：历史纪要维护者亲自提取；起草子代理 30 分钟无产出中断弃用（教训）；
  章程路径门禁拦下注记行反引号 journal/（改「」修复）。RFC 毕业即改写。
- 2026-09-25（**凌晨 · 新动议 ×2 销账〔goal 第七条，两场真跑〕**）：**季度经营会** 241s（CFO/COO 主角
  零 VP；Q3 总判「判不了」+ Q4 三条补件 + 新口径出台；**收敛后首场 = 历史纪要回环闭合**）；
  **事件复盘** 100s（场景 B 续集；**Q3 新口径首次实战 = 跨动议组织记忆生效**；根因区分已证实/待验证）。
  验收 = 两场 deliverables-check 0 违规 + demo.md 场景 D/E 分镜 + 当轮收敛（培养面板归 0）+ 快照归档。
  通道 D 记「可选未取」。观察项三条进磨清单（journal 缺口二犯 / 文件名自记日期漂移 / 换行不合规）。
  RFC 毕业即改写 → [implemented/new-motion-types](./notes/implemented/2026-09-24-new-motion-types.md)。
- 2026-09-25（**凌晨 · 呈现与叙事销账〔goal 第八条，队列清空〕**）：切片一经营仪表——台账事实家
  `kb/motion-ledger.md`（10 场动议，维护挂进当轮收敛）+ `LedgerTab` 页签（keyless 4/4 fixture 即生产
  文件 + 真数据走查 10/10 PASS）；切片二叙事（demo 场景 D/E 分镜 + 快照）已随新动议条目交付，replay
  场景化登记为触发型缺口；切片三视觉打磨二期触发型注册。**实施教训**：workspaceFiles.read 的 limit
  是行数且有 maxLines 上限。RFC 毕业即改写 →
  [implemented/presentation-narrative](./notes/implemented/2026-09-24-presentation-narrative.md)。
  **至此 goal 队列八条目全部完成**（N1 → 驾驶舱①②③④ → 记忆收敛+培养3 → 新动议×2 → 呈现叙事）。
