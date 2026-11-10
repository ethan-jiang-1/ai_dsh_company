# 2026-11-10 · COO/CFO 通道：五个直接汇报各一条命名行 + team 角色包

状态：implemented（2026-11-10 落地；验证见下）

上游 = [COO/CFO 通道卡](../../_backlog/_archive/settled_issues/2026-11-10-coo-cfo-delegation.md)；
证据 = [组织拓扑 §2/§7.1](../../_backlog/_archive/research/org-coordination-topology/2026-11-10-org-coordination-topology.md)。

## 问题

CEO persona 说五个直接汇报，但 `delegation` 只有 `vp_eng` / `vp_sales` / `vp_cmo` 三条角色命名行；
COO/CFO 只能以 team 成员出现，而 team 成员继承 CEO 组合：拿不到 COO/CFO 的
`ops-feasibility` / `budget-check` / `project-economics` / `finance-compliance`，也没有它们 preset 的
generic `subagent` / `fork`。注释「每个直接汇报对象一个命名委托工具」与实现不一致。

## 决定

1. **补两条命名行**：CEO 的 `delegation` 加 `tool-coo` / `tool-cfo`，`provider: spawn`、
   `maxDepth: 1`、`agentPreset: coo` / `cfo`；五个直接汇报各一条。
2. **多职能仍走 team**：命名行只用于“用户明确只要一份、且只属一个职能”的快捷出稿；会议/互审/任务板
   仍用 `spawn_teammate`。
3. **team 角色包**：spawn 承担职能角色时，任务书写角色 / CHARTER / 角色 skill 路径 / KB / 产出 / 边界；
   角色 skill 用 `<company-content>/../presets/<role>/skills/<skill>/SKILL.md`，成员先 `read` 再干。
   `skill` 工具加载不到角色 skill 是机制事实，不假设它能加载。
4. **文案与测试盲点同步**：CEO 注释/persona、`docs/contracts/delegation.md` 表、delegation model、
   `DELEGATION_TOOL_KEYS`、`DelegationCard` 标签、`delegation-smoke` 可见工具清单、presets/client 测试。

## 输掉的方案

- **维持三条 + team-only**：仍拿不到 COO/CFO preset 的方法/工具面；必须靠角色包，且“五个直接汇报”
  在运行时仍不成立。研究建议的 A 更一致；team 角色包仍然保留给多职能会议。
- **CEO 加 generic `subagent` + allowed presets**：身份靠模型自选，不可审计；质量环 Note 已否决同类做法。
- **用 team 成员冒充 COO/CFO 出稿**：成员继承 CEO 组合；角色方法加载不到，任务书也不能保证它按角色边界。
- **只改注释/测试，不补行**：文案与运行时继续分叉；不选。

## 后果

- CEO 模型可见工具从 3 个角色工具变 5 个；UI 委派卡对 COO/CFO 也渲染。
- 命名 child 一次性、无任务板；多职能协作仍走 team，team 成员仍是软角色（角色包补方法，不补 preset）。
- `maxDepth: 1` 与 vp_* 同款；COO/CFO preset 自己的 generic `subagent` 仍可在 depth 2 用。
- 团队 spawn 的任务书更长；角色包是任务书约定，不改 vendor/team 机制。

## 验证

- 已跑：`pnpm vitest run tests/presets tests/client/wiring tests/client/ui/delegation-card.spec.ts` →
  **17 files / 159 tests passed**（含五条命名行、client key 对齐、角色包断言）。
- 已跑：`node ./node_modules/typescript/bin/tsc -b packages/company-pack` → 无输出（绿）。
- 已跑：`pnpm verify` → **ALL PASS**（含 doc-budget 压缩、generic-clean、backlog-liveness）。
- 已跑：`pnpm test` → **170 files / 1409 tests passed**；`pnpm typecheck` → 绿；
  `preset-smoke` → **ALL PASS**（6 角色 + 5 support）。
- 红形态：删 `tool-coo` → `tests/presets` 五条循环/`client-face` key 对齐红；删 `coo`/`cfo` 的
  `agentPreset` → presets spec 红；删角色包段落 → presets spec 红。
