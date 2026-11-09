---
status: 已修
severity: P1
opened: 2026-11-09
---

# BUG-045：`subagent_retry` 的默认 `maxDepth: 3` 绕过 CMO 等 preset 的行级深度预算

> 严重级别：P1（重要）｜发现：2026-11-09｜状态：已修（2026-11-09：修复就绪 → 修复已落地 → 已修）
> 来源：2026-11-09 委派面重构后第四轮探索（R1b，CMO depth 2 → retry depth 3）。
> 审查：agent — 对照「已修判定」逐条核过；真红→绿与长链放行见「修复落地」，未跑真模型（keyless 机制档）。

## 症状

一个 `depth=2` 的 CMO 命名 child 调用 `subagent_retry`，工具成功起了一个 `depth=3` 的 worker：

- CMO 会话 header：`delegationDepth: 2`、`agentPreset: cmo`
- `subagent_retry` 返回：`attempts: 1`、`childIds: ["469460a9-…"]`、`stopReason: "completed"`、`exhausted: false`
- worker 会话 header：`delegationDepth: 3`、`agentPreset: worker`、`parentSession: 706f6950-…`（CMO）

但 CMO preset 自己的 `tool-subagent` 行是 `maxDepth: 2`，模型/文档也把 depth 2 当作 CMO 这一层的上限。
同一层用普通 `subagent` 会被行级 `maxDepth: 2` 拒绝，换 `subagent_retry` 就绕过去了——深度预算变成
“看用哪条工具”，而不是模型/组合声明的那个数。

## 根因（假设）

`subagent_retry` 在 host 侧按 preset 注册时，没有把“调用者自己的深度预算”带进去：
`registerSubagentRetry(ctx, { allowedPresets: ['vp-eng','vp-sales','coo','cfo','cmo'] })`
使用默认 `maxDepth: 3`、默认 `agentPreset: 'worker'`，然后直接把 `maxDepth: 3` 传给
`startActivation`。`allowedPresets` 只决定“谁能看到工具”，不决定“这个 preset 最多能起多深”。
而 `packages/company-pack/presets/cmo/agent.cordis.yml` 的普通 `subagent` 行是 `maxDepth: 2`
（vp-sales/coo/cfo 同款）。工具与行级预算各说各话。

同类风险：`subagent_retry` 的注册列表与默认深度不在
[`tools/lib/delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 的模型里；模型是“唯一期望源”，
但这条能力面目前只在 host 代码里硬编码，静态 spec 无法发现注册面/深度漂移。

## 暴露的失败类

**“能力/深度预算按通道分裂”**：同一 agent 的普通 spawn 行和 retry 原语使用不同深度上限；模型或
组合声明的预算被一条新工具绕过，且没有诊断。横切范围：所有 per-agent 注册、会自行
`startActivation` 的 host 工具（当前是 `subagent_retry`）；以及任何未来“补丁式” spawn 工具。
验证面应同时断言：调用者 preset 的 `depthRows`、工具实际传入的 `maxDepth`、child header 的
`delegationDepth`。

## 复现

1. CEO 根会话用 `vp_eng` 命名 child 起一个 VP-Eng（depth 1）。
2. 让该 VP-Eng 用 `vp_cmo` 命名 child 起一个 CMO（depth 2）。
3. 让该 CMO 调用 `subagent_retry`，`idempotent: true`，brief 只让 worker 回复 `retry-depth-ok`。
4. 观察：CMO header `delegationDepth: 2`；`subagent_retry` 成功返回
   `attempts: 1 / childIds: [469460a9-…] / stopReason: completed`；worker header
   `delegationDepth: 3`、`agentPreset: worker`。

关键会话（本地 durable 日志，gitignored）：

- CEO：`session-e39259e4-1151-4d47-9ee6-bd9265bc5d1c`
- VP-Eng：`7aad0d5e-337a-4e58-9394-0265c3b3cfa7`（header depth 1 / vp-eng）
- CMO：`706f6950-3cbb-4ce9-9c08-663cdb52f1c9`（header depth 2 / cmo）
- worker：`469460a9-5f4b-46ee-be05-051efac6804d`（header depth 3 / worker）

证据摘要：`runtime/tmp/explore/round4/r4-2026-11-09T09-43-57-731Z/r1b-cmo-depth-bypass.json`
（gitignored；含 tool args/result 与 header）。

## 修复关联

- host 工具：[`packages/company-pack/src/host/delegation/subagent-retry.ts`](../../../packages/company-pack/src/host/delegation/subagent-retry.ts)
  的 `DEFAULT_MAX_DEPTH = 3` 与 `registerSubagentRetry` 的默认值。
- 注册面：[`packages/company-pack/src/index.ts`](../../../packages/company-pack/src/index.ts) 的
  `registerSubagentRetry(ctx, { allowedPresets: [...] })`。
- 组合声明：CMO / vp-sales / coo / cfo 的 `tool-subagent` 行 `maxDepth: 2`；
  [`tools/lib/delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 的 `COMPOSITIONS.*.depthRows`。
- 测试：[`tests/host/delegation/subagent-retry.spec.ts`](../../../tests/host/delegation/subagent-retry.spec.ts)
  目前只在 `allowedPresets: ['vp-eng']` 下断言 `maxDepth: 3`，没有按 preset 覆盖深度预算。

候选修法（待定，不在本卡直接改）：按调用者 preset 解析允许深度（如从模型 `depthRows.subagent`
读取，或给 `subagent_retry` 增加 per-preset `maxDepth` 选项）；无法解析时保守取调用者普通
`subagent` 行的预算；越界时返回可见拒绝而不是起 child。模型/组合 spec 同时声明 retry 的深度面。

## 已修判定

- CMO（或 vp-sales/coo/cfo）在 `depth=2` 调用 `subagent_retry` 时，child 不得在 `depth=3` 起来；
  应返回明确拒绝/诊断，或按该 preset 的行级预算上限拒绝。
- vp-eng 长链 `CEO→VP(1)→workflow(2)→worker(3)` 仍放行；`vp-eng` 根 `subagent_retry` 的短任务仍可用。
- keyless spec 按 preset 断言 `maxDepth`/`depthRows` 与 child header；红形态 = 把 CMO 的 retry 深度
  改回 3 时对应断言红；还原后绿。
- `delegation-model.mjs` 至少声明 retry 的注册面与深度策略，或由 spec 从 host 注册面反查；
  不再出现“模型不知道这条能力面”的空白。

## 修复落地（2026-11-09）

- **host**：[`subagent-retry.ts`](../../../packages/company-pack/src/host/delegation/subagent-retry.ts)
  删掉 `DEFAULT_MAX_DEPTH` / `DEFAULT_PRESETS`；注册面与逐 preset 深度只读
  `SUBAGENT_RETRY_SURFACE`（= 各 preset 通用 `subagent` 行的 `maxDepth`，模型 `retrySurface()` 同源）。
- **越界可见拒绝**：执行前按 `max(header.delegationDepth, options.subagentDepth) + 1` 与调用者预算比较
  （与 vendor `delegationDepthOf` 同口径）；越界返回 `attempts: 0` / `childIds: []` /
  `stopReason: depth-exceeded` / `exhausted: true` + 点名 preset/预算的 `diagnostic`，**不调**
  `startActivation`；预算内把同一预算作为 `maxDepth` 传给引擎（第二道闸）。
- **长链仍放行**：vp-eng 在 depth 2 调用 retry，child = depth 3 ≤ 预算 3（spec 用例）。
- **文档**：`docs/delegation.md` §4、`docs/presets.md` 工具面、delegation-policy skill §7 同步。
- **真红→绿**：`SUBAGENT_RETRY_SURFACE.presets.cmo` 2→3 ⇒ host spec **2 failed**
  （CMO depth 2 起了 child、subagentDepth 取大失效）；还原 ⇒ 两文件 **22 passed**。
- **全量**：`pnpm verify`、`pnpm test`（166 files / **1331 tests**）、`pnpm typecheck` 全绿（同提交）。
- 决定与输掉的方案 = [single-source Note](../../../notes/implemented/2026-11-09-delegation-surface-single-source.md)。
