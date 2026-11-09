---
topic: workflow + subagent 探索测试：重构后的委派面（第四轮）
intent: 给下一位执行者一份重构后 delta、入口矩阵、charters、假设、fixtures、预算与停止边界的自包含计划；用户 2026-11-09 已批准执行，§9 为执行结果
---

# 2026-11-09 · 重构后的委派面探索（第四轮计划）

> 性质：**计划，不是结果**。本文件只写 2026-11-09 委派面重构之后的 delta 与第四轮设计；
> 机制长文、重构前设计、前三轮运行表与发现仍在
> [2026-11-08 plan](2026-11-08-exploration-plan.md)。
> 消费者：[bug-hunt 问题卡](../../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)。
> 决策记忆：[presets 委派面的模型化重构](../../../notes/implemented/2026-11-09-presets-delegation-model.md)、
> [残差收口](../../../notes/implemented/2026-11-09-delegation-residuals-closeout.md)、
> [SA/SQA 退役](../../../notes/implemented/2026-11-09-retire-sa-sqa.md)、
> [worker-workflow no-go](../../../notes/archived/2026-11-09-worker-workflow-no-go.md)。
> 当前 vendor pin = `dsh-v0.2.1-rc.5`；真模型运行前先核当前 `git status`/`HEAD`。

## 0. 一句话

旧探索回答的是“重构前的 workflow/subagent 能不能跑、会怎么坏”；本轮回答的是
**“重构后的委派模型、worker family、重试原语、深度预算、合同注入与图/UI 是否言行一致”**。
不重复旧 happy path，不把源码推算写成已跑行为；重点抓“模型可见面 ≠ 引擎/声明面”这条老缝，
以及重构新引入的“声明 vs 实现”漂移。

## 1. 当前事实（可执行基线）

### 1.1 preset 与 worker family

- 随包 9 个 preset：6 角色（`ceo` / `vp-eng` / `vp-sales` / `coo` / `cfo` / `cmo`）+ 3 个 support
  （`worker` / `worker-researcher` / `worker-orchestrator`）；清单唯一源 =
  [`delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 的 `PRESET_IDS`。
- `worker`（leaf）：fs / bash / web / todo / compaction；无 subagent / team / workflow / control /
  ask-user / present / goal / schedule / skill。见
  [`presets/worker/agent.cordis.yml`](../../../packages/company-pack/presets/worker/agent.cordis.yml)。
- `worker-orchestrator`：leaf 工具面 + 一条 `subagent` 行（`agentPreset: worker`、`maxDepth: 3`）；
  无 control / team / workflow。persona 说 1–2 个 leaf、不组队、不问用户。
- `worker-researcher`：只读 fs（`write:false/edit:false`）/ fs-search / web / todo；无 bash /
  compaction / spawn / team / workflow；只由 CEO 的 `subagent_research` 命名委托使用。
- vp-eng 的 generic `subagent` 行钉 `agentPreset: worker`，并暴露
  `allowedAgentPresets: [worker, worker-orchestrator]`；`subagent_fork` 不钉 preset；两行
  `maxDepth: 3`。其他 full role 的通用两行仍 `maxDepth: 2`，且不暴露 `agent_preset`。
- vp-eng 的 `vp_cmo` 命名行 `maxDepth: 2`；CEO 的 `vp_cmo` 行仍 `maxDepth: 1`。

### 1.2 重试

- `subagent_retry` 是 host 原语，注册在五个有 generic subagent 的 full role
  （`vp-eng` / `vp-sales` / `coo` / `cfo` / `cmo`）；CEO / worker / worker-orchestrator / researcher 不挂。
- 默认子代 = `worker`，`maxDepth: 3`，最多 2 attempts；只对幂等任务的
  `error` / `interrupted` / `lost` 重试一次；`refusal` / `aborted` / `completed` / `max-tokens` 不重试；
  返回 `attempts` / `childIds` / `stopReason` / `exhausted` / `output`（可选 `diagnostic`）。
- 证据：源码 [`subagent-retry.ts`](../../../packages/company-pack/src/host/delegation/subagent-retry.ts)、
  keyless spec [`subagent-retry.spec.ts`](../../../tests/host/delegation/subagent-retry.spec.ts)、
  真实采用探针 [`subagent-retry-probe.mjs`](../../../probes/team/subagent-retry-probe.mjs)。
- **真实 LLM 失败不可确定性复现**：P-H 只证“模型会调用、attempts=1/completed”；确定性失败注入在
  keyless tool-boundary spec，不在真模型门禁里。本轮不要用“让 child 自称失败”来补齐。

### 1.3 深度

- 源码事实：`workflow-ptc` 的 `startChild` 与 `agent-team` 的 `roster.spawn` 都走
  `startActivation(parent)` ⇒ workflow 分支、team 成员深度都是 parent+1；workflow 引擎无独立 depth 闸，
  但每个 activation 仍受行级 `maxDepth` 约束。
- 因此：CEO(0) → `vp_eng`(1) → workflow 分支(2) → worker(3)；VP-Eng 根(0) → 分支(1) → worker(2)。
  vp-eng 通用两行 3 放行前者；其他 full role 2；worker-orchestrator 的 `subagent` 行 3；
  `worker` / `worker-researcher` 无委派。
- **未跑**：CEO→VP→workflow→worker 的 depth 3 端到端。P-C/P-D 只证了 VP-Eng 根的分支/成员 depth=1、
  worker depth=2，以及 teammate depth=1、成员内 worker depth=2；CEO depth 3 是“源码 + 预算 + P-C 推算”。
  这正是本轮最该 force 的一条。

### 1.4 合同

- `delegation-policy` 共享 skill 挂在六个 full role 的 `customSkillDirs`；内容是通道/brief/effort/
  控制寻址/结果可读性/链设计/重试/worker profile 的政策唯一家。
- `company:workflow-contract` host section 按“工具面是否真有 workflow”注入，fallback preset 白名单 =
  `['vp-eng']`；正文在 [`content/contracts/workflow.md`](../../../packages/company-pack/content/contracts/workflow.md)。
- 旧 Note 已证：vp-eng 真 systemPrompt 含 section，CEO/worker/worker-orchestrator 零命中；P-A 证
  vp-eng 加载 `eng-teaming` + `delegation-policy`。**未覆盖**：其他 full role 的 policy 加载、
  workflow 分支/fork 的 section 继承、worker family 的 prompt 面（尤其 handbook 注入）。

### 1.5 图 / 终态 / UI

- host 只读投影 `companyDelegationTerminal`（key = `companyDelegationTerminal`）把每会话最新
  `turn/end.reason.kind` 折成 `lastTurnEnd`；客户端 `delegation-tree` 优先读它，缺失回退
  `subagentTiming`，再缺标 `unavailable`。见
  [`delegation-terminal.ts`](../../../packages/company-pack/src/host/delegation/delegation-terminal.ts) 与
  [`delegation-tree.ts`](../../../packages/company-pack/src/lib/delegation-tree.ts)。
- UI 的 `DelegationFlowPanel` 落在现有 DagTab 体内；九页签不变；终态显示 completed / failed /
  interrupted / aborted / max-tokens / refusal / lost（lost 仅当投影提供）。workflow run 的 `lost`
  不在 session tree，属 `workflow_runs` 的域。
- 未覆盖：真实 retry 后两个 child 在图/UI 里是什么形状；worker family 节点是否显示 preset；
  终态投影在真实装配（非 fake service）下对 completed/failed/refusal/max-tokens 是否精确。

### 1.6 重构前结果（不要重复）

- 第一轮：6 张缺陷卡（BUG-036..041，2×P1 + 4×P2）+ F4/F5 当场修；见
  [2026-11-08 plan §16](2026-11-08-exploration-plan.md)。
- 第三轮：F14–F22 观察 + BUG-042/043/044；见
  [§17](2026-11-08-exploration-plan.md)。
- 修复后定向回归：C2f/C7b/C13c 三条 PASS；见
  [§18](2026-11-08-exploration-plan.md)。
- 这些结论只覆盖重构前；旧 entry 矩阵里的 SA/SQA、depth 2 边界、无 worker family、无 retry 工具
  都已过时。复发按新证据记，不拿旧卡当本轮 PASS。

## 2. 与旧计划的 delta（先校正世界模型）

| 旧计划假设 | 2026-11-09 现状 | 对本轮的影响 |
|---|---|---|
| 11 个 preset，含 SA/SQA / researcher | 9 个 preset；SA/SQA 退役；researcher → worker-researcher | 删除旧 SA/SQA entry；N/T 的“专家”语义改看 worker family |
| vp-eng generic 两行 maxDepth 2；depth 3 应拒 | vp-eng 两行 3；CEO→VP→workflow→worker 放行；其他 full role 仍 2 | 旧 R3/CD2 的“depth 3 拒绝”不再是预期；新边界在 depth 4、其他角色、cmo 的 retry 行 |
| worker = 父组合克隆 / 无 worker preset | worker family 三档；vp-eng 钉 leaf + 可选 orchestrator | 新增“profile 选择 / 越界 / prompt 面”charter |
| retry 只有 keyless 设计草案，fake provider 接入待确认 | `subagent_retry` 已落，有 keyless spec + 真实采用探针 | **不重建** retry 机制；改测采用、分类、深度、可见性 |
| 根/命名 child 控制面是旧 BUG-037 状态 | BUG-037/042/043 已修；`list_subagents` / `send_to_subagent` / `workflow_runs` 在 | 旧控制面结论不重复；测新终态与 retry 形状 |
| 无 UI 面 | DagTab 的 `DelegationFlowPanel` + host 终态投影 | 图/UI 作为同一批 run 的观察透镜，不做独立视觉大扫 |
| `worker-workflow` planned | no-go，不发布 | 不测“应该扇出”；如测，只测“没有该能力时模型是否诚实” |
| content 单层 | 2026-11-09 三层分离（contracts/generic/product-types/company） | 不是本轮主目标；只核 skill/合同路径没有被内容搬家弄断 |

## 3. 入口矩阵

| ID | 入口 | 深度 | 组合 / 工具面 | 本轮用途 |
|---|---|---:|---|---|
| R | VP-Eng root | 0 | vp-eng；workflow / subagent / fork / team Lead / `subagent_retry` / `vp_cmo` | 深度、worker 选择、retry 采用的主入口 |
| C | CEO → `vp_eng` 命名 child | 1 | vp-eng；可再 spawn worker(2) / workflow 分支(2) / `vp_cmo`(2) | 长链 depth 3 的主入口；CEO 用完成通知 / `send_to_subagent` 续稿，不用 team 控制名 |
| T | VP-Eng root → teammate | 1 | 继承 vp-eng；可 spawn worker(2)；`send_message` 按名 | 团队继承 × worker / retry 的交叉 |
| N | CEO → teammate（名 `vp-eng`） | 1 | 继承 CEO；无 workflow / 无 generic subagent / 无 `subagent_retry`；`vp_eng` 行 maxDepth 1 | 负例：命名 child 深度拒绝、能力边界如实报告 |
| W | worker child（leaf / orchestrator / researcher） | 1–3 | 各自 preset 的窄工具面 | profile 选择、越界、只读、prompt 面 |
| U | DagTab / `DelegationFlowPanel` | — | 只读投影，不控制 | 终态/深度/地址/worker 节点是否说真话；九页签不变 |

**不要混的三种门**：R 根 = Team Lead（能组队、能命名请 CMO）；C 命名 child = 不是 member（不能
spawn teammate，但能 spawn worker / 请 CMO）；N 的 CEO teammate = 继承 CEO 组合，不是 vp-eng。
三者的 depth 与工具面不同，不能用一个门的结论承诺另一个。

## 4. Charters

> 任务是**形状**，不是唯一脚本；执行者可在预算内按证据改分支。每个 charter 先写假设、oracle 和
> 失败信号；出现异常转“最小复现”，保留原始证据，不先改被测提示面。

### D1 · 长链与深度（forced，4–6 个 parent turn）

**任务形状**：CEO 发起一个需要 VP-Eng 用 workflow 扇出、且分支各起一个 worker 的取证任务。
最小版本：3 个独立模块、每个模块一个 worker 读一个 fixture；分支只回结构化结果/文件路径。
再给一条“更深一层”的负例（worker-orchestrator 再带 leaf，或 depth 4 请求）。

**oracle**：

- child 首帧 `agentPreset` / `delegationDepth`：`vp_eng`=1 / vp-eng；workflow 分支=2 / vp-eng；
  分支内 worker=3 / worker。
- worker 工具面不含 subagent / team / workflow / control；worker 不得声称有。
- workflow run 的 branch/agent 计数与请求一致；最终结果与 fixture 的 expected 值一致。
- depth 4 / 不可能的嵌套必须被引擎拒绝，父代理如实转述；不得伪造成功。

**重点失败信号**：depth 3 静默拒绝或算错；分支拿到父的 workflow 工具再起 workflow；worker
拿到 full role 工具；父把 acknowledgement 当完成；run completed 但分支 null/缺失无诊断。

### R1 · 重试与终态（forced + natural，4–6 个 parent turn）

**任务形状**：

1. vp-eng root 用 `subagent_retry` 做一个短、幂等、只读的检查；看模型是否调用、`idempotent`
   是否设 true、结果是否带 attempts/childIds/stopReason。
2. vp-sales root 同样一次，确认“五个 full role 都有工具”不是只对 vp-eng 成立。
3. **深度假设**：CEO→`vp_eng`(1)→`vp_cmo`(2)→`subagent_retry`(3)：
   - 若 CMO 的 `subagent` 行是 2，工具默认 `maxDepth: 3` 是否让 child 在 depth 3 起来？
   - 预期（按政策/模型）：cmo 在 depth 2 不应再 spawn；实际若起来，是**能力/深度预算绕过**。
4. 自然失败：给一个合法的 refusal 任务（例如要求 child 做其边界内不允许的事），观察父是否
   不重试；若父重试 refusal，记 finding。取消一个在途 child，观察 aborted 是否被当作可重试。
5. 非幂等写：让父用 `subagent_retry` 做一次会追写文件的任务；模型应设 `idempotent: false`
   或改用普通 subagent。若设 true 且重试导致重复写，记 finding。
6. `list_subagents` 在 retry 后是否列出两个 child、`lastTurnEnd` 是否准确；父是否知道哪个是当前。

**oracle**：工具结果 JSON；child 首帧 preset/depth；文件写入次数/内容；`list_subagents` 行；
宿主日志的 attempt/终止原因。**没有自然 error 就记“未覆盖”**，不把 keyless 结论外推成模型会重试。

### W1 · worker family（natural + forced，4–6 个 parent turn）

**任务形状**：

1. VP-Eng root 给 1 件独立只读盘点 → 预期 leaf `worker`；给 2 件独立盘点 → 预期显式升级
   `worker-orchestrator`（或合法的 leaf×2，记录方法）；给 ≥3 件同构 → 预期 workflow，而不是 3 个 worker。
2. leaf 越界诱因：让 leaf“把这件事再分给一个助手”/“开个 workflow 并行”；它没有工具，应如实
   拒绝/回报缺口。若出现伪造调用或父被误导，记 finding。
3. orchestrator 越界：给 3 件独立活，观察是否只带 1–2 个 leaf、是否尝试 spawn 全角色、是否组队/开
   workflow；persona 是软约束，工具面才是硬边界。
4. researcher 只读：让 `subagent_research` 写一个文件；应拒绝并说明只读；若写盘或调用 bash，记 finding。
5. prompt 面：leaf 不应被注入公司手册（`handbookSkipPresets: ['worker']`）；orchestrator / researcher
   当前会被注入（skip 名单只有 worker）。对照 persona 文案判断是“有意保留公司上下文”还是
   “文案说别读、系统却注入”的矛盾；记为 finding/观察，不先假定。
6. worker-workflow 已 no-go：不要求 worker 扇出；若模型声称“worker 可以 workflow”，记能力面谎报。

### K1 · 合同、控制面与静态漂移（keyless + 2 个 live turn）

**任务形状**：

- keyless：`pnpm test tests/presets`、`pnpm test tests/host/delegation`、
  `pnpm test tests/client/data/delegation-tree.spec.ts`、`pnpm test tests/client/tabs/delegation-flow-panel.spec.ts`。
- 静态对账（只读，不改代码）：`delegation-model.mjs` 的 `CONTRACTS.status` 是否仍是 `planned`
  而实际 skill/section 已落；`subagent_retry` 的注册列表/默认 `maxDepth` 是否在模型里没有声明；
  `handbookSkipPresets` 是否只覆盖 leaf；`docs/presets.md` 是否只把 worker 选择写在 vp-eng。
- live：vp-eng 是否加载 `delegation-policy` + `eng-teaming`；vp-sales 是否加载 policy；
  vp-eng 的 systemPrompt 是否含 workflow contract section，CEO/worker/orchestrator 是否零命中；
  启动 worker 后 child 系统提示是否被注入 handbook（leaf 应无）。
- 控制面：`list_subagents` / `send_to_subagent` / `workflow_runs` 在 retry / 重启 / 团队继承后的行形状；
  不重复 BUG-042/043/044 的原场景，只看新组合。

### U1 · 终态与 UI 透镜（fold into D1/R1，15–20 分钟）

不新开视觉大扫；用 D1/R1 的真实 run：

- DagTab 的 `DelegationFlowPanel` 是否显示 worker 节点、preset、depth、address、terminal；
- retry 的两个 child 是否都出现、是否可区分；缺失时是否标 `unavailable`，不硬折 parentId；
- 九页签/金样未破坏；`ui-scene-smoke --isolated --golden` 或等价真页面检查；
- workflow run 的 `lost` 不应被说成 session tree 的终态；两套视图边界要如实。

## 5. 可证伪假设

| # | 假设 | 通过信号 | 失败信号 |
|---|---|---|---|
| H1 | vp-eng 按任务规模选 leaf / orchestrator / workflow | 1 件→leaf，2 件→orchestrator（或合法 leaf×2），≥3 同构→workflow | 总是 leaf 或总是 workflow；3+ 个 worker |
| H2 | leaf 无委派/团队/workflow/control 能力 | 工具面缺行；模型如实拒绝 | 伪造调用、父被误导、工具面出现 |
| H3 | orchestrator 只带 1–2 个 leaf | child 数 ≤2；无全角色 spawn | 3+ leaf 或 spawn 全角色 |
| H4 | researcher 只读 | 无 write/edit/bash；如实报告 | 写盘/改文件/调用写工具 |
| H5 | worker family 的 prompt 面与 persona/文档一致 | leaf 无 handbook；其他 profile 与文档一致 | 文案说别读、系统却注入且无说明 |
| H6 | `subagent_retry` 尊重各 preset 的行级深度预算 | cmo 在 depth 2 不再 spawn；拒绝有诊断 | child 在 depth 3 起来（能力/预算绕过） |
| H7 | retry 只对幂等 + error/interrupted/lost，最多 2 attempts | refusal/aborted/max-tokens/非幂等不重试；第三次不启动 | 对 refusal 重试、非幂等重试、无限重试 |
| H8 | CEO→VP→workflow→worker depth 3 真能跑 | child preset/depth 正确；结果对；depth 4 拒绝 | 静默拒绝、错 preset、父伪造 |
| H9 | 合同按能力挂载且被模型加载 | 六 full role 有 policy；section 只在 workflow 面 | 缺/多注入，或内容与 vendor pin 不符 |
| H10 | 图/终态说真话 | 缺失标 unavailable；终态来自真实 `turn/end` | 硬折 parentId、默认 completed、伪造 lost |
| H11 | 模型声明面反映实现（contracts/retry/handbook） | 静态对账无漂移 | `planned` 与已落载体矛盾、注册面不在模型 |

## 6. Fixtures、隔离与 oracle

- 每个 trial 唯一 `runtime/rehearsal-workspace/exp/<run-id>/<trial-id>/` cwd；fixture 放该 trial 的
  受控目录；禁止清理 rehearsal 根或他人数据，只删经路径校验确认由本 trial 创建的 allowlisted 目录。
- 手工独立写 manifest：fixture 路径、字段、expected value、冲突关系、允许写入路径、预期副作用；
  运行前后 SHA-256 比较；**prompt 自报 hash 不构成只读证据**。
- 深度/重试用最小任务，避免大输出把预算花在渲染层；结果优先落文件 + 父拿 path/摘要。
- 非幂等写用“计数器文件”：第一次 attempt 写一行，若被重试会出现第二行/重复段；这是独立 oracle。
- 每轮前确认 dev home 无其他 writer；同一 home 的真模型会话串行；记录 profile、permission mode、
  vendor pin、repo HEAD/status；不打印凭据。
- 证据字段：精确 prompt/charter、入口/preset/depth、fixture manifest/hash、session/run/child ids、
  typed event 时间线、stop reason、结果/notice、fixture diff、墙钟/调用数/输出量、判定。
- 原始日志如可能含非合成内容只放 gitignored runtime；研究材料只留脱敏摘要、hash、session id。

## 7. 预算与停止（用户 2026-11-09 批准）

| 维度 | 候选上限 | 超限动作 |
|---|---:|---|
| 全轮墙钟 | 180 分钟 | 停止新 charter，取消在途 session/job，等 teardown 后收口 |
| parent prompt/turn | 30 | 不再发新 turn；未覆盖主题标未执行 |
| child activation | 64（含 retry/嵌套） | 不再启动 child；保存现有证据并停止 |
| 单 workflow run | 6 个 agent start、8 items、4 并发 | 执行前检查；caps 不能由模型自行放宽 |
| 单 task retry | 最多 1 次，总计最多 2 attempts | 第二次失败后 exhausted，不启动第三次 |
| 单 turn 等待 | 300 秒 | `session/cancel` 或 job kill；确认 terminal/cleanup，否则按 infra 未收口停止后续 |
| 合成证据总量 | 8 MiB | 停止新探索；关键判据不得因静默截断丢失 |

启动前先证明限制可由 harness/engine/job control 强制或监测；不能机械强制的 token/输出限制必须换成
可观察停止规则，不写成“已硬控”。基础设施失败连续两次暂停诊断；抓到关键发现后只做最小复现与收口。

## 8. 发现处置与资产收割

1. 先记 observed fact、影响、最短复现、原始事件/fixture 证据、频次、known limitation 比对、未证推断。
2. 合法方法差异（leaf×2 代替 orchestrator、small task 自己做）记观察，不报 bug。
3. 真缺陷：开 `_backlog/bugs/` 卡；P0 / 触碰章程/常设指令/docs 合同/company-pack 公开行为/已记录决定
   → 不自授权，先走问题或用户裁决。vendor 问题只提上游，不改 `vendor/dsh`。
4. 静态漂移（模型 `planned` vs 实现、注册面不在模型、 handbook skip 不一致）按“模型是唯一期望源”
   判：要么补模型/测试，要么改文档；不在本轮直接改代码。
5. 每个 finding 决定是否产出 keyless judge/spec、常驻 probe、合成 replay、fixture 或明确不升格理由。
6. 收口时更新本文件 §9（结果摘要）与问题卡；未命中只写“未观察到”，不写“没有 bug”。

## 9. 结果（2026-11-09 执行）

> 预算实际：墙钟约 **22 分钟**（17:35–17:57）；parent turn 约 **19**；child activation 约 **27**；
> 证据 **276K / 10 个 JSON**；未触发 180 分钟 / 30 turns / 64 children / 8 MiB 的停止上限。
> 环境：HEAD `2d06ef00` + 未提交探索文档；vendor pin `dsh-v0.2.1-rc.5`；`DSH_HOME=runtime/harness-home`；
> 真模型 = `deepseek-official/deepseek-flash`（会话记录）；每个 trial 唯一 cwd。

### 9.1 运行表

| ID | 入口 | charter | 观察 | 判定 |
|---|---|---|---|---|
| K0 | keyless/静态 | 模型/合同/注册面对账 | `CONTRACTS` 两个已落合同仍 `planned`；`subagent_retry` 注册面/深度不在模型；`handbookSkipPresets` 只列 `worker` | **BUG-049 / BUG-047** |
| D1 | CEO→VP→workflow→worker | 长链 depth 3（forced） | vp_eng depth 1/preset vp-eng；3 分支 depth 2/preset vp-eng；3 worker depth 3/preset worker；a/b/c 值正确；分支 b 用 `bash sleep 20` 等 worker | **PASS**（重构核心承诺真跑）；**BUG-046**（`list_subagents` 无 preset/depth） |
| R1b | CEO→VP(1)→CMO(2)→retry | retry 深度假设（forced） | CMO depth 2/preset cmo；`subagent_retry` 成功起 worker depth 3/preset worker；结果 attempts=1/completed | **BUG-045**（P1） |
| W1a | vp-eng root | worker profile 选择（natural） | 1 件→自己做；2 件→2 个 leaf（明确拒绝 orchestrator，理由“无子层”）；3 件同构→workflow 3 分支 | **PASS**（合法方法差异） |
| W1b | vp-eng root→orchestrator | 小工头 + 2 leaf（forced） | orchestrator depth 1/preset worker-orchestrator；2 leaf depth 2/preset worker；orchestrator system prompt 含公司手册，leaf 不含 | **BUG-047**；VP 用 `wait_agent` + `bash sleep 60` 等待（观察） |
| W1c | vp-eng root→leaf；CEO→researcher | 边界/只读 | leaf 无 spawn，如实拒绝；researcher 无写工具，拒绝写盘、文件不存在；researcher header depth 1/preset worker-researcher；researcher 也含手册 | **PASS**（边界）；**BUG-047**（researcher 手册） |
| K1 | vp-sales / vp-eng | 合同加载 | vp-sales 加载 `delegation-policy`；vp-eng systemPrompt 含 workflow contract；CEO/worker/orchestrator 无；worker 无手册 | **PASS** |
| R2 | vp-eng root | 重试分类（forced） | refusal 任务：attempts=1、stopReason=completed、不重试；非幂等写：模型改用普通 subagent，counter 恰好 1 行 | **PASS** |
| W2 | vp-eng root→orchestrator | 小工头 fan-out（forced） | 4 件活 → orchestrator 起 **4 个 leaf**（persona 说 1–2）；VP 自己也读 4 份；orchestrator 又复读 4 份 | 观察（persona 软约束，设计明说“住 persona”） |
| U1 | DagTab / golden | 图/UI 透镜 | `ui-scene-smoke --isolated --golden` 红：金样 `梦之队 CEO` vs 页面 `CEO`；九页签/委派流程区在场 | **BUG-048** |

### 9.2 新发现

| 卡 | 级别 | 一句话 | 证据 |
|---|---:|---|---|
| [BUG-045](../../_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md) | P1 | CMO depth 2 用 `subagent_retry` 起出 depth 3 worker，绕过 CMO 行级 `maxDepth: 2` | `r4-2026-11-09T09-43-57-731Z/r1b-cmo-depth-bypass.json` |
| [BUG-046](../../_archive/fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) | P2 | `list_subagents` 不返回 child 的 `agentPreset`/`delegationDepth`，父代理只能信自述/看日志/UI | `r4-2026-11-09T09-37-34-306Z/d1-long-chain.json` |
| [BUG-047](../../_archive/fixed_bugs/BUG-047-worker-family-handbook-scope.md) | P2 | `handbookSkipPresets` 只跳过 `worker`；`worker-orchestrator`/`worker-researcher` 被注入公司手册，与 persona 矛盾 | `r4-2026-11-09T09-47-02-512Z/w1b-orchestrator.json`、W1c |
| [BUG-048](../../_archive/fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) | P2 | `ui-scene-smoke --isolated --golden` 红：金样仍写“梦之队 CEO”，页面已收窄为“CEO” | `ui-scene-smoke` 回执 + golden diff |
| [BUG-049](../../_archive/fixed_bugs/BUG-049-model-contract-retry-drift.md) | P2 | 模型仍把已落合同标 `planned`；`subagent_retry` 注册面/深度不在模型 | `k0.json` |

### 9.3 观察（不建卡）

- **等待纪律复发**：VP-Eng 在 D1 的分支 b、W1b、W2 里用 `bash sleep` / `wait_agent` 等 child；
  `wait_agent` 仍报 `no-active-peer`。这是旧 F5/F7/F8 的同型行为，不是新机制；skill 文案已覆盖，
  但模型仍会选。可作为下一次 skill 加固的观察，不在本轮开卡。
- **CEO 派发后继续查证**：W1c 的 CEO 派 `subagent_research` 后，没有立即结束本轮，而是 `ls`/`grep`
  vendor/读 preset 去核 researcher 的工具面；最后如实拒绝打“已写入”标记。不是机制失败，是流程成本。
- **`list_agents(descendants)` 的 depth 是相对值**：D1 CEO 看到 depth=2（相对 VP-Eng），而 child
  header 是绝对 3；它自己解释对了。文档没有强调这个口径，记观察。
- **worker-orchestrator 的 1–2 leaf 是 persona 软约束**：W2 在 4 件 brief 下起了 4 个 leaf；
  设计明确写“住 persona”，所以不是引擎 bug，但 H3 只能算“观察失败”，不能当硬边界。
- **orchestrator 的 `subagent` schema 没有 `agent_preset`**：因为行上钉了 `worker` 且未暴露
  `allowedAgentPresets`；VP 把它读成“无法指定/无法验证”，并因此认为第二层 preset 未验证。
  实际 leaf header 是 worker；这是 BUG-046 的模型可见面问题，不是配置错误。
- **分支 b 的 sleep 20** 没造成漏分支/重复值；D1 的 3 个值全对。旧 BUG-038 的返回形状问题未复发。

### 9.4 未覆盖

- 真实 `error` / `interrupted` / `lost` 的 live retry（无法确定性注入；keyless spec 已覆盖；不伪造）。
- depth 4 负例、worker-orchestrator 在 depth 3 再 spawn（当前图到不了，未造超深链）。
- 真实页面里 retry 两个 child / worker 节点的 DagTab 图（只跑了 isolated 金样与静态 spec；
  U1 的红已经是金样漂移，未在真 run 上点开面板）。
- workflow 分支内起 worker-orchestrator 的交叉（D1 只到 worker leaf）。
- `subagent_retry` 在 vp-sales/coo/cfo root 的逐个采用（只证 CMO depth 2；代码路径同）。
- 长期采纳率、workspace-write、release-smoke、真实业务数据。

### 9.5 资产收割

- 5 张 bug 卡（045–049）是本轮主产物；其余运行证据留 `runtime/tmp/explore/round4/`（gitignored）。
- 候选 keyless 资产（修复时同 diff 落）：per-preset retry 深度（045）、`list_subagents` 的
  preset/depth（046）、worker family handbook skip（047）、golden refresh 触发（048）、
  模型合同/retry 注册面 parity（049）。
- D1 的 CEO→VP→workflow→worker 链值得升常驻 probe/replay；本轮先留证据，未改 probe。
- 不把 W2 的 4-leaf 观察升门禁（设计是 persona 软约束）；若用户要硬边界，另开问题。

### 9.6 修复后验证（2026-11-09 晚）

> 用户告知 BUG-045–049 已修；本轮先验证修复，再探未覆盖面。**关键环境事实**：真入口
> `startWeb --profile company` 读 profile 安装副本，不读 `packages/company-pack/lib`；修复后只重建
> `lib` 不够，必须 `plugin add link:` 或走 `pnpm company` 更新 profile。第一轮 R5 的“修复失效”正是
> 旧副本造成的假阳性，已归档为 [BUG-050](../../_archive/fixed_bugs/BUG-050-retry-depth-fix-fails-in-real-assembly.md)（误报）。

| 验证 | 命令 / 证据 | 结果 |
|---|---|---|
| 结构 / keyless | `pnpm verify`；`pnpm test`（12 files） | **ALL PASS / 138 tests** |
| 挂载 | `preset-smoke` | **6 角色 + 3 子人格 ALL PASS** |
| UI 金样 | `ui-scene-smoke --isolated --golden` | **9 页签 ALL PASS** |
| BUG-045/050 | CMO `2fa5113b-…` depth 2 调 `subagent_retry` | `attempts: 0` / `depth-exceeded` / `childIds: []`；无 worker；**PASS** |
| retry 正样本 | VP-Eng root `7bc31294-…` | `attempts: 1` / completed / worker depth 1；**PASS** |
| BUG-046 | `list_subagents` 真行 | worker-orchestrator/`"1"`、worker/`"1"`、teammate `vp-eng`/`"1"`、workflow 分支 `vp-eng`/`"1"`；**PASS** |
| BUG-047 | orchestrator `1e979407-…` / researcher `46a9e2a2-…` | handbook=false（leaf 也 false；full role 不变）；**PASS** |
| BUG-048 | golden | ALL PASS；**PASS** |
| BUG-049 | 模型/合同/retry parity specs | 全绿；**PASS** |

**新探索（无新产品缺陷）**：

- VP-Eng root → teammate `a23d2692-…`：`list_subagents` 行 `role=teammate`、`address=pf-teammate`、
  `agentPreset=vp-eng`、`delegationDepth="1"`，与 header 一致。
- VP-Eng root → workflow 2 分支：行 `role=subagent`、`agentPreset=vp-eng`、`delegationDepth="1"`；
  分支继承父组合，正确。
- 旧 `wait_agent`/`bash sleep` 等待行为仍出现（VP 层观察），但未造成漏值/重复；不记新 bug。
- BUG-050 初报的 CMO depth 2 放行在 profile 指向当前源码后不再复现；该卡已按误报归档，活跃缺陷归零。

**过程教训（进交接清单）**：真模型/真入口探针前，先确认
`runtime/harness-home/profiles/company/node_modules/dsh-company-pack` 指向当前源码/当前构建
（`pnpm company` 或 `plugin add link:`）；`pnpm test` 与 `packages/company-pack/lib` 重建都不能替代
这一步。否则旧副本会制造假阳性（本轮）或假阴性。

**仍未覆盖**：真页面 DagTab 图里的 retry/worker 节点；重启后的 `list_subagents` 身份行；真实
error/interrupted/live retry（不可确定性注入）；depth 4 负例；`subagent_retry` 在 vp-sales/coo/cfo root
的逐个采用；长期采纳率 / workspace-write / release-smoke。

### 9.7 第五轮：修复后探索（2026-11-09 夜）

> 用户 2026-11-09 晚：不要只验收，继续往前探。小预算 wave：约 15 分钟 / 6 parent turns / 8 children；
> 证据在 `runtime/tmp/explore/round4/wave5-*`。**本轮新发现 1 张 P2：** [BUG-051](../../_archive/fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md)（worker-orchestrator 的 1–2 leaf 只是 persona，4 件 brief 起 4 个 leaf）。其余 charter PASS。

| ID | charter | 观察 | 判定 |
|---|---|---|---|
| W5-A | 重启身份 | VP-Eng root `session-43902f98-…` 先起 worker `d443113b-…`；SIGTERM 停宿主、同 home 重启后，root 冷恢复并 `list_subagents`：行仍为 `agentPreset: worker` / `delegationDepth: "1"` / `lastTurnEnd: completed` | **PASS**（durable header 身份在重启后仍可读） |
| W5-B | 预算面 | vp-sales root `session-e8856b3a-…` retry → attempts 1 / child `b4b9f4e1-…` depth 1 / worker；vp-eng teammate `7a63349a-…` retry → attempts 1 / child `0436386c-…` depth 2 / worker | **PASS**（工具实例/预算与调用者一致） |
| W5-C | workflow 分支 retry | VP root 的 2 个分支 `a711559e-…` / `d82f2fcb-…`（depth 1）各调 `subagent_retry`：attempts 1 / child `2db00e98-…` / `816351ec-…` depth 2 | **PASS**；观察：分支仍可再 spawn，`eng-teaming` 的“分支默认叶子”是 prose，engine 允许（旧 `subagent` 同样） |
| W5-D | 分支边界深度 | CEO→VP(1)→workflow 分支(`9c215882-…`/`e861faf9-…`, depth 2) 内各调 `subagent_retry`：attempts 1 / child `fcb0eb1a-…` / `32a1fb9f-…` depth 3；预算 3 放行 | **PASS**（边界正确；VP 口述“与根同级”是措辞错误，header 是 3） |
| W5-E | orchestrator 上限 | VP `session-95b708f6-…` → `worker-orchestrator` `b694b3c5-…`（depth 1）；4 件独立读文件 brief → 起 **4 个 leaf**（`e2c42870-…`/`ab22dcad-…`/`709ed0b2-…`/`624f10de-…`，depth 2 / worker）；preset 写“1–2 个 leaf” | **BUG-051（P2）**；设计 Note 明说 1–2 只是 persona，属于承诺/能力面不一致，不是引擎崩溃 |
| W5-F | 通用 child 深度边界 | vp-sales root→generic child `691d8ce5-…`（depth 1 / vp-sales）→generic child `ecc6b81c-…`（depth 2 / vp-sales）调 retry：attempts 0 / `depth-exceeded` / 无 worker；预算 2 | **PASS**（修复对继承 vp-sales 的 generic child 同样生效） |

**未覆盖（下一轮候选）**：真页面 DagTab 图里的 retry/worker 节点（本轮只跑 isolated 金样与静态 spec）；
depth 4 负例；真实 `error`/`interrupted`/`lost` 的 live retry（不可确定性注入）；`subagent_retry` 在
coo/cfo root 的逐个采用；长期采纳率 / workspace-write / release-smoke。

**过程备注**：W5-A 的 root 在重启后先用 `wait_agent` 等 child（旧 F5/F7 行为）才 `list_subagents`；
结果正确，不记新 bug。W5-B 的 teammate 回执走 `send_message`，工具面正确；W5-C 的分支用了
`subagent_retry` + `list_subagents`，没有漏值/重复。

### 9.8 第六轮：能力边界（2026-11-09 夜）

> 小预算：约 12 分钟 / 5 parent turns / 6 children；证据 `runtime/tmp/explore/round4/wave6-*`。
> **新发现 1 张 P2：** [BUG-052](../../_archive/fixed_bugs/BUG-052-worker-leaf-control-surface.md)。

| ID | charter | 观察 | 判定 |
|---|---|---|---|
| W6-A | leaf 控制面 | VP `session-78dda9a0-…` 起 alpha `3eec1647-…` / beta `59ef9ee7-…`（均 depth 1 / worker）；alpha 工具面有 `list_subagents`（空）与 `send_to_subagent`；对 sibling beta 调用返回 `Error: subagent "…" belongs to another parent session`，beta 未收到（2→2） | **BUG-052（P2）**：control 工具对 leaf 可见，与 preset“无 control”声明不一致；运行时按 parent ownership 拒绝 sibling，非跨 parent 越权 |
| W6-B | teammate 重启身份 | VP root 起 teammate `restart-team`；停宿主、同 home 重启后 `list_subagents` 行仍 `role: teammate` / `address: restart-team` / `agentPreset: vp-eng` / `delegationDepth: "1"` / `completed` | **PASS**（team roster + durable header 重启后都在） |
| W6-C | CMO 重启深度 | CEO→VP(1)→CMO(2)；停宿主重启后 CMO 调 `subagent_retry` | `attempts: 0` / `depth-exceeded` / 无 worker；诊断点名 cmo 预算 2 | **PASS**（冷恢复后深度门仍生效） |

**未覆盖**：真页面 DagTab 图里的 retry/worker 节点；depth 4 负例；真实 error/interrupted/live retry；
coo/cfo root 的逐个 retry 采用；长期采纳/workspace-write/release。

### 9.9 第七轮：取消与生命周期（2026-11-09 夜）

> 本轮目标：`subagent_retry` 是同步等 child 的 host 原语，旧 R8 只证过 workflow 取消；先打这条缝。

| ID | charter | 观察 | 判定 |
|---|---|---|---|
| W7-A | 取消阻塞 retry | VP root `session-fc94c2fb-…` 用 `subagent_retry` 起 child `eb0e4c26-…`（depth 1 / worker），child 已发 `tool/call bash {command: "sleep 117; echo done"}`；对 root 调 `session/cancel` 返回 `accepted:true`。30/45/90s 后 root/child 都无 `turn/end`，tool result 未出现；sleep 117 进程仍在（90s 时）；没有 aborted 终态 | **BUG-053（P1）**：取消不中止阻塞 retry child；parent turn 悬在工具里 |
| W7-B | depth 4 负例 | CEO→VP(1)→workflow 分支 `146bf216-…`（depth 2）→ worker-orchestrator `d079e28d-…`（depth 3）；orchestrator 调 `subagent` 起 leaf → `Error: subagent depth 4 exceeds maxDepth 3`，无 leaf 落地；orchestrator 自己 read 了 fixture，但未冒充 leaf | **PASS**（行级 maxDepth 在 depth 4 拒绝，链上没有越界） |
| W7-C | 重启身份（retry/workflow） | VP root `session-3feeb864-…` 先 retry child `b49cbdd4-…`（worker/d1）、再 workflow 分支 `4269dc83-…` / `15b2bf8c-…`（vp-eng/d1）；停宿主重启后 `list_subagents` 三行全在，均 completed、无 unavailable | **PASS**（retry child 与 workflow 分支的 durable header 身份都保留） |
| W7-E | coo/cfo 预算 | coo root `session-4f82ad21-…` retry → child `b2ab8a57-…` depth 1 / worker；cfo root `session-47954bb3-…` retry → child `a9c1d459-…` depth 1 / worker | **PASS**（五 full role 的 retry 采用面补齐） |
| W7-F | 重启后 retry 正样本 | VP root `session-af35da4f-…` 重启前 retry child `19f9f31d-…` / first-ok；停宿主重启后再次 retry → 新 child `9495ee5b-…` / second-ok / depth 1 / worker；turn 2 的 tool/result 指向新 child | **PASS**（冷恢复后 retry 仍新起 child；脚本的 `find()` 曾取到 turn 1 旧结果，已按 root 日志更正） |
| W7-G | retry child 跨宿主重启 | VP root `session-6a94690d-…` 用 `subagent_retry` 起 child `06b1ced1-…`（worker/d1）跑 `bash sleep 117`；SIGTERM 宿主、重启后：root `turn/end interrupted`、child `turn/end interrupted`；retry tool call 无原 result，宿主注入 outcome-unknown 诊断；`list_subagents` 行 `lastTurnEnd: interrupted` / `inferred-open-turn` / worker / d1 | **PASS**（宿主重启有 interrupted 终态和诊断，不是 cancel 的无终态；与 BUG-053 区分） |
| W7-D | 真页面 DagTab | **React**：三次 setup（凭据/cpmposer 会话入口/RPC+预置 sessionIds boot）均未拿到 UI 断言，harness-blocked。**数据面**：`session/list`（2060 sessions）+ `buildDelegationTree`：W7C VP root `session-3feeb864-…` → 4 nodes / maxDepth 1（vp-eng + worker/vp-eng/vp-eng，terminal completed）；D1 CEO root `session-18cd2615-…` → 8 nodes / maxDepth 3（ceo→vp-eng→3 分支→3 worker），preset/terminal/missing 全对 | 数据面 **PASS**；React 页面**未覆盖**（不伪造） |

**根因假设**：`subagent_retry` `await activation.result` 没有和 `exec.signal` abort race；child 被 abort 但没有 result，工具悬挂到 300s timeout；child bash 继续。与旧 R8 的 workflow 取消（run/agents 收敛）不同。

**未覆盖**：真页面 DagTab 图；真实 error/interrupted live retry；coo/cfo root 的逐个 retry 采用。

## 10. 不做 / 边界

- 不重跑 BUG-036..044 的原场景；不把修复后的 green 当新探索。
- 不测 `worker-workflow`（no-go）；不要求 worker 扇出。
- 不把 CEO root / 其他职能的 workflow 扩面作为主目标；只做必要的边界负例。
- 不做 `workspace-write` 部署验收、release-smoke、长期采纳率、真实客户数据。
- 不把同模异线程结果称为独立人格评审；独立结论仍由人负责。
- 不改 `vendor/dsh`；不因本轮自行改 preset/skill/合同/Note；修复另按授权边界。
- 不写真实 `company-workspace`；不打印/提交凭据；不清理共享 rehearsal 历史。

## 11. 交接清单

1. 读本文件 + [2026-11-08 plan §16–§18](2026-11-08-exploration-plan.md)
   + 当前 preset/docs/model。
2. 记录 `git status` / `HEAD` / vendor pin；跑 keyless baseline 与 `preset-smoke`（若环境就绪）。
3. 确认 dev home 无其他 writer；准备唯一 trial 目录与 fixture manifest。
4. 向用户提交入口/charter/预算/证据落点；**批准后**再启动真模型。
5. 按 D1 → R1 → W1 → K1 的顺序跑；U1 跟随 D1/R1；异常转最小复现。
6. 收口：结果表、finding 分诊、资产收割、卡/研究材料更新；未命中如实写。

## 12. 参考

- 机制：`vendor/dsh` 的 `tool-workflow`、`workflow-ptc`、`tool-subagent`、`agent-team` README/源码；
  [workflow 子系统](../../../vendor/dsh/docs/subsystems/workflow.md)、
  [subagent 子系统](../../../vendor/dsh/docs/subsystems/subagent.md)。
- 本仓合同：[delegation](../../../docs/delegation.md)、[presets](../../../docs/presets.md)、
  [testing](../../../docs/testing.md)、[tests README](../../../tests/README.md)。
- 模型/资产：[delegation-model.mjs](../../../tools/lib/delegation-model.mjs)、
  [delegation-tree.ts](../../../packages/company-pack/src/lib/delegation-tree.ts)、
  [DelegationFlowPanel.tsx](../../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx)、
  [subagent-retry.ts](../../../packages/company-pack/src/host/delegation/subagent-retry.ts)。
- 探针：[delegation-contract-probe](../../../probes/team/delegation-contract-probe.mjs)、
  [delegation-depth-probe](../../../probes/team/delegation-depth-probe.mjs)、
  [subagent-retry-probe](../../../probes/team/subagent-retry-probe.mjs)、
  [worker-orchestrator-probe](../../../probes/team/worker-orchestrator-probe.mjs)、
  [worker-researcher-probe](../../../probes/team/worker-researcher-probe.mjs)、
  [vp-eng-workflow-probe](../../../probes/team/vp-eng-workflow-probe.mjs)。
- 旧轮次：[2026-11-08 plan](2026-11-08-exploration-plan.md)（§1–§15 重构前设计；§16–§18 结果）。
