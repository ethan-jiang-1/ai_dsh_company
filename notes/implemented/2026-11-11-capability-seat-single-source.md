# 2026-11-11 · 能力事实的四个载体：安装 ≠ 座位 ≠ 文案 ≠ 文档

状态：implemented（2026-11-11；上游 = BUG-071/072/073/075；模型可见文案 + host 行为 + preset 内容 + 文档）
上游 = [BUG-071](../../_backlog/_archive/fixed_bugs/BUG-071-capability-header-not-installed-wording.md) · [BUG-072](../../_backlog/_archive/fixed_bugs/BUG-072-support-root-can-spawn-team.md) · [BUG-073](../../_backlog/_archive/fixed_bugs/BUG-073-readme-one-shot-child-team-tools-stale.md) · [BUG-075](../../_backlog/_archive/fixed_bugs/BUG-075-eng-teaming-schema-rule-duplicated.md)

## 决定

1. **header 只回答“这个座位可用哪些通道”**，不回答“装没装”。未列 = 本座位不可用；工具可能仍安装着，调用会被拒。`buildCapabilityHeader()` 的文案与 `delegation-policy` core 首段同口径——不再把“可用集合”写成“安装集合”。
2. **team 通道 = 引擎 Lead ∧ 工具在场 ∧ 非 support preset**。`isSupportPreset()` 是唯一座位判据（`NON_ROLE_PRESETS`，与 handbook 跳过集合同源）；support preset 作为 root 不列 team、不注入 team section，header 可能为空。
3. **执行边界 = per-agent `tools.guard`**（`host/delegation/team-seat-guard.ts`）：support preset 的 `spawn_teammate` 被拒，理由点名 preset 与“support capability seat，不是公司角色”，并叫停重试。保留 vendor 工具、不改 vendor。
4. **文档/内容只写现行事实**：README 已知限制删掉 0.2.0 的 one-shot child 旧观察；delegation 合同分写“引擎事实（任何 root = Lead）”与“产品座位（support 不组队）”；`team.md` 删掉“support root 会拿到本 section”的死句。
5. **引擎事实只住 workflow 合同，表格短句也算**：`eng-teaming` 五档表删掉“分支不传 schema”，只留用法判据（一行可解析 JSON）；schema/截断/spill/重启仍只在 `company:workflow-contract`。

## 输掉的方案

- **root 选择器隐藏 support preset**：`agentPresets` 名册没有 hidden/rootable 字段；改 vendor registry/UI 越 vendor 铁律，且 support preset 仍要作为命名 child 被 `agentPreset` 解析，不能注销。
- **只改文案**：BUG-072 的强制 prompt 已证明文案挡不住调用；必须有一条执行边界。
- **自造团队工具替换 vendor**：双实现、与 `tool-agent-team` 的 shadow 语义打架；不是本仓的层。
- **`tools.restrict({ deny: ['spawn_teammate'] })`**：只过滤 global 层；团队工具是 agent scope 注册，够不到（会报 unknown global tool）。
- **给 teammate 补 team section**：team 政策是 Lead 的；teammate 需要的是“工具在但只有 Lead 能执行”的事实，已由工具描述与 team 段承载。
- **按 BUG-074 原方向删 WeakSet**：误报；见 [注入生命周期 Note](./2026-11-11-inject-reentrancy-false-positive.md)。

## 后果

- support root（`worker` / `worker-researcher` / `worker-orchestrator` / `quality-loop-*`）不再有 team header/section；`worker-orchestrator` 仍列 spawn。`spawn_teammate` 工具仍在工具面（vendor 安装），调用被 guard 拒。
- 六公司角色 root、命名 child、teammate 的通道不变；teammate 仍可能看到 `spawn_teammate`（Lead-only 执行），header 不再把它说成“未安装”。
- `delegation-contracts.spec` 的 worker root 期望从 “team only” 改为 “无 header/section”；新增 guard spec。
- token：header 多两句（约 +160 字符），只在有可用通道的座位注入；support root 从一段变为零段。

## 验证（实跑）

**红→绿（座位）**：把 `team: lead && !isSupportPreset(preset)` 恢复成 `team: lead`（并保留旧文案）→
`tests/host/prompt/delegation-contracts.spec.ts` **2 failed / 5 passed**（CEO 文案 + worker root）；
还原 → **7 passed**。

**红→绿（文案）**：把 header 改回 `Channels not listed are not installed…` → CEO 用例红；还原绿。

**新增守卫**：`tests/host/delegation/team-seat-guard.spec.ts` **4 passed**（worker 拒、ceo 不装、无 preset 不猜、纯理由函数）。

**全量**：`pnpm test` → **198 files / 1581 tests passed**；`pnpm typecheck` 绿；`pnpm lint` 0 warnings/0 errors；
`pnpm verify` ALL PASS；`source run/env.sh && node checks/smoke/preset-smoke.mjs` → **ALL PASS（6 角色 + 5 非角色）**。

**未跑/未证**：真模型会话里 support root 仍可能先尝试一次 `spawn_teammate` 再被 guard 拒（执行面成立；
“模型不尝试”是行为面，单场不证）。`delegation-smoke --delegate` 未重跑（child 组合未改）。

## 现行语义（canonical）

- host：[delegation-contracts.ts](../../packages/company-pack/src/host/prompt/delegation-contracts.ts) · [team-seat-guard.ts](../../packages/company-pack/src/host/delegation/team-seat-guard.ts) · [delegation-surface.ts](../../packages/company-pack/src/lib/delegation-surface.ts)
- 合同：[delegation](../../docs/contracts/delegation.md) §2.1 · [presets](../../docs/contracts/presets.md) 工具面
- 内容：[delegation core skill](../../packages/company-pack/presets/_shared/delegation/skills/delegation-policy/SKILL.md) · [eng-teaming](../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md) · [README 已知限制](../../packages/company-pack/README.md)
- 前置 Note：[委派政策能力域化](./2026-11-11-delegation-policy-capability-scoped.md)（本 Note 部分取代其 item 6）
