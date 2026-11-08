---
status: 修复就绪
severity: P1
opened: 2026-11-08
---

# BUG-041：宿主重启后 in-flight child 成孤儿——child 记 interrupted，父收不到终态也查不到

> 严重级别：P1（重要）｜发现：2026-11-08｜状态：修复就绪

## 症状

RS1 探针：vp-eng 根会话用 `subagent` 起了一个 worker（先 `sleep 60` 再读版本），根在 ack 后结束
本轮；随后在 worker 还在跑时 SIGTERM 杀掉 company web，再用同一 `DSH_HOME` 重启：

- 父会话是 durable 的（29 events / 1 turn），但重启后**没有新 turn、没有完成通知**，终稿仍是那句 ack；
- child 会话也是 durable 的：`turn/end reason = {"kind":"interrupted"}`，final text 停在
  “I'll run the sleep first, then read the file.”；
- 父会话再被问「worker 结果回来了吗」时：`list_agents` 只回 `lead`（团队版，见 BUG-037）、
  `job_list` 为空；父代理明确说“**没有接口主动查询它的进度/是否还活着**，我不知道它在跑还是已经
  跑完但消息没到”，只能提议自己读文件。

即：进程退出把 in-flight child 变成 **父侧不可见的孤儿**；父会话永远等不到终态，也没有
“已中断”的记录可读。

## 根因（假设）

local subagent 是进程内 agent；宿主进程死亡时 child 的 turn 被记为 `interrupted`，但**没有向父会话
补一条终态/notice**（`subagent/end` 只在活着的 runtime 内发）。父侧 durable 记录只有
`subagent/catalog`（身份，无终态）；root 的 `list_agents` / `send_message` 又是团队版（BUG-037），
所以既发现不了也够不到 child。恢复路径不存在。

## 暴露的失败类

- durability：宿主重启/崩溃会让 in-flight delegation 静默丢失；父会话看起来“还在等”，实际永远不会到。
- 观测缺口：child 的 durable session 有 `interrupted`，但模型没有工具能按 child id 读它；
  `session_event_search` 也不是可靠替代。
- 与 BUG-037 叠加：root 的团队版控制名把最后的查询/续驶路径也遮掉了。

## 复现

1. `node runtime/tmp/explore/resume.mjs`（或手工：起 company web → vp-eng 会话 → prompt 让 worker
   `sleep 60` 后读文件 → 等父 turn/end → SIGTERM web → 同 home 重启）。
2. 重启后读父会话：无新 turn/notice；读 child：`turn/end interrupted`。
3. 再 prompt 父「worker 结果回来了吗」：`list_agents` 只 lead、`job_list` 空、父说无法查询。
4. 证据：`runtime/tmp/explore/ex3/RS1/observed.md`；父 `session-24da0c1b-ebb6-4170-a529-307c44afc31e`；
   child `48eb730a-640b-4b3d-8112-e13553b3b736`。

## 发现路径（探索方向）

“durability / 宿主重启”charter（RS1）：不是取消，而是**在 child 还在跑时直接杀宿主再重启**。
**探索方向提示**：长跑委派的验收不应只看“活着时的通知”，还要看“宿主死过一次之后父会话是否知道
发生了什么”；durable 记录 = 父会话 + child 会话两边都读。

## 修复关联

- 已在 `eng-teaming` 长跑条目加：宿主重启会中断 in-flight child（child 记 interrupted、父收不到终态、
  root 也查不到）；部署/重启前先收口，别跨重启等通知。
- vendor 未改；可选上游：resume 时对父侧 `subagent/catalog` 里没有终态的 child 做对账，补一条
  `subagent/end`（interrupted）或让 `list_agents` 能列/查询 durable child。

## 已修判定

- 宿主重启后，父会话能收到（或能主动查询到）每个 in-flight child 的终态（至少 `interrupted`）；
  且本仓有对应的 keyless/探针守卫或明确的部署前置（先收口再重启）。
