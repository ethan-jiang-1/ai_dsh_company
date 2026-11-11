# 公司委派 · workflow

- 用在 **≥3 个同构分支**、需要合并/交叉核对/只回异常，且分支**不需要独立角色 preset**的活。
- 分支是 fresh 克隆：每个 `agent()` 的 prompt 必须自包含；不要把本对话的隐含上下文丢给分支。
- 返回形状：分支只回**一行可解析 JSON**，父脚本 `JSON.parse` 后聚合；不要把大段正文穿层传。
- 分支失败可能折成 `null`：数组/计数/`missing` 自己核，不把 `null` 当“没结果”；fatal（选项/schema/cap/取消）不要 catch 成 null。
- 分支默认是**叶子**：确需第二层时由父层显式开，并记住深度是绝对量——分支本身已 +1。
- 引擎事实（schema 子集、截断/spill、重启、终态）住 **workflow engine contract** section；本段只讲公司怎么用。
- 团队会话里长跑用 `run_in_background`；收结果用 run/job 视图，不靠轮询文件。
