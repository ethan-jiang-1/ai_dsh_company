---
status: 调查中
severity: P2
opened: 2026-11-09
---

# BUG-052：worker leaf 的工具面仍可见 `list_subagents` / `send_to_subagent`，与“无 control”声明不一致

> 严重级别：P2（次要）｜发现：2026-11-09｜状态：调查中
> 来源：2026-11-09 修复后第六轮（W6-A）。关联：[worker family 设计 Note](../../notes/implemented/2026-11-09-presets-delegation-model.md)、
> [worker/researcher 边界 Note](../../notes/archived/2026-11-09-specialist-worker-taxonomy.md)。

## 症状

VP-Eng root `session-78dda9a0-5f0c-4bda-a3b9-40ada8ddeda4` 起两个 leaf worker：

- alpha `3eec1647-ff05-4bb9-a524-ba4c51aa6e61`（depth 1 / preset worker）
- beta `59ef9ee7-9354-4296-8f44-2979e12051aa`（depth 1 / preset worker）

让 alpha 用控制面给 sibling beta 发消息，alpha 实际调用了：

1. `list_subagents` → `{"subagents": []}`（它没有自己的 child）
2. `send_to_subagent`（target=beta id）→
   `Error: subagent "59ef9ee7…" belongs to another parent session`

beta 的 user message 数 2 → 2，**没有注入**。运行时防住了跨 parent 的控制，但：

- `worker` preset 注释写“没有 subagent/team/workflow/**control**/ask-user/present”；
- `policy`/`eng-teaming` 也把 leaf 描述成“不委派、不组队、无控制面”；
- 实际 leaf 的工具面**有** `list_subagents` / `send_to_subagent`（host 全局注册，不在 preset 行里），模型会尝试调用并浪费一轮；
- 同型风险：`worker-researcher` 的 control 名已在旧 Note 里承认存在，但 `worker` leaf 的 preset 注释没有同步。

## 根因（假设）

`registerDelegationControl` 在 host 全局注册 `list_subagents` / `send_to_subagent`，没有按 preset/archetype 过滤；worker leaf 的组合里没有这两行，但 host 工具不受 preset 行控制。`send_to_subagent` 的运行时校验（只允许本 session 的 child）阻止了 sibling 注入，所以不是安全越权；问题是**可见面/文案**：preset 说“无 control”，实际有可调用的 control 名。

## 暴露的失败类

**“host 全局能力绕过 preset 能力面”**：preset 是自包含组合，但 host 插件注册的全局工具不经过 preset 行；model 看到的工具面因此比 preset 声明宽。横切范围：所有 host 全局注册的工具（当前是 `list_subagents` / `send_to_subagent`；未来若再加全局控制/审批面，worker 也会看到）。

## 复现

1. VP-Eng root 用 `subagent` 起两个 leaf worker（`agent_preset=worker`）。
2. 让 alpha 调 `list_subagents`，再对 beta id 调 `send_to_subagent`。
3. 观察：两个工具都在；`send_to_subagent` 返回 `belongs to another parent session`；beta 没收到消息。

关键会话（本地 durable 日志，gitignored）：

- VP-Eng root：`session-78dda9a0-5f0c-4bda-a3b9-40ada8ddeda4`
- alpha：`3eec1647-ff05-4bb9-a524-ba4c51aa6e61`
- beta：`59ef9ee7-9354-4296-8f44-2979e12051aa`

证据摘要：`runtime/tmp/explore/round4/r4-2026-11-09T15-13-35-960Z/wave6-leaf-control.json`
（gitignored；含 tool calls/results 与 beta injection=false）。

## 修复关联

- `packages/company-pack/src/host/delegation/delegation-control.ts`：`registerDelegationControl` 的注册作用域。
- 或 `worker` preset 注释 + `policy`/`eng-teaming`：明确“控制工具可能可见，但只能触达本 session 的 child；sibling 会被拒绝”，并补一条真探针。
- `handbook`/researcher Note 已有“控制名仍在”的先例；leaf 不应假装没有。
- 测试：若做过滤，spec 断言 worker child 的工具面不含 `list_subagents`/`send_to_subagent`；若只改文案，spec 钉描述并在真探针里记录 sibling 拒绝。

## 已修判定

- 二选一：
  1. **过滤**：worker leaf 的工具面不再出现 `list_subagents` / `send_to_subagent`（或只保留不可调用的占位）；真装配 probe 断言工具目录。
  2. **改文案**：`worker` preset 注释、policy/eng-teaming 不再声称“无 control”，改为“control 名可能可见，但仅对本 session child 有效；sibling 会被拒绝”；真探针记录调用与拒绝。
- 无论哪条，都要保留一条 sibling 注入探针，证明运行时防护仍在；不能因为工具可见就假设能跨 parent。
