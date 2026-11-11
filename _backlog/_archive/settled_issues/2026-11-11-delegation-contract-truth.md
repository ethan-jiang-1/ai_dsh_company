---
status: 已结
opened: 2026-11-11
---

# 推敲：委派合同事实纠偏——maxDepth 行上限、team 上下文、通道分类与 vendor parity

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [2026-11-11 委派合同事实纠偏 Note](../../../notes/implemented/2026-11-11-delegation-contract-truth.md)。
>
> **审查**：agent — 对照授权与验收逐条；parity spec 红→绿、presets/full test/typecheck/preset-smoke/verify 全绿。
>
> **结论（研究）**：做 — 只改模型/文档/测试的事实与语义，不改运行时行为。

**问题与期望结果：** 第一轮研究已确认四处事实错误：① CEO preset 注释把 `maxDepth: 1` 写成“child 不能再往下派活”，实际它只限直接 child 的绝对深度，vp-eng child 用自己 preset 的 `subagent` 行仍可再派（研究 E6）；② `delegation-model` 把 team 的上下文写成 `inheritsParentContext: true`，vendor 的 `spawn_teammate` 是 `fresh|fork`、默认 fresh（研究 E4/B2）；③ `CHANNELS.*.control` 把本仓 workaround（`list_subagents`/`send_to_subagent`/`workflow_runs`）写成通道硬能力；④ docs 的 A/B/C/D 与模型的原生四通道是两套分类，C 未启用、fork 缺席。期望结果：一个 vendor-parity 钉子 + 修正后的模型/合同/文档，**不改变任何工具面与行为**。

**当前情况：**

- G2 证据：`packages/company-pack/presets/ceo/agent.cordis.yml:190`；`tests/presets/presets.spec.ts:234`；vendor `resolveChildDepth` 在 `vendor/dsh/packages/subagent/subagent/src/child-agent.ts:49`-`58`；E6 模拟 CEO→vp-eng(1)→worker(2) 放行。
- G3 证据：`tools/lib/delegation-model.mjs:68`；`delegation-policy/SKILL.md:16`；`docs/contracts/delegation.md:81`；vendor `tool-agent-team/src/index.ts:61`、`:208`；B2 实测 CEO 两次 `spawn_teammate` 都传 `context: "fresh"`。
- G4 证据：`docs/architecture.md:37`-`44`、`docs/reference/terminology.md:16` vs `tools/lib/delegation-model.mjs:46`-`73`；C（dsh-sdk）当前六角色未使用，fork 在 A/B/C/D 表里没有位置。
- `teamLead` 语义：`COMPOSITIONS.*.teamLead` 是 preset 级期望；E5 实测 worker root 仍有 `spawn_teammate`（任何 root 都是 Lead，`tools/lib/surface-matrix.mjs` 头注同款结论）。
- 完整证据与复读命令 = [实验第一轮](../../research/dsh-native-orchestration-fit/2026-11-11-experiment-results.md)；GAP 编号 = [GAP 登记](../../research/dsh-native-orchestration-fit/2026-11-11-repo-fit-gap-register.md)。

**未决问题：** 没有需要用户拍板的产品选择；实现时需定两件小口径：① `teamLead` 改成 `teamLeadWhenRoot` 还是加 `runtimeAuthority` 字段（推荐前者：保留 preset 期望，另在注入侧用 `agentTeams.membership` 判运行时）；② A/B/C/D 表保留为组织别名，还是从 `architecture.md` 主表移除（推荐保留 A/B/D 为别名、C 标“未启用的外部 provider 通道”，能力矩阵以原生四通道为准）。

**下一步：** 先写 `tests/harness/contract/<delegation-channel-parity.spec.ts>`（红：当前模型与 vendor 的 team context/teamLead/control 标签不一致）→ 修模型/注释/测试文案 → 改 docs 三处 → 跑 targeted spec + `pnpm test` + `pnpm typecheck` + `pnpm verify`。

## 范围与排除项

**范围**：`tools/lib/delegation-model.mjs`、`tests/presets/delegation-model.spec.ts`、`tests/presets/presets.spec.ts`、`packages/company-pack/presets/ceo/agent.cordis.yml` 的注释、`docs/contracts/delegation.md`、`docs/contracts/presets.md`、`docs/architecture.md`、`docs/reference/terminology.md`、`docs/guides/budget-and-ops.md` 的 fork 省钱句。

**排除**：任何 runtime/host 行为改动（政策注入 = Issue 2）；G7（workflow/质量环范围）与 G8（goal 治理）的产品决定；给更多角色挂 workflow；改 vendor。

## 已知与未决

- **已知**：vendor 的 team context 默认 fresh（B2 实测 CEO 显式 fresh）；maxDepth 是行上限（E6）；worker root 是 Lead（E5）；A/B/C/D 与原生四通道并存（E1/E4）。
- **未决**：`teamLead` 字段的最终命名/形状；A/B/C/D 在主表里的去留；是否需要一条组合层“CEO 行 1 + vp-eng 行 3”的链测试（推荐加）。
- **不证**：模型行为；工具面；这些是 Issue 2 的证据。

## 方案与取舍

- **A（选）**：加 vendor-parity spec，先红后绿；修正模型/注释/文案/docs。事实错误用事实修，不用行为测试兜。
- **B（输）**：只改 CEO 注释与测试文案，保留模型的 team context/control 标签。会留下“模型 = 期望源”的谎报。
- **C（输）**：加一条真模型行为测试证明 child 能派活。真值表 + 源码已足够，真模型只增加成本与不稳定。
- **D（输）**：把 A/B/C/D 整表删掉。会丢掉组织别名；保留映射、能力矩阵归原生四通道更稳。

## 验收标准

1. 新增 vendor-parity spec：team context = `fresh|fork`（默认 fresh）、team preset=false、workflow preset=false、fork context=只带已完成轮、spawn preset=true；断言直接读 vendor 源码/能力位，不手抄第二份。
2. `delegation-model`：team 字段改为可选上下文语义；`CHANNELS.control` 注明“本仓控制面，不是 vendor 硬能力”；`teamLead` 语义写成“preset 级期望，root 运行时权限另判”。
3. CEO preset 注释与 `presets.spec.ts` 文案改为“`maxDepth` 是直接 child 的绝对深度上限；再委派由 child 自己的行决定”；加一条组合层链测试（CEO 行 1 + vp-eng 通用行 3 同时在场）。
4. docs：team 默认 fresh、`fork` 只带已完成轮；maxDepth 行上限；A/B/C/D 与原生四通道的映射（C 标未启用）；不再出现“fork 把会议上下文下发”这种默认机制句。
5. `pnpm test`（targeted + 全量）、`pnpm typecheck`、`pnpm verify` 绿；diff 不含 runtime/host 行为改动。
6. 红证：把任一修正字段还原（如 team context 改回 true）→ vendor-parity spec 红；还原即绿，原话留卡。

## 关闭条件

- 上述验收全过；审查记录写 `审查：agent｜用户｜跳过 — 理由`；卡顶补 `> **结论/去向**：implementation — <落点>`，同次归档。
- 若实现中发现 vendor pin 升级导致语义变化 → 先停，按新 pin 重核再改。

## 抽象度

- 换公司要改吗？→ 不会。修的是 DSH vendor 语义与通道分类，与公司无关。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 不会；只有 vendor pin/通道能力位变化才需要重核。
- 只有机制本身变才改吗？→ 是；这是机制事实纠偏，不是角色内容。
- 第二消费者（或单例例外）：Issue 2 的政策注入消费修正后的 `delegation-model`；所有读 docs 的角色/维护者。
- 搬家成本：低；事实落点就在模型/合同/文档原地改。
