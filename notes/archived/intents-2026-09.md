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
