---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-071：capability header 的“未列通道未安装”对 teammate 是假话

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

teammate 的 `system/message` 里有：

> Available channels: spawn.
> Channels not listed are not installed in this session: do not call them or ask downstream to try.

但同一个 teammate 的 `request/header.tools` 里有 `spawn_teammate`（E5C 真挂载，
`session ba1f1e99-47db-487c-860c-57057c3a94e5`）。工具描述写的是 “Only the Team Lead may call this tool.”——也就是说
team 工具**安装了**，只是**这个座位没有权限**；header 把“没有权限/不在本座位可用”说成“没有安装”。

同一句话在 `delegation-policy` core 里也有一份：

> header 没有的通道 = 本会话没有该工具，不要调用、也不要让下游“试试”。

对 teammate 的 team 通道，这句话是假的：工具在，调用会被 Lead-only 拒。

## 根因（假设）

`buildCapabilityHeader()` 用“本座位可用集合”生成 header（team 只给 Lead），但文案把“可用集合”写成了
“安装集合”。`delegation-contracts.ts` 在 `agent/created` 时按 `isTeamLead` 过滤 team section；teammate 的
`spawn_teammate` 仍由 `tool-agent-team` 安装（vendor 只按 `tryMembership` 安装九件套），所以“未列 = 未安装”
在 team 通道上不成立。

## 暴露的失败类

**能力面文案把“权限”写成“安装”**：模型会以为工具不存在；但工具在目录里，可能仍被调用（或反过来
因为“未安装”而不去用 Lead-only 工具的描述）。同型检查：所有 header/section 的“没有 X”是“没权限”还是
“没安装”？两者共享同一句话就会在 Team/Lead 座位上漂。

## 复现

1. `source run/env.sh`，起 company profile（link 当前源码）。
2. 建 CEO root，prompt 让它 `spawn_teammate` 一个只回“在岗”的成员。
3. 读成员会话的 `system/message` 与 `request/header.tools`：
   - header 只有 `Available channels: spawn`；
   - tools 含 `spawn_teammate`；
   - 成员 `spawn_teammate` 调用会被 Lead-only 拒绝。

E5C 原始读数：`teammate {"preset":"ceo","header":true,"teamSection":false,"spawnTeamTool":true,...}`。

## 修复方向（未授权）

- header 文案改成 **“not available to this seat”**（或“not enabled for this agent”），并加一句
  “a Lead-only tool may still appear in your tool list; follow the tool description / your seat authority”。
- `delegation-policy` core 的同一句同步改口；不要新增 team section 给 teammate（team 政策是 Lead 的）。
- 若想彻底消掉“工具在但没权限”，需要 vendor 按成员角色过滤 `spawn_teammate`（上游 seam；本仓不自造）。
- 验收：header 不再说“not installed”；teammate 的 tools 仍含 `spawn_teammate` 时文案不矛盾；CEO/worker root
  的 team 文案不变；`pnpm test` + `preset-smoke` 绿。

## 修复关联

未修。发现于 [委派能力域化回归 + 探索卡](../_archive/settled_issues/2026-11-11-delegation-capability-scoping-regression-exploration.md)
A2 座位矩阵；证据 = E5C teammate 会话。修复属材料性（model-facing host 文案），需用户点名或授权。
