# Workflow engine contract（随 DSH pin 更新）

> 这是 workflow 的**引擎事实**（capability-scoped，只注入有 workflow 的 preset）。公司委派政策见 delegation-policy skill；role 方法 skill 只留领域打法。

## schema（输入合同）

- schema 只吃子集：`enum` / `const` 必须同时写单值 `type`；`type` 不接受数组；`oneOf` 不能与 `type` 并列；根必须是 `object`。
- 违反 = 整轮 `UNSUPPORTED_SCHEMA` fatal，不是分支失败；不要吞掉。
- 分支**不传 schema**：让分支只回一行可解析 JSON，父脚本 `JSON.parse`；schema 只留给单次 `agent()`，并在 prompt 里明确调用 `structured_output`。
- schema 分支拿不到 structured output 时，引擎会丢掉 child 已写好的文本并只给 `null`；这是已知引擎语义，不要把 `null` 当“没结果”。

## 结果（输出通道）

- `maxResultChars` 处截断，截断发生在 spill 之前；spill 文件可能是截断副本。
- 大结果优先让分支写文件，父只拿 path/行数/摘要；不要靠内联长文本跨层传递。
- `completed` 不保证每个分支成功；失败分支可能折成 `null`，看数组/计数，不看分支自述。
- 子代自述的“是否截断/长度”不可信；父用 read/tail 自己核。

## 失败与重试

- `null` 可能是 refusal / error / aborted / 缺结构化结果，原因不保留；先判任务幂等且可重试。
- `AGENT_START` / `AGENT_RESULT` / 取消是 fatal，不许 catch 后伪装成 null 或安全重试。
- 同一幂等 task 最多再派一次（attempt label 不同）；仍失败记 `missing` / `exhausted`，不启动第三次。
- 非幂等写操作不自动重试；必须可重试/可聚合的活走 workflow，而不是 subagent。

## 生命周期

- 宿主重启会中断 in-flight child；child 记 interrupted，父收不到终态通知。
- 重启后用 `list_subagents`（child 终态）或 `workflow_runs`（run 四态 + children）对账；`lost` = 原结果不可恢复。
- 别把“job 起了”当“结果可恢复”；要当前事实就冷恢复/重派。

## 嵌套

- 分支是 `startActivation(parent)` 的子代：深度 = parent+1；没有 `agentPreset`，继承父组合。
- 分支默认是叶子；确需两层时由父层显式开，并受**行级 maxDepth**/预算约束。
- workflow 引擎没有独立的 depth 闸，但分支本身是 activation 子代，深度按 parent+1 计；嵌套 run 会叠加，父层负责预算。
