# 公司委派 · spawn（`subagent` / 命名委托）

- 用在 **1–2 件独立任务**，或需要一个**真角色 preset**（`vp_eng` / `vp_cmo` 等命名行）的场合。
- spawn 的 child 是 **fresh**：它看不到本对话。prompt 必须自包含——目标、输出形状、可用工具/来源坐标、边界（不做什么/失败怎么回）。
- child 的组合由工具行的 `agentPreset` 钉；通用 `subagent` 省略 preset 会继承**你这一代组合**，不是“更窄的 worker”。需要窄面就钉薄 preset（默认 `worker`；需要子层用 `worker-orchestrator`）。
- **要这个角色的判断，走命名行**（如 `vp_cmo`）；通用 `subagent` 是执行手，不是角色替身。
- 终稿走**完成通知**；不要 `bash sleep` 轮询文件等它，也不要用 `wait_agent` 等 spawn child（`wait_agent` 只等 team 成员）。派发后可以继续别的活；没有别的活就**结束本轮**，通知会开新轮。
- 改稿优先 `send_to_subagent` 续同一个 child（带上一稿）；新 activation 是新上下文，不是续写。
