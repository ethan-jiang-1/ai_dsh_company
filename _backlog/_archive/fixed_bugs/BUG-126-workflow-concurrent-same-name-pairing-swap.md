---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-126：同名并发 background workflow 的 run↔call 配对会互换 jobId（r1 拿 c2，r2 拿 c1）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（FIFO 配对）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C2 / workflow 生命周期）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`workflowRunRows` 的新配对（BUG-097 修复）对每个 `run-start` 取「最近的前置同名 call」，且已用过的 call 不再分配。但两个 **同名 background workflow** 都先发出 call、后到 run-start 时：

```
call c1 (seq1)  call c2 (seq2)  start r1 (seq3)  start r2 (seq4)
result c2=jobB (seq5)  result c1=jobA (seq6)
```

输出：

```json
[
 {"runId":"r1","jobId":"jobB","background":true,"status":"lost"},
 {"runId":"r2","jobId":"jobA","background":true,"status":"lost"}
]
```

r1 本应对应先发出的 c1/jobA，r2 对应 c2/jobB；现在互换。`usedCalls` 只防重复，不按 start 顺序逐一分配；第一个 start 选了「最近的前置 call」c2，第二个 start 拿 c1。

后果：`workflow_runs` 的 jobId/background/children 归错 run；`send_to_subagent`/诊断会指向另一个 run 的 job；若 job 仍 live，`jobKnown` 可能把状态显示成 running 的错行。

## 根因（假设）

- `for (const start of starts)` 对每个 start 独立取 `preceding.at(-1)`；没有「按 start 顺序取最早未用前置 call」或「结果 job 证据与 run-start 对应」。
- 同名并发 background 是 vendor 允许的；start/résult 没有 callId，启发式在「多个 call 都早于多个 start」时退化。
- 失败 call 修复（BUG-097）优先最近前置，进一步偏向后发 call。

## 暴露的失败类

**启发式配对只解决单 run 的前置失败 call**：多 run 并发时，「最近前置」不是「这个 start 的 call」。写模型（失败 run、job 诊断）需要一对一分配与结果证据，而不是贪心最近。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-workflow-concurrent.mts
```

2026-11-13 输出：

```
[{"runId":"r1","jobId":"jobB","status":"lost","background":true},
 {"runId":"r2","jobId":"jobA","status":"lost","background":true}]
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 按 `starts` 顺序分配 call：优先取「最早未用的前置 call」（FIFO），而不是最近；或用结果文本的 job/run 名与 start 的先后/时间配对。
- 若证据不足，宁可 jobId 留空 + status lost，也不把两个 run 的 job 互换；给 `ambiguous` 诊断。
- 加 spec：两个同名 background call+start 顺序、结果乱序、失败前置 call、单 run 回归；jobKnown 状态。

## 修复关联

- 发现于 BUG-097（workflow 配对）修复后的并发回归；与 [BUG-097](BUG-097-workflow-runs-mispair-failed-call.md) 同面但不同根因（前置失败 vs 多 run 分配）。
- 相关：`src/host/delegation/workflow-runs.ts` 的 `workflowRunRows`。

## 已修判定

修成：同名并发按 start 顺序取**最早未用**的前置 call（FIFO），失败前置 call 仍由证据规则排除；r1→c1/jobA、r2→c2/jobB。
- keyless：c1,c2,start r1,r2,result c2,c1 → 行配对不互换；红证：改回 `.at(-1)` → 1 failed。
