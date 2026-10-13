---
topic: 培养
intent: "为 Agent 培养方案比较外部反馈、记忆与评估实践。"
---

# Agent 培养：外部反馈、记忆与评估的一手证据

服务活卡：[Agent 培养](../../issues/2026-10-13-agent-cultivation.md)。读取日期：2026-10-13。
本文为外部研究原料；未验证 DSH 当前能力，未实施培养机制。

## 获取范围与限制

- 已实际调用 `web_search`，但搜索插件请求 `https://api.deepseek.com/anthropic/v1/messages` 报 `TypeError: fetch failed`；不能宣称完成全网检索或覆盖最新实践。
- 下列资料均实际通过 `web_fetch` 读取。LangChain HTML 正文截断后读取同站 `.md` 完整正文；其他长文只使用已返回内容中的原句，不把未读取章节当证据。
- 论文摘要可证明作者报告的方法与结论；本次未复现论文、核验完整实验设计或运行官方代码。论文数值与厂商内部实验均不能直接作为本项目预期收益。
- AutoGen 来源明确为 0.2 归档文档；历史实现状态不能推断当前版本能力。SDK 与其他框架的 API 不是 DSH 的机制合同。
- 研究技能要求再次委派，但子 Agent 深度上限阻止嵌套委派；本次自行读源。依上级明确授权，仅创建本证据文件，不修改实现、索引、vendor 或 Note。

## 1. 角色：职责、工具与控制权

**来源及版本**：OpenAI Agents SDK 官方在线文档；未钉源码提交。
URL：https://openai.github.io/openai-agents-python/agents/

**原句**：
> An agent is a large language model (LLM) configured with instructions, tools, and optional runtime behavior such as handoffs, guardrails, and structured outputs.

> Manager (agents as tools): A central manager/orchestrator invokes specialized sub-agents as tools and retains control of the conversation.

**事实**：文档分别定义 manager 保留对话控制与 handoff 将控制交给专家两种协作模式；角色可配置指令、工具与输出类型。

**借鉴判断**：五角色的培养记录应连接实际职责、可用工具、产物和验收；教练关系必须明确“提供建议”与“接管任务”的差别。角色名与人格描述应有实际任务证据支撑。

**风险/不照搬**：命名为专家不能证明具备专长；更换角色提示不等于模型能力提升。借用分工概念不构成再造 DSH 调度器的理由。

## 2. 记忆：作用域与内容类别

**来源及版本**：LangChain/LangGraph 官方在线概念文档；未钉源码提交。
URL：https://docs.langchain.com/oss/python/concepts/memory
读取正文：https://docs.langchain.com/oss/python/concepts/memory.md

**原句**：
> Short-term memory, or thread-scoped memory, tracks the ongoing conversation by maintaining message history within a session.

> Long-term memory stores user-specific or application-level data across sessions and is shared across conversational threads.

> In practice, it is fairly uncommon for agents to modify their model weights or rewrite their code. However, it is more common for agents to modify their own prompts.

**事实**：短期状态与跨会话记忆分别管理；长期记忆可按 namespace 限定范围。文档区分事实型 semantic、经历型 episodic、规则型 procedural 记忆，并说明主流程写入与后台写入的延迟、新鲜度权衡。

**借鉴判断**：公司共同事实、角色经验与技能/指令可分别呈现；每条成长经验连接来源任务、适用条件与最后验证日期。使用现有载体承载这些信息，再检验检索是否帮助真实任务。

**风险/不照搬**：完整聊天记录不是可靠长期知识；检索相关不等于事实正确。大 profile 更新可能丢信息，集合又可能重复或难以更新。不能因分类有用就假设必须引入 LangGraph 或向量库。

## 3. 跨会话教学：记住与掌握分别验证

**来源及版本**：Microsoft AutoGen 0.2 官方归档文章，2023-10-26。
URL：https://microsoft.github.io/autogen/0.2/blog/2023/10/26/TeachableAgent/

**原句**：
> Teachability addresses these limitations by persisting user teachings across chat boundaries in long-term memory implemented as a vector database.

> Instead of copying all of memory into the context window, which would eat up valuable space, individual memories (called memos) are retrieved into context as needed.

**事实**：Teachability 持久化用户教授的事实、偏好和技能，按需检索；另一 TextAnalyzerAgent 辅助识别与重述可记忆内容。作者指出额外 LLM 调用会增加等待时间。

**借鉴判断**：用户针对真实任务给纠正或方法后，形成可查看、纠正、撤销并有适用范围的教学记录；“已记住”可由跨会话召回检验，“已掌握”须由任务表现检验。

**风险/不照搬**：记忆会保存用户教错的内容；文章示例也包含错误归属信息，不能把教授内容自动视为权威知识。旧版 API 和演示成功不能证明本项目实现效果。

## 4. Reflexion：以反馈与反思文本改变后续尝试

**来源及版本**：作者论文摘要，arXiv:2303.11366v4，2023-10-10。
URL：https://arxiv.org/abs/2303.11366

**原句**：
> We propose Reflexion, a novel framework to reinforce language agents not by updating weights, but instead through linguistic feedback.

> Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials.

**事实**：该方法不更新模型权重，把反馈转成反思文本并保存于经历记忆；接受标量、自由文本及外部或内部模拟反馈。作者报告多种任务上的改善，包括当时 HumanEval 实验结果。

**借鉴判断**：培养闭环可连接“失败产物 → 反馈依据 → 具体教训 → 下次同类任务验证”；反思应指出可执行调整与证据，而非泛泛要求更认真。

**风险/不照搬**：内部模拟反馈不是环境真值；产出反思文字不能证明改善。论文报告的 91% 与 80% 比较依赖其模型、任务和协议，不能外推为公司角色提升幅度。

## 5. Voyager：课程、技能库与环境验证

**来源及版本**：MineDojo/Voyager 项目官方研究页，2023 年研究；网页未钉修订版本。
URL：https://voyager.minedojo.org/
关联论文：https://arxiv.org/abs/2305.16291

**原句**：
> Voyager consists of three key components: 1) an automatic curriculum that maximizes exploration, 2) an ever-growing skill library of executable code for storing and retrieving complex behaviors, and 3) a new iterative prompting mechanism that incorporates environment feedback, execution errors, and self-verification for program improvement.

> Voyager interacts with GPT-4 via blackbox queries, which bypasses the need for model parameter fine-tuning.

**事实**：项目在 Minecraft 中使用自动课程、可执行代码技能库与迭代提示；技能可检索和组合，项目报告在新世界的复用测试。参数微调不是该学习方式的必要条件。

**借鉴判断**：从已观察短板和任务依赖选择小型练习；经验收的做法才进入可复用技能库，记录前置条件、适用范围、验证任务和版本。

**风险/不照搬**：游戏环境状态与成功判据比公司业务更结构化；不能照搬无界探索、新颖性奖励或任意生成代码执行。技能数量增长不证明业务能力增长。

## 6. 教练循环：清晰标准、增量反馈与停止条件

**来源及版本**：Anthropic 官方工程文章，2024-12-19；页面提示工具生态已变化。
URL：https://www.anthropic.com/engineering/building-effective-agents

**原句**：
> In the evaluator-optimizer workflow, one LLM call generates a response while another provides evaluation and feedback in a loop.

> This workflow is particularly effective when we have clear evaluation criteria, and when iterative refinement provides measurable value.

> During execution, it's crucial for the agents to gain “ground truth” from the environment at each step (such as tool call results or code execution) to assess its progress.

**事实**：作者将生成者与评估者迭代列为常见模式，但限定适用前提；Agent 应借助工具结果、执行结果等环境反馈判断进展，并可设置最大迭代等停止条件。

**借鉴判断**：主办产出，教练按任务标准指出缺陷，主办修订，以实际验收收口；轮数和预算有上限，无新增证据或收益时停止。

**风险/不照搬**：同模型多个角色可能共享偏差，另叫教练不自动产生独立正确性。不要默认给每个任务增加无界互评循环。

## 7. AgentEval：评价职责分离，评价器本身也需检验

**来源及版本**：Microsoft AutoGen 0.2 官方归档文章，2024-06-21。
URL：https://microsoft.github.io/autogen/0.2/blog/2024/06/21/AgentEval/
关联论文：https://arxiv.org/abs/2405.02178

**原句**：
> It's highly recommended that application developers validate the suggested criteria leveraging their domain expertise.

> AgentEval currently has two main stages; criteria generation and criteria quantification (criteria verification is still under development).

**事实**：设计中 CriticAgent 提标准、QuantifierAgent 打分、VerifierAgent 检验标准稳定性与区分力；该页面同时明确库当时只有标准生成与量化，验证尚在开发。

**借鉴判断**：教练可提出评价维度，人或既定合同确定标准；评分使用固定标准，以好/坏/噪声样例检查评价器。结果可分维度显示以定位短板。

**风险/不照搬**：架构图不等于全部功能已实现。不能让被培养角色改标准、评自己并自行认定升级；旧版原型不可当成熟产品能力承诺。

## 8. AgentOptimizer：改技能仍需回退与验证

**来源及版本**：Microsoft AutoGen 0.2 官方归档文章，2023-12-23。
URL：https://microsoft.github.io/autogen/0.2/blog/2023/12/23/AgentOptimizer/

**原句**：
> We also include two strategies, roll-back, and early-stop, to streamline the training process to overcome the performance-decreasing problem when training.

> Our approach helps enhance the agents' abilities without requiring access to the LLM's weights.

**事实**：根据训练集历史会话与表现添加、修订、删除函数/技能；提供回退、早停及有效性检查。文章当时列出的实现局限包括典型 assistant-user_proxy 配对与 GPT-4。

**借鉴判断**：候选技能改动保留触发失败、前后版本、试验表现和回退点，走现有维护链验证后再生效。

**风险/不照搬**：标题中的 train 主要是 Agent 技能优化，不是基础模型训练。运行角色不应据此直接覆盖公司权限、宿主工具或未经验证的 preset。

## 9. 评估：产物、重复表现与回归共同证明成长

**来源及版本**：Anthropic 官方工程文章，2026-01-09。
URL：https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

**原句**：
> The outcome is the final state in the environment at the end of the trial.

> Capability or “quality” evals ask, “What can this agent do well?”

> Regression evals ask, “Does the agent still handle all the tasks it used to?”

> Shared state can also artificially inflate performance.

**事实**：文档区分任务、尝试、评分器、执行记录和环境最终结果；能力评估与回归评估服务不同目的。优先确定性评分，需要时使用 LLM 并与人工校准；独立环境防止残留状态虚增表现。pass@k 表示至少一次成功，pass^k 强调多次全部成功。

**借鉴判断**：从真实失败构建少量能力用例与回归用例，对比前后版本的产物质量、重复成功率、成本和耗时；保存模型、角色配置、记忆及任务版本，界定改善范围。

**风险/不照搬**：单次成功不证明稳定掌握；共享历史或答案可能污染评估。只核验固定工具顺序会误罚有效替代路径。评分标准含糊或错误时，应修正评估，不能一律归咎角色能力。

## 10. 人格连续性与任务能力是不同证据

**来源及版本**：作者论文摘要，arXiv:2304.03442v2，2023-08-06。
URL：https://arxiv.org/abs/2304.03442

**原句**：
> In an evaluation, these generative agents produce believable individual and emergent social behaviors.

**事实**：Generative Agents 以自然语言保存经历、生成高层反思并检索用于规划；在 25 个角色小镇中评估行为可信感及社会行为。

**借鉴判断**：公司面可让用户查看角色记得的合作事件，并从建议/反思回溯原始事件，帮助理解角色连续性。

**风险/不照搬**：believability 不是业务事实正确率、工作质量或专业能力。自主社交传播不能替代公司知识审核或任务授权。

## 11. 反证：无外部反馈的自纠可能退化

**来源及版本**：作者论文摘要，arXiv:2310.01798v2，2024-03-14；ICLR 2024。
URL：https://arxiv.org/abs/2310.01798

**原句**：
> Our research indicates that LLMs struggle to self-correct their responses without external feedback, and at times, their performance even degrades after self-correction.

**事实**：论文研究仅依赖模型固有能力、没有外部反馈的 intrinsic self-correction；在所测推理情境下发现上述局限。

**借鉴判断**：教练应带来新增测试、权威来源、环境结果或人工反馈；允许返回“证据不足”，而非强迫总能给出改善。

**风险/不照搬**：不能把当时模型/任务的结论绝对化为未来模型永远不能自纠；也不能假设多个 persona 互评自然构成外部反馈。

## 12. 多 Agent 的收益依任务与成本而定

**来源及版本**：Anthropic 官方生产工程说明，2025-06-13；内部研究评估，未公开为通用基准。
URL：https://www.anthropic.com/engineering/multi-agent-research-system

**原句**：
> In our data, agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats.

> Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries.

**事实**：该研究系统采用 lead-worker 协作，作者报告特定内部研究评估的改善；同时指出高 token 成本，以及强依赖/共享上下文任务不一定适配。作者强调明确委派边界、跟踪记录、检查点与小规模真实查询评估。

**借鉴判断**：教练按实际短板和高价值任务启用；委派注明目标、交付形式、证据要求与预算。先用少量真实用例核验收益，再决定是否扩大关系网。

**风险/不照搬**：内部评估“提高 90.2%”与特定工具说明试验“完成时间降低 40%”均非本项目收益保证。组队数、互动频率或 token 投入不宜作为成长代理指标。

## 面向公司规划的综合判断（尚未实施）

- 将“成长”区分为知识召回、技能/指令变更和独立任务表现改善；分别标注证据，不用聊天次数或累计经验值替代能力证明。
- 最小可呈现对象：角色职责；来源明确的反馈；候选/已验证/被替代的经验与技能；版本化能力评估；针对真实短板的下一练习。
- 默认关系：主办对产物负责，同事教练提供有依据的批评，评分依既定标准与环境结果，驾驭者提供偏好和领域判断。教练可提出改进候选，不凭自身评分增加权限或直接覆盖现行配置。
- 成长记录应能回答：改了什么、反馈从何而来、在哪些新任务中验证、哪些已有行为未退步、耗费多少；没有验证则明确是候选经验。
- 先检查现有 DSH 会话、共享知识载体、preset/skills 与检查能否承载；外部架构不授权另建记忆、调度器或门禁。本研究未核验具体 DSH 接口，不能把建议写成当前能力。

## 证据的验证边界

逐项复核原句与已获取源文，未做模型或浏览器实验。仓库结构与回归检查由 [活卡](../../issues/2026-10-13-agent-cultivation.md) 记录；文件格式正确与现有测试通过不能证明培养有效。
