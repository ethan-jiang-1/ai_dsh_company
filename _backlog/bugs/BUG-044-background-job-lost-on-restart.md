---
status: 调查中
severity: P2
opened: 2026-11-08
---

# BUG-044：后台 workflow job 不跨宿主重启——job_list 空、job_output unknown，结果/通知丢失

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：调查中

## 症状

C7 实测：vp-eng root 用 `run_in_background: true` 起 4 分支 workflow（每支 `sleep 30` 后读 version），
拿到回执 `workflow-ab90d593406541ae` 后父 turn 结束；宿主 SIGTERM → 同 home 重启 → 问父“job 和结果呢”：

- `job_list` → `(no background jobs)`；
- `job_output { job_id: "workflow-ab90d…" }` → `Error: unknown job workflow-ab90d593406541ae`；
- 没有完成通知；
- `list_subagents` → 4 个 workflow child 仍在（`mode: continuable`，`status: inactive`），但**没有
  `lastTurnEnd`**（BUG-042），也**不携带产出**；
- 父只能自己读文件拿地面真值，或逐个 `send_to_subagent` 唤醒 child 让它重述（那是新回合，不是原 job 结果）。

**恢复实验（C7R）**：重启后父对 4 个 child 逐个 `send_to_subagent`——4 个都冷恢复并回话（会话确实
durable），但它们的原始 `sleep 30; cat` 输出**一条都没有**（各自报 “tool call was interrupted … no result
durably recorded”），只能**重读文件**给出当前值。`job_list` 仍空、`job_output` 仍 `unknown job`。
所以“叫醒 child”能恢复**当前事实**，不能恢复**原 job 的结果/成功证据**。

## 根因（假设）

job 登记表是进程内 owned-job registry，随宿主进程消失；resume 时没有 durable 对账（job 记录/完成通知
都没有落成可恢复状态）。child 会话本身是 durable 的，所以 `list_subagents` 还能看到 4 个 child，但
父侧没有“这个 job 的返回值/终态”的可读面。

## 暴露的失败类

- 后台委派不跨重启：长跑用 `run_in_background` 的收益（不阻塞 turn）在重启后变成“结果与通知全丢”。
- 与 BUG-041/042 叠加：child 可查但无终态；job 不可查；模型只能手动补。
- 模型自述的风险：`inactive` 不等于失败/完成，看不到产出；靠重读文件得到的地面真值不能证明分支跑过。

## 复现

1. `node runtime/tmp/explore/jobrestart.mjs`（后台 W → 杀宿主 → 同 home 重启 → 问 job）。
2. 读 `job_list` / `job_output` / `list_subagents` 的 tool result：空 / unknown / 4 个 continuable inactive。
3. 证据：`runtime/tmp/explore/ex4/C7/transcript.json`；父 `session-dcb4ff32-…`；children
   `99b7819b-…` / `585275a9-…` / `590a7a2d-…` / `8f7b45ef-…`。

## 发现路径（探索方向）

“后台 job × 宿主重启”charter（C7）：不是只看 `run_in_background` 能不能起，而是看**重启后 job 的
记录/结果/通知还在不在**。**探索方向提示**：把 job 当一种“父可区分状态”来验；同时对照 child 的
continuable/inactive——它们是两条不同的持久化路径。

## 修复关联

- 已在 `eng-teaming` 长跑条目加“后台 job 不跨重启（job_list 空、job_output unknown）；child 会话仍在，
  可 `list_subagents`/`send_to_subagent` 手动补”。
- vendor 未改；候选上游：job registry durable 化，或 resume 时把 owned job 的 child 终态补成 notice；
  本仓可选：部署前置（重启前 drain）+ 文档写死“后台结果跨重启不可恢复”。

4. 恢复实验：`node runtime/tmp/explore/recover7.mjs`（或同 session 直接 prompt）；证据
   `runtime/tmp/explore/ex4/C7/recover.json`；4 个 child 均 continuable、冷恢复后重读文件。
5. 模型诚实区分了“当前盘面真值（六次读一致）”与“原 job 是否跑成功（无法证明）”。

## 已修判定

- 宿主重启后，后台 job 至少能被查询到终态（completed/cancelled/interrupted）或明确标注“已丢失”；
  且父代理不需要靠重读源文件才能判断该 job 发生了什么。手动 `send_to_subagent` 唤 child 只能是
  补充证据，不算恢复 job 结果。
