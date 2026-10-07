# 维护者脚本索引

按要证明的对象选择下面的入口，再读目标脚本的头注确认触发条件、成本、状态和参数。脚本头注是这些事实的唯一家；本索引提供分类和可点击入口。证据政策见 [测试宪法](../../docs/testing.md)，开发环境见 [开发环](../../docs/guides/dev-loop.md)。

## 快速选择

| 当前目标 | 入口 |
|---|---|
| 检查结构、引用与簿记 | `pnpm verify` → [run-gates](run-gates.mjs) |
| 看运行态全景 / 场景 run bundle / 会话历史口径 | `pnpm orient`（默认全景含「待核工作候选」扫描节，R3′ 口径，`--workspace <dir>` 换扫描根；`--scenario <kind>/<场景>` run bundle；`--session <slug>[/<id前缀>]` 历史会话 preset）→ [orient](../tools/orient.mjs)（keyless 只读；含日用 home 警告） |
| 检查局部逻辑或静态渲染 | `pnpm test` → [tests](../../tests/)；[分层守卫](../../tests/harness/layering.spec.ts) |
| 确认角色真的挂载 | [preset-smoke](smoke/preset-smoke.mjs) |
| 确认 client 真的装配 | [client-load-smoke](smoke/client-load-smoke.mjs) |
| 确认录制行为与工作区判据 | [replay-smoke](smoke/replay-smoke.mjs) |
| 审计动议输出和角色留痕 | [deliverables-check](audit/deliverables-check.mjs)、[authorship-audit](audit/authorship-audit.mjs)、[journal-audit](audit/journal-audit.mjs) |
| 查看运行中页面 | [cdp-probe](../probes/cdp-probe.mjs)；操作合同见 [CDP 指南](../../docs/cdp-probe.md) |
| 核对发布链或导出交付包 | [release-smoke](smoke/release-smoke.mjs)、[export-dist](../tools/export-dist.mjs) |

模型调用与浏览器是两种独立成本。keyless 表示无需模型密钥：真实进程、浏览器或安装链仍有成本，保留在独立脚本 lane。文件名用来定位层，参数和头注决定实际运行模式；例如 replay 默认回放，`--ui` 加浏览器，`--record` 才重录模型调用。`presence-e2e` 检查 RPC 投影，不启动浏览器。

分区三标签速记：**验证** = `smoke/` + `audit/`（证明装配、行为、回放与留痕）｜**调试** = `probes/`（窄机制与视觉探查）｜**工具** = `tools/` + `drivers/` + `lib/`（导出、真实驱动、共享纯逻辑）。

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
| [cdp-probe.mjs](../probes/cdp-probe.mjs) | 已运行观察窗的真实渲染、公司页签与控制台；可选问题验证产品回路 |
| [browser-behavior-probe.mjs](../probes/browser-behavior-probe.mjs) | 自行拉起 MCP，以真实调用验证 browser-use 导航、读取、点击与输入 |
| [dag-visual-probe.mjs](../probes/dag-visual-probe.mjs) | 合成任务驱动的 DAG 主题、样式与视觉判据 |
| [dag-midflight-probe.mjs](../probes/dag-midflight-probe.mjs) | 真实动议或既有会话的 DAG 中途/终局形态和长链可读性 |

## 角色、手册与行为规则

| 脚本 | 证明对象 / 用途 |
|---|---|
| [handbook-smoke.mjs](smoke/handbook-smoke.mjs) | 真实会话指令基线中的公司手册注入与隔离根 |
| [probe-smoke.mjs](smoke/probe-smoke.mjs) | 角色连通、persona 入 prompt；内容档检查身份、知识与产出 |
| [entry-probe-smoke.mjs](smoke/entry-probe-smoke.mjs) | 维护者入口链的路由、证据引用与 coding 基线 |
| [budget-signoff-probe.mjs](../probes/budget-signoff-probe.mjs) | 文件预算会签与工具审批线的正反场景 |
| [date-rule-probe.mjs](../probes/date-rule-probe.mjs) | 注入日期用于记账和 journal 命名的实际行为 |
| [time-context-probe.mjs](../probes/time-context-probe.mjs) | 日期通道进入会话并被模型读回落盘 |
| [dissent-preservation-probe.mjs](../probes/dissent-preservation-probe.mjs) | lead 收口保留成员独立结论与有依据的分歧 |

## 人机回路与团队生命周期

| 脚本 | 证明对象 / 用途 |
|---|---|
| [attention-e2e-smoke.mjs](smoke/attention-e2e-smoke.mjs) | 触线、审批通知、人批与续行，以及双会话应答独立性 |
| [human-loop-e2e-smoke.mjs](smoke/human-loop-e2e-smoke.mjs) | 补料读取、非阻塞建议落稿与规矩缺口问询回流 |
| [delegation-smoke.mjs](smoke/delegation-smoke.mjs) | 命名委派、模型可见工具目录、团队控制 shadow 与 one-shot 语义 |
| [member-inquiry-probe.mjs](../probes/member-inquiry-probe.mjs) | 成员直接拉人问询的机制允许/拒绝结果 |
| [member-rescue-probe.mjs](../probes/member-rescue-probe.mjs) | 成员求助、lead 拉人、人答转达与成员续行 |
| [member-interrupt-probe.mjs](../probes/member-interrupt-probe.mjs) | 运行中成员中断后的 pending inbox 与新指示续行 |
| [presence-e2e-smoke.mjs](smoke/presence-e2e-smoke.mjs) | 真实会话投影中的成员接活、任务执行与完成状态链 |
| [team-concurrency-probe.mjs](../probes/team-concurrency-probe.mjs) | 同文件写入与同任务认领的并发冲突、重试和终态 |
| [team-atomicity-probe.mjs](../probes/team-atomicity-probe.mjs) | 并发追加完整性与跨任务 writeScopes 重叠警告 |
| [team-recovery-probe.mjs](../probes/team-recovery-probe.mjs) | 崩溃重启后的团队状态、持久邮箱与消息续行 |

## 文件与任务板协作

| 脚本 | 证明对象 / 用途 |
|---|---|
| [cross-process-fs-probe.mjs](../probes/cross-process-fs-probe.mjs) | fs-local 跨进程覆盖写、版本守卫与创建竞态 |
| [fs-guard-probe.mjs](../probes/fs-guard-probe.mjs) | 角色会话的先读后写、过期版本拒绝与并发创建终态 |
| [taskboard-presence-probe.mjs](../probes/taskboard-presence-probe.mjs) | 任务认领、加工中状态与在场板所需团队事件 |
| [motion-taskboard-probe.mjs](../probes/motion-taskboard-probe.mjs) | 无额外流程提示的真实动议中，模型是否执行手册任务板协作 |

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
| [harvest-probe.mjs](../tools/archive/harvest-probe.mjs) | 既有上游收割轮的审阅卡与 Office 预览取证仪器；复跑资格先读状态头注 |
| [migration-rehearsal.mjs](../tools/archive/migration-rehearsal.mjs) | 既有交付物目录迁移的排练/执行与审计视野；复跑资格先读状态头注 |

## 共享实现与目录选择

[lib](../tools/lib/) 保存可由隔离夹具验证的会话日志、workspace oracle、交付物/作者判据、排练输入、发布事务和仓库布局逻辑；[drivers](../tools/drivers/) 保存真实进程、CDP 和 Playwright 驱动。驱动不进入 keyless spec；准入由 [分层守卫](../../tests/harness/layering.spec.ts) 检查。

职责分区已落地：[smoke](smoke/) 是真实入口验收，[probes](../probes/) 是窄机制/行为探针，[audit](audit/) 是盘面与日志判据，[tools](../tools/) 是维护工具，[archive](../tools/archive/) 是已耗入口。完整门禁仍在根 [run-gates](run-gates.mjs)，pin 来源不拆；旧 [deliverables-check](deliverables-check.mjs) 仅保留相对 symlink。keyless spec 按 company/client/presets/harness 领域归位。一次迁移换取长期按职责发现与清晰准入，理由见 [职责分区迁移 Note](../../notes/implemented/2026-10-05-repository-responsibility-layout.md)；新增入口同 diff 增加索引，触发条件、成本和状态仍留在头注。
