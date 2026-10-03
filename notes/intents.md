# 意图登记

> 本表 = 一行指针（日期 + 一句话 + 状态 + 链接）：授权链线索（用户点名/裁定）保留在"一句话"里，
> 交付细节与验证证据住对应 Note（复述 = 重复事实家，会独立腐烂）；活状态（待续/剩账）住
> `_backlog/plans/` 或 `notes/proposed/`。**窗口规矩**：活表 ≤60 行只留最近授权链，出窗行按月冻结进
> `notes/archived/intents-<YYYY-MM>.md`（grep 面不丢）。机械面 = verify `intents-row-budget`
> （表行 ≤500 码元 × ≤60 行）。

| 日期 | 意图与交付 | 状态 |
|---|---|---|
| 2026-10-04 | **交接轮：清账 + 双轴 review + 自主 E2E**（用户选三件 + 令「会话残留能清就清」+ 令「E2E 静默自主、自拟题、多角色、证据考核」）：①5 处版本过期引用对齐清零（三场三种性质）；②12 提交 Standards/Spec 双轴复查——1 假绿面 + 1 缺失反向门禁修复（均红绿）、2 项登记待人拍；③会话库 1221→125（判据=三仪器并集）；④E2E 自主动议 realtime-recon-2026（判据 13 点预注册、6 分钟全链、👍 点击呈现 7/7 闭环、抓到 3 个真缺陷已修 2）| 已交付 → [版本对齐=redis-r0 Note](./implemented/2026-10-03-redis-r0-native-collab.md) R0-3 节 + [code-review](./implemented/2026-10-04-code-review-12commits.md) + [E2E](./implemented/2026-10-04-e2e-realtime-recon.md)；待拍 = 无产物动议决策点 2 + R0-2(b)（见 code-review Note「登记不修」） |
| 2026-10-03 | **`_backlog` 章制回借**（用户令「从 ai_dsh_loop_advisor/_backlog 学习整理」+ 两拍板：全日期卡名、两桶解禁）：主干框架/三硬规则/章程账本二分/索引交叉核对入章程，9 卡 git mv + 账本组重写，门禁 plans-liveness → backlog-liveness | 已交付 → [implemented/2026-10-03-backlog-charter-refit.md](./implemented/2026-10-03-backlog-charter-refit.md)；规矩 = [_backlog/README.md](../_backlog/README.md) |
| 2026-10-02 | **notes 治理微整轮**（用户三连问：intents 意义 / research 残留 / pin-review JSON 落点）：intents 胖行手术回一行指针 + `intents-row-budget` 门禁（负例 = 出生现场 32 行红）；research/ 空残骸删；pin-review JSON 迁 archived/ 与先例同家 | 已交付 → [implemented/2026-10-02-notes-governance-round.md](./implemented/2026-10-02-notes-governance-round.md) |
| 2026-10-02 | **消化对账与整改轮**（用户点名「读 _digested 新消化、反省合理/不合理」+ 设 goal）：对账结论 = 借用之道全吻合；整改簿记/手册合同级/agent-team 钉值/child 面守卫四处；第二轮逐行 diff 挖出手册注入静默截断活 bug（maxBytes 16K→32K + handbook-budget 门禁，红→绿）| 已交付 → [implemented/2026-10-02-digestion-recheck-round.md](./implemented/2026-10-02-digestion-recheck-round.md)；残留 = [feedback 推敲卡](../_backlog/_done/_closed_plans/2026-10-02-feedback-channel-cultivation.md) |
| 2026-10-01 | **0.2.0 升级后全面自测轮**（用户点名「自测所有可能性，尤其交互与 UX」）：门禁 sweep + UX 走查 + entry-probe 语义矛盾清剿三线，7 条真漏全修 | 已交付 → [implemented/2026-10-01-selftest-round.md](./implemented/2026-10-01-selftest-round.md)；剩账（机制启用 RFC 追认）= [date-channel 推敲卡](../_backlog/_done/_closed_plans/2026-09-29-date-channel-mechanism.md) |
| 2026-09-30 | **0.2.0 插件收割轮**（用户点名「充分利用 DSH 新内置插件」+ 裁定批次与评估档）：判收四档台账 + 五批落地（standard 追平 / 全文检索 / 自主节律 / workflow / plan-mode+browser-use）| 已交付 → [implemented/2026-09-30-plugin-harvest-round.md](./implemented/2026-09-30-plugin-harvest-round.md)；待续两笔 = [残检收口卡](../_backlog/plans/2026-10-02-deferred-verifications.md) |
| 2026-09-30 | **升 pin → dsh-v0.2.0-rc.2**（用户点名）：448 commit 换基座，唯一硬破面 time-context 行双轨收敛；D27 vendor 自建偏离实证 | 已交付 → [implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md](./implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md)；证据 = [pin-review JSON](./archived/2026-09-30-pin-review-dsh-v0.2.0-rc.2.json) + [delta 报告](./archived/2026-09-30-dsh-upstream-delta-0.2.0.md) |
| 2026-09-29 | **角色上网能力逐 preset 声明**（用户令「主 Agent 和 Subagent 都要有」）：web-app 把 tool-web 改按 preset 组合 ⇒ 五角色曾静默无联网；含子会话继承实证 | 已交付 → [implemented/2026-09-29-role-web-access.md](./implemented/2026-09-29-role-web-access.md)；合同 = [presets.md](../docs/presets.md) §工具面 |
| 2026-09-29 | **启动摩擦整治**（用户令「fresh agent 一进来就该立刻明白怎么启动」）：独立子代理盲测验收 + 端口/文档口径/静默失败三根因修 + `script-port` 门禁 | 已交付 → [implemented/2026-09-29-launch-entry-friction.md](./implemented/2026-09-29-launch-entry-friction.md) |
| 2026-09-28 | **手动分发导出**（用户令「学 ai_dsh_architect/_dist 的精神」）：export-dist 一条命令出 tarball + 生成式安装手册，`dist-manual` 门禁 | 已交付 → [implemented/2026-09-28-dist-export.md](./implemented/2026-09-28-dist-export.md)；合同 = [release.md](../docs/release.md) §手动分发 |
| 2026-09-28 | **搁置池/磨清单整池退役**（用户裁决「照搬，全部退役」）：git mv 入 `_done/_misc/`，任务源收窄 = 已批 RFC + 用户点名 | 已交付 → [roadmap-retirement](./implemented/2026-09-28-roadmap-retirement.md)（D32 搁置池落点由本裁决作废，归档语义） |
| 2026-09-28 | **浮窗几何记忆 + DAG 边线车道分离**（用户令「依次放入 propose，都要修改掉」）：两张推敲卡毕业为 RFC 并同日交付 | 均已交付 → [float-geometry-memory](./implemented/2026-09-28-float-geometry-memory.md) · [dag-edge-routing](./implemented/2026-09-28-dag-edge-routing.md) |
| 2026-09-28 | **依赖图画布自适应栏宽**（用户试用反馈「画得乱」）：SVG 等比缩放修拦腰裁切真 bug；残留两项立 plans 卡 | 已交付 → [implemented/2026-09-28-dag-pane-fit-scaling.md](./implemented/2026-09-28-dag-pane-fit-scaling.md) |
| 2026-09-28 | **队列层退役：ROADMAP 删除**（用户令「痕迹彻底清理」；D32）：职能重接（次序→用户逐条给、在办→goal、已批→RFC 标记），反方论据全文存档 | 已交付 → [implemented/2026-09-28-roadmap-retirement.md](./implemented/2026-09-28-roadmap-retirement.md) |
| 2026-09-28 | **CI 样板化**（用户点名）：verify-only CI + test 进 pre-push hook，含一次红灯对照抓到自己错判 | 已交付 → [implemented/2026-09-28-ci-test-lane.md](./implemented/2026-09-28-ci-test-lane.md) |
| 2026-09-28 | **推敲空间 `_backlog/` 立层 + research 并入**（用户令；D31）：plans/bugs/_done 三件 + 毕业四门 + 不借清单 | 已交付 → [implemented/2026-09-28-backlog-deliberation-space.md](./implemented/2026-09-28-backlog-deliberation-space.md)；规矩 = [_backlog/README.md](../_backlog/README.md) |
| 2026-09-28 | **harness 打磨轮 2**（用户令「打扫卫生 + 借鉴更好的 harness 主意」）：FAQ 04/05/11/15 判定 + 立即借九条 + 卫生三项 + 十维复测 | 已交付 → [implemented/2026-09-28-harness-polish-hygiene-round.md](./implemented/2026-09-28-harness-polish-hygiene-round.md)；判定 = [archived 判定稿](./archived/2026-09-28-faq-04-05-11-15-judgment.md) |
| 2026-09-28 | **浮窗 Z 序修复**（用户报「点后面的浮窗不置顶」）：vendor 格子化浮窗共用 z-60 ⇒ CSS 垫片修复 | 已交付 → [ux-sweep round1 §走查后补修](./implemented/2026-09-28-ux-sweep-round1.md) |
| 2026-09-28 | **UX 走查第一轮**（ongoing goal）：playwright 全程模拟用户 + 三件小修 + 不修清单五项带理由 | 已交付 → [implemented/2026-09-28-ux-sweep-round1.md](./implemented/2026-09-28-ux-sweep-round1.md) |
| 2026-09-27 | **公司页签 icon × 语义色向**（用户点名即做）：8 页签 glyph + 四色向体系，keyed 槽一处注册两处生效 | 已交付 → [implemented/2026-09-27-ux-tab-icons.md](./implemented/2026-09-27-ux-tab-icons.md) |
| 2026-09-27 | **常驻层瘦身 + 预算棘轮**（用户批）：三文件瘦身，doc-budget 棘轮只降不升 | 已交付 → [implemented/2026-09-27-standing-layer-slim.md](./implemented/2026-09-27-standing-layer-slim.md) |
| 2026-09-27 | **enforcement 通道 + 反证账 + skill 三件套**（FAQ 07 审计行动项）：pre-push hook + CI + 19 类门禁现场负例 | 已交付 → [implemented/2026-09-27-enforcement-channel-and-boundaries.md](./implemented/2026-09-27-enforcement-channel-and-boundaries.md) |
| 2026-09-27 | **FAQ 07 借鉴审计：十维打分**：道五维像回事，唯一结构性缺口 = 反馈 enforcement 通道（同日修复） | 已交付 → [archived/2026-09-27-harness-gap-audit-faq07.md](./archived/2026-09-27-harness-gap-audit-faq07.md) |
| 2026-09-26 | **多人 UX 实验线收口**：结构化派活字段采纳 + 两条 seam 裁定不提上游 | 已交付 → [multi-human-ux §结论](./implemented/2026-09-26-multi-human-ux.md)；调研 = [archived 生态调查](./archived/2026-09-26-dsh-plugin-ecosystem-survey.md) |
| 2026-09-26 | **结构化派活字段采纳**（代理拍板，单 commit 可逆）+ 两条 seam 裁定（用户裁定不提上游） | 已交付 → [multi-human-ux §结论（采纳标记）](./implemented/2026-09-26-multi-human-ux.md) |
| 2026-09-26 | **research 层三态模型**（用户令，修订 09-25 裁断）+ ROADMAP 打整 | 已交付 → [guides/dev-loop §12](../docs/guides/dev-loop.md)；D30 = [docs/index](../docs/index.md) 台账 |
| 2026-09-26 | **实验 D 全收口**（配置 B 人判腿 + 孤儿 JSON 归档）：A vs B「都不对要折中」等三项裁决入搁置池（后随 D32 退役） | 已交付 → [experiment-b-labels §六](./archived/2026-09-26-experiment-b-labels-and-d-mechanical.md) |
| 2026-09-26 | **实验 B 金标准机器腿 + 实验 A/D 机械面**：语料 13 case + 机器初标 + 独立盲审 14/15 一致 | 已交付 → [experiment-b-labels](./archived/2026-09-26-experiment-b-labels-and-d-mechanical.md) |
| 2026-09-26 | **角色身份 UX 三段交付**：agentPreset 投影（差点重复实现 vendor 自带物，撤码复验）+ 侧栏徽标 + 窗口标题【角色】 | implemented → [implemented/2026-09-26-role-identity-ux.md](./implemented/2026-09-26-role-identity-ux.md) |
| 2026-09-26 | **实验 C 签署腿 + 仪器**：双签走真实管线 0 违规；版本穿透活体实证 ⇒ 上游 seam 入搁置池 | 已交付 → [archived/experiment-c-quote-z](./archived/2026-09-26-experiment-c-quote-z.md) |
| 2026-09-26 | **技术债清扫：两条链收敛 + 共享盘归档**：4 路审计 ⇒ 13 blocker / 45 rot / 10 noise / 5 结构性，五条全落地 | 已交付 → [implemented/2026-09-26-entry-execution-chain-debt.md](./implemented/2026-09-26-entry-execution-chain-debt.md) |
| 2026-09-26 | **「需要你」升到宪章级**（用户令）：手册人机接口节五条硬要求 + "谁的门上弹卡"门路由实测 | implemented → [cockpit-human-loop §2026-09-26 更新](./implemented/2026-09-24-cockpit-human-loop.md) |
| 2026-09-26 | **多人协作：同一工作目录、各自开门**（用户提出 + 明确不许复杂化）：结论 = 不在 DSH 里造"人"层，共享层 = 工作目录；同日批「开工」并真动议验收 | 已交付 → [implemented/2026-09-26-multi-human-role-routing.md](./implemented/2026-09-26-multi-human-role-routing.md) |
| 2026-09-26 | **client 面两轴 code-review 修复**：7 条真缺陷全修 + 3 道新防线（含 client-load-smoke 抓不到 toolview 冲突的反证） | implemented → [implemented/2026-09-26-client-review-fixes.md](./implemented/2026-09-26-client-review-fixes.md) |
| 2026-09-26 | **A 案 · 长链动议看依赖图中途形态**：夹具档 + 真动议两段式，顺带真动议上验证日期口径与收工留痕两规矩 | implemented → [implemented/2026-09-26-long-chain-motion-dag-midflight.md](./implemented/2026-09-26-long-chain-motion-dag-midflight.md) |
| 2026-09-26 | **journal 缺席机制**（用户批 A+B）：journal-audit 三级置信度（反证：挪走 journal 翻缺席）+ CEO skill 收口盘点步；C 运行时拦截归上游提案 | implemented → [implemented/2026-09-26-journal-presence-mechanism.md](./implemented/2026-09-26-journal-presence-mechanism.md) |
| 2026-09-26 | **journal 日期机制**（用户只批 C 文案止损）：角色无取真日期通道实证 + 漂移三代链坐实 ⇒ 手册「日期口径」（0.2.0 time-context 到位后升级，见收割轮批3） | implemented → [implemented/2026-09-26-journal-date-mechanism.md](./implemented/2026-09-26-journal-date-mechanism.md) |
| 2026-09-26 | **问询节流规矩**：UX 实验同源发现（人原话「哎哟，别烦我了」）⇒ 手册三原则 | implemented → [implemented/2026-09-26-inquiry-throttle.md](./implemented/2026-09-26-inquiry-throttle.md) |
| 2026-09-25 | **research 层生命周期立规 + 首轮清扫**（后随 D31 修订：research 目录退役并入 _backlog） | implemented → [implemented/2026-09-25-research-notes-lifecycle.md](./implemented/2026-09-25-research-notes-lifecycle.md) |
| 2026-09-25 | **打造自己的 harness · 以《Agent-ready Development》为镜**：27 篇对照零待定，三切片落地 | implemented → [implemented/2026-09-25-harness-alignment.md](./implemented/2026-09-25-harness-alignment.md)（台账 = [archived](./archived/2026-09-25-harness-alignment-ledger.md)） |
| 2026-09-26 | **UX 实验轮 · 坐进驾驶舱摸体验**：两场真盘动议四类拉人点全命中 + 两真虫修复；追问疲劳与日期漂移两条新发现由此交付 | implemented → [implemented/2026-09-25-ux-experiment-round.md](./implemented/2026-09-25-ux-experiment-round.md) |
| 2026-09-25 | **打磨轮 · 磨清单清账**：journal 硬闸门红证（文案管不住缺席）⇒ 记「需机制」重挂 | implemented → [implemented/2026-09-25-polish-round.md](./implemented/2026-09-25-polish-round.md) |
| 2026-09-25 | **打扫卫生 · 记事面治腐化 + 收尾清扫**：bare-path 门禁 + 收尾清扫首跑（v1 不收敛教训在案） | implemented → [implemented/2026-09-25-notebook-hygiene.md](./implemented/2026-09-25-notebook-hygiene.md) |
| 2026-09-25 | **升 pin → dsh-v0.1.7-rc.2**：包名拆分 + 声明式 preset + client 团队态改读 agentTeam 投影；登记偏离 D27 | implemented → [implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md](./implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md) |
| 2026-09-25 | **长程自主执行的目标形态**：goal objective 两形态（交付型/打磨型）+ 三类停止条件，落 dev-loop §0.5 | implemented → [implemented/2026-09-25-longrun-goal-shape.md](./implemented/2026-09-25-longrun-goal-shape.md) |
| 2026-09-25 | **呈现与叙事**（goal 第八条）：motion-ledger 台账事实家 + LedgerTab 页签 | implemented → [implemented/2026-09-24-presentation-narrative.md](./implemented/2026-09-24-presentation-narrative.md) |
| 2026-09-25 | **新动议类型 ×2**（goal 第七条）：季度经营会 + 事件复盘两场真跑 | implemented → [implemented/2026-09-24-new-motion-types.md](./implemented/2026-09-24-new-motion-types.md) |
| 2026-09-25 | **记忆收敛 + 培养轮 3**（goal 第六条）：手册「轮末收敛」首次执行，46 篇 journal 归档 + CHARTER 历史纪要 | implemented → [implemented/2026-09-24-memory-convergence-and-cultivation-r3.md](./implemented/2026-09-24-memory-convergence-and-cultivation-r3.md) |
| 2026-09-25 | **驾驶舱④ · 培养面板 + 人机协作线毕业**（goal 第五条）：CultivationTab + remote.workspaceFiles 数据面 | implemented → [cockpit-human-loop（整线收尾）](./implemented/2026-09-24-cockpit-human-loop.md) |
| 2026-09-25 | **驾驶舱③ · 问询路径·乙**（goal 第四条）：四 VP 加 tool-ask-user + 手册「问人两条路」两模式 | implemented（[cockpit-human-loop §切片三](./implemented/2026-09-24-cockpit-human-loop.md)） |
| 2026-09-25 | **驾驶舱② · 审批闸门**（goal 第三条）：request_signoff 机制停点（ctx.approval 管线）+ e2e 7/7 全回路 | implemented（[cockpit-human-loop §切片二](./implemented/2026-09-24-cockpit-human-loop.md)） |
| 2026-09-25 | **驾驶舱① ·「需要你」注意力中心**（goal 第二条）：跨会话聚合四类等人状态 + remote.$on 观察者 | implemented（[cockpit-human-loop §切片一](./implemented/2026-09-24-cockpit-human-loop.md)） |
