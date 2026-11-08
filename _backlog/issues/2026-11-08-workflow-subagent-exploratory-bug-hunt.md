---
status: 推敲中
opened: 2026-11-08
---

# 推敲：用探索性测试系统寻找 workflow + subagent 缺陷

> 立卡：2026-11-08 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否
>
> 上游研究题：[workflow + subagent 探索题](../research/workflow-subagent-exploration/README.md)；完整的自包含 briefing、机制矩阵、探索设计、预算与边界均见[研究材料](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。本卡引用并消费该研究题的全部相关信息；若正文简述与研究材料冲突，按下方“研究范围地图”回到该材料和所链接的一手来源核对。

**问题与期望结果：** VP-Eng 刚接入 `workflow` 并调整职能 preset 的 subagent 深度。已有证据证明若干最小与 happy-path 组合可运行，但还没有一轮以发现缺陷为目标的 exploratory testing。需要设计一轮有充足探索空间、能沿新线索继续追查、同时具备独立 oracle、可复判证据和停止边界的测试；目标是尽可能发现当前 workflow、subagent 及其组合中的可复现问题，而不是证明一张预设矩阵“全绿”或宣称找尽所有 bug。另需确认一个 child 失败后，父代理是否有清楚、可验证且有限次的重跑办法。

判断本轮推敲完成 = 探索章程、入口与风险范围、重跑验证路径、证据形式和可执行预算均已写清；真模型运行的具体范围与成本已另行向用户明确提出，未获明确批准前不启动。

**当前情况：**

- VP-Eng workflow 接入、已证真跑、已修提示 bug、工作树并行改动与未验边界都记录在[落地 Note](../../notes/implemented/2026-11-08-vpeng-workflow-channel.md)。已有证据不可重复包装成本轮探索结论。
- 本研究题的完整 briefing、场景矩阵、fixtures、harness、判据、预算和交接步骤在[研究材料](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。该材料目前是机制依据与初版计划草稿，不是结果；原有固定矩阵含已识别的深度、成功判据与轮数矛盾，须按本卡重新收敛，不得原样执行。
- 归档的委派拓扑研究[机制材料](../_archive/research/vp-eng-delegation-topology/2026-11-08-topology.md)解释 workflow 与 subagent 的互补职责、质量保证边界、复杂任务判据、模板、风险及上游历史；它也是本轮 charters 的设计依据，不是当前执行授权。
- 当前合同与模型面 owner 包括 [delegation 合同](../../docs/delegation.md)、[VP-Eng eng-teaming](../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md)、[VP-Eng eng-workflow](../../packages/company-pack/presets/vp-eng/skills/eng-workflow/SKILL.md)、[CEO team 路由 skill](../../packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md)、[VP-Eng preset](../../packages/company-pack/presets/vp-eng/agent.cordis.yml) 和 [CEO preset](../../packages/company-pack/presets/ceo/agent.cordis.yml)。tool 行以 preset 为准，docs 为合同摘要。
- 现有真模型入口探针 [vp-eng-workflow-probe](../../probes/team/vp-eng-workflow-probe.mjs) 覆盖两题：N≥3 同构事实应调用 workflow；独立 V&V 应走 `system_qa` 且不以 workflow 替代。它是窄回归锚点，不足以替代本轮 bug hunt。
- DSH 机制一手来源、对应段落和本仓边界已在[研究材料 §1–§3](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)逐项列出。要确认 API 或失败语义时回到材料引用的 `vendor/dsh` workflow/subagent/team README、subsystem 文档与源码，不凭记忆推断。
- 确认的关键失败分类：workflow child 非 completed 或缺 structured result 可折为 `null`；child startup 拒绝 `AGENT_START`、child result promise rejection `AGENT_RESULT`、取消和 fatal script error 不能作为普通 child 失败吞掉。`stopReason: error` 本身不能证明可重试。subagent `started` 只代表 activation accepted，不能当作完成。入口 depth 不同，已知 workflow 本身没有 maxDepth 闸不应报成新 bug。
- 隔离与测试限制：`runtime/rehearsal-workspace` 持久且旧 journal 可能误导；`ensureRehearsalWorkspace` 只幂等成型，不清旧状态。真模型探针不进 `pnpm test`；keyless fake-provider/纯逻辑测试与真模型行为观察必须分开报告。详见研究材料 §2、§8–§12 及所链接的 repo 合同。

**未决问题：**

1. 如何把探索空间给足，又保留 charter、oracle、证据与停止边界？候选方向见本卡“探索设计草案”；charter 数量、时长和优先级待裁定。
2. 哪些入口必须做 forced 机制验证，哪些只做 natural exploration？候选入口为 VP-Eng root、CEO→`vp_eng` 命名 child、VP-Eng Lead 创建的 teammate、CEO 的同名 teammate 负例。不能推断这些入口能力/深度完全相同。
3. 如何把“subagent 失败后重跑”拆成可验证的机制行为与模型行为？建议 keyless fake provider 确定性注入普通 child failure，父 workflow 最多重跑一次；真模型探索只观察是否基于真实 terminal/notice 重派，不为造案例诱导 child 输出“我失败了”。fake provider 接入本仓 keyless composition 的 owner/最窄检查尚需确认。
4. “不要紧巴巴”的候选预算是否合适？初步建议全局 120 分钟、24 个 parent turn、64 个 child activation（含 retry）、每 workflow 最多 6 个 child/8 items/4 并发、每 task 一次重跑、单 turn 300 秒、合成证据总量 8 MiB。每项都要确认实际可强制；输出/token 上限若不能机械执行，必须说明如何观测与停止，不得声称已受控。
5. 是否覆盖 background/cancel、`workspace-write` 沙箱、发布安装链、其他职能工具面与长期采纳率？建议本轮以 VP-Eng bug discovery 为主，其余明确延期；用户批准后才可加面。
6. 真模型证据采用何种合成归档格式和留存期？必须可离线复判且不能收真实业务数据、凭据或用户会话内容。

**下一步：** 第一轮已执行（2026-11-08，结果见下方「第一轮执行结果」）：6 张缺陷卡（2×P1 + 4×P2）+
2 条当场修 + keyless 重试机制档。后续只在用户点名扩面时继续；未覆盖项（长期采纳率、部署面、
其他职能、更多 natural 变体）保持不做，扩面先问用户。

## 研究范围地图

本节把上游研究材料全部章节映射到本卡的工作范围，避免接手者只读摘要而漏掉机制或限制。主材料较厚，按需选读；**所有 §1–§15 都是本问题的研究上下文**，但不等于所有内容都要在测试中重复验证。

| 上游材料 | 本卡如何消费 | 权威/关联依据 |
|---|---|---|
| §0 术语与符号（W/S/M1/M2/R/C/T/N、forced/natural） | 统一 charter、事件和报告中的路径标签；报告实际路径，不把符号当期望拓扑 | 本材料与对应 session 的 `request/header` / events |
| §1.1 workflow 机制、hooks、options、继承、结果、失败、沙箱、深度、background | 搜索脚本误用、空结果、partial/null、fatal 被吞、结果溢出、嵌套/取消/后台收尾；已知限制只作为边界 | [tool-workflow README](../../vendor/dsh/packages/workflow/tool-workflow/README.md)、[workflow-ptc README](../../vendor/dsh/packages/workflow/workflow-ptc/README.md)、[workflow 子系统](../../vendor/dsh/docs/subsystems/workflow.md)、[runtime.ts](../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts)、[host.ts](../../vendor/dsh/packages/workflow/workflow-ptc/src/host.ts) |
| §1.2 subagent activation、配置、继承、续驶、CEO team scope 陷阱 | 验 acknowledgement 与 completion 的分离、child terminal/notice、命名 child 不可当 teammate 控制 | [tool-subagent README](../../vendor/dsh/packages/subagent/tool-subagent/README.md)、[subagent 子系统](../../vendor/dsh/docs/subsystems/subagent.md)、[delegation 合同 §1–§3](../../docs/delegation.md) |
| §1.3 team 对照 | 仅在 T / N 入口 charter 中区分 team 成员继承组合与角色 preset；不把 name 当 persona | [agent-team README](../../vendor/dsh/packages/experimental/agent-team/README.md)、[delegation 合同 §2–§3](../../docs/delegation.md) |
| §1.4 通道边界表 | 用于失败归因、上下文噪声和结果/并发观察；不重复做一张“能力表即测试” | 同 §1.1–§1.3 权威来源 |
| §1.5 深度/继承矩阵 | 选入口和算 depth；重点检查错误理解，不把已知 workflow 无 depth gate 当发现 | [VP-Eng preset](../../packages/company-pack/presets/vp-eng/agent.cordis.yml)、[CEO preset](../../packages/company-pack/presets/ceo/agent.cordis.yml)、[研究材料 §1.5](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md) |
| §2.1 仓库布局与事实 owner | 将发现路由到 preset、docs、Note、probe、test 或 bug 卡的正确 owner | [根 AGENTS](../../AGENTS.md)、[_backlog 章程](../README.md)、[测试宪法](../../docs/testing.md) |
| §2.2 启动、证据分层、凭据与安装形态 | 运行前区分 keyless、挂载、真实入口和真模型证据；不泄露凭据，不拿 link smoke 代表发布安装 | [tests README](../../tests/README.md)、[testing.md](../../docs/testing.md)、[运行环境指南](../../docs/guides/environments.md) |
| §2.3 角色与工具面 | 定义本轮入口、能力负例和 scope exclusion；tool roster 以 preset 为准 | 六角色 preset、[presets 合同](../../docs/presets.md)、本卡范围表 |
| §2.4 流程、门禁、bug 处置和证据纪律 | 所有发现写可复现证据；简单/复杂处理须在授权边界内；不把计划绿或自述写成证据 | [_backlog 章程](../README.md)、[policy P1/P3/P5](../../docs/policy.md)、[testing 宪法](../../docs/testing.md) |
| §2.5 工作树与并行会话 | 基线时保护已有未提交改动；绝不整树 revert，先记录 HEAD/status 并识别归属 | [根 AGENTS](../../AGENTS.md)、实际 `git status` 与差异 |
| §2.6 常见误判 | 每次判定检查可见≠可用、继承组合≠角色、挂载绿≠行为绿 | 本卡事件判据 + `docs/testing.md` 证据分层 |
| §3 已证事实与已知边界 | 作为排除清单，避免重测已证明 happy path 或把部署/长期采纳未验写成 bug | [落地 Note](../../notes/implemented/2026-11-08-vpeng-workflow-channel.md) §验证/未验 |
| §4 H1–H6 假设 | 转成可探索风险主题，不要求每个假设都按原“证伪”句固定执行 | 本卡 §“探索设计草案”与证据表 |
| §5 场景矩阵 | 保留 W/S/M1/M2、R/C/T/N 和 depth/failure 作为覆盖提示；按机制修正 depth，natural 方法差异不硬判失败 | 本卡 §“固定确认性锚点”；场景事实回 §1.5 一手来源 |
| §6 两遍法 | 分离 forced 机制确认与 natural 选择观察；探索部分允许从异常动态分支 | 本卡 charter 定义；[eng-teaming](../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md) |
| §7 fixtures | 采用版本化 manifest、独立 expected values、唯一 trial cwd、前后 hash；不以 prompt 中自报 hash 代替比较 | 本卡 §“隔离、oracle 与证据”；[rehearsal helper](../../tools/lib/rehearsal.mjs) |
| §8 harness / 日志 | 复用已有 Web/RPC/log 读取工具；按 typed events 和 child terminal 读证据；先验证 teammate/child 定位办法 | [probe-web](../../tools/lib/probe-web.mjs)、[session-log](../../tools/lib/session-log.mjs)、[delegation-smoke](../../checks/smoke/delegation-smoke.mjs) |
| §9 五问判据 | 扩成工具可见、实际选择、完整生命周期、oracle 正确、并发/depth/副作用/收尾；S started 不够 | 本卡 §“隔离、oracle 与证据”；vendor typed events 与实际 session records |
| §10 预算与停止 | 用本卡候选全局预算替换旧 4+8+3 轮估算；严格遵守 P3 的墙钟/轮数/输出/取消 | [policy P3](../../docs/policy.md)、本卡 §“候选预算与中止” |
| §11 发现处置 | 按“观察→最小复现→已知限制核对→分级→授权处置→资产收割”走；合法方法差异记观察 | [_backlog bug 规则](../bugs/README.md)、[testing 宪法](../../docs/testing.md) |
| §12 不做/边界 | 作为本轮默认排除项；任何扩面先用户确认 | 本卡 §“范围与排除项”及候选批准摘要 |
| §13 原 Review 清单 | 原 12 个问题已通过本轮对话收敛；已确认自然 S 可合法不调用、R/C/T 收窄、M2 有最小拓扑但可自由扩展、跨通道重叠并发延期、扩面负例延期、最多一次定向复跑等。预算因用户要求“多探索”需重新确认 | 对话裁定需在执行批准摘要中逐项简述；本卡候选尚非最终授权 |
| §14 交接步骤 | 只保留读材料/基线/准备隔离目录/提交批准摘要的顺序；删除“review 后接手者就跑 P1”的歧义 | 本卡授权门与 [_backlog 章程](../README.md) |
| §15 参考 | 本表已列关键入口；对失败/生命周期细节按需回到原链接，不把参考列表当作事实本身 | 本材料 §15 原始链接表 |

## 范围与排除项

**目标范围：**

- 以 exploratory testing 主动搜索 VP-Eng 当前 workflow/subagent 组合中的真实、可复现缺陷；有少量 forced 锚点用于归因，主要测试量留给 guided exploration。
- 以合成、可观察、带来源坐标的研发任务为输入。charter 给目标/约束/oracle，不规定唯一工具序列；执行者按新证据设计下一步，并在硬预算内追查异常。
- 覆盖候选入口 R（VP-Eng root）、C（CEO→`vp_eng`）、T（VP-Eng root 创建的 teammate）、N（CEO 同名 teammate 负例）；范围与轮次由用户批准后锁定，深度不同不得宣称完全等价。
- 将可重试普通 child failure 的确定性 keyless 机制档与 live model 自然失败/重派观察分开；没有自然触发的 live failure 标未覆盖。

**不做：**

- 不宣称一次没有命中 bug 即系统稳定、没有其他 bug 或达到长期采纳率。
- 不把 workflow child/generic subagent 的同模异线程结果称为独立人格评审；独立结论仍由命名 SA/SQA 或人负责。
- 不把 `started subagent` 当完成；不把 `null`、`error`、取消、拒绝、max-tokens 与 infrastructure failure 合并成可重试类别。
- 不改 `vendor/dsh/`；不因本卡或 research 草稿自行改 preset、skill、合同、Note 或业务实现。修复和行为改变需有对应授权。
- 不写真实 `company-workspace`，不打印/提交凭据，不清理共享 rehearsal workspace 历史；每个 trial 用唯一目录与 allowlist 清理。
- 其他职能、CEO root 的 workflow 扩面、`workspace-write` 部署验收、release-smoke、长期使用统计默认延期。

## 探索设计草案

### 1. Charter 方法

本轮是 exploratory testing（探索性测试）：在 charter 给定目标、来源、约束与时间盒内，测试者持续学习系统行为、据观察设计下一步、执行并记录。单次有界 charter/session 是一个 exploratory test；没有脚本不等于没有预期结果、oracle 或收口条件。

每个 charter 至少列：任务与风险、入口/preset/depth/权限、来源坐标、独立 oracle、允许变化的任务形状、typed observation signals、trial 级预算、结束/取消办法、发现记录方式。任务可以改变分支数、先后次序、是否追加核查、W/S/mixed 拓扑、同步/后台与是否重派；只有变化在本轮批准边界和预算内才可执行。

测试者优先追踪：实际工具与请求是否一致、分支是否漏/重、结果是否匹配来源、冲突是否被发现、父会话是否收到正确最终状态、失败后是否有界收口、fixture/工作区是否被意外修改、取消后资源是否收敛。出现异常时转入“最小复现 charter”，保留原始证据，不先改被测提示面。

### 2. Bug-hunt charters

下列为候选搜索主题，不是逐字固定用例或全量承诺；用户批准入口和预算后，执行者按风险选任务并允许沿证据追加 charter。

| Charter | 探索方向 | 重点异常信号 |
|---|---|---|
| 路由/能力 | 对照 R/C/T/N 的真实 catalog 与自然任务选择，交替给目标型和明确方法型 brief | 工具不可见/错 preset、假称调用、CEO team 工具误用于命名 child、depth refusal 被隐藏 |
| 单/多通道拓扑 | 从一项细节、多项同构工作、合并/复核和多轮补证任务探索 W-only、S-only、M1、M2 及重叠运行 | 漏分支、重复工作、错配结果、阻塞、未等待终态、父上下文噪声、路径与权限混淆 |
| 来源/冲突/oracle | 用多份 JSON fixture、冲突版本、缺文件/坏 JSON、无关旧笔记及遗漏来源坐标，探索模型怎样定位、质疑和汇总 | 编造来源、误信旧状态、静默接受 missing、错误汇总、越权改 fixture、同模复核冒充独立结论 |
| 失败/重派 | 观察真实 stopReason、null/fatal、异步 notice、父 turn 结束与 child settlement 的关系；按预算调查定向重派 | 把 acknowledgement 当完成、通知/结果丢失、fatal 被吞、无限重派、超时未取消、结束后 child 仍活跃 |
| 深度/后台/收尾 | 选择不同 actor depth 下的一层嵌套、后台 job、取消与清理路径；workflow 无 depth gate 作为已知风险控制项 | depth 算错、已知限制导致超预算、job settlement 丢失、取消未收敛、session/process/文件残留 |

### 3. 少量确认性锚点

这些锚点给探索归因，不是主工作量，也不强迫 natural run 符合固定拓扑：

- R 上各一条 forced W 扇出、S activation、W+S 混合、多轮混合，使用相同独立 fixture manifest。
- C 通过真实 CEO→`vp_eng` child 验工具链路；分别观察 CEO 路由与 VP-Eng child 行为，不用 CEO team `wait_agent`/`send_message` 控制命名 child。
- T 仅指 VP-Eng root Lead 创建的 teammate；CEO 同名 teammate 属 N，继承 CEO preset，不能当 VP-Eng teammate。
- N 的 PASS 是能力边界被如实处理：拒绝/请求正确 owner/记录预期 depth refusal；不把因 `maxDepth:1` 拒绝的 CEO 子代重派算作成功。
- W 并发只由 agent start/end 时间区间或引擎事件判定；S 与 W 串行/并发都可为合法方法。natural 结果用方法分类，不因不同于 forced 拓扑而记 bug。

深度按 actor 的 durable `delegationDepth` 计算：R root=0；R→S child=1；child→workflow child=2；workflow child 再→generic S=3，应被 `maxDepth:2` 拒绝。CEO→`vp_eng` child=1 的后续路径按相应 tool row 限制另行核对。workflow 本身不传 maxDepth 是已知限制，不是新 bug。

### 4. Child 重跑验证

**问题：** 明确的 child 普通失败后，父 workflow 能否基于真实机器可观察结果重跑同一幂等 task 一次，并在有限次数后报告完整/耗尽？重试决策归父 orchestration，不要求 child 自己循环。

**确定性 keyless 机制档：**

1. 先确认本仓 keyless owner 可用的注入位置；使用真实 workflow runtime 加测试专用 fake `SubagentProvider`，按 task 计数：attempt 1 返回 `stopReason:'refusal'`，attempt 2 返回固定结构化结果，第三次 start 明确拒绝。
2. 父 workflow 仅对该受控试验声明的 retryable ordinary failure 重新派发一次；任务坐标、内容、schema 与 expected manifest 不变，attempt label 和 childId 不同。总计最多两次；第二次失败则回 `{status:'exhausted', missing:...}`，不得启动第三次。
3. 独立判据断言 provider start 次数、两条 child lifecycle（第一次 failed、第二次 completed）、最终 workflow run completed 与最终 JSON 精确匹配 manifest；重复失败时断言 attempt cap 阻止第三次。
4. 另行验证 `AGENT_START`、`AGENT_RESULT` 与取消属于 fatal/取消路径，不能 catch 后伪装为普通 null 或触发安全重试。
5. vendor 的 `workflow-ptc/tests/guest.spec.ts`、`integration.spec.ts`、`workflow-ptc.spec.ts` 有 fake child/provider 行为先例，只读借鉴；本仓测试不写入 vendor。fake provider 接入本仓装配的实际位置仍待确认。

**真模型自然观察：** 仅在 child 真实 terminal/settlement 发生时记录 parent 是否核实失败、是否定向重派、是否等待新 activation 的终态以及 oracle 是否通过。不得用“请说失败一次”、坏数据解释或模型自述充当引擎失败注入。一次都未自然失败时记“live retry 未覆盖”，keyless 机制结果不能外推成模型会重派。

**重试分类限制：** `null` 对 workflow guest 不保留足够 stopReason 区分；`error` 可代表模型或 transport failure；`aborted` 表示取消；`max-tokens` 对相同任务重试可能继续消耗；启动拒绝与 child result rejection 是 fatal。除 fake provider 明确标记的受控结果外，不从 `null` 或散文推断 retryability。

## 隔离、oracle 与证据

- 每个 trial 使用唯一 `runtime/rehearsal-workspace/exp/<run-id>/<trial-id>/` cwd 和独立 `.dsh-company` 状态。fixture 放在该 trial 的受控目录；禁止清理 rehearsal 根或他人的数据，只能删经路径校验确认由本 trial 创建的 allowlisted 目录。
- 人工独立编写 manifest，列出 fixture path、字段、expected value、冲突关系、来源坐标、允许写入路径和预期副作用。脚本记录运行前后 SHA-256 并比较；prompt 自报 hash 不构成只读证据。
- 每轮前确认 dev DSH home 没有其他 writer；同一 home 的真模型试验串行。记录实际 profile、permission mode、vendor pin、repo HEAD/status，不打印凭据，不把 `env | grep` 当凭据检测。
- 每个 trial 记录精确 prompt/charter、入口/preset/depth、fixture manifest/hash、session/run/child ids、typed event 时间线、stop reason、结果/notice、fixture diff、墙钟/调用数/输出量及判定。模型自述只作诊断，不参与 PASS。
- workflow 检查 `tool-workflow/run-start|agent-start|agent-end|run-end` 配对、stopReason 和每支 outcome；subagent 检查 activation call/result、child terminal、completion notice；CEO 命名 child 需等 child settlement，root `turn/end` 不足以代表 child 完成。
- 原始日志如可能包含非合成内容，只放 gitignored runtime；研究材料只保留脱敏摘要、hash 与本地证据路径。能被安全复判的合成事件摘要/manifest 才进入仓库。
- finding 结案前回答：是否抓到可复现异常；哪条行为值得变成 keyless/probe/replay 资产；是否撞到新的运行态事实。未命中也记录探索过的 charter 与未覆盖边界。

## 候选预算与授权门

下表是供用户裁定的**候选**全局硬上限，不是已批准预算，也不能由本卡授权执行：

| 维度 | 候选上限 | 超限动作 |
|---|---:|---|
| 全轮墙钟 | 120 分钟 | 停止新 charter，取消在途 session/job，等 teardown 后收口 |
| parent prompt/turn | 24 | 不再发新 turn，未覆盖主题标记未执行 |
| child activation | 64（含重试） | 不再启动 child，保存现有证据并停止 |
| 单 workflow run | 6 个 agent start、8 items、4 并发 | 执行前检查；caps 不能由模型自行放宽 |
| 单 task retry | 最多 1 次，总计最多 2 attempts | 第二次失败后 exhausted，不启动第三次 |
| 单 turn 等待 | 300 秒 | `session/cancel` 或 job kill；确认 terminal/cleanup，否则按 infra 未收口停止后续 |
| 合成证据总量 | 建议不超过 8 MiB，最终值待批准 | 停止新探索；关键判据不得因静默截断而丢失 |

启动前先证明限制可由 harness/engine/job control 强制或监测。不能实际强制的 token/输出限制必须换成可观察停止规则，不许写成已硬控。基础设施失败连续两次就暂停诊断；抓到关键发现后改成只做最小复现与收口，不为跑满时间而继续探索。

**用户批准门：** 计划 review、issue 定性、目录状态、handoff、基线检查都不等于真模型授权。只有用户明确批准本轮入口、charter/场景类别、轮数/墙钟/child/输出预算、权限模式、证据落点和停止/取消办法后才能启动真模型探索；授权外的新 charter 先停下问用户。任何代码或 preset 修复另按其自身授权边界执行。

## 发现处置

- 先记录 observed fact、影响、最短复现、原始事件/fixture 证据、频次、known limitation 比对及未证推断；“本轮没命中”不写成“没有 bug”。
- 合法方法差异和无害路由差异记观察，不报 bug；oracle mismatch、结果/notice 丢失、终态缺失、越权写入、fatal 被吞、取消不收敛等保留为 finding 并最小化复现。
- 简单 prompt/config 修复也须有独立红绿证据与适当授权；复杂 lifecycle/vendor 问题开 `_backlog/bugs/` 卡，不直接改 vendor。触碰 preset 公开行为、常设指令、docs 合同或已记录决定时不得把“简单”当作授权。
- 对每个 finding 决定是否产出 keyless judge/spec、常驻 probe、合成 replay、fixture 或明确不升格理由；门禁升格另按 policy P2，不因一次发现自动加 gate。

## 方案与取舍

- **A（推荐）：少量 forced anchors + guided exploratory bug-hunt charters + 有界 fake-provider retry 验证。** 保留来源坐标、独立 oracle、真实事件与硬预算，允许测试者因新证据动态调整探索方向；发现异常后聚焦复现、归因和收口。此方案让“多探索”意味着更多有价值的发现机会，而不是无界运行。
- **B（不选）：把原 16 格矩阵全部固定跑完。** 它把自然行为压成脚本，预算与格数不符，也会把合法方法差异误判为失败；保留其覆盖主题作锚点，不让它成为全部工作。
- **C（不选）：完全无章程、无 oracle、无隔离的自由探索。** 不能复判，可能被旧 journal 带偏，且缺少 P3 停止/取消纪律。
- **D（不选）：用 prompt 要求 child 自称失败来测试重试。** 文本不能证明 execution lifecycle 或 terminal reason。
- **E（不选）：将任何 `null`/`error`/timeout/aborted 自动重试。** 当前数据不足以可靠判定可重试性，可能掩盖 fatal 或重复非幂等工作。

## 第一轮执行结果（2026-11-08）

> 预算实际：约 60 分钟、10 个 parent turn、约 24 个 child activation；未触发停止上限。完整运行表、
> 未覆盖项与资产收割决定 = [研究材料 §16](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。

| 发现 | 探索方向 | 效果/证据 | 处置 |
|---|---|---|---|
| `agent({schema})` 的 `enum`/`const` 必须配 `type`，模型面描述未说 | R2 强制 workflow + 模型自拟 schema | 首跑整轮 `UNSUPPORTED_SCHEMA`、零 agent；模型补 `type` 后重跑 6 agents 成功 | skill 已修；机制/上游 → [BUG-036](../bugs/BUG-036-workflow-schema-enum-type.md) |
| 根会话 = Lead，团队版控制名 shadow 全局版；契约误写“根不是成员” | R3 委派深度链（模型自然尝试等/催孙代） | `list_agents` 只回 lead、`send_message` 报 `active teammate not found`、`wait_agent` no-active-peer | docs/5 preset 注释/eng-teaming 已修；机制 → [BUG-037](../bugs/BUG-037-root-team-tool-shadowing.md) |
| W 分支内再委派：返回值混入回执、跨轮拼接；schema 分支会 null | R5 W→S 嵌套 | 分支返回 `started subagent … <值>`；两轮才拿到值 | “分支默认叶子”规则；机制 → [BUG-038](../bugs/BUG-038-workflow-branch-nested-delegation-result.md) |
| 命名 child 同时 `send_message` + 完成通知，父收两份 | C1 CEO→`vp_eng` | 父会话收到 “Agent … sent a message” + “finished … closing message” | 已修 `eng-workflow` 第 5 步；绿 C2 |
| CEO 用 `bash sleep 25/30` 轮询 child，不结束本轮 | C1 | turn 142s；child 完成后才回完整答案 | 已修 CEO skill/persona；绿 C2 |
| workflow >50k 结果硬截断，spill 文件也是截断副本 | R7：**原样返回全量 rows 的溢出压力** | 完整 ~85.9k 字符 → 实际收到 49,929；spill 文件 50,102 且含同一截断标记；父只能落 rows 0–2 完整、row 3 半段、row 4/5 null | eng-teaming 已加“别指望 spill”；R9 验证“分支落文件 + 父拿元数据”绿替代；机制/上游 → [BUG-039](../bugs/BUG-039-workflow-result-truncation-lossy-spill.md)（P1） |
| 根门仍会用 `wait_agent` 等 subagent child（团队版） | M2 natural 多轮混合 | `wait_agent` 报 `no-active-peer` 一次；多轮结果未丢（W 4 agents + 2 S，三轮原文/分歧保留） | 已把 `wait_agent`/`interrupt_agent` 补进 eng-teaming 控制面 |
| C 入口 depth 链：命名 child 起 W1 后再起 W2 被拒 | CD2 CEO→`vp_eng` | W1 的 `subagent` 被拒 `depth 3 exceeds maxDepth 2`；声明面 `current 2 / max 2 / remaining 0`；W1 未读文件/未重试；child 用 `bash sleep 90/75`（观察） | depth 边界 PASS；sleep 记观察 |
| 带 schema 的分支只回文本 → 父拿 null，文本答案被丢弃、无诊断 | R10 后台 W 自然完成 + schema | m01 child 读了文件、回正确 JSON 文本、`turn/end completed`；父 `modules[0]=null`、`count:3`；job/run 仍 completed；补跑 subagent 才拿到 m01 | eng-teaming 已加“schema 分支明确要 structured_output / 验收看 null/count”；机制/上游 → [BUG-040](../bugs/BUG-040-workflow-schema-text-answer-discarded.md)（P2） |
| `subagent_fork` 只带已完成轮，同一 turn 刚读的不在 | R12：同 turn 内 read a 再 fork | fork 报 `a = NOT-IN-CONTEXT`，拒绝重读伪造；b/c workflow 值正确；父记 `fork_inherited_a: false` | eng-teaming 五档表已写明；观察 |
| 宿主重启后 in-flight child 成孤儿，父收不到终态也查不到 | RS1：child 在跑时 SIGTERM 宿主再重启 | 父 durable 无新 turn/notice；child durable `turn/end interrupted`；父再问时 `list_agents` 只 lead、`job_list` 空，自述无法查询 | eng-teaming 长跑条已加“别跨重启等通知”；机制/上游 → [BUG-041](../bugs/BUG-041-host-restart-orphans-inflight-child.md)（P1） |

第二轮补充观察（不新增缺陷卡）：R11 pipeline 两阶段 4 项×2 stage 全过（8 agents 超出 6-agent 探索上限，
未强制，过程记录）；V1 vp-sales 无 workflow、如实改用 4 个 subagent（PASS），但 generic child 双份
`send_message`（F12）；R13 fork 继承用“问 fork”不可证——它会重读源文件并声称继承，需用磁盘上不存在的
token（F13）；WW1 `workspace-write` 在本机被 Seatbelt 阻塞（`sandbox_apply: Operation not permitted`），
不记 bug，部署面待 Linux/WSL 或修 Seatbelt 后再验。

其余观察（不记为 bug）：R1/T1 小任务自己做是合法方法差异；R4 后台取消干净（job killed、run cancelled、
6 agents cancelled、无残留 sleep），但模型看不到 run stopReason；N1 负例如实报缺并指出正确路线；
keyless fake-provider 4/4 证明 retry-once 可行、`AGENT_START`/`AGENT_RESULT` 为 fatal、两次失败停在
2 starts；R8 的 `session/cancel` 让前台 workflow 的 turn/run/6 agents/child 全部收敛到 cancelled/aborted，
无残留 sleep；R9 用“6 分支各写 400 行文件、父只拿 path/行数”把返回值压到 ~0.6k 字符，父用 wc/awk/md5
独立核对全过——这是 >50k 结果的可复现替代形状。

## 关闭条件

本卡结论必须确定做/以后做/不做/消化之一并写明范围与排除项。若建议做，先提交用户批准候选入口、charters、预算、证据落点和真模型启动申请；批准未取得前不执行。卡的关闭只表示推敲结论与下游申请/去向记录齐全，不表示 exploratory testing 已经跑过，也不表示发现结论已产生。
