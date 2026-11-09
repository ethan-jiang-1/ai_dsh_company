# 2026-11-09 · 父代理可核对 child 的引擎身份：`list_subagents` 暴露 preset / 委派深度

状态：implemented（2026-11-09 交付；上游 = [BUG-046](../../_backlog/_archive/fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md)）

## 问题

`list_subagents` 的行只有 `id/label/mode/status/role/address/lastTurnEnd`——全是父会话
`subagent/catalog` 与 child 最后一个 `turn/end` 的投影。child 的 durable header 明明写了
`agentPreset: worker`、`delegationDepth: 3`，模型工具面却拿不到。后果：

- 父代理请求 `agent_preset: worker` 或某个深度后，无法独立核对引擎是否真的照做；只能信 child 自述
  或让人类读日志/UI。
- [BUG-045](../../_backlog/_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md) 那种
  深度预算绕过，父代理在工具面**看不见**（child 起来了、深度是多少，只能猜）。

这是**模型可见面比引擎 durable 语义窄**，不是数据缺失：同一份 durable 日志已经在同一次
`sessionPersistence.open(id, 'read')` 里被读来算终态。

## 决定

1. `readChildTurnState` 在同一次 open/read 里顺带返回 `handle.header` 的
   `agentPreset` / `delegationDepth`（`ChildTurnState` 的可选字段）；不新增第二次 IO、不新增工具。
2. `SubagentRow` 增加两个**必填**字段：
   - `agentPreset: string`——preset id，或 `unavailable`；
   - `delegationDepth: string`——十进制字符串（例 `"3"`），或 `unavailable`；
   - `identityDetail?: string`——`unavailable` 时的短原因（与 `lastTurnEndDetail` 同一次失败）。
3. **读不到不伪造**：行初始化即 `unavailable`，header 到了才覆盖；绝不默认成 `worker` 或 `0`。
   `delegationDepth: 0` 是根会话的真实值，照实返回（不是 unavailable）。
4. 输出 schema 与 description 同步；description 明确“这是引擎实际生效的身份，用来核对，不要信 child 自述”。

## 输掉的方案

- **新增 `subagent_info` 工具**：每个 child 一次调用、多一份输出面；`list` 与 `info` 的字段会漂移。
  在同一行补字段更便宜，也符合“一处事实一个家”。
- **只让 child 自报 preset/depth**：自述不可信；BUG-045 的前提正是“父代理无法分辨 child 声称的身份”。
- **把客户端 `delegation-tree` 的投影塞进模型**：那是 client/host 投影、依赖浏览器侧数据；
  模型工具要的是 durable header 这条 root 可读事实。
- **`delegationDepth` 用 number + `boolean` 标志**：输出 schema 子集不支持 `number | 'unavailable'` 的
  union（`type` 只能是单值）；拆成两个字段又多一处可漂移的事实。字符串 `unavailable` 与
  `lastTurnEnd` 的既有降级形状一致。
- **读不到时省略字段**：模型会把“缺字段”读成“没有这个能力”；卡明确要求显式 `unavailable`。

## 后果

- 父代理可核对 `agent_preset` / 深度；D1 这类长链不必再写“只能信自述”。
- 与 BUG-045 的拒绝语义互补：越界的 retry 返回 `depth-exceeded`；正常起来的 child 用
  `list_subagents` 的行核对 depth。
- 行变宽（每行 +2 字段）；`unavailable` 时多一个 `identityDetail`。teammate 行同样适用（header 有它的
  preset/depth）。
- 未覆盖：真实装配下的 UI/DagTab 是否显示这两个字段（本卡只改模型工具面；UI 已有自己的投影）。

## 验证

```sh
pnpm exec vitest run tests/host/delegation/delegation-control.spec.ts
# 绿：20 tests passed（含 header 来源、缺 header → unavailable、depth 0 是真值、读失败 → identityDetail）
```

**红形态**：把 `readChildTurnState` 的 header 读取临时改成 `undefined`（模拟只读终态、不读身份）⇒
**3 failed**：`readChildTurnState ... returns header identity`（`expected {...} to deeply equal {...}`）、
`list_subagents exposes the engine-applied preset/depth ...（BUG-046）`、`depth 0 is a real value ...`。
还原后 **20 passed**。

全量 `pnpm verify` / `pnpm test` / `pnpm typecheck` 在同提交收口阶段跑；`vendor/dsh` 零改动。

**真模型/真装配回归（2026-11-09 晚）**：profile 指向当前源码后，`list_subagents` 真行带
`agentPreset`/`delegationDepth`：worker-orchestrator/`"1"`、worker/`"1"`、teammate `vp-eng`/`"1"`、
workflow 分支 `vp-eng`/`"1"`，与 child durable header 一致；证据见
[研究材料 §9.6](../../_backlog/research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md)。
