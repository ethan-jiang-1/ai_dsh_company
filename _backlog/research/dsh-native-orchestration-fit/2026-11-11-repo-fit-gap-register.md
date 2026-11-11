---
topic: 本仓编排面的原生贴合度：需求映射与 GAP 登记
intent: 对照原生基线逐项检查公司角色的通道/合同/能力面，区分已确认 GAP、有意偏离与需求待证项；只做研究，不改代码、不跑真模型
---

# 本仓编排面的原生贴合度

> 读法：§1 需求映射；§2 做对的地方；§3 G1–G12 登记；§4 优先级与下一步；§5 未证与边界。
> 基线 = [2026-11-11-native-baseline.md](2026-11-11-native-baseline.md)。本页的“已确认”只指静态证据（源码/合同/模型对得上）；行为层的“模型会不会这样做”另标待证。

## 0. 一句话

**机制层是原生形状，合同/能力面层不是。** 本仓没有自造调度器：角色 = preset、命名委托 = spawn + `agentPreset`、team 任务板不自动派工、workflow 是脚本扇出、观测是只读投影、证据分层也在跑。GAP 集中在“谁看得见哪条通道、哪条规则住哪个载体、深度/上下文到底是什么意思”这几层：共享政策描述了许多角色没有的通道，手写通道矩阵与 vendor 语义有一处相反，`maxDepth` 注释把“行上限”写成“链上限”，team 上下文被写成继承父对话，A/B/C/D 与原生四通道双轨，引擎事实混进政策，一个 workflow 观测工具全局可见。**这不是“中心调度器 vs 原语”的黑白问题；是“原生原语用对了，但合同没有按能力面收口”的灰问题。**

## 1. 公司的编排诉求 → 当前载体 → 原生对应

| 诉求 | 当前载体 | 原生对应 | 贴合度 |
|---|---|---|---|
| 多职能动议（CEO + 四 VP、任务板、互审、持续追加） | Agent Teams（`spawn_teammate`），CEO 根 = Lead | team：Lead + 具名成员 + 任务板 + 邮箱 | 贴合；代价是成员继承 Lead 组合，角色是软隔离 |
| 单职能快捷出稿（一份稿、一个职能） | 命名委托 `vp_eng` / `vp_sales` / `vp_cmo` / `coo` / `cfo` | spawn + `agentPreset` | 贴合；这是 DSH 唯一能给子代独立 preset 的通道 |
| 研发并行取证（≥3 同构分支、要聚合/异常） | 仅 VP-Eng 的 `workflow` + `subagent` | workflow 脚本扇出 + spawn | 通道用对；但只在一个角色，见 G7 |
| 独立复核（做的人不是验的人） | VP-Eng 的 `quality_loop_produce` / `quality_loop_verify` 两条命名行 | spawn + 两个薄 preset，严格串行 | 贴合；但只覆盖研发，见 G7 |
| 长期动议（跨天、journal、session_search） | team 持久会话 + activation 完成通知 + journal | team 持久性 / goal 跨轮续跑 | 部分；`goal` 装了但没政策，见 G8 |
| 角色隔离（工具/skills/KB 各自一套） | 每角色一个 preset；team 成员继承 Lead；命名 child 用角色 preset | preset = 会话级组合；只有 spawn 能钉独立 preset | 贴合；team 的角色差异是已知软隔离，见 G10 |
| 观察（谁生了谁、终态、任务 DAG） | `delegation-tree` + `companyDelegationTerminal` 投影 + 官方 `agentTeam` 投影 | 只读投影；`ready` 不派发 | 贴合；见 §2 |
| 自主节律（定期复盘/重估） | 六角色 `tool-schedule`，persona 点名 | schedule（wall-clock 提醒） | 通道用对；与 P3 的“人工在场”有张力，见 G8 |
| 交付（成品声明、账本） | `present` + host 账本 | `present` | 非编排面，不展开 |

**结论**：需求侧不需要一个中心 executor；现有载体大体是原生原语。真正的缺口是“每个角色到底有哪些通道、政策是否跟着能力走”。

## 2. 做对的地方（先记账，避免把整棵树推倒）

1. **角色 = preset，不是插件包**：`docs/architecture.md` 的组合层与 `presets/<role>/agent.cordis.yml` 自包含声明，符合 DSH 的 preset 模型；没有自造身份层。
2. **命名委托用 spawn + `agentPreset`**：`vp_eng` / `vp_sales` / `vp_cmo` / `coo` / `cfo` 都钉了角色 preset；这是 DSH 唯一能给子代独立组合的通道，用对了。
3. **team 任务板不被当成调度器**：`board.ts` 是只读读模型，`ready` 只表示依赖完成，不自动派工；CEO 必须自己分派。符合“没有中心 executor”的源码事实。
4. **观测是只读投影**：`delegation-tree.ts` 明确 `unavailable` 不伪造；`companyDelegationTerminal` 只折 `turn/end.reason.kind`；`workflow_runs` 只读父会话 durable 记录。没有把投影写成状态源。
5. **深度真值表直接引 vendor**：`tests/harness/contract/delegation-depth-truth-table.spec.ts` 调 `resolveChildDepth`，钉住“绝对深度、按行上限”。这是本仓证据层做得最硬的一处。
6. **重试不静默**：`subagent_retry` 有幂等门、attempt 可见、深度不另立预算、取消收敛、退役条件；`subagent-retry` 不是自动重试引擎。方向符合“重试是父侧有界策略”。
7. **偏差有账**：`delegation-control` / `workflow_runs` / `subagent_retry` 都在头注写了“为什么存在 / 代价 / 退役条件”，符合原生“补控制面要登记偏离”的兜底模式。
8. **关键 skill 在 pruner 阈值内**：实测 code points `delegation-policy` 2,596 / `assembling-the-team` 5,306 / `eng-teaming` 4,737，均 < 8,192；没有把关键结论放在会被 `tool-result-pruner` 裁掉的中段。（注意：`wc -c` 的字节数会误导；pruner 与 `delegation-contract.spec` 都按 code points 算。）

这些是本仓的“原生贴合面”。下面的 GAP 不否定它们，只指出合同层没有跟上机制层。

## 3. GAP 登记

### G1 · 共享政策描述了角色没有的通道（已确认，高）

**事实**

- `delegation-policy` 由六个公司角色共同加载（各 preset 的 `customSkillDirs` 都含 `_shared/delegation/skills/`；persona 也点名“委派前先加载”）。
- 政策表列出四条通道：`subagent` / `subagent_fork` / `workflow` / `team`（`SKILL.md:11`-`16`），§7 还讲 `subagent_retry`。
- 实际能力面（`tools/lib/delegation-model.mjs` 的 `COMPOSITIONS`）：
  - `workflow` 只在 `vp-eng`；
  - `subagent_fork` 在 CEO 没有；
  - `team` 只有根会话是 Lead；CEO 的命名 child（vp-eng 等）不是 member，不能 `spawn_teammate`；
  - `subagent_retry` 只在五个有通用 `subagent` 行的 full role，CEO 不挂。
- 也就是说：CEO 读得到“fork / workflow / retry”，但三样都没有；VP-Sales / COO / CFO / CMO 读得到“workflow”，但都没有；命名 child 的 VP 读得到“team”，但它不是 Lead。

具体到行：`SKILL.md:13` 讲 spawn（CEO 有命名行，但没有通用 spawn）；`:14` 讲 fork（CEO 无）；`:15` 讲 workflow（只有 vp-eng 有）；`:16` 讲 team（只有根/Lead 有）；`:63` 讲 `subagent_retry`（CEO 不挂，`retrySurface` 只收 full role 的通用 `subagent` 行）。

**为什么是 GAP**

原生原则是“按能力存在性注入”：没有该工具的 preset 不需要那段文字，否则是 token 税，还会诱导模型调用不存在的工具。本仓已经把 `workflow` 的**引擎段**做成了能力域注入（`src/index.ts:125` 只给 `vp-eng` 注册 `company:workflow-contract`），但**政策段**仍是角色泛化的一份。这是同一棵树上的两种注入哲学。

**已有旁证**

- 2026-11-09 探索轮已经把“其他 full role 的 policy 加载”列为**未覆盖**（`_backlog/_archive/research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md` §1.4）；本轮静态对账把这个缺口坐实。
- `delegation-model` 已有逐 preset `channels`，但政策文本没有消费它；模型与政策各说各的。

**怎么证 / 选项**

- 静态：从 `COMPOSITIONS[*].channels` 生成“你的通道”一行，放进各 preset 的 persona 或 capability section；或把政策拆成 core + 每通道 section，由 host 按 preset 注入。
- 行为：自然型探针——给 COO/CMO 一个 ≥3 同构任务，不点名通道，看它是否尝试 `workflow`（能力面里没有）或退回 `subagent`。一次只证一个假设。
- 不建议：给所有角色都挂 workflow 来“让政策成真”；那是用能力面迁就文本，见 G7。

### G2 · `maxDepth` 心智模型：把“行上限”写成“链上限”（已确认，高）

**事实**

- CEO 的五条命名行都 `maxDepth: 1`（`presets/ceo/agent.cordis.yml:213` 等）。
- CEO preset 的注释写：“`maxDepth: 1` ⇒ 职能 child 不能再往下派活（禁止平级派活）”（`:190`）。
- 但 vendor 的 `maxDepth` 是**这一行的 child 绝对深度上限**：`resolveChildDepth(parent, maxDepth)` 只看 `parent depth + 1`；child 自己再用它自己 preset 的行，行上限是另一份（`vendor/dsh/packages/subagent/subagent/src/depth.ts:20`-`35`；`tool-subagent/src/index.ts:320`-`327`）。
- 因此：CEO(0) → `vp_eng`(1) 是允许的；vp-eng child 用自己 preset 的 `subagent` 行（`maxDepth: 3`）再派 worker(2)，仍然允许。本仓自己的政策 §6 与 `eng-teaming` 也写了这条链：“CEO→VP-Eng(1)→workflow(2)→worker(3) 需要 VP-Eng 的 `subagent` 预算 3”（`delegation-policy:53`；`eng-teaming` 的“三个门”段）。**注释与政策互相矛盾，政策是对的。**
- `tests/presets/presets.spec.ts:234` 的断言消息“禁止 VP→VP 平级派活”也只检查了 CEO 行上的 `maxDepth: 1`，没有证明 child 不能派活；这是一条**假保证**的测试文案。

**为什么是 GAP**

这不是“文档措辞”问题，而是把 DSH 的绝对深度语义读成了“每层预算”。它会导致两种错误决策：① 以为 CEO 的 1 已经封死 VP 的子委派，于是不再检查 vp-eng 行；② 想禁止某条链时去调 CEO 行，实际拒绝发生在 child 自己的行上（原生陷阱 #7“抬一个预算救另一层”）。本仓的深度真值表是对的，但合同层没有把这个正确语义带到 CEO 注释/测试文案。

**怎么证 / 选项**

- 修正 CEO preset 注释与 `presets.spec.ts` 的文案：`maxDepth: 1` = 直接 child 的绝对深度上限，不限制 child 的再委派；再委派由 child 自己 preset 的行决定。
- 如果产品意图真的是“命名 child 不能再派活”，那需要给命名 child 换一份更薄的 preset（spawn 是唯一收窄杠杆），而不是靠父行 `maxDepth`；当前 `vp_eng` 的 preset 带着 `subagent` / `workflow` / 命名行，所以它一定能再派。
- 增加一条组合层测试：断言 `vp_eng` 行的 `maxDepth` 与 `vp-eng` preset 的 `subagent` 行同时存在，并在注释里写清“这条链靠两行共同放行”；不要再用“禁止平级派活”这种跨行承诺。

### G3 · team 上下文：默认 fresh，不是“继承父对话”（已确认，中）

**事实**

- `delegation-model.mjs:66`-`72` 把 `team.inheritsParentContext` 写成 `true`，注释说“继承 Lead 组合”。
- 政策表把 team 的“上下文”写成“继承 Lead 组合”（`SKILL.md:16`）——把**组合继承**塞进了**上下文**列。
- `docs/contracts/delegation.md:81` 写“`fork` 把会议上下文下发给新成员”；`docs/guides/budget-and-ops.md` 也把“fork teammate 下发会议上下文”当省钱杠杆。
- vendor 的 `spawn_teammate`：`context` 枚举 `fresh|fork`，**默认 `fresh`**；`fresh` = 不带 Lead 历史（`vendor/dsh/packages/experimental/tool-agent-team/src/index.ts:61`、`:208`；工具描述原文“Defaults to fresh”）。
- 本仓没有任何 `context: 'fork'` 的调用/指令（全仓搜索零命中）；CEO 的组队 skill 走的是“先落任务书，再 spawn”，任务书在**当前轮**，而 fork 只带**已完成轮**——所以即使传 `fork`，当前任务书也不在种子里。团队实际靠任务书承载上下文，不是靠 fork。

**为什么是 GAP**

模型里的 `true` 是**硬能力断言**，但 team 的上下文是可选参数；把它写成 true 会让人以为“成员天然知道会议上下文”。docs 把 fork 写成既定机制，但技能没有让 CEO 传 fork；预算指南的“省钱杠杆”在当前组队流程里不成立。结果是合同/模型/技能三处对同一件事有三种说法。

**怎么证 / 选项**

- 模型字段改成 `context: 'fresh'|'fork'`（或 `inheritsParentContext: 'optional'`），并注明默认 fresh；不要再把组合继承写进 context。
- docs 改成“默认 fresh；要带 Lead 已完成轮时显式 `context: 'fork'`；当前任务书不在 fork 种子里，仍要靠 prompt/文件”。
- 如果确实想用 fork 省 token：把任务书放在**上一轮**写完并结束，再在下一轮 spawn 时传 fork；或者继续用 fresh + 任务书（当前做法），把预算指南的 fork 句改成“可选，不是默认”。
- 行为探针：给 CEO 一个多成员动议，观察 `spawn_teammate` 的参数是否出现 `context`，以及成员是否知道当前任务书；一次只证“默认 fresh 是否被模型正确理解”。

### G4 · 通道分类双轨：A/B/C/D vs 原生四通道（已确认，中）

**事实**

- `docs/architecture.md:37`-`44` 的“协作通道（四条）”= A 命名委托 / B Agent Teams / C dsh-sdk 子进程 / D Workflow；`docs/reference/terminology.md:16` 同一套。
- C（dsh-sdk）当前六角色未使用（`_backlog/_archive/research/org-coordination-topology/2026-11-10-org-coordination-topology.md` §“另有 dsh-sdk 子进程通道”）；A/B/D 是**组织用法**分组，不是 DSH 的能力轴。
- `tools/lib/delegation-model.mjs:46`-`73` 与 `delegation-policy` 用的是原生四通道 spawn/fork/workflow/team；fork 在 A/B/C/D 表里没有位置。
- 更细一层：`CHANNELS.*.control` 写的是本仓的控制面（`list_subagents` / `send_to_subagent` / `workflow_runs`），不是 vendor 的通道能力（原生是 `send_message` / `interrupt_agent` / run 返回值）。这个字段没有测试消费者，但它把“本仓 workaround”写成了“通道硬能力”，会误导下一次升级。
- 两套分类的粒度不同：原生四通道按“子代身份 / 独立 preset / 上下文 / 深度 / 控制”分；A/B/C/D 按“公司怎么用”分。混读会漏掉 fork，也会把“命名委托”和“team”当成互斥的两条，而实际上它们共享 spawn 底座。

**为什么是 GAP**

这是“第二份模型”：同一件事有两个名字系统，且其中一个（A/B/C/D）不覆盖 fork、包含未使用的 C。原生原则要求能力面由通道决定；用组织标签替代能力轴，会让“某角色有没有 fork/team”这种问题无法从文档直接回答。

**怎么证 / 选项**

- 以原生四通道为**能力矩阵**；A/B/D 只作组织别名（A = spawn 命名行，B = team，D = workflow），C 标“未启用的外部 provider 通道”，不放进主表。
- 或者保留 A/B/C/D，但加一列“原生通道 + 能力位”，并明确 C 不是当前公司面。
- 这不是机制改动，是文档/术语收口；`docs/reference/terminology.md` 是术语映射的唯一家，适合先改。

### G5 · 引擎事实混进政策，且重试/工作流事实多载体（已确认，中）

**事实**

- `delegation-policy` 开头写“不要在这里复述 DSH 引擎细节（schema 子集/截断/重启），那些在 workflow-contract section”（`SKILL.md:7`），但 §5 又写了 workflow 的“分支只回一行 JSON / schema 只给单次 agent”和“null 不等于没有结果”；§7 写了 subagent 终态分类（error/interrupted/lost/refusal/aborted/completed/max-tokens）与重试上限。
- `content/contracts/workflow.md` 是 `delegation-model` 里 `engine.workflow` 声明的载体（`CONTRACTS['engine.workflow'].carrierPath`），它已经写了同一套 schema/结果/失败规则；政策里的 workflow 段是第二份。
- 重试事实至少出现在六个载体：`delegation-model.mjs` 的 `RETRY`、`src/lib/retry-policy.ts`、`delegation-policy` §7、`workflow.md` §失败与重试、`eng-teaming` 的 workflow 硬规则、`subagent-retry` 工具 description。模型/运行时/YAML 有三边 parity spec；**散文没有**。
- `delegation-model` 又把 `engine.subagent` 标成 `merged` → `policy.delegation`（没有独立 section），所以 subagent 引擎事实确实只能住在政策里；但 workflow 引擎事实不是。

**为什么是 GAP**

原生原则：政策与引擎事实生命周期不同，不能塞进同一载体；一个事实一个家。当前是“政策里夹引擎事实 + 引擎段另有一份”，升 pin 时要改政策，改政策又会动引擎措辞；而不加载 workflow section 的角色（CEO/COO/CFO/CMO/VP-Sales）会从政策里读到 workflow 引擎细节——它们根本用不到。

**怎么证 / 选项**

- 政策只留“何时/为什么”：通道选择、brief、effort、控制、链设计、重试的**决策判据**；终态词表、截断阈值、schema 子集、`null` 语义放回能力段/工具 description。
- 如果坚持 `engine.subagent` 合并进政策，就在 `CONTRACTS` 里把“政策同时承载 subagent 引擎事实”写成显式例外，并把 workflow 段移走；不要把例外写成通例。
- 散文无法机械 parity；能做的是一处事实一个家 + 链接，而不是再写一份“单源”清单。

### G6 · `workflow_runs` 是全局工具，但只有 workflow 会话用得上（已确认，低-中）

**事实**

- `registerWorkflowRuns(ctx)` 在 host `apply` 里直接 `ctx.tools.register`（`src/index.ts:61`；`host/delegation/workflow-runs.ts:129`），没有按 preset 安装；`request_signoff` 同样是全局工具。
- 对照：`registerWorkflowContract` 只给 `vp-eng` 注入 section（`src/index.ts:125`）；`delegation-control` 与 `subagent-retry` 都是 per-agent 安装（`delegation-control.ts:281`；`subagent-retry.ts` 的 `install`）。
- 结果：CEO（没有 workflow）和 worker/quality-loop（没有 workflow）的工具面里也有 `workflow_runs`；它只会返回空数组，或者让模型以为“我这里可能有 workflow run”。
- 原生原则：“能力域即作用域”；看不见的原语不会被选中，反之，看得见但用不上的工具是 token 税与误导。

**为什么是 GAP**

不是功能错误，是作用域错误：一个排障工具应该跟着 workflow 能力走。它也是本仓自己“按能力注入”原则的反例——引擎段做对了，工具没做对。

**怎么证 / 选项**

- 把 `workflow_runs` 改成 per-agent 安装：只在 `composedPresetOf(agent)` 属于 workflow-capable preset（当前 `vp-eng`）时注册；或由 `workflow` 工具行同组注册。
- 如果保留全局，至少把 description 改成“在本会话没有 workflow 记录时返回空；这是正常”，并接受 token 成本；但这不是原生形状。

### G7 · workflow / 质量环只在一个角色：角色能力还是公司能力？（需求待证）

**事实**

- `workflow` 只在 `vp-eng` preset；`quality_loop_produce` / `quality_loop_verify` 也只在 `vp-eng`。
- 共享政策却说“≥3 件同构、要合并/交叉核对/只回异常”用 `workflow`（`SKILL.md:15`、§6）；`assembling-the-team` 让 CEO 把 workflow 需求路由给 `vp_eng` 命名 child（`SKILL.md:41`）。
- CMO 的市场扫描、VP-Sales 的多客户/竞品、COO 的多项目核查、CFO 的多情景测算都有“≥3 同构”的天然形状；但这些角色的 skill 没有明确写“≥3 分支”，也没有 workflow 行。
- 质量环的公司级原则是“独立复核”，但当前只有研发有 producer/verifier 两条命名行；财务模型/运营方案/市场结论没有同形的独立复核通道。

**为什么是 GAP（候选）**

如果 workflow/质量环是**公司能力**，那就应该按需挂到有该形状的角色；如果它是**VP-Eng 角色能力**，那共享政策就不该对所有角色说“用 workflow”，而应说“把这类活路由给 vp_eng”。当前两种读法都成立，政策没有拍板。这是“角色能力 vs 公司能力”的边界未定，不是引擎缺陷。

**怎么证 / 选项**

- 先做需求证据：选一个 COO/CMO 动议，给 ≥3 同构支路，不点名通道；看模型是拉多条 `subagent`、还是试图 `workflow`、还是把活推给 vp_eng。一次自然型探针只证“模型会怎么选”。
- 如果需求成立：给目标角色加 `workflow-ptc` + `tool-workflow` 两行，并加 capability-scoped 引擎段；不要只改政策文本。
- 如果需求不成立：把政策改成“workflow 是 VP-Eng 的通道；其他角色把这类活路由给 `vp_eng` 命名 child”，并把 `delegation-model` 的 `channels` 作为唯一事实源。
- 质量环同理：先问“哪些产物需要独立复核”，再决定是否把两条命名行复制到其他角色；复制前先看方法包是否存在（没有方法包的 verifier 只会空转）。

### G8 · `goal` 装了但没政策；与 P3“人工在场”有张力（需求/治理待证）

**事实**

- 六个公司角色都挂 `tool-goal` + `command-goal`（各 preset 的 base harvest 段），但 persona、公司手册、`delegation-policy` 都没有提 `goal` 的用法/边界。
- `docs/policy.md` P3 明确：“多智能体编排（spawn teammate / 多轮互审）只在人工在场、明确要求时启动；绝不放进无人值守的自动流程。”P1 也有长程 goal 的写法，但那是**开发代理**的政策，不是公司角色的手册。
- `goal` 的原生语义是“跨轮长目标 + idle 自动续跑”；`complete` 是模型自报，`blocked` 有轮次门槛。一个公司角色如果创建 goal，可能在用户不在场时继续开轮、继续 spawn，直接撞 P3 的预算/在场纪律。
- `schedule` 也有类似面：persona 鼓励“给自己立节奏”，到期会恢复冷会话；如果定时任务里再 spawn/team，就是无人值守编排。

**为什么是 GAP（候选）**

这是“装了强力原语但没给边界”。原生原则说：不想要的原语就别装（看不见就不会被选）；装了就要在模型可见处给边界。当前 goal 的边界只在工具 description（“not for single-turn work”），没有公司级“谁可以开、预算多少、能不能 spawn、何时必须停”的政策。它和 P3 的冲突不是文本矛盾，而是治理缺口。

**怎么证 / 选项**

- 决策一：公司角色是**人驱动**的——把 `tool-goal`/`command-goal` 从公司 preset 移除（或只留 `/goal` 人命令，不给模型工具），并在手册写“动议由人开轮，不自动续跑”。
- 决策二：允许**单 agent、无新委派**的内部长任务用 goal——在手册/policy section 写死预算、停止条件、禁止在 goal 轮内 spawn/team，并加一个行为探针。
- 决策三：允许自主编排——那要改 P3 或明确 P3 不适用于公司产品；这是用户级决定，不是 agent 能拍的。
- 无论哪个，先做一次自然型观察：给一个长任务，看模型会不会自己 `create_goal`；如果不会，治理风险是潜在的而不是当前的。

### G9 · team/subagent 混合组合：有意的偏离，但决策记录说得太满（有意偏离，记录缺口）

**事实**

- 官方 `agent-team-profile` 的做法是：插 `agent-team` / `tool-agent-team` / UI，同时 **disable** `tool-subagent`、`tool-subagent-fork`、`tool-subagent-control`、`tool-subagent-list-agents`（`vendor/dsh/packages/experimental/agent-team-profile/cordis.patch.yml:4`-`14`；README 说“direct delegation uses spawn_teammate… subagent tools disabled”）。
- 本仓的 bundle 只插 `agent-team` + `tool-agent-team` + UI，**不 disable** subagent/fork/control（`packages/company-pack/cordis.patch.yml:70`-`90`），于是根会话同时有 team 和 subagent；team 工具按成员身份 shadow 全局控制名，本仓再用 `list_subagents` / `send_to_subagent` 补控制面。
- `architecture Note` 说“直插行——未装官方 bundle，无续驶控制冲突”；这句话不准确：shadow 冲突真实存在（D18 / BUG-037），只是被自定义控制名绕开了。

**为什么是 GAP（记录层，不是机制层）**

混合组合是**可辩护的产品选择**：公司既要 team 的持续协作，又要命名 spawn 的角色 preset；官方 profile 会砍掉后者。但它有明确代价（两套控制名、自定义工具、测试面），应该有“为什么不用官方 profile / 代价 / 退役条件”的决策记录。当前记录在 Note 和代码注释里散着，且 architecture 的“无冲突”说法会误导下一次升级。

**怎么证 / 选项**

- 在 architecture Note 或 delegation 合同里补一段“官方 profile vs 混合组合”的对照：能力、代价、退出条件（上游修 shadow 后删自定义控制工具）。
- 不要为了“更像官方”而直接换 profile：那会砍掉 CEO 的五条命名行，产品面会退化成软角色 team。
- 这是记录缺口，不是当前行为错误；优先级低于 G1/G2。

### G10 · team 成员无法按角色硬隔离：DSH 结构边界，不是本仓可修的 GAP（边界）

**事实**

- team 成员的 `SpawnTeammateRequest` 没有 preset 字段；成员继承 Lead 组合（`types.ts:165`-`172`；`roster.ts:264`-`274`）。
- 本仓的应对：team 成员读角色包（CHARTER + 角色 skill 文件 + KB），命名 child 用 `agentPreset` 拿真角色。docs 已明说“team 里的 VP 是软隔离”。
- 这不是本仓发明的问题；原生四通道里只有 spawn 能钉 preset。要“角色 + 持续协作”同时成立，当前 DSH 没有单一机制。

**判断**

这是**结构边界**，不是 GAP；本仓的 workaround 已经是原生允许的最优形状之一。要警惕的是叙事：不要把 team 里的“vp-eng”成员说成 vp-eng preset；docs 已多次提醒，保持即可。若未来上游给 team 成员加 preset 字段，再评估是否收窄角色包。

**同形的两个边界**（不另立 GAP，避免把原生限制记成本仓缺陷）：

- **成员人格仍是 Lead 的**：成员继承 Lead 的 persona，`team:identity` 只补“你是 teammate X / Lead 是 lead”，不会换成角色 preset 的人格；角色靠任务书 + 角色包（CHARTER + skill 文件）软覆盖。这是 G10 的另一面，不是新问题。
- **workflow 分支的“叶子”只是合同**：分支继承父组合，若父有 `subagent` 行，分支也能再派；引擎没有 per-branch 的收窄开关，`eng-teaming` / `workflow.md` 的“分支默认叶子”只是 prompt 约束。原生允许的收窄杠杆只有“spawn + 薄 preset”，workflow 用不上；这条边界要按合同守，不能当成引擎保证。

### G11 · `subagent_retry`：有界的自造原语，仍是“第二通道”风险（有意偏离，观察项）

**事实**

- `subagent_retry` 是 host 工具，同步 `startActivation` + 最多 2 attempts + 幂等门 + 深度不另立预算 + 取消收敛；工具 description 说“long or batch work uses workflow”。
- 原生立场：委派/workflow/job 不自动重试；重试是父侧有界策略；可靠通道优先 workflow。`subagent_retry` 把这个策略做成了工具，不是引擎自动重试，也不是调度器；它有退役条件（上游给原生 bounded retry 后删除）。
- 风险：它是一条新的委派通道，有自己的阻塞/深度/投递语义；模型可能把它当默认重试通道，而原生更希望批量活走 workflow。当前 description 与政策都写了“短/幂等/重试敏感才用”，方向对。

**判断**

这是**有意偏离 + 已登记代价**，符合原生“补控制面要记账”的兜底模式；不是当前 GAP。建议在 pin 升级检查单里加一条：上游若给 `tool-subagent` 原生 retry 配置，按退役条件删掉本工具；并定期看真实会话里它是否被用于长任务。

### G12 · 偏差账分散在多个 Note/注释，没有一张升级检查表（维护性，低）

**事实**

- `delegation-control` 的退役条件在 `docs/contracts/delegation.md` §2/§4；`workflow_runs` 在 042–044 Note；`subagent_retry` 在单源 Note + 代码头注；`workflow` 的 200k 预算在 BUG-039 Note；`delegation-terminal` 在 UI Note。
- 没有一个“编排面偏差登记”能在升 pin 时一次看完“我们补了哪些接缝、代价、退出条件”。原生建议（`perspectives/03` 后果 4）是三项齐全；本仓每项都有，但分散。

**判断**

不是行为 GAP，是维护性 GAP。可以在 `notes/implemented/` 建一张“编排面接缝登记”Note（不是 docs 的清单，避免 D28 第二清单），或在现有 `delegation-contract-repair` Note 的台账表上续写；升 pin 检查单链过去。优先级最低。

### G13 · support preset 作为 root 是 Lead，却没有 team 政策（已确认，中）

**事实**

- E5 真挂载：`worker` root 的工具面含 `spawn_teammate` / `list_agents` / `send_message`，但 worker 不加载 `delegation-policy`，persona 又写“不组队”。
- `surface-matrix.mjs` 头注：root = Lead，**总是**有 9 个团队工具，即使 preset 声明 `teamLead:false`（support 能力档）。
- `COMPOSITIONS.*.teamLead` 是 preset 级期望，不是运行时权限；任何 root（包括 quality-loop/worker）都成为单成员团队 Lead。

**为什么是 GAP**

这是“能力面有、政策面没有”的另一个面：工具在，模型却不知道该怎么用；persona 说“不组队”，工具说“你可以”。support preset 本来设计成 leaf/能力档，不是 root 角色；但 DSH 的 preset roster 不隐藏它们，人选了它开门，运行时它就是 Lead。

**怎么证 / 选项**

- 产品侧：从 root 选择器隐藏 support preset（client roster 过滤），或明确支持“support root 可以组队”并给最小 team 政策。
- 注入侧：team 段按 `agentTeams.membership(agent)?.role === 'lead'` 注入；support root 也会拿到（因为它是 Lead），这与“隐藏”是两条路，不能同时假装它没有团队工具。
- 本卡 Issue 2 采用“按 Lead 注入”；隐藏 support preset 是产品/UX 决策，另卡或另议。

### 3.13 对照原生原则（一张表）

| GAP | 触碰的原生原则 | 基线依据 |
|---|---|---|
| G1 | 按能力存在性注入；策略随工具走 | §3.1 / §3.2 |
| G2 | 深度是绝对量；`maxDepth` 是行上限，不是链预算 | §4 |
| G3 | 上下文继承是通道能力；组合继承 ≠ 对话继承 | §2 |
| G4 | 选择面 = 安装面；不要用第二份分类替代能力矩阵 | §2 / §3.1 |
| G5 | 政策与引擎事实分层；一个事实一个家 | §3.2 |
| G6 | 能力域即作用域；看不见的原语不会被选中 | §3.1 |
| G7 | 看不见的原语不会被选中；角色能力 vs 公司能力要先拍板 | §1 / §3.1 |
| G8 | 不想要的原语别装；装了就要给边界 | §3.1 / §3.3 |
| G9 | 补控制面要登记接缝/代价/退出条件 | §3.1 后果 4 |
| G10 | 只有 spawn 能钉 preset；team 成员继承 Lead | §2 |
| G11 | 重试是父侧有界策略；可靠通道优先 workflow | §4 / 原生重试纪律 |
| G12 | 补控制面要登记；升 pin 时能复查 | §3.1 后果 4 |
| G13 | 能力域即作用域；root 即 Lead | §2 / §3.1 |

## 4. 优先级与下一步

| 优先级 | GAP | 类型 | 最小下一步 | 需要谁 |
|---|---|---|---|---|
| P0 | G1 政策泛化 | 已确认，能力面 | 先做静态“角色 → 通道”对账；决定政策是 core+capability section，还是按角色生成“你的通道”一行 | 维护者；改文本/注入方式 |
| P0 | G2 `maxDepth` 注释/测试文案 | 已确认，事实错误 | 修正 CEO 注释与 `presets.spec.ts` 文案；加一条链测试 | 维护者；同 diff 文档+测试 |
| P1 | G3 team 上下文 | 已确认，模型/文档 | 模型字段改 `fresh|fork`；docs/预算指南改成“默认 fresh，fork 可选” | 维护者；同 diff |
| P1 | G4 通道双轨 | 已确认，术语 | 以原生四通道为能力矩阵；A/B/D 降为别名，C 标未启用 | 维护者；docs 收口 |
| P1 | G5 引擎事实混政策 | 已确认，分层 | 政策只留决策判据；workflow 引擎事实回 `workflow.md`；`engine.subagent` 例外显式写 | 维护者；可能触 doc-budget |
| P2 | G6 `workflow_runs` 全局 | 已确认，作用域 | per-agent 安装，或明确接受全局并改描述 | 维护者；代码 |
| P2 | G7 workflow/质量环范围 | 需求待证 | 一次自然型探针（COO/CMO ≥3 同构）+ 用户拍“角色能力 vs 公司能力” | 用户 + 真模型探针 |
| P2 | G8 goal 治理 | 需求/治理待证 | 先观察模型会不会自开 goal；再定“移除 / 单 agent 有界 / 允许自主” | 用户拍板；可能改 P3 |
| P3 | G9 混合组合记录 | 有意偏离 | 补一段官方 profile vs 混合组合的对照与退役条件 | 维护者；Note |
| P3 | G10 team 角色边界 | 结构边界 | 不修；保持 docs 的“软隔离”措辞 | — |
| P3 | G11 `subagent_retry` | 有意偏离 | 升 pin 检查单加退役条件；观察长任务使用 | 维护者 |
| P3 | G12 偏差账分散 | 维护性 | 一张 Note/一张表，不建 docs 清单 | 维护者 |

**建议的推进顺序**：先做 G1/G2 的**静态对账 + 文本修正**（不需要真模型，风险低，能把“政策说错能力”和“深度说错语义”两条止住）；再做 G3/G4/G5 的合同收口；G6 是代码小修；G7/G8 必须等用户拍板或真模型证据；G9–G12 是记录/观察，不阻塞。

## 5. 验证（实跑）

- `pnpm verify` → **ALL PASS**（2026-11-11；研究题形状/索引/链接；2 门无对象）。
- code points 实测：`delegation-policy` 2,596 / `assembling-the-team` 5,306 / `eng-teaming` 4,737（`node -e` 逐文件 `[...fs.readFileSync(...)].length`）；均 < 8,192。
- `grep -rn "context: 'fork'" packages docs probes tests checks` → **零命中**；团队上下文没有显式走 fork。
- `grep -rn "inheritsParentContext" tools tests` → 只出现在 `delegation-model.mjs` 与 `delegation-model.spec.ts`；`team.inheritsParentContext` 没有被 spec 断言，也没有运行时消费者（九陷阱 #3 的“无执行者的声明”）。
- `grep -rn "registerWorkflowRuns\|registerWorkflowContract\|registerSubagentRetry" src` → `workflow_runs` 是 host 全局注册；`workflow` 引擎段按 `tools.get('workflow')` 能力探测 + `vp-eng` fallback；`subagent_retry` 按 preset surface per-agent 安装。三者是三种作用域，见 G6。
- `grep -rn "maxDepth" tests/presets/presets.spec.ts` → 只断言 CEO 行有 `maxDepth: 1`；没有断言 child 不能再派。

这些是**静态/结构证据**；行为层（模型是否误调通道、是否自开 goal）未跑真模型，见 §6。

## 6. 未证与边界

- 本页的“已确认”都指**静态证据**：源码、preset YAML、政策文本、模型字段、测试文案能互相对上；**没有跑真模型**，所以“模型会因此选错通道/自开 goal”是行为假设，不是观察结论。
- G1 的行为面尤其需要探针：政策是 skill，模型可能根本没加载；也可能加载了但按 persona 的路由走，不会误调。静态不匹配是事实，行为后果要另证。
- G7/G8 是**需求/治理**问题，不是机制对错；答案取决于产品是“人驱动的公司”还是“自主公司”。本页不给单方面答案。
- 本页只对照了 `_digested/delegation-and-orchestration` 的承重结论与当前 pin 的 vendor 源码；上游升 pin 后，通道能力位、`maxDepth` 取用、team 字段都可能变，G1–G6 的结论要按新源码复核。
- 本页不改代码、不改合同、不立卡；候选卡见 §4，是否立卡由用户/后续流程决定。
