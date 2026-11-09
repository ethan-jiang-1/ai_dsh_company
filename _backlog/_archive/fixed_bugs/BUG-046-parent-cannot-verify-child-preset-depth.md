---
status: 已修
severity: P2
opened: 2026-11-09
---

# BUG-046：父代理看不到 child 的 `agentPreset` / `delegationDepth`，worker family 与深度只能信自述

> 严重级别：P2（次要）｜发现：2026-11-09｜状态：已修（2026-11-09：修复就绪 → 修复已落地 → 已修）
> 来源：2026-11-09 委派面重构后第四轮探索（D1 长链；R1b 深度）。
> 审查：agent — 对照「已修判定」逐条核过；真红→绿见「修复落地」，未跑真模型（keyless 工具面）。

## 症状

父代理通过 `subagent` / `workflow` 起子代后，模型可见的 child 行没有 `agentPreset`，也没有
`delegationDepth`：

```json
{
  "id": "e3ea1acf-…",
  "label": "read-version-b",
  "mode": "continuable",
  "status": "inactive",
  "role": "subagent",
  "address": "e3ea1acf-…",
  "lastTurnEnd": "completed"
}
```

`subagent` 的 activation 回执也只有 `started subagent <id>`。于是父代理无法核对它请求的
`agent_preset: worker` 是否真的生效，也无法核对 `depth=3` 是否被引擎放行/拒绝。

D1 里 CEO 的最终报告原话：

> “引擎的 subagent descriptor 只落 version/mode/provider/label/agentProvider/agentModel/
> agentReasoningEffort，**没有 preset 字段** ⇒ ‘worker’ 只有分支自述单源，独立核对 = `unavailable`。”
> “`list_agents(descendants)` 报的 depth=2 是相对 VP-Eng 根会话计的，不是层级缩水。”

而磁盘上的 child header 明明有 `agentPreset: worker`、`delegationDepth: 3`——数据存在，只是
模型工具面拿不到。父代理只能信 child 自述，或让人类去看日志/UI。

## 根因（假设）

`packages/company-pack/src/host/delegation/delegation-control.ts` 的 `SubagentRow` / `subagentRows`
只投影父会话 durable catalog（`subagent/catalog`）和最后一个 `turn/end`，没有读 child header；
`subagent/catalog` 本身也不带 preset/depth。UI 侧 `delegation-tree` 能从 session 元数据折出
preset/depth，但那是 client/host 投影，不是模型工具。模型可见面因此比引擎语义窄。

## 暴露的失败类

**“身份/预算不可观测”**：父代理请求 worker profile 或深度后，没有独立于 child 自述的核对面。
后果：worker 配错（full role clone）、深度预算被绕过（见
[BUG-045](BUG-045-subagent-retry-depth-budget-bypass.md)）、或 child 声称“我是 worker”时，父代理无法
分辨。它同时削弱了本轮的 H1/H6/H8：验收只能靠人类读 header 或 UI，不能靠模型自己的工具闭环。

## 复现

1. 按 D1 的任务形状起 `CEO → vp_eng(1) → workflow(2) → worker(3)`。
2. 在 VP-Eng 或分支里调用 `list_subagents`；观察行只有 id/label/mode/status/role/address/lastTurnEnd。
3. 读 child 的 durable header：`agentPreset` 与 `delegationDepth` 存在且正确；模型工具面没有。
4. 父代理在最终报告里只能写“preset 不可独立核对 / 只能信自述”。

关键会话（本地 durable 日志，gitignored）：

- CEO：`session-18cd2615-6e39-4dcc-8a62-cc593d013762`
- VP-Eng：`160b42a4-5a5e-4fb2-b693-2702be900270`（header depth 1 / vp-eng）
- 分支：`00396f0e-…` / `de5273c6-…` / `24de5452-…`（depth 2 / vp-eng）
- worker：`5a43f26c-…` / `e3ea1acf-…` / `a49c80d4-…`（depth 3 / worker）

证据摘要：`runtime/tmp/explore/round4/r4-2026-11-09T09-37-34-306Z/d1-long-chain.json`
（gitignored；含 `list_subagents` 结果与 child header）。

## 修复关联

- [`delegation-control.ts`](../../../packages/company-pack/src/host/delegation/delegation-control.ts)：
  `SubagentRow`、`subagentRows`、`list_subagents` 的 output schema/描述。
- 可用的 durable 读面：`sessionPersistence.open(childId, 'read')` 已在该文件用于 `lastTurnEnd`；
  header 的 `agentPreset`/`delegationDepth` 是同一份 durable 日志的元数据，理论上可读。
- 客户端/UI 已有 `delegation-tree` 的 preset/depth 折法；本卡不要求把 UI 数据塞进模型，只要求
  模型工具有一条可核对的身份/深度面。
- 测试：`tests/host/delegation/delegation-control.spec.ts` 目前按行字段断言；需加 header 来源的
  `agentPreset`/`delegationDepth`，并覆盖 `unavailable` 降级。

候选修法（待定，不在本卡直接改）：给 `SubagentRow` 增加 `agentPreset`/`delegationDepth`（读 child
header；读不到时 `unavailable`），或提供等价的只读 `subagent_info`。不要把“缺失”默认成
`worker` 或某个 depth。

## 已修判定

- `list_subagents`（或等价的模型工具）对每个 child 返回可核对的 `agentPreset` 与
  `delegationDepth`；读不到时明确 `unavailable`，不伪造。
- D1 形状下父代理能独立核对 `worker` 与 `depth=3`，不再写“只能信自述”。
- keyless spec 覆盖 header 来源与 `unavailable` 降级；红形态 = 故意不返回 preset/depth 时断言红。
- 与 [BUG-045](BUG-045-subagent-retry-depth-budget-bypass.md) 一起看：深度/身份绕过必须能被父代理
  在工具面观察到。

## 修复落地（2026-11-09）

- **同一次 durable 读带回身份**：[`delegation-control.ts`](../../../packages/company-pack/src/host/delegation/delegation-control.ts)
  的 `readChildTurnState` 在 `open()` 后顺带取 `handle.header` 的 `agentPreset` / `delegationDepth`；
  `ChildTurnState` 增可选字段，不新增第二次 IO、不新增工具。
- **行字段**：`SubagentRow` 增必填 `agentPreset: string` / `delegationDepth: string`（十进制字符串）
  与 `identityDetail?`；初始值 `unavailable`，header 到了才覆盖——不默认 worker/0；`depth: 0` 是真值。
- **模型面**：输出 schema + description 同步（“引擎实际生效的身份，用来核对，不要信 child 自述”）。
- **真红→绿**：把 header 读取临时改成 `undefined` ⇒ **3 failed**（`readChildTurnState ... header identity`、
  `list_subagents exposes ...（BUG-046）`、`depth 0 is a real value`）；还原 ⇒ **20 passed**。
- **全量**：`pnpm verify`、`pnpm test`、`pnpm typecheck` 全绿（同提交）。
- 决定与输掉的方案 = [subagent identity Note](../../../notes/implemented/2026-11-09-subagent-identity-observable.md)。
