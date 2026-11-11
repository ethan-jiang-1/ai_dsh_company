# 公司委派 · team spawn（仅 Team Lead）

- 只有 **Team Lead** 能 `spawn_teammate`。root 会话是 Lead；命名 child / workflow 分支不是；teammate 看得到工具但只有 Lead 能执行。
- 成员**继承 Lead 的组合**，没有 per-member preset。给每个成员一份**角色包**：角色名、任务书路径、CHARTER、角色 skill、KB、产出路径、边界；角色靠任务书/文件软覆盖，不靠成员名冒充。
- 上下文默认 `fresh`（不带 Lead 历史）；要带 Lead **已完成轮**才显式 `context: 'fork'`。当前轮的任务书不在 fork 种子里——仍按路径/正文传给成员。
- `spawn_teammate` 后记下 target；任务板写 owner、`blockedBy`、`writeScopes`；`ready` 不会自动派工——Lead 自己 `send_message`/分派。
- 成员不能冒充角色；角色的结论只能由该角色的命名 child 出。
