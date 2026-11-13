# 公开入口库存（生成物，勿手改）

> 生成：`node tools/checks-index.mjs --write`；门禁 `script-index` 校验新鲜度。
> 触发条件/成本/状态唯一源 = 各脚本头注；本文件只回答“有哪些公开入口、在哪”。

## 冒烟 / 真实入口（checks/lanes/，31）

[attention-e2e.entry](lanes/attention-e2e.entry.mjs) · [channel-matrix.entry](lanes/channel-matrix.entry.mjs)
[client-error-chain.entry](lanes/client-error-chain.entry.mjs)
[client-load.entry](lanes/client-load.entry.mjs) · [company-entry.entry](lanes/company-entry.entry.mjs)
[company-root-process.e2e](lanes/company-root-process.e2e.mjs)
[concurrent-home.entry](lanes/concurrent-home.entry.mjs) · [delegation.entry](lanes/delegation.entry.mjs)
[entry-probe.entry](lanes/entry-probe.entry.mjs)
[external-workspace.entry](lanes/external-workspace.entry.mjs) · [fast-lane](lanes/fast-lane.mjs)
[human-loop-e2e.entry](lanes/human-loop-e2e.entry.mjs)
[interrupted-install.entry](lanes/interrupted-install.entry.mjs)
[isolation-matrix.entry](lanes/isolation-matrix.entry.mjs) · [keyless-lane](lanes/keyless-lane.mjs)
[multi-install.entry](lanes/multi-install.entry.mjs)
[multi-window-banner.entry](lanes/multi-window-banner.entry.mjs)
[permissions-recovery.entry](lanes/permissions-recovery.entry.mjs)
[presence-e2e.entry](lanes/presence-e2e.entry.mjs) · [present-catalog.e2e](lanes/present-catalog.e2e.mjs)
[preset.entry](lanes/preset.entry.mjs) · [probe.entry](lanes/probe.entry.mjs)
[product-team-e2e.entry](lanes/product-team-e2e.entry.mjs) · [profile-row.entry](lanes/profile-row.entry.mjs)
[release.entry](lanes/release.entry.mjs) · [replay.e2e](lanes/replay.e2e.mjs)
[revoke-recovery.entry](lanes/revoke-recovery.entry.mjs)
[snapshot-motion.e2e](lanes/snapshot-motion.e2e.mjs) · [ui-scene.entry](lanes/ui-scene.entry.mjs)
[upgrade-while-running.entry](lanes/upgrade-while-running.entry.mjs)
[workflow-contract.e2e](lanes/workflow-contract.e2e.mjs)

## 盘面审计（checks/audit/，7）

[authorship-audit](audit/authorship-audit.mjs) · [candidate-scan-eval](audit/candidate-scan-eval.mjs)
[coverage-ratchet](audit/coverage-ratchet.mjs) · [deliverables-check](audit/deliverables-check.mjs)
[journal-audit](audit/journal-audit.mjs) · [quality-loop-audit](audit/quality-loop-audit.mjs)
[surface-matrix-audit](audit/surface-matrix-audit.mjs)

## 窄机制与视觉探针（probes/，68）

### browser-visual（17）

[attention-panel-probe](../probes/browser-visual/attention-panel-probe.mjs)
[board-drift-probe](../probes/browser-visual/board-drift-probe.mjs)
[browser-behavior-probe](../probes/browser-visual/browser-behavior-probe.mjs)
[budget-panel-probe](../probes/browser-visual/budget-panel-probe.mjs)
[cdp-probe](../probes/browser-visual/cdp-probe.mjs)
[compact-view-probe](../probes/browser-visual/compact-view-probe.mjs)
[cultivation-main-e2e-probe](../probes/browser-visual/cultivation-main-e2e-probe.mjs)
[cultivation-ux-scenarios-probe](../probes/browser-visual/cultivation-ux-scenarios-probe.mjs)
[cultivation-ux-walkthrough-probe](../probes/browser-visual/cultivation-ux-walkthrough-probe.mjs)
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

### session-context（18）

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
[team-taskbook-probe](../probes/session-context/team-taskbook-probe.mjs)
[time-context-probe](../probes/session-context/time-context-probe.mjs)

### team（23）

[claim-race-probe](../probes/team/claim-race-probe.mjs)
[delegation-contract-probe](../probes/team/delegation-contract-probe.mjs)
[delegation-depth-probe](../probes/team/delegation-depth-probe.mjs)
[delegation-lifecycle-probe](../probes/team/delegation-lifecycle-probe.mjs)
[dissent-preservation-probe](../probes/team/dissent-preservation-probe.mjs)
[member-inquiry-probe](../probes/team/member-inquiry-probe.mjs)
[member-interrupt-probe](../probes/team/member-interrupt-probe.mjs)
[member-reject-in-team-probe](../probes/team/member-reject-in-team-probe.mjs)
[member-rescue-probe](../probes/team/member-rescue-probe.mjs)
[member-stale-write-probe](../probes/team/member-stale-write-probe.mjs)
[multi-user-e2e-probe](../probes/team/multi-user-e2e-probe.mjs)
[quality-loop-r2-probe](../probes/team/quality-loop-r2-probe.mjs)
[index](../probes/team/read-barrier/index.mjs)
[subagent-retry-probe](../probes/team/subagent-retry-probe.mjs)
[team-atomicity-probe](../probes/team/team-atomicity-probe.mjs)
[team-claim-loser-probe](../probes/team/team-claim-loser-probe.mjs)
[team-concurrency-probe](../probes/team/team-concurrency-probe.mjs)
[team-recovery-probe](../probes/team/team-recovery-probe.mjs)
[vp-eng-root-lead-probe](../probes/team/vp-eng-root-lead-probe.mjs)
[vp-eng-teaming-probe](../probes/team/vp-eng-teaming-probe.mjs)
[vp-eng-workflow-probe](../probes/team/vp-eng-workflow-probe.mjs)
[worker-orchestrator-probe](../probes/team/worker-orchestrator-probe.mjs)
[worker-researcher-probe](../probes/team/worker-researcher-probe.mjs)

## 维护工具（tools/，26）

[ask-latency](../tools/ask-latency.mjs) · [bundle-init](../tools/bundle-init.mjs)
[checks-index](../tools/checks-index.mjs) · [company](../tools/company.mjs)
[converge](../tools/converge.mjs) · [deliverables-index](../tools/deliverables-index.mjs)
[diagnose](../tools/diagnose.mjs) · [explore-evidence](../tools/explore-evidence.mjs)
[export-dist](../tools/export-dist.mjs) · [hooks-install](../tools/hooks-install.mjs)
[market-index](../tools/market-index.mjs) · [methods-init](../tools/methods-init.mjs)
[notes-audit](../tools/notes-audit.mjs) · [orient](../tools/orient.mjs)
[propose-sampler](../tools/propose-sampler.mjs) · [prune-runtime](../tools/prune-runtime.mjs)
[refactor-drift](../tools/refactor-drift.mjs) · [rehearsal-init](../tools/rehearsal-init.mjs)
[release](../tools/release.mjs) · [run-check-tests](../tools/run-check-tests.mjs)
[session-log-export](../tools/session-log-export.mjs) · [setup](../tools/setup.mjs)
[snapshot-motion](../tools/snapshot-motion.mjs) · [snapshot-path](../tools/snapshot-path.mjs)
[sync-dsh](../tools/sync-dsh.mjs) · [test-census](../tools/test-census.mjs)

## 结构门禁（checks/gates/，73 个模块）

清单唯一源 = 目录本身；装配 = [run-gates](run-gates.mjs)，接线一致性由 `gate-wiring` 门禁强制。
