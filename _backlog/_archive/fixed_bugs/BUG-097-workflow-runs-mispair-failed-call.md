---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-097：`workflow_runs` 把「失败在 run-start 之前」的同名调用配给下一次 run，丢掉 jobId/背景态并把真 run 报成 lost

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C2 / workflow durable view）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`workflowRunRows` 只按「`tool/call` 的 `meta.name` + 顺序」把调用与 `tool-workflow/run-start` 配对，不看这次调用是否真的启动了 run。若第一次 workflow 调用**在 run-start 之前失败**（脚本/参数校验错误），第二次同名调用成功：

```
call(0,c1,audit,background)            ← 第一次，失败
result(1,c1,"Error: Workflow script failed validation")
call(2,c2,audit,background)            ← 第二次，成功
run-start(3,r2,audit)
result(4,c2,backgroundText("audit","workflow-real"))
```

`workflowRunRows(..., jobKnown)` 实测：

```
[ { runId: 'r2', name: 'audit', background: true, status: 'lost', children: [] } ]
```

- 没有 `jobId: workflow-real`；
- `jobKnown('workflow-real') === true` 时仍是 `lost`（应 `running`）；
- 真 run r2 被归到失败的 c1 名下，c2 的结果完全没参与。

## 根因（假设）

`workflowRunRows`（`src/host/delegation/workflow-runs.ts`）先把所有 `meta.name` 相同的 call 收进 `calls`，再对每个 call 取 `candidates.find(candidate => !used && candidate.seq > call.seq) ?? candidates.find(!used)`；它没有用调用结果区分「这次调用是否启动了 run」，也没有用 `run-start` 与 call 的时间窗之外的信息。第一次失败调用因此拿走了第二次的 start；`results.get(call.callId)` 取的是 c1 的错误文本，`jobId` 解析为空，状态只能 `lost`。

## 暴露的失败类

**配对启发式只用了名字和顺序，没有用「调用是否产生 run」的证据**：`run-start` 是独立事件、不带 callId；用「下一个同名 start」近似，遇到失败调用/重试就会错配。同类：任何把两个没有共同 id 的事件流按名字+顺序配对的地方，都要先排除「这次调用没有产生目标事件」的情况。

## 复现

```sh
node --import tsx/esm runtime/tmp/c2-workflow-mispair.mts
```

2026-11-13 原始输出（节选）：

```
jobKnown true: [ { runId: 'r2', name: 'audit', background: true, status: 'lost', children: [] } ]
jobKnown false: [ ... same ... ]
```

期望：`{ runId:'r2', background:true, jobId:'workflow-real', status:'running'|'lost' }`，且 c1 的失败不应占用 r2。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 配对时只看「结果文本表明启动/完成/后台 job」的调用（call result 里出现 workflow 的 started/completed 文案，或 `jobId` 可解析），没有结果的 call 先不占 start；或把 call 与 start 按「同一 turn/step」更紧的窗口配对（事件里有 turn/step 字段）。
- 若无法可靠配对，保留 run-start 行 + `jobId` 从 run-start/结果文本找，不把失败 call 的 job 当成 run 的 job；绝不能因为一个失败调用把真 run 标成 lost。
- 加 keyless spec：失败 call → 成功同名 call 的序列；两个失败 call；失败 call + 无 start；失败 call + 后台 start；jobKnown 的 running 态。

## 修复关联

- 发现于 C2；与 `workflow_runs` 的 durable 契约（`src/host/delegation/workflow-runs.ts` 头注）相关。
- 既有 spec = `tests/host/delegation/workflow-runs.spec.ts` 的「pairs repeated run names in order」；本卡是它没覆盖的「调用未产生 run」分支。

## 已修判定

修成：workflow call→run 配对改为「按 run-start 找最近的前置调用」，只接受结果在 start 之后、或结果文本是 workflow 启动/完成文案的调用；失败在 run-start 之前的同名调用不再占用下一次 run，jobId/background/running 归真 run。

- keyless：失败 c1 + 成功 c2 + r2 的序列 → 唯一行 `{runId:r2, jobId:'workflow-real', status:'running'}`；只有失败调用 → 零行。
- 红证：HEAD 版配对 → 1 failed；复原 9 passed。
