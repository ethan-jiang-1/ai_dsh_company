# 2026-11-11 · 座位矩阵第二层：team 拆协作/spawn、guard 覆盖九件套、control 按 child 能力

状态：implemented（2026-11-11；上游 = BUG-076/077/078；host 模型可见行为 + content + 文档）
上游 = [BUG-076](../../_backlog/_archive/fixed_bugs/BUG-076-support-root-still-has-team-tools-policy.md) · [BUG-077](../../_backlog/_archive/fixed_bugs/BUG-077-teammate-header-omits-team-collaboration.md) · [BUG-078](../../_backlog/_archive/fixed_bugs/BUG-078-teammate-dead-subagent-control-tools.md)

> **后续修正**：`controlsChildren` 的 `teamRole !== teammate` 一刀切由 BUG-079 改为 `childDepth > depth`；spawn/fork/retry 也按同一 childDepth 门控。见 [seat-spawn-depth](./2026-11-11-seat-spawn-depth.md)。

## 决定

1. **一个 `DelegationSeat` 是唯一座位判据**（`host/delegation/seat.ts`）：preset + `teamRole`（lead / teammate / undefined）+ support → `teamLead` / `teamCollaborate` / `controlsChildren`。`teamRoleOf` 用 membership 优先、`header.parentSession` 兜底；support 叠在引擎 Lead 之上。header/section、guard、control 三处都读它，不再各自读 preset 或单一 Lead 布尔。
2. **team 拆成两个模型可见能力**：`team collaboration`（Lead 与 teammate 共用；`send_message` / 任务板 / `wait_agent`）与 `team spawn (Lead only)`（spawn 权）。teammate header 只有前者；Lead 两者都有；support 两者都无。
3. **section 按座位选**：Lead 注入 `team-spawn.md`（Lead 规则）+ `team.md`（协作规则）；teammate 只注入 `team.md`（member 版）；support 只注入 `company:delegation-seat` 纠正段。
4. **guard 覆盖 vendor 九件套**：support preset 的 `spawn_teammate` / `list_agents` / `send_message` / `wait_agent` / `interrupt_agent` / `team_task_*` 全部可见拒绝；vendor `team:policy`/`team:identity` 仍在，由 seat note 明确“不授予本座位权限”。
5. **control 安装按座位 + child 能力**：support 不装；teammate 只有在工具面有通用 `subagent` / `subagent_fork` 时才装（CEO teammate 没有 → 死工具消失；vp-eng teammate 有 → 保留）；root / 命名 child 保留。
6. **上游 seam（保留）**：vendor 按 root 自动安装 team 九件套并注入 policy/identity；host 没有 per-seat 卸载/替换 seam，所以用 guard + 纠正段。若上游提供 per-seat team opt-out，删 guard/seat note。

## 输掉的方案

- **只扩 guard、不纠正 vendor policy**：模型仍先读“Agent Teams is available”，执行面才拒；ghost task 被拦但文案仍矛盾。→ 两者都做。
- **只加纠正文案、不扩 guard**：BUG-076 的 ghost task 仍能创建。→ 两者都做。
- **`team` 保持一个布尔 + 动态 label**：section 内容仍要在 Lead/member 间切换，“未列 = 本座位不可用”会继续误伤协作面；拆成两条能力后语义直接可判。
- **root 选择器隐藏 support preset**：vendor roster 无 hidden/rootable 字段，且 support preset 仍要作为命名 child 被 `agentPreset` 解析（注销会断 `quality_loop_*` / `subagent_research`）；越 vendor。
- **`tools.restrict({ deny: [...] })` 摘团队工具**：只过滤 global 层，团队工具是 agent scope 注册，够不到。
- **一律不给 teammate control（卡上原验收）**：CEO teammate 是死工具，但 vp-eng teammate 的 `subagent` 行 `maxDepth: 3` 真能起 child；一律删会误伤。→ 按“有没有通用 child 通道”判。
- **自造团队工具 / 替换 `agentTeams`**：双实现、越层；不采用。

## 后果

- support root：无 header/team section，九件套调用被拒，另有 seat note；不会再产生 ghost task/message。
- teammate：header 列 `team collaboration`（Lead 是 vp-eng 时还有 `spawn`/`fork`/`workflow`/`retry`），无 `team spawn`；`team_task_*` / `send_message` / `wait_agent` 可用；CEO teammate 无 `list_subagents` / `send_to_subagent`，vp-eng teammate 保留。
- Lead：header 同时列 collaboration + spawn；注入两段；行为不变。
- 命名 child：无 team，保留 control；support child 无 seat note（没有 vendor policy 可纠正）。
- 内容：`team.md` 改为协作版，新增 `team-spawn.md`；`readDelegationSections` 读六段，缺一即整组 fail-safe。
- token：teammate 多一段 member 协作（约 +600 code points）；support root 多一段 seat note（约 +400）；Lead 的 `team-spawn` 与原 team.md 的 Lead 内容相近，净增小。

## 验证（实跑）

**红→绿**

- 076 guard：把 guard 收窄到 `spawn_teammate` → `team-seat-guard.spec` **1 failed / 3 passed**；还原 **4 passed**。
- 076 seat note：删掉 seat note 注入 → `delegation-contracts.spec` **1 failed / 7 passed**；还原 **8 passed**。
- 077：把 `team: seat.teamCollaborate` 改回 `seat.teamLead` → 「teammate collaboration」**1 failed / 7 passed**；还原 **8 passed**。
- 078：去掉 teammate 的“无通用 child 通道”判据 → 「teammate without a generic child」**1 failed / 23 passed**；还原 **24 passed**。

**全量**：`pnpm test` → **199 files / 1594 tests passed**；`pnpm typecheck` 绿；`pnpm lint` 0 warnings/0 errors；
`pnpm dup` 0 clones；`pnpm verify` ALL PASS；`source run/env.sh && node checks/smoke/preset-smoke.mjs` → **ALL PASS（6 角色 + 5 非角色）**。

**未跑/未证**：真模型 worker root / teammate 会话复跑（keyless + preset-smoke 为准）；模型是否先尝试一次 team 工具属行为面，单场不证。vendor `team:policy`/`team:identity` 文本仍在（无 host 删除 seam），seat note 是纠正不是删除。

## 现行语义（canonical）

- host：[seat.ts](../../packages/company-pack/src/host/delegation/seat.ts) · [delegation-contracts.ts](../../packages/company-pack/src/host/prompt/delegation-contracts.ts) · [team-seat-guard.ts](../../packages/company-pack/src/host/delegation/team-seat-guard.ts) · [delegation-control.ts](../../packages/company-pack/src/host/delegation/delegation-control.ts)
- 内容：[team.md](../../packages/company-pack/content/contracts/delegation/team.md) · [team-spawn.md](../../packages/company-pack/content/contracts/delegation/team-spawn.md)
- 合同：[delegation](../../docs/contracts/delegation.md) §2.1/§4 · [presets](../../docs/contracts/presets.md) 工具面
- 前序 Note：[能力事实四载体](./2026-11-11-capability-seat-single-source.md)（本 Note 部分取代其 team/guard 两项）
