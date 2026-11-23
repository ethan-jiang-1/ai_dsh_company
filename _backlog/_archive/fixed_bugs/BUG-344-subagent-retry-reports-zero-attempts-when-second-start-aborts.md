---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-344：`subagent_retry` 第 2 次尝试在 `startActivation` 阶段被中止时仍硬编码返回 `attempts: 0`

> 严重级别：P2（工具输出自相矛盾：第 1 次子代已启动并执行结束且 `childIds` 已有 1 个 id，第 2 次重试在 `startActivation` 被取消却上报 `attempts: 0`，误导模型认为从未起过子代）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（第 1 次取消返 `0`、第 2 次启动取消返 `1`）
>
> **留痕**：commit 4a6f464e（内部重试计数修正，非材料性）。

## 症状

调用 `subagent_retry`（`idempotent: true`）时，若第 1 次尝试启动了子代 `child-1` 并以可重试失败（如 `error`）返回，循环进入第 2 次尝试（`attempt = 2`）；当第 2 次 `subagents.startActivation(...)` 尚未返回时 `exec.signal` abort，[`subagent-retry.ts:217-226`](../../../packages/company-pack/src/host/delegation/subagent-retry.ts#L217-L226) 直接返回：

```json
{
  "attempts": 0,
  "childIds": ["child-1"],
  "stopReason": "aborted",
  "exhausted": false,
  "output": "",
  "diagnostic": "parent turn cancelled while starting child。"
}
```

`attempts: 0` 与 `childIds: ["child-1"]`（以及工具描述里「Returns attempts/childIds/stopReason/exhausted」）直接矛盾。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/delegation/subagent-retry.ts`](../../../packages/company-pack/src/host/delegation/subagent-retry.ts#L196-L250)。

## 复现

模拟 `subagents.startActivation` 第 1 次返回 `childId: 'child-1', stopReason: 'error'`、第 2 次在 pending 期间触发 `controller.abort(...)`，执行 `subagent_retry.execute(...)`，实测返回值 `childIds: ['child-1']`、`stopReason: 'aborted'`、`attempts: 0`。

## 根因与证据

1. `subagent-retry.ts:201` 在循环顶部自增 `attempt += 1`（第 2 轮此时 `attempt === 2`），而 `childIds` 中仅有第 1 轮已启动的子代（`childIds.length === 1`）。
2. 第 217-226 行假设 `startActivation` 只会发生在第 1 次，把 `attempts` 硬编码写死为 `0`（而第 240 行在 `activation.result` 的 catch 分支里用的是 `attempts: attempt`）。

## 失败类与同类排查

- **失败类**：重试循环早退分支硬编码第 1 次假定。
- **同类排查**：同文件第 171 行（循环前已 abort）与第 186 行（超深预算拒绝）`childIds` 均为空，`attempts: 0` 准确；第 240 行已使用 `attempt`。此外第 227-228 行若第 2 次 `startActivation` 非 abort 抛错，`break` 后第 257 行按 `attempt` 返回 `2` 但只启动过 1 个 `childId`，修复时一并明确口径（已启动子代数 vs 已发起尝试数，避免 `attempts` 与 `output` 混代）。

## 修复方案与范围

- **根因修法**：在 `startActivation` abort catch 分支（`subagent-retry.ts:219`）用已实际启动完成的子代次数 `attempts: childIds.length`（第 1 轮未起成时为 `0`，第 2 轮起前被取消时为 `1`），同步审视非 abort `startActivation` 失败时的 `attempts` 口径。

## 已修判定

- 第 1 次启动被取消时 `attempts: 0`、`childIds: []`；第 1 次失败、第 2 次在 `startActivation` 被取消时 `attempts: 1`、`childIds: ['child-1']`，并在 `tests/host/delegation/subagent-retry.spec.ts` 补齐该分支用例。

## 修复证据

- 改动面：`packages/company-pack/src/host/delegation/subagent-retry.ts`、`tests/host/delegation/subagent-retry.spec.ts`
- 红：`pnpm test tests/host/delegation/subagent-retry.spec.ts` —— 修复前 1 failed / 15 passed（第 2 次 `startActivation` 被取消时 `attempts` 为 `0` 且 `childIds` 为 `['child-1']`）
- 绿：`pnpm test tests/host/delegation/subagent-retry.spec.ts` —— 16/16 passed（第 1 次取消 `attempts: 0`、第 2 次取消 `attempts: 1`）
- 提交：commit 4a6f464e
