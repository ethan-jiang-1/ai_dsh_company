# 公开入口库存（生成物，勿手改）

> 生成：`node tools/checks-index.mjs --write`；门禁 `script-index` 校验新鲜度。
> 触发条件/成本/状态唯一源 = 各脚本头注；本文件只回答“有哪些公开入口、在哪”。

## 冒烟 / 真实入口（checks/smoke/，28）

[attention-e2e-smoke](smoke/attention-e2e-smoke.mjs) · [channel-matrix-smoke](smoke/channel-matrix-smoke.mjs)
[client-error-chain-smoke](smoke/client-error-chain-smoke.mjs)
[client-load-smoke](smoke/client-load-smoke.mjs) · [company-entry-smoke](smoke/company-entry-smoke.mjs)
[concurrent-home-smoke](smoke/concurrent-home-smoke.mjs) · [delegation-smoke](smoke/delegation-smoke.mjs)
[entry-probe-smoke](smoke/entry-probe-smoke.mjs)
[external-workspace-smoke](smoke/external-workspace-smoke.mjs)
[human-loop-e2e-smoke](smoke/human-loop-e2e-smoke.mjs)
[interrupted-install-smoke](smoke/interrupted-install-smoke.mjs)
[isolation-matrix-smoke](smoke/isolation-matrix-smoke.mjs)
[multi-install-smoke](smoke/multi-install-smoke.mjs)
[multi-window-banner-smoke](smoke/multi-window-banner-smoke.mjs)
[permissions-recovery-smoke](smoke/permissions-recovery-smoke.mjs)
[presence-e2e-smoke](smoke/presence-e2e-smoke.mjs) · [present-catalog-smoke](smoke/present-catalog-smoke.mjs)
[preset-smoke](smoke/preset-smoke.mjs) · [probe-smoke](smoke/probe-smoke.mjs)
[product-team-e2e-smoke](smoke/product-team-e2e-smoke.mjs) · [profile-row-smoke](smoke/profile-row-smoke.mjs)
[refactor-drift-oracle](smoke/refactor-drift-oracle.mjs) · [release-smoke](smoke/release-smoke.mjs)
[replay-smoke](smoke/replay-smoke.mjs) · [revoke-recovery-smoke](smoke/revoke-recovery-smoke.mjs)
[snapshot-motion-smoke](smoke/snapshot-motion-smoke.mjs) · [ui-scene-smoke](smoke/ui-scene-smoke.mjs)
[upgrade-while-running-smoke](smoke/upgrade-while-running-smoke.mjs)

## 盘面审计（checks/audit/，4）

[authorship-audit](audit/authorship-audit.mjs) · [candidate-scan-eval](audit/candidate-scan-eval.mjs)
[deliverables-check](audit/deliverables-check.mjs) · [journal-audit](audit/journal-audit.mjs)

## 窄机制与视觉探针（probes/，66）

### browser-visual（17）

[attention-panel-probe](../probes/browser-visual/attention-panel-probe.mjs)
[board-drift-probe](../probes/browser-visual/board-drift-probe.mjs)
[browser-behavior-probe](../probes/browser-visual/browser-behavior-probe.mjs)
[budget-panel-probe](../probes/browser-visual/budget-panel-probe.mjs)
[cdp-probe](../probes/browser-visual/cdp-probe.mjs)
[compact-view-probe](../probes/browser-visual/compact-view-probe.mjs)
[cultivation-main-e2e](../probes/browser-visual/cultivation-main-e2e.mjs)
[cultivation-ux-scenarios](../probes/browser-visual/cultivation-ux-scenarios.mjs)
[cultivation-ux-walkthrough](../probes/browser-visual/cultivation-ux-walkthrough.mjs)
[dag-midflight-probe](../probes/browser-visual/dag-midflight-probe.mjs)
[dag-visual-probe](../probes/browser-visual/dag-visual-probe.mjs)
[deliverables-catalog-probe](../probes/browser-visual/deliverables-catalog-probe.mjs)
[ledger-summary-probe](../probes/browser-visual/ledger-summary-probe.mjs)
[open-in-app-probe](../probes/browser-visual/open-in-app-probe.mjs)
[presence-panel-probe](../probes/browser-visual/presence-panel-probe.mjs)
[sidebar-role-mark-probe](../probes/browser-visual/sidebar-role-mark-probe.mjs)
[tasks-panel-probe](../probes/browser-visual/tasks-panel-probe.mjs)

### fs-taskboard（10）

[collaboration-oracle-probe](../probes/fs-taskboard/collaboration-oracle-probe.mjs)
[converge-e2e-probe](../probes/fs-taskboard/converge-e2e-probe.mjs)
[cross-process-fs-probe](../probes/fs-taskboard/cross-process-fs-probe.mjs)
[fs-guard-probe](../probes/fs-taskboard/fs-guard-probe.mjs)
[motion-taskboard-probe](../probes/fs-taskboard/motion-taskboard-probe.mjs)
[observed-write-conflict-probe](../probes/fs-taskboard/observed-write-conflict-probe.mjs)
[review-staleness-probe](../probes/fs-taskboard/review-staleness-probe.mjs)
[task-discovery-probe](../probes/fs-taskboard/task-discovery-probe.mjs)
[taskboard-presence-probe](../probes/fs-taskboard/taskboard-presence-probe.mjs)
[taskboard-scope-probe](../probes/fs-taskboard/taskboard-scope-probe.mjs)

### session-context（17）

[ask-user-timed-probe](../probes/session-context/ask-user-timed-probe.mjs)
[budget-signoff-probe](../probes/session-context/budget-signoff-probe.mjs)
[ceo-assembly-probe](../probes/session-context/ceo-assembly-probe.mjs)
[cultivation-context-probe](../probes/session-context/cultivation-context-probe.mjs)
[cultivation-method-layer-probe](../probes/session-context/cultivation-method-layer-probe.mjs)
[cultivation-propose-probe](../probes/session-context/cultivation-propose-probe.mjs)
[date-rule-probe](../probes/session-context/date-rule-probe.mjs)
[dual-ceo-probe](../probes/session-context/dual-ceo-probe.mjs)
[dual-signoff-probe](../probes/session-context/dual-signoff-probe.mjs)
[hitl-dispatch-order-probe](../probes/session-context/hitl-dispatch-order-probe.mjs)
[human-exits-expression-probe](../probes/session-context/human-exits-expression-probe.mjs)
[human-exits-nonblocking-probe](../probes/session-context/human-exits-nonblocking-probe.mjs)
[human-exits-probe](../probes/session-context/human-exits-probe.mjs)
[journal-boundary-probe](../probes/session-context/journal-boundary-probe.mjs)
[member-bounceback-probe](../probes/session-context/member-bounceback-probe.mjs)
[reconcile-round-probe](../probes/session-context/reconcile-round-probe.mjs)
[time-context-probe](../probes/session-context/time-context-probe.mjs)

### team（22）

[claim-race-probe](../probes/team/claim-race-probe.mjs)
[dissent-preservation-probe](../probes/team/dissent-preservation-probe.mjs)
[member-inquiry-probe](../probes/team/member-inquiry-probe.mjs)
[member-interrupt-probe](../probes/team/member-interrupt-probe.mjs)
[member-reject-in-team-probe](../probes/team/member-reject-in-team-probe.mjs)
[member-rescue-probe](../probes/team/member-rescue-probe.mjs)
[member-stale-write-probe](../probes/team/member-stale-write-probe.mjs)
[multi-user-e2e-probe](../probes/team/multi-user-e2e-probe.mjs)
[index](../probes/team/read-barrier/index.mjs)
[requirements-chain-probe](../probes/team/requirements-chain-probe.mjs)
[sa-sqa-closeout-audit](../probes/team/sa-sqa-closeout-audit.mjs)
[sa-sqa-delegation-probe](../probes/team/sa-sqa-delegation-probe.mjs)
[sa-sqa-domain-audit](../probes/team/sa-sqa-domain-audit.mjs)
[sa-sqa-domain-routing-probe](../probes/team/sa-sqa-domain-routing-probe.mjs)
[sa-sqa-quality-audit](../probes/team/sa-sqa-quality-audit.mjs)
[team-atomicity-probe](../probes/team/team-atomicity-probe.mjs)
[team-claim-loser-probe](../probes/team/team-claim-loser-probe.mjs)
[team-concurrency-probe](../probes/team/team-concurrency-probe.mjs)
[team-recovery-probe](../probes/team/team-recovery-probe.mjs)
[vp-eng-root-lead-probe](../probes/team/vp-eng-root-lead-probe.mjs)
[vp-eng-teaming-probe](../probes/team/vp-eng-teaming-probe.mjs)
[vp-eng-workflow-probe](../probes/team/vp-eng-workflow-probe.mjs)

## 维护工具（tools/，19）

[ask-latency](../tools/ask-latency.mjs) · [bundle-init](../tools/bundle-init.mjs)
[checks-index](../tools/checks-index.mjs) · [company](../tools/company.mjs)
[converge](../tools/converge.mjs) · [deliverables-index](../tools/deliverables-index.mjs)
[diagnose](../tools/diagnose.mjs) · [export-dist](../tools/export-dist.mjs)
[market-index](../tools/market-index.mjs) · [notes-audit](../tools/notes-audit.mjs)
[orient](../tools/orient.mjs) · [propose-sampler](../tools/propose-sampler.mjs)
[prune-runtime](../tools/prune-runtime.mjs) · [rehearsal-init](../tools/rehearsal-init.mjs)
[release](../tools/release.mjs) · [session-log-export](../tools/session-log-export.mjs)
[snapshot-motion](../tools/snapshot-motion.mjs) · [snapshot-path](../tools/snapshot-path.mjs)
[sync-dsh](../tools/sync-dsh.mjs)

## 结构门禁（checks/gates/，58 个模块）

清单唯一源 = 目录本身；装配 = [run-gates](run-gates.mjs)，接线一致性由 `gate-wiring` 门禁强制。
