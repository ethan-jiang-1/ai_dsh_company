# 检查与工具索引（验证 · 调试 · 工具三面）

按要证明的对象选择下面的入口，再读目标脚本的头注确认触发条件、成本、状态和参数。脚本头注是这些事实的唯一家；本索引提供分类和可点击入口。证据政策见 [测试宪法](../docs/testing.md)，开发环境见 [开发环](../docs/guides/dev-loop.md)。

## 快速选择

| 当前目标 | 入口 |
|---|---|
| 检查结构、引用与簿记 | `pnpm verify` → [run-gates](run-gates.mjs) |
| 看运行态全景 / 场景 run bundle / 会话历史口径 | `pnpm orient`（默认全景含「待核工作候选」扫描节，R3′ 口径，`--workspace <dir>` 换扫描根；`--scenario <kind>/<场景>` run bundle；`--session <slug>[/<id前缀>]` 历史会话 preset）→ [orient](../tools/orient.mjs)（keyless 只读；含日用 home 警告） |
| 检查局部逻辑或静态渲染 | `pnpm test` → [tests](../tests/)；[分层守卫](../tests/harness/layering.spec.ts) |
| 确认角色真的挂载 | [preset-smoke](smoke/preset-smoke.mjs) |
| 确认 client 真的装配 | [client-load-smoke](smoke/client-load-smoke.mjs) |
| 确认录制行为与工作区判据 | [replay-smoke](smoke/replay-smoke.mjs) |
| 审计动议输出和角色留痕 | [deliverables-check](audit/deliverables-check.mjs)、[authorship-audit](audit/authorship-audit.mjs)、[journal-audit](audit/journal-audit.mjs) |
| 查看运行中页面 | [cdp-probe](../probes/browser-visual/cdp-probe.mjs)；操作指南见 [CDP 指南](../docs/guides/cdp-probe.md) |
| 核对发布链或导出交付包 | [release-smoke](smoke/release-smoke.mjs)、[export-dist](../tools/export-dist.mjs) |

模型调用与浏览器是两种独立成本。keyless 表示无需模型密钥：真实进程、浏览器或安装链仍有成本，保留在独立脚本 lane。文件名用来定位层，参数和头注决定实际运行模式；例如 replay 默认回放，`--ui` 加浏览器，`--record` 才重录模型调用。`presence-e2e` 检查 RPC 投影，不启动浏览器。

顶层按用途读（2026-10-07 S2 起）：**验证面 = checks/**（本目录：`smoke/` 真实入口冒烟 + `audit/` 盘面日志判据 + run-gates 门禁）｜**调试面 = [probes/](../probes/)**（窄机制与视觉探查，按机制域四子目录：team / fs-taskboard / browser-visual / session-context）｜**工具面 = [tools/](../tools/)**（维护工具 + `lib/` 共享纯逻辑 + `drivers/` 真实驱动 + `archive/` 已耗仪器）。

## 结构、装载与发布

| 脚本 | 证明对象 / 用途 |
|---|---|
| [run-gates.mjs](run-gates.mjs) | 仓库结构、文档引用、vendor 簿记与脚本约束；门禁清单以实现为准 |
| [preset-smoke.mjs](smoke/preset-smoke.mjs) | 通过真实会话创建验证各角色 preset 挂载 |
| [client-load-smoke.mjs](smoke/client-load-smoke.mjs) | 加载真实 Web 页面，验证 client 挂载、品牌与零装配错误 |
| [replay-smoke.mjs](smoke/replay-smoke.mjs) | 录制会话、sidecar、团队投影与场景声明的工作区 oracle；另有录制和 UI 模式 |
| [snapshot-motion-smoke.mjs](smoke/snapshot-motion-smoke.mjs) | 真实 CLI 子进程中的快照采集与 workspace capture 接线 |
| [release-smoke.mjs](smoke/release-smoke.mjs) | 构建、打包、干净 profile 安装与 built CLI 启动 |

## 浏览器与视觉

| 脚本 | 证明对象 / 用途 |
|---|---|
| [cdp-probe.mjs](../probes/browser-visual/cdp-probe.mjs) | 已运行观察窗的真实渲染、公司页签与控制台；可选问题验证产品回路 |
| [browser-behavior-probe.mjs](../probes/browser-visual/browser-behavior-probe.mjs) | 自行拉起 MCP，以真实调用验证 browser-use 导航、读取、点击与输入 |
| [dag-visual-probe.mjs](../probes/browser-visual/dag-visual-probe.mjs) | 合成任务驱动的 DAG 主题、样式与视觉判据 |
| [dag-midflight-probe.mjs](../probes/browser-visual/dag-midflight-probe.mjs) | 真实动议或既有会话的 DAG 中途/终局形态和长链可读性 |
| [ledger-summary-probe.mjs](../probes/browser-visual/ledger-summary-probe.mjs) | 台账摘要在宽/窄视口的可读性与键盘/触屏全文入口 |
| [compact-view-probe.mjs](../probes/browser-visual/compact-view-probe.mjs) | compact 折叠过程行但保留助手最终长回复的现场对照 |
| [open-in-app-probe.mjs](../probes/browser-visual/open-in-app-probe.mjs) | 交付物进侧栏预览 → Host 判词（`ok:true`/`opened:true`）→ **目标应用状态文件登记该路径**；`--tree` 挑未打开过的文件可拿干净翻转 |

## 角色、手册与行为规则

| 脚本 | 证明对象 / 用途 |
|---|---|
| [handbook-smoke.mjs](smoke/handbook-smoke.mjs) | 真实会话指令基线中的公司手册注入与隔离根 |
| [probe-smoke.mjs](smoke/probe-smoke.mjs) | 角色连通、persona 入 prompt；内容档检查身份、知识与产出 |
| [entry-probe-smoke.mjs](smoke/entry-probe-smoke.mjs) | 维护者入口链的路由、证据引用与 coding 基线 |
| [budget-signoff-probe.mjs](../probes/session-context/budget-signoff-probe.mjs) | 文件预算会签与工具审批线的正反场景 |
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
| [task-discovery-probe.mjs](../probes/fs-taskboard/task-discovery-probe.mjs) | 机器可读派活行的任务发现率（真模型 ≈$0.05–0.1，排练场） |
| [review-staleness-probe.mjs](../probes/fs-taskboard/review-staleness-probe.mjs) | 互审稿版本穿透（手册互审稿命名 / 稿首署名行改动时） |
| [observed-write-conflict-probe.mjs](../probes/fs-taskboard/observed-write-conflict-probe.mjs) | 同 fs-local 实例同版本竞写与败者重读合并；升 pin 后复验 |
| [collaboration-oracle-probe.mjs](../probes/fs-taskboard/collaboration-oracle-probe.mjs) | 协作判据的完整坏样本集均被判拒（零模型、秒级） |

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
| [snapshot-motion.mjs](../tools/snapshot-motion.mjs) | 将动议会话与实测工作区归档成场景，显式导入独立 oracle |
| [snapshot-path.mjs](../tools/snapshot-path.mjs) | 只读查询旧快照路径对应的现行位置；规范路径也可直接核对 |
| [session-log-export.mjs](../tools/session-log-export.mjs) | 将压缩日志导成明文 JSONL，供审计与跨 home 汇总 |
| [export-dist.mjs](../tools/export-dist.mjs) | 导出 tarball、生成安装手册并核对产物清单 |
| [sync-dsh.mjs](../tools/sync-dsh.mjs) | vendor 簿记、候选验证、元数据发布与受控失败恢复 |
| [converge.mjs](../tools/converge.mjs) | 工作区收敛执行器：已闭合动议的证据副本 → 归档家 git mv → journal 清出 → 台账行自动追加（无参计划 / `--slug` 收敛 / `--dry-run` / `--charter-backfill` 补登） |
| [harvest-probe.mjs](../tools/archive/harvest-probe.mjs) | 既有上游收割轮的审阅卡与 Office 预览取证仪器；复跑资格先读状态头注 |
| [migration-rehearsal.mjs](../tools/archive/migration-rehearsal.mjs) | 既有交付物目录迁移的排练/执行与审计视野；复跑资格先读状态头注 |

## 共享实现与目录选择

[lib](../tools/lib/) 保存可由隔离夹具验证的会话日志、workspace oracle、交付物/作者判据、排练输入、发布事务和仓库布局逻辑；[drivers](../tools/drivers/) 保存真实进程、CDP 和 Playwright 驱动。驱动不进入 keyless spec；准入由 [分层守卫](../tests/harness/layering.spec.ts) 检查。

完整门禁 [run-gates](run-gates.mjs) 住本目录根，pin 事实不拆；keyless spec 按 company/client/presets/harness 领域归位。新增入口同 diff 增加索引，触发条件、成本和状态仍留在脚本头注。目录取舍 = [driver-purpose-top-level](../notes/implemented/2026-10-07-driver-purpose-top-level.md)（`scripts/`、`dev/` 形态名已退役）。
