# 检查与工具索引（验证 · 调试 · 工具三面）

按要证明的对象选下面的入口。本文件是**索引**（政策 = [测试宪法](../docs/testing.md)，改动面映射 = [tests/README](../tests/README.md)）；再读目标脚本的头注——**触发条件、成本、状态与参数的唯一家是脚本头注**；
本文件只做分类与链接，不复述逐脚本说明（复述必漂）。证据政策 = [测试宪法](../docs/testing.md)；
开发环境 = [开发环](../docs/guides/dev-loop.md)；验证分层/命令预算 = [tests/README](../tests/README.md)。

## 快速选择

| 当前目标 | 入口 |
|---|---|
| 检查结构、引用与簿记 | `pnpm verify` → [run-gates](run-gates.mjs) |
| 看运行态全景 / 场景 / 会话历史 | `pnpm orient` → [orient](../tools/orient.mjs) |
| 看最近会话的失败摘要（中断轮也算失败） | `pnpm diagnose [--strict]` → [diagnose](../tools/diagnose.mjs) |
| 检查密钥与凭据暴露面 | [security-scan](gates/security-scan.mjs) · [tracked-token](gates/tracked-token.mjs) · [tracked-secrets](gates/tracked-secrets.mjs) |
| 检查局部逻辑或静态渲染 | `pnpm test` → [tests](../tests/)；分层守卫 = [layering.spec](../tests/harness/layering.spec.ts) |
| 类型 / 导入签名改动 | `pnpm typecheck`（命令与预算 = [tests/README §验证分层与预算](../tests/README.md)） |
| 确认角色真的挂载 | [preset-smoke](smoke/preset-smoke.mjs) |
| 确认 client 真的装配 | [client-load-smoke](smoke/client-load-smoke.mjs) |
| **看真页面 / 复现 UI 症状** | [ui-scene-smoke](smoke/ui-scene-smoke.mjs)：自起实例 → 全部公司页签 + 浏览器错误环 → 证据（`--keep` 留实例；`--isolated --golden` = 隔离空壳金样档；`--steps` = 复现点击/输入） |
| 查看已运行页面 | [cdp-probe](../probes/browser-visual/cdp-probe.mjs)；指南 = [CDP 指南](../docs/guides/cdp-probe.md) |
| 确认录制行为与工作区判据 | [replay-smoke](smoke/replay-smoke.mjs)（当前仅 headless 合成场景） |
| 审计动议输出与角色留痕 | [deliverables-check](audit/deliverables-check.mjs) · [authorship-audit](audit/authorship-audit.mjs) · [journal-audit](audit/journal-audit.mjs) |
| 核对发布链或导出交付包 | [release-smoke](smoke/release-smoke.mjs) · [channel-matrix-smoke](smoke/channel-matrix-smoke.mjs) · [lifecycle-smoke](smoke/lifecycle-smoke.mjs) · [standalone-smoke](smoke/standalone-smoke.mjs) · [export-dist](../tools/export-dist.mjs) |
| 从目录隔离启动公司实例 | `pnpm standalone` → [standalone](../tools/standalone.mjs) |

## 清单（分区 = 目录本身；逐脚本说明 = 各自头注）

**冒烟 / 真实入口**（`checks/smoke/`，28 个）
[attention-e2e](smoke/attention-e2e-smoke.mjs) · [channel-matrix](smoke/channel-matrix-smoke.mjs) · [client-load](smoke/client-load-smoke.mjs) · [concurrent-home](smoke/concurrent-home-smoke.mjs) · [delegation](smoke/delegation-smoke.mjs) · [entry-probe](smoke/entry-probe-smoke.mjs) · [external-workspace](smoke/external-workspace-smoke.mjs)
[handbook](smoke/handbook-smoke.mjs) · [human-loop-e2e](smoke/human-loop-e2e-smoke.mjs) · [interrupted-install](smoke/interrupted-install-smoke.mjs) · [isolation-matrix](smoke/isolation-matrix-smoke.mjs) · [lifecycle](smoke/lifecycle-smoke.mjs) · [multi-install](smoke/multi-install-smoke.mjs) · [multi-window-banner](smoke/multi-window-banner-smoke.mjs)
[permissions-recovery](smoke/permissions-recovery-smoke.mjs) · [presence-e2e](smoke/presence-e2e-smoke.mjs) · [present-catalog](smoke/present-catalog-smoke.mjs) · [preset](smoke/preset-smoke.mjs) · [probe](smoke/probe-smoke.mjs) · [profile-row](smoke/profile-row-smoke.mjs) · [refactor-drift-oracle](smoke/refactor-drift-oracle.mjs)
[release](smoke/release-smoke.mjs) · [replay](smoke/replay-smoke.mjs) · [revoke-recovery](smoke/revoke-recovery-smoke.mjs) · [snapshot-motion](smoke/snapshot-motion-smoke.mjs) · [standalone](smoke/standalone-smoke.mjs) · [ui-scene](smoke/ui-scene-smoke.mjs) · [upgrade-while-running](smoke/upgrade-while-running-smoke.mjs)

**盘面审计**（`checks/audit/`，4 个）
[authorship-audit](audit/authorship-audit.mjs) · [candidate-scan-eval](audit/candidate-scan-eval.mjs) · [deliverables-check](audit/deliverables-check.mjs) · [journal-audit](audit/journal-audit.mjs)

**窄机制与视觉探针**（`probes/`，按机制域四子目录）
浏览器与视觉（17）：[attention-panel](../probes/browser-visual/attention-panel-probe.mjs) · [board-drift](../probes/browser-visual/board-drift-probe.mjs) · [browser-behavior](../probes/browser-visual/browser-behavior-probe.mjs) · [budget-panel](../probes/browser-visual/budget-panel-probe.mjs) · [cdp](../probes/browser-visual/cdp-probe.mjs) · [compact-view](../probes/browser-visual/compact-view-probe.mjs)
[cultivation-gui](../probes/browser-visual/cultivation-gui-probe.mjs) · [cultivation-ux-scenarios](../probes/browser-visual/cultivation-ux-scenarios.mjs) · [cultivation-ux-walkthrough](../probes/browser-visual/cultivation-ux-walkthrough.mjs) · [dag-midflight](../probes/browser-visual/dag-midflight-probe.mjs) · [dag-visual](../probes/browser-visual/dag-visual-probe.mjs) · [deliverables-catalog](../probes/browser-visual/deliverables-catalog-probe.mjs)
[ledger-summary](../probes/browser-visual/ledger-summary-probe.mjs) · [open-in-app](../probes/browser-visual/open-in-app-probe.mjs) · [presence-panel](../probes/browser-visual/presence-panel-probe.mjs) · [sidebar-role-mark](../probes/browser-visual/sidebar-role-mark-probe.mjs) · [tasks-panel](../probes/browser-visual/tasks-panel-probe.mjs)

文件与任务板（11）：[archive-move](../probes/fs-taskboard/archive-move-probe.mjs) · [collaboration-oracle](../probes/fs-taskboard/collaboration-oracle-probe.mjs) · [converge-e2e](../probes/fs-taskboard/converge-e2e-probe.mjs) · [cross-process-fs](../probes/fs-taskboard/cross-process-fs-probe.mjs) · [fs-guard](../probes/fs-taskboard/fs-guard-probe.mjs)
[motion-taskboard](../probes/fs-taskboard/motion-taskboard-probe.mjs) · [observed-write-conflict](../probes/fs-taskboard/observed-write-conflict-probe.mjs) · [review-staleness](../probes/fs-taskboard/review-staleness-probe.mjs) · [task-discovery](../probes/fs-taskboard/task-discovery-probe.mjs) · [taskboard-presence](../probes/fs-taskboard/taskboard-presence-probe.mjs) · [taskboard-scope](../probes/fs-taskboard/taskboard-scope-probe.mjs)

会话上下文（17）：[ask-user-timed](../probes/session-context/ask-user-timed-probe.mjs) · [budget-signoff](../probes/session-context/budget-signoff-probe.mjs) · [ceo-assembly](../probes/session-context/ceo-assembly-probe.mjs) · [cultivation-context](../probes/session-context/cultivation-context-probe.mjs) · [cultivation-method-layer](../probes/session-context/cultivation-method-layer-probe.mjs) · [cultivation-propose](../probes/session-context/cultivation-propose-probe.mjs)
[date-rule](../probes/session-context/date-rule-probe.mjs) · [dual-ceo](../probes/session-context/dual-ceo-probe.mjs) · [dual-signoff](../probes/session-context/dual-signoff-probe.mjs) · [hitl-dispatch-order](../probes/session-context/hitl-dispatch-order-probe.mjs) · [human-exits-expression](../probes/session-context/human-exits-expression-probe.mjs) · [human-exits-nonblocking](../probes/session-context/human-exits-nonblocking-probe.mjs)
[human-exits](../probes/session-context/human-exits-probe.mjs) · [journal-boundary](../probes/session-context/journal-boundary-probe.mjs) · [member-bounceback](../probes/session-context/member-bounceback-probe.mjs) · [reconcile-round](../probes/session-context/reconcile-round-probe.mjs) · [time-context](../probes/session-context/time-context-probe.mjs)

团队协作（13）：[claim-race](../probes/team/claim-race-probe.mjs) · [dissent-preservation](../probes/team/dissent-preservation-probe.mjs) · [member-inquiry](../probes/team/member-inquiry-probe.mjs) · [member-interrupt](../probes/team/member-interrupt-probe.mjs) · [member-reject-in-team](../probes/team/member-reject-in-team-probe.mjs) · [member-rescue](../probes/team/member-rescue-probe.mjs)
[member-stale-write](../probes/team/member-stale-write-probe.mjs) · [multi-user-e2e](../probes/team/multi-user-e2e-probe.mjs) · [team-atomicity](../probes/team/team-atomicity-probe.mjs) · [team-claim-loser](../probes/team/team-claim-loser-probe.mjs) · [team-concurrency](../probes/team/team-concurrency-probe.mjs) · [team-recovery](../probes/team/team-recovery-probe.mjs) · [read-barrier](../probes/team/read-barrier/index.mjs)

**维护工具**（`tools/`，16 个）
[ask-latency](../tools/ask-latency.mjs) · [bundle-init](../tools/bundle-init.mjs) · [converge](../tools/converge.mjs) · [deliverables-index](../tools/deliverables-index.mjs) · [diagnose](../tools/diagnose.mjs) · [export-dist](../tools/export-dist.mjs) · [orient](../tools/orient.mjs) · [propose-sampler](../tools/propose-sampler.mjs)
[prune-runtime](../tools/prune-runtime.mjs) · [rehearsal-init](../tools/rehearsal-init.mjs) · [release](../tools/release.mjs) · [session-log-export](../tools/session-log-export.mjs) · [snapshot-motion](../tools/snapshot-motion.mjs) · [snapshot-path](../tools/snapshot-path.mjs) · [standalone](../tools/standalone.mjs) · [sync-dsh](../tools/sync-dsh.mjs)

**结构门禁**（`checks/gates/`，50 个模块）：清单唯一源 = 目录本身；装配 = [run-gates](run-gates.mjs)，
接线一致性由 `gate-wiring` 门禁强制。pin 常量 = [gates/lib/pin.mjs](gates/lib/pin.mjs)。

## 共享实现与目录选择

[lib](../tools/lib/) 保存可由隔离夹具验证的纯逻辑（会话日志、workspace oracle、交付物/作者判据、
发布事务、仓库布局、分层判据）；[drivers](../tools/drivers/) 保存真实进程/CDP/Playwright 驱动。
驱动不进入 keyless spec，准入由 [分层守卫](../tests/harness/layering.spec.ts) 检查。

目录取舍 = [driver-purpose-top-level](../notes/archived/2026-10-07-driver-purpose-top-level.md)
（`scripts/`、`dev/` 形态名已退役）；顶层分区导航 = [项目地图](../docs/project-map.md)。

## 待触发复查（触发条件 → 该做什么）

触发条件与依据留在各自 Note（一处事实一个家），本表只做指针：

| 触发条件 | 该做什么 |
|---|---|
| 真实盘**待处理 > 30 条**（或已采纳 > 5 个） | 折叠开始挡东西 ⇒ 先决定上**筛选**（优先于分页）。量法 `ls company-workspace/cultivation/records \| wc -l`；依据 = [场景轮 Note](../notes/implemented/2026-10-18-cultivation-scenario-audit.md) 追加十四 |
| 再攒 **~20 场真实收口仍 0 次自发提案** | 考虑在 persona/技能加一句引导（先查是不是被别的机制压住）。先跑 [propose-sampler](../tools/propose-sampler.mjs) 看分箱；依据 = 同上 追加十六 |
| **升 pin** 或动培养面（面板 / host / preset 工具行） | 复跑四档真入口：[cultivation-gui](../probes/browser-visual/cultivation-gui-probe.mjs)、[cultivation-ux-walkthrough](../probes/browser-visual/cultivation-ux-walkthrough.mjs)、[cultivation-ux-scenarios](../probes/browser-visual/cultivation-ux-scenarios.mjs)、[cultivation-method-layer](../probes/session-context/cultivation-method-layer-probe.mjs)；动 preset 另跑 [preset-smoke](smoke/preset-smoke.mjs) |
| 想复核**问询窗口 120s** 还要不要改 | `node tools/ask-latency.mjs`（只读报数，不改配置）；依据 = [BUG-021 Note](../notes/implemented/2026-10-18-bug021-timed-user-question.md) |
| 命令面行为 / 事件形状要变 | 先看 S12（故障注入恢复）与 `tools/lib/question-stop.mjs` 的形状漂移判据——它们会先红；依据 = [BUG-022 Note](../notes/implemented/2026-10-18-bug022-question-stop-guard.md) |
