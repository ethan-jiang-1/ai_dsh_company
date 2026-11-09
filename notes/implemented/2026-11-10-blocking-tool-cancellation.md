# 2026-11-10 · 阻塞 host 原语的取消收敛：`subagent_retry` 响应 parent turn 取消

状态：implemented（2026-11-10 交付；上游 = [BUG-053](../../_backlog/_archive/fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md)）
> 相关：[retry 声明面/深度单源](./2026-11-09-delegation-surface-single-source.md)（同一原语的上一条约束）。

## 问题

`subagent_retry` 在 `execute` 里 `await activation.result`，只把 `exec.signal` 传给
`startActivation`，没有与 `activation.result` race，也没有中断 child。取消 parent turn 后：

- `session/cancel` 返回 `accepted: true`，但 root turn 没有 `turn/end`，工具 result 不出现；
- child 没有 `turn/end`，bash 的 `sleep 117` 继续跑（90s 时进程仍在）；
- 只有 300s 的 `timeoutMs` 兜底，取消不收敛。

失败类：**阻塞 host 原语没有取消语义**。它和 workflow 的取消不同：workflow 的 run/agents 已证明能收敛；
`subagent_retry` 是同步等待 child 的 host 工具，取消只到 Agent 的 turn 层，没有传播到 tool/child。

## 决定

1. **抽出可取消 await 的缝**：[`abortable.ts`](../../packages/company-pack/src/lib/abortable.ts) 把
   `operation` 与 `signal` race，abort 即抛 `signal.reason`（非 Error 包成 `<label> aborted`），
   `finally` 摘监听。语义对齐 vendor `agent-loop` 的 `raceAbort`；任何未来 `await` 子代结果的
   host 工具都走它，不各自手写 race。
2. **`subagent_retry` 两处接上**：`startActivation` 与 `activation.result` 都经 `abortable`；
   `exec.signal` 已 abort 时**不启动 child**，直接返回 `attempts: 0 / stopReason: 'aborted'`。
3. **abort 时中断 child**：`await` 被取消后调
   `ctx.subagents.interrupt(childId, { kind: 'ancestor', agent: exec.agent })`（官方 fire-and-return
   API；ancestor 授权要求精确 live 父 Agent），然后返回 `attempts: <已尝试>/childIds: [...]/
   stopReason: 'aborted' / exhausted: false` + 诊断。中断失败（child 已结束/服务缺席）也只吞掉
   中断错误，不把“取消”变成工具错误。
4. **不改成非阻塞**：`subagent_retry` 的同步等待是它的契约（短任务补丁）；取消收敛是必须补的
   生命周期语义，不是重新设计工具。长/批量仍用 workflow。

## 输掉的方案

- **只靠 `timeoutMs: 300_000`**：取消后最多再挂 5 分钟，child 的 bash 继续烧资源；用户已经
  看到 `accepted: true`，却要等超时才收口——不可接受。
- **改成队列/非阻塞（立即返回 childId）**：会改工具契约（父代理拿不到 attempts/stopReason，
  也失去“短任务同步拿结果”的确定性），且与既有 retry 分类/可见性设计冲突；另立 RFC 才能做。
- **abort 时 `activation.dispose()`**：会杀掉 activation/child 的可恢复性；我们只需要中止当前
  turn，child 的 durable 会话应保留（可 `list_subagents` 查 aborted、可续驶/审计）。
- **只 race、不 interrupt child**：parent turn 能结束，但 child 还在跑 bash，资源与终态问题仍在。
- **手写 race 不摘监听**：每次 retry 在 signal 上挂一个监听，长会话泄漏；用 `abortable` 的
  `finally` 统一清理。

## 后果

- 取消 parent turn 后：root `turn/end aborted(user)`、child `turn/end aborted(parent)`、
  `subagent_retry` 的工具结果被引擎标成 `Error: tool call aborted`（引擎的取消拥有该 call 的
  结果；等价于可见 aborted，不再是悬挂）；child 的 bash 被中止，无残留进程。
- 工具自身在信号未 abort 的正常路径上行为不变（completed/error/refusal/非幂等/深度拒绝）。
- 未来任何阻塞 host 工具（`await` 子代/长操作）必须用 `abortable` + 明确的 child 中断；
  这是 `src/lib` 的新公共缝。

## 验证

**keyless（红→绿）**：

```sh
pnpm exec vitest run tests/lib/abortable.spec.ts tests/host/delegation/subagent-retry.spec.ts
# 绿：4 + 15 passed
```

- `abortable`：透传值、永不 resolve + abort 立即 reject、已 abort 直接 reject、两种路径都摘监听。
- retry abort 用例：`neverResolve` 的 activation + 1000ms 守卫；把
  `abortable(activation.result, exec.signal)` 改回裸 `await activation.result` ⇒ 用例 **hung**（红）；
  还原 ⇒ 15 passed；`interrupt` 以 `child-1` / `{kind:'ancestor'}` 被调用。
- 已 abort 的 signal：不启动 child、`attempts: 0`。

**真装配（`wave8-cancel-retry`，gitignored）**：

- VP root `session-d6c8161b-…`；child `31dbd01f-…`（depth 1 / worker）已发
  `bash -c 'sleep 117; echo done'`；`session/cancel` 返回 `accepted: true`。
- **35ms** 后：root `turn/end {"kind":"aborted","reason":{"kind":"user"}}`；
  child `turn/end {"kind":"aborted","reason":{"kind":"parent"}}`；
  retry tool result = `Error: tool call aborted`；`pgrep -fl 'sleep 117'` 为空。
- 与旧 W7-A 对照：旧轮 30/45/90s 都无终态、sleep 仍在；本轮 35ms 收敛、无残留。
