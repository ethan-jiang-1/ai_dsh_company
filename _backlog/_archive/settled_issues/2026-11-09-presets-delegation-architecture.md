---
status: 已结
opened: 2026-11-09
---

# 推敲：presets 委派面的模型化重构（worker family + 链合同 + 图观测）

> 立卡：2026-11-09 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> 审查：agent — 用户 goal 授权推进；语义审 0 blocker；残差（worker-workflow planned / P-H 真失败注入 / interrupted-lost 精确终态）见 Note。
>
> **结论/去向**：rfc — [notes/implemented/2026-11-09-presets-delegation-model.md](../../../notes/implemented/2026-11-09-presets-delegation-model.md)（已落 RFC；P1 核心 + P2 keyless 载体 + P-A/P-B/P-C/P-D/P-J 真探针 + P3 UI 首片 + 深度预算 + `subagent_retry` + `worker-orchestrator` 完成，P-H/P-I/生成器待切片；worker-workflow planned（P-K 已耗））。
>
> 上游研究题：[preset 委派架构：盘点与结构性研究](../../_archive/research/presets-delegation-architecture/README.md)（已定性）。
> 决策记忆（RFC）：[presets 委派面的模型化重构](../../../notes/implemented/2026-11-09-presets-delegation-model.md)（implemented；批准：用户 2026-11-09「开始推进」；P1 核心 + P2 keyless + P-A/P-B/P-C/P-D/P-J + P3 UI 首片 + 深度预算 + `subagent_retry` + `worker-orchestrator` 完成；`worker-workflow` 回 planned）。
> 事实基线：[结论材料](../../_archive/research/presets-delegation-architecture/2026-11-09-options-and-conclusion.md) +
> [DSH affordances](../../_archive/research/presets-delegation-architecture/2026-11-09-dsh-affordances.md) +
> [组合实验](../../_archive/research/presets-delegation-architecture/2026-11-09-composition-experiments.md) +
> [合同分布](../../_archive/research/presets-delegation-architecture/2026-11-09-contract-duplication.md)；
> 上一轮修复的层契约见 [委派合同修复 Note](../../../notes/implemented/2026-11-08-delegation-contract-repair.md)；vendor pin = `dsh-v0.2.1-rc.5`。

**问题与期望结果：** 当前 11 个 preset 是“隐式模型”：能力藏在插件行里，合同藏在角色 skill 里，通道差异散在政策散文与 docs 里；长链（CEO→VP-Eng→workflow→subagent，以及 VP-Eng→workflow→subagent）没有可执行的声明与统一观测。结果是：worker = 角色克隆、合同随修 bug 逐句膨胀、长链在半路撞 `maxDepth`、父会话只能看到自己直接起的 child。期望建立一个**显式的 capability / contract / composition 模型**，配 **worker family**、**链合同**、**静态矩阵 + 运行时图投影**；当前两条链可验收，未来新增链（如 VP-Sales 带副手）只加 delta/场景，不重做架构。

**模型行为/权限边界：** worker 只对 brief 负责；不能委派/组队/开 workflow/直接问用户；缺口回传父代理，判断留给父代理。policy/engine 合同未加载或不可见时，工具/图/UI 如实 `unavailable`，不伪造；图与 UI 只读，不控制。模型在不确定、拒绝或信息不足时应回报缺口而不是编造；重试由父代理按幂等性和预算决策，attempt/terminal 可见，不静默自动重试。人的判断只保留在 UI 可读性、长链是否可接受等品味面。

**当前情况：** 已读研究题八份材料、9 份 preset、host 的三个补丁工具（`list_subagents` / `send_to_subagent` / `workflow_runs`）与相关测试；基线 `pnpm verify` ALL PASS、`pnpm test tests/presets` 54/54 绿。关键事实：

- 9 preset / 1,515 行 / 186 个子行；6 个 full role 约 20–29 行，3 个 leaf 2–6 行。
- 四条通道的 preset 能力不同：`subagent`（spawn）支持 `agentPreset`；`subagent_fork` 明确不支持且继承父上下文；`workflow` 分支克隆父组合、无深度闸；`team` 成员继承 Lead。依据：[tool-subagent preset-selection](../../../vendor/dsh/packages/subagent/tool-subagent/src/preset-selection.ts)、[fork provider](../../../vendor/dsh/packages/subagent/subagent-fork-in-process/src/index.ts)、[workflow runtime](../../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts)、[agent-team types](../../../vendor/dsh/packages/experimental/agent-team/src/types.ts)。
- `maxDepth` 是**绝对深度**、散在各行：CEO 的 `vp_eng` 行是 1，VP-Eng 的 `subagent` 行是 2；CEO→VP→worker 刚好到顶。workflow 分支里再 spawn 的深度是继承还是 +1，源码不直观，必须探针。
- 控制面分三套：`list_subagents` / `workflow_runs` / team `send_message` 各看一段；没有一条混合链的统一视图。
- `eng-teaming`（5,121 字符）同时承担“五档方法”和“引擎合同”；其余角色与 worker 不会自动获得这份合同；“分支默认是叶子”是散文规则，不是引擎闸。
- 现有 `worker` 形态只有两种极端：leaf 子人格（researcher/SA/SQA）或 full role 克隆（通用 `subagent` 不钉 preset）。
- P1 核心完成证据（2026-11-09）：`pnpm test tests/presets` **82/82**；`pnpm test` **1285/158 files**；`pnpm typecheck` 绿；`preset-smoke` **ALL PASS**（6 角色 + 4 子人格，worker 真挂载）；`pnpm verify` **ALL PASS**。红配方：删 vp-eng 的 `agentPreset: worker` → `tests/presets` **2 failed / 80 passed**；还原 → **82/82 绿**。P1 核心完成；旧 spec 去重/P1b 完成；合同/P2–P5 待切片。
- P2 keyless 证据（2026-11-09）：policy skill 挂六 full role + 真挂载 skill catalog 绿；workflow-contract section host 插件 + 纯 spec 绿；`pnpm test` **1294/160 files**；`pnpm typecheck` 绿；`pnpm verify` **ALL PASS**；`preset-smoke` **ALL PASS**。真实 vp-eng section 注入 **PASS**（见下）；P-H 采用 PASS，P-H 真失败注入/P-I 未跑；P2 未完成。
- P2c 真模型探针（2026-11-09，`probes/team/delegation-contract-probe.mjs`，会话 `session-5b759133-68ad-4379-b649-031705f3fa13`）：P-A **PASS**——calls 含 `skill(eng-teaming)`、`skill(delegation-policy)`、2×`subagent`；P-B **PASS**——两个 child 首帧 `agentPreset=worker`，各 23 个工具，无 workflow/team/控制工具。P-H 采用 PASS；P-H 真失败注入/P-I 仍待。
- P2c 真深度探针（2026-11-09，`probes/team/delegation-depth-probe.mjs`，会话 `session-9100ca33-c313-4a04-a1db-ea3f4056e195` / `session-2fa6cb89-d3f2-4ea6-8db7-14fb1818acf4`）：P-C **PASS**——两个 workflow 分支 depth=1/preset=vp-eng，分支内 worker depth=2/preset=worker；P-D **PASS**——teammate depth=1/preset=vp-eng，成员内 worker depth=2/preset=worker。源码 parent+1 算法与真实行为一致。
- P3 UI 首片（2026-11-09）：`delegation-tree.ts` 纯模型 + **7** 条 spec（新增 CEO depth 0/1/2/3、VP depth 0/1/2 两条链场景）；`DelegationFlowPanel` 静态渲染 2 条 spec；接进现有 DagTab（九页签不变；流程列表加树形连接线：每层竖线 + 末级肘线），真页面 `ui-scene-smoke --isolated --golden` **ALL PASS**；金样已刷（同时收进一处既有 CMO 行漂移，非本次行为改动）。`pnpm test` **1310/163 files**；`pnpm typecheck` 绿；`pnpm verify` **ALL PASS**；`ui-scene-smoke --isolated --golden` 在加连接线后重跑 **ALL PASS**。终端终态仍标“以 host 图为准”，未伪造。
- `subagent_retry` host 原语（2026-11-09）：per-agent 仅五个有 generic subagent 的 full role；同步、最多 2 attempts、幂等门；keyless fake-subagents spec 6 条 + policy parity 6 条；`pnpm test` **1310/163**；`typecheck`/`verify`/`preset-smoke` 全绿。P-H 真失败注入仍待。
- worker-orchestrator（2026-11-09）：leaf + 小工头两档；vp-eng generic 行 `allowedAgentPresets: [worker, worker-orchestrator]`；`preset-smoke` 6 角色 + 5 support 全绿；P-J 真探针 **PASS**（child `worker-orchestrator` depth 1；两个 leaf `worker` depth 2；会话 `session-016a598c-4817-4104-bdb8-ede9fa76de75`）；`pnpm test` **1310/163**。
- `subagent_retry` 真实采用（2026-11-09，`probes/team/subagent-retry-probe.mjs`）：vp-eng 真调用 `subagent_retry`（非普通 subagent）；结果 `attempts=1` / `stopReason=completed` / `exhausted=false` / `output=retry-ok`；child `worker` depth 1（child `f0ea4735-3e9a-40bb-9980-3dea55842feb`）。**真实失败注入仍待**；fake-subagents 已覆盖所有失败分类。
- P2 section 注入（2026-11-09）：vp-eng 原始 `systemPrompt` 含完整 `# Workflow engine contract（随 DSH pin 更新）`（会话 `session-2fa6cb89-d3f2-4ea6-8db7-14fb1818acf4`）；CEO / worker / worker-orchestrator 同段零命中（负控）。section 确实 capability-scoped 到有 workflow 的 preset。
- worker-workflow（2026-11-09）：P-K 一次真实成功（child `1e3f5b79-0730-4537-9f4b-2266ae663d2d` preset=worker-workflow depth 1；两分支 `2bd5f650…`/`1468db0f…` depth 2；workflow 2 agents/wf-ok）；更强 persona 后仍多次 child preset 正确但未跑 workflow。按质量门槛 **整片回退到 planned**（preset/patch/support/docs/composition 移除），probe 已耗，保留原始失败/成功证据。
- 深度事实（2026-11-09，源码）：`workflow-ptc` 的 `startChild` / `agent-team` 的 `roster.spawn` 都走 `startActivation(parent)` → 深度 parent+1；workflow 无独立 depth 闸但行级 `maxDepth` 仍生效；vp-eng 通用 `subagent`/`subagent_fork` 已提 3，其他 full role 仍 2。P-C/P-D 真行为已 PASS。

**决定状态：** 设计项已按用户授权（长期正确 / 长期可维护 / 结构柔韧）拍定。用户 2026-11-09 追加：**UI 可见/流程/状态是硬要求，现有 UI 不能破坏、要尽量利用；探针要多次、预算足够；授权开工、静默自主。** P1 核心 + P2 keyless 载体 + P-A/P-B/P-C/P-D/P-J 真探针 + P3 UI 首片 + 深度预算（vp-eng 3）+ `subagent_retry`（含真实采用 P-H）+ `worker-orchestrator` + `worker-workflow` 回 planned（P-K 采用不稳定）+ P2 section 注入 + P3 树形连接线 + P1b 去重完成；P-H/P-I 真失败注入、生成器待切片。

**确认与未知：** 设计决定、UI/探针口径与开工授权已由用户 2026-11-09 确认；U1–U6 是待探针的事实，不是待人的选择；其余无悬而未决的人的选择。未证事实不得写成已证；每条探针按假设取证。

**下一步：** P1 核心 + P2 keyless 载体 + P-A/P-B/P-C/P-D 真探针 + P3 UI 首片 + 深度预算完成。P2c 余项：P-H 真失败注入（采用已 PASS）、P-I closed（host 不自动重试）；P4 worker 升级（`subagent_retry` + `worker-orchestrator` 已落；`worker-workflow` planned）；P5 closed（不生成）。每个切片独立验收、独立关闭；证据进本卡/Note。

## 范围与排除项

**目标范围（当前两条链）：**

1. **CEO 起头的长链**：CEO → `vp_eng`（命名 child）→ workflow 扇出 / subagent 嵌套，链的形状由问题决定。
2. **VP-Eng 起头的长链**：VP-Eng 根门 → workflow 扇出 / subagent 嵌套；研发更细，链可能更深。
3. **模型**：capability / contract / composition / archetype / worker profile / channel capability / depth budget / graph schema 的显式声明，且被测试消费。
4. **worker family**：`worker.leaf` / `worker.orchestrator` 已落；`worker.workflow` 待切片；`worker.full` 只留概念，不落。
5. **合同**：公司委派政策（共享 skill）与 DSH 引擎合同（capability-scoped prompt section）分层；角色方法 skill 改为引用，不再复制。
6. **观测 + 测试资产**：静态矩阵（YAML 声明面）+ 运行时只读图投影（节点/边/通道/深度/状态/终态/地址）+ 两条链的场景验收；测试资产按“模型/组合/挂载/合同/图/行为/演进”重排，旧 spec/smoke 迁移或退役有清单。
7. **未来扩展缝**：新增链/角色 = 新增 archetype 或 delta + 模型条目 + 场景 spec；不要求为未来链提前实现。

**不做（本轮明确排除）：**

- 不实现 VP-Sales 或其他未来角色的长链；只记录扩展缝。
- 不实现生成器（第二阶段）；本卡只记录它的输入约束与保真风险。
- 不在本仓实现 team 成员 preset、workflow 子代 preset/depth、三通道统一控制面；这些是上游提案，最多写一张 note。
- 不改 `vendor/dsh/`；不造平行 workflow/team 引擎；不把真模型塞进 CI。
- 不把 `list_subagents` / `send_to_subagent` / `workflow_runs` 从补丁升格为“正式控制面”；它们仍是带退役条件的偏离。
- 不在本卡批准前改生产代码；本卡是决策票，不是实施授权。

## 已知与未决

### 已知（事实）

| # | 事实 | 依据 |
|---|---|---|
| F1 | 只有 `subagent`（spawn）能按行钉 `agentPreset`；fork/workflow/team 不能 | vendor 源码 + 研究 affordance 材料 |
| F2 | `subagent_fork` 继承父上下文与父组合，语义上是“带我上下文继续”，不是通用 worker | [fork provider](../../../vendor/dsh/packages/subagent/subagent-fork-in-process/src/index.ts) |
| F3 | workflow 分支克隆父组合，无 `maxDepth` 闸；分支里再 spawn 的深度算法未证 | [workflow runtime](../../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts) |
| F4 | team 成员继承 Lead 组合，不是角色 preset；控制名被团队版 shadow | [agent-team types](../../../vendor/dsh/packages/experimental/agent-team/src/types.ts) + [delegation 合同](../../../docs/contracts/delegation.md) |
| F5 | `maxDepth` 散在行上；CEO→VP→worker 到 2 层到顶 | [ceo preset](../../../packages/company-pack/presets/ceo/agent.cordis.yml)、[vp-eng preset](../../../packages/company-pack/presets/vp-eng/agent.cordis.yml) |
| F6 | 现有观测是分通道的；没有混合链的统一图 | `list_subagents` / `workflow_runs` / team roster |
| F7 | 共享 skill 目录机制已有先例（`_shared/skills/product-definition` 被 4 角色共用） | preset 的 `customSkillDirs` |
| F8 | host 插件可在 `agent/created` 注册 per-agent `systemPrompt.section` | [handbook.ts](../../../packages/company-pack/src/host/prompt/handbook.ts)；`tool-workflow` 同款 |
| F9 | `--dump-config` 可读声明面，但不能进 `pnpm test`（`tests/` 禁子进程） | [layering.spec.ts](../../../tests/harness/repo/layering.spec.ts) |

### 未决（需要 spike，不是拍脑袋）

| # | 未知 | 影响 | 探针 |
|---|---|---|---|
| U1 | workflow 分支里 spawn 的 `delegationDepth` 是继承还是 +1 | 决定长链能否到 3 层 | 一次真会话日志 |
| U2 | team 成员的 delegation depth / 能否再 spawn | 决定 team 中间链是否可行 | 一次真会话日志 |
| U3 | `allowedAgentPresets` 在模型侧的可选性/误选率 | 决定 worker family 的默认策略 | 一次模型选择观察 |
| U4 | 图投影能否从现有事件完整折叠 | 决定图视图的数据源与测试形状 | 录制事件 + 纯函数 |
| U5 | 共享 policy skill 是否被模型加载 | 决定 policy 载体是否要升 section | 一次真模型探针（≤10 分钟） |
| U6 | 生成器的注释/`!!js`/顺序保真 | 决定第二阶段是否值得 | 第二阶段 `/tmp` 原型，不在本轮 |

## 方案与取舍

### 选定方案（A）：模型 + worker family + 两层合同 + 图观测

**一句话**：把“隐式预设”变成“可执行模型 + 投影 + 观测”。当前只验收两条长链（CEO 起头、VP-Eng 起头）；未来链只加 delta/场景，不重做架构。

**为什么是它**：它同时解决四个结构问题——worker=角色克隆、合同随 bug 漂移、长链半路断、父会话看不见整条链；且不碰 vendor、不造平行引擎。它的展开在下面「目标形状（A 的展开）」；测试资产的重排见「测试资产架构」。

### 不选的方向（一句话）

| 方向 | 代价 | 为什么不做 |
|---|---|---|
| B. 只做 thin worker + 能力矩阵 | 省掉 P1 的一部分，但长链要返工 worker/合同 | 解决不了长链；以后加长链时 worker 与合同要返工。 |
| C. 全局共享 skill / 全局常驻 section | 文件少；但所有角色付 token，政策与引擎事实绑死 | 生命周期与作用域不对：无关角色为规则付 token，升 pin 会改公司 skill。 |
| D. 现在就写生成器 | 一次投入大；注释/`!!js` 保真风险高 | 固化未定型的模型；生成器是第二阶段。 |
| E. 维持现状，只写文档警告 | 零代码；但能力面与观测不变 | 警告不能替代结构与证据；长链仍半路断。 |

## 目标形状（A 的展开）

### 四层

```
Composition（角色 / archetype / capability / contract）   ← 静态、可执行
        ↓ 投影
Preset YAML（自包含运行期组合）
        ↓ 运行
Channel（spawn / fork / workflow / team）                  ← 能力表
        ↓ 组合
Delegation Graph（节点 / 边 / 深度 / 状态 / 终态 / 结果）  ← 运行期只读投影
        ↓ 证据
Observation（静态矩阵 / 图 spec / 场景 / 探针）
```

模型的落点 = 一个可执行的 delegation 模型（待建） + 三个消费者：静态 spec、dump smoke、图 spec。YAML 是投影，不是源；模型至少含 archetype / capabilities / contracts / channels / depthBudget / workerProfiles。任何一个消费者都不许再写一份期望矩阵。

### channel 能力表（当前 pin；未知标“待探针”）

| 通道 | 子代身份 | `agentPreset` | 上下文 | 深度 | 控制/寻址 |
|---|---|---|---|---|---|
| `subagent`（spawn） | 全新 child | 支持 | 不继承父对话 | 父 +1 | `list_subagents` / `send_to_subagent`（按 session id） |
| `subagent_fork` | 父的克隆 | 不支持 | 继承父对话 | 父 +1（待确认） | 同上 |
| `workflow` | 分支 clone | 不支持 | fresh 克隆 | 无闸；实际算法待探针 | `workflow_runs`（按 run id） |
| `team` | teammate | 不支持 | 继承 Lead 组合 | 待探针 | team `send_message`（按成员名） |

### worker family

| profile | 能力 | 用途 | 深度预算 |
|---|---|---|---|
| `worker.leaf` | fs / bash / web / todo / compaction；无 subagent/team/workflow/control | 取证、盘点、测算；只回证据 | 0 |
| `worker.orchestrator` | leaf + `subagent`（depth 1）；无 team/workflow | 小工头，带 1–2 个叶子手 | 1 |
| `worker.workflow` | leaf + workflow 两行；无 subagent/team | 并行扇出取证 | 0（分支默认叶） |
| `worker.full` | 完整角色组合 + 显式 budget | 受信任子负责人；本轮不落 | 按预算 |

`tool-subagent` 原生支持 `allowedAgentPresets`：默认最窄，模型可按任务升级；升级条件写进 `delegation-policy`。

### 合同分层

| 合同 | owner | 载体 | 作用域 |
|---|---|---|---|
| `policy.delegation` | 公司教义 | 共享 skill（`_shared` 下的独立 delegation 目录） | 所有有委派能力的 full role |
| `engine.workflow` | DSH pin | capability-scoped prompt section（只在有 workflow 的 preset 注入） | 有 workflow 的组合 |
| `engine.subagent` | DSH pin | 视探针结果：短 section 或并入 policy skill | 有 subagent 的组合 |
| 维护面 | 本仓维护者 | [delegation 合同](../../../docs/contracts/delegation.md) + [presets 合同](../../../docs/contracts/presets.md) | 人读；链接到上面两个 owner，不复制 |

**policy skill 内容**：通道表、何时用哪条、brief 四要素、effort 预算、控制/寻址、结果可读性、链设计（先扁平后嵌套、每条边有结果契约、父只控制直接子代、失败按图对账）。**engine section 内容**：schema 子集、分支 null、截断/spill、重启、嵌套 workflow/subagent 的已知语义。两者都不长（policy < 2k 字符；engine section 10–15 行）。

### 图投影

**节点**：id、role/preset、parentId、channel、depth、status、terminal、address、result（路径/摘要）。
**边**：from/to、channel、tool、depth、result。
**数据源**：父会话 durable `subagent/catalog`、`tool-workflow/*`、`workflow_runs`、team roster、child 的 `turn/end`。
**边界**：只读投影，不调度、不取消、不写状态；控制仍用现有工具。它回答“链现在长什么样、哪里断了”，不替模型做决定。

### 两条主验收场景

1. **CEO 链**：CEO → `vp_eng`（spawn，depth 1）→ workflow 扇出 → 分支 → `subagent`；图应显示节点/边/通道/深度/终态；若 depth 3 被拒，按 channel 表与预算如实报“到顶”，不伪装成功。
2. **VP-Eng 链**：VP-Eng 根门 → workflow 扇出 → 分支 → `subagent`；图应显示分支与 child 的归属；重启后 `interrupted`/`lost` 如实可见。

### 演进缝

| 变化 | 落在哪 | 谁证明 |
|---|---|---|
| 新增角色 | role delta + 模型条目 | 静态矩阵 |
| 新增 worker 类型 | profile + delta | 静态矩阵 |
| 新增长链 | 场景 spec + 图投影 | 图 spec/录制场景 |
| 新增能力 | capability + 行 + 合同作用域 | 静态矩阵 + dump smoke |
| 升 DSH pin | engine contract 文本 + owner | dump smoke + 探针 |
| 新增通道 | channel 表 + 适配器 | 矩阵（引擎层走上游） |

## 重试（subagent 失败）

**原则**：重试必须**可见、有界、按幂等性判断**；不做静默自动重试。subagent 是 activation（异步通知），失败不能靠“父代理应该会看到”来兜底；workflow 是“必须可重试/可聚合”的可靠通道，subagent 是 best-effort。

| 终态 | 是否重试 | 理由 |
|---|---|---|
| `error` | 幂等任务重试一次 | 模型/传输失败；可能是一次性 |
| `interrupted` / `lost` | 幂等任务重试一次 | 宿主重启/结果丢失；先确认 child 不在跑 |
| `refusal` | 不重试 | 是合法回答/边界，不是故障 |
| `aborted` | 不重试 | 取消/用户意图，不是故障 |
| `max-tokens` | 不自动重试 | 重试大概率再撞；缩任务/提预算/换模型，交给人或父代理 |
| `completed` | 不重试 | 已完成 |

**机制（按优先级）**：

1. **父代理有界重试**：用 `list_subagents` 的 `lastTurnEnd` 分类；幂等任务最多再派一次，带 `attempt:2` label；仍失败记 `exhausted`，不启动第三次；两次 attempt 都在图/UI 可见。
2. **workflow 可靠通道**：批量、必须成功、要聚合/交叉核对的活走 workflow；脚本内显式 `missing`/`exhausted`，不靠隐藏重试。
3. **`subagent_retry` host 原语（已落）**：per-agent 注册，只在五个有 generic subagent 的 full role；同步等终态、最多 2 attempts、幂等门、attempts/childIds/stopReason/exhausted 可见；不是全局工具，worker/leaf/CEO 不挂；长/批量仍走 workflow。keyless fake-subagents spec 覆盖 completed/error→success/error→error/refusal/aborted/max-tokens/非幂等/start 失败；真实失败注入探针仍待。
4. **禁止**：静默自动重试、无限重试、对 `refusal`/`aborted` 重试、把 `max-tokens` 当普通 error、重试非幂等写操作。

**模型**：[delegation-model.mjs](../../../tools/lib/delegation-model.mjs) 的 `RETRY` + `retryDecision` 是纯决策；spec 覆盖 error/interrupted/lost、refusal/aborted/max-tokens、非幂等、exhausted、workflow 对照。

**探针**：P-H 采用已 PASS（真实调用 `subagent_retry`，attempts=1/completed/worker depth 1）；P-H 真失败注入（分类型重试）与 P-I（workflow 重试/`missing` 对照）仍待。预算足够，但每个探针先写假设与判据。

## 深度事实与预算

**源码事实（2026-11-09，vendor 只读）**：

- `workflow-ptc` 的 `startChild` 用 `subagents.startActivation({ parent })` 起分支 → 分支深度 = parent+1；workflow 引擎**没有独立 depth 闸**，但每个 activation 仍受行级 `maxDepth` 约束。
- `agent-team` 的 `roster.spawn` 也用 `startActivation({ parent: root })` → teammate 深度 = Lead+1；成员继承 Lead 组合。
- 因此：CEO（0）→ `vp_eng`（1）→ workflow 分支（2）→ `subagent` worker（3）；VP-Eng 根（0）→ 分支（1）→ worker（2）。

**决定（D11）**：vp-eng 的通用 `subagent` / `subagent_fork` 行 `maxDepth` 从 2 提到 **3**，支撑 CEO→VP→workflow→worker 长链；SA/SQA/vp_cmo 命名行仍 2；其他 full role 的通用两行仍 2；worker leaf 无委派。模型、preset、docs、测试同 diff 更新。

**证据边界**：源码事实 + P-C/P-D 真行为已 PASS（2026-11-09：分支/成员 depth=1、worker depth=2、preset=worker）；P-H 采用已 PASS，P-H 真失败注入与 P-I 仍待。不把源码事实写成“CEO depth=3 已跑”——那需要 CEO 会话，当前由预算 + P-C 推算。

## 测试资产架构（与模型同轮设计）

这次重构不是“代码改了、补几条 spec”。它改变了测试资产的组织轴：旧轴 = **实现面**（`tests/company` / `client` / `presets` / `harness`）+ **执行成本**（keyless / smoke / probe / replay）；新轴 = **被证明的对象**（模型 / 组合 / 挂载 / 合同 / 图 / 行为 / 演进），执行成本降为第二轴。

### 证明地图

| 要证明什么 | 资产 | 层 | 怎么消费模型 | 何时跑 |
|---|---|---|---|---|
| 模型 = 唯一期望源（能力/合同/组合/通道/深度） | tests/presets 的模型 spec（纯） | keyless | 直接 import 模型 | `pnpm test` |
| 组合 = 模型的投影（YAML 行/配置） | tests/presets 的组合 spec（纯） | keyless | 模型 + YAML 解析 | `pnpm test` |
| 真实挂载 = worker/preset 能起 | `preset-smoke`（加 worker） | 真入口 | 模型的 preset 清单 | 改 preset 时 |
| 声明面 = loader 真看到的组合 | `preset-matrix-smoke`（dump） | 真 CLI | 模型 | 改组合/升 pin |
| 合同 = policy 挂载/加载；engine section 只在有能力处 | policy 探针（一次）+ section 读取 | 真模型/真装配 | 模型的 contract scope | 一次性证据 |
| 图 = 节点/边/深度/终态/地址 | tests/company 的图投影 spec（纯，录制事件） | keyless | 模型 + 事件 | `pnpm test` |
| 链 = 两条真实形状 | 链场景 smoke（录制/真会话） | 真入口 | 模型 + 场景 | 机制档 |
| 行为 = 模型按 policy 选通道/升级 profile | 窄探针（一次） | 真模型 | policy skill | 一次性证据 |
| 演进 = 生成物 = 模型投影 | 生成物 round-trip spec（第二阶段） | keyless | 模型 + 模板 | 第二阶段 |

### 旧资产的处置

| 旧资产 | 现状 | 处置 |
|---|---|---|
| `tests/presets/presets.spec.ts` | 硬编码 `ROLES` / 行断言 | 拆成模型 spec + 组合 spec；角色清单从模型来；保留独立字面量只做“模型没被删角”的冗余校验 |
| `checks/smoke/preset-smoke.mjs` | support presets 硬编码；shared skills 单根 | 加 worker；shared root 泛化为多根（delegation 独立目录） |
| `checks/smoke/delegation-smoke.mjs` | 只测命名 child `vp_eng` | 保留；新增 generic `subagent` → worker.leaf 的锚点 |
| `checks/smoke/workflow-contract-smoke.mjs` | 单通道引擎事实 | 保留为机制钉子；嵌套链事实移到链场景/图 spec |
| `tests/harness/contract/*` | 钉 vendor 语义 | 不搬家；engine section 的内容 spec 引用这些钉子，不复制 |
| 研究脚本 composition-matrix / dump-presets / contract-terms | 证据脚本 | 可复算部分升 `tools/lib` 或 tests；只读快照随研究题归档退役 |
| `tests/README.md` 改动面表 | 按实现面组织 | 同 diff 更新：新增“模型/合同/图”行；预算 100/100，先压缩或搬 `docs/testing.md` |
| `docs/testing.md` 九层证明边界 | 层定义 | 补“模型层/图投影层”的证明边界；不重复 tests/README 的命令 |

### 四条测试纪律（沿用并加强）

1. **模型是唯一期望源**：spec/smoke 只能消费它，不能各自再写一份期望矩阵。
2. **tests/ 保持 keyless**：dump、真挂载、真模型探针放 `checks/` 或 `probes/`；`tests/` 禁子进程的门禁不动。
3. **真装配优先**：fake service 不证明真实服务在场（042 教训）；图投影用真实事件/录制，不造假事件。
4. **证据分层**：声明面/挂载/机制/行为各自报告；不把“挂载绿”写成“长链行为绿”。

## UI 面（必须保留并利用）

**原则**：UI 是验收面，不是附属品。现有面不拆、不重写；新流程/状态视图接现有槽位/页签/卡片。先纯视图模型，再静态渲染，最后真页面；不把浏览器/模型塞进 `pnpm test`。

**必须保留的现有面**（改动前先跑对应最窄检查）：

- 任务看板 / 依赖图：[company-panels.tsx](../../../packages/company-pack/src/client/tabs/company-panels.tsx) 的 `BoardPanel` / `DagPanel`；对应 [board-panel.spec.ts](../../../tests/client/tabs/board-panel.spec.ts)、[dag-panel.spec.ts](../../../tests/client/tabs/dag-panel.spec.ts)。SVG 的定位/动画分层、transform 缩放、双 marker、无 foreignObject 都是事故钉，不许动。
- 任务表 / 页签容器：[TasksPanel.tsx](../../../packages/company-pack/src/client/tabs/TasksPanel.tsx)、[company-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-tabs.tsx)、[company-tab-registration.ts](../../../packages/company-pack/src/client/tabs/company-tab-registration.ts)；对应 `tasks-table.spec.ts`、`company-tabs-body.spec.ts`。
- 委派卡：[DelegationCard.tsx](../../../packages/company-pack/src/client/ui/DelegationCard.tsx) + [delegation-keys.ts](../../../packages/company-pack/src/client/wiring/delegation-keys.ts) + [delegation-card.spec.ts](../../../tests/client/ui/delegation-card.spec.ts)、[client-face.spec.ts](../../../tests/client/wiring/client-face.spec.ts)（key ↔ toolName 逐字一致）。
- Team 工具卡/面板：[TeamToolCard.tsx](../../../packages/company-pack/src/client/ui/TeamToolCard.tsx) + 官方 `ui-agent-team` 的 Team 按钮/roster/任务板；不替换、不 shadow。
- 公司与培养页签：[DeliverablesTab.tsx](../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx)、[LedgerTab.tsx](../../../packages/company-pack/src/client/tabs/LedgerTab.tsx)、[AttentionTab.tsx](../../../packages/company-pack/src/client/tabs/AttentionTab.tsx)、[CultivationTab.tsx](../../../packages/company-pack/src/client/tabs/CultivationTab.tsx)；不因新图改布局/令牌。
- 金样/冒烟：[client-css.spec.ts](../../../tests/client/ui/client-css.spec.ts)、[style-lifecycle.spec.ts](../../../tests/client/ui/style-lifecycle.spec.ts)、[client-load-smoke.mjs](../../../checks/smoke/client-load-smoke.mjs)、[ui-scene-smoke.mjs](../../../checks/smoke/ui-scene-smoke.mjs)、[snapshots](../../../snapshots)。

**新增视图（尽量利用现有机制）**：

- **数据面**：host 只读 `delegation_graph`（P3）→ client 纯视图模型 → 现有页签中的一个“委派/流程”面板；不新建顶层页、不新建独立路由。
- **视觉**：复用 `StateDot`/`Tag`、`--dsw-*` 令牌、`DagPanel` 的 SVG 纪律（transform 缩放、定位/动画分层、无 foreignObject、双 marker）；不引 mermaid/图表库。
- **状态**：`running` / `inactive` / `completed` / `interrupted` / `lost`；节点显示 role/preset、channel、depth、terminal、address；边显示 spawn/fork/workflow/team。
- **交互最小集**：点节点看详情/地址；控制仍走现有工具；刷新/投影更新文案说真话（不假装轮询）。
- **集成点（按 UI 盘点定）**：落在现有 **DagTab 体内**（[company-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-tabs.tsx) 的依赖图页签）加一个 `DelegationFlowPanel` 区；**不开第十页签、不开新顶层页、不用 `conversation.session.header.lineage`**（single，会被 `ui-subagent` 顶掉）。九页签目录/金样保持不变，只在 DagTab 体内加区并同 diff 刷金样；备选 PresenceTab 体内。
- **客户端数据边界**：client 只有 sessions/team 投影；depth/terminal/lost/workflow 段在 host 工具里。P3 必须补一个 **host 只读索引/remote**（`useWorkspaceText` 模式或新投影），不能靠 parentId 硬折把“缺失”说成状态；缺数据标 `unavailable`。
- **新纯模型**：packages/company-pack/src/lib/delegation-tree.ts（待建，sessions → 节点/边/深度/终态）；tests/client/data/delegation-tree.spec.ts（待建）；`DelegationFlowPanel` 静态渲染 spec；`ui/styles.ts` 新类 + reduced-motion。
- **测试**：`tests/client` 纯视图模型 + 静态渲染 + CSS/样式生命周期；`client-load-smoke` 零挂载失败；`ui-scene-smoke --isolated --golden` 真页面/金样；视觉夹具按需。所有 UI 改动同 diff 刷金样。

## 探针计划（多次，质量优先）

用户已明确：探针不止一次，预算足够。探针不是“跑一次绿”，而是按假设取证；每次记录假设、命令、会话 id、观察、结论、未覆盖。真模型/真浏览器不进 CI。

| # | 假设 | 证据 | 何时 |
|---|---|---|---|
| P-A | policy skill 会在委派前被加载 | 真模型会话 transcript 的 skill 调用 | P2 |
| P-B | worker family 的 profile 选择符合 policy（leaf/orchestrator） | P-J 真行为 PASS（2026-11-09：orchestrator depth 1 / leaf depth 2） | P2/P4 |
| P-C | workflow 分支的 depth 算法符合模型（继承还是 +1） | 源码 + 真行为 PASS（2026-11-09：分支 depth=1/worker depth=2） | P2 |
| P-D | team 成员的 depth / 能否再 spawn 符合 channel 表 | 源码 + 真行为 PASS（2026-11-09：成员 depth=1/worker depth=2） | P2 |
| P-E | 图投影在两条主链上节点/边/终态正确 | 录制事件 + 真会话 | P3 |
| P-F | UI 的流程/状态视图在真页面正确、不破坏现有页签 | `ui-scene-smoke` / CDP 视觉探针 + 金样 | P3 |
| P-G | 重启后 interrupted/lost 在图与 UI 都可见 | 真重启会话 + 图/UI | P3/P4 |
| P-H | subagent 失败只重试一次，refusal/aborted/max-tokens 不重试，attempt 可见 | `subagent_retry` 真实采用 PASS（2026-11-09：attempts=1/completed/worker depth 1）；真失败注入待 | P2/P4 |
| P-I | workflow 的 error/null 可重试、exhausted 不第三次，与 subagent 对照 | fake workflow provider（已有 workflow-contract-smoke 先例） | P2 |

规则：每个探针先写假设与判据；跑够证据就收，不用次数凑；失败/未触发如实记；每次证据落本卡/Note，不落 CI；预算不设一次上限，但每次记录耗时与轮次。

## 实施切片（已授权）

- **P1 模型 + 静态矩阵（核心完成）**：落地 delegation 模型（能力/合同/组合/archetype/worker profile/channel/depth）、worker leaf preset、vp-eng 的 `subagent` 钉 `agentPreset: worker`；模型 spec + 组合 spec + retry spec；`preset-smoke` 加 worker；worker 手册跳过（host 配置 + spec）。旧 presets spec 去重/P1b 完成；shared skill 根泛化/P2 完成。
- **P2 合同 + 探针**：独立 `_shared` delegation skill；engine section（按 `workflow` 工具存在性注入）；P-A/P-B/P-C/P-D 探针已跑；据结果把 vp-eng 通用两行提到 3；engine section 内容 spec 引用 vendor 合同钉子，不复制。
- **P3 图观测 + UI + 链场景**：只读图投影 + 图 spec（录制事件）+ 两条链的链场景 smoke；DagTab 体内的流程/状态面板（复用 DagPanel 纪律，九页签不变）+ UI 视图模型/静态渲染/金样/client-load/ui-scene；不新增调度/控制；嵌套链事实从单通道 smoke 迁到这里。
- **P4 worker 升级**：`worker.orchestrator` 已落（P-J 真行为 PASS）；`worker.workflow` 结构已落（preset-smoke 6+6），真实采用不稳定（P-K 一次成功、后续未跑 workflow，probe 已耗）；`allowedAgentPresets` 的默认与升级规则由 policy skill 约束。
- **P5 生成器（第二阶段，closed by decision）**：不建生成器；模型是期望源、YAML 是 authored source、composition spec 是 parse-back/dump；生成器会丢 persona/注释/isolate/`!!js`。
- **P6 上游 note**：team 成员 preset、workflow 子代 preset/depth、通道统一；只写提案。

## 验收标准

> 判据按 [validation-design](../../methods/validation-design.md)：每条承载行为都有类别、输入/状态、通过/失败信号、反例/恢复、证据 owner、人的判断。命令未跑时写“待跑”，不写“绿”。

| 承载行为 | 类别 | 输入/状态 | 通过信号 | 反例/恢复 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|
| 模型 = 唯一期望源 | 确定性 | `delegation-model.mjs` + 11 份 preset YAML | `pnpm test tests/presets` 的模型/组合 spec 全绿；`modelProblems()` 空 | 删 vp-eng 的 `agentPreset: worker`、把 worker 移出 patch/roster、或给 worker 加回 subagent 行 → 对应断言红；还原绿 | `pnpm test tests/presets` | 无 |
| worker 真挂载 | 编排 | 已建 pack + dev home/profile | `preset-smoke` 零 broken；worker + worker-orchestrator 的 `session/create` 成功 | worker 行 config 缺必填、未进 roster → preset-smoke 红 | `node checks/smoke/preset-smoke.mjs` | 无 |
| loader 声明面 = 模型 | 编排 | 真实 `--dump-config` | preset-matrix-smoke 的 10 个 preset 与模型一致 | 改一行 YAML 不同步 → 红；还原绿 | preset-matrix-smoke（待建，P1/P2） | 无 |
| 合同可见性 | 模型行为 + 编排 | 六个 full role + vp-eng 真会话 | policy skill 被加载/尝试；engine section 只在 vp-eng；未加载时 fallback section | policy 未加载 → fallback；section 不在 → 红；不得静默缺失 | P-A/P-B 探针 + P2 section 真 systemPrompt（2026-11-09） | 规则是否被遵守（定性） |
| subagent 失败重试 | 模型行为 + 编排 | `retryDecision` 纯模型；`subagent_retry` 的 fake-subagents；P-H 真失败注入待 | error/interrupted/lost + 幂等 + attempt 1 → 允许一次；attempt 2 → exhausted；attempt/terminal 可见 | refusal/aborted/completed/max-tokens/非幂等 → 不重试；重试后仍失败 → exhausted 不第三次 | `tests/presets/delegation-retry.spec.ts` + `tests/host/delegation/subagent-retry.spec.ts`；P-H 真探针待 | 重试是否恰当（定性，必要时人） |
| 两条长链的图 | 编排 | CEO→VP→workflow→subagent；VP-Eng→workflow→subagent 的录制或真事件 | 节点/边/channel/depth/terminal/address 正确；重启后 interrupted/lost 可见 | 硬折 parentId 把“缺失”说成状态 → 红；缺数据标 unavailable | 图 spec + 链场景（待建，P3） | 无（结构）；链是否符合预期由人抽检 |
| UI 流程/状态 | 编排 + 人的判断 | 真页面 DagTab 体内 | 九页签不变；流程/状态可见；`tests/client` + client-load + ui-scene/金样绿 | 金样未刷新、槽位变化、DAG 事故钉破 → 红 | `pnpm test tests/client`、client-load-smoke、ui-scene-smoke --isolated --golden（P3） | 可读性/信息密度（用户） |
| 测试资产迁移 | 确定性 + 过程 | 模型/组合/树/retry specs；旧 content spec 去重 2 条 | 模型 spec 是唯一期望源；旧断言退役有理由；无第四份矩阵 | 第二份期望矩阵、重复 spec → spec-duplicates/spec 红 | `pnpm test tests/presets` 89 + `pnpm verify` | 旧 content spec 仍保留内容/唯一结构断言 |

## 下游交接

- **请求类型**：`rfc`（已批准、未实施）。不是 `implementation`：本变更有真实备选与持久取舍，决策记忆住 RFC。
- **落点**：[presets 委派面的模型化重构](../../../notes/implemented/2026-11-09-presets-delegation-model.md)（RFC 已落；`批准：` 标记 + `## 验收` 节已在）。
- **提交记录**：2026-11-09 向用户提交；用户确认设计、UI/探针口径并授权开工（「开始推进」）。
- **Note 必要性/形态**：notes owner 按 [notes/README §二](../../../notes/README.md) 判定——存在真实备选 + 持久取舍 → 落 `notes/proposed` RFC，不写成收据。RFC 正文拥有决策记忆；本卡拥有问题、范围、证据指针与交接记录，不复制 RFC 正文。
- **后续 owner**：P1–P5 垂直切片拥有实施与验收；RFC/Note 拥有决策记忆；本卡作为程序伞卡保留到切片交接完成（或用户叫停）。下游验收不阻塞本卡的 backlog 关门。

## 风险

- **模型过度抽象**：模型只保留 4 archetype / ~8 capability / 3 contract / 4 channel；超过这个规模就停下来重新评估。
- **worker 出现在 UI**：DSH 没有 hidden 标志；D5 已定为接受并标注“执行手（内部）”，进 support preset；若改变主意，走 D5 回退（隐藏需 client filter 或上游）。
- **policy skill 不被加载**：fallback 是同一 host 插件注入短 section；不让“模型没加载”变成静默缺失。
- **section 能力探测失败**：fallback 是按 preset id 列表注入；仍在 host 层，不改 vendor。
- **深度算法与预期不符**：先探针、再改 `maxDepth`；不靠猜把链拉长。
- **图数据不完整**：先只投影已证明的事件；缺口如实标 `unavailable`，不伪造。
- **docs 预算**：`docs/contracts/delegation.md` 120/120、`docs/contracts/presets.md` 196/198；加内容前先压缩或搬去合同文件。
- **生成器保真**：注释/`!!js`/顺序；第二阶段用生成后回读 + dump 比对，不靠肉眼。
- **测试资产膨胀/重复**：模型 spec、组合 spec、dump smoke 三者都消费同一模型；发现第二份期望矩阵即停。
- **旧测试的假安全感**：旧 presets spec 已去掉 2 条矩阵重复；保留内容/唯一结构；新 worker/链由 model/composition/树 specs 守。
- **UI 回归**：新图接现有页签可能动到 DagPanel/看板/委派卡布局/令牌；先跑对应 client spec + client-load + ui-scene；不同 diff 刷金样。
- **探针变刷次数**：每个探针先写假设/判据；证据够就收；不把“跑了很多次”当质量。
- **重试重复副作用/循环**：只对幂等任务重试；最多 1 次；attempt/terminal 可见；refusal/aborted/max-tokens 不自动；不启动第三次。

## 决定（按你的授权）

**授权口径**：用户 2026-11-09 明确“希望长期做对的、长期可维护、结构柔韧”，并授权我替其拍板设计项；同日追加 UI 可见/探针多次/开工授权。以下决定已确认；没有悬而未决的人的选择；U1–U6 是待探针的事实。

| # | 决定 | 依据 |
|---|---|---|
| D1 | worker 是 **family**：`worker.leaf` 默认；`allowedAgentPresets` 显式升级到 `worker.orchestrator` / `worker.workflow` | 默认窄防能力放大；family 保留长链可能；升级在图上可见，不靠散文 |
| D2 | 深度预算是**模型字段**；当前行先保持 2；用探针测 workflow/team 的真实深度算法；只有两条主场景需要时才把具体行提到 3 | 不把预算散在 9 份 YAML 拍脑袋；先测量再提额 |
| D3 | 图 schema 进 P1；只读图投影进 P3；两条链场景作为验收 | 模型从第一天就有图的位置；实现可分阶段，不阻塞静态矩阵 |
| D4 | 生成器是**承诺的第二阶段**；P1 模型字段为生成器设计；`/tmp` 原型 + 回读 + dump 比对是迁移门 | 项目会继续加角色/链；但不在模型未定前自动化 |
| D5 | **UI 可见是硬要求**：保留现有 Team/任务板/依赖图/委派卡/公司页签/培养面；流程/状态落现有 DagTab 体内，不开第十页签/新顶层页；worker 在 preset 选择器可见并标注“执行手（内部）” | 用户 2026-11-09 明确“UI 可见非常重要，包括流程、状态”；现有 UI 资产多，破坏成本高；利用 DagTab 比新页签少动五处门禁 |
| D6 | 探针**多次**，预算足够；至少覆盖 policy skill 加载、worker profile 选择、链深度、图状态、UI 流程；每次留证据，不塞 CI | 用户 2026-11-09 明确“探针肯定需要，而且不止一次，预算足够”；质量优先，不用一次绿掩盖未覆盖 |
| D7 | 用户 2026-11-09 授权开工；P1 起按垂直切片实施，静默自主 | 用户明确“开始推进吧”；卡已 `待落地`，开工授权已给 |
| D8 | 测试资产：模型 spec 为唯一期望源；旧 presets spec 去重；preset-smoke 泛化；研究脚本退役/升格；测试宪法同 diff 更新 | 防止第四份期望矩阵；测试是变更的一部分，不是事后补 |
| D9 | UI 测试与金样同 diff：现有 `tests/client`、`client-load-smoke`、`ui-scene-smoke`/金样/视觉探针不能因新视图变红；新增视图模型先纯函数测试，再真页面；九页签目录不变 | UI 是验收面；先纯函数后页面，符合本仓测试分层；DagTab 内加区仍会改金样，必须同 diff 刷 |
| D10 | 重试是 capability/contract：父代理有界重试（幂等 error/interrupted/lost，最多 1 次）；refusal/aborted/completed 不重试；max-tokens 不自动；workflow 是可靠替代；`subagent_retry` 已落（D12） | 用户明确 subagent 会失败、workflow 更可靠；静默自动重试会重复副作用/隐藏失败；可见、有界、幂等才长期可维护 |
| D11 | 深度预算：workflow 分支/team 成员 = parent+1（`startActivation`）；vp-eng 通用 subagent/fork = 3，其他 full role = 2 | 源码 fact（workflow-ptc `startChild` / agent-team `roster.spawn`）；CEO→VP→workflow→worker 需要 depth 3；命名专家行保持 2 |
| D13 | P5 不生成 YAML：模型是期望、YAML 是 authored source、composition spec 是 parse-back；生成器会丢 persona/注释/isolate/`!!js` | 写入内容不是模型字段；生成器风险 > 收益；P5 第二阶段不落 |
| D14 | P-I：workflow 的 retry/missing 在脚本层，host 不自动重试；`RETRY.workflow` 已声明 | 自动 host 重试会隐藏失败/重复副作用；workflow 是可靠通道，不是 retry wrapper |
| D12 | 落 `subagent_retry` host 原语：per-agent 仅五个有 generic subagent 的 full role；max 2 attempts；幂等门；attempts/childIds/stopReason/exhausted 可见；worker/leaf/CEO 不挂 | 用户明确要重试机制；静默重试不可接受；确定性 host 原语比纯 policy 可靠，且只调官方 `startActivation` |

### 用户追加授权（2026-11-09）

| 事项 | 用户决定 | 落地含义 |
|---|---|---|
| UI | 可见性硬要求；流程/状态要能看；现有东西不能破坏、尽量利用 | P3 必须接现有槽位/面板；UI 测试/金样/冒烟纳入验收 |
| 探针 | 多次；预算足够；质量优先 | P2–P4 按假设跑多轮；每次记录证据；不设“一次上限” |
| 开工 | 明确授权“开始推进”；静默自主、克服障碍 | P1 立即开工；卡不再等点头 |

## 关闭条件

- 结论已由用户 2026-11-09 确认（设计/UI/探针/开工）；RFC 已落 `notes/proposed`；下游请求类型 `rfc` 与落点已记录。
- 按 [issue-to-note](../../methods/issue-to-note.md)：backlog 结论与请求已交接即可关门；下游验收不阻塞关门。本卡选择保留为程序伞卡到 P1–P3 切片交接完成；切片/RFC 拥有后续验收。
- 若用户否决某项：记录否决项与替代方向，按否决结果改回 `等人拍板` 或归档；不写“已交付”。
