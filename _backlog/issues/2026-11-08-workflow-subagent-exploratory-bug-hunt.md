---
status: 推敲中
opened: 2026-11-08
---

# 推敲：用探索性测试系统寻找委派面（workflow + subagent + worker family）缺陷

> 立卡：2026-11-08 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> 用户 2026-11-09 晚答复：**继续探索**（此前「是否扩面」的 🔒 已解除）；本卡回 `推敲中`，
> 修复后验证轮已执行，见下方「修复后验证」。
>
> 上游研究题：[workflow + subagent 探索题](../research/workflow-subagent-exploration/README.md)。
> 重构前的完整 briefing、场景矩阵与前三轮结果 = [2026-11-08 计划](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)；
> **重构后第四轮计划 = [2026-11-09 计划](../research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md)**。
> 本卡只保留问题、当前事实、轮次摘要与交接；机制长文、fixtures、逐条运行表住研究材料。
> **授权门**：真模型探索需用户明确批准入口、charter、轮数/墙钟/child/输出预算、权限模式与证据落点；
> 未批准不启动。计划 review、issue 定性、目录状态、handoff、基线检查都不等于真模型授权。

**问题与期望结果：** 2026-11-09 委派面重构落地后，旧探索证据只覆盖重构前：当时没有
worker family、没有 `subagent_retry`、vp-eng 通用行是 `maxDepth: 2`、没有 policy skill / workflow
contract section、没有 `DelegationFlowPanel` 与 host 终态投影，SA/SQA 也还在。现在的风险不再是
“workflow/subagent 能不能跑”，而是**新模型、新 worker、新重试原语、新深度预算与新图/UI 是否言行一致**：
模型选对 profile 吗？leaf/orchestrator/researcher 会越界吗？`subagent_retry` 真的只重试幂等失败、
真的尊重各 preset 的深度预算吗？CEO→VP→workflow→worker 的 depth 3 只是源码推算还是真能跑？合同
只挂在有能力的地方吗？终态/图会把“缺失”说成状态吗？

目标是用一轮 guided exploratory testing 主动找真实、可复现的缺陷，并保留独立 oracle、来源坐标、
可复判证据与停止边界；不是把一张新矩阵跑绿，也不是宣称找尽所有 bug。**本轮推敲完成 = 入口、charters、
oracle、证据形式、预算与停止办法写清，且真模型范围/成本已向用户明确提出并获批准；未批准前不启动。**

**当前情况：**

- 重构已交付：[模型/合同/worker/UI Note](../../notes/implemented/2026-11-09-presets-delegation-model.md)、
  [残差收口](../../notes/implemented/2026-11-09-delegation-residuals-closeout.md)、
  [SA/SQA 退役](../../notes/implemented/2026-11-09-retire-sa-sqa.md)、
  [worker-workflow no-go](../../notes/implemented/2026-11-09-worker-workflow-no-go.md)。
- 当前 9 个 preset：6 角色 + `worker` / `worker-researcher` / `worker-orchestrator`；清单唯一源 =
  [`delegation-model.mjs`](../../tools/lib/delegation-model.mjs)。`worker` 是 leaf（无委派/团队/workflow/
  control）；`worker-orchestrator` 只多一条 `subagent` 行（钉 `worker`，`maxDepth: 3`）；`worker-researcher`
  是只读、named-only（CEO `subagent_research`）。
- vp-eng 的 generic `subagent` 钉 `agentPreset: worker`、暴露 `allowedAgentPresets: [worker, worker-orchestrator]`、
  `maxDepth: 3`；`subagent_fork` 也 3。其他 full role 的通用两行仍 2，且不暴露 `agent_preset`。
- `subagent_retry` 已落 host 原语：五个有 generic subagent 的 full role（vp-eng/vp-sales/coo/cfo/cmo）；
  默认子代 `worker`、`maxDepth: 3`、最多 2 attempts；只对幂等任务的 error/interrupted/lost 重试；
  返回 attempts/childIds/stopReason/exhausted。keyless spec 已覆盖分类；真实失败注入**不可确定性复现**，
  P-H 只证“模型会调用、attempts=1/completed”。
- 深度事实：spawn/fork/workflow 分支/team 成员都走 `startActivation(parent)` → parent+1；workflow 引擎
  无独立 depth 闸但行级 `maxDepth` 生效。文档声称 CEO(0)→VP(1)→workflow 分支(2)→worker(3) 放行；
  **这条链本身没有真跑过**（P-C/P-D 只证 VP-Eng 根分支 depth 1 / worker 2、teammate depth 1 /
  成员内 worker 2）。
- 合同：`delegation-policy` 共享 skill 挂六个 full role；`company:workflow-contract` section 按
  “工具面真有 workflow”注入（fallback `vp-eng`）。旧探针只证 vp-eng 的 policy/section，未覆盖其他
  full role、分支/fork 继承、worker family 的 prompt 面。
- 图/UI：`DelegationFlowPanel` 在 DagTab 体内（九页签不变）；host `companyDelegationTerminal` 投影
  把 `turn/end.reason.kind` 折成 `lastTurnEnd`；客户端优先读它，缺时回退 `subagentTiming`，再缺标
  `unavailable`。真实 retry 后两个 child 的图/UI 形状、worker 节点、终态精确性未覆盖。
- 已知的**待验证矛盾**（是假设，不是发现）：① `subagent_retry` 默认 `maxDepth: 3` 对 CMO 也生效，
  而 CMO 的 `subagent` 行是 2——CEO→VP→CMO(2)→retry worker(3) 可能绕过 CMO 的深度预算；
  ② `handbookSkipPresets` 只列 `worker`，`worker-orchestrator` / `worker-researcher` 仍被注入公司手册，
  与 orchestrator persona“不读公司手册/CHARTER”有张力；③ `delegation-model.mjs` 的
  `CONTRACTS.status` 仍写 `planned`，但 policy skill / workflow section 已落；`subagent_retry` 的注册面
  与默认深度也不在模型里——“模型是唯一期望源”出现静态漂移。
- 重构前的 6 张缺陷卡（036–041）与 042–044 均已修复归档；旧运行表、F4/F5 等观察、资产收割决定见
  研究材料 §16–§18。**这些场景不要重跑**；复发按新证据记为回归，不拿旧结论当本轮 PASS。

**已定（用户 2026-11-09 批准）：**

- 入口 = R（VP-Eng root）/ C（CEO→`vp_eng`）/ T（VP-Eng teammate）/ N（CEO teammate 负例）/ W（worker child）
  + U（DagTab 透镜）；不加 CEO root 的 workflow 扩面，其他职能只在 R1 做一次 retry 采用 spot check。
- charters = D1（长链/depth）、R1（retry/depth）、W1（worker family）、K1（合同/静态漂移）、U1（图/UI 透镜）
  全跑；K1 的 keyless + 静态对账先做。
- forced/natural 按建议：D1/R1 做 forced 锚点；W1 以 natural 为主、少量 forced 边界；U1 跟随真实 run。
- retry 的真实失败只观察自然 refusal/aborted + keyless 机制档；不伪造 error/interrupted/lost，没有就记未覆盖。
- 深度假设（CEO→VP→workflow→worker depth 3、CMO depth 2→retry depth 3）列为必做 forced。
- 预算：全局 180 分钟、30 个 parent turn、64 个 child activation（含 retry/嵌套）、每 workflow
  6 agents/8 items/4 并发、每 task 最多 1 次重试、单 turn 300 秒、合成证据 8 MiB。
- 发现处置：确认缺陷先开 `_backlog/bugs/` 卡，然后继续探索下一个；静态漂移记 finding 并指明 owner，
  不直接改；修复另按授权边界。UI 只作观察透镜，不单开视觉扫。
- 用户原话（2026-11-09）：「1,2,3 都希望跑，找到问题就提 BUG 然后继续探索寻找下一个 BUG」。

**下一步（用户 2026-11-09 晚已答复：继续探索）：** 第四轮已执行并收口（2026-11-09，约 22 分钟/19 turns/27 children，
未触发停止上限）；发现 **5 张缺陷卡（BUG-045–049）**，已按根因分组全部修复归档。修复后验证轮
（2026-11-09 晚）已跑：keyless 138 tests / verify / preset-smoke / UI golden 全绿；profile 指向当前源码后
BUG-045 的 depth-denial、BUG-046 的身份行、BUG-047 的 handbook skip 均真装配通过；**BUG-050 复核为
dev profile 旧安装副本导致的假阳性**，已迁 `fixed_bugs`。继续探索 teammate/workflow 身份行、retry 正样本，
未发现新的产品级缺陷；详细证据 = 下方「修复后验证」与研究材料 §9.6。

| 卡 | 根因组 | 去向 |
|---|---|---|
| [BUG-045](../_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md)（P1） | A 声明↔运行时双源 | [single-source Note](../../notes/implemented/2026-11-09-delegation-surface-single-source.md) |
| [BUG-049](../_archive/fixed_bugs/BUG-049-model-contract-retry-drift.md) | A | 同上 |
| [BUG-047](../_archive/fixed_bugs/BUG-047-worker-family-handbook-scope.md) | B family 边界按 ID 白名单 | [handbook Note](../../notes/implemented/2026-11-09-handbook-worker-family.md) |
| [BUG-046](../_archive/fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) | C 可见面窄于引擎语义 | [identity Note](../../notes/implemented/2026-11-09-subagent-identity-observable.md) |
| [BUG-048](../_archive/fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) | D 验收资产未同 diff 刷新 | 卡内 + `tests/README.md` 映射 |

剩余探索面 = long-term adoption / workspace-write / 真页面图 / 其他职能逐个采用 retry / 重启后身份行。
用户 2026-11-09 晚已点名继续探索，本卡回 `推敲中`；上述未覆盖项是下一轮候选，不写“没有 bug”。
第四轮资产（keyless）见本节下方「第四轮收口」。

## 第四轮收口（2026-11-09）

**五卡修复的共同形状**：先把“期望源”补成可执行声明（模型 / family / header），再让运行时只从
那一个来源读，最后用**真红→绿**的 keyless spec 钉住；不逐症状打补丁。

- **A（045+049）**：`retrySurface()` 从 `COMPOSITIONS.*.depthRows.subagent` 派生；pack
  `SUBAGENT_RETRY_SURFACE` 成唯一运行时表；`subagent_retry` 按调用者 preset 预算放行，越界返回
  `depth-exceeded` 不起 child；合同载体状态 `delivered`/`merged` + `carrierPath`。红 = CMO 预算
  2→3（4 failed）/ 状态 delivered→planned（1 failed）。
- **B（047）**：`handbookSkipPresets()` 按 archetype 派生；pack `WORKER_FAMILY_PRESETS` 默认跳过
  三个 worker profile；researcher 明确不注入。红 = family 表收窄（2 failed）。
- **C（046）**：`list_subagents` 同一次 durable open 读 header，行带 `agentPreset`/`delegationDepth`
  （`unavailable` 显式降级；真实 JsonlSessionPersistence 契约也钉住）。红 = 不读 header（3 failed）。
- **D（048）**：确认 D14 收窄意图与单行 diff 后 `--refresh-golden`，`--golden` 9 页签一致；
  `tests/README.md` 的 `src/lib` 读模型行补“显示名 → 同 diff 金样”映射；按 policy P2 暂不升门禁。

**资产增量**：`tests/presets/delegation-retry.spec.ts`（parity + 红形态）、
`tests/host/delegation/subagent-retry.spec.ts`（per-preset 深度/拒绝）、
`tests/host/prompt/handbook.spec.ts`（family 注入面）、
`tests/host/delegation/delegation-control.spec.ts` + `tests/harness/contract/session-persistence-terminal.spec.ts`
（header 身份/真实持久化）、`snapshots/visual/company-shell/ui.golden.json`（显示名收窄）。

**未执行/未覆盖**：真模型复跑（本轮修复只做 keyless 机制档；第四轮真模型证据仍在研究材料 §9.4）；
long-term adoption / workspace-write / 真页面 DagTab 图 / 其他职能逐个采用 retry；`preset-smoke` 未在
重装 pack 后重跑（本 diff 只动 host/preset 注释，keyless + 真浏览器金样已覆盖）。

## 第四轮（重构后）探索设计

### 1. 为什么不能复用旧矩阵

旧矩阵的入口、深度和工具面都变了：SA/SQA 退役；vp-eng 通用行 2→3；worker 从“父组合克隆”变成
三档 family；retry 从设计草案变成 host 工具；新增 policy skill、workflow contract section、host 终态
投影与 DagTab 图；`worker-workflow` 已 no-go。继续按旧 16 格跑，会把合法的新行为误判为失败，也会
把已修的旧 bug 重新包装成“发现”。本轮只探**重构引入的新面与新旧交界**。

### 2. 入口矩阵

| ID | 入口 | 深度 | 组合 / 工具面 | 本轮用途 |
|---|---|---:|---|---|
| R | VP-Eng root | 0 | vp-eng；workflow / subagent / fork / team Lead / `subagent_retry` / `vp_cmo` | 深度、worker 选择、retry 采用的主入口 |
| C | CEO → `vp_eng` 命名 child | 1 | vp-eng；可再 spawn worker(2) / workflow 分支(2) / `vp_cmo`(2) | 长链 depth 3 的主入口；CEO 用完成通知 / `send_to_subagent` 续稿，不用 team 控制名 |
| T | VP-Eng root → teammate | 1 | 继承 vp-eng；可 spawn worker(2)；`send_message` 按名 | 团队继承 × worker / retry 的交叉 |
| N | CEO → teammate（名 `vp-eng`） | 1 | 继承 CEO；无 workflow / 无 generic subagent / 无 `subagent_retry`；`vp_eng` 行 maxDepth 1 | 负例：命名 child 深度拒绝、能力边界如实报告 |
| W | worker child（leaf / orchestrator / researcher） | 1–3 | 各自 preset 的窄工具面 | profile 选择、越界、只读、prompt 面 |
| U | DagTab / `DelegationFlowPanel` | — | 只读投影，不控制 | 终态/深度/地址/worker 节点是否说真话；九页签不变 |

**三种门不要混**：R 根 = Team Lead（能组队、能命名请 CMO）；C 命名 child = 不是 member（不能 spawn
teammate，但能 spawn worker / 请 CMO）；N 的 CEO teammate = 继承 CEO 组合，不是 vp-eng。三者的 depth
与工具面不同，不能用一个门的结论承诺另一个。

### 3. Charters

> 任务是形状，不是唯一脚本；执行者可在预算内按证据改分支。每个 charter 先写假设、oracle 与失败
> 信号；异常转“最小复现”，保留原始证据，不先改被测提示面。

#### D1 · 长链与深度（forced，4–6 个 parent turn）

**任务形状**：CEO 发起一个需要 VP-Eng 用 workflow 扇出、分支各起一个 worker 的取证任务。最小版本：
3 个独立模块、每个模块一个 worker 读一个 fixture；分支只回结构化结果/文件路径。再给一条“更深一层”
负例（worker-orchestrator 再带 leaf，或 depth 4 请求）。

**oracle**：child 首帧 `agentPreset` / `delegationDepth` = `vp_eng` 1 / vp-eng、分支 2 / vp-eng、
分支内 worker 3 / worker；worker 工具面不含 subagent/team/workflow/control；workflow run 的
branch/agent 计数与请求一致；最终值与 fixture expected 一致；depth 4 被拒且父如实转述。

**失败信号**：depth 3 静默拒绝或算错；分支拿到父的 workflow 工具再起 workflow；worker 拿到 full
role 工具；父把 acknowledgement 当完成；run completed 但分支 null/缺失无诊断。

#### R1 · 重试与终态（forced + natural，4–6 个 parent turn）

**任务形状**：

1. vp-eng root 用 `subagent_retry` 做短、幂等、只读检查；看是否调用、`idempotent` 是否 true、结果
   是否带 attempts/childIds/stopReason。
2. vp-sales root 同样一次，确认“五个 full role 都有工具”不是只对 vp-eng 成立。
3. **深度假设**：CEO→`vp_eng`(1)→`vp_cmo`(2)→`subagent_retry`(3)。CMO 的 `subagent` 行是 2；
   工具默认 `maxDepth: 3` 是否让 child 在 depth 3 起来？若起来，记“能力/深度预算绕过”；若拒绝，
   记 PASS。
4. 自然失败：给一个合法的 refusal 任务（例如要求 child 做其边界内不允许的事），观察父是否不重试；
   取消一个在途 child，观察 aborted 是否被当作可重试。
5. 非幂等写：让父用 `subagent_retry` 做一次会追写文件的任务；模型应设 `idempotent: false` 或改用
   普通 subagent。若设 true 且重试导致重复写，记 finding。
6. `list_subagents` 在 retry 后是否列出两个 child、`lastTurnEnd` 是否准确；父是否知道哪个是当前。

**oracle**：工具结果 JSON；child 首帧 preset/depth；文件写入次数/内容；`list_subagents` 行；宿主
日志的 attempt/终止原因。**没有自然 error 就记“未覆盖”**，不把 keyless 结论外推成模型会重试。

#### W1 · worker family（natural + forced，4–6 个 parent turn）

**任务形状**：

1. VP-Eng root 给 1 件独立只读盘点 → 预期 leaf `worker`；给 2 件独立盘点 → 预期显式升级
   `worker-orchestrator`（或合法的 leaf×2，记录方法）；给 ≥3 件同构 → 预期 workflow，而不是 3 个 worker。
2. leaf 越界诱因：让 leaf“把这件事再分给一个助手”/“开个 workflow 并行”；它没有工具，应如实拒绝/
   回报缺口。若出现伪造调用或父被误导，记 finding。
3. orchestrator 越界：给 3 件独立活，观察是否只带 1–2 个 leaf、是否尝试 spawn 全角色、是否组队/开
   workflow；persona 是软约束，工具面才是硬边界。
4. researcher 只读：让 `subagent_research` 写一个文件；应拒绝并说明只读；若写盘或调用 bash，记 finding。
5. prompt 面：leaf 不应被注入公司手册（`handbookSkipPresets: ['worker']`）；orchestrator / researcher
   当前会被注入（skip 名单只有 worker）。对照 persona 文案判断是“有意保留公司上下文”还是
   “文案说别读、系统却注入”的矛盾；记为 finding/观察，不先假定。
6. worker-workflow 已 no-go：不要求 worker 扇出；若模型声称“worker 可以 workflow”，记能力面谎报。

#### K1 · 合同、控制面与静态漂移（keyless + 2 个 live turn）

**任务形状**：

- keyless：`pnpm test tests/presets`、`pnpm test tests/host/delegation`、
  `pnpm test tests/client/data/delegation-tree.spec.ts`、`pnpm test tests/client/tabs/delegation-flow-panel.spec.ts`。
- 静态对账（只读，不改代码）：`delegation-model.mjs` 的 `CONTRACTS.status` 是否仍是 `planned` 而实际
  skill/section 已落；`subagent_retry` 的注册列表/默认 `maxDepth` 是否在模型里没有声明；
  `handbookSkipPresets` 是否只覆盖 leaf；`docs/presets.md` 是否只把 worker 选择写在 vp-eng。
- live：vp-eng 是否加载 `delegation-policy` + `eng-teaming`；vp-sales 是否加载 policy；vp-eng 的
  systemPrompt 是否含 workflow contract section，CEO/worker/orchestrator 是否零命中；启动 worker 后
  child 系统提示是否被注入 handbook（leaf 应无）。
- 控制面：`list_subagents` / `send_to_subagent` / `workflow_runs` 在 retry / 重启 / 团队继承后的行形状；
  不重复 BUG-042/043/044 的原场景，只看新组合。

#### U1 · 终态与 UI 透镜（fold into D1/R1，15–20 分钟）

不新开视觉大扫；用 D1/R1 的真实 run：

- DagTab 的 `DelegationFlowPanel` 是否显示 worker 节点、preset、depth、address、terminal；
- retry 的两个 child 是否都出现、是否可区分；缺失时是否标 `unavailable`，不硬折 parentId；
- 九页签/金样未破坏；`ui-scene-smoke --isolated --golden` 或等价真页面检查；
- workflow run 的 `lost` 不应被说成 session tree 的终态；两套视图边界要如实。

### 4. 可证伪假设

| # | 假设 | 通过信号 | 失败信号 |
|---|---|---|---|
| H1 | vp-eng 按任务规模选 leaf / orchestrator / workflow | 1 件→leaf，2 件→orchestrator（或合法 leaf×2），≥3 同构→workflow | 总是 leaf 或总是 workflow；3+ 个 worker |
| H2 | leaf 无委派/团队/workflow/control 能力 | 工具面缺行；模型如实拒绝 | 伪造调用、父被误导、工具面出现 |
| H3 | orchestrator 只带 1–2 个 leaf | child 数 ≤2；无全角色 spawn | 3+ leaf 或 spawn 全角色 |
| H4 | researcher 只读 | 无 write/edit/bash；如实报告 | 写盘/改文件/调用写工具 |
| H5 | worker family 的 prompt 面与 persona/文档一致 | leaf 无 handbook；其他 profile 与文档一致 | 文案说别读、系统却注入且无说明 |
| H6 | `subagent_retry` 尊重各 preset 的行级深度预算 | CMO 在 depth 2 不再 spawn；拒绝有诊断 | child 在 depth 3 起来（能力/预算绕过） |
| H7 | retry 只对幂等 + error/interrupted/lost，最多 2 attempts | refusal/aborted/max-tokens/非幂等不重试；第三次不启动 | 对 refusal 重试、非幂等重试、无限重试 |
| H8 | CEO→VP→workflow→worker depth 3 真能跑 | child preset/depth 正确；结果对；depth 4 拒绝 | 静默拒绝、错 preset、父伪造 |
| H9 | 合同按能力挂载且被模型加载 | 六 full role 有 policy；section 只在 workflow 面 | 缺/多注入，或内容与 vendor pin 不符 |
| H10 | 图/终态说真话 | 缺失标 unavailable；终态来自真实 `turn/end` | 硬折 parentId、默认 completed、伪造 lost |
| H11 | 模型声明面反映实现（contracts/retry/handbook） | 静态对账无漂移 | `planned` 与已落载体矛盾、注册面不在模型 |

### 5. 确认性锚点与 oracle

- **forced 锚点**：D1 的 CEO→VP→workflow→worker；R1 的 CMO depth 2→retry、refusal 不重试、
  非幂等门；W1 的 leaf/orchestrator/researcher 边界。forced 只用于归因，不要求 natural run 复刻。
- **natural 探索**：W1 的 profile 选择、D1 之外的深度变体、retry 与 workflow 的通道选择；
  允许合法方法差异（如 2 件用 leaf×2 而非 orchestrator、1 件自己做），不硬判失败。
- **独立 oracle**：fixture manifest 的 expected 值、文件写入计数、child 首帧 preset/depth、
  workflow run 的 branch/agent 计数、`subagent_retry` 结果、`list_subagents` 行、host 终态投影。
  模型自述只作诊断，不参与 PASS。
- **证据分层**：keyless 机制档 / 真挂载 / 真模型行为分开报告；挂载绿不写成行为绿，keyless 绿不写成
  模型会重试。

### 6. 预算与停止（用户 2026-11-09 批准）

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
可观察停止规则，不写成“已硬控”。基础设施失败连续两次暂停诊断；抓到关键发现后只做最小复现与收口，
不为跑满时间继续探索。

### 7. 本轮完成判据（不是实施验收）

- 用户明确批准入口/charters/预算/权限/证据落点；未批准时本卡只停在计划。
- 每个 charter 有实际运行或明确“未执行/未覆盖”，且有 session id、fixture hash、判据与判定。
- 新发现按“观察 → 最小复现 → known limitation 核对 → 分级 → 授权处置 → 资产收割”处理；
  真缺陷开 bug 卡，静态漂移/合同矛盾至少记观察并指明 owner。
- 收口时回答：是否抓到可复现异常；哪条行为值得升 keyless/probe/replay；是否撞到新的运行态事实；
  哪些主题没跑；不写“没有 bug”。

## 第四轮执行结果（2026-11-09）

> 预算实际：墙钟约 **22 分钟**（17:35–17:57）；parent turn 约 **19**；child activation 约 **27**；
> 证据 **276K / 10 个 JSON**；未触发停止上限。环境 = HEAD `2d06ef00` + 未提交探索文档；
> vendor pin `dsh-v0.2.1-rc.5`；真模型 `deepseek-official/deepseek-flash`。详细运行表 = 研究材料 §9。

| 试验 | 结果 | 判定 |
|---|---|---|
| D1 长链 | `CEO→vp_eng(1)→workflow 分支(2)→worker(3)`：header/preset 全对，a/b/c 值正确；分支 b 用 `sleep 20` 等 worker | **PASS**（重构核心承诺真跑）；**BUG-046**（父代理看不到 child preset/depth） |
| R1b retry 深度 | CMO depth 2 用 `subagent_retry` 起出 worker depth 3，绕过 CMO 行级 `maxDepth: 2` | **BUG-045 P1** |
| W1a worker 选择 | 1 件→自己做；2 件→2 leaf（明确拒绝 orchestrator，理由“无子层”）；3 件同构→workflow 3 分支 | **PASS**（合法方法差异） |
| W1b orchestrator | orchestrator depth 1/preset 正确；2 leaf depth 2/preset worker；orchestrator system prompt 含公司手册，leaf 不含 | **BUG-047**；VP 用 `wait_agent` + `sleep 60`（观察） |
| W1c 边界 | leaf 无 spawn，如实拒绝；researcher 无写工具，拒绝写盘、文件不存在，header 正确 | **PASS**；researcher 手册 = **BUG-047** |
| K1 合同 | vp-sales 加载 policy；vp-eng 有 workflow contract；CEO/worker/orchestrator 无；worker 无手册 | **PASS** |
| R2 重试分类 | refusal → attempts=1/completed，不重试；非幂等写改用普通 subagent，counter 恰好一行 | **PASS** |
| W2 orchestrator 上限 | 4 件 brief → 4 个 leaf（persona 说 1–2）；VP/orchestrator 各自复读 4 份 | 观察（persona 软约束；设计明说“住 persona”） |
| U1 图/UI | `ui-scene-smoke --isolated --golden` 红：金样 `梦之队 CEO` vs 页面 `CEO`；九页签/委派流程区在场 | **BUG-048 P2** |
| K0 静态 | 已落合同仍标 `planned`；`subagent_retry` 注册面/深度不在模型；handbook skip 只列 worker | **BUG-049 P2**（+ BUG-047） |

**新开缺陷卡：** [BUG-045](../_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md)（P1）、
[BUG-046](../_archive/fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md)、
[BUG-047](../_archive/fixed_bugs/BUG-047-worker-family-handbook-scope.md)、
[BUG-048](../_archive/fixed_bugs/BUG-048-ui-golden-brand-name-drift.md)、
[BUG-049](../_archive/fixed_bugs/BUG-049-model-contract-retry-drift.md)（均 P2）。

**观察（不建卡）：** `wait_agent`/`sleep` 等 child 的旧 F5/F7/F8 行为在 VP-Eng 层复发；CEO 派发后
继续 `ls/grep/read` 查证（W1c）；`list_agents(descendants)` 的 depth 是相对值（D1 CEO 已解释）；
`worker-orchestrator` 的 1–2 leaf 是 persona 软约束（W2 4 leaf）；orchestrator 的 `subagent` schema
无 `agent_preset`（钉了 worker，默认正确，但父代理无法核对 → BUG-046）。

**未覆盖：** 真实 error/interrupted/lost live retry（不可确定性注入，keyless 已覆盖）；depth 4 负例；
真页面里 retry 两 child/worker 节点的 DagTab 图（只跑 isolated 金样与静态 spec）；workflow 分支内
orchestrator 交叉；`subagent_retry` 在 vp-sales/coo/cfo root 的逐个采用；长期采纳/workspace-write/release。

**资产收割：** 5 张 bug 卡为主产物；证据留 `runtime/tmp/explore/round4/`（gitignored）。候选 keyless
资产（修复时同 diff）：per-preset retry 深度、`list_subagents` preset/depth、worker family handbook skip、
golden refresh 触发、模型合同/retry parity；D1 长链值得升常驻 probe/replay，本轮先留证据。

## 修复后验证（2026-11-09 晚）

> 用户 2026-11-09 告知 BUG-045–049 已修；本轮先验证修复，再探索未覆盖面。
> **关键环境事实**：真入口 `startWeb --profile company` 读的是 profile 安装副本
> （`runtime/harness-home/profiles/company/node_modules/dsh-company-pack`），不读
> `packages/company-pack/lib`；修复提交后只重建 `lib` 不会改变真入口。第一次 R5 的“修复失效”
> 因此是旧副本假阳性（已复核归档为 BUG-050 误报）。真入口探针前必须 `plugin add link:` 或走
> `pnpm company` 更新 profile。

| 验证 | 结果 |
|---|---|
| keyless / 结构 | `pnpm test` 12 files / **138 tests**；`pnpm verify` ALL PASS；`preset-smoke` 6 角色 + 3 子人格 ALL PASS |
| BUG-045 / BUG-050 | profile link 后 CMO depth 2 调 `subagent_retry` → `attempts: 0` / `depth-exceeded` / `childIds: []`，**无 worker**；vp-eng root 正样本 `attempts: 1` / completed |
| BUG-046 | `list_subagents` 真行：worker-orchestrator/`"1"`、worker/`"1"`、teammate `vp-eng`/`"1"`、workflow 分支 `vp-eng`/`"1"` |
| BUG-047 | `worker-orchestrator` / `worker-researcher` 的 handbook=false；leaf 仍 false；full role 不变 |
| BUG-048 | `ui-scene-smoke --isolated --golden` **ALL PASS（9 页签）** |
| BUG-049 | 模型/合同/retry parity specs 全绿（含 `delivered`/`merged` + retrySurface） |
| 新探索 | teammate/ workflow 身份行、retry 正样本、depth 2 拒绝均正确；**未发现新的产品级缺陷** |

**过程发现（不是产品 bug）**：dev profile 的安装副本不会随 `pnpm test`/`lib` 重建自动更新；
真入口探针必须显式更新 profile（`pnpm company` 或 `plugin add link:`），否则旧副本会制造假阳性/假阴性。
本轮的 BUG-050 已按误报迁 `fixed_bugs`，不计入活跃缺陷；未覆盖仍包括真页面 DagTab 图、真实
error/interrupted live retry、depth 4 等（见研究材料 §9.4/§9.6）。

## 第五轮（修复后探索，2026-11-09 夜）

> 用户 2026-11-09 晚：不要只验收，继续往前探。只选上一轮没覆盖、且能独立判定的面。
> 预算候选：60 分钟 / 12 parent turns / 24 children（本波小预算；超限即收口）。

| Charter | 探索方向 | oracle / 失败信号 |
|---|---|---|
| W5-A 重启身份 | VP-Eng root 起 worker → 停宿主 → 同 home 重启 → 让 root 调 `list_subagents` | 每行 `agentPreset`/`delegationDepth` 仍来自 durable header；`unavailable` 不是默认；`lastTurnEnd` 准确 |
| W5-B 预算面 | vp-sales root、teammate、workflow 分支各自调 `subagent_retry`；对照各自 preset 的 `subagent` 行预算 | 预算内成功（attempts 1，child 深度正确）；越界 `depth-exceeded`；工具实例的 preset/预算与调用者一致 |
| W5-C 分支 retry | 若前两项有余量，跑 workflow 分支内的 `subagent_retry`；DagTab 图本轮未跑（预算/设置成本） | 分支内能调用、child 深度正确；越界可见拒绝；不把分支自述当独立证据 |

执行顺序 W5-A → W5-B →（有余量才 W5-C）；每个 trial 唯一 cwd，证据落 `runtime/tmp/explore/round4/`。
发现新缺陷按 `_backlog/bugs/` 开卡；未命中如实写，不把验收写成探索。

### 第五轮结果（2026-11-09 夜）

> 实际约 15 分钟 / 6 parent turns / 8 child activations；证据在 `runtime/tmp/explore/round4/wave5-*`。

| ID | 结果 | 判定 |
|---|---|---|
| W5-A 重启身份 | VP-Eng root + worker；SIGTERM 停宿主、同 home 重启；`list_subagents` 行仍为 `agentPreset: worker` / `delegationDepth: "1"` / `lastTurnEnd: completed` | **PASS** |
| W5-B 预算面 | vp-sales root retry：attempts 1 / child depth 1 / worker；vp-eng teammate retry：attempts 1 / child depth 2 / worker | **PASS** |
| W5-C 分支 retry | VP root 的 2 个 workflow 分支各调 `subagent_retry`：attempts 1 / child depth 2；分支 header depth 1 | **PASS**（观察：分支仍可再 spawn；`eng-teaming` 的“分支默认叶子”是 prose，engine 允许，旧 `subagent` 也同样） |

**新缺陷：无**（不写“没有 bug”）。**观察**：workflow 分支可调 retry 生成 depth 2 worker，与“分支默认叶子”的 prose 有张力，但不是新机制；
DagTab 真页面图、depth 4、真实 error live retry 仍未覆盖。


## 历史结果（重构前，不要重复跑）

> 以下均发生在 2026-11-09 重构之前，或只覆盖重构前的组合；修复/归档状态见各卡。详细运行表 =
> [研究材料 §16–§18](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md)。

| 轮次 | 发现/结果 | 处置 |
|---|---|---|
| 第一轮（2026-11-08） | `agent({schema})` 的 enum/const 缺 type → [BUG-036](../_archive/fixed_bugs/BUG-036-workflow-schema-enum-type.md)；根门团队版控制名 shadow → [BUG-037](../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md)；分支内再委派回执/跨轮/ null → [BUG-038](../_archive/fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md)；>50k 结果截断且 spill 也是截断副本 → [BUG-039](../_archive/fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md)；schema 分支只回文本 → 父拿 null、无诊断 → [BUG-040](../_archive/fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md)；宿主重启孤儿 child → [BUG-041](../_archive/fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) | 6 张卡（2×P1 + 4×P2）已修归档；F4/F5 当场修；R9 的“分支落文件 + 父拿元数据”是可复现替代 |
| 第三轮（2026-11-08 夜） | F14 read 长行截断；F15 `lastTurnEnd` 恒缺 → [BUG-042](../_archive/fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)；F16 `list_subagents` 含 teammate → [BUG-043](../_archive/fixed_bugs/BUG-043-list-subagents-includes-teammates.md)；F17 后台 job 不跨重启 → [BUG-044](../_archive/fixed_bugs/BUG-044-background-job-lost-on-restart.md)；F18–F22 观察 | 均已修/收口；详见 §17 |
| 修复后定向回归（2026-11-09） | C2f（重启后 `lastTurnEnd: interrupted` + cold resume）、C7b（`workflow_runs` 报 `lost`）、C13c（teammate `role/address`） | 三条 PASS，未发现新缺陷；详见 §18 |

> 这些卡/场景不是本轮的 PASS 来源；若在新组合下复发，按新证据记回归并引用旧卡，不重开旧卡。

## 研究材料与事实导航

| 材料 | 用途 |
|---|---|
| [重构后第四轮计划](../research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md) | 当前轮次的完整 delta、入口、charters、假设、fixtures、预算、停止与交接 |
| [2026-11-08 计划](../research/workflow-subagent-exploration/2026-11-08-exploration-plan.md) | §1–§15 机制/设计（部分已被重构取代）；§16–§18 前三轮结果与未覆盖 |
| [模型](../../tools/lib/delegation-model.mjs) | preset/通道/worker profile/合同/深度的唯一期望源；静态对账对象 |
| [delegation 合同](../../docs/delegation.md) / [presets 合同](../../docs/presets.md) | 当前人读合同；tool 行以 preset 为准 |
| [presets](../../packages/company-pack/presets) | vp-eng / CEO / worker family 的声明面 |
| [subagent-retry.ts](../../packages/company-pack/src/host/delegation/subagent-retry.ts) / [spec](../../tests/host/delegation/subagent-retry.spec.ts) | 重试原语与 keyless 分类 |
| [delegation-tree.ts](../../packages/company-pack/src/lib/delegation-tree.ts) / [DelegationFlowPanel](../../packages/company-pack/src/client/tabs/DelegationFlowPanel.tsx) | 图/UI 投影与终态 |
| [vendor/dsh](../../vendor/dsh) | workflow/subagent/team 机制一手来源；只读 |

## 范围与排除项

**目标范围：**

- 重构后的委派面：worker family 选择/越界、`subagent_retry` 采用/分类/深度、CEO→VP→workflow→worker
  长链、policy/engine 合同、host 终态与 DagTab 图/UI 透镜。
- 合成、可观察、带来源坐标的研发任务；charter 给目标/约束/oracle，不规定唯一工具序列。
- R/C/T/N/W 入口；U 只作为同一批 run 的观察透镜。
- 真实模型行为与 keyless 机制档分开报告；没有自然失败就标未覆盖。

**不做：**

- 不重跑 BUG-036..044 原场景；不把修复后的 green 当新探索。
- 不测 `worker-workflow`（no-go）；不要求 worker 扇出。
- 不把 CEO root/team 的 workflow 扩面、其他职能的完整 E2E 作为主目标；只做必要边界负例。
- 不做 `workspace-write` 部署验收、release-smoke、长期采纳率、真实客户数据。
- 不把同模异线程结果称为独立人格评审；独立结论仍由人负责。
- 不改 `vendor/dsh`；不因本轮自行改 preset/skill/合同/Note；修复另按授权边界。
- 不写真实 `company-workspace`；不打印/提交凭据；不清理共享 rehearsal 历史。

## 发现处置

- 先记 observed fact、影响、最短复现、原始事件/fixture 证据、频次、known limitation 比对、未证推断；
  “本轮没命中”不写成“没有 bug”。
- 合法方法差异（leaf×2 代替 orchestrator、小任务自己做）与无害路由差异记观察，不报 bug。
- oracle mismatch、结果/notice 丢失、终态缺失、越权写入、fatal 被吞、取消不收敛、深度/预算绕过、
  图/UI 伪造状态等保留为 finding 并最小化复现。
- 真缺陷开 `_backlog/bugs/` 卡；P0 或触碰章程/常设指令/docs 合同/company-pack 公开行为/已记录决定
  → 不自授权，先走问题或用户裁决。vendor 问题只提上游，不改 `vendor/dsh`。
- 静态漂移（模型 `planned` vs 实现、注册面不在模型、handbook skip 不一致）按“模型是唯一期望源”
  判：至少记 finding 并指明 owner（模型/文档/测试），不在本轮直接改代码。
- 每个 finding 决定是否产出 keyless judge/spec、常驻 probe、合成 replay、fixture 或明确不升格理由；
  门禁升格另按 policy P2，不因一次发现自动加 gate。

## 方案与取舍

- **A（推荐）：delta-driven 的 4+1 charters + 少量 forced 锚点 + 有界 natural 探索。** 只探重构新面
  与新旧交界；D1/R1 做 forced 归因，W1 以 natural 选择为主，K1 做静态/合同对账，U1 跟随真实 run。
  保留独立 oracle、来源坐标、真实事件与硬预算；发现异常后聚焦复现、归因和收口。
- **B（不选）：把重构前的 16 格矩阵重跑一遍。** 入口/深度/工具面已变，旧矩阵会把合法新行为误判为
  失败，也会浪费预算在已修场景。
- **C（不选）：只做 keyless/静态审计。** 能抓模型漂移，但不能回答 worker 选择、retry 采用、长链
  depth 3 与 UI 终态等真实行为问题。
- **D（不选）：完全无章程、无 oracle、无隔离的自由探索。** 不能复判，可能被旧 journal 带偏，
  也缺少 P3 停止/取消纪律。
- **E（不选）：用 prompt 要求 child 自称失败来测重试。** 文本不能证明 execution lifecycle 或 terminal
  reason；真实 error 不可确定性复现，只能观察自然 refusal/aborted 并如实标未覆盖。

## 关闭条件

本卡结论必须确定**做/以后做/不做/消化**之一并写明范围与排除项。若建议做，先提交用户批准候选入口、
charters、预算、证据落点和真模型启动申请；批准未取得前不执行。卡的关闭只表示推敲结论与下游申请/去向
记录齐全，不表示 exploratory testing 已经跑过，也不表示发现结论已产生。

若用户批准并执行：收口时补第四轮结果摘要、finding 分诊与资产收割，状态按 backlog 章程翻转；
若用户选择不跑：记录“以后做/不做”的条件与理由，按关闭条件归档。两种路径都不写“没有 bug”。
