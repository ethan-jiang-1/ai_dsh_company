---
status: 已结
opened: 2026-11-09
---

# 推敲：worker family 与 specialist 的边界（researcher / SA / SQA）

> 立卡：2026-11-09 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 用户批准方案 A；全门禁绿
>
> 后续：SA/SQA 已退役，见 [退役卡](2026-11-09-retire-sa-sqa.md)。
>
> **结论/去向**：note — [退役 Note](../../../notes/implemented/2026-11-09-retire-sa-sqa.md)。
>
> 审查：agent — 用户批准方案 A；P-L 真探针 + 全门禁绿；去向 = Note。
>
> 批准：用户 2026-11-09 同意推荐方案 A；按本卡迁移。去向：note — [specialist/worker 边界 Note](../../../notes/archived/2026-11-09-specialist-worker-taxonomy.md)。
>
> 上游设计卡：[presets 委派面的模型化重构](./2026-11-09-presets-delegation-architecture.md)；已交付决定：[presets 委派面的模型化重构](../../../notes/implemented/2026-11-09-presets-delegation-model.md)。
>
> 本卡方案 A 已获用户批准；本次变更按切片迁移，Note 记录决定与证据。

**问题与期望结果：** 新模型已经有 `worker` family 与 `leaf` archetype，但 `researcher` / `system-architect` / `system-qa` 三个旧 preset 仍以“子人格/角色”的旧叙事存在：模型里都是 `leaf`、`contracts: []`，看不出 `researcher` 的只读能力、SA 的 domain skill、SQA 的独立 veto。期望把三者收进一套**不新旧并存**的边界：generic 执行归 worker family；有独立方法/职权的归 specialist；删掉混装的 `leaf`。

## 当前证据

### 工具与合同面

| | `researcher` | `system-architect` | `system-qa` | `worker` |
|---|---|---|---|---|
| 工具面 | fs 只读（`write:false/edit:false`）+ fs-search + web + todo | fs + fs-search + todo + `tool-skill` | fs + fs-search + todo + `tool-skill` | fs + bash + web + todo + compaction |
| 专属 skill | 无 | `systems-architecture` | `vv-playbook` | 无 |
| 委派通道 | 无 | 无 | 无 | 无 |
| 职权 | 无；只交证据 | V 模型左侧架构产出 | V 模型右侧独立验证 + veto | 无 |
| 父级入口 | CEO `subagent_research` | CEO/vp-eng `system_architect` | CEO/vp-eng `system_qa` | vp-eng generic `subagent` |
| 模型 archetype | `leaf`，`contracts: []` | `leaf`，`contracts: []` | `leaf`，`contracts: []` | `worker` |

具体文件：[researcher](../../../packages/company-pack/presets/worker-researcher/agent.cordis.yml)、system-architect（已随 SA/SQA 退役删除）、system-qa（已随 SA/SQA 退役删除）、[worker](../../../packages/company-pack/presets/worker/agent.cordis.yml)、[worker-orchestrator](../../../packages/company-pack/presets/worker-orchestrator/agent.cordis.yml)、[模型](../../../tools/lib/delegation-model.mjs)。

### 调用面

- CEO 的 `subagent_research` 行钉 `agentPreset: researcher`；CEO/vp-eng 的 `system_architect` / `system_qa` 行钉对应 specialist（[ceo](../../../packages/company-pack/presets/ceo/agent.cordis.yml)、[vp-eng](../../../packages/company-pack/presets/vp-eng/agent.cordis.yml)）。
- 本机 session 首帧计数（含测试/探针，非生产遥测）：`researcher` 100、SA 56、SQA 56、worker 25、worker-orchestrator 8。
- 同批日志里的实际 `tool/call` 计数：`system_architect` 17、`system_qa` 17、generic `subagent` 90、`subagent_fork` 3；`subagent_research` **0**。这不是“researcher 无用”的证明，只说明它当前没有真实调用证据，折叠成本较低。
- `presets.spec` 仍有 researcher/SA/SQA 的 52 条内容回归；`preset-smoke` 6+5；`delegation-composition` 仍把它们当 `leaf`。

### 模型缺口

- 新模型的 `COMPOSITIONS` 只看 channels / genericSpawn / depth / control / workflow；三者都是 `leaf`，`contracts: []`。模型**看不见**只读能力、skill、authority。
- 文档/测试/人格仍在讲“子人格”“不是第五个角色”“veto”，这些事实没有进入模型；这就是新旧并存的根。
- `namedDelegates` 只记工具名，不记目标 preset；模型不知道 `subagent_research` 指向 `researcher`，也不知道 `system_architect` 指向 specialist。

## 选项与取舍

### A（推荐）：worker-researcher + specialist

- `researcher` → `worker-researcher`：只读 worker profile（fs 只读 + fs-search + web + todo；无 bash/compaction/skill/职权），named-only，不作为 generic worker 暴露；CEO 的 `subagent_research` 改钉它；删除 `researcher` 顶层 preset。
- `system-architect` / `system-qa` → `archetype: 'specialist'`：保留 preset 与 YAML，模型新增 `skills`（`systems-architecture` / `vv-playbook`）和 `authority`（`architecture` / `veto`）；无 channel、无 control、无 workflow、非 worker profile。
- 删除 `leaf` archetype；四类为 `lead / full / specialist / worker`。
- 模型新增 `namedProfiles`（工具名 → 目标 preset）和 worker profile `exposure: 'named' | 'generic'`；CEO 的 `subagent_research` 显式指向 `worker-researcher`；SQA 的 veto 成为模型字段，不再只住 persona。
- specialist 的 domain skill/authority 不是新的“第三层合同”；`CONTRACTS` 仍是 policy/engine 两层，authority 是 specialist 的字段，skill 是内容。

### B：三者都留 specialist

`researcher` 加一个 `research` skill，升为 specialist。问题是它当前没有 skill、没有职权，只有只读能力；把它升 specialist 会把“generic 只读执行”伪装成“专业方法”，继续和 worker family 混。

### C：三者都变 worker profile

`system-architect` / `system-qa` 变 worker profile。问题是 SQA 的独立 veto、SA 的 V 模型方法与产出责任会退化成 prompt/技能文本，制度性独立消失；不推荐。

### D：保持 leaf 不动

现状；模型继续看不见只读/skill/authority，旧 leaf 与新 worker family 并存；正是本次要消除的债。

## 推荐方案 A 的切片

1. **模型**：`WORKER_PROFILES` 加 `worker-researcher`（named-only、只读）；`COMPOSITIONS` 删除 `researcher`、加 `worker-researcher` worker 组合；SA/SQA 改 `specialist` 加 `skills`/`authority`；`namedProfiles` 进 CEO/vp-eng；`modelProblems` 校验：specialist 必须有 skills；worker-researcher 必须无写/无 bash；namedProfiles 目标必须存在；删除 `leaf`。
2. **preset**：新增 `presets/worker-researcher/agent.cordis.yml`（只读 fs + fs-search + web + todo；persona 短；无 skill/compaction）；删除 `presets/researcher/`；CEO `subagent_research` 行改 `agentPreset: worker-researcher`；SA/SQA YAML 只改注释中“子人格”措辞，工具/skill 不动。
3. **测试**：`delegation-composition` 增 `specialist` 形状与 `namedProfiles` 派生；`delegation-model` 增 specialist/worker-researcher/namedProfiles 断言；`presets.spec` 的 researcher 断言迁到 worker-researcher（只读仍是硬断言）；`preset-smoke` 预期 6+5。
4. **文档**：`docs/contracts/presets.md` roster 的 researcher 行并入 worker 行（`worker / worker-researcher / worker-orchestrator`），SA/SQA 标 specialist；`docs/contracts/delegation.md` 表更新 `subagent_research` 目标；`packages/company-pack/README.md` 的角色清单同步；`docs/contracts/presets.md` §四形态的“子人格”改 specialist。
5. **验证**：`pnpm test tests/presets`；`preset-smoke` 6+5；真实 CEO → `subagent_research` 探针验 child `agentPreset=worker-researcher` 且无 write/bash；`pnpm test`/`typecheck`/`verify`/`lint`/`dup` 全绿。红配方：删 worker-researcher 的 patch、把 CEO 行改回 researcher、给 specialist 留 channel、把 SQA authority 删掉——对应 spec/门禁应红。

## 未决问题

1. `worker-researcher` 是否允许 vp-eng generic `allowedAgentPresets` 使用？推荐 **named-only**（只给 CEO 的 `subagent_research`），避免把只读调研能力变成 generic 默认；若需要 vp-eng 只读研究，另开一行。
2. SA/SQA 的 `authority` 是否需要更多值（如 `signoff` / `architecture` / `veto`）？本卡只落 `architecture` / `veto`；新增值走模型 spec。
3. 是否保留 `researcher` 作为 preset 的 alias 过渡一轮？推荐不保留；alias 只会延长新旧并存。

## 验收标准

- `pnpm test tests/presets` 绿；模型/composition/presets 三类 spec 覆盖 `worker-researcher`、`specialist`、`namedProfiles`、无 `leaf`。
- `preset-smoke` 6 角色 + 5 support 全绿；CEO `subagent_research` 的 child 首帧 `agentPreset=worker-researcher` 且无 write/bash。
- `pnpm test`、`pnpm typecheck`、`pnpm verify`、`pnpm lint`、`pnpm dup` 全绿；vendor 零改动。
- 红配方：把 CEO 行改回 `researcher`、给 specialist 留 channel、删 SQA `authority`、给 worker-researcher 加 bash——对应 spec/门禁应红。

## 关闭条件

方案 A 获批并实施后，以下全绿才可关闭：

- 模型/组合/内容 spec 全绿；`preset-smoke` 6+5；`pnpm test`/`typecheck`/`verify`/`lint`/`dup` 全绿。
- `researcher` 从 `PRESET_IDS`/patch/support/docs 消失；`worker-researcher` 真挂载且 CEO 行指向它。
- SA/SQA 的 `skills`/`authority` 进模型并由 spec 守；`leaf` archetype 不再出现。
- 真实 `subagent_research` 探针 PASS（child preset + 只读工具面）；未跑则标未验，不关闭。
