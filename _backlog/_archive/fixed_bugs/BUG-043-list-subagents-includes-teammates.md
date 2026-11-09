---
status: 已修
severity: P2
opened: 2026-11-08
---

# BUG-043：`list_subagents` 把 teammate 也列出来，与 `list_agents` 名册重叠且描述未说明

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：已修｜审查：agent — 输出加 role/address（teammate 用队名、subagent 用 session id）；description 与 eng-teaming 写死两套寻址；keyless 测试覆盖有 team/无 team/非成员

## 症状

C3 团队继承实测：root `spawn_teammate` 出 eng-2 后，root 的 `list_subagents` **同时列出 eng-2**
（`id 02d92066-…`，label = 它的 description）和 eng-2 的 worker；而 team `list_agents` 只列名册
（lead + eng-2）。模型自述：“成员与子代理是同一套 child 机制的两个视图”。

工具描述只说：“Use it when the team-scoped `list_agents` only returns roster members — named and generic
subagent children are not team roster members, so ... `list_agents` cannot see them.” 没有说
**teammate 也会出现在 `list_subagents` 里**（teammate 恰恰是 roster member）。于是：

- 同一个 teammate 同时是“团队成员”（按名 `send_message`）和“subagent child”（按 id
  `send_to_subagent`）；两套寻址可交叉，模型可能选错；
- `list_subagents` 的语义不再是“非名册 child”，而是“本会话所有 subagent activation，含 teammate”。

## 根因（假设）

`spawn_teammate` 走 `ctx.subagents` 创建 activation，父会话因此也写了 `subagent/catalog` 条目；
`subagentRows` 只按 catalog 折叠，不查 team membership，也不在行上标 `role/kind`。

## 暴露的失败类

- 两个列表（`list_agents` / `list_subagents`）对同一批 child 的口径不同，模型要在两套名字/寻址间判断。
- 工具描述与真实输出不一致；自然任务下可能用 team `send_message` 找一个 generic child，或反过来。
- 与 BUG-037/041 的“替代控制名”叠加：替代面本身又长出重叠视图。

## 复现

1. vp-eng root：spawn teammate eng-2，让它用 `subagent` 起 worker（C3 prompt）。
2. 观察 root 的 `list_subagents` 输出：eng-2 与 worker 同时出现；`list_agents` 只有 lead/eng-2。
3. 证据：`runtime/tmp/explore/ex4/C3/summary.json`；父 `session-2d675aa7-…`；children
   `02d92066-…`（eng-2）/ `40ebc76e-…`（worker）。

## 发现路径（探索方向）

“团队继承 × 新控制名”charter（C3）：让 teammate 自己也起 worker，比较 root 的 `list_agents` /
`list_subagents` 两份清单与 teammate 的选择。**探索方向提示**：新控制工具的生命周期/目录要和 team
名册对账；只测“root 能用”会漏掉“两个列表重叠”。

## 修复关联

- **修法（2026-11-08 已落树）**：不隐藏、标出来——`list_subagents` 每行加
  `role: 'teammate' | 'subagent'` 与 `address`（teammate = 队名；subagent = session id）。
  身份来自 `ctx.get('agentTeams')`：`tryMembership(agent)` 有值才读 `listMembers(agent)`，
  把 `role === 'teammate'` 的 id→name 建表；服务缺席/非成员 → 全部按 subagent（**不静默丢行**）。
- **模型面**：`list_subagents` description 写清“teammate 用 team `send_message` 按 address、subagent 用
  `send_to_subagent` 按 address”；`send_to_subagent` description 补一句“teammate 行走 team send_message”；
  `eng-teaming` 控制面加同一句。
- **keyless 测试资产**：`tests/host/delegation/delegation-control.spec.ts` 14 条——纯折叠默认 subagent；
  team 成员 + 普通 child 的 role/address；非成员（tryMembership=undefined）全 subagent；
  description 含 role/address/teammate 断言；无 team 服务不丢行。
- **收口口径**：按已修判定第二条的“description/skill 写死两套寻址 + 绿证据”分支收口；
  **未跑真模型自然任务观察**（C3），因此不声称“模型必选对”，只声称“输出可判 + 规则在模型面”。

## 已修判定

- `list_subagents` 的输出能区分 teammate 与 generic/named subagent（或明确过滤）；且
- 自然任务下模型用对寻址（team `send_message` 对 teammate、`send_to_subagent` 对 subagent child），
  或在 description/skill 里写死两套寻址并有绿证据。
