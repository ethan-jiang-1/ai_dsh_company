# 队列 · 开发流（条目制，D23）

> 性质：**根部队列文件（D24），只写"接下来"**——纯队列 + 搁置池 + 维护规则；**完成即离队**（不标 ✅，记录活在
> 收尾 Note + 台账 D 号 + git）。条目生命周期与收尾程序 = `docs/guides/60-dev-loop.md` §0 / §12。
> 每条目换全新对话上下文（偏离注册表已登记：交接靠入口链，不靠本文件携带）。
> **队列 = 有序索引，不是全文**：feature 条目必须配 `notes/proposed/` 的独立 RFC
> （问题/方案/输掉的方案/验收全文住 RFC；proposal-scheduled 门禁强制索引在场）；
> 队列行 ≤3 行（主题名 / 状态 / 链接 / 验收指针）。卫生小修与触发型条目可不设 RFC，
> 细节在条目开工的 Plan Mode 时写。
> 历史轮次 R0–R5b 的全文已随 R6 转型离队（细节：00-index 台账 D 号 + notes/implemented 各收尾
> Note + git 历史；轮号映射见维护规则 D21/D23）。

## 队列

- ⏸ **整治转待办**（R6 销账落入；低优先）：
  - 下次「磨」的输入 = R6 Note「审计覆盖缺口」清单（presets.md 三方比对 / research 即时性 /
    0001、0003 深读 / guides/50 旋钮复校 / journal 行号全量 / snapshots 差异——清单住收尾 Note，不复制）。
  - 编号方案（N1）：design/guides 目录编号与顶层合同双体系二选一（命名合同遗留，R6 Note 登记）。
  - entry-probe Q1/Q2 token 期望锚定 R6 期条目名（条目推移即过期；同日重跑会覆盖既有归档）：改时间
    不变问法，或收尾程序加"期望随队列刷新"一步（发现与证据 = notes/implemented/2026-09-23-dsh-inround-task-surface.md §十一）。
  - **升 pin**（触发型：上游出新 tag 时跑 `scripts/sync-dsh.mjs --pin`，合同 docs/release.md）——
    含 teammate footgun 残留处理（delegation.md §4.4）与搁置池顺手回看。

  - notes/implemented 归档层评估（原 r5-plus §7.4 迁入）：候选 = repo-scaffolding / docs-layering / dev-loop-guide / wochen-naming / r0-loop-acceptance / r1-docs-sync；仍带活判据的六篇（r3-reporting-line、skill-root-isolation、client-remote-single-mount、r2-roles-alive、r2-motion-run、r1-deploy-findings）不要动。
  - invest-mobile-complement 两篇 journal 补记或登记豁免（W8）：手册「收工留痕」vs 实盘缺 vp-eng/vp-sales 纪要。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；被否决的方案不进（那归 D 号 / 复盘 / `rejected`）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **自主节律**（分身定期复盘） | [implemented/twin-cultivation](./notes/implemented/2026-09-22-twin-cultivation-and-self-learning.md) §四 | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在 live 会话投递且默认没装；webhook 起的会话进不了 goal 循环；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam——**提 seam，不自建调度器**（D9/D13） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](./docs/delegation.md) §4.4 | 本组合无干净解法：缺 per-child composition 与不撞名的控制面 | 上游 seam |
| **M2 自定义 provider** | [00-index](./docs/00-index.md) 待定 Q1（已闭合） | 只在需要**组合隔离**时才有价值；"跟 VP 连续对话"的需求已由 team 持久成员满足 | 出现必须隔离组合的具体需求 |
| **界面外推送 / 收件箱** | [org-presence-board（已毕业）](./notes/implemented/2026-09-22-org-presence-board.md) §背景 | egress 只有 `sessionTelemetry`（OTel）与 hooks，webhook 是 ingress；收件人是谁、粒度多细属部署选择 | 明确的物理人通知需求 + 选定部署面 |
| **消息级协作动态流**（在场板 v1 的动态流只含成员/任务迁移差分） | R5b 机制核实（[implemented/2026-09-23-r5b-cockpit](./notes/implemented/2026-09-23-r5b-cockpit.md)） | 消息内容要 host 侧折 lead 会话 team 事件（`sessionProjections.stateOf(…, 'agentTeam')` 通道已核实存在）→ 自建 Typert Remote——但其**客户端 stub 由 vendor codegen 管线生成**，本 pack 无接线；自建 codegen 不值一轮 | 上游提供 pack 侧 remote stub 生成，或公开 host-only 投影的客户端读 RPC |

## 轮次与条目交接

开工动作 = [guides/60 §0.5](./docs/guides/60-dev-loop.md)；收尾程序 = [guides/60 §12](./docs/guides/60-dev-loop.md)（含收尾 Note 模板）。

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- 2026-09-23（**R6 收尾**）：内容诊治 ✅——腐化点 64 条销账（修 47/转待办 5/归档 4/不动 3）+
  7 项偏离证实（V1–V7）+ 防回堆门禁 ×2（notes-links/doc-budget，带反证）+ 入口链探针 8/8（反证 =
  Agent 主动报矛盾）+ 转型落盘（队列化 / 条目环 / §12 流程合同 / 纪律表替换 / 两合同落现有家）。
  **净减少结算**：docs/ 14→13 文件、2267→~1940 行、AGENTS.md 214→152、roadmap 192→134（结算表
  见收尾 Note）。**R6 = 最后轮号**——此后队列条目制，见本文件 §队列。
- 2026-09-23（**D23 · R6 后严格 DSH 研发流 + 防再犯机制，R6 = 最后轮号**，用户决定）：研究
  证实本仓对 D13「整套继承」实为**部分继承**——轮号制与 roadmap 历史沉积是本仓发明（D11 引据
  系把 FAQ dev-loop 的单变更生命周期拉伸成项目级轮次）、轮内 todo/plan 反馈面从未启用
  （机制在场、零纪律；依据与对照表 =
  [implemented/2026-09-23-dsh-inround-task-surface](./notes/implemented/2026-09-23-dsh-inround-task-surface.md)）。
  决定：① **R6 按原章程执行**（审计先行不动），收尾**新增转型落盘**（见 R6 行）；② R6 后
  **默认严格 DSH 套路**，偏离必须登记 D 号并附约束证据（如本地单人仓无 GitHub 协作面），
  不再默认「按规模裁剪」；③ **防再犯五件套**：全量纪律清单（从 vendor 逐源枚举，替换记忆版
  纪律表）/ 偏离登记制度 / 可机械化项进 `pnpm verify`（带反证）/ 入口链探针进认证档 /
  **升 pin（`sync-dsh`）时流程合同对 vendor 重校**（继承跟 pin 走，不是一次性）。
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
  「一处事实一个家，只写 now」）；② 00-index 已闭合的待定 Q1 仍挂着；③ 本表计划层躺三段已 ✅ 的
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
  `docs/00-index.md` 待定 Q5–Q8**——原先只藏在 r5-plus-readiness §9 P2（文件已删，R6 D1），
  而新会话开工动作读的是「00-index 台账 + 待定 Q」，藏着的决策等于没有；④ `00-index` 的**合同出生
  地图**改 R5 → **R5a**，并补 R5b（不单独出生合同）与 R6（培养/学习合同，名字待定）；⑤ `AGENTS.md`
  命令表补上 R4 新增的两个脚本（`deliverables-check` / `snapshot-motion`），并把散落的 `R5` 旧指代
  统一到 `R5a`。
- 2026-09-22：**R3 收尾**——R3 ✅、R4 标 ▶ 下一轮。R3 的验收口径在本轮被实证改写两次：
  ① "team 两包改直插行"其实 R1 起就已直插（本轮只做验证）；② 原计划的 `continuable` 命名委托
  被"team shadow + 按成员名字寻址"三层证据否掉，改 one-shot 前台（D18）。同时立了
  **测试分层纪律**（guides/60 §9.1：真模型/真浏览器不进回归）——起因是用户当轮指出
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
  `notes/proposed/` 下每个文件都必须在 `plans/roadmap.md` 里被引用——提案被遗忘时门禁变红，不再
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
  留 2 篇活研究（digital-twin-cultivation 供序 3 条目、visual-expression 供序 1/2 条目）。规则家 = guides/60 §12。
- 2026-09-23（**条目 ①「demo 可视表达」收尾**）：公司视图 v1 交付（S0 地基 / S1 四面板 + `session/follow`
  流式动态 / S2 皮肤令牌化 + 团队工具卡 / S3 零依赖动效）；用户验收**通过**（原话「不错，这个超出了我的
  预期，尤其是结构上」）。**完成即离队**：队列删行，收尾 Note = `notes/implemented/2026-09-23-company-view.md`，
  RFC 毕业到 `notes/implemented/2026-09-23-demo-visual-expression.md`（状态「已消化」）。打磨点去向：
  视觉细修 → 新条目 **视觉打磨**；面板可移动 → 递补为队列首条的 **面板窗口化**（其首要决定 = 四面板是否
  提升为平台页签）；**命名在本条目内解决**（design/30 §5 命名表：公司视图 / 公司驾驶舱 / 四面板）。
  同轮立规：**实施期发现要留痕**（真页面发现的行为缺陷登记回条目 RFC，不许只活在 commit 里）。
- 2026-09-23（**条目 ②「面板窗口化」收尾**）：公司页签 v4 交付（A1：看板/依赖图/在场/用量/任务板五个
  平台页签 + 页签头「浮出」+ 公司视图一键浮出 + 任务板按钮改 launcher ⇒ anchored 弹窗退役，原始投诉
  从根上消灭）；**驾驶舱并入「在场」**（`CompanyPane.tsx` 删除，行可点 + 流式动态保留）。真页面机器判据
  全绿（浮窗 grip/resize/dock 三件套 + dock 收回 + anchored 不在场）。**完成即离队**：收尾 Note =
  `notes/implemented/2026-09-23-panel-tabs.md`，RFC 毕业到 `notes/implemented/2026-09-23-panel-float.md`。
  命名表随迁（design/30 §5：右栏 = 公司页签 ×5；改名映射追加 驾驶舱→在场）。实施期发现（已留痕）：
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
