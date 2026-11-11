# 2026-11-11 · 座位 spawn 面：能力表 + 当前 depth，而不是 preset 布尔

状态：implemented（2026-11-11；上游 = BUG-079；host 座位/能力表 + tests）
上游 = [BUG-079](../../_backlog/_archive/fixed_bugs/BUG-079-ceo-teammate-spawn-header-no-child-channel.md)

## 决定

1. **能力表补 `childDepth`**：`DelegationCapabilities.childDepth` = 该 preset 的
   `depthRows` 里 spawn/fork 行的最大 `maxDepth`（`'default'` 读 1；无 child 行 = 0）。
   运行时表仍与 `tools/lib/delegation-model.mjs` 的 `COMPOSITIONS[*].depthRows` 逐 preset 钉住。
2. **座位补 `depth` / `childDepth` / `canStartChild`**：`DelegationSeat.depth` 读 durable
   `header.delegationDepth`，runtime `options.subagentDepth` 兜底，取较大值；`childDepth` 来自
   能力表；`canStartChild = childDepth > depth`。`controlsChildren = !support && canStartChild`。
3. **spawn/fork/retry 用 `seat.canStartChild` 门控**：`delegation-contracts` 不再只看
   `caps.spawn`。CEO teammate depth 1、childDepth 1 ⇒ 不列 spawn、不注入 spawn section；
   vp-eng teammate depth 1、childDepth 3 ⇒ 保留 spawn/fork/retry。
4. **control 消费同一座位**：`delegation-control` 用 `seat.controlsChildren`，删掉
   “teammate 时再 `hasTool('subagent')`”的二次判据；CEO teammate 无 control，vp-eng teammate 有。

## 输掉的方案

- **保留 `controlsChildren = teamRole !== 'teammate'` + control 里 `hasTool` 另判**：正是 BUG-079
  的现状——一个座位两个判据，vp-eng teammate 字段 false 但工具在；改 spawn 时还会漏。
- **只查 generic `subagent`/`subagent_fork`**：CEO root 也会被误删 spawn（它靠命名行，不靠
  generic）；且 depth 用尽的命名 child 仍会拿到 header。必须用 `depthRows` 的 childDepth。
- **只查 caps.spawn，不查 depth**：CEO teammate 继续假可用；depth 3 的 vp-eng child 继续拿到
  一个必抛的 spawn。原卡症状不消失。
- **按座位隐藏/替换 vendor 工具**：vendor 按 root 安装 team 面；root 选择器无 hidden；越 vendor。
  本修复只动 host 的 header/section/guard/control 判据。

## 后果

- CEO teammate：header 只剩 `team collaboration`，无 `spawn`/spawn section；`list_subagents` /
  `send_to_subagent` 也不装（control false）。vp-eng teammate：`spawn, fork, workflow,
  team collaboration, retry` 与 control 均保留。
- 命名 child vp-eng：depth 1 + childDepth 3 ⇒ spawn/fork/retry 仍可用；depth 3 时 childDepth
  不再大于 depth，header 会收掉 spawn/fork/retry。
- support root 不变：team 九件套仍由 guard 拒；`canStartChild` 只影响 spawn/fork，不改 seat note。
- 未知 preset：无能力表，`canStartChild` false，但 control 保持旧行为（root/命名 child 仍装，teammate 不装；不猜 childDepth）。

## 验证（实跑）

**红→绿（keyless）**：

- 先加测试：`seat.spec` 的 CEO/vp-eng teammate depth 用例、`delegation-contracts.spec` 的 CEO
  teammate no-spawn 用例、`delegation-capabilities.spec` 的 childDepth parity。
- 红：`pnpm exec vitest run seat.spec delegation-contracts.spec delegation-capabilities.spec
  delegation-control.spec` → **8 failed / 37 passed**（seat 缺字段、contracts 多 spawn、capabilities
  缺 childDepth）。
- 绿：实现后同命令 → **45 passed**。

**真座位复验**：

- CEO teammate `session 8780865f-82a4-4d01-b313-5df129c72bcc`：header
  `Available channels: team collaboration.`；`subagent/fork/workflow=false`、
  `list_subagents/send_to_subagent=false`。
- VP-Eng teammate `session e1f749d2-6269-4f26-920a-fac837fccc88`：header
  `spawn, fork, workflow, team collaboration, retry`；`subagent/fork/workflow=true`、
  `list_subagents/send_to_subagent=true`。
- 修复前同探针：CEO teammate header 为 `spawn, team collaboration`，控件为 false（BUG-079 症状）。

**全量**：`pnpm test` → **199 files / 1596 tests passed**；`pnpm typecheck` 绿；
`pnpm lint` 0 warnings / 0 errors；`source run/env.sh && node checks/smoke/preset-smoke.mjs` →
**ALL PASS（6 角色 + 5 非角色）**；`pnpm verify` ALL PASS。

## 现行语义（canonical）

- 能力表：[delegation-capabilities.ts](../../packages/company-pack/src/lib/delegation-capabilities.ts)
- 座位：[seat.ts](../../packages/company-pack/src/host/delegation/seat.ts) ·
  [delegation-contracts.ts](../../packages/company-pack/src/host/prompt/delegation-contracts.ts) ·
  [delegation-control.ts](../../packages/company-pack/src/host/delegation/delegation-control.ts)
- 测试：[seat.spec.ts](../../tests/host/delegation/seat.spec.ts) ·
  [delegation-contracts.spec.ts](../../tests/host/prompt/delegation-contracts.spec.ts) ·
  [delegation-capabilities.spec.ts](../../tests/presets/delegation-capabilities.spec.ts) ·
  [delegation-control.spec.ts](../../tests/host/delegation/delegation-control.spec.ts)
- 前序 Note：[seat-matrix-team-collaboration](./2026-11-11-seat-matrix-team-collaboration.md)
  （本 Note 修正其 `controlsChildren` 的 teammate 一刀切）
