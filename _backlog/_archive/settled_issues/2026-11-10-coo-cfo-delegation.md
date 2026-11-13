---
status: 已结
opened: 2026-11-10
---

# 推敲：COO/CFO 通道——命名行还是 team 角色包

> 立卡：2026-11-10 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 语义审（对照验收 4 条）+ keyless/verify/typecheck/full test/preset-smoke 实跑，证据见 Note
>
> **结论/去向**：note — [Note](../../../notes/implemented/2026-11-10-coo-cfo-delegation.md)。
>
> 上游研究：[组织协同拓扑 §2/§7.1](../../_archive/research/org-coordination-topology/2026-11-10-org-coordination-topology.md)；
> 研究题 [README](../../_archive/research/org-coordination-topology/README.md)。
> 本卡只决定「COO/CFO 怎么被 CEO 叫到、怎么拿到角色方法、文档/测试怎么改」；产品类型与方法包另卡。
>
> **已定（实现）：** A + 角色包——CEO 补 `coo` / `cfo` 命名行（`maxDepth: 1`），多职能仍走 team；
> team spawn 的角色包写进 `assembling-the-team` 与 `generic/collaboration.md`（角色 / CHARTER / 角色 skill /
> KB / 产出 / 边界）。「五个直接汇报 / 每个汇报一个命名工具」文案与测试盲点同步修。

**问题与期望结果：** CEO persona 说直接汇报是五个职能（CMO、VP-Eng、VP-Sales、COO、CFO），
但 `delegation` 组只有 `vp_eng` / `vp_sales` / `vp_cmo` 三条角色命名行
（[`ceo/agent.cordis.yml:38`](../../../packages/company-pack/presets/ceo/agent.cordis.yml)、
[`:192-228`](../../../packages/company-pack/presets/ceo/agent.cordis.yml)）。COO/CFO 没有命名行；
用 team 起一个叫 `coo` / `cfo` 的成员时，成员继承 CEO 组合，拿不到 COO/CFO preset 的
`ops-feasibility` / `budget-check` / `project-economics` / `finance-compliance`，也没有 COO/CFO
preset 的 generic `subagent` / `fork`；它还是 depth 1，CEO 的命名行对它来说是 depth 2，会被拒
（[`collaboration.md:8-11`](../../../packages/company-pack/content/generic/collaboration.md)、
[`delegation.md:83-87`](../../../docs/contracts/delegation.md)、
[`roster.ts:264-272`](../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)）。
期望结果：定一条**可解释、可执行**的通道规则；修掉注释/测试的“五汇报”谎言；让 COO/CFO 要么有真
preset 的一次性通道，要么在 team 里能拿到角色方法。推敲完成 = 通道选择、角色包形状、改动面、
验收口径写清。

**当前情况：**

- CEO 命名行：`subagent_research` + `vp_eng` + `vp_sales` + `vp_cmo`；没有 `coo`/`cfo`
  （[`delegation-model.mjs:181`](../../../tools/lib/delegation-model.mjs)）。
- COO/CFO preset 都存在，有角色 skills；它们的 `delegation` 组只有 generic `subagent` / `fork`
  （[`coo/agent.cordis.yml:169-200`](../../../packages/company-pack/presets/coo/agent.cordis.yml)、
  [`cfo/agent.cordis.yml:168-199`](../../../packages/company-pack/presets/cfo/agent.cordis.yml)）。
- 注释说「每个直接汇报对象一个命名委托工具」，紧接着自己列三个工具
  （[`ceo:174-175`](../../../packages/company-pack/presets/ceo/agent.cordis.yml)）；测试
  `presets.spec.ts:223-246` 只循环三个工具，`:248-256` 只查 persona 文案
  （[`presets.spec.ts`](../../../tests/presets/presets.spec.ts)）。
- UI 委派卡 key 只有 `vp_eng` / `vp_sales` / `vp_cmo`
  （[`delegation-keys.ts:9`](../../../packages/company-pack/src/client/wiring/delegation-keys.ts)）。
- team 的 `maxMembers: 8` 只数 teammate；5 个汇报 = 5 名成员，容量不是问题
  （[`cordis.patch.yml:77`](../../../packages/company-pack/cordis.patch.yml)、
  [`roster.ts:257`](../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)）。
- 多人模式下，人可以给 COO/CFO 开**根会话**，拿真 preset；但这不是 CEO 的 delegation
  （[`multi-human-runbook.md:21`](../../../docs/guides/multi-human-runbook.md)）。

**未决问题：**

1. 补 `coo` / `cfo` 命名行（`maxDepth: 1`，同 `vp_eng`），还是明确 team-only + 角色包？
2. 若补命名行：UI key/委派卡、delegation model、tests、docs 是否同 diff？
3. 若 team-only：角色包放哪、谁维护、怎么保证成员真的 `read` 角色 skill 而不是凭记忆？
4. 团队角色包要不要成为所有 team spawn 的通用合同（不只 COO/CFO）？
5. 多人模式根会话与 CEO team 的边界怎么写进手册，避免模型混用？
6. 是否需要一条 keyless 守卫：CEO 命名行集合 == 模型 `namedDelegates` == 测试期望（当前 4 个含调研）？

**下一步：** 用户拍板 1；若选命名行，实施面 = CEO preset + `delegation-model.mjs` + `delegation-keys.ts`
+ `DelegationCard` 文案 + tests + `delegation.md`/`presets.md`；若选 team-only，实施面 = 角色包模板 +
`assembling-the-team` / `collaboration.md` / `delegation.md` + 文案/测试修正。无论哪条，先修
“每个汇报一个命名工具 / 五职能在位”的表述。

## 范围与排除项

- **在范围内**：CEO 的 COO/CFO 命名行或 team-only 规则；角色包（CHARTER + skill + KB + 产出 +
  边界）；UI/测试/文档修正；多人模式边界说明。
- **排除**：产品类型（另卡）；SA/SQA 方法包（另卡）；上游 per-member preset（只作长期提案，
  不改 vendor）；重写 team 机制。

## 已知与未决

- 已知：命名 child 拿真 preset；team 成员继承 Lead；team 成员的命名行受 depth 限制；多人类模式
  可开真根会话。
- 未知：team 成员 `read` 角色 SKILL.md 后是否稳定按方法干活（需真模型探针）；补命名行后
  UI/深度/测试是否全绿（需 keyless + 挂载）；COO/CFO 的单一职能稿需求有多高频（决定值不值得补）。

## 方案与取舍

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| **A 补命名行 + team 角色包** | CEO 加 `coo`/`cfo`，`maxDepth: 1`；team spawn 仍带角色包 | 五汇报在运行时成立；单职能稿有真 preset；跨职能仍走 team | CEO 工具面 +2；UI/model/tests/docs 同步；要防“什么都走命名行” |
| B team-only + 角色包 | 不补命名行；明确 COO/CFO 只进 team；成员按角色包读 skill | 不扩工具面；符合“评审角色进会议”的直觉 | 仍拿不到 COO/CFO preset 的 generic subagent/fork；单职能稿只能 team 软角色写；必须改文案/测试 |
| C generic subagent + allowed presets | CEO 加一条 generic `subagent`，白名单 COO/CFO | 不新增两个工具 | 身份靠模型自选，不可审计；质量环 Note 已否决类似做法；不推荐 |

**建议 A**；如果用户要最小改动，B 也可，但必须同时补角色包 + 文案修正，不能只改注释。

**角色包草案**（team-only 或 team 辅助都用）：

```
角色：COO
CHARTER：.dsh-company/kb/coo/CHARTER.md
角色 skill：<pack>/presets/coo/skills/ops-feasibility/SKILL.md、budget-check/SKILL.md
KB：.dsh-company/kb/coo/、kb/org.md、kb/policy-lines.md
产出：.dsh-company/deliverables/<slug>/drafts/coo.md
边界：不拍技术方案、不定市场、不签毛利；缺口回 CEO
```

## 验收标准

- CEO preset 有五条角色命名行（`vp_eng` / `vp_sales` / `vp_cmo` / `coo` / `cfo`）；`coo` / `cfo` 都是
  `maxDepth: 1` + `agentPreset`；`delegation-model.mjs` / `DELEGATION_TOOL_KEYS` / `DelegationCard` 同步。
- `tests/presets` 的五条循环、`tests/client/wiring/client-face.spec.ts` 的 key 对齐、
  `checks/lanes/delegation.entry.mjs` 的可见工具清单都含 `coo` / `cfo`。
- `docs/contracts/delegation.md` 表与「五个直接汇报」文案一致；CEO 注释/persona 不再说「三个工具」。
- team 角色包写进 `assembling-the-team` 与 `generic/collaboration.md`（角色 / CHARTER / 角色 skill /
  KB / 产出 / 边界；`<company-content>/../presets/...` 路径），presets spec 有 keyless 断言。
- `pnpm verify`、`pnpm test`、`pnpm typecheck`、`preset-smoke` 绿；Note 落
  `notes/implemented/2026-11-10-coo-cfo-delegation.md`；卡归档。

## 关闭条件

- 选定 A/B/C；写明 COO/CFO 在 CEO 会话里的通道、角色包形状、UI/测试/文档改动；
- 若 A，写出实施验收：`preset-smoke` 有 `coo`/`cfo`；`delegation-smoke` 的命名行/深度；UI key
  与卡片；`pnpm test tests/presets` 覆盖五条（或明确的 3+2 合同）；文档不再说“每个汇报一个工具”
  而与实现不符；
- 若 B，写出角色包模板 + 一次真模型 team 探针（成员是否 `read` skill 并产出）；
- 用户确认结论，卡顶补 `> **结论/去向**：...`，状态翻 `待落地` 或 `已结`。

## 抽象度

- 换公司要改吗？→ **角色会，通道不会**。五职能/编制是公司内容；命名/team 通道是机制。
- 换产品类型要改吗？→ **不会**；COO/CFO 的通道与硬软/纯软无关。
- 换做法要改吗？→ **不会**；角色包只是任务书形状，方法仍在角色 skill/CHARTER。
- 只有机制本身变才改吗？→ 不是；角色包是内容/政策，命名行是机制；两者分开。
- 第二消费者：所有 team spawn（不只 COO/CFO）可复用角色包模板；未来更多角色支持。
- 搬家成本：中（preset/model/UI/tests/docs 或角色包模板）；先做 COO/CFO 两个具体角色，
  不预先造“角色包 DSL”。
