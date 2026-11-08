---
topic: presets-delegation-architecture
intent: 取 Anthropic / Claude Code / OpenAI Agents SDK 的一手文档，提炼与“角色 preset + 委派面”直接相关的实践，并逐条映射到本仓的结构模式与候选方案
---

# 外部实践 survey：多智能体/子代理怎么定义与委派

> 采集日期 2026-11-09；只取一手文档/工程博客，短引文不替代原文；外部实践**不是本仓合同**，
> 只作设计参照。每条先记“外部事实”，再记“本仓映射/推论”（标 I）。

## 1. 来源

| 来源 | 类型 | URL |
|---|---|---|
| Anthropic, _How we built our multi-agent research system_ | 工程博客（一手） | <https://www.anthropic.com/engineering/multi-agent-research-system> |
| Claude Code Docs, _Create custom subagents_ | 官方文档（一手） | <https://code.claude.com/docs/en/sub-agents> |
| OpenAI Agents SDK, _Agent orchestration_ | 官方文档（一手） | <https://openai.github.io/openai-agents-python/multi_agent/> |

（LangGraph / Google ADK 的页面本次抓取失败或重定向，未纳入；不以搜索摘要替代一手内容。）

## 2. Anthropic：orchestrator-worker 的经验

外部事实：

- 架构 = lead agent 规划、并行 spawn 专门 subagent；每个 subagent 有自己的 context window，
  返回压缩后的发现；适合**广度优先、可并行、信息量超过单 context**的任务；编码类任务可并行的
  部分少， tightly coupled 领域不适合。
- 收益与成本：内部研究评测上多智能体比单 agent 高 **90.2%**；token 使用解释 BrowseComp 80% 的
  方差；多智能体约 **15×** chat token（单 agent 约 4×）。任务价值必须撑得起成本。
- 委派提示的要素：**objective、output format、可用工具/来源、清晰的任务边界**；短而模糊的
  brief 会让 subagent 重复劳动或漏项（文中举例两个 subagent 重复查同一供应链）。
- **effort scaling 写进 prompt**：简单事实 1 个 agent/3–10 次工具调用；直接比较 2–4 个/10–15 次；
  复杂研究 >10 个且明确分工 —— 用来防“简单问题 spawn 50 个 subagent”。
- 工具设计是关键：坏的工具描述会把 agent 带错路；作者用 tool-testing agent 改描述，
  任务完成时间降 **40%**。
- 工程面：agent 有状态、错误会复合；需要 durable execution、resume、tracing、rainbow deploy。
- 已知瓶颈：lead **同步**执行 subagent（等一批完成再继续）→ lead 不能 steer、subagent 之间不能
  协调、一个慢 subagent 阻塞全局；异步能提升并行但增加协调/一致性/错误传播复杂度。
- 附录：subagent 把产物写文件、只回轻量引用（避免“传话游戏”）；长会话用 memory/新 subagent
  接续；评估从小样本开始、LLM judge + 人工、状态变更类任务用 end-state 评估。

本仓映射（I）：

- 我们的 `workflow` 是“代码编排”的并行扇出，最接近 orchestrator-worker 的批量形态；`subagent`
  是单个 activation（agents-as-tools），`team` 是持久协作。三者的分工与 Anthropic 的
  “何时并行/何时单干”判断一致，但我们的**effort 规则**散落在 `eng-teaming` 的五档里，没有
  数字预算。
- 15× token 的成本事实支持“默认自己做、少数才委派”的五档设计；也说明**委派面要能算账**
  （每角色/每通道的 effort 上限），而不是只写“可以委派”。
- “同步执行是瓶颈”直接对应我们 BUG-037/041（根门不能 steer、终态丢失）——这不是本仓独有，
  是模式级问题；我们的 `list_subagents`/`send_to_subagent` 是补 steer 能力的方向，但需要
  在 preset 层明确“哪些角色/通道允许 steer、何时允许”。
- “subagent 写文件、父拿引用”正是我们 BUG-039 的绿色替代形状；应把它从“skill 里的一句提示”
  升级为**委派合同的一等模式**。

## 3. Claude Code：subagent 作为可声明、可约束的 worker

外部事实：

- subagent = Markdown + YAML frontmatter；`name`/`description` 必填；可配 `tools`/
  `disallowedTools`、`model`、`permissionMode`、`hooks`、`mcpServers`、`maxTurns`、`skills`、
  `isolation`、`background`、`omitClaudeMd` 等。
- 每个 subagent 有**独立 context window**、自己的 system prompt、工具访问与权限；父只拿到摘要。
- **description 决定何时委派**；描述会占 context（合计超 15k token 有告警）。
- 内置 Explore/Plan 是 read-only；general-purpose 有全部工具；模型可按 agent 选择。
- **嵌套默认 3 层**；到深度上限时，除 fork 外**收回 Agent 工具**；并发上限默认 20；
  `maxTurns` 可限轮数；`SendMessage` 可按 id/name 恢复（保留完整历史）。
- 何时用主对话 vs subagent：频繁往返/共享上下文/快速改动用主对话；冗长输出/需要工具限制/
  自包含摘要用 subagent；可复用 prompt 用 **Skills**（在主上下文里跑）。
- subagent 结果带“subagent output”标记，其中的指令不具授权；有输出扫描。
- Agent Teams 的 teammate 可以复用 subagent 定义的一部分；命名后可按名发消息。

本仓映射（I）：

- 我们的 `agent.cordis.yml` 等价于 Claude Code 的 agent 定义，但**缺少显式的 worker 级字段**：
  工具 allowlist（我们靠 composition 行）、model、maxTurns、isolation、background。
  DSH 的 `tool-subagent` 有 `agentOptions`/`agentPreset`，preset 行可以声明这些；当前没声明。
- “description 决定委派”对应我们的 `tool-subagent` 行的 `description` 与命名工具描述；
  我们的 named delegates 有中文 description，但没有统一的“何时用这个 worker”规范。
- Claude Code 的**深度上限会收回 Agent 工具**，而 DSH 的 workflow 子代不受 maxDepth 约束
  （已知限制）；这解释了为什么“分支默认叶子”只能靠 skill 约束——外部有机制，我们只有 prose。
- “主对话 vs subagent vs skills”的三分，正好对应我们的“自己做 / subagent / workflow / team”
  五档；外部给了更清楚的判据（上下文/工具限制/往返频率），可用来重写五档的判据表。
- teammate 复用 subagent 定义（部分字段）说明“团队与子代理共享定义”是常见需求；DSH 目前
  teammate 继承 Lead，无法按成员钉组合——这是**平台差异**，不能直接照搬。

## 4. OpenAI Agents SDK：agents-as-tools vs handoffs

外部事实：

- agent = LLM + instructions + tools + handoffs；两种编排：LLM 决策 vs 代码决策。
- 两种核心模式：**agents as tools**（manager 保留控制权，调专家拿结果，适合“一个 agent 拥有
  最终答案/统一 guardrail”）与 **handoffs**（triage 把会话交给专家，专家成为当前 turn 的
  active agent，适合“专家直接面向用户/保持 prompt 聚焦”）。
- 可混合：triage handoff 给专家，专家再用 agents-as-tools 做窄任务。
- 代码编排的常见形态：structured outputs 分类 → 选下一个 agent；链式；evaluator 循环；
  并行（asyncio.gather）。
- 建议：专门化 agent 而非万能 agent；投资 prompt/监控/evals。

本仓映射（I）：

- DSH 的 `subagent` activation ≈ **agents as tools**（父保留控制权，结果回父）；`team` 的
  `send_message` ≈ **handoff/peer**（成员成为当前执行者），但不是 OpenAI 的“active agent 切换”，
  而是 roster 内消息。
- 我们当前把两者都叫“委派”，但控制权/寻址/终态不同；外部明确区分“谁拥有最终答案、谁面向用户”。
  这支持 H5：在 preset/合同层写清**每通道的控制权与寻址模型**，而不是三个名字并列。
- “代码编排”对应 workflow；外部建议代码编排用于确定性/成本可控，LLM 编排用于开放式。我们的
  `eng-teaming` 五档已经接近，但缺“workflow 只在分支同构且可并行时用”的判据（038 的教训）。
- “专门化 agent 而非万能 agent”直接支持 H4：worker 应该是窄组合，而不是角色克隆。

## 5. 提炼：与本仓 S1–S6 的对应

| 外部原则 | 本仓模式 | 含义（I） |
|---|---|---|
| agent 定义要**声明式**（prompt/tools/model/limits） | S1/S2 | 我们的 YAML 只有 composition；缺 worker 级字段与能力清单 |
| **委派 brief 四要素**（objective/output/tools/boundaries） | S4 | `eng-teaming` 有“自包含 brief + 来源坐标”，但没有把它作为**唯一合同**，且混入引擎合同 |
| **effort scaling** 写进 prompt | S2/S4 | 五档有档位、缺预算数字；应进共享合同而非角色 skill |
| **工具/权限按 agent 收窄** | S3 | 通用 worker 继承全组合，正好相反 |
| **深度/并发上限是机制** | S2 | DSH 只能按行 maxDepth/workflow caps；workflow 无 depth gate；需要显式声明 |
| **context 隔离 / fork 选择** | S3 | `subagent` vs `subagent_fork` 已有，但 preset 不声明“这个 worker 用哪种” |
| **handoff vs agents-as-tools 分工** | S5 | 我们三通道的控制权/寻址/终态未统一成一张表 |
| **评估从小样本 + end-state** | S6 | 我们只有挂载/文案测试；委派行为没有 eval set |
| **成本 15×** | S2/S4 | 需要“默认自己做”的判据与预算，不只是“可以委派” |
| **durable/resume/tracing** | S5 | 与 BUG-041/044 同向；属工程面，不是 preset 能单独解决 |

## 6. 初步的“优雅形状”（I，待下一份材料展开）

四层，而不是现在的一层半（preset 里混着 persona + tools + policy + skills）：

1. **角色定义**（identity + 领域 skills + 模型/预算）→ 生成自 base + delta，运行期自包含。
2. **委派政策**（何时委派/走哪条通道/effort 预算/brief 四要素/控制权与寻址）→ 一份共享的
   模型面合同，角色 skill 只引用。
3. **worker profiles**（窄任务组合：工具 allowlist、深度、fresh/fork、模型）→ 命名专家用
   专用 preset；通用 worker 用一个“worker”preset，而不是继承角色全组合；teammate 受 DSH
   继承 Lead 的约束，单独记限制。
4. **观测与评估**（traces + 小样本 end-state eval）→ 本仓用 keyless 面级矩阵 + 偶发真模型探针，
   不把模型塞回 CI。

这四层与外部三家的分法同构：Claude Code 的 agent 定义/工具约束、OpenAI 的编排模式选择、
Anthropic 的 orchestrator 提示与 effort/eval 经验。

## 7. 待验 / 不迁移

- 外部文档没有回答 DSH 特有的“preset 无继承 + team 继承 Lead + workflow 克隆父组合”三约束；
  这三条决定 H4/H5 只能在部分通道成立（见 DSH affordance 材料）。
- 外部实践的 token/性能数字（90.2%、15×、40%）是各自场景的结果，**不可当作本仓收益承诺**；
  只用作“为什么这样分层”的动机。
- 没有纳入的：LangGraph supervisor、Google ADK、A2A agent card、Cognition 的反方观点；
  下一轮若需要再取一手来源，不以二手摘要替代。
