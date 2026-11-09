---
status: 待落地
opened: 2026-11-09
---

# 推敲：presets 委派面的模型化重构（worker family + 链合同 + 图观测）

> 立卡：2026-11-09 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 本卡即实施载体；P1 起按垂直切片落地；代码在用户明确点名「开始 P1」后才动。
>
> 上游研究题：[preset 委派架构：盘点与结构性研究](../research/presets-delegation-architecture/README.md)（已定性）。
> 事实基线：[结论材料](../research/presets-delegation-architecture/2026-11-09-options-and-conclusion.md) +
> [DSH affordances](../research/presets-delegation-architecture/2026-11-09-dsh-affordances.md) +
> [组合实验](../research/presets-delegation-architecture/2026-11-09-composition-experiments.md) +
> [合同分布](../research/presets-delegation-architecture/2026-11-09-contract-duplication.md)；
> 上一轮修复的层契约见 [委派合同修复 Note](../../notes/implemented/2026-11-08-delegation-contract-repair.md)。

**问题与期望结果：** 当前 9 个 preset 是“隐式模型”：能力藏在插件行里，合同藏在角色 skill 里，通道差异散在政策散文与 docs 里；长链（CEO→VP-Eng→workflow→subagent，以及 VP-Eng→workflow→subagent）没有可执行的声明与统一观测。结果是：worker = 角色克隆、合同随修 bug 逐句膨胀、长链在半路撞 `maxDepth`、父会话只能看到自己直接起的 child。期望建立一个**显式的 capability / contract / composition 模型**，配 **worker family**、**链合同**、**静态矩阵 + 运行时图投影**；当前两条链可验收，未来新增链（如 VP-Sales 带副手）只加 delta/场景，不重做架构。

**当前情况：** 已读研究题八份材料、9 份 preset、host 的三个补丁工具（`list_subagents` / `send_to_subagent` / `workflow_runs`）与相关测试；基线 `pnpm verify` ALL PASS、`pnpm test tests/presets` 54/54 绿。关键事实：

- 9 preset / 1,515 行 / 186 个子行；6 个 full role 约 20–29 行，3 个 leaf 2–6 行。
- 四条通道的 preset 能力不同：`subagent`（spawn）支持 `agentPreset`；`subagent_fork` 明确不支持且继承父上下文；`workflow` 分支克隆父组合、无深度闸；`team` 成员继承 Lead。依据：[tool-subagent preset-selection](../../vendor/dsh/packages/subagent/tool-subagent/src/preset-selection.ts)、[fork provider](../../vendor/dsh/packages/subagent/subagent-fork-in-process/src/index.ts)、[workflow runtime](../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts)、[agent-team types](../../vendor/dsh/packages/experimental/agent-team/src/types.ts)。
- `maxDepth` 是**绝对深度**、散在各行：CEO 的 `vp_eng` 行是 1，VP-Eng 的 `subagent` 行是 2；CEO→VP→worker 刚好到顶。workflow 分支里再 spawn 的深度是继承还是 +1，源码不直观，必须探针。
- 控制面分三套：`list_subagents` / `workflow_runs` / team `send_message` 各看一段；没有一条混合链的统一视图。
- `eng-teaming`（5,121 字符）同时承担“五档方法”和“引擎合同”；其余角色与 worker 不会自动获得这份合同；“分支默认是叶子”是散文规则，不是引擎闸。
- 现有 `worker` 形态只有两种极端：leaf 子人格（researcher/SA/SQA）或 full role 克隆（通用 `subagent` 不钉 preset）。

**决定状态：** 设计项已按用户授权（长期正确 / 长期可维护 / 结构柔韧）拍定，见下「决定（按你的授权）」；只有**开工授权**（D7）和两处可被你否决的产品/预算项（D5/D6）留给你。

**下一步：** 用户 review「决定」表；若认可，明确说「开始 P1」后我才动 `packages/company-pack`、`docs/`、`tests/` 的生产面，并按 P1→P2→P3 开垂直切片卡。未点名开工前，本卡只是 `待落地`，不是实施授权。

## 范围与排除项

**目标范围（当前两条链）：**

1. **CEO 起头的长链**：CEO → `vp_eng`（命名 child）→ workflow 扇出 / subagent 嵌套，链的形状由问题决定。
2. **VP-Eng 起头的长链**：VP-Eng 根门 → workflow 扇出 / subagent 嵌套；研发更细，链可能更深。
3. **模型**：capability / contract / composition / archetype / worker profile / channel capability / depth budget / graph schema 的显式声明，且被测试消费。
4. **worker family**：`worker.leaf` 先落；`worker.orchestrator` / `worker.workflow` 的 profile 形状与升级路径同卡设计；`worker.full` 只留概念，不落。
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
| F2 | `subagent_fork` 继承父上下文与父组合，语义上是“带我上下文继续”，不是通用 worker | [fork provider](../../vendor/dsh/packages/subagent/subagent-fork-in-process/src/index.ts) |
| F3 | workflow 分支克隆父组合，无 `maxDepth` 闸；分支里再 spawn 的深度算法未证 | [workflow runtime](../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts) |
| F4 | team 成员继承 Lead 组合，不是角色 preset；控制名被团队版 shadow | [agent-team types](../../vendor/dsh/packages/experimental/agent-team/src/types.ts) + [delegation 合同](../../docs/delegation.md) |
| F5 | `maxDepth` 散在行上；CEO→VP→worker 到 2 层到顶 | [ceo preset](../../packages/company-pack/presets/ceo/agent.cordis.yml)、[vp-eng preset](../../packages/company-pack/presets/vp-eng/agent.cordis.yml) |
| F6 | 现有观测是分通道的；没有混合链的统一图 | `list_subagents` / `workflow_runs` / team roster |
| F7 | 共享 skill 目录机制已有先例（`_shared/skills/product-definition` 被 4 角色共用） | preset 的 `customSkillDirs` |
| F8 | host 插件可在 `agent/created` 注册 per-agent `systemPrompt.section` | [handbook.ts](../../packages/company-pack/src/host/handbook.ts)；`tool-workflow` 同款 |
| F9 | `--dump-config` 可读声明面，但不能进 `pnpm test`（`tests/` 禁子进程） | [layering.spec.ts](../../tests/harness/repo/layering.spec.ts) |

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

| 方向 | 为什么不做 |
|---|---|
| B. 只做 thin worker + 能力矩阵 | 解决不了长链；以后加长链时 worker 与合同要返工。 |
| C. 全局共享 skill / 全局常驻 section | 生命周期与作用域不对：所有角色为无关规则付 token，政策与引擎事实绑死。 |
| D. 现在就写生成器 | 固化未定型的模型；生成器是第二阶段。 |
| E. 维持现状，只写文档警告 | 能力面与观测都没变；警告不能替代结构。 |

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
| 维护面 | 本仓维护者 | [delegation 合同](../../docs/delegation.md) + [presets 合同](../../docs/presets.md) | 人读；链接到上面两个 owner，不复制 |

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

## 实施切片（批准后）

- **P1 模型 + 静态矩阵 + 测试资产拆分**：落地 delegation 模型（能力/合同/组合/archetype/worker profile/channel/depth）、worker leaf preset、vp-eng 的 `subagent` 钉 `agentPreset: worker.leaf`；模型 spec + 组合 spec；`preset-smoke` 加 worker 并泛化 shared skill 根；旧 presets spec 拆分/迁移。
- **P2 合同 + 探针**：独立 `_shared` delegation skill；engine section（按 `workflow` 工具存在性注入）；一次 policy skill 加载探针 + 一次 workflow 分支深度探针；据结果决定 `maxDepth` 是否提到 3；engine section 内容 spec 引用 vendor 合同钉子，不复制。
- **P3 图观测 + 链场景**：只读图投影 + 图 spec（录制事件）+ 两条链的链场景 smoke；不新增调度/控制；嵌套链事实从单通道 smoke 迁到这里。
- **P4 worker 升级**：按探针结果落 `worker.orchestrator` / `worker.workflow`；`allowedAgentPresets` 的默认与升级规则由 policy skill 约束。
- **P5 生成器（第二阶段）**：`/tmp` 原型 → 解析回读 + dump 比对 → 决定迁移；不在 P1–P4 承诺。
- **P6 上游 note**：team 成员 preset、workflow 子代 preset/depth、通道统一；只写提案。

## 验收标准

- 静态矩阵：模型文件 + YAML spec 覆盖 10 个 preset、worker profiles、channel 表、depth 预算；改一行 YAML 能让矩阵红。
- worker leaf：真 `session/create` 挂载零 broken；vp-eng 的 `subagent` 行 dump/解析出 `agentPreset: worker.leaf`；`subagent_fork` 无 `agentPreset`。
- 合同：六个 full role 挂 policy skill；只有含 workflow 的 preset 出现 engine section；探针证据说明“加载/未加载”，不写猜测。
- 图：两条链的录制事件能折叠出正确的节点/边/depth/terminal/address；重启后 `interrupted`/`lost` 可见。
- 检查：`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿；`preset-smoke` 真挂载；真模型只在有界探针里，不进 CI。
- 测试资产：模型 spec 是唯一期望源；旧 presets spec 拆分、preset-smoke 泛化、研究脚本退役/升格有清单；没有第四份期望矩阵。
- 文档：`docs/delegation.md` 与 `docs/presets.md` 同 diff 更新（注意预算已顶格，先压缩/搬迁）；同 diff 写 Note（决定、输掉的方案、验证）。

## 风险

- **模型过度抽象**：模型只保留 4 archetype / ~8 capability / 3 contract / 4 channel；超过这个规模就停下来重新评估。
- **worker 出现在 UI**：DSH 没有 hidden 标志；接受并标注“执行手（内部）”，或改用命名委托。这个取舍要在批准前定。
- **policy skill 不被加载**：fallback 是同一 host 插件注入短 section；不让“模型没加载”变成静默缺失。
- **section 能力探测失败**：fallback 是按 preset id 列表注入；仍在 host 层，不改 vendor。
- **深度算法与预期不符**：先探针、再改 `maxDepth`；不靠猜把链拉长。
- **图数据不完整**：先只投影已证明的事件；缺口如实标 `unavailable`，不伪造。
- **docs 预算**：`docs/delegation.md` 120/120、`docs/presets.md` 196/198；加内容前先压缩或搬去合同文件。
- **生成器保真**：注释/`!!js`/顺序；第二阶段用生成后回读 + dump 比对，不靠肉眼。
- **测试资产膨胀/重复**：模型 spec、组合 spec、dump smoke 三者都消费同一模型；发现第二份期望矩阵即停。
- **旧测试的假安全感**：旧 presets spec 硬编码 roster/row；不迁移就会在新 worker/链上继续绿但没证明。

## 决定（按你的授权）

**授权口径**：用户 2026-11-09 明确“希望长期做对的、长期可维护、结构柔韧”，并授权我替其拍板设计项。以下决定按这个口径做出；产品口味/预算/开工授权仍留给用户。

| # | 决定 | 依据 |
|---|---|---|
| D1 | worker 是 **family**：`worker.leaf` 默认；`allowedAgentPresets` 显式升级到 `worker.orchestrator` / `worker.workflow` | 默认窄防能力放大；family 保留长链可能；升级在图上可见，不靠散文 |
| D2 | 深度预算是**模型字段**；当前行先保持 2；用探针测 workflow/team 的真实深度算法；只有两条主场景需要时才把具体行提到 3 | 不把预算散在 9 份 YAML 拍脑袋；先测量再提额 |
| D3 | 图 schema 进 P1；只读图投影进 P3；两条链场景作为验收 | 模型从第一天就有图的位置；实现可分阶段，不阻塞静态矩阵 |
| D4 | 生成器是**承诺的第二阶段**；P1 模型字段为生成器设计；`/tmp` 原型 + 回读 + dump 比对是迁移门 | 项目会继续加角色/链；但不在模型未定前自动化 |
| D5 | 接受 worker 出现在 preset 选择器，标“执行手（内部）”，进 support preset | DSH 没有 hidden 标志；隐藏要加 client filter 或上游；标注是诚实且更简单的长期解 |
| D6 | 允许**一次**有界真模型探针（≤10 分钟）验证 policy skill 加载；失败则 fallback 到 host section | “模型会不会加载”不能靠猜；一次探针是最小可靠性证据 |
| D8 | 测试资产：模型 spec 为唯一期望源；旧 presets spec 拆分；preset-smoke 泛化；研究脚本退役/升格；测试宪法同 diff 更新 | 防止第四份期望矩阵；测试是变更的一部分，不是事后补 |

### 仍需你点头（不是设计题）

| # | 事项 | 为什么留给你 | 我的默认 |
|---|---|---|---|
| D7 | 是否现在开工 P1 | 卡不授权实施；这是授权，不是设计 | 等你明确说「开始 P1」 |
| D5 | worker 在 UI 可见 | 产品口味；可改为隐藏（需 client filter/上游） | 接受并标注 |
| D6 | 一次真模型探针 | 花时间/额度；可改为直接 section | 允许一次 |

## 关闭条件

- 用户 review「决定」表：认可则明确说「开始 P1」；否决则记录否决项与替代方向，本卡按否决结果改回 `等人拍板` 或归档。
- P1–P3 完成后：验证证据进本卡/Note，按 [_backlog 章程](../README.md) 归档；未完成前不写“已交付”。
