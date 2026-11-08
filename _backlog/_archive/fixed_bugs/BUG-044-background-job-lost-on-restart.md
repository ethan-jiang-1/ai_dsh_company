---
status: 已修
severity: P2
opened: 2026-11-08
---

# BUG-044：后台 workflow job 不跨宿主重启——job_list 空、job_output unknown，结果/通知丢失

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：已修｜审查：agent — durable 视图 `workflow_runs` 在真实 C7b 会话日志上返回 `lost` + jobId + 4 children；keyless 6 条；C7b 探针里模型未实际调用该工具（行为观察，不影响能力）

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

- **修法（2026-11-08 已落树）**：新增 host 工具 **`workflow_runs`**——只读父会话自己的
  `tool-workflow/run-start|agent-start|run-end` 与 `tool/call`/`tool/result`（后台回执里的 jobId），
  输出每 run：`{runId, name, background, jobId?, status, children[]}`。
  `status`：有 `run-end` → completed/cancelled/error；无 run-end + job 注册表认识 → running；
  否则 **`lost`**（明确标注已丢失）。`children` 列出 childId，可 `send_to_subagent` 冷恢复当前事实
  （不恢复原 job 结果——卡里写死的边界）。
- **keyless 测试资产**：`tests/company/workflow-runs.spec.ts` 6 条——background+无 run-end+job 未知 →
  lost（含 children）；job 已知 → running；completed/cancelled；同名 run 按序配对；孤儿 run-start →
  lost；工具注册 + 读 `ownEvents` + 无 jobs 服务按 unknown。host-composition/apply-lifecycle 注册面 6 tools。
- **模型面**：`eng-teaming` 长跑条改成“重启后用 `workflow_runs` 查 completed/cancelled/lost + children”。
- **真实数据复验（2026-11-09，离线、keyless）**：取 C7b 干净 home 的**真实父会话 durables**
  （`runtime/harness-home-clean/sessions/--…-C7b--/session-739f555c-…/session.v4.jsonl.zstd`），
  `workflowRunRows(events, () => false)` 输出：
  `{runId:"49f34559-…", name:"read-module-versions", background:true, jobId:"workflow-a9daec30…",
  status:"lost", children:[m02,m04,m03,m01]}`——与卡的症状逐项对上（job 表空、child 在、无 run-end）。
  C7b 探针里模型先走 `bash` 翻日志、**没有实际调用 `workflow_runs`**；这是模型选择，不是能力缺口
  （工具结果由真实日志离线验证）。
- **上游**（不再阻塞本仓）：job registry durable 化，或 resume 时把 owned job 的 child 终态补成 notice。

4. 恢复实验：`node runtime/tmp/explore/recover7.mjs`（或同 session 直接 prompt）；证据
   `runtime/tmp/explore/ex4/C7/recover.json`；4 个 child 均 continuable、冷恢复后重读文件。
5. 模型诚实区分了“当前盘面真值（六次读一致）”与“原 job 是否跑成功（无法证明）”。

## 已修判定

- 宿主重启后，后台 job 至少能被查询到终态（completed/cancelled/interrupted）或明确标注“已丢失”；
  且父代理不需要靠重读源文件才能判断该 job 发生了什么。手动 `send_to_subagent` 唤 child 只能是
  补充证据，不算恢复 job 结果。
