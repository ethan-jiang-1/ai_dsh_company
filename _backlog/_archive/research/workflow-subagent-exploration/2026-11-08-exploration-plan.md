---
topic: workflow + subagent 探索测试：只有 W / 只有 S / 混合一次 / 混合多次
intent: 给下一位执行者一份自包含的 briefing + 探索计划——DSH 机制支持、本仓特点、已证事实、场景矩阵、两遍法、fixtures、判据、预算、发现处置与 Review 清单；计划未开跑
---

# 探索性测试计划（exploratory testing）：workflow + subagent（v2，自包含 briefing）

> **这是计划，不是结果。** 当前状态 = 等待用户/新 Agent review；review 通过前不跑。
> 本文件刻意写厚：下一位 Agent 可能没有本轮的对话上下文，必须能只靠这份文档 + 仓库本身接手。
> 本轮采用 exploratory testing（探索性测试）；单次有界探索称 exploratory test。场景矩阵是覆盖目标与风险边界，不是穷尽脚本或唯一合法路径：执行者在时间盒和场景章程内边学、边设计、边执行，跟进有证据的新线索；仍用会话事件、工具调用、结果和 fixture oracle 判定观察，不以模型自述代替证据。详见 §6 与 §8。
> 读法：本文件 §1（DSH 支持）→ §2（本仓特点）→ §3（已证事实）→ §4–§8（探索设计）→
> [workflow 通道 Note](../../settled_issues/2026-11-08-vpeng-workflow-channel.md) 与
> [归档研究材料](../vp-eng-delegation-topology/2026-11-08-topology.md) 补细节。

## 0. 术语与符号

| 符号 | 含义 |
|---|---|
| **W** | workflow 通道（脚本 `agent()` 扇出；同身份、fresh 子代） |
| **S** | subagent 通道（`subagent` / `subagent_fork`；命名 child 人格可选，generic 继承调用者） |
| **M1** | 混合一次：一次 W 扇出 + 一次 S（独立核对或单件细节） |
| **M2** | 混合多次：W → S → 再 W（或 S → W → S），多轮 |
| **R** | VP-Eng root（`agentPreset: vp-eng`，depth 0，Team Lead） |
| **C** | CEO → `vp_eng` 命名 child（depth 1，vp-eng preset） |
| **T** | VP-Eng teammate（`spawn_teammate`，继承 vp-eng 组合，depth 1） |
| **N** | 负例：CEO teammate（名字叫 vp-eng，但继承 CEO 组合，没有 W/S） |
| **forced** | prompt 明确指定通道，用来证“工具链路通不通” |
| **natural** | prompt 只给目标，用来证“模型会不会按 skill 选” |
| **tool catalog** | 会话首帧 `request/header.tools`；判断“看不看得见”的唯一证据 |

## 1. DSH 的机制支持（先钉死，别靠猜）

### 1.1 workflow 通道

**组成**：`@deepseek-ai/dsh-workflow`（服务 `ctx.workflowEngine`）+ `workflow-ptc`（PTC 进程引擎）+
`tool-workflow`（模型工具）。`tool-workflow` 必须与引擎在同一个 `isolate.workflowEngine` 组；
`ptc-runtime` 由 base 提供。权威：
[tool-workflow README](../../../../vendor/dsh/packages/workflow/tool-workflow/README.md)、
[workflow-ptc README](../../../../vendor/dsh/packages/workflow/workflow-ptc/README.md)、
[workflow 子系统](../../../../vendor/dsh/docs/subsystems/workflow.md)、
引擎源码 [`runtime.ts`](../../../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts) 与
[`host.ts`](../../../../vendor/dsh/packages/workflow/workflow-ptc/src/host.ts)。

**工具调用**：`{ script, meta, args?, run_in_background? }`。`script` 是纯 JS body（不是 TS），顶层 await；
`meta` 是 JSON 数据（name/description/whenToUse/phases），引擎先校验后执行；`args` 原样给脚本。

**脚本 hooks**（模型面描述里的完整合同）：

| hook | 语义 | 失败语义 |
|---|---|---|
| `agent(prompt, opts?)` | 起一个子代理并等它完成；返回 final text 或 `schema` 校验后的 object | 子代理非 completed → `null`；hook 误用/超帽 → 抛 fatal |
| `parallel(thunks)` | 并发跑，等全部（barrier） | thunk 抛错 → 该项 `null`；fatal 重新抛 |
| `pipeline(items, ...stages)` | 每 item 独立走 stages，无 barrier | 某 stage 抛错 → 该 item `null`，跳过剩余 stages |
| `phase(title)` / `log(message)` | 进度分组 / 叙事（observer 事件） | 参数错 → fatal |
| `args` | 调用方 JSON | — |

**`agent()` 只认五个选项**：`label` / `phase` / `schema` / `provider` / `model`。
**没有** `agentPreset`、`maxDepth`、工具过滤；`effort` / `isolation` / `agentType` 被显式列为 deferred 并拒绝。
`provider` / `model` 可做独立路由覆盖（cross-model 核对的唯一口子）。

**子代身份**：`startActivation` 的 request 不带 `agentPreset` ⇒ 子代加入**调用者当前的 preset revision**：
同人格、同工具面、同 cwd；但 `provider: spawn` 是 **fresh 上下文**，不 seed 父对话。
所以“workflow 子是独立人格”是假的；“workflow 子是 fresh 的同人格克隆线程”才是准确的。

**上下文**：`delivery: 'caller'`，引擎自己收结果、不发 completion notice；父模型只看脚本最终 JSON
（渲染上限 `maxResultChars=50000` 字符，超出**硬截断**；canonical 值只在引擎内存完整，spill 文件是
截断副本、模型读不回缺失段——2026-11-08 R7 实证）。中间子消息不进父会话。结果很大时会触发 spill，
但别指望从 spill 找回被截断的尾段。

**失败/上限**：run 级没有 partial success；子代失败折成 `null`，hook/超帽/取消 → 整轮 `error`/`cancelled`。
引擎默认：`maxConcurrentAgents=0`（按 CPU）、`maxTotalAgents=1000`、`maxItemsPerCall=4096`、
`syncTimeoutMs=5000`；**没有 overall elapsed deadline**。runtime 只抛 rejection，脚本 `try/catch` 可以吞——
所以“失败即停”是默认不是强制；模板要写“不 catch fatal / `missing>0` 自己 throw”。

**沙箱**：脚本在 PTC Node 进程里跑，捕获调用会话的 cwd 与文件策略；`read-only` / `workspace-write` 需要
可用的 confinement，否则失败；`danger-full-access` 才允许无 confinement。VM 不是安全边界；
网络不受文件策略限制。本机 dev 的 vp-eng 会话是 `danger-full-access`；`workspace-write` 历史上一败一成。

**深度**：`host.ts` 的 `startChild` **不传 `maxDepth`** ⇒ workflow 子代没有深度闸；如果子代继承
`tool-workflow`，它可以再开 run（嵌套）。这是已知治理洞（research L5 / Note 已记），不是本轮能靠 config 修的。

**工具自带提示**：`tool-workflow` 注册一条固定 system prompt 段：
“Use the `<toolName>` tool ONLY when the user explicitly asks for a workflow or for large multi-agent
orchestration… For one or two delegations, prefer plain subagent calls.”
角色 skill 把判据写成可自检的“大型多代理编排”是当前解释路径；残余风险是模型保守不调用。

**background**：`run_in_background: true` 立即返回 `{kind:'background', jobId, runId}`；run 注册为
owned job，job 输出环流 phase/log/lifecycle；`job_kill` / owner teardown 取消；完成值随 job settlement
的 completion notice 到达。没有中间值。

### 1.2 subagent 通道

**组成**：`subagent` 服务 + `tool-subagent` 实例 + provider（in-process `spawn` / `fork`；外部 ACP /
Codex / Claude Code / DSH SDK）+ `tool-subagent-control` / `list-agents`。权威：
[tool-subagent README](../../../../vendor/dsh/packages/subagent/tool-subagent/README.md)、
[subagent 子系统](../../../../vendor/dsh/docs/subsystems/subagent.md)。

**每次调用 = activation**：工具立即返回 `started subagent <childId>`（或 `{kind:'activation', subagentId}`）；
终稿（output / structured / diagnostic / stopReason）由 **completion notice** 送回父会话，不塞工具结果。
子代理的工作上下文留在 child；父只看终稿 + 通知。

**Config 关键字段**：`provider` / `toolName` / `modelSelectionSettings` / `agentOptions` /
`agentPreset` / `allowedAgentPresets` / `maxDepth`。`maxDepth` 是**子代被启动时的绝对深度上限**
（0 禁止；省略读 Host 默认 1；`provider-managed` 交给外部 provider）。`agentPreset` 只在 in-process
spawn 支持；fork/外部 backend 拒绝。

**子代身份**：省略 `agentPreset` = 加入父的当前 preset revision（spawn 是 fresh；fork 带父的已完成轮前缀）。
命名委托工具（`vp_eng` / `system_qa` / `vp_cmo`）各自钉 `agentPreset`，于是 child 拿到该角色人格/工具面。
`modelSelectionSettings: true` 额外暴露 provider/model/reasoning_effort + `list_subagent_models`。

**续驶**：local spawn/fork child 可被 `send_message`（steering）、`interrupt_agent`、`list_agents` 管理；
外部 backend one-shot，不接受后续消息。fork 子代复制父的已完成轮前缀（子代成本，父代没有更干净）。

**团队作用域陷阱**：CEO 会话从第一帧起是 team-scoped，`tool-agent-team` 把 `send_message` /
`list_agents` / `interrupt_agent` 换成团队版（按成员名寻址）。命名 subagent child **不是 team member**，
所以 CEO 的团队版 `send_message` 够不到它（会报 `active teammate not found`）；改稿只能再委派一次。

### 1.3 team 通道（对照，不要混）

`spawn_teammate` 只有 Lead 能调；成员持久、共享任务板（CAS 修订号 + `blockedBy` DAG + `writeScopes`
告警但**不阻塞**）；**成员继承 Lead 的组合**，不是另一个 preset。CEO 团队里的 “vp-eng” 成员 ≠
vp-eng preset：它没有 vp-eng 的 workflow/subagent/SA/SQA。没有嵌套 team、没有自动 owner release。
权威：[agent-team README](../../../../vendor/dsh/packages/experimental/agent-team/README.md)。

### 1.4 三通道边界表

| 通道 | 子代人格 | 父上下文收到 | 并发 | 持久/可续 | 失败语义 | 深度 |
|---|---|---|---|---|---|---|
| `workflow` | 继承调用者组合；fresh | 只收脚本最终 JSON（≤50k 渲染） | 脚本 `parallel`/`pipeline` | 外壳不给续驶；local 子在 catalog，可旁路 cold resume | 子失败→null；fatal→整轮 error（可被 catch） | 引擎不传 maxDepth；无闸 |
| `subagent` | 继承调用者；可钉 preset | ack + completion notice（终稿） | 同轮多调用 | 可续（控制行） | 子失败进通知 | 绝对 maxDepth；Host 默认 1 |
| 命名 child | 真 preset（vp-eng/SA/SQA/CMO） | ack + completion notice | 同轮多调用 | 可续 | 同上 | 行上 maxDepth（SA/SQA/CMO 2） |
| teammate | 继承 Lead 组合 | 每条成员消息进历史 | 成员并行 | 持久、冷恢复 | 不自动释放任务 | Lead-only；无嵌套 |

### 1.5 深度/继承矩阵（本仓当前）

| 会话 | 组合 | depth | W visible | S visible | 备注 |
|---|---|---|---|---|---|
| CEO root | ceo | 0 | 否 | 否（有 `subagent_research`） | 编排 = team + 命名委托 |
| CEO teammate（叫 vp-eng） | ceo（继承） | 1 | 否 | 否 | 不是 vp-eng preset |
| CEO → `vp_eng` child | vp-eng（preset） | 1 | 是 | 是 | 主商业路径 |
| VP-Eng root | vp-eng | 0 | 是 | 是 | |
| VP-Eng teammate | vp-eng（继承） | 1 | 是 | 是 | |
| VP-Eng subagent child | vp-eng（继承） | 1 | 是 | 是 | 再往下 S 到 depth 2 可，depth 3 不可 |
| VP-Eng workflow child | vp-eng（继承） | 1 | 是 | 是 | 再往下 W 可（无闸），S depth 3 不可 |
| VP-Sales/COO/CFO/CMO root | 各自 | 0 | 否 | 是 | 只有 subagent |
| SA/SQA/researcher | 各自 | — | 否 | 否 | 窄工具面 |

## 2. 本仓的特点（新 Agent 必须知道）

### 2.1 布局与权威

- `vendor/dsh/` = **钉 SHA 的 DSH 源码**，只读；机制核对一律以它为准。本仓机制事实的权威不是记忆。
- `packages/company-pack/` = 唯一自写包：`presets/<role>/`（persona + skills + 工具行）、`content/`（手册/模板）、
  `src/`（host/client）；preset **自包含**，DSH 无 patch 继承。
- `company-workspace/` = dev 公司状态（gitignored）：`.dsh-company/kb/`、`deliverables/`、`journal/`。
- `runtime/` = 运行残留（gitignored）：`harness-home`（dev DSH_HOME）、`rehearsal-workspace`（排练/探针 cwd）、`tmp`。
- `docs/` = 当前合同（只写 now）；`notes/` = 决策记忆；`_backlog/` = 推敲层（research/issues/bugs/methods）；
  `checks/` = 门禁；`tests/` = keyless 回归；`probes/` = 真实入口探针；`tools/` = 维护工具。
- **不是普通 Node 库**：它是 DSH 的 company pack + 六角色 preset + 测试/门禁/流程的复合仓。改动先问
  “这个事实的 owner 是谁”：preset/合同/docs/Note/gate，别在错误层写第二份。

### 2.2 启动、测试与证据分层

```sh
git submodule update --init
corepack enable pnpm && pnpm install
source run/env.sh              # 双 home + 裸 dsh 拦截 + pre-push 接线
pnpm company --no-open         # pack + plugin add file: + exec dsh --profile company
pnpm verify                    # 结构门禁（秒级，~58 门）
pnpm test                      # keyless 回归（当前 150 files / 1223 tests）
pnpm typecheck                 # 类型面（改 TS/src 时）
```

- **keyless 回归**：`pnpm test` / `pnpm verify`；真模型/真浏览器**不进**回归。
- **真实挂载**：`node checks/smoke/preset-smoke.mjs`（6 角色 + 3 委派子人格；preset 改动的必跑）。
- **真实入口探针**：`probes/team/`（如 `vp-eng-workflow-probe.mjs`）、`checks/smoke/delegation-smoke.mjs`；
  真模型，手工跑，不进 `pnpm test`。
- **浏览器面**：`client-load-smoke` / `ui-scene-smoke`；本轮不需要。
- **凭据**：`DEEPSEEK_API_KEY` 住 dev home 的 `.credentials.yaml`（不是 env）；`env | grep` 为空不代表没配；
  不要打印/提交。
- **dev profile 是 link 模式**：`runtime/harness-home/profiles/company/package.json` 里 pack 是
  `link:/.../packages/company-pack`；preset/skill 改动即刻生效；tarball 安装面另验（`release-smoke`）。

### 2.3 角色、preset 与工具面

- 六角色：CEO、VP-Eng、VP-Sales、COO、CFO、CMO；支持 preset：`researcher`、`system-architect`、`system-qa`。
- CEO 工具面：`subagent_research`（只读研究员）、`vp_eng`、`vp_sales`、`vp_cmo`、`system_architect`、
  `system_qa`、team 工具；**没有** generic `subagent`、**没有** `workflow`。
- vp-eng：`subagent` + `subagent_fork`（`maxDepth: 2`）、`workflow-ptc` + `tool-workflow`（同组）、
  `system_architect` / `system_qa` / `vp_cmo`（`maxDepth: 2`）。
- vp-sales / coo / cfo / cmo：`subagent` + `subagent_fork`（`maxDepth: 2`）；无 workflow。
- SA/SQA/researcher：窄工具面；无 workflow/generic subagent。
- 行清单的唯一家 = 各 `presets/<role>/agent.cordis.yml`；`docs/contracts/presets.md` 只是摘要。

### 2.4 流程与门禁（别绕过）

- `_backlog/research/` = 证据材料（本文件就是）；`issues/` = 问题卡；`bugs/` = 缺陷卡；卡片不是任务源/授权。
- `notes/implemented/` = 决策记忆；非平凡变更同 diff 带 Note；Note 写决定/输掉的方案/验证。
- `docs/` 只写当前合同；改了行为没改合同 = 谎报。
- 门禁：`pnpm verify` 查结构/链接/backlog 形状/文档预算/retired claims 等；`pnpm test` 查 keyless 行为；
  `preset-smoke` 查真挂载；`retired-claims` 会把已证伪的旧断言判红（本轮删过一条“通道 D 已退役”）。
- 发现 bug：**简单 → 立刻修**（prompt/skill/config，红→绿留证）；**复杂 → 开 `_backlog/bugs/` 卡**，
  不硬改 vendor；方法差异只记录。
- 证据纪律：命令链 `set -o pipefail`；不写“应该跑了”；未跑标“未执行”；单次真跑不写“稳定”。

### 2.5 当前工作树与并行会话（2026-11-08）

- 工作树有**未提交**改动，其中一部分来自并行会话（README/安装手册等）。**不要** `git checkout`/`revert` 整树。
- 本工作相关：五个职能 preset 的 `maxDepth: 2`、vp-eng 的 workflow 两行、`eng-teaming`/`eng-workflow`、
  CEO `assembling-the-team`/persona、`docs/{delegation,presets,terminology,index}.md`、
  `docs/architecture.md`、`docs/guides/budget-and-ops.md`、
  [vpeng workflow 频道](../../../../notes/archived/2026-11-08-vpeng-workflow-channel.md)、`probes/team/vp-eng-workflow-probe.mjs`、
  `checks/gates/retired-claims.mjs`、`checks/INDEX.generated.md`、`pnpm-lock.yaml`（两行 peer）、
  本轮新增的 research 题。
- 环境：cwd = 仓库根；dev home `runtime/harness-home`（`source run/env.sh` 后的 `DSH_HOME`）；排练场 `runtime/rehearsal-workspace`。

### 2.6 本仓最容易被误判的三件事

1. **“看见工具” ≠ “能用”**：CEO 的 `subagent_research` 名字里有 subagent，但不是 generic `subagent`；
   工具目录要看 `request/header.tools` 的 `name`，不是猜。
2. **“继承 Lead 组合” ≠ “继承角色”**：CEO 团队成员继承 CEO，不是它名字叫的那个角色；要 vp-eng 的
   workflow/subagent，走 `vp_eng` 命名 child。
3. **“测试绿” ≠ “模型会选”**：`preset-smoke` 只证挂载；选择要靠真实会话的行为探针/矩阵。

## 3. 已证事实（别重复测）

- workflow + subagent 已进 vp-eng；五个职能 `subagent`/`subagent_fork` `maxDepth: 2`；CEO 的 `vp_eng`
  命名 child 两者都有；CEO root/team 两者都没有。
- 代表证据（详见 Note）：最小 workflow `session-65ac58d6-…`；CEO→vp_eng 强制方法 `session-ea85593e-…`
  → child `755101e2-…`；CEO goal-only `session-bf7485f6-…` → child `003012e8-…`；严格 VP-Eng root
  `session-1393a73e-…`；常驻 probe；`preset-smoke` ALL PASS；`pnpm test` 1223；`pnpm verify` ALL PASS。
- 已知限制：CEO root/team 无 W/S（设计）；其他四职能只有 S；workflow 无深度闸；`workspace-write` 未验；
  `release-smoke` 未跑；长期采纳率未测；其他四职能只验挂载。

## 4. 探索问题与假设

| # | 假设 | 证伪 |
|---|---|---|
| H1 | 只 W：≥3 同构任务能只走 workflow，N 路真并行、结果完整 | workflow 未起 / 串行 / 结果缺 |
| H2 | 只 S：1–2 件细节能只走 subagent，不误用 workflow | 只自己做 / 误用 W / S 失败 |
| H3 | M1：W 扇出 + S 核对能各一次都成功，结果一致 | 任一失败 / 结果不一致 / 父上下文被中间消息污染 |
| H4 | M2：W→S→W 多轮都能成功，无 depth/丢失 | 第二轮起不来 / depth 错 / 结果丢 |
| H5 | 三个入口（R/C/T）能力一致（C/T 继承 vp-eng） | C/T 看不到或跑不通 |
| H6 | 负例 N 不会假装有 W/S；应路由 `vp_eng` 或报缺 | N 声称用了 W/S 但没有对应调用 |

## 5. 场景矩阵

| ID | 入口 | 任务形状（自然 prompt 的意图） | 期望 | 判据 |
|---|---|---|---|---|
| W-R | R | 4 个同构文件各核一个事实 + 汇总 | 只有 W | W ≥3 agents completed；无 S |
| S-R | R | 2 个互不相同的细节核查 | 只有 S | S started；无 W |
| M1-R | R | 3 路扇出 + 1 次独立交叉核对 | W + S 各一次 | 两者成功；结果一致 |
| M2-R | R | 扇出 → 核对 → 对不一致项再扇出 | W×2 + S×1 | 多轮成功；无 depth 错 |
| W-C | C | 同 W-R，CEO 只给目标 | CEO 选 `vp_eng`；child W | CEO 无 wait/send；child W |
| S-C | C | 同 S-R，CEO 只给目标 | child S | S started；无 W |
| M1-C | C | 同 M1-R，CEO 只给目标 | child W+S | 两者成功；CEO 无 wait/send |
| M1-T | T | 同 M1-R | teammate W+S | teammate 工具面 + 执行 |
| N-C | N | 同 M1-R | 无 W/S；路由或报缺 | 不得假装 |
| D1 | R→S child(d1) | 子代再派 S(d2) | 成功 | started |
| D2 | R→W child(d2) | 子代再派 S(d3) | depth 拒；W 可用 | 预期失败，记录 |
| F1 | R | W 中一个分支缺失/坏 JSON | 显式报缺 | 不静默当成功 |

自然 prompt 不点名工具；强制 prompt 才点名。S-C/T/N 是 natural-only（强制会掩盖“选不选”的问题）。

## 6. 两遍法

- **Pass A（forced mechanics）**：W-R / S-R / M1-R / M2-R，prompt 明确指定“用 workflow / 用 subagent /
  两者都用”。证工具链路、并发、聚合、depth；不证选择。
- **Pass B（natural selection）**：同四格 + W-C / S-C / M1-C / M1-T / N-C，prompt 只给目标。
  证 `eng-teaming`/`eng-workflow`/CEO 任务书是否真的内化。
- 上一轮教训：CEO 任务书“subagent 或 workflow 都行” → VP-Eng 拉 4 个 subagent、workflow=0；
  改死方法后才稳定。强制遍和自然遍必须分开，否则会把“工具坏了”和“提示面歪了”混为一谈。

## 7. Fixtures

在 `runtime/rehearsal-workspace/` 下新建 exp 目录（本轮尚未创建）：

| 文件 | 内容 | 用途 |
|---|---|---|
| a.json / b.json / c.json / d.json / e.json | 各一个已知 version（含一个 beta、一个 0.x） | W/M1/M2 |
| bad.json | 非法 JSON | F1 |
| missing.json（不创建） | — | F1 缺文件 |

每轮前清理 rehearsal 的 `.dsh-company` 里上一轮实验 journal/deliverables（旧 journal 的“subagent 不可用”
曾把模型带偏）；fixtures 保留。sha256 写进任务书/结果表，证明只读。

## 8. Harness

- **探针**：计划在 `probes/team/` 下新增参数化矩阵探针（文件名待定；`--scenario` + `--mode forced|natural`），
  或先用 `runtime/tmp` 的一次性脚本。复用 `tools/lib/probe-web.mjs`（`startWeb`/`companyCookie`/`companyRpc`）、
  `tools/lib/session-log.mjs`（`readRecords`）、`tools/lib/rehearsal.mjs`、`tools/lib/runtime-home.mjs`。
- **流程**：`source run/env.sh` → `startWeb({ profile: 'company' })` → `session/create`（`agentPreset` 按入口）
  → `session/prompt` → 等新的 `turn/end` → 读 raw session log（zstd）→ 解析
  `tool/call`、`tool-workflow/run-start|agent-start|agent-end|run-end` 时间戳、`tool/result`、终稿。
- **child 定位**：命名 subagent 从 `vp_eng` result 的 `started subagent <id>` 拿；workflow 子代从
  `tool-workflow/agent-start` 的 `childId` 拿；teammate 从 `team/member` 事件或扫 `runtime/harness-home/sessions`
  下 `parentSession` 匹配的会话目录；teammate 的 `agentPreset` 会是 Lead 的 preset。
- **代码骨架**（伪代码，真实脚本照 `probes/team/vp-eng-root-lead-probe.mjs` / `runtime/tmp/e2e-*.mjs`）：

```js
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
const rpc = companyRpc({ fetch, base, cookie, prefix: 'exp-', dumpBodyOnError: true })
const { sessionId } = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: entry } })
await rpc('session/prompt', { request: { requestId, sessionId, mode: 'queue', content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai' } })
// poll session/page until turn/end count increases; then read raw zstd log for tool events
```

- **证据表**（一行一场景）：ID / 期望通道 / 实际 calls / workflow run+agents+timestamps /
  subagent result / 并发或串行 / 终稿摘要 / 判定（PASS / 方法差异 / BUG）。
- **不要只看终稿**：模型可以说“我用了 workflow”而实际没调；以 `tool/call` + `tool-workflow/*` 为准。

## 9. 判据（五问）

1. **看得见**：`request/header.tools` 有目标工具（N 应为没有）。
2. **选得对**：natural 下通道符合 `eng-teaming` 五档；偏离记提示面 finding。
3. **跑得通**：W `completed` / S `started`；无 depth/sandbox/maxDepth 错。
4. **合得对**：结果完整一致、无静默丢分支；父只收聚合/终稿。
5. **并发/边界**：W 的 N 路 start 时间重叠；M1/M2 记录 S 是并发还是串行；depth 2 边界符合预期。

## 10. 预算与停止

- P1：4 轮 forced，约 10–15 min；P2：8 轮 natural，约 15–20 min；P3：3 轮边界，约 8–10 min。
- 每轮墙钟 ≤300s、prompt ≤3；连续两次基础设施失败停；flaky 场景 2 次；单次不写“稳定”。

## 11. 发现处置

- **简单**（prompt/skill/config）：当场修，复跑该格，红→绿留证。
- **复杂**（vendor/depth/后台/结果丢失）：开 [_backlog/bugs/](../../../bugs/README.md) 卡，带证据，不硬改 vendor。
- **方法差异**：natural 下选了另一条合法通道（如独立核对并进 W 第 4 条分支）——记录，不判 bug。
- **并发差异**：S 与 W 串行/并发是方法选择；两者都真跑成功即不算失败。

## 12. 不做 / 边界

- 不发明第二套编排；只用现有 workflow/subagent/team。
- 不改 vendor；workflow 无 depth 闸是已知限制，只记录。
- 不把“模型这次没选”当“工具坏了”；forced 负责后者。
- 其他四职能 / CEO root 的 workflow 扩面不在本轮；只验挂载（另立卡）。
- `workspace-write`、`release-smoke`、长期采纳率不在本轮。

## 13. Review 清单（请先审这 12 条）

1. **S-only 是否可测**：2 件小事模型可能“自己做”；接受“自己做”为合法替代，还是必须 forced 才判 S 机制？
2. **入口优先级**：C（主商业路径）与 T（团队路径）先跑哪个？预算够两条吗？
3. **M2 定义**：W→S→W 算不算“混合多次”？固定两轮 W + 一轮 S，还是让模型自己决定轮数？
4. **并发**：要不要专测“S 在 W 运行中起”？现有 mix 可能默认串行；并发是方法维度还是必测？
5. **失败面**：F1（缺分支/坏 JSON）与 background/cancel 进 P3 吗？不进就写“未覆盖”。
6. **重复次数**：flaky 2 次够吗？M2/T 要 3 次吗？
7. **允许改提示面吗**：发现 prompt 问题当场改 skill 再复跑，还是先记录统一改？
8. **证据够不够**：session id + tool calls + 时间戳 + 终稿，足以判“没问题”吗？要 token/墙钟吗？
9. **结果落点**：矩阵结果写回本题材料，还是另开 issue？简单修复同 diff 更新 Note 吗？
10. **负例 N**：CEO teammate 叫 vp-eng 时，期望“路由到 vp_eng”还是“明确报缺”？两者都算 PASS 吗？
11. **入口遗漏**：VP-Sales/COO/CFO/CMO（只有 S）、CEO root（无 W/S）、SA/SQA/researcher（都无）——
    要不要各加一条“只验可见性”的负例？还是只做 vp-eng？
12. **DSH 版本**：本计划基于 `vendor/dsh` 当前钉的 SHA；若下一位 Agent 升 pin，先重校 §1 的机制事实。

## 14. 交接步骤（新 Agent 第一小时）

1. 读本文件 §1–§3；读 [Note](../../settled_issues/2026-11-08-vpeng-workflow-channel.md)、
   [eng-teaming](../../../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md)、
   [delegation 合同](../../../../docs/contracts/delegation.md) §3/§4。
2. 基线：`source run/env.sh && pnpm verify && pnpm test`；`node checks/smoke/preset-smoke.mjs`。
   全绿预期；若红先分清工作树里其他人的改动。
3. 清 rehearsal 的旧实验 journal/deliverables；建 exp fixtures。
4. 先跑 P1 forced 四格；结果表贴回本题材料；再决定 P2/P3。
5. 发现按 §11 处置；简单修复同 diff 更新 skill/Note；复杂开 BUG 卡；最后 `pnpm verify`/`pnpm test` 全绿。

## 15. 参考

- [workflow 通道 Note](../../settled_issues/2026-11-08-vpeng-workflow-channel.md)
- [归档研究材料](../vp-eng-delegation-topology/2026-11-08-topology.md)
- [tool-workflow README](../../../../vendor/dsh/packages/workflow/tool-workflow/README.md)
- [workflow-ptc README](../../../../vendor/dsh/packages/workflow/workflow-ptc/README.md)
- [workflow 子系统](../../../../vendor/dsh/docs/subsystems/workflow.md)
- [tool-subagent README](../../../../vendor/dsh/packages/subagent/tool-subagent/README.md)
- [subagent 子系统](../../../../vendor/dsh/docs/subsystems/subagent.md)
- [agent-team README](../../../../vendor/dsh/packages/experimental/agent-team/README.md)
- [delegation 合同](../../../../docs/contracts/delegation.md) · [presets 摘要](../../../../docs/contracts/presets.md) ·
  [architecture](../../../../docs/architecture.md)
- [常驻 probe](../../../../probes/team/vp-eng-workflow-probe.mjs)
- [preset 改动完成定义](../../../../.agents/skills/preset-change-definition/SKILL.md)

## 16. 2026-11-08 第一轮探索结果（真模型 + keyless 机制档）

> 预算实际：墙钟约 60 分钟；10 个 parent turn；约 24 个 child activation；未触发停止上限。
> 证据落 `runtime/tmp/explore/`（gitignored）；本节只留脱敏摘要与 session id。

### 16.1 运行清单

| ID | 入口 | Charter / 方法 | 观察 | 判定 |
|---|---|---|---|---|
| R1 | vp-eng root | natural：4 个 <60B 的 package.json 版本汇总 | 加载 eng-teaming 后自判“第 1 档 自己做”，bash 一次读完 + 独立复核；workflow=0、subagent=0 | 合法方法差异（不记 bug） |
| R2 | vp-eng root | forced workflow：6 模块 + 缺文件 + 坏 JSON + lock 冲突；要求 schema 聚合、失败最多重试一次 | 第一次 run schema 子集 fatal（`status.enum` 缺 type），第二次 run 6 agents completed；missing/corrupt 正确；deliverable 与 fixture 未变 | **BUG-036**；聚合正确 |
| R3 | vp-eng root | forced depth 链：根→W1→W2（再 W3） | depth 2 受理；depth 3 被拒 `subagent depth 3 exceeds maxDepth 2`；模型如实转述、未伪造。根门 `list_agents` 只回 lead、`send_message` 报 `active teammate not found`；W1 那层全局控制可用 | **BUG-037**；depth 边界 PASS |
| R4 | vp-eng root | forced 后台 W（6×sleep 40）+ 5s 后 job_kill | job `killed`、run `stopReason=cancelled`、6 agents `outcome=cancelled`、child `turn/end aborted(parent)`、无残留 sleep；模型看不到 run stopReason（工具面缺口），花约 4 分钟找证据 | 取消/清理 PASS；观测缺口记 §16.4 |
| R5 | vp-eng root | forced W→S：2 分支各自起孙代并等通知 | 孙代 depth 2 真跑、值沿“孙代→分支→workflow”传回；但分支返回值是 `started subagent … <值>` 的拼接，且分支跨两轮；带 schema 的分支会 null | **BUG-038**；能力通、结果形状不成形 |
| C1 | CEO root | natural goal-only → `vp_eng` 命名 child | CEO 未用 wait_agent/send_message，但用 `bash sleep 25/30` + 轮询文件等 child（turn 142s）；child 用全局 `send_message` 回报 + 完成通知，父收到两份；值正确 | **F4/F5**（当场修） |
| C2 | CEO root | C1 绿复跑（修 skill/persona 后） | CEO 派发后立即结束本轮（“已派活，本轮结束”），无 sleep；child 未再发 `send_message`；child 自选 workflow+subagent | 绿证据（F4/F5） |
| T1 | vp-eng root | teammate：spawn eng-1 + 任务板 | teammate 执行、发消息、更新任务板；Lead 独立复算并落 report/journal；4 个小文件未用 workflow | PASS（方法差异） |
| N1 | CEO root | 负例：teammate 名 `vp-eng`，要求 workflow | teammate 明确报告“没有 workflow、也不冒充”，并指出根层与 depth 限制；CEO 指出正确路线是 `vp_eng` 命名 child | PASS（能力边界如实处理） |
| R7 | vp-eng root | 溢出压力：6 分支各 400 行、父原样返回全量 rows | 完整渲染 ~85.9k 字符；tool result 截到 49,929 字符 + `[truncated: 35806 more characters]`；spill 文件也只有 50,102 字符且含同一截断标记；父只能落 rows 0–2 完整、row 3 半段、row 4/5 null，并如实记 missing | **BUG-039**（P1）；spill 不可恢复 |
| R8 | vp-eng root | 前台 workflow 6×sleep 45，12s 后 `session/cancel` | turn/end `aborted(user)`、run `cancelled`、6 agents `cancelled`、child `aborted(parent)`、无残留 sleep | 取消收敛 PASS |
| M2 | vp-eng root | natural 多轮混合：4 模块版本 → 独立 lock 核对 → 冲突补证 | 1 workflow（4 agents completed）+ 2 subagent；最终 report.json 三轮原文、冲突 1 条、分歧原样保留；`wait_agent`（团队版）仍被调用一次并报 `no-active-peer` | 多轮结果未丢（PASS）；**F7** 残留 |
| CD2 | CEO root | C 入口 depth 链：CEO→`vp_eng`(1)→W1(2)→W2(3) | W1 的 `subagent` 被拒 `subagent depth 3 exceeds maxDepth 2`；W1 声明面 `current 2 / max 2 / remaining 0`；W1 未读文件、未重试、如实回报。`vp_eng` child 用 `bash sleep 90/75` 等 W1（F5 在 child 层的复发）；harness 在通知到达前关 web，child 被中断 | depth 边界 PASS；**F8** 观察 |
| R9 | vp-eng root | BUG-039 绿替代：6 分支各写 400 行文件，父只拿 path/行数 | workflow 返回 ~0.6k 字符、无截断；6 文件各 400 行；父用 wc/awk/md5 独立核对全过；观察：分支回的 `name` 口径不一（m06 回 `m06`），需 enum/pattern 约束元数据 | 替代形状可用（绿） |
| R10 | vp-eng root | 后台 W 自然完成：4 模块 + schema，不取消 | 1 run/4 agents completed；m01 分支 child 读了文件但只回文本、`turn/end completed`，父拿到 `modules[0]=null`/`count:3`；job/run 仍 completed；父补跑 subagent 拿到 m01=1.0.0 | **BUG-040**（P2）；null 无诊断 |
| R12 | vp-eng root | fork 上下文：同一 turn 内先读 a，再 `subagent_fork` 做 b/c workflow | fork 子会话报 `a = NOT-IN-CONTEXT` 且拒绝重读伪造；父如实记 `fork_inherited_a: false`；b/c workflow 值正确 | **F11** 观察；fork 只带已完成轮 |
| R11 | vp-eng root | pipeline 两阶段（4 模块 × stage1/stage2） | 1 run/8 agents completed；4 模块值正确、m03 prerelease true；模型自述“验收看 null 而非 run completed”。8 agents 超出本轮 6-agent 探索上限（未强制） | PASS（过程记录） |
| R13 | vp-eng root | fork 上下文（上一轮读 a，下一轮 fork） | fork 仍 `cat fixtures/a/package.json`，同时声称“来自继承上下文”；父记 `not_provable`；b/c workflow 正确 | **F13** 方法教训 |
| V1 | vp-sales root | 其他职能负例：要求 workflow | tools=73 无 workflow；4 个 subagent 核查、无假调用；每个 child `read`+`send_message`，父收消息+通知（F4 跨角色） | PASS（能力诚实）；**F12** 观察 |
| WW1 | vp-eng root | `workspace-write` 探针（`DSH_PERMISSION_MODE` 覆写） | `sandbox-exec: sandbox_apply: Operation not permitted`；模型如实报错、未绕道 | 宿主阻塞，不记 bug |
| R15 | vp-eng root | nullable schema 绿验证（a 存在 / missing 不存在） | 1 run/2 agents completed；模型用 `oneOf` 而非 type 数组，两分支都调 `structured_output`，missing 返回 null；首跑无 schema fatal | BUG-036 绿证据 |
| R14 | vp-eng root | fork 继承 token（turn1 只记 token，turn2 fork 复述） | fork 无工具、原样复述 `FORK-TOKEN-7f3a9c`——已完成轮确实被播种；同 turn 读的文件不在前缀（R12）与这条互补 | F11 绿证据 |
| RS1 | vp-eng root | durability：child 在跑时 SIGTERM 宿主，再同 home 重启 | 父 durable 无新 turn/notice；child durable `turn/end interrupted`；父再问时 `list_agents` 只 lead、`job_list` 空，自述“无法查询它是否还活着” | **BUG-041**（P1） |
| K1 | keyless | fake `SubagentProvider` + 真 workflow 引擎 | ① refusal→null→第二次 structured，starts=2；② `AGENT_START` 穿过 parallel 为 fatal；③ `AGENT_RESULT` 未捕获→run error；④ 两次 refusal 后停在 2 starts | 4/4 PASS；脚本 `runtime/tmp/explore/keyless-retry.ts` |

辅助观察：R5 的孙代、R3 的 W2 分别落在 depth 2；R4 的 child 全部在取消后进入 aborted 终态。
N1 的 teammate 在 danger-full-access 下读了 `vendor/dsh` 源码与 `~/.dsh`（探测工具/配置）——这是
当前权限模式的已知面，不记缺陷，但说明“隔离目录”只保证写入不越界，不保证读侧不可见。

### 16.2 发现与处置

| # | 发现 | 方向 | 处置 | 证据 |
|---|---|---|---|---|
| F1 | workflow schema 子集与自然写法不符：`enum`/`const` 必须配 `type`；`type` 数组不支持（R13 复现） | R2 强制 workflow + 模型自拟 schema；R13 fork child | 已修 skill 指引（红 R2/R13 / 绿 R6/R15）→ 上游建议留 **BUG-036** | R2 / R6 / R13 / R15 |
| F2 | 根会话是 Lead → 团队版控制名 shadow 全局版；契约 §4.4 与 preset 注释误写“根不是成员”；根无法 steer 自己的 child | R3 委派深度链（模型自然尝试等/催孙代） | 已修 docs/5 preset 注释/eng-teaming；机制留 **BUG-037** | R3 |
| F3 | W 分支内再委派：返回值混入回执、跨轮拼接；带 schema 的分支会 null | R5 W→S 嵌套 | 已加“分支默认是叶子”规则；机制留 **BUG-038** | R5 |
| F4 | 命名 child 同时用 `send_message` + 完成通知回报，父收到两份 | C1 CEO→vp_eng | 已修 eng-workflow 第 5 步（终稿即回执）；绿 C2 | C1 / C2 |
| F5 | CEO 用 `bash sleep` 轮询 child，而不是派发后结束本轮 | C1 | 已修 CEO skill/persona（明确禁 sleep/轮询）；绿 C2 | C1 / C2 |
| F6 | workflow >50k 返回值硬截断；spill 文件也是截断副本，缺段找不回 | R7 原样返回全量 rows 的溢出压力 | 已修 eng-teaming“返回聚合/异常”+ 研究材料 §1.1 更正；机制留 **BUG-039**（P1）；R9 验证“分支落文件 + 父拿元数据”绿替代 | R7 / R9 |
| F7 | 加了控制面规则后，根门仍会用 `wait_agent` 等 subagent child（团队版，报 `no-active-peer`） | M2 natural 多轮混合 | 已把 `wait_agent` / `interrupt_agent` 明确写进 eng-teaming 控制面列表；无绿复跑（预算） | M2 |
| F8 | 命名 child 也会用 `bash sleep 90/75` 等自己的 worker，而不是回执后等通知 | CD2 C 入口 depth 链 | 观察：与 F5 同型；harness 关 web 时 child 被中断，说明 sleep 期间被父进程终止会丢活。未再改 skill（控制面条已覆盖），记观察 | CD2 |
| F9 | 带 schema 的分支只回文本 → 父拿 null，文本答案被丢弃、无诊断；run/job 仍 completed | R10 后台 W 自然完成 + schema | 已修 eng-teaming（schema 分支明确要 structured_output；验收看 null/count）；机制/上游留 **BUG-040**（P2） | R10 |
| F10 | 宿主重启把 in-flight child 变孤儿：child 记 interrupted，父无终态/通知且查不到 | RS1 durability（在 child 在跑时杀宿主再重启） | 已修 eng-teaming 长跑条目（别跨重启等通知）；机制/上游留 **BUG-041**（P1） | RS1 |
| F11 | `subagent_fork` 只播种已完成轮：同一 turn 内刚读的 tool result 不在 fork 前缀里 | R12 fork 上下文（同 turn 读 a 再 fork）；R14 token 继承 | 已修 eng-teaming 五档表；R12 红（同 turn 不继承）、R14 绿（已完成轮 token 继承） | R12 / R14 |
| F12 | 其他职能的 generic child 也会 `send_message` + 完成通知双份回报 | V1 vp-sales 负例 | 观察：F4 跨角色版；vp-sales 无 eng-workflow 规则，未改（避免 token 税），记观察 | V1 |
| F13 | fork 继承不可用“问 fork”来证明：它会重读源文件并声称来自继承 | R13 fork after completed turn | 方法教训：验证继承/来源要用磁盘上不存在的 token，别用可重读的 fixture | R13 |

### 16.3 未覆盖 / 不记为 bug

- 长期采纳率、其他四职能的行为 E2E、CEO root/team 的 workflow 扩面、`workspace-write`、release-smoke；
- natural S-only 多轮、max-tokens/aborted 的自然案例；M2/R9 已覆盖多轮与“分支落文件”替代，但未做长跑稳定性复验；`workspace-write` 在本机被 Seatbelt 阻塞（WW1），未做部署面复验；
- R4 中“后台 run 取消后模型看不到 run stopReason”是工具面观测缺口，不是本卡生命周期的失败；
- R1/T1 的“小任务自己做”是合法方法选择，不记 bug。

### 16.4 资产收割决定

- 六张缺陷卡（036–041）留作后续修复/上游提案的载体；
- keyless retry 脚本暂不进 `pnpm test`（vendor 已有同语义测试；本仓加门禁需 P2 判据，先留证据）；
  **2026-11-08 修复轮已取代**：升格为 `checks/smoke/workflow-contract-smoke.mjs`（keyless 机制档，仍不进
  `pnpm test`），理由与新增钉子见[收口 Note](../../../../notes/implemented/2026-11-08-delegation-contract-repair.md)；
- 常驻 probe 不改：本轮是探索，稳定判据（root 控制面、schema 子集）若再次复现再升级为 probe/spec。

## 17. 2026-11-08 第三轮（修复轮之后，未覆盖面）

> 依据 = `runtime/tmp/explore/NEXT-ROUND-ADVICE.md`（修复轮 Agent 的临时建议）+ 问题卡。只探未做过的：
> 多层结果变换、cold resume / 新控制工具、团队继承 × 新控制名。workspace-write 本机 Seatbelt 阻塞，不测。

### 17.1 运行

| ID | 入口 | Charter | 观察 | 判定 |
|---|---|---|---|---|
| P1 | vp-eng root | 递归 spill：4 分支 ×500 行、父原样返回；再 `read` spill 文件最后 50 行 | workflow 后台 completed（4 agents）；`job_output` 溢出 `Omitted 22019 bytes` + spill 路径；spill 文件 **71,703 字节 / 10 physical lines**（JSON 行是超长单行）；`read` 按行截断到 **2000 字符/行**，取不到尾部；模型改用 `bash tail -c`/`sed` 拿到 `m04-line-500`，完整尾部可达 | **F14**（P2 观察）：spill 全文可达，但 `read` 的按行截断让“用 read 取回”的提示不成立；技能说 `read`/`grep` 可取回需修正 |
| C2 | vp-eng root | cold resume：child 在跑时 SIGTERM 宿主，重启后用 `list_subagents` / `send_to_subagent` 唤醒 | `list_subagents` 行有 id/label/mode/status=`inactive`，**没有 `lastTurnEnd`**；`send_to_subagent` 返回 `message delivered`，child 从 turn1 `interrupted` 起 turn2 并 `completed`，父收到完成通知；父仍调用了一次 team `wait_agent`（`no-active-peer`） | **F15**（P2，新 bug 候选）：`lastTurnEnd` 在真实装配里不出现——`company-session-query-sqlite` 在 `isolate:{sessionQuery:true}` 组内，host 的 `ctx.get('sessionQuery')` 拿不到；修复轮 spec 用 fake service 没抓到。cold resume 本身 PASS |
| C3 | vp-eng root | 团队继承 × 新控制名：spawn teammate eng-2，让它用 subagent 起 worker | root 工具 79；eng-2（child `02d92066…`）调 `subagent` + `list_subagents` + `list_agents` + team `send_message`（target=`lead`）；root 的 `list_subagents` **同时列出 teammate eng-2**（它是 subagent catalog 条目）；模型自述“成员与子代理是同一套 child 机制的两个视图” | **BUG-043**（P2）：`list_subagents` 包含 teammate，与工具描述“named/generic child 不是 team roster member”的暗示不完全一致；两套寻址可交叉使用 |
| C2b | vp-eng root | 干净 cold resume（补 `fixtures/a`）：重启后 `send_to_subagent` 唤醒 | child turn1 `interrupted` → turn2 `completed`，读到 `1.4.2`，父独立 `read` 复核；`lastTurnEnd` 仍缺；父又试了一次 team `wait_agent`（`no-active-peer`）；`sleep 60` 是否跑满无法证实（child 重启后新读文件） | cold resume PASS；**BUG-042** 复现 |
| V2 | vp-sales root | 其他职能 × 新控制工具：4 lead tier + 问它会不会用 `list_subagents`/`send_to_subagent` | tools=75，**有** `list_subagents`/`send_to_subagent`，无 workflow；模型自读 4 文件、未派 child、也没回答“何时用新工具”；自述 roster 只有自己 | **F18** 观察：新工具全局可见，但 vp-eng 之外没有 guidance，模型不选 |
| C8 | vp-eng root | 团队 depth × 新控制面：spawn eng-3 → W1 → W2（应拒） | eng-3 报告：W1/W1b 两次 `subagent` 均被 `depth 3` 硬拒、无 W2 创建、未换 `workflow`/`subagent_fork`/命名专家；depth 2 有 prompt 级 “don't delegate” 段；5 个委派工具 cap 均 2。Lead 自己读 vendor 做预测并反复 bash/等待，**turn 到 300s 仍未收口**（harness 超时） | depth PASS；**F19** 观察（Lead 过度验收/等待） |
| C9 | vp-eng root | bash 2000 行 + 尾标记，测 pruner/保留策略 | bash 结果尾部保留、`TAIL-MARKER-9f3a` 直接可见；模型又落 `/tmp` 用 `wc -l`/`tail -n 1`/`grep -c` 独立复核 | PASS（砍头不砍尾） |
| C10 | CEO root | named child 复用：先 `vp_eng` 出 v1，再让同一 child 出 v2（加 checked） | CEO 调 `vp_eng` → `send_to_subagent` → `list_subagents`；**同一个 child `2fd302d7…` 出两版**，未新起 VP-Eng；但 CEO skill/§1 仍写“改稿=再委派一次” | **F20**：文档/技能与新工具矛盾；已修（`docs/contracts/delegation.md` §1、CEO skill/persona、`eng-teaming`） |
| C7 | vp-eng root | 后台 job × 重启：`run_in_background` W（4×sleep 30）→ SIGTERM → 重启 → 问 job | `job_list` 空；`job_output` 报 `unknown job`；无完成通知；`list_subagents` 仍有 4 个 `continuable/inactive` child（无 lastTurnEnd、无产出）；父靠自读文件拿地面真值，提议逐个 `send_to_subagent` 唤醒 | **BUG-044**（P2）：后台 job 不跨重启；child 可手动补 |
| C11 | vp-eng root | 嵌套指针：分支 bash 20k 行 / 469KB 落 spill，分支回指针，父 read 尾部 | 分支只看到 ~2,065 行 / ~50KB 并**自述“没有截断”**（其实引用了 output truncated）；父用 `read offset=19996 limit=5` 读到 `CHILD-TAIL-7a2b` 与 `total 20000 lines`，`wc -c` 468,886 字节；指针跨 child→parent 可达 | PASS；**F21** 方法教训：别信 child 对截断/长度的自述 |
| C13 | vp-eng root | teammate 控制名（带提示）：eng-4 复用同一 W1 补 checked | eng-4 用 `subagent → list_subagents → send_to_subagent`，同一 child 出 v1/v2；但任务书预灌了“选哪个工具”的判据，不能算自然选择；eng-4 未加载 `eng-teaming`、两跳间用 `bash sleep`（F7/F5 teammate 版） | PASS（受污染）；**F22** 观察 |
| C13b | vp-eng root | teammate 控制名（自然）：eng-5 复用同一 W1 补 checked | eng-5 自然选 `subagent → list_subagents → send_to_subagent`（同一 W1），发现 `send_message` 到不了 child；root 用会话血缘核对 root→eng-5→W1，仅一个 child | **F18 完全解除**；teammate 自然选择 PASS |
| C12 | vp-sales root | 其他职能复用 child：subagent 读 l1 → 同一 child 补 checked | 调 `subagent` → `list_subagents` → `send_to_subagent`，同一 child `2ce45cd7…` 出 v1/v2；child mode=continuable；写 `l1.checked.json`，原文件未改 | PASS；**F18 解除**（新工具对非 vp-eng root 也可用；V2 只是模型没选） |
| C7R | vp-eng root | 恢复 C7：重启后对 4 个 workflow child 逐个 `send_to_subagent` | 4 个都冷恢复回话（会话 durable），但原 `sleep 30; cat` 输出全丢、只能重读文件；job 仍 unknown；模型明确区分“当前真值”与“job 成功证据” | **BUG-044** 恢复面：只能补当前事实，不能恢复原结果 |
| C6 | vp-eng root | compaction × skill：`skill` + `/compact` + 4 模块 natural 任务 | `/compact` 产出会话摘要（摘要里保留了“eng-teaming / 五档”），之后 4 模块自然任务仍走 workflow（1 run/4 agents），没有退回 subagent×N/bash sleep | PASS（规则在摘要后仍生效） |

### 17.2 新发现（待分诊，不直接改代码）

- **F14**：`read` 对超长单行（spill 里的 JSON rows）按 2000 字符截断；`eng-teaming` 当前写“可用
  `read`/`grep` 取回全文”对长行不成立。模型改用 `bash tail -c` 才拿到尾部。**已修 skill**
  （长行用 bash 按字节取；2026-11-08 同日），vendor 的 spill retrievalHint 仍可补。
- **F15 → [BUG-042](../../fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)**：`list_subagents` 的
  `lastTurnEnd` 在真实 profile 恒缺——`ctx.get('sessionQuery')` 看不到 `company-session-search`
  isolate 组里的 provider；`delegation-control.spec.ts` 用 fake service，所以门禁绿。C2b 复现。
  候选修法 = 把控制工具/终态读取放进能看见 sessionQuery 的组、或改用可用的 durable 读面、或删掉
  `lastTurnEnd` 承诺并重写 BUG-041 的验收。
- **F17 → [BUG-044](../../fixed_bugs/BUG-044-background-job-lost-on-restart.md)**：后台 workflow job 不跨宿主
  重启——job 登记表在进程内，重启后 `job_list` 空、`job_output` unknown、无通知；child 会话仍在
  （continuable/inactive）可手动 `send_to_subagent`，但拿不到原 job 返回值。已修 `eng-teaming` 长跑条
  （别把“job 起了”当“结果可恢复”）；机制/上游留 BUG-044。
- **F22**：C13a 的 teammate eng-4 未加载 `eng-teaming`、两跳间用 `bash sleep`（F7/F5 的 teammate 版）；
  C13b 的 eng-5 自然选对控制名。结论：控制名不是问题，**skill 加载/纪律遵守**在 teammate 层仍看运气；
  暂记观察（要硬修就得让任务书显式要求加载，或让成员继承 skill）。
- **F21**：C11 里分支只看到 ~50KB/2,065 行，却自述“没有截断”（同时引用了 output truncated）；父用
  指针 + `read offset/limit` 拿到 20,000 行尾标记。已修 `eng-teaming`（分支自述的截断/长度不可信，
  父用指针 + read/tail 核）。
- **F20**：`send_to_subagent` 让 named child 可续（C10 同一 child 出两版），但 `docs/contracts/delegation.md` §1、
  CEO `assembling-the-team`/persona、`eng-teaming` 两处仍写“改稿=再委派一次”，与新工具矛盾。**已修文本**
  （优先 `send_to_subagent` 续同一个 child，不可续再委派）；C10 是红证据（模型照工具描述做了对的事，
  书面契约却相反）。
- **F19**：C8 里 Lead 花 300s 自己读 vendor、反复 bash/等待 teammate，turn 未收口——不是深度机制失败
  （eng-3 的深度链已如实完成），是“验收”没有上限的观察；暂记，不立卡。
- **F18（C12 解除）**：V2 里 vp-sales 没提/没用新工具，但 C12 里同一个角色在“要复用 child”时
  `subagent → list_subagents → send_to_subagent` 一次走通，同一 child 出 v1/v2。结论：不是能力缺口，
  是“小任务自读”的方法选择；无需给其他职能加 guidance。
- **F16 → [BUG-043](../../fixed_bugs/BUG-043-list-subagents-includes-teammates.md)**：`list_subagents` 列出
  teammate（它们也是 subagent activation/catalog 条目），与 team `list_agents` 名册重叠；工具描述只强调
  “child 不是 roster member”，没提 teammate 也会出现在列表。候选修法 = 在行上标 `role`/`kind`，或过滤
  teammate，或改描述并在技能里写“两套寻址别混”。

### 17.3 未覆盖（第三轮剩余）

- compaction 的更强版本（本轮 `/compact` 摘要保留了 eng-teaming；未测“摘要丢掉某条规则”的边界）；
- one-shot child 的 resume 拒绝（本 profile 的 workflow/命名 child 实测都是 continuable，one-shot 面未覆盖）；
- 更深 compaction（`/compact` 摘要保留了 eng-teaming，未测“摘要丢规则”的边界）；
- one-shot child 的 resume 拒绝、后台 job + 重启、`job_kill` 后 durable 形状；
- teammate 的 depth 2/3 与 `send_to_subagent` 的交叉（C3 只到一层）；
- 其他职能 root 是否看见/误用 `list_subagents` / `send_to_subagent`；
- workspace-write（本机阻塞，不声称）。

## 18. 修复后定向回归（2026-11-09）

> 范围 = 按“只验修复、不扩面”的 20–30 分钟定向回归：042 的 `lastTurnEnd` 真实装配、044 的
> `workflow_runs`、043 的 `role/address`。不做新 charter。

| ID | 回归目标 | 结果 | 判定 |
|---|---|---|---|
| C2f | BUG-042：重启后 `list_subagents` 的终态 + cold resume | 首次查询：`lastTurnEnd: "interrupted"`、`lastTurnEndDetail: "inferred-open-turn"`；`send_to_subagent` 后 child turn2 `completed`，读到 `1.4.2`，父独立复核；模型明确“中断+重跑，不是一次跑完” | **PASS**（真实装配，非 fake service） |
| C7b | BUG-044：重启后 job 视图 | `job_list` 空、`job_output` unknown；`workflow_runs` 报该 run `lost` + 4 个 child；child 日志的 `turn/start` 后无 `tool/call`（未执行）；模型明确“结果不可恢复，可续 child 或重跑” | **PASS**（`lost` 明确） |
| C13c | BUG-043：teammate 行的 `role/address` | `list_subagents` 单行：`role: "teammate"`、`address: "eng-7"`、`lastTurnEnd: "completed"`；模型正确区分 team `send_message`（按名）vs `send_to_subagent`（按 id） | **PASS** |

观测：vp-eng 工具面从 79 → **80**（新增 `workflow_runs`）；C7b 里模型仍会 `session_event_search` 超时后退回
直接读 child JSONL（文件层取证），这是已知工具面缺口，不是新 bug。定向回归未发现新缺陷。
