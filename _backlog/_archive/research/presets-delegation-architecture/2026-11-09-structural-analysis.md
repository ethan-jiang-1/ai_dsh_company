---
topic: presets-delegation-architecture
intent: 从 9 个 preset 的静态读数与 BUG-036..044 反推委派面的结构性缺陷，提出可检验的目标结构与只读实验计划
---

# presets 委派面的结构性分析（第一版）

> 状态：**推论稿**。读数来自 [inventory.json](inventory.json)（脚本 [inventory-presets.mjs](inventory-presets.mjs)，
> 只读）；bug 事实来自 [fixed_bugs](../../../_archive/fixed_bugs/README.md) 里的 BUG-036..044；DSH 机制尚未逐条核对源码，标为待验。
> 本文回答“有没有结构问题、可能是什么”；不回答“该怎么改”（下一份材料）。

## 0. 一句话判断（假设，待验）

当前 presets 不是“一组角色定义”，而是**九份手写的、自包含的委派面装配**：工具行、委派行、人格提示、
合同散文各自复制、各自漂移，能力（能开 workflow 吗？能生几层？能带团队吗？）只存在于 YAML 行和
prose 的隐含组合里。BUG-036..044 不是九个孤立事故，而是这套装配缺少**单一能力模型 + 单一合同家 +
面级验证**的九个采样点。

## 1. 读数基线（事实，可复算）

| 指标 | 值 |
|---|---:|
| preset 数 | 9（6 职能 + researcher + SA + SQA） |
| `agent.cordis.yml` 合计 | **1,524 行 / 80,667 字节** |
| 工具类行合计 | **131 行**（每角色 5–22 行） |
| persona 正文合计 | **9,303 字符**（327–2,069/角色） |
| 角色 skills | **19 个 SKILL.md / 819 行**；另有 `_shared/product-definition` 72 行（4 角色引用） |

委派行矩阵（事实；`maxDepth`/`agentPreset` 取自 YAML）：

| 角色 | 通用 subagent | 命名委派 | 控制行 | workflow | 备注 |
|---|---|---|---|---|---|
| ceo | ✗（只有 `subagent_research`） | vp_eng(1) vp_sales(1) vp_cmo(1) SA(2) SQA(2) researcher(无 maxDepth) | ✗ | ✗ | 6 条命名行，深度不一致 |
| vp-eng | ✓(2) + fork(2) | SA(2) SQA(2) vp_cmo(2) | ✓ | ✓ | 唯一有 workflow 的角色 |
| vp-sales | ✓(2) + fork(2) | — | ✓ | ✗ | |
| coo | ✓(2) + fork(2) | — | ✓ | ✗ | |
| cfo | ✓(2) + fork(2) | — | ✓ | ✗ | |
| cmo | ✓(2) + fork(2) | — | ✓ | ✗ | |
| researcher | ✗ | ✗ | ✗ | ✗ | 5 行工具、无 skills |
| system-architect | ✗ | ✗ | ✗ | ✗ | 6 行工具、1 skill |
| system-qa | ✗ | ✗ | ✗ | ✗ | 6 行工具、1 skill |

事实补充：

- 通用 `subagent` / `subagent_fork` 行**不带 `agentPreset`**（vp-eng 等），即子代**继承父的完整
  preset 组合**；命名行（vp_eng/SA/SQA/researcher）才钉 preset。
- team 工具不在 preset 行里（bundle 级安装）；五个职能角色声明的 `tool-subagent-control` /
  `list-agents` 在根会话被 team 版 shadow（BUG-037 事实）。
- 9 个 preset 的 yml 开头都写明 **preset 自包含、DSH 无 patch 继承**（如 vp-eng 第 2–3 行）；
  重复是运行模型约束下的手工产物，不是疏忽。

## 2. 六个结构模式（F = 事实，I = 推论，V = 待验）

**S1 手写重复：131 行工具行、9 份几乎相同的底座**
- F：bash/fs/web/todo/goal/jobs/present/schedule/skill/ask-user/cordis 等行在 9 个角色里重复；
  差异只在委派行与 persona/skills。
- I：任何一个底座工具变更要改 9 处；差异靠人记。缺一个“底座 + 角色 delta”的源。
- 约束：DSH 运行期要求自包含，所以“共享 fragment”如果存在，只能在**构建期**合成，产物仍自包含。

**S2 能力矩阵是隐含的、且不一致**
- F：深度 1 vs 2 并存（CEO→VP=1，CEO→SA/SQA=2，vp-eng→SA/SQA/CMO=2）；CEO 的 researcher 行
  没有 maxDepth；workflow 只有 vp-eng；leaf preset 没有任何委派行。
- I：读一个角色“能做什么委派”必须同时读 YAML、bundle（team 安装）、docs 矩阵和 skills；
  docs/contracts/presets.md 的四形态矩阵是第四份副本，已出现漂移事故（BUG-037 的“根不是成员”）。
- V：DSH 是否提供 per-row toolFilter/能力声明？若无，能力模型只能由本仓生成器/测试承载。

**S3 工作组合 vs 角色组合混用**
- F：通用 `subagent` 不钉 preset → worker 拿到父的整套（vp-eng worker 有 workflow、5 条 subagent 行、
  控制行；depth 2 内可继续生）。命名 worker（SA/SQA/researcher/CMO）才拿到薄组合。
- I：这是“能力放大”的设计缺口，而不是参数问题：worker 本应是**受限的执行组合**，现在默认是
  “角色克隆”。BUG-038（分支内嵌套）正是这条路径的可见症状。
- V：`tool-subagent` 的 Config 是否允许给通用行钉 `agentPreset`（命名行已用）；若可以，worker
  组合可以在行级表达，无需新机制。

**S4 合同散文散落、无单一锚**
- F：委派规则出现在 persona（CEO 2,069 / vp-eng 1,707 字符）、角色 skill（eng-teaming 93 行、
  assembling-the-team 73 行）、docs/contracts/delegation.md、tool description、host 代码注释五处；
  一天内 eng-teaming 从约 72 行涨到 93 行，新增的主要是引擎合同（schema 子集/截断/schema null/
  分支叶子/重启）。
- I：角色 skill 同时承担“领域方法”和“引擎合同”，两者生命周期不同（方法稳定、合同随 pin 变）；
  合同没有单一模型面家，导致“修 bug = 再加一句”，token 税和漂移同时增长。
- V：DSH 的 prompt section / skill 加载时机能否承载一份**共享合同**（tool description 或独立 skill），
  让角色 skill 只留方法？

**S5 三通道语义重叠 + 宿主补丁**
- F：team（bundle/名册）、subagent（preset activation）、workflow（vp-eng 行）三套通道各有自己的
  身份、寻址、状态、终态；控制名在根被 shadow（037）；修复轮把 `list_subagents`、
  `send_to_subagent`、`workflow_runs` 加进 host 插件，preset 行里的控制声明在根仍部分死行。
- I：委派面没有单一 owner——一半在 preset YAML，一半在 host 代码，一半在 bundle 的 team 插件；
  每个 bug 的修复都在 surface 上再贴一层。042/043/044 都是这条缝的不同切面。
- V：DSH 是否鼓励“一个控制面 + 适配器”，还是“每通道自有控制名”？vendor 的 README/源码要逐条读。

**S6 缺面级验证**
- F：preset-smoke 只证“能挂载”；角色测试测 skills 文案；工具测试用 fake service；
  没有一张“声明能力 ↔ 实际工具行/深度/可见性”的矩阵测试。042 的 fake service 把“真实装配拿不到
  sessionQuery”藏住了；044 的模型选择（不调新工具）也不在任何回归层。
- I：这不是测试不够多，而是**被测对象选错了层**：委派面是组合性质，必须用组合级读数验证
  （真实装配的工具目录/深度/成员/终态），单测和 fake 只能证局部。
- V：`agentPresets/list` + session `request/header.tools` 的 keyless 读数能否成为面级矩阵测试的载体？

## 3. BUG-036..044 → 结构模式映射（事实 → 归类）

| Bug | 可见症状 | 结构关联 |
|---|---|---|
| 036 | schema 子集 fatal，模型面没说 | S4：引擎合同无家，只能写进角色 skill |
| 037 | 根门控制名被 team shadow，文档说“根不是成员” | S2/S5：能力与所有权隐含，四形态矩阵是副本 |
| 038 | 分支内嵌套返回混合文本/null | S3/S5：worker 继承全组合 + 通道结果语义未统一 |
| 039 | >50k 截断、spill 也是副本 | S4：结果通道规则写在 skill，配置默认无锚 |
| 040 | schema 分支丢文本、裸 null | S3/S4：推荐形状与引擎语义脱节，只能产品规避 |
| 041 | 重启后 child 成孤儿 | S5：生命周期/持久化不在能力模型里 |
| 042 | lastTurnEnd 恒缺（isolate sessionQuery） | S5/S6：host 补丁 + fake service 盲区 |
| 043 | teammate 混入 subagent 列表 | S5：三通道身份/寻址没有统一模型 |
| 044 | 后台 job 不跨重启 | S5/S6：进程内句柄没有 durable 解析层 |

**共同结论（推论）**：九个 bug 里没有一个是“某个工具函数写错”；全部是**组合/合同/验证**层面的缺口。
这解释了为什么逐个修会不断长出新工具和新 prose——修复点不在同一个抽象层。

## 4. 目标结构的候选（只列选项与取舍，不是建议落地）

| 选项 | 内容 | 解决 | 代价/风险 | 只读验证方式 |
|---|---|---|---|---|
| H1 构建期基座 + delta | `_base` + 每角色 delta → 生成 9 份自包含 YAML（运行期不变） | S1/S2 | 生成物可读性；生成器要复刻 DSH patch 语义 | 在 /tmp 生成并与现有 YAML diff；不改生产 |
| H2 能力清单 | 每角色一份声明（通道/深度/worker profile/team/background），生成器与测试消费 | S2/S5 | 多一个源，必须生成而非手写 | 解析声明 vs 现有行，列出差异 |
| H3 合同单家 | 引擎合同进共享 skill/prompt section；角色 skill 只留领域方法 | S4 | 模型加载时机；token 预算 | 统计合同句在 persona/skills/docs 的重复数 |
| H4 worker 组合 | 通用 subagent 钉“worker”组合（薄工具面、深度 0/1、无 team/control） | S3 | 产品能力变化；DSH 行级 agentPreset 是否可用待验 | 读 `tool-subagent` Config + 现有命名行先例 |
| H5 通道统一契约 | 一份“寻址/状态/续驶/终态”模型，team/subagent/workflow 各自适配 | S5 | 可能与 vendor 语义冲突；不要自造引擎 | 对照 vendor 三通道 README/源码 |
| H6 面级矩阵测试 | keyless 读真实组合：每预设的工具目录、深度、可见性、终态 | S6 | 需要真实装配/加载器；成本 | 用 `agentPresets/list` + session header 读数先做原型 |

## 5. 下一步（本材料之后要补的）

1. **DSH 机制核对**（下一份材料）：`tool-subagent` Config 是否支持通用行 `agentPreset`；workflow 子代
   是否克隆父组合；team 安装/shadow 的确切条件；preset loader 是否支持构建期生成的自包含产物；
   prompt section/skill 的加载时机与预算。
2. **外部实践 survey**：orchestrator-worker / handoff / subagent-as-tool / supervisor 的一手来源，
   提炼“角色定义 vs 委派策略”的分层原则；只采纳能追溯到官方文档/论文的部分。
3. **只读实验**：H1 的原型生成（/tmp）；S4 的合同句重复计数；H6 的 keyless 矩阵原型。
4. **结论**：结构性是否需要调整、按什么顺序、哪些留给用户裁决。

## 6. 边界

- 本文的数字是静态解析结果，不代表运行时实际工具面（运行时还叠加 bundle 的 team 工具、host 插件、
  preset 继承）；凡“运行时可见性”都标 V，待下一份材料核对。
- “结构问题”是推论，不是事故复判；bug 卡里的已修判定仍然是独立事实。
