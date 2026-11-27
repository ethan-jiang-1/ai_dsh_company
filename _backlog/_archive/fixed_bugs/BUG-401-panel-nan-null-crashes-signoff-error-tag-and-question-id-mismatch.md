---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-401：异常投影/指标下客户端崩溃或渲染 `NaN`、双签工具失败卡误标「待拍板」及问询/错误环状态丢失

> 严重级别：P1（渲染期崩溃与状态错乱：`TasksTableView` 遇到缺失 `members` 投影直接抛 TypeError 崩盘；`BudgetPanel` 遇到 `NaN` 渲染 `'NaN tokens'`；`SignoffToolView` 把工具执行失败错标为「待拍板」；`pendingQuestions` 因 `data.id !== callId` 漏消重；`error-ring` 乱序卸载与同步送信异常丢条目）｜发现：2026-11-27｜状态：已修（`dfbaed24`）｜审查：独立只读盲审通过（0 阻断）；去向 = [批次Note](../../../notes/implemented/2026-11-27-ux-ui-round3-batch-fixes.md)

## 症状

1. **部分 `agentTeam` 投影下 `TasksTableView` 崩溃 & `BudgetPanel` `NaN` 渲染**（Phase 1 `Q3-A` 实证复现）：
   - [TasksTableView](../../../packages/company-pack/src/client/tabs/TasksPanel.tsx#L69) 直接执行 `view.members.map(...)`，未对运行时部分/损坏投影中的缺省 `members` 做 `Array.isArray` 兜底，遇到 `{ tasks: [] }` 形状直接抛错渲染崩溃；
   - [BudgetPanel](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L393-L397) 传入 `totalTokens: Number.NaN` 时直接传进 `useCountUp` 并渲染出 **`NaN tokens`**；另外 `useCountUp` 在 `target` 快速连续更新时，cleanup 把 `fromRef.current = target`（终值而非当前插值）引起数字动画在中途回跳。
2. **`SignoffToolView` 失败或中断无决策 JSON 时仍显「待拍板」**（Phase 1 `Q6` 实证复现）：
   - [SignoffToolView](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L98-L102) 只检查 `decisionMeta !== undefined`；当工具调用以 `isError: true` 或 `interrupted` 收尾且 `content` 为非决策错误原文（如 `'Tool execution failed'`）时，`data-state` 为 `'error'`，但头徽标落入 fallback 分支仍渲染 **`待拍板`**（`signoff.pendingTag`）。
3. **`pendingQuestions` 与 `user-questions/answered` 跨事件 `id` 不一致导致已答问询永挂待办**（Phase 1 `Q5` 实证复现）：
   - [pendingQuestions](../../../packages/company-pack/src/lib/presence/attention.ts#L456-L457) 构造挂起问询时用 `tool/call` 的 `data.callId` 作键，但仅在收到同 `callId` 的 `tool/result` 或 `data.id === callId` 的 `user-questions/answered` 时删除；若 `user-questions/answered` 仅携带问询自身 `data.id` 且无 `tool/result`，该问询永远无法从待办清单消去。
4. **`error-ring` 乱序卸载与 `createErrorRelay` 丢队列**（Phase 1 `Q4-A` 实证复现）：
   - [installErrorCapture](../../../packages/company-pack/src/client/wiring/error-ring.ts#L219-L232) 返回的清理函数无条件执行 `global[ERROR_RING_KEY] = previous`；若依次安装 `d1`、`d2` 后先释放 `d1`，仍在运行的 `d2` 全局错误环句柄被清空为 `undefined`；
   - [createErrorRelay](../../../packages/company-pack/src/client/wiring/error-ring.ts#L296-L306) 在调用 `options.send(sessionId, entry)` 前已将条目从队列 `queue.shift()` 弹出；当 `send()` 同步抛错或离线失败时，条目被弹出丢失（`relay.pending() === 0`）而无法重传。

## 运行面

- **面 = client / lib**：
  - [TasksPanel.tsx](../../../packages/company-pack/src/client/tabs/TasksPanel.tsx#L69)、[company-panels.tsx](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L346-L378,L393-L397)；
  - [signoff-card.tsx](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L98-L102)；
  - [attention.ts](../../../packages/company-pack/src/lib/presence/attention.ts#L455-L458)；
  - [error-ring.ts](../../../packages/company-pack/src/client/wiring/error-ring.ts#L219-L232,L296-L307)。

## 复现

```sh
npx vitest run --config runtime/tmp/ux-audit-r3/vitest.tmp.config.ts
```

- `Q3-A`：`TasksTableView` 传入 `{ tasks: [] }` 直接抛错；`BudgetPanel` 传入 `Number.NaN` 输出 `'NaN tokens'`；
- `Q6`：`SignoffToolView` 传入 `{ kind: 'result', isError: true, content: [{ type: 'text', text: 'Tool execution failed' }] }` 时 `data-state="error"` 且正文包含 `'待拍板'`；
- `Q5`：流内只有 `tool/call(callId='call-1')` 与 `user-questions/answered(id='q-instance-99')` 时，`pendingQuestions` 返回长度仍为 `1`；
- `Q4-A`：乱序 `d1()` 后 `target[ERROR_RING_KEY]` 变为 `undefined`；`send()` 抛错后 `relay.pending()` 变为 `0`。

## 根因与证据

1. 展示组件假定 wire / 上游投影总是完整有限值，缺少 `Number.isFinite` 与 `Array.isArray` 降级保护；
2. `SignoffToolView` 只按可解析决策标签 vs 「待拍板」二分，忽略了非决策的 `error`/`stopped` 终态；
3. `pendingQuestions`、`installErrorCapture` 与 `createErrorRelay` 对事件关联键、LIFO 清理和队列确认提交时机缺乏防错设计。

## 失败类与同类排查

- **失败类**：展示层缺少非正常 wire 输入与终态错误分支防线，基础设施清理/重传假设理想调用序列。

## 修复证据

- 改动面：`packages/company-pack/src/client/tabs/TasksPanel.tsx`、`packages/company-pack/src/client/tabs/company-panels.tsx`、`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/ux/signoff-card.tsx`、`packages/company-pack/src/lib/presence/attention.ts`、`packages/company-pack/src/client/wiring/error-ring.ts`。
- 红：`pnpm test tests/client/tabs/tasks-table.spec.ts` 在缺省 `members` 下抛 TypeError；`pnpm test tests/client/tabs/company-panels.spec.ts` 在 `NaN` 下渲染 `NaN tokens`；`pnpm test tests/client/ux/signoff-card.spec.ts` 在失败终态下显示 `待拍板`；`pnpm test tests/client/wiring/attention.spec.ts`、`pnpm test tests/client/wiring/error-ring.spec.ts`、`pnpm test tests/client/wiring/error-relay.spec.ts` 复现已答问询未销、乱序卸载清零及发送抛错丢队列。
- 绿：`pnpm test tests/client/tabs/tasks-table.spec.ts`、`pnpm test tests/client/tabs/company-panels.spec.ts`、`pnpm test tests/client/ux/signoff-card.spec.ts`、`pnpm test tests/client/wiring/attention.spec.ts`、`pnpm test tests/client/wiring/error-ring.spec.ts` 与 `pnpm test tests/client/wiring/error-relay.spec.ts`（7 份 spec 100/100 绿），`pnpm typecheck`、`pnpm lint`、`pnpm dup` 零错误零违例。
- 提交：commit dfbaed24
