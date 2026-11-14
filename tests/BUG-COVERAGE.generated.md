# 历史缺陷 → 具名守卫覆盖（生成物，勿手改）

> 生成 = `node tools/bug-coverage.mjs --write`；一致门 = `tests/repo/bug-coverage.spec.ts`。
> 口径 = `it/test/describe` 标题里的 `BUG-<nnn>`；标题没写 BUG 的守卫不计入——「无守卫」是候选缺口，不是「一定没测」。

## 汇总

| 指标 | 数量 |
|---|---|
| 已修卡 | 181 |
| 有具名守卫 | 76 |
| 无具名守卫 | 105 |
| 覆盖率 | 42.0% |

## 无具名守卫（候选缺口，按 opened 倒序）

| BUG | opened | slug |
|---|---|---|
| 183 | 2026-11-14 | notes-root-symlink-followed |
| 180 | 2026-11-14 | walk-company-dirs-windows-dotdot |
| 179 | 2026-11-14 | internal-dotdot-over-rejected |
| 175 | 2026-11-14 | fix-evidence-fake-command |
| 174 | 2026-11-14 | notes-tree-symlink-invisible |
| 171 | 2026-11-14 | fix-evidence-deletion-surface |
| 167 | 2026-11-14 | notes-tree-invalid-calendar-date |
| 163 | 2026-11-14 | notes-tree-rejected-status-unguarded |
| 161 | 2026-11-14 | pre-push-merge-commit-surface-skip |
| 159 | 2026-11-13 | client-error-ring-empty-object-message |
| 158 | 2026-11-13 | pre-push-zero-sha-range |
| 155 | 2026-11-13 | prd-gate-stale-session-cwd |
| 154 | 2026-11-13 | prd-gate-numbering-empty-value |
| 151 | 2026-11-13 | upgrade-log-target-symlink-writes-outside |
| 146 | 2026-11-13 | use-company-data-agent-team-projection-oom |
| 142 | 2026-11-13 | bootstrap-replace-directory-eisdir |
| 141 | 2026-11-13 | cultivation-adopt-reject-verify-throws |
| 137 | 2026-11-13 | presented-ledger-symlink-read-outside |
| 136 | 2026-11-13 | startup-settings-symlink-read-outside |
| 135 | 2026-11-13 | catalog-index-symlink-read-outside |
| 132 | 2026-11-13 | catalog-index-path-directory-eisdir |
| 131 | 2026-11-13 | kb-symlink-catalog-writes-outside |
| 130 | 2026-11-13 | cultivation-write-root-throws |
| 129 | 2026-11-13 | dsh-company-symlink-root-writes-outside |
| 127 | 2026-11-13 | cultivation-records-file-throws |
| 125 | 2026-11-13 | audit-symlink-canonicalizes-to-target |
| 122 | 2026-11-13 | catalog-root-file-symlink-enotdir |
| 120 | 2026-11-13 | startup-settings-dangerous-session-cwd |
| 116 | 2026-11-13 | release-inventory-misses-wiki-template-shared-skill |
| 115 | 2026-11-13 | lease-takeover-no-fencing-old-writer |
| 113 | 2026-11-13 | command-doc-symlink-outside-workspace |
| 112 | 2026-11-13 | team-task-unassign-keeps-old-owner |
| 111 | 2026-11-13 | saved-workspace-non-atomic-write |
| 110 | 2026-11-13 | governance-export-rm-before-rename |
| 109 | 2026-11-13 | catalog-warnings-dropped-in-audit-present |
| 108 | 2026-11-13 | catalog-symlink-final-outside |
| 107 | 2026-11-13 | deliverables-audit-multi-space-path |
| 106 | 2026-11-13 | lease-pid-reuse-blocks-writer |
| 105 | 2026-11-13 | stream-error-not-rendered-in-board-dag-tasks |
| 104 | 2026-11-13 | team-task-merge-no-revision-null-view |
| 102 | 2026-11-13 | req-delivery-rule-path-traversal |
| 101 | 2026-11-13 | concurrent-home-smoke-stale-v2-and-lease-timing |
| 100 | 2026-11-13 | export-dist-deletes-old-before-pack |
| 099 | 2026-11-13 | deliverables-audit-nonexistent-final |
| 098 | 2026-11-13 | presence-pending-transition-shows-deleted |
| 097 | 2026-11-13 | workflow-runs-mispair-failed-call |
| 096 | 2026-11-13 | deliverables-catalog-directory-eisdir |
| 095 | 2026-11-13 | workspace-resolution-accepts-tmp-root |
| 094 | 2026-11-12 | bundle-manifest-id-path-traversal |
| 093 | 2026-11-12 | cultivation-legacy-migration-invalid-slug |
| 092 | 2026-11-12 | cultivation-propose-empty-fields |
| 091 | 2026-11-12 | cultivation-check-revoked-broken-unsafe |
| 090 | 2026-11-12 | cultivation-revoke-unreachable-records-deletes-method |
| 089 | 2026-11-12 | boot-without-workspace-settings-not-injected |
| 088 | 2026-11-12 | shipped-links-excludes-wiki-template |
| 087 | 2026-11-12 | wiki-template-copy-path-repo-only |
| 086 | 2026-11-12 | strategy-button-tooltip-no-values |
| 085 | 2026-11-12 | startup-options-read-limit-fixed-fixture |
| 084 | 2026-11-12 | wiki-pointer-lexical-path-permission |
| 083 | 2026-11-12 | company-settings-host-command-strings-mixed-language |
| 082 | 2026-11-12 | strategy-panel-stale-wiki-check |
| 081 | 2026-11-12 | strategy-panel-reads-session-workspace-command-writes-host |
| 080 | 2026-11-12 | en-tab-title-map-missing-strategy |
| 076 | 2026-11-11 | support-root-still-has-team-tools-policy |
| 075 | 2026-11-11 | eng-teaming-schema-rule-duplicated |
| 073 | 2026-11-11 | readme-one-shot-child-team-tools-stale |
| 071 | 2026-11-11 | capability-header-not-installed-wording |
| 070 | 2026-11-11 | delegation-maxdepth-example-wrong |
| 069 | 2026-11-11 | tier-policy-gate-coverage |
| 068 | 2026-11-11 | base-clean-deployment-case-language |
| 067 | 2026-11-11 | process-docs-dead-pointers |
| 066 | 2026-11-11 | coo-person-level-staffing-without-roster |
| 065 | 2026-11-11 | cfo-rate-card-missing |
| 064 | 2026-11-11 | methods-not-product-type-aware |
| 063 | 2026-11-11 | bootstrap-process-docs-always-hardware |
| 062 | 2026-11-11 | default-product-type-contradicts-business |
| 061 | 2026-11-11 | product-type-allowed-values-drift |
| 050 | 2026-11-09 | retry-depth-fix-fails-in-real-assembly |
| 048 | 2026-11-09 | ui-golden-brand-name-drift |
| 044 | 2026-11-08 | background-job-lost-on-restart |
| 043 | 2026-11-08 | list-subagents-includes-teammates |
| 042 | 2026-11-08 | list-subagents-lastturnend-missing |
| 040 | 2026-11-08 | workflow-schema-text-answer-discarded |
| 039 | 2026-11-08 | workflow-result-truncation-lossy-spill |
| 038 | 2026-11-08 | workflow-branch-nested-delegation-result |
| 037 | 2026-11-08 | root-team-tool-shadowing |
| 036 | 2026-11-08 | workflow-schema-enum-type |
| 035 | 2026-11-06 | short-circuit-withstand-undefined |
| 034 | 2026-11-06 | no-absolute-time-source-for-signed-records |
| 032 | 2026-10-23 | r3-rerecord-not-replayable |
| 031 | 2026-10-20 | orient-scenario-children-file-shape |
| 029 | 2026-10-20 | committed-web-token-recurrence |
| 026 | 2026-10-19 | owner-missing-from-team-projection |
| 025 | 2026-10-19 | ledger-reads-wrong-data-face |
| 024 | 2026-10-18 | cultivation-row-loses-action-after-failure |
| 023 | 2026-10-18 | cultivation-float-actions-dead |
| 017 | 2026-10-12 | record-hygiene-residue |
| 015 | 2026-10-12 | charter-backfill-evidence-date-coupling |
| 012 | 2026-10-11 | same-model-hats-independent-review-overclaim |
| 010 | 2026-10-11 | scheduler-single-point-hitl-freeze |
| 009 | 2026-10-11 | star-topology-no-lateral-channel |
| 007 | 2026-10-09 | collaboration-probe-false-positives |
| 006 | — | ceo-meta-vocab-drift |
| 005 | — | dual-signoff-single-door-routing |
| 001 | — | manual-truncation |

## 有具名守卫

| BUG | opened | 守卫 |
|---|---|---|
| 002 | — | tests/host/workspace/workspace-doors.spec.ts:55；tests/lib/doors.spec.ts:13 |
| 003 | — | tests/tools/deliverables-audit.spec.ts:462 |
| 004 | — | tests/tools/deliverables-audit.spec.ts:546 |
| 008 | 2026-10-10 | tests/tools/deliverables-audit.spec.ts:294 |
| 011 | 2026-10-11 | tests/tools/candidate-scan-assignments.spec.ts:49 |
| 013 | 2026-10-12 | tests/repo/tracked-secrets.spec.ts:22；tests/repo/tracked-token.spec.ts:20 |
| 014 | 2026-10-12 | tests/tools/converge-rules.spec.ts:149 |
| 016 | 2026-10-12 | tests/tools/converge-rules.spec.ts:177 |
| 018 | 2026-10-16 | tests/tools/authorship.spec.ts:19；tests/tools/authorship.spec.ts:29 |
| 019 | 2026-10-16 | tests/tools/deliverables-audit.spec.ts:504 |
| 020 | 2026-10-16 | tests/tools/converge-rules.spec.ts:121 |
| 021 | 2026-10-17 | tests/presets/presets.spec.ts:481 |
| 022 | 2026-10-18 | tests/tools/question-stop.spec.ts:57 |
| 027 | 2026-10-19 | tests/client/tabs/board-panel.spec.ts:77；tests/client/tabs/tasks-table.spec.ts:69；tests/lib/board.spec.ts:76 |
| 028 | 2026-10-19 | tests/tools/deliverables-audit.spec.ts:247；tests/tools/deliverables-audit.spec.ts:275 |
| 030 | 2026-10-20 | tests/session/session-diagnose.spec.ts:16 |
| 033 | 2026-10-27 | tests/host/cultivation/revoke-journal.spec.ts:66 |
| 041 | 2026-11-08 | tests/host/delegation/delegation-control.spec.ts:359 |
| 045 | 2026-11-09 | tests/host/delegation/subagent-retry.spec.ts:113 |
| 046 | 2026-11-09 | tests/host/delegation/delegation-control.spec.ts:391 |
| 047 | 2026-11-09 | tests/host/prompt/handbook.spec.ts:136；tests/presets/delegation-model.spec.ts:67 |
| 049 | 2026-11-09 | tests/presets/delegation-model.spec.ts:111；tests/presets/delegation-retry.spec.ts:13 |
| 051 | 2026-11-09 | tests/presets/delegation-composition.spec.ts:177；tests/presets/delegation-model.spec.ts:74 |
| 052 | 2026-11-09 | tests/evidence/surface-matrix.spec.ts:89；tests/host/delegation/delegation-control.spec.ts:118 |
| 053 | 2026-11-09 | tests/host/delegation/subagent-retry.spec.ts:216 |
| 054 | 2026-11-10 | tests/tools/kb-seeds.spec.ts:53 |
| 055 | 2026-11-10 | tests/presets/presets.spec.ts:270 |
| 056 | 2026-11-10 | tests/tools/quality-loop.spec.ts:379 |
| 057 | 2026-11-10 | tests/host/commands/prd-command.spec.ts:93；tests/host/commands/req-command.spec.ts:144 |
| 058 | 2026-11-10 | tests/host/commands/deliverables-command.spec.ts:50；tests/host/commands/prd-command.spec.ts:84；tests/host/commands/req-command.spec.ts:119 |
| 059 | 2026-11-10 | tests/tools/quality-loop.spec.ts:198 |
| 060 | 2026-11-10 | tests/host/commands/prd-command.spec.ts:115；tests/host/commands/req-command.spec.ts:129 |
| 072 | 2026-11-11 | tests/host/prompt/delegation-contracts.spec.ts:239 |
| 074 | 2026-11-11 | tests/host/index/inject-reentrancy.spec.ts:142 |
| 077 | 2026-11-11 | tests/host/prompt/delegation-contracts.spec.ts:171 |
| 078 | 2026-11-11 | tests/host/delegation/delegation-control.spec.ts:130 |
| 079 | 2026-11-11 | tests/host/delegation/seat.spec.ts:77；tests/host/delegation/seat.spec.ts:84；tests/host/prompt/delegation-contracts.spec.ts:200 |
| 103 | 2026-11-13 | tests/lib/presence-board.spec.ts:305 |
| 114 | 2026-11-13 | tests/host/ledger/governance-export.spec.ts:89 |
| 117 | 2026-11-13 | tests/host/cultivation/cultivation-command.spec.ts:378 |
| 118 | 2026-11-13 | tests/lib/presence-board.spec.ts:338 |
| 119 | 2026-11-13 | tests/host/startup/startup-prompt.spec.ts:186 |
| 121 | 2026-11-13 | tests/host/commands/settings-command.spec.ts:232 |
| 123 | 2026-11-13 | tests/host/startup/startup-store.spec.ts:178 |
| 124 | 2026-11-13 | tests/host/run-bundle/lease.spec.ts:74 |
| 126 | 2026-11-13 | tests/host/delegation/workflow-runs.spec.ts:207 |
| 128 | 2026-11-13 | tests/host/run-bundle/bootstrap.spec.ts:285 |
| 133 | 2026-11-13 | tests/host/commands/settings-command.spec.ts:248 |
| 134 | 2026-11-13 | tests/host/commands/prd-command.spec.ts:201 |
| 138 | 2026-11-13 | tests/host/ledger/catalog.spec.ts:364 |
| 139 | 2026-11-13 | tests/host/cultivation/cultivation-command.spec.ts:407 |
| 143 | 2026-11-13 | tests/host/run-bundle/bootstrap.spec.ts:311 |
| 144 | 2026-11-13 | tests/host/run-bundle/write-gate.spec.ts:55 |
| 145 | 2026-11-13 | tests/lib/presence-board.spec.ts:345 |
| 147 | 2026-11-13 | tests/host/ledger/governance-export.spec.ts:107 |
| 148 | 2026-11-13 | tests/host/run-bundle/bundle-manifest.spec.ts:177 |
| 149 | 2026-11-13 | tests/host/run-bundle/write-gate.spec.ts:73 |
| 152 | 2026-11-13 | tests/lib/markdown-shape.property.spec.ts:128；tests/lib/prd-check.spec.ts:241 |
| 153 | 2026-11-13 | tests/lib/prd-check.spec.ts:253 |
| 156 | 2026-11-13 | tests/host/contract/file-shape-agreement.spec.ts:110 |
| 157 | 2026-11-13 | tests/lib/prd-check.spec.ts:281 |
| 160 | 2026-11-14 | tests/lib/requirements-check.spec.ts:308 |
| 162 | 2026-11-14 | tests/lib/prd-check.spec.ts:298 |
| 164 | 2026-11-14 | tests/lib/prd-check.spec.ts:316 |
| 165 | 2026-11-14 | tests/lib/prd-check.spec.ts:334 |
| 166 | 2026-11-14 | tests/lib/prd-check.spec.ts:344 |
| 168 | 2026-11-14 | tests/lib/prd-check.spec.ts:358 |
| 169 | 2026-11-14 | tests/lib/requirements-check.spec.ts:340 |
| 170 | 2026-11-14 | tests/host/contract/file-shape-agreement.spec.ts:185 |
| 172 | 2026-11-14 | tests/lib/prd-check.spec.ts:376 |
| 173 | 2026-11-14 | tests/lib/prd-check.spec.ts:383 |
| 176 | 2026-11-14 | tests/lib/prd-check.spec.ts:392 |
| 177 | 2026-11-14 | tests/checks/fix-evidence.test.mjs:215 |
| 178 | 2026-11-14 | tests/checks/fix-evidence.test.mjs:194 |
| 181 | 2026-11-14 | tests/checks/fix-evidence.test.mjs:254；tests/host/contract/structure-agreement.spec.ts:34；tests/lib/markdown-shape.property.spec.ts:72 |
| 182 | 2026-11-14 | tests/checks/fix-evidence.test.mjs:236 |
