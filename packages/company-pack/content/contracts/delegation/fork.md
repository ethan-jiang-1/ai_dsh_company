# 公司委派 · fork（`subagent_fork`）

- `subagent_fork` 克隆本会话到**最后一个 `turn/end`** 的前缀；**当前轮不在种子里**。
- 用在“接着这段已完成的对话往下做/复核”的活；新独立任务用 spawn，不要用 fork 假装省事。
- fork 继承你当前的 preset 组合，**不能钉别的 preset**；要独立角色仍走命名 spawn。
- 种子只在创建时捕获一次；之后父会话的新轮不会自动进入 child。新指令写进 prompt，或后续用 `send_to_subagent` 续。
- child 仍是 fresh 工具面/权限按自己的组合捕获；fork 带历史不等于带权限。
