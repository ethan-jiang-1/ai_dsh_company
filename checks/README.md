# 检查与工具索引（验证 · 调试 · 工具三面）

按要证明的对象选择下面的入口，再读目标脚本的头注确认触发条件、成本、状态和参数。脚本头注是这些事实的唯一家；本索引提供分类和可点击入口。证据政策见 [测试宪法](../docs/testing.md)，开发环境见 [开发环](../docs/guides/dev-loop.md)。

## 快速选择

| 当前目标 | 入口 |
|---|---|
| 检查结构、引用与簿记 | `pnpm verify` → [run-gates](run-gates.mjs) |
| 看运行态全景 / 场景 run bundle / 会话历史口径 | `pnpm orient`（默认全景含「待核工作候选」扫描节，R3′ 口径，`--workspace <dir>` 换扫描根；`--scenario <kind>/<场景>` run trace；`--session <slug>[/<id前缀>]` 历史会话 preset）→ [orient](../tools/orient.mjs)（keyless 只读；含日用 home 警告） |
| 看最近会话的失败摘要 | `pnpm diagnose [--session <slug>[/<id前缀>]] [--home <路径>]`（只读；失败 turn / 工具错误 / 审批 / 待答问询 / present / 最后正文；`--home` = 显式读日用 home 等非 dev home）→ [diagnose](../tools/diagnose.mjs) |
| 检查 AI 写码产出的密钥与凭据暴露面 | [security-scan](gates/security-scan.mjs)（公司盘五道闸真扫；件 = [ci-security-gates](lib/ci-security-gates/)，判据逐道不看总码）+ [tracked-token](gates/tracked-token.mjs)（跨仓 tracked 文件的 token URL 窄扫；值不打印）+ [tracked-secrets](gates/tracked-secrets.mjs)（硬编码凭据赋值形状，补 `const TOKEN = '...'` 缺口） |
| 检查局部逻辑或静态渲染 | `pnpm test` → [tests](../tests/)；[分层守卫](../tests/harness/layering.spec.ts) |
| 确认角色真的挂载 | [preset-smoke](smoke/preset-smoke.mjs) |
| 确认 client 真的装配 | [client-load-smoke](smoke/client-load-smoke.mjs) |
| 确认录制行为与工作区判据 | [replay-smoke](smoke/replay-smoke.mjs) |
| 审计动议输出和角色留痕 | [deliverables-check](audit/deliverables-check.mjs)、[authorship-audit](audit/authorship-audit.mjs)、[journal-audit](audit/journal-audit.mjs) |
| 查看运行中页面 | [cdp-probe](../probes/browser-visual/cdp-probe.mjs)；操作指南见 [CDP 指南](../docs/guides/cdp-probe.md) |
| 核对发布链或导出交付包 | [release-smoke](smoke/release-smoke.mjs)、[lifecycle-smoke](smoke/lifecycle-smoke.mjs)、[standalone-smoke](smoke/standalone-smoke.mjs)、[export-dist](../tools/export-dist.mjs) |
| 从目录隔离启动公司实例 | `pnpm standalone` → [standalone](../tools/standalone.mjs)（隔离 home/profile，不动日用 home） |

模型调用与浏览器是两种独立成本。keyless 表示无需模型密钥：真实进程、浏览器或安装链仍有成本，保留在独立脚本 lane。文件名用来定位层，参数和头注决定实际运行模式；例如 replay 默认回放，`--ui` 加浏览器，`--record` 才重录模型调用。`presence-e2e` 检查 RPC 投影，不启动浏览器。

顶层按用途读（2026-10-07 S2 起）：**验证面 = checks/**（本目录：`smoke/` 真实入口冒烟 + `audit/` 盘面日志判据 + run-gates 门禁）｜**调试面 = [probes/](../probes/)**（窄机制与视觉探查，按机制域四子目录：team / fs-taskboard / browser-visual / session-context）｜**工具面 = [tools/](../tools/)**（维护工具 + `lib/` 共享纯逻辑 + `drivers/` 真实驱动 + `archive/` 已耗仪器）。

## 结构、装载与发布

| 脚本 | 证明对象 / 用途 |
|---|---|
| [security-scan.mjs](gates/security-scan.mjs) | AI 写码安全闸门挂载门：自测判别力 + 真扫公司盘 + 挂载件指纹（5 道闸 = 凭据可达性 / 密钥入面 / 不可信件引入前 / 命令执行前 / 动作迹） |
| [tracked-token.mjs](gates/tracked-token.mjs) | 跨仓 tracked 文件的 token URL 窄扫（BUG-029；值不打印，vendor/ 只读除外） |
| [tracked-secrets.mjs](gates/tracked-secrets.mjs) | 跨仓 tracked 文本的硬编码凭据赋值扫描（`const TOKEN = '...'` 等；值不打印；补 tracked-token 的形状缺口） |
| [tracked-portability.mjs](gates/tracked-portability.mjs) | 跨环境守卫：活动面绝对 home 路径、CRLF、大小写冲突、macOS 专属命令（规则 = docs/repo-hygiene.md §四） |
| [no-tracked-ignored.mjs](gates/no-tracked-ignored.mjs) | 索引级反例：tracked 文件不得命中 ignore 规则（`git add -f` 绕过的点名校验；`git ls-files -ci` 为空） |
| [tracked-file-size.mjs](gates/tracked-file-size.mjs) | tracked 文件 2MB 上限（防截图/数据库/tgz 被当成资产提交） |
| [gitignore-shape.mjs](gates/gitignore-shape.mjs) | `.gitignore` 形状 + 真实匹配：runtime/* 默认拒绝、5 件白名单、新残留目录（ops）默认 ignored（`git check-ignore`） |
| [run-gates.mjs](run-gates.mjs) | 结构门禁装配 runner：按原顺序跑 gates/ 各门禁（仓库结构、文档引用、vendor 簿记与脚本约束；清单唯一源 = gates/ 目录） |
| [preset-smoke.mjs](smoke/preset-smoke.mjs) | 通过真实会话创建验证各角色 preset 挂载 |
| [client-load-smoke.mjs](smoke/client-load-smoke.mjs) | 加载真实 Web 页面，验证 client 挂载、品牌与零装配错误 |
| [replay-smoke.mjs](smoke/replay-smoke.mjs) | 合成 keyless 回放（`foundation-workspace`）：session/sidecar/工作区 oracle；真实动议录制与 UI 端到端已随真实 snapshots 移出产品仓 |
| [snapshot-motion-smoke.mjs](smoke/snapshot-motion-smoke.mjs) | 真实 CLI 子进程中的快照采集与 workspace capture 接线 |
| [release-smoke.mjs](smoke/release-smoke.mjs) | 构建、打包、干净 profile 安装与 built CLI 启动 |
| [lifecycle-smoke.mjs](smoke/lifecycle-smoke.mjs) | 真 tarball v1→v2 升级、卸载、搬 home 迁移（keyless；不含 registry/降级/跨 OS） |
| [standalone-smoke.mjs](smoke/standalone-smoke.mjs) | 目录独立启动：隔离 home/profile、copy 骨架、boot/RPC、relink、reset（keyless） |
| [present-catalog-smoke.mjs](smoke/present-catalog-smoke.mjs) | 真 vendor `present` 工具 → session `deliverables/presented` → host catalog（keyless；~1s） |
| [multi-install-smoke.mjs](smoke/multi-install-smoke.mjs) | 双 home 真装隔离、非空 home 后装、同 home 多 profile 反例、自定义 profile 补 web-app、空 bundle 共存、幂等（keyless；~3-4min，发布前手动） |
| [interrupted-install-smoke.mjs](smoke/interrupted-install-smoke.mjs) | remove 后坏 add、profile package 损坏、re-add 后数据/roster 恢复（keyless；~2min） |
| [permissions-recovery-smoke.mjs](smoke/permissions-recovery-smoke.mjs) | 只读 workspace、缺骨架补建、坏 catalog 重建（keyless；~1.5min） |
| [profile-row-smoke.mjs](smoke/profile-row-smoke.mjs) | 用户 profile patch 真实改 default、第二 bundle disabled row 共存/卸载（keyless；~1.5min） |
| [upgrade-while-running-smoke.mjs](smoke/upgrade-while-running-smoke.mjs) | 旧实例运行中 remove/add 新版本，旧实例仍响应；重启后 0.3.10/session/data（keyless；~2min） |
| [concurrent-home-smoke.mjs](smoke/concurrent-home-smoke.mjs) | 同 home 两进程首启后 bundle/catalog/数据可解析、单实例恢复（keyless；~1min） |
| [external-workspace-smoke.mjs](smoke/external-workspace-smoke.mjs) | DSH_COMPANY_HOME 在 home 外、bundle.workspace 绝对路径、只搬 home 后 boot/数据不丢（keyless；~1min） |
| [refactor-drift-oracle.mjs](smoke/refactor-drift-oracle.mjs) | 纯搬移/拆分的零行为漂移：拆前/拆后 vitest 清单比对（`--hashes` 档含测试体指纹 ⇒ 拦改名/增删/**测试体改动**；两档都放行文件与 describe 归属搬家） |

## 浏览器与视觉

| 脚本 | 证明对象 / 用途 |
|---|---|
| [cdp-probe.mjs](../probes/browser-visual/cdp-probe.mjs) | 已运行观察窗的真实渲染、公司页签与控制台；可选问题验证产品回路 |
| [browser-behavior-probe.mjs](../probes/browser-visual/browser-behavior-probe.mjs) | 自行拉起 MCP，以真实调用验证 browser-use 导航、读取、点击与输入 |
| [dag-visual-probe.mjs](../probes/browser-visual/dag-visual-probe.mjs) | 合成任务驱动的 DAG 主题、样式与视觉判据 |
| [dag-midflight-probe.mjs](../probes/browser-visual/dag-midflight-probe.mjs) | 真实动议或既有会话的 DAG 中途/终局形态和长链可读性 |
| [ledger-summary-probe.mjs](../probes/browser-visual/ledger-summary-probe.mjs) | 台账摘要在宽/窄视口的可读性与键盘/触屏全文入口 |
| [tasks-panel-probe.mjs](../probes/browser-visual/tasks-panel-probe.mjs) | 任务板入口可见/可聚焦/Tab 序/Enter 落点（真 web，1440/390） |
| [deliverables-catalog-probe.mjs](../probes/browser-visual/deliverables-catalog-probe.mjs) | 成品目录行数=索引、筛选/打开 final.md（真 web，1440/390） |
| [board-drift-probe.mjs](../probes/browser-visual/board-drift-probe.mjs) | 看板「声明 vs 板面」分叉警示卡的真实渲染与出图（真组件注入真 web app） |
| [sidebar-role-mark-probe.mjs](../probes/browser-visual/sidebar-role-mark-probe.mjs) | 侧栏角色标记 vs 16px 座位的渲染盒几何（desktop/narrow/full-bleed + 五角色对照图） |
| [presence-panel-probe.mjs](../probes/browser-visual/presence-panel-probe.mjs) | 在场板行结构（Lead 行 Tag/在办任务栏）+ 点行进成员空间 + 窄栏（真 web，1440/390） |
| [budget-panel-probe.mjs](../probes/browser-visual/budget-panel-probe.mjs) | 用量面板四路令牌行/占比合计≈100%/总量>0 + 窄栏（真 web，1440/390） |
| [attention-panel-probe.mjs](../probes/browser-visual/attention-panel-probe.mjs) | 待办面板两段结构/诚实空态或「去处理」入口 + 窄栏（真 web，1440/390；跨会话聚合面按结构判） |
| [compact-view-probe.mjs](../probes/browser-visual/compact-view-probe.mjs) | compact 折叠过程行但保留助手最终长回复的现场对照 |
| [open-in-app-probe.mjs](../probes/browser-visual/open-in-app-probe.mjs) | 交付物进侧栏预览 → Host 判词（`ok:true`/`opened:true`）→ **目标应用状态文件登记该路径**；`--tree` 挑未打开过的文件可拿干净翻转 |

## 角色、手册与行为规则

| 脚本 | 证明对象 / 用途 |
|---|---|
| [handbook-smoke.mjs](smoke/handbook-smoke.mjs) | 真实会话指令基线中的公司手册注入与隔离根 |
| [probe-smoke.mjs](smoke/probe-smoke.mjs) | 角色连通、persona 入 prompt；内容档检查身份、知识与产出 |
| [entry-probe-smoke.mjs](smoke/entry-probe-smoke.mjs) | 维护者入口链的路由、证据引用与 coding 基线 |
| [budget-signoff-probe.mjs](../probes/session-context/budget-signoff-probe.mjs) | 文件预算会签与工具审批线的正反场景 |
| [ask-user-timed-probe.mjs](../probes/session-context/ask-user-timed-probe.mjs) | 问询能自行收口（真模型）：定时窗口→pending→turn 收口→RPC 可答→答案回会话；`--unbounded` 档验驱动停点判定（模型传 `-1` 时 0s 报「需人参与」） |
| [cultivation-propose-probe.mjs](../probes/session-context/cultivation-propose-probe.mjs) | 「分身自己也能提案」**真模型端到端**：起 cfo 会话让它自己调 `cultivation_propose` ⇒ 记录落公司盘且形状/内容正确（默认清理探针产物；`--keep` 留现场） |
| [propose-sampler.mjs](../tools/propose-sampler.mjs) | 「自发提案」取样器：扫会话日志找 `cultivation_propose` 调用，按人侧有没有要求分箱（自发候选带人话证据；只读秒级） |
| [cultivation-method-layer-probe.mjs](../probes/session-context/cultivation-method-layer-probe.mjs) | 培养方法层机制六判据：目录发现/角色隔离/缺目录容忍/命令族 wiring/采纳落盘/跨会话生效（keyless 真 boot） |
| [cultivation-context-probe.mjs](../probes/session-context/cultivation-context-probe.mjs) | 培养背景机制门：冷会话一次 page 冷读不激活、projections.asOfSeq 作 cursor、2.5KB 命令行 args 完整、≤8KB contexts 记录读回、agentTeam/子会话 address（keyless 真 boot） |
| [cultivation-gui-probe.mjs](../probes/browser-visual/cultivation-gui-probe.mjs) | 培养 GUI 行动面判据：真浏览器点「采纳」→ 记录翻 adopted + 方法落方法层 + 会话日志 command/run·done（source=user）/ 跨角色被 host 拒 / 创作表单提交落记录 / 零挂载失败（keyless，出视觉夹具） |
| [cultivation-ux-walkthrough.mjs](../probes/browser-visual/cultivation-ux-walkthrough.mjs) | 培养面板 UX 走查（体验协议 T1–T6 的自动化替身）：六任务逐步计时/步数/关键文案在场；`--protocol` 出给人跑的一页协议卡 |
| [cultivation-ux-scenarios.mjs](../probes/browser-visual/cultivation-ux-scenarios.mjs) | 培养面板**场景轮**：失败态/校验/规模与长文本折叠/窄窗/浮窗/跨角色流向/键盘可达/时间感/并发陈旧/极端文案/非名册 preset（`--shots` 每场景截图；开局与收尾自愈：收浮窗 + preset 归位） |
| [human-exits-probe.mjs](../probes/session-context/human-exits-probe.mjs) | 阻塞拍板的人话首段三件套与 `ask_user_question` 认证档 |
| [human-exits-expression-probe.mjs](../probes/session-context/human-exits-expression-probe.mjs) | 多选项短 GFM 表格与关键数字行锚认证档 |
| [human-exits-nonblocking-probe.mjs](../probes/session-context/human-exits-nonblocking-probe.mjs) | 非阻塞缺口带显式默认假设继续、轮末列待确认；会话事件落盘供复核 |
| [hitl-dispatch-order-probe.mjs](../probes/session-context/hitl-dispatch-order-probe.mjs) | 「HITL 前排空」判据：首个建任务与首个 ask 的先后（`--session` 判已有会话，默认真跑一场） |
| [ceo-assembly-probe.mjs](../probes/session-context/ceo-assembly-probe.mjs) | 「最小在屋起步」判据：单域动议 CEO 组队规模与 owner 路由（真跑 / `--session` 判既有实录） |
| [member-bounceback-probe.mjs](../probes/session-context/member-bounceback-probe.mjs) | 第三层「人可以拒绝」判据：超域分派下成员域内核对与打回三件套（真跑一场） |
| [reconcile-round-probe.mjs](../probes/session-context/reconcile-round-probe.mjs) | 「对账回合」判据：两造不同值后 CEO 是否把对方数值转述回去（`--session` 或真跑一场） |
| [date-rule-probe.mjs](../probes/session-context/date-rule-probe.mjs) | 注入日期用于记账和 journal 命名的实际行为 |
| [time-context-probe.mjs](../probes/session-context/time-context-probe.mjs) | 日期通道进入会话并被模型读回落盘 |
| [dissent-preservation-probe.mjs](../probes/team/dissent-preservation-probe.mjs) | lead 收口保留成员独立结论与有依据的分歧 |

## 人机回路与团队生命周期

| 脚本 | 证明对象 / 用途 |
|---|---|
| [attention-e2e-smoke.mjs](smoke/attention-e2e-smoke.mjs) | 触线、审批通知、人批与续行，以及双会话应答独立性 |
| [human-loop-e2e-smoke.mjs](smoke/human-loop-e2e-smoke.mjs) | 补料读取、非阻塞建议落稿与规矩缺口问询回流 |
| [delegation-smoke.mjs](smoke/delegation-smoke.mjs) | 命名委派、模型可见工具目录、团队控制 shadow 与 one-shot 语义 |
| [member-inquiry-probe.mjs](../probes/team/member-inquiry-probe.mjs) | 成员直接拉人问询的机制允许/拒绝结果 |
| [member-rescue-probe.mjs](../probes/team/member-rescue-probe.mjs) | 成员求助、lead 拉人、人答转达与成员续行 |
| [member-interrupt-probe.mjs](../probes/team/member-interrupt-probe.mjs) | 运行中成员中断后的 pending inbox 与新指示续行 |
| [presence-e2e-smoke.mjs](smoke/presence-e2e-smoke.mjs) | 真实会话投影中的成员接活、任务执行与完成状态链 |
| [team-concurrency-probe.mjs](../probes/team/team-concurrency-probe.mjs) | 同文件写入与同任务认领的并发冲突、重试和终态 |
| [team-claim-loser-probe.mjs](../probes/team/team-claim-loser-probe.mjs) | 认领失败让位：owner-bound 败者不写与 shared 正对照的对照行为 |
| [member-reject-in-team-probe.mjs](../probes/team/member-reject-in-team-probe.mjs) | 真团队里的越域打回：成员 `send_message` 三件套、未落目标稿 |
| [member-stale-write-probe.mjs](../probes/team/member-stale-write-probe.mjs) | 成员同轮旧观察写被真实 stale 拒后的重读合并 |
| [team-atomicity-probe.mjs](../probes/team/team-atomicity-probe.mjs) | 并发追加完整性与跨任务 writeScopes 重叠警告 |
| [team-recovery-probe.mjs](../probes/team/team-recovery-probe.mjs) | 崩溃重启后的团队状态、持久邮箱与消息续行 |
| [dual-ceo-probe.mjs](../probes/session-context/dual-ceo-probe.mjs) | 多人模式下是否出现双 CEO；开门配方或默认 preset 行为改动时 |
| [claim-race-probe.mjs](../probes/team/claim-race-probe.mjs) | 占位抢注竞速（写盘守卫 / 占位=认领 约定改动时） |
| [dual-signoff-probe.mjs](../probes/session-context/dual-signoff-probe.mjs) | 双签线多门落卡（手册审批三档 / multi-human §0 边界改动时） |
| [journal-boundary-probe.mjs](../probes/session-context/journal-boundary-probe.mjs) | journal 目录边界（手册收工留痕 / 角色目录结构改动时） |
| [multi-user-e2e-probe.mjs](../probes/team/multi-user-e2e-probe.mjs) | 多人 UX 端到端动议（真模型 ≈$1–2，排练场） |
| [read-barrier/index.mjs](../probes/team/read-barrier/index.mjs) | 实验专用监听器，由并发探针 overlay 装载（不进任何 profile） |

## 文件与任务板协作

| 脚本 | 证明对象 / 用途 |
|---|---|
| [cross-process-fs-probe.mjs](../probes/fs-taskboard/cross-process-fs-probe.mjs) | fs-local 跨进程覆盖写、版本守卫与创建竞态 |
| [fs-guard-probe.mjs](../probes/fs-taskboard/fs-guard-probe.mjs) | 角色会话的先读后写、过期版本拒绝与并发创建终态 |
| [taskboard-presence-probe.mjs](../probes/fs-taskboard/taskboard-presence-probe.mjs) | 任务认领、加工中状态与在场板所需团队事件 |
| [motion-taskboard-probe.mjs](../probes/fs-taskboard/motion-taskboard-probe.mjs) | 无额外流程提示的真实动议中，模型是否执行手册任务板协作 |
| [taskboard-scope-probe.mjs](../probes/fs-taskboard/taskboard-scope-probe.mjs) | 任务板跨门共享性（multi-human §0 机制事实表 / 手册动议任务板行改动时） |
| [converge-e2e-probe.mjs](../probes/fs-taskboard/converge-e2e-probe.mjs) | 临时工作区真跑收敛六步：证据副本 / 归档搬移 / 清 journal / 台账 / 索引重建 |
| [task-discovery-probe.mjs](../probes/fs-taskboard/task-discovery-probe.mjs) | 机器可读派活行的任务发现率（真模型 ≈$0.05–0.1，排练场） |
| [review-staleness-probe.mjs](../probes/fs-taskboard/review-staleness-probe.mjs) | 互审稿版本穿透（手册互审稿命名 / 稿首署名行改动时） |
| [observed-write-conflict-probe.mjs](../probes/fs-taskboard/observed-write-conflict-probe.mjs) | 同 fs-local 实例同版本竞写与败者重读合并；升 pin 后复验 |
| [collaboration-oracle-probe.mjs](../probes/fs-taskboard/collaboration-oracle-probe.mjs) | 协作判据的完整坏样本集均被判拒（零模型、秒级） |
| [archive-move-probe.mjs](../probes/fs-taskboard/archive-move-probe.mjs) | 临时 git 仓里真跑「交付物 → 归档家」搬移（drafts 未跟踪 + git mv 的失败类） |

## 审计与语料评估

| 脚本 | 证明对象 / 用途 |
|---|---|
| [deliverables-check.mjs](audit/deliverables-check.mjs) | 共享盘与日志的交付物三态、呈现背书和收敛字段 |
| [authorship-audit.mjs](audit/authorship-audit.mjs) | 稿件署名、实际写入者与版本引用的一致性 |
| [journal-audit.mjs](audit/journal-audit.mjs) | live/归档 journal 的收工缺席与置信度 |
| [candidate-scan-eval.mjs](audit/candidate-scan-eval.mjs) | 扫描规则的歧义语料自检、标注评分、误报/漏报与零容忍项 |

## 环境、导出与迁移

| 脚本 | 证明对象 / 用途 |
|---|---|
| [rehearsal-init.mjs](../tools/rehearsal-init.mjs) | 初始化或刷新排练参考镜像，保留已有排练产物 |
| [prune-runtime.mjs](../tools/prune-runtime.mjs) | 清 runtime 下 >N 天生成物（默认 dry-run；tracked / README / 被 markdown 引用的不删） |
| [snapshot-motion.mjs](../tools/snapshot-motion.mjs) | 将动议会话与实测工作区归档成场景，显式导入独立 oracle |
| [snapshot-path.mjs](../tools/snapshot-path.mjs) | 只读查询旧快照路径对应的现行位置；规范路径也可直接核对 |
| [session-log-export.mjs](../tools/session-log-export.mjs) | 将压缩日志导成明文 JSONL，供审计与跨 home 汇总 |
| [diagnose.mjs](../tools/diagnose.mjs) | 会话失败摘要（non-completed turn / tool error / 非 allow 审批 / 待答问询 / present / 最后正文；只读） |
| [bundle-init.mjs](../tools/bundle-init.mjs) | 重建 dev run bundle 的 workspace（fresh clone 用）：复制 pack 骨架 + 制度件符号链接指回 pack；已有盘一个字节不动 |
| [standalone.mjs](../tools/standalone.mjs) | 目录独立启动：隔离 `DSH_HOME`、自建 web profile、copy 骨架、relink、boot、`--reset`（不碰日用 home） |
| [ask-latency.mjs](../tools/ask-latency.mjs) | 从会话日志量 `ask_user_question` 真人作答延迟分布（调窗口用；只读秒级） |
| [deliverables-index.mjs](../tools/deliverables-index.mjs) | 扫描 final/meta 生成 `kb/deliverables-index.json`（成品页签只读这份索引） |
| [export-dist.mjs](../tools/export-dist.mjs) | 导出 tarball、生成安装手册并核对产物清单 |
| [release.mjs](../tools/release.mjs) | 发布五步入口：bump / prepare / verify / check，写 `_dist/release-manifest.json`；不 commit/push/publish |
| [sync-dsh.mjs](../tools/sync-dsh.mjs) | vendor 簿记、候选验证、元数据发布与受控失败恢复 |
| [converge.mjs](../tools/converge.mjs) | 工作区收敛执行器：已闭合动议的证据副本 → 归档家 git mv → journal 清出 → 台账行自动追加（无参计划 / `--slug` 收敛 / `--dry-run` / `--charter-backfill` 补登） |
| [harvest-probe.mjs](../tools/archive/harvest-probe.mjs) | 既有上游收割轮的审阅卡与 Office 预览取证仪器；复跑资格先读状态头注 |
| [migration-rehearsal.mjs](../tools/archive/migration-rehearsal.mjs) | 既有交付物目录迁移的排练/执行与审计视野；复跑资格先读状态头注 |

## 共享实现与目录选择

[lib](../tools/lib/) 保存可由隔离夹具验证的会话日志、workspace oracle、交付物/作者判据、排练输入、发布事务和仓库布局逻辑；[drivers](../tools/drivers/) 保存真实进程、CDP 和 Playwright 驱动。驱动不进入 keyless spec；准入由 [分层守卫](../tests/harness/layering.spec.ts) 检查。

门禁装配入口 [run-gates](run-gates.mjs) 住本目录根，每道门禁一个模块（清单唯一源 = gates/ 目录；pin 常量 = gates/lib/pin.mjs）；keyless spec 按 company/client/presets/harness 领域归位。新增入口同 diff 增加索引，触发条件、成本和状态仍留在脚本头注。目录取舍 = [driver-purpose-top-level](../notes/archived/2026-10-07-driver-purpose-top-level.md)（`scripts/`、`dev/` 形态名已退役）。

## 待触发复查（触发条件 → 该做什么）

培养面的几处"留给未来"都写死了触发条件——**条件与依据留在各自 Note（一处事实一个家）**，本表只做指针：

| 触发条件 | 该做什么 |
|---|---|
| 真实盘 **待处理 > 30 条**（或已采纳 > 5 个） | 折叠开始挡东西 ⇒ 再决定上**筛选**（优先于分页）。量法 `ls company-workspace/cultivation/records \| wc -l`；依据 = [场景轮 Note](../notes/implemented/2026-10-18-cultivation-scenario-audit.md) 追加十四 |
| 再攒 **~20 场真实收口仍 0 次自发提案** | 考虑在 persona/技能加一句引导（先查是不是被别的机制压住）。先跑 `node tools/propose-sampler.mjs` 看分箱；依据 = 同上 追加十六 |
| **升 pin** 或动培养面（面板 / host / preset 工具行） | 复跑四档真入口：`cultivation-gui-probe`、`cultivation-ux-walkthrough`、`cultivation-ux-scenarios`、`cultivation-method-layer-probe`；动 preset 另跑 `preset-smoke` |
| 想复核**问询窗口 120s** 还要不要改 | `node tools/ask-latency.mjs`（只读报数，不改配置）；依据 = [BUG-021 Note](../notes/implemented/2026-10-18-bug021-timed-user-question.md) |
| 命令面行为 / 事件形状要变 | 先看 S12（故障注入恢复）与 `tools/lib/question-stop.mjs` 的形状漂移判据——它们会先红；依据 = [BUG-022 Note](../notes/implemented/2026-10-18-bug022-question-stop-guard.md) |
| 想开**公司面其它面板**的 UX 深挖 | 先看 [已结公司面优先级卡](../_backlog/_archive/settled_issues/2026-10-19-company-panels-ux-priority.md)（顺序 = 看板+依赖图 → 任务板 → 台账；依据在 [调研](../_backlog/_archive/research/company-panels-ux/2026-10-19-panel-inventory-and-priority.md)） |
| **真人**愿意跑一轮体验 | `node probes/browser-visual/cultivation-ux-walkthrough.mjs --protocol` 打印协议卡（"新人困惑度"只有真人能填，模拟不替代） |
