# 公司委派 · team（Agent Teams）

- 只有 **Team Lead** 能 `spawn_teammate`。root 会话是 Lead；命名 child / workflow 分支不是；teammate 看得到工具但只有 Lead 能执行。
- 成员**继承 Lead 的组合**，没有 per-member preset。给每个成员一份**角色包**：角色名、任务书路径、CHARTER、角色 skill、KB、产出路径、边界；角色靠任务书/文件软覆盖，不靠成员名冒充。
- 上下文默认 `fresh`（不带 Lead 历史）；要带 Lead **已完成轮**才显式 `context: 'fork'`。当前轮的任务书不在 fork 种子里——仍按路径/正文传给成员。
- 任务板：`team_task_create` 写 owner、`blockedBy`、`writeScopes`；`ready` 只表示依赖完成，**不会自动派工**——Lead 要自己 `send_message`/分派。
- 寻址：成员按**名字** `send_message`；`wait_agent` 只在另一个必需**团队成员** running/provisioning 时用，醒来/超时后重新 `list_agents`。它**不**等 spawn child；普通 subagent 的终稿走完成通知。
- `writeScopes` 是告警不是锁：一个文件一个写者；Lead 收口时看最终 diff。
- 团队会话里全局 `send_message`/`list_agents` 是团队版，够不到非名册 subagent child；那些用 `list_subagents` / `send_to_subagent`。
