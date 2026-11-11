---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-072：support preset 作为 root 仍能 spawn_teammate，“不组队”只是文案

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note [`notes/implemented/2026-11-11-capability-seat-single-source.md`](../../../notes/implemented/2026-11-11-capability-seat-single-source.md)
> **审查**：agent — 座位/guard spec 红→绿（worker root 红、guard 红）；preset-smoke ALL PASS

## 症状

`worker` preset 的 persona 写“**不组队**”，preset 声明里也没有 team 行；但把它作为 **root** 开会话时：

- `request/header.tools` 里有 `spawn_teammate` / `list_agents` / `send_message` / `wait_agent`；
- `system/message` 有 `Company delegation · this session / Available channels: team (Lead only)` 与 `公司委派 · team` section；
- 强制 prompt“用 spawn_teammate 起一个成员” → 模型真的调用 `spawn_teammate`（worker root
  `session-19bae5e2-c733-45b9-8e5b-6636eb69c5a8`，calls=`["spawn_teammate"]`），没有被任何运行时闸拒绝。

`quality-loop-producer` / `quality-loop-verifier` root 同样有 `spawn_teammate` 与 team section
（`session-cbc802dc-f42e-4ca9-b05c-4597d82ad64a`、`session-090b3147-ddff-43e8-9c00-4d296c86791e`）。

## 根因（假设）

DSH 的 `tool-agent-team` 只按 `agentTeams.tryMembership(agent)` 安装；**任何没有 parentSession 的 root
都是单成员团队 Lead**，与 preset 是不是角色无关。support preset 仍出现在 root 选择器里，因此它们
拿到 Lead 座位和九个团队工具。`worker`/`quality-loop` 的“不组队”只写在 persona/team section 文案里，
没有运行时/选择器闸。</br>

`delegation-model.teamLeadWhenRoot=false` 是 preset 级期望，不改变运行时权限；`surface-matrix` 头注
也早已写明“root = Lead，即使 preset 声明 teamLeadWhenRoot:false”。

## 暴露的失败类

**support 能力档被当 root 时的权限面没有产品闸**：声明（persona/模型）说“不是角色、不组队”，运行时
（root=Lead）说“你可以组队”。同型：quality-loop verifier 是 read-only 手，但 root 座位仍能起 teammate；
worker 是 leaf，但 root 座位仍能起 teammate。

## 复现

1. `source run/env.sh`，起 company profile（link 当前源码）。
2. `session/create` with `agentPreset: 'worker'`（或 `quality-loop-producer`）。
3. 读首帧 `request/header.tools` 与 `system/message`：有 `spawn_teammate` + team section。
4. prompt “用 spawn_teammate 起一个只回在岗的成员” → tool/call 出现 `spawn_teammate`。

证据：E5B worker root `session-5a584bd6-0315-4c01-83cb-be97191e2377`（tool face 有 `spawn_teammate`）；
A2 worker root `session-19bae5e2-c733-45b9-8e5b-6636eb69c5a8`（实际调用）；quality-loop roots 见上。

## 修复方向（未授权）

- **产品侧（最小）**：root 选择器/roster 隐藏 support preset（`worker*` / `quality-loop-*`），
  只允许它们作为命名 child/能力档；这是 client/roster 过滤，不改 vendor。
- **运行时侧（更硬）**：host 在 `spawn_teammate` 的 caller 为 support preset 时拒绝（或从 support root
  的工具面移除 team 工具）；但 `tool-agent-team` 按成员安装，按 preset 移除要自定义工具/组合，成本高。
- **文案侧（不够）**：team section 已写“leaf/support 按 persona 保持 leaf”，本 bug 证明文案挡不住强制
  prompt；不能只靠文案。
- 验收（任一方向）：support root 不再能起 teammate（或 root 选择器不提供 support preset）；常规
  `worker`/`quality-loop` 作为 child 的功能不变；`pnpm test`/`typecheck`/`verify`/`preset-smoke` 绿；
  反证 = 放开 guard/过滤后退回本症状。

## 已修判定

- support preset（`NON_ROLE_PRESETS`：worker family + 两个质量环能力档）作为 root 时：header 不列 team、不注入 team section；`spawn_teammate` 调用被 per-agent host guard 以明确理由拒绝。
- 六个公司角色 root 的 team 行为不变；support preset 作为命名 child 的工具面与功能不变（不装 team、不装 control）。
- keyless：座位注入 spec（worker root 无 header/section）+ guard spec（support 拒、ceo 放行）；去掉座位判据或 guard 即红。
- `pnpm test` / `pnpm typecheck` / `pnpm verify` / `preset-smoke` 绿。
- 未跑：真模型 worker root 强制 prompt（guard 是 vendor `tools.guard` 执行面，keyless 已钉拒法；模型是否先尝试一次属行为面，单场不证）。

## 修复关联

已修（2026-11-11）。发现于 [委派能力域化回归 + 探索卡](../settled_issues/2026-11-11-delegation-capability-scoping-regression-exploration.md)
A2 座位矩阵；产品/UX 处理在 [政策能力域化 Note](../../../notes/implemented/2026-11-11-delegation-policy-capability-scoped.md)
「后果」节已记为残余，本卡给它一个可追踪的缺陷入口。
