# 2026-11-11 · 委派政策能力域化：capability header + channel sections + per-agent workflow_runs

状态：implemented（2026-11-11；上游 = 委派政策能力域化卡；行为面改动 + 真挂载/单场 pilot 证据）
上游 = [委派政策能力域化](../../_backlog/_archive/settled_issues/2026-11-11-delegation-policy-capability-scoped.md)

> 现行语义（canonical）= 文末链接；本 Note 只留决定/理由/证据，不复制现行表。

## 决定

1. **通道能力表进 pack**：`src/lib/delegation-capabilities.ts` 逐 preset 声明 spawn/fork/workflow/retry；`tests/presets/delegation-capabilities.spec.ts` 钉它 == `tools/lib/delegation-model.mjs` 的 `COMPOSITIONS[*].channels/workflow` + `retrySurface()`。team 不进表——它是运行时座位，任何 root 都是 Lead。
2. **host 按能力/权限注入**：`src/host/prompt/delegation-contracts.ts` 在 `agent/created` 时注入 `company:delegation-capabilities` header + `company:delegation-<channel>` section（spawn/fork/workflow/team/retry）。spawn 用能力表；fork/workflow 用工具在场；team 用 `agentTeams.membership(agent)?.role === 'lead'`（fallback `header.parentSession`），**不能**只用 `tools.get('spawn_teammate')`（teammate 也看得见工具）。
3. **内容拆家**：新增 `content/contracts/delegation/{spawn,fork,workflow,team,retry}.md`；`delegation-policy` skill 缩成 core（默认自己做/brief/effort/链/结果/硬规则，1,454 code points）；`eng-teaming` 的 schema/截断/spill/重启等引擎事实移回 `company:workflow-contract`/section，只留五档判据/角色边界/交稿。
4. **`workflow_runs` per-agent**：只在工具面有 `workflow` 的 Agent 注册（vp-eng root、vp-eng 命名 child、vp-eng teammate、workflow 分支）；CEO/COO/worker 不再看见。host 全局工具面从 4 件降为 3 件。
5. **no-poll 写进 header**：派发 child 后不要 `bash sleep`/轮询文件，也不要用 `wait_agent` 等 spawn child（只等 team 成员）；没有别的活就结束本轮，完成通知会开新轮。
6. **support root 的 team 段**：worker/quality-loop 作为 root 也是 Lead，会拿到 team section；section 明说“你在 Lead 座位不等于你的角色该组队，leaf/support 按 persona 保持 leaf”。support preset 是否该出现在 root 选择器是产品/UX 决定，另卡。

## 输掉的方案

- **A' 只给 workflow/team/retry 做 section，spawn/fork 留共享 skill**：常驻成本更低，但 G1 的 spawn/fork 半边仍在；A 的 pilot 没退化，所以不做。
- **B 按 preset 生成 policy skill**：生成物多、仍可能不被加载，且不解决引擎事实分层。
- **C 共享 skill + 一行能力头**：只解决“模型不知道通道”，skill 里仍有无用通道/引擎事实，G5 仍在。
- **team 按工具在场注入**：命名 child/teammate 的工具面也有 `spawn_teammate`，会把 team 段塞给非 Lead；红证见验证节。
- **保留全局 `workflow_runs`，只改 description**：CEO/COO/worker 仍然看见一个永远空的工具；能力域即作用域。
- **把引擎事实也搬进 section**：会和 `workflow.md` 造第二份；section 只留决策判据。

## 后果

- CEO 的 header = spawn/team；COO = spawn/fork/team/retry；vp-eng = 五段全；worker root = team only；命名 child vp-eng = spawn/fork/workflow/retry（无 team）；teammate = spawn only（无 team，团队工具仍在但工具描述说只有 Lead 能执行）。
- `workflow_runs` 的工具面从全局收成 vp-eng 系；`host-composition` 全局注册面按 3 件更新。
- CMO 没有 workflow 段；≥3 同构任务用 4 个 `subagent` 并在派发后结束本轮（不再 `wait_agent`/post-dispatch 轮询），把 `bash` 轮询从 16 次降到派发前 8 次。
- `eng-teaming` 从 4,737 降到 2,892 code points；引擎事实只剩一个家。

## 验证（实跑）

**红→绿（注入/作用域）**

- **team 权限红**：把 `delegation-contracts.ts` 的 `const lead = isTeamLead(agent) && hasTool(...)` 改成 `hasTool(...)` → `tests/host/prompt/delegation-contracts.spec.ts` **1 failed / 6 passed**（命名 child/teammate 被误塞 team 段）；还原 → **7 passed**。
- **workflow_runs 作用域红**：把 `workflow-runs.ts` 的 `if (!hasWorkflowTool(scope) || tools === undefined) return` 改成 `if (tools === undefined) return` → `tests/host/delegation/workflow-runs.spec.ts` **1 failed / 6 passed**（无 workflow 的 scope 也注册）；还原 → **7 passed**。

**真挂载（`request/header.tools` + `system/message`）**

- CEO `session-7050fe52-da8a-43c2-91bf-9286c2a866d3`：header spawn/team；无 fork/workflow/retry section；`workflow_runs` false。
- COO `session-8ee75d3e-8744-4a11-9874-0c75a1cfefcc`：header spawn/fork/team/retry；无 workflow section；`workflow_runs` false。
- vp-eng `session-cdd264ff-07f8-4a8a-92b2-41728cab8c50`：五段全；`workflow_runs` true。
- worker `session-5a584bd6-0315-4c01-83cb-be97191e2377`：team only；`workflow_runs` false。
- 命名 child vp-eng `034fd4c7-1d5d-4b53-9ca2-3d13d426ab7d`：header spawn/fork/workflow/retry；无 team；`workflow_runs` true。
- teammate CEO `ba1f1e99-47db-487c-860c-57057c3a94e5`：header spawn only；无 team section；`workflow_runs` false；工具面仍有 `spawn_teammate`（Lead-only 执行）。

**行为 pilot（单场，不证稳定）**

- CMO 4 细分市场（新 header）：`session-6d673cb8-14ac-4466-b39e-af94a40aa72d`，4 个 `subagent`、0 个 `workflow`、派发后 `write` 收口并结束本轮；无 `wait_agent`、无派发后轮询。对照：加 no-poll 前 `session-b0fbf114-afef-4cdc-9b05-a1006de1d708` 有 16 次 bash + `wait_agent`，未结束。
- COO 4 份合同：`session-6c5851ed-ed54-41a2-ad6f-173edac8463a`，自己做、0 `workflow`、0 `subagent`；与 B1 基线一致。
- VP-Eng `vp-eng-workflow-probe`：**ALL PASS（N≥3 同构取证用 workflow）**。
- CEO 两件套 `product-team-e2e-smoke`：**ALL PASS（295s；members=[cmo,vp-eng]、tasks=2、PRD blockedBy MRD）**——team 组队判据未被能力域化改坏。

**门禁**

- `pnpm test` → **196 files / 1571 tests passed**；`pnpm typecheck` 绿；`pnpm lint` 0 warnings/errors；`pnpm dup` 0 clones；`pnpm verify` ALL PASS；`source run/env.sh && node checks/smoke/preset-smoke.mjs` → **ALL PASS（6 角色 + 5 非角色）**；`product-team-e2e-smoke` → **ALL PASS（295s）**。

## 现行语义（canonical）

- [delegation 合同](../../docs/contracts/delegation.md) · [presets 工具面/政策载体](../../docs/contracts/presets.md) · [architecture](../../docs/architecture.md)
- host：[delegation-contracts.ts](../../packages/company-pack/src/host/prompt/delegation-contracts.ts)、[delegation-capabilities.ts](../../packages/company-pack/src/lib/delegation-capabilities.ts)、[workflow-runs.ts](../../packages/company-pack/src/host/delegation/workflow-runs.ts)
- content：[delegation sections](../../packages/company-pack/content/contracts/delegation/) · core：[delegation-policy](../../packages/company-pack/presets/_shared/delegation/skills/delegation-policy/SKILL.md)

## 相关

- 上游卡：[2026-11-11 委派政策能力域化](../../_backlog/_archive/settled_issues/2026-11-11-delegation-policy-capability-scoped.md)
- 前置 Note：[委派合同事实纠偏](./2026-11-11-delegation-contract-truth.md)
- 研究题：[dsh-native-orchestration-fit](../../_backlog/research/dsh-native-orchestration-fit/README.md)
