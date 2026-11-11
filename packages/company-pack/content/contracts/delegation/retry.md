# 公司委派 · retry（`subagent_retry`）

- 只用于**短、幂等、重试敏感**的委派：同步等 child 终态，失败可重试时最多再派一次。
- 不重试 `refusal` / `aborted` / `completed` / `max-tokens`；非幂等写操作不自动重试（先对账）。
- 子代深度**不另立预算**：上限 = 本 preset 通用 `subagent` 行的 `maxDepth`；到底部返回 `depth-exceeded` 且不起 child——retry 不是深度后门。
- 长/批量/必须可聚合的活走 workflow，不用 retry。
- 取消 parent turn 会中断 child 并返回 `aborted`，不要悬挂等待。
- 终态词表以工具 description 为准；不要自造新的失败类。
