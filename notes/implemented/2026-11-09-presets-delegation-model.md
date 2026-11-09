# 2026-11-09 · presets 委派面的模型化重构（RFC）

状态：implemented（2026-11-09 交付；P1–P4 的交付面完成：模型/静态矩阵、两层合同、P-A/B/C/D/J 真探针、UI 树形流程+completed/failed 终态、深度预算、`subagent_retry`（P-H 采用 PASS）、worker leaf+小工头；P5 不生成、P-I host 不自动重试为显式决定；worker-workflow no-go（P-K 采用不稳定，见 [no-go Note](./2026-11-09-worker-workflow-no-go.md)）；P-H/P-I 确定性失败注入（tool-boundary fake + adoption）；interrupted/aborted/max-tokens/refusal 由 companyDelegationTerminal host 投影接 UI，lost 仅当 host 提供）—— 批准：用户 2026-11-09「开始推进」，按“长期正确 / 长期可维护 / 结构柔韧”拍板。
> 后续修正：worker-researcher / specialist 边界见 [2026-11-09-specialist-worker-taxonomy](../archived/2026-11-09-specialist-worker-taxonomy.md)（2026-11-09）。
上游 = [RFC 卡](../../_backlog/_archive/settled_issues/2026-11-09-presets-delegation-architecture.md)；
研究 = [preset 委派架构：盘点与结构性研究](../../_backlog/research/presets-delegation-architecture/README.md)（已定性）。

## 问题

当前 11 个 preset 是**隐式模型**：能力藏在插件行里，合同藏在角色 skill 里，通道差异散在政策散文与 docs 里；长链（CEO→VP-Eng→workflow→subagent，以及 VP-Eng→workflow→subagent）没有可执行的声明与统一观测。结果是 worker = 角色克隆、合同随修 bug 逐句膨胀、长链在半路撞 `maxDepth`、父会话只能看到自己直接起的 child，UI 也看不到整条流程/状态。

这不是“9 份 YAML 重复”一个维护问题；重复只是症状。真正缺的是：能力模型、合同单家、工作组合、面级观测四件东西。

## 决定

### 1. 模型是第一性对象

把 capability / contract / composition / archetype / worker profile / channel / depth 做成**可执行模型**（[delegation-model.mjs](../../tools/lib/delegation-model.mjs)）；YAML 是模型的投影，运行期仍自包含。模型是唯一期望源：spec / dump smoke / 生成器都消费它，不得各自再写一份矩阵。

四层：

```
Composition（角色 / archetype / capability / contract）
        ↓ 投影
Preset YAML（自包含）
        ↓ 运行
Channel（spawn / fork / workflow / team）
        ↓ 组合
Delegation Graph（节点 / 边 / 深度 / 状态 / 终态 / 结果）
        ↓ 证据
Observation（静态矩阵 / 图 spec / 场景 / 探针 / UI）
```

### 2. worker 是 family，不是一个 leaf

- `worker.leaf`（已落）：fs / bash / web / todo / compaction；**无** subagent/team/workflow/control。
- `worker.orchestrator`（已落）：需要子层时显式升级；`worker.workflow`（planned）：并行扇出待切片；由 `allowedAgentPresets` 暴露，默认最窄。
- 小工头的窄规则（1–2 个 leaf / 不组队 / 不问用户）住 persona；不挂共享 delegation skill，contracts 只声明 `engine.subagent`。
- `subagent_fork` 保持 clone：fork provider 的 `agentPreset` 为 false 且继承父上下文；这是通道事实，不是妥协。
- P1 只把 vp-eng 的通用 `subagent` 钉到 worker；其余 full role 记 target，试点通过后铺开。

### 3. 合同按能力挂，按生命周期分层

- 公司委派政策 → 共享 skill（`_shared` 下的独立 delegation 目录）；随公司教义变。
- DSH 引擎合同 → capability-scoped prompt section（只在有 workflow 的 preset 注入）；随 vendor pin 变。
- 维护面 → [delegation 合同](../../docs/delegation.md) + [presets 合同](../../docs/presets.md)；人读，链接到上面两个 owner，不复制。
- 不在角色 skill 里继续堆引擎合同；“分支默认叶子”从禁令改为“默认叶 + 预算 + 升级路径”。

### 4. 图是只读观测层

- 静态图：模型里的通道/深度/嵌套；矩阵断言。
- 运行时图：host 只读投影，节点/边/通道/深度/状态/终态/地址；**不调度、不取消、不造平行引擎**。
- 客户端只有 sessions/team 投影；depth/terminal/lost/workflow 段要补 host 只读索引或新投影，不能靠 parentId 硬折把“缺失”说成状态；缺数据标 `unavailable`。

### 5. UI 是验收面，不是附属品

- 现有面不拆：九页签、看板、依赖图、委派卡、Team 面板、公司/培养页签、金样。
- 新流程/状态视图落在现有 **DagTab 体内**（[company-tabs.tsx](../../packages/company-pack/src/client/tabs/company-tabs.tsx) / [company-panels.tsx](../../packages/company-pack/src/client/tabs/company-panels.tsx)）；**不开第十页签、不开新顶层页、不用 `conversation.session.header.lineage`**。
- 复用 `DagPanel` 的 SVG 纪律（transform 缩放、定位/动画分层、无 foreignObject、双 marker）和现有 `StateDot`/`Tag`/令牌；新纯模型从 sessions 折节点/边/深度/终态，缺数据标 `unavailable`。
- 金样逐字；任何区标题/空态变化同 diff 刷金样；九页签目录保持不变。

### 6. 测试资产随模型重排

- 模型 spec：模型内部一致 + preset 清单/patch/worker family。
- 组合 spec：YAML 是模型的投影（通道/worker/命名委托/深度/控制/workflow）。
- 挂载：preset-smoke 加 worker，名单来自 `company-roles`。
- dump smoke：preset-matrix-smoke（checks，不进 `pnpm test`）。
- 图：纯投影 spec + 两条链场景（录制/真会话）。
- 合同：policy skill 挂载/加载探针；engine section 只在有能力处。
- UI：`tests/client` 纯视图模型/静态渲染/CSS + client-load + ui-scene/金样。
- 生成器：**closed by decision（P5）**；模型字段为它设计，YAML 保 authored source，composition spec 做 parse-back。
- 旧 `presets.spec.ts` 拆分/迁移；研究 JSON 不当期望源；旧断言未绿时不并行改口径。

### 7. 探针多次，按假设取证

用户已明确：探针不止一次，预算足够。P-A policy 加载、P-B profile 选择、P-C workflow 分支深度、P-D team 成员深度、P-E 图投影、P-F UI 流程/状态、P-G 重启后 interrupted/lost；每次记录假设、命令、会话 id、观察、结论、未覆盖；不塞 CI。

### 8. 重试（subagent 失败）

用户 2026-11-09 追加：subagent 有时会失败，workflow 比较可靠，要重试机制。

- **原则**：可见、有界、按幂等性判断；不做静默自动重试。
- **分类**：`error` / `interrupted` / `lost` 在幂等任务上重试一次；`refusal` / `aborted` / `completed` 不重试；`max-tokens` 不自动（缩任务/提预算/交人）。
- **机制**：父代理用 `list_subagents.lastTurnEnd` 分类，最多再派一次（attempt 2 label），仍失败 `exhausted`；批量/必须成功的活走 workflow；**`subagent_retry` host 原语已落**（per-agent 五个 full role；同步、最多 2 attempts、幂等门、attempts/childIds/stopReason/exhausted；worker/leaf/CEO 不挂）；keyless fake-subagents spec 覆盖分类；P-H 真实采用 PASS，真失败注入仍待。
- **模型**：`RETRY` + `retryDecision` 是纯决策；spec 覆盖 error/interrupted/lost、refusal/aborted/max-tokens、非幂等、exhausted、workflow 对照。
- **禁止**：静默自动、无限重试、对 refusal/aborted 重试、把 max-tokens 当普通 error、重试非幂等写操作。

### 9. 深度预算

- **源码事实**：`workflow-ptc` 的 `startChild` 与 `agent-team` 的 `roster.spawn` 都走 `subagents.startActivation({ parent })` → 分支/成员深度 = parent+1；workflow 没有独立 depth 闸，但每个 activation 仍受行级 `maxDepth`。
- **长链**：CEO(0)→VP-Eng(1)→workflow 分支(2)→worker(3)；VP-Eng 根(0)→分支(1)→worker(2)。
- **决定**：vp-eng 通用 `subagent`/`subagent_fork` 提到 **3**；SA/SQA/vp_cmo 命名行保持 2；其他 full role 2；worker leaf 0。模型/preset/docs/spec 同 diff。
- **证据边界**：源码 + 声明面 + P-C/P-D 真行为已 PASS（分支/成员 depth=1、worker depth=2）；CEO depth=3 由预算 + P-C 推算，未单独跑。

### 10. P5：不生成 YAML（closed by decision）

- `delegation-composition.spec` 已经是 YAML → composition 的 **parse-back / dump 比对**：模型是期望，YAML 是 authored source；两者不一致即红。
- 不建生成器：YAML 里的 persona/注释/isolate/`!!js`/skill 顺序是内容，不由 composition 模型描述；生成器会丢失或改写它们，收益不抵回归风险。
- 未来新增角色先加 model + YAML skeleton + composition spec；骨架生成可作为 dev tool，但不进构建链。**P5 第二阶段不再作为待办。**

### 11. P-I：workflow 重试对照（closed by decision）

- workflow 是 **脚本级可靠通道**：失败分支返回 `null/missing`，是否重试、何时 `exhausted` 由脚本显式决定；**host 没有自动 workflow retry**，也不该有（会隐藏失败/重复副作用）。
- `RETRY.workflow` 已声明；`workflow-contract` 内容已写。P-I 的“对照”结论 = host 无自动重试，不需要 wrapper/probe。

## 输掉的方案

- **只做 thin worker + 能力矩阵**：解决不了长链；以后加长链要返工 worker 与合同。
- **全局共享 skill / 全局常驻 section**：生命周期与作用域不对——所有角色为无关规则付 token，政策与引擎事实绑死。
- **现在就写生成器**：把未定型的模型固化；生成器是第二阶段。
- **维持现状，只写文档警告**：能力面与观测都没变，警告不能替代结构。
- **新开第十页签/顶层页**：九页签目录、金样、composition 测试都要改；DagTab 体内加区更稳、更符合“不破坏、尽量利用”。

## 后果

- 新增第 10 个 preset `worker`：会在 preset 选择器可见；标“执行手（内部）”，进 support preset，不进 `COMPANY_ROLE_IDS`。
- vp-eng 的通用 worker 失去 workflow/subagent/team/control：这是有意的行为变化；需要 brief 写清、父代理编排。
- worker 仍能写盘/跑 bash（执行手需要）；“thin”指委派面，不是权限沙箱。
- `subagent_fork`/workflow/team 仍不能钉 preset：长链要靠父层编排、预算和图观测，不能靠 worker 万能。
- UI 金样、`tests/client`、`client-load`、`ui-scene` 都要同 diff 维护；DagTab 内加区仍会改金样。
- 公司手册当前对每个 agent 注入；worker 是否跳过由 host 侧配置/探针决定，不能靠 persona 假装看不见。
- `docs/delegation.md` 已 120/120、`docs/presets.md` 197/198；文档更新前先压缩或搬去合同文件。

## 验收

**P1（模型 + worker leaf + 静态矩阵）**：

- `pnpm test tests/presets`：新增模型 spec + 组合 spec + retry spec 通过；红形态 = 删 vp-eng 的 `agentPreset: worker`、或把 worker 从 patch/roster 拿掉、或给 worker 加回 subagent 行、或把 refusal 加进 retryable，任一让对应断言红；绿形态 = 还原后同命令全绿。
- `pnpm verify`：`presets ×6 + 子人格 ×4`、`preset-required-config`、`presets`/`pack-bundle` 全绿；红形态 = worker 声明文件缺 patch/roster 或行 config 缺必填字段。
- `node checks/smoke/preset-smoke.mjs`：worker 真 `session/create` 零 broken；红形态 = worker 行 config 校验失败或 roster 缺 worker。
- `pnpm typecheck`：绿。

**P2（合同 + 探针）**：

- policy skill 六 full role 挂载；engine section 只在 vp-eng 出现（P2 section 真 systemPrompt 已证）；section 内容 spec 引用 `tests/harness/contract/*` 的 vendor 钉子，不复制。
- P-A/P-B/P-C/P-D 探针按假设取证；红形态 = 模型未加载 policy skill、profile 误选、depth 与模型不符；每次记录证据与未覆盖。
- P-H/P-I：subagent 失败只重试一次、refusal/aborted/max-tokens 不重试、attempt 可见；workflow error/null 可重试、exhausted 不第三次。红形态 = 重试非幂等/无限重试/把 refusal 当故障。

**P3（图 + UI + 链场景）**：

- 图投影纯 spec + 两条主链场景：节点/边/depth/terminal/address 正确；重启后 `interrupted`/`lost` 可见；红形态 = 硬折 parentId 把缺失说成状态。
- UI：九页签目录不变；DagTab 体内 `DelegationFlowPanel` 显示流程/状态；`pnpm test tests/client` + `client-load-smoke` + `ui-scene-smoke --isolated --golden` 绿；红形态 = 金样未刷新、槽位/可访问名变化、DAG 事故钉被破坏。
- `pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿。

**P4/P5**：

- `worker.orchestrator` 已按 P-J 真行为落地；`worker.workflow` 待切片；`allowedAgentPresets` 默认/升级规则由 policy skill 约束。
- `subagent_retry` host 原语已落 P4：per-agent 五个 full role、maxAttempts 2、幂等门、attempts/childIds/stopReason/exhausted 可见；keyless fake-subagents spec 已跑；P-H 真失败注入仍待。
- 生成器第二阶段：**closed by decision（P5）**；不建生成器；composition spec 即 parse-back/dump。
- P6 上游 note：team 成员 preset、workflow 子代 preset/depth、通道统一；只写提案。

## 验证状态

- 本 Note 已交付（P1–P4 + P5/P-I 决议；P3 UI/链场景已落）；残差 = 无；worker-workflow no-go、P-H/P-I 决定、host terminal 投影均见 [残差收口 Note](./2026-11-09-delegation-residuals-closeout.md)。P1 核心 + P2 keyless 载体 + P-A/P-B/P-C/P-D 真探针 + P3 UI 首片 + 深度预算已完成；下有真跑证据。
- P1 绿（2026-11-09）：`pnpm test tests/presets` **82/82**（模型 9 + 组合 14 + retry 5 + 旧 54）；`pnpm test` **1285/158 files**；`pnpm typecheck` 绿；`pnpm verify` **ALL PASS**（`presets ×6 + 子人格 ×4`、`proposal-scheduled ×1`）；`preset-smoke` **ALL PASS**（6 角色 + 4 子人格，worker 真挂载）。
- P1 红配方（真跑）：删 vp-eng 的 `agentPreset: worker` → `tests/presets` **2 failed / 80 passed**（`workerProfile` 与 `agentPreset` 断言）；还原 → **82/82 绿**。证明静态矩阵能红。
- P2 keyless 绿（2026-11-09）：policy skill 挂六 full role（真挂载 skill catalog 绿）；workflow-contract section host 插件 + 纯 spec 绿；P2 section 真实 vp-eng `systemPrompt` 含 section 全文，CEO/worker/worker-orchestrator 零命中；`pnpm test` **1294/160 files**（当时）；`pnpm typecheck` 绿；`pnpm verify` **ALL PASS**；`preset-smoke` **ALL PASS**。
- P2c 真模型探针 P-A/P-B（2026-11-09，`probes/team/delegation-contract-probe.mjs`，会话 `session-5b759133-68ad-4379-b649-031705f3fa13`）：P-A **PASS**（skill 调用含 eng-teaming + delegation-policy，2×subagent）；P-B **PASS**（两个 child 首帧 `agentPreset=worker`，23 工具，无 workflow/team/控制）。
- P3 UI 首片（2026-11-09）：`delegation-tree.ts` 纯模型 + **7** spec（含 CEO/VP 两条链场景）；`DelegationFlowPanel` + 2 spec；接进现有 DagTab（九页签不变；流程列表加树形连接线：每层竖线 + 末级肘线）；`ui-scene-smoke --isolated --golden` **ALL PASS**，金样已刷；`pnpm test` **1310/163 files**；`pnpm typecheck` 绿；`pnpm verify` **ALL PASS**；加树形连接线后 `ui-scene --isolated --golden` 重跑 **ALL PASS**。金样刷新同时收进一处既有 CMO 行漂移（非本次行为改动）。
- 深度预算（2026-11-09）：源码 `workflow-ptc startChild` / `agent-team roster.spawn` 都走 `startActivation(parent)` → depth=parent+1；vp-eng 通用 subagent/fork 2→**3**，其他 full role 仍 2；model/preset/docs/spec 同 diff。`pnpm test` **1303/162**、`pnpm typecheck`、`pnpm verify`、`preset-smoke` 全绿。P-C/P-D 真行为 **PASS**（`probes/team/delegation-depth-probe.mjs`：分支/成员 depth=1、worker depth=2、preset=worker；会话 `session-9100ca33-c313-4a04-a1db-ea3f4056e195` / `session-2fa6cb89-d3f2-4ea6-8db7-14fb1818acf4`）。
- 重试原语（2026-11-09）：`subagent_retry` per-agent 五个 full role；`tests/host/delegation/subagent-retry.spec.ts` 6 条 + policy parity 6 条；`pnpm test` **1310/163**；typecheck/verify/preset-smoke 全绿；P-H 真失败注入仍待。
- worker-orchestrator（2026-11-09）：`preset-smoke` 6+5；P-J 真探针 PASS（child depth 1 / 两个 leaf depth 2、preset=worker；会话 `session-016a598c-4817-4104-bdb8-ede9fa76de75`）。worker-workflow no-go：P-K 一次成功（child `1e3f5b79…` → 两分支 depth 2，2 agents/wf-ok），更强 persona 后仍多次未跑 workflow；planned/profile/docs/probe 全部移除；`pnpm test` **1300/164**；typecheck/verify 全绿。
- P-H 采用（2026-11-09）：`subagent_retry` 真被 vp-eng 调用；结果 `attempts=1/completed/exhausted=false/output=retry-ok`；child `worker` depth 1（child `f0ea4735-3e9a-40bb-9980-3dea55842feb`）。真实失败注入仍待；keyless fake-subagents 已覆盖分类。
- 未跑/待补：无（P5 生成器为 no-go，P-H/P-I 见残差 Note）。P2 section 注入、P3 树形连接线、P1b 去重已 PASS（2026-11-09）。
- 交付时本 Note 迁 `notes/implemented/`，把每条命令的真跑红/绿形态与未覆盖项写入验证节。
