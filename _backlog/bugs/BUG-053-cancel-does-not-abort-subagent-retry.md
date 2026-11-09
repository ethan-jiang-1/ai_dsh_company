---
status: 修复就绪
severity: P1
opened: 2026-11-09
---

# BUG-053：取消 parent turn 不能中止 `subagent_retry` 的阻塞 child——root/child 都没有 `turn/end`

> 严重级别：P1（重要）｜发现：2026-11-09｜状态：修复就绪
> 来源：2026-11-09 第七轮（W7-A 取消探针）。关联：[subagent_retry 原语](../../packages/company-pack/src/host/delegation/subagent-retry.ts)、
> [旧 R8 workflow 取消 PASS](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。
> 授权：2026-11-10 用户指令「_backlog/bugs 里面还有3个bug，如法炮制……按照我们这个repo的来修复吧……
> 系统性……而不是一个一个修」——P1 且触碰 company-pack 公开行为（阻塞工具契约）与 docs 合同，
> 由用户明确指示授权。
> 修法（2026-11-10 选定）：抽 `src/lib/abortable.ts`（promise 与 `AbortSignal` race + 监听清理）；
> `subagent_retry` 等 `activation.result` 时响应 `exec.signal`；abort 时
> `ctx.subagents.interrupt(childId, { kind: 'ancestor', agent })` 并返回 `stopReason: 'aborted'`；
> keyless + 真装配 `sleep 117` + `session/cancel` 复跑。

## 症状

VP-Eng root `session-fc94c2fb-e3ef-471f-a701-f699565dc535` 用 `subagent_retry` 起了一个长任务
child `eb0e4c26-5af7-4ab1-a925-72201a72a4cb`（depth 1 / worker），brief 只执行
`bash sleep 117; echo done`。child 已调用 bash：

```text
call bash {"command": "sleep 117; echo done", "timeoutMs": 180000}
```

随后对 root 调 `session/cancel`，返回 `{"accepted":true}`。但 30/45/90 秒后：

- root 日志**没有** `turn/end`；`subagent_retry` 的 tool result 没有出现；
- child 日志**没有** `turn/end`，也**没有** bash 的 tool result；
- `sleep 117` 进程仍在（PIDs `28887` / `28888`，90 秒时仍活；更晚才自然结束）；
- child 没有 `aborted(parent)`，root 没有 `aborted(user)`。

也就是说：`session/cancel` 被接受，但取消没有收敛到阻塞工具/child；parent 轮和 child 轮都停在“无终态”，
child 的 bash 继续占用资源直到自然结束。旧 R8 证明 workflow 取消能收敛；`subagent_retry` 这条新原语没有。

## 根因（假设）

`subagent_retry` 在 `execute` 里 `await activation.result`；`startActivation` 收了 `exec.signal`，但取消
parent turn 后：

- `activation.result` 可能既不 reject 也不 resolve（child 被 abort 但没有 result），`execute` 悬住；
- 工具没有把 `exec.signal` 的 abort 与 `activation.result` 做 `Promise.race`，也没有主动取消 child；
- `timeoutMs: 300_000` 只会在 5 分钟后触发，不能替代取消收敛。

结果：root turn 等一个永远不返回的工具；child turn 被中断但没有 durable `turn/end`；bash 子进程继续跑。

## 暴露的失败类

**“阻塞 host 原语没有取消语义”**：`subagent_retry` 是同步等待 child 的工具，取消只到 root Agent
的 turn 层，没有传播到 tool/child；这与旧 R8 的 workflow 取消（run/agents 收敛）不同。横切范围：
所有 `await` 子代 result 的 host 工具；`subagent_retry` 是当前唯一一个。

## 复现

1. VP-Eng root；prompt 用 `subagent_retry` 跑 `bash sleep 117` 的 worker（brief 只做这一条）。
2. 等 child catalog 出现、child 已发 `tool/call bash`。
3. 对 root 调 `session/cancel`。
4. 观察：root/child 无 `turn/end`；child bash 继续；sleep 进程仍在；没有 `aborted` 终态。

关键会话（本地 durable 日志，gitignored）：

- root：`session-fc94c2fb-e3ef-471f-a701-f699565dc535`
- child：`eb0e4c26-5af7-4ab1-a925-72201a72a4cb`
- trial：`runtime/rehearsal-workspace/exp/round4/r4-2026-11-09T15-37-37-427Z/wave7-cancel-retry`
- 证据摘要：`runtime/tmp/explore/round4/r4-2026-11-09T15-37-37-427Z/wave7-cancel-retry.json`
  （`rootEnd` / `childEnd` = undefined；child calls 只有 bash、result undefined）。

## 修复关联

- [`subagent-retry.ts`](../../packages/company-pack/src/host/delegation/subagent-retry.ts)：`activation.result` 的等待需要与 `exec.signal` 取消做 race；abort 时主动取消 child（官方 `ctx.subagents`/activation cancel 面），返回可见 `stopReason: aborted`，并确保 child durable `turn/end`。
- 或把 `subagent_retry` 改成非阻塞/队列式（父 turn 不被工具 hold）；但那会改变工具契约，需另决。
- 测试：keyless 注入一个永不 resolve 的 activation result + abort signal，断言 `execute` 在 abort 后返回且不悬挂；真装配探针复现 `sleep 117` + cancel，断言 root/child 都有 `turn/end aborted` 且无残留进程。
- 与旧 R8 的 workflow 取消对照：workflow 已收敛；本条是 host 原语自己的缺口，不要拿 workflow 的绿当本条证据。

## 已修判定

- `session/cancel` 后 root turn 在短时限内 `turn/end aborted(user)`；child `turn/end aborted(parent)`；
  `subagent_retry` 返回可见 `aborted`（或等价结果），不悬挂到 300s timeout。
- child 的 `bash sleep` 进程被中止，无残留；`list_subagents` / durable 日志看到 child 的 aborted 终态。
- keyless spec 覆盖 abort race + 永不 resolve 的 activation；真装配探针 `sleep 117` + cancel 复跑通过。
- 重复取消/取消后再 prompt 不产生孤儿；长任务仍建议走 workflow，但误用 retry 时不能把 host 卡死。
