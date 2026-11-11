---
topic: 委派面实验第一轮：能力审计、权限真值、工具面、政策拆分与两场行为探针
intent: 把实验计划里的 E1–E6/B1–B2 跑成可复判证据，回答“哪些 GAP 是静态事实、哪些有行为后果、目标形状选哪个”；只做研究，不产出生产代码
---

# 委派面实验第一轮

> 读法：§1 能力审计；§2 权限/工具面；§3 政策拆分；§4 vendor parity；§5 行为探针；§6 目标形状；§7 未证与边界。
> 计划 = [2026-11-11-experiment-plan.md](2026-11-11-experiment-plan.md)；GAP 编号 = [2026-11-11-repo-fit-gap-register.md](2026-11-11-repo-fit-gap-register.md)。
> 证据产物在 `runtime/tmp/orchestration-fit/`（gitignored）；会话 ID 在正文，可原样复读。

## 0. 一句话

静态 GAP 全部坐实：政策泛化、team 上下文、`maxDepth` 文案、A/B/C/D 双轨、`workflow_runs` 全局、support root 是 Lead 但无 team 政策。**行为层只观察到两场**：COO 在明确要求加载 policy 后**没有**误调 workflow，而是自己做；CEO 团队**显式用 fresh**，靠任务书让成员拿到上下文，不是 docs 说的 fork。所以 Issue 2 的立论应是“合同/能力面错，不是模型已经坏”，行为探针只作验收，不作前提。

## 1. E1 · 能力审计（keyless）

来源：`runtime/tmp/orchestration-fit/e1-capability-audit.json`（解析六个/十一个 preset 的 `agent.cordis.yml`，与 `delegation-model` 对读）。

| preset | spawn | generic | named | fork | workflow | model `teamLead` | retry | control |
|---|---|---|---|---|---|---|---|---|
| ceo | ✓ | ✗ | `subagent_research` + 五职能 | ✗ | ✗ | true | ✗ | ✗ |
| vp-eng | ✓ | ✓ | `vp_cmo` / 两质量环 | ✓ | ✓ | true | ✓ | ✓ |
| vp-sales / coo / cfo / cmo | ✓ | ✓ | — | ✓ | ✗ | true | ✓ | ✓ |
| worker / worker-researcher | ✗ | ✗ | — | ✗ | ✗ | false | ✗ | ✗ |
| worker-orchestrator | ✓ | ✓ | — | ✗ | ✗ | false | ✗ | ✗ |
| quality-loop-producer / verifier | ✗ | ✗ | — | ✗ | ✗ | false | ✗ | ✗ |

**政策不适用面**（`delegation-policy` 由六个公司角色加载；worker/support 不加载，故不列）：

| 角色 | 政策里有、工具面没有 |
|---|---|
| CEO | fork（`:14`）、workflow（`:15`）、retry（`:63`） |
| vp-eng | — |
| vp-sales / coo / cfo / cmo | workflow（`:15`） |
| 命名 child VP（vp-eng preset） | team（`:16`；它不是 Lead） |

模型/YAML 唯一一处差异是 `vp-eng.namedDelegates` 的顺序（`vp_cmo` 前后），不是能力差异。

## 2. E2/E5 · 权限真值与真挂载工具面

### 2.1 权限（源码 + 真挂载）

- `tool-agent-team` 只对 `ctx.agentTeams.tryMembership(agent) !== undefined` 的 Agent 安装团队工具（`vendor/dsh/packages/experimental/tool-agent-team/src/index.ts:418`-`422`）。
- 根会话 = 单成员团队 Lead；teammate = 成员；命名 child / workflow 分支不是成员（`surface-matrix.mjs` 头注；`tool-agent-team` 的 `maybeInstall`）。
- `spawn_teammate` 的 execute 只允许 Lead（`spawnTeammate`/`callingAgent`），但 teammate 的工具面里**仍有** `spawn_teammate`（描述写 “Only the Team Lead may call this tool.”）。
- 因此 **team 段不能用 `tools.get('spawn_teammate')` 判**；要用 `agentTeams.membership(agent)?.role === 'lead'`（或 `header.parentSession === undefined` 作 fallback）。
- `COMPOSITIONS.*.teamLead` 是 **preset 级期望**，不是运行时权限：support preset 作为 root 也是 Lead。E5 实测 `worker` root 工具面含 `spawn_teammate`/`list_agents`/`send_message`，但 worker 不加载 `delegation-policy`，persona 又写“不组队”——**支持根会话是 Lead 但无 team 政策**，这是新发现的 G13 候选。

### 2.2 E5 真挂载工具面（短 ping，4 个会话）

| preset | 会话 | 相关工具面 |
|---|---|---|
| ceo | `session-1e11dbe8-cfed-4e67-8395-ce83b939333d` | `spawn_teammate` `list_agents` `send_message` `list_subagents` `send_to_subagent` `workflow_runs` + 命名行；**无** workflow/fork/retry |
| coo | `session-18f44c39-fda7-4708-87dc-7c4f28c5e3f9` | 团队工具 + `subagent` `subagent_fork` `subagent_retry` `workflow_runs`；**无** workflow |
| vp-eng | `session-f4f1694e-5b6e-48ed-b271-5de7e69d0922` | 团队工具 + `subagent` `subagent_fork` `subagent_retry` `workflow` `workflow_runs` `vp_cmo` |
| worker | `session-b29a0d33-e492-4f4e-91a4-503769fa0daa` | `spawn_teammate` `list_agents` `send_message` `workflow_runs`；**无** subagent/control |

**G6 坐实**：CEO/COO/worker 都看得见 `workflow_runs`，但它们没有 workflow。

## 3. E3 · 政策拆分原型（A 方案）

当前 `delegation-policy` 共 **2,596 code points**（分节：通道 462 / brief 229 / effort 133 / 控制 223 / 结果 138 / 链 357 / 重试 523 / worker 191 / 硬规则 78）。

目标 A = **core skill（按需）+ 五段 section（按工具/权限注入）**：

| 段 | 估算 code points | 可见性 |
|---|---:|---|
| core（默认自己做 / brief / effort / 链 / 结果 / 硬规则） | 1,200–1,400 | 按需（persona 点名） |
| spawn | 450–550 | 有 spawn 工具 |
| fork | 200–250 | 有 fork 工具 |
| workflow | 450–550 | 有 workflow 工具 |
| team | 450–550 | **Lead 权限** |
| retry | 350–450 | 有 `subagent_retry` |
| **section 小计（常驻）** | **1,900–2,350** | |

每角色常驻估算：CEO ~1,000；vp-eng ~2,000；其他 full ~1,800；命名 child VP ~1,500；support root 若注入 team ~500。**无规则丢失**：逐条映射见 `runtime/tmp/orchestration-fit/e3-policy-split.md`；角色方法（`eng-teaming`/`assembling-the-team`）仍留角色 skill，通道段只放政策。

**取舍**：A 比现状多 1.8–2.0k code points 常驻（vp-eng），换来“行动前一定看得见自己有的通道”。B（生成 per-preset skill）保留按需但生成物多；C（共享 skill + 一行能力头）最便宜但只解决 G1 表层，G5 的分层仍在。**倾向 A**；若 B4 未跑，A 的行为风险用 Issue 2 验收里的 pilot 兜住。

## 4. E4 · vendor parity

| 断言 | 本仓 | vendor | 判定 |
|---|---|---|---|
| team context | `inheritsParentContext: true`；docs 说 fork 下发会议上下文 | `context: fresh|fork`，默认 **fresh**（`tool-agent-team/src/index.ts:61`、`:208`） | **错** |
| team preset | false | 请求无 preset 字段 | 对 |
| workflow preset | false | `SUPPORTED_AGENT_OPTIONS` 无 preset | 对 |
| fork context | true | 只带已完成轮前缀 | 对，但 docs 需限定 |
| `CHANNELS.*.control` | `list_subagents`/`send_to_subagent`/`workflow_runs` | 原生是 `send_message`/`interrupt_agent`/run 返回 | **标签错**（本仓 workaround 写成通道硬能力） |
| `teamLead` | preset 级 true/false | 任何 root 都是 Lead | **语义错**（preset 期望 ≠ 运行时权限） |
| `maxDepth` | 行上限 | 行上限（`depth.ts`） | 模型对；CEO 注释/测试文案错（G2） |

## 5. 行为探针（真模型，实际 8 场：E5 4 + B1 1 + B2 1 + B3 1 + B5 1；B5 partial；B4 未跑）

### B1 · COO 四份同构合同（`session-159ac379-0ba2-41e6-a85b-4d5780f3dfe7`）

- 首调用 `skill`（加载 `delegation-policy`）；随后 `bash`/`read`/`write`/`present`。
- **`workflow` 调用 0 次**；没有“tool not found”类错误（唯一的 error 是 `present` 路径写错）。
- 模型自述：四份共 36 行，2 次调用读完；workflow 是 fresh 4 个上下文各读 9 行再聚合，36 行的活穿三层不划算；同构但无交叉核对价值 ⇒ 自己做。
- **结论**：在这场里，policy 被加载后模型**没有**误调不存在的 workflow；G1 的行为后果未观察到。G1 仍是静态合同错误（五个角色看到不存在的通道），但 Issue 2 不能写“模型会误调”，只能写“合同让模型面对不存在的选项”。

### B2 · CEO 两成员团队（root `session-4fd0dcc1-f674-44ca-854b-d1ee9a789591`）

- `spawn_teammate` ×2：`vp-sales` / `coo`，两次都显式 `context: "fresh"`。
- 两个成员 header：`agentPreset: "ceo"`、`delegationDepth: 1`、`parentSession = root`、`origin: subagent`。
- 成员 `vp-sales` 首轮 `read` 了 `.dsh-company/deliverables/b2-team-probe/drafts/ceo.md`（任务书）和 `kb/vp-sales/CHARTER.md`；第二个成员尚无调用（采样截止）。
- **结论**：CEO 实际用 **fresh + 任务书**，不是 docs 说的 fork 下发会议上下文；G3 坐实。成员继承 CEO preset（工具面全套 CEO），团队软隔离依旧。


### B3 · CEO 多轮任务（`session-5f9ce126-b277-4828-8b0a-da3bb9160218`）

- Prompt 明确“跨三轮、每轮结束就停、现在只做第一轮”；模型 1 个 turn 内完成第一轮（`skill`/`bash`/`read`/`write`），**没有** `create_goal`/`update_goal`/`get_goal`。
- **结论**：本场没有自开 goal。G8 的风险是潜在的（工具在场、无政策），不是已观察到的失控；Issue 卡不写“模型会自开 goal”。

### B5 · CMO 四个细分市场（`session-46334e68-b3c4-4db6-a8f7-dddd0cd9c69d`，partial）

- 首调用 `skill`（delegation-policy），随后 4 次 `subagent`（A/B/C/D 各一）+ `list_subagents` + 多次 `bash` 等待/查文件。
- **`workflow` 调用 0 次**；没有 tool-not-found；3 分钟 wall 到点时 turn 未结束（0 个 `turn/end`），探针被 SIGTERM，child 可能中断——只记 partial。
- 模型自述：“4 个细分市场同构、并行，现在选通道，并在同一批次里派 4 个 worker。”
- **结论**：没有 workflow 的 CMO 在 ≥3 同构任务上用 4 个 subagent 替代，并出现 `bash` 轮询等待。这是 G1/G7 的行为旁证：政策说“≥3 用 workflow”，但角色没有该工具；模型只能用次优通道。不是“误调不存在工具”，是“通道缺失导致降级”。CMO 的 spawn/fork 段应写明“没有 workflow 时怎么办（批量 subagent + 完成通知，不轮询）”。

## 6. 目标形状：A（capability-scoped sections + core skill）

**决定**：Issue 2 采用 A（B5 的 partial 进一步支持“每个角色需要知道自己没有 workflow 时怎么办”）：
1. 常驻 **capability header**（一行：本会话可用的通道；team 仅 Lead）。
2. `spawn/fork/workflow/team/retry` 五段 section，按工具/权限注入；team 用 `agentTeams.membership(agent)?.role === 'lead'`（fallback `header.parentSession === undefined`）。
3. 共享 `delegation-policy` 缩成 core（默认自己做/brief/effort/链/结果/硬规则），通道选择链到 section。
4. `workflow_runs` 改 per-agent：只在有 workflow 工具的 Agent 注册（或与 workflow 段同组）。
5. 模型事实修正作为 Issue 1 先行；Issue 2 消费修正后的 `delegation-model`。

**不选**：
- B（生成 per-preset skill）：生成物多，仍可能不被加载；原生更希望策略随工具。
- C（共享 skill + 一行能力头）：只解决“模型不知道通道”，不解决“skill 里仍有无用通道/引擎事实”，G5 仍在。
- 全量 A'（只给 workflow/team/retry 做 section，spawn/fork 留 skill）：作为 A 的 pilot 失败退路，不写进 Issue 2 主方案。

## 7. 未证与边界

- B4（A vs 现状行为 A/B）**不是研究未决**：A 需要落地原型才能 A/B，留 Issue 2 验收 pilot；B3/B5 已跑（B5 partial），不把 A 的行为效果写成已证。
- E2 的权限真值来自源码 + E5/B2 的座位观察；没有逐一测 `agentTeams.membership` 的 API 返回值（tool face/header 已足够支撑注入方案）。
- E3 的 section 文本是估算，不是最终散文；Issue 2 实现时要按“无规则丢失”清单逐条搬。
- `workflow_runs` 的 per-agent 安装是否会影响 workflow 分支/继承子代的可见性，未测；Issue 2 验收要覆盖 vp-eng root / named child / team member 三种座位。
- 行为样本各 1 场（B5 partial），只记“单次观察”，不写“模型总会/不会”。

## 8. 对 issue 的含义

- **Issue 1（事实/合同）**：G2/G3/G4 + `CHANNELS.control` 标签 + `teamLead` 语义 + vendor parity spec；不需要行为证据。
- **Issue 2（能力域化）**：G1/G5/G6 + support root 的 team 政策（G13）；A 方案；E1/E2/E3/E5 静态证据 + B1/B2/B3/B5 行为观察；B4 pilot 进验收。
- **G7/G8** 不进 Issue 1/2：需求/治理未证，留研究题待产品拍板。
