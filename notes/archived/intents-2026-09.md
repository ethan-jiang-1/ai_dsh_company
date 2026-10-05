# intents 归档 · 2026-09（冻结，不改写）

> 出窗行档案：活表（notes/intents.md）≤60 行，按注册时序出窗（非严格日期序——底部含 backfill 行）。
> 本文件按月冻结：只追加新出窗行（当月文件），永不改写既有行；grep 面与 Note 链接照常有效；
> 再往前全文在 git blob。规矩 = dev-loop §12「一行指针」+ verify `intents-row-budget`。

| 日期 | 意图与交付 | 状态 |
|---|---|---|
| 2026-09-23 | **D23/D24 转型研究依据**（补登记——此前从 intents 不可达，notebook-hygiene 修指针）：DSH 任务面社区的 in-round 实证 | implemented → [implemented/2026-09-23-dsh-inround-task-surface.md](./implemented/2026-09-23-dsh-inround-task-surface.md) |
| 2026-09-22 | **分身培养与自学习机制研究**（补登记——同上）：journal 待审收件箱/培养回路/学习载体的机制依据 | implemented → [implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md](./implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md) |
| 2026-09-24 | **N1 执行 · docs 全去编号**（人裁方案 A，goal 第一条）：7 文件改名 + 85 文件引用两遍改净；顺手修 entry-probe 既有缺陷 | implemented → [implemented/2026-09-24-n1-docs-naming.md](./implemented/2026-09-24-n1-docs-naming.md) |
| 2026-09-24 | **Note 生命周期吸纳**（用户令「点选吸纳、不推翻现有」）：六条细则落 dev-loop §12，显式不吸纳四项 | implemented → [implemented/2026-09-24-notes-lifecycle-absorption.md](./implemented/2026-09-24-notes-lifecycle-absorption.md) |
| 2026-09-24 | **基石整治：Agent 入口链与执行链**：入口/执行 Markdown 收敛 + keyless 测试分层修正 | implemented → [implemented/2026-09-24-foundation-remediation.md](./implemented/2026-09-24-foundation-remediation.md)；交接 = [postmortem/0004](./postmortem/0004-entry-execution-remediation-handoff.md)（交接材料，非事故复盘） |
| 2026-09-24 | **基础环境第一小步**：保留原结构，强调 Notes 开工输入与决策证据；六 smoke 对日用 home 立即拒绝 | implemented → [implemented/2026-09-24-foundation-first-step.md](./implemented/2026-09-24-foundation-first-step.md) |
| 2026-09-21 | 阶段 0 立环：repo 骨架可承载 docs 全部设计决定——`pnpm verify` 全绿、submodule 钉 tag、四 preset 结构就位 | implemented → [implemented/2026-09-21-repo-scaffolding.md](./implemented/2026-09-21-repo-scaffolding.md) |
| 2026-09-21 | docs/ 分层重组：按性质（导航/设计/计划/指南/合同）不按时间；"初始意图"归 notes | implemented → [implemented/2026-09-21-docs-layering.md](./implemented/2026-09-21-docs-layering.md) |
| 2026-09-21 | 开发环沉淀 + agent 直达：guides/dev-loop、index 外部材料登记与术语映射加 vendor 落点列、AGENTS.md 小修；FAQ 原文登记不复制 | implemented → [implemented/2026-09-21-dev-loop-guide.md](./implemented/2026-09-21-dev-loop-guide.md) |
| 2026-09-21 | 双 DSH 立为一等事实：三实体表进 AGENTS.md，env.sh 裸 dsh 环境级拦截，guides/dev-loop §6 扩双 DSH | implemented → [implemented/2026-09-21-dual-dsh-entities.md](./implemented/2026-09-21-dual-dsh-entities.md) |
| 2026-09-21 | roadmap 重切垂直轮（D11）+ UI 归轮 + 轮次交接清单；Q4 降为最小动议（轮次制后随 D23 退役） | implemented → [implemented/2026-09-21-vertical-rounds.md](./implemented/2026-09-21-vertical-rounds.md) |
| 2026-09-22 | R0 立环验收：workspace 形状/版本对齐/pnpm 入口/tsconfig 门面/局部 host 面/原生 flock 零特权编译——`pnpm dsh --profile headless` 真会话跑通 | implemented → [implemented/2026-09-22-r0-loop-acceptance.md](./implemented/2026-09-22-r0-loop-acceptance.md) |
| 2026-09-22 | R1 两人公司：CEO/VP-Eng 正式 persona+skills+KB，company profile 部署+观察窗，入戏探针，跑动议出第一份 deliverable | implemented → [implemented/2026-09-22-r1-close.md](./implemented/2026-09-22-r1-close.md) |
| 2026-09-22 | R1 中途文档同步（fresh-agent 审计）+ 纪律强调：AGENTS.md 纪律段改"全程沿用 DSH 纪律"并建权威对照表（D13） | implemented → [implemented/2026-09-22-r1-docs-sync.md](./implemented/2026-09-22-r1-docs-sync.md) |
| 2026-09-22 | 回归测试资产（R1）：`pnpm test` keyless 四条 + guard 反证；发现 preset 只在 Web 面挂载 | implemented → [implemented/2026-09-22-r1-deploy-findings.md](./implemented/2026-09-22-r1-deploy-findings.md) |
| 2026-09-22 | 公司命名 + 角色显示名系列化（D14）：公司名 `wochen`，显示名 `<公司名> <角色>` | implemented → [implemented/2026-09-22-wochen-naming.md](./implemented/2026-09-22-wochen-naming.md) |
| 2026-09-22 | pack 长出 client 面（皮肤第一块砖）：`dsh.client` + 自建双半 tsdown；注册 `sidebar.brand.name` | implemented → [implemented/2026-09-22-client-face-brand.md](./implemented/2026-09-22-client-face-brand.md) |
| 2026-09-22 | **吸纳社区/厂商一手经验（D15）**：完成定义 = 该面最小真检查通过、发现权在代理一侧；否决 spec 流程与"加长指令文件" | implemented → [implemented/2026-09-22-agent-workflow-community-practice.md](./implemented/2026-09-22-agent-workflow-community-practice.md) |
| 2026-09-22 | R2 前 UI 薄片重排（R1 体感反馈）：两空间镜头 + 任务板活面板 + 委派卡提前 + 驾驶舱含协作动态流 | implemented → [implemented/2026-09-22-r2-ui-slice-replan.md](./implemented/2026-09-22-r2-ui-slice-replan.md) |
| 2026-09-22 | **组织在场板**：身份走 agentPreset 投影、忙闲走 TeamMemberView.status、任务走 TeamTaskView（R5b 交付后毕业；"会话×preset"方案被录制证伪） | implemented → [implemented/2026-09-22-org-presence-board.md](./implemented/2026-09-22-org-presence-board.md) |
| 2026-09-22 | **共享盘卫生**（交付物三态 + 归档判据 + 练习场隔离）：deliverables/<slug>/ 目录化、成品必须来自 present、排练产物不进 deliverables | 已消化 → [implemented/2026-09-22-workspace-hygiene.md](./implemented/2026-09-22-workspace-hygiene.md) |
| 2026-09-22 | R2 内容片：全员五角色上线——增设 CFO；公司编制 50 人细到岗位（kb/org.md 唯一事实家）；每角色 ≥1 工作流 skill | implemented → [implemented/2026-09-22-r2-roles-alive.md](./implemented/2026-09-22-r2-roles-alive.md) |
| 2026-09-22 | **分身培养与自我学习**：DSH 无记忆子系统 ⇒ 学习只落文件；**否决分身自改 skill**；前置修复两条（includeDefaultRoots 隔离、agent-instructions 接线） | implemented → [implemented/2026-09-22-twin-cultivation-and-self-learning.md](./implemented/2026-09-22-twin-cultivation-and-self-learning.md)（已消化；收尾 = [twin-cultivation](./implemented/2026-09-24-twin-cultivation.md)） |
| 2026-09-22 | **角色 skills 硬隔离**（R6 前置修复①）：五 preset 加 `includeDefaultRoots: false` + preset-smoke skills/list 精确断言（红→绿） | implemented → [implemented/2026-09-22-skill-root-isolation.md](./implemented/2026-09-22-skill-root-isolation.md) |
| 2026-09-22 | **R2 轮次收尾（五角色全员）**：内容面定稿 + 公司手册 + 任务板活面板 + r2-motion 归档；两条自动化纪律（门禁分层/轻任务） | implemented → [r2-roles-alive](./implemented/2026-09-22-r2-roles-alive.md) + [r2-motion-run](./implemented/2026-09-22-r2-motion-run.md) |
| 2026-09-22 | **R3 汇报线**：命名委托 `vp_eng`/`vp_sales` = one-shot 前台（continuable 被 team shadow 三层实证否掉，D18）；立测试分层纪律 | implemented → [implemented/2026-09-22-r3-reporting-line.md](./implemented/2026-09-22-r3-reporting-line.md) |
| 2026-09-22 | **R4 成品流程**：交付物三态判据机械化（deliverables-check）+ "成品 = Lead 会话的 present" + 端到端写作流水线真跑 150s | implemented → [implemented/2026-09-22-r4-workshop-flow.md](./implemented/2026-09-22-r4-workshop-flow.md) |
| 2026-09-22 | **R5 拆轮 + 搁置池**（不改 R4 决定）：R5a 门禁与发布 / R5b 驾驶舱；搁置池首批四条（后随 D32 整池退役） | implemented → [r5a-gates-and-release](./implemented/2026-09-23-r5a-gates-and-release.md) + [r5b-cockpit](./implemented/2026-09-23-r5b-cockpit.md)（D19） |
| 2026-09-22 | **按问题组队**（用户观察"CEO 不需要每件事都让 4 个手下忙，团队随问题成形"查证属实）：assembling-the-team skill + 双向行为对照验收 | implemented → [implemented/2026-09-22-team-assembly-and-rehearsal-split.md](./implemented/2026-09-22-team-assembly-and-rehearsal-split.md) |
| 2026-09-22 | **R2 场景 B 归档 + 现场教训落盘**（backfill）：三角色应急协作快照 + 教训落 demo/budget-and-ops/dev-loop | implemented → `snapshots/scenario-b/`；[demo.md](../docs/demo.md) 场景 B |
| 2026-09-22 | **练习场 ≠ 运行场 落地**（轮间待办②）：排练/探针默认独立 cwd + rehearsal-init；验收 = 探针后真盘零新增 | implemented → [team-assembly-and-rehearsal-split](./implemented/2026-09-22-team-assembly-and-rehearsal-split.md) |
| 2026-09-23 | **R5a P1.1 replay 机制窄研究**：vendor snapshot lane 三问全答；同日立 §11 工具态纪律 | implemented → [implemented/2026-09-23-replay-harness-feasibility.md](./implemented/2026-09-23-replay-harness-feasibility.md) |
| 2026-09-23 | **R6 内容诊治插轮**（原 R6 分身成长 → R7，D21）：内容腐化诊治 + 流程对齐审计两线 | implemented → [implemented/2026-09-23-r6-content-remediation.md](./implemented/2026-09-23-r6-content-remediation.md)（D21） |
| 2026-09-23 | **R5a 续作（P1.3/P1.4/P4）**：委派卡端到端金样 + 分层守卫扩 + 发布欠账收口（peerDeps/兼容矩阵，release-smoke 与 sync-dsh 出生） | implemented → [implemented/2026-09-23-r5a-gates-and-release.md](./implemented/2026-09-23-r5a-gates-and-release.md) |
| 2026-09-23 | **R5b 驾驶舱开工（Q5–Q8 定案）**：主键 = team roster（"会话×preset"被录制证伪）；公司右栏页签 + r2-motion replay 场景 | implemented → [implemented/2026-09-23-r5b-cockpit.md](./implemented/2026-09-23-r5b-cockpit.md) |
| 2026-09-22 | **client-remote 双挂守卫**（postmortem 0003 修复收口）：client 面贡献禁重复 `$mount`（本行 backfill） | implemented → [implemented/2026-09-22-client-remote-single-mount.md](./implemented/2026-09-22-client-remote-single-mount.md) |
| 2026-09-22 | **按问题组队（原提案）**：后毕业并入 team-assembly-and-rehearsal-split 实施（本行 backfill） | implemented → [implemented/2026-09-22-dynamic-team-assembly.md](./implemented/2026-09-22-dynamic-team-assembly.md) |
| 2026-09-22 | **R2 轮收尾**（backfill：Note 早于台账行）：五角色全员上线 + 任务板活面板 + r2-motion 归档 | implemented → [implemented/2026-09-22-r2-close.md](./implemented/2026-09-22-r2-close.md) |
| 2026-09-23 | **D23 · R6 后严格 DSH 研发流（R6 = 最后轮号）**：研究证实 D13「整套继承」实为部分继承；此后默认严格 DSH 套路，偏离须登记 D 号 | implemented → [r6-content-remediation（收尾 Note）](./implemented/2026-09-23-r6-content-remediation.md)；转型落盘见 [guides/dev-loop §12](../docs/guides/dev-loop.md) |
| 2026-09-23 | **demo 可视表达**（用户判断现 UI「粗糙」+ 要"不讲解也能看懂"）：公司视图 + 官方设计系统皮肤；第三方插件否决、自建优先 | implemented → [company-view](./implemented/2026-09-23-company-view.md)（RFC 已毕业 [demo-visual-expression](./implemented/2026-09-23-demo-visual-expression.md)） |
| 2026-09-23 | **视觉打磨**（用户验收原话「超出了我的预期…视觉上，我们回头再打磨」⇒ 转独立条目）：内联样式收口 + DAG 边对比度修正 | implemented → [implemented/2026-09-23-visual-polish.md](./implemented/2026-09-23-visual-polish.md) |
| 2026-09-23 | **面板窗口化**（用户反馈弹窗互盖、要可移动最小约束）：五面板升平台页签 + float()/dock 平台原生 | implemented → [implemented/2026-09-23-panel-tabs.md](./implemented/2026-09-23-panel-tabs.md)（RFC 已毕业 [panel-float](./implemented/2026-09-23-panel-float.md)） |
| 2026-09-23 | **可视表达优先**（队列次序调整，用户决定）：① demo 可视表达 ② 面板窗口化 ③ 分身成长（原「UX 打磨」被 ① 吸收毕业） | [ROADMAP 退役 Note](./implemented/2026-09-28-roadmap-retirement.md)；毕业 [ux-polish](./implemented/2026-09-23-ux-polish.md) |
| 2026-09-24 | **分身成长（培养 + 学习一次完整回路）**：人审采纳 A 合稿只依据稿面原文 + B 互审稿标权威版号 + G 收口盘点保留账 ⇒ CEO skill 窄切片 | implemented → [implemented/2026-09-24-twin-cultivation.md](./implemented/2026-09-24-twin-cultivation.md) |
| 2026-09-24 | **培养轮 2（当夜长程执行）**（用户睡前委托"其他的你来定夺"）：消化候选 D/E/F 落 cfo/project-economics 与 vp-sales/sales-workflow；C 留人裁 | implemented → [implemented/2026-09-24-cultivation-round-2.md](./implemented/2026-09-24-cultivation-round-2.md) |
| 2026-09-24 | **当夜长程执行**（用户睡前授权"一口气做完、能跑多远跑多远"）：整治转待办销账 6 项 + 磨审计 6 项 + push 积压清零；留给人的分叉 = C 载体 / N1 执行 / 升 pin（后均已闭环） | implemented → 各 commit + 当日维护规则行（销账明细与验证记录在案） |
| 2026-09-25 | **驾驶舱① ·「需要你」注意力中心**（goal 第二条）：跨会话聚合四类等人状态 + remote.$on 观察者 | implemented → [cockpit-human-loop §切片一](./implemented/2026-09-24-cockpit-human-loop.md) |
| 2026-09-25 | **驾驶舱② · 审批闸门**（goal 第三条）：request_signoff 机制停点（ctx.approval 管线）+ e2e 7/7 全回路 | implemented → [cockpit-human-loop §切片二](./implemented/2026-09-24-cockpit-human-loop.md) |
| 2026-09-25 | **驾驶舱③ · 问询路径·乙**（goal 第四条）：四 VP 加 tool-ask-user + 手册「问人两条路」两模式 | implemented → [cockpit-human-loop §切片三](./implemented/2026-09-24-cockpit-human-loop.md) |
| 2026-09-30 | **0.2.0 插件收割轮**（用户点名「充分利用 DSH 新内置插件」+ 裁定批次与评估档）：判收四档台账 + 五批落地（standard 追平 / 全文检索 / 自主节律 / workflow / plan-mode+browser-use）| 已交付 → [implemented/2026-09-30-plugin-harvest-round.md](./implemented/2026-09-30-plugin-harvest-round.md)；待续两笔 = [残检收口卡](../_done/_closed_plans/2026-10-02-deferred-verifications.md) |
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
