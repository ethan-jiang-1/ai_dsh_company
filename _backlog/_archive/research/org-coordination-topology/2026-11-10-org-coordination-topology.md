---
topic: 组织协同拓扑：CEO 五条汇报线、VP-Eng 研发负载与 workflow/subagent 的分工
intent: 解释 CEO 的命名 delegation 为什么只有三条、SA/SQA 退役后 VP-Eng 靠什么承接硬软一体研发，并给出全组织用 workflow/subagent/team 协同的选项与建议；只做研究，不改代码
---

# 组织协同拓扑：五条汇报线，三条命名行

> 读法：§1 先分清「公司编制」和「运行时 agent 图」；§2 回答 CEO 为什么只有三条命名行；§3 讲两条通道的代价；
> §4 讲 VP-Eng 与 SA/SQA；§5 给全组织通道地图；§6 评分；§7 选项与建议；§8 待裁决；§9 证据边界。
> 本轮只做静态研究：读文件、git 历史、vendor 源码、既有 Note；**没有改代码、没有跑真模型、没有跑门禁**。
>
> **2026-11-10 后已变**：本文的「三条命名行 / 没有默认方法包」是落地前快照；现状 = 五条命名行
> （`vp_eng`/`vp_sales`/`vp_cmo`/`coo`/`cfo`）+ `pnpm methods:init` 四份 starter 方法包，见
> [资产审计](../workflow-subagent-exploration/2026-11-10-asset-first-round.md) 与
> [delegation 合同](../../../../docs/contracts/delegation.md)。

## 0. 一句话

**方向对，闭环没做完。**

- CEO 的 persona 说有五个直接汇报，但 `delegation` 里只有 `vp_eng` / `vp_sales` / `vp_cmo` 三条**角色**命名行
  （另加一条 `subagent_research` 调研手）；COO/CFO 没有命名行。这不是因为 COO/CFO 不存在，而是命名图
  从 2026-09-25 起按「产出型职能」逐步长出来，COO/CFO 一直没补；文件里「每个直接汇报对象一个命名委托工具」
  是一句**与事实不符的注释**，测试也只锁了三条。
- 没有命名行不等于不能叫 COO/CFO：CEO 可以用 `spawn_teammate` 起一个**叫** `coo` / `cfo` 的 teammate，
  或由人直接开它们的**根会话**（多人模式，真 preset）。但在 CEO 的委派面上，teammate
  **继承 Lead（CEO）的组合**——工具与 skills 是 CEO 的，不是 COO/CFO preset 的；它读得到
  CHARTER/KB，却加载不了 `ops-feasibility` / `budget-check` / `project-economics` / `finance-compliance`
  这些角色 skill。**真角色**与**真协作面**（任务板、互审、多轮）在 CEO 的委派面上是两条互斥的路。
- VP-Eng 的 SA/SQA 在 2026-11-09 退役；2026-11-10 的质量环（`quality_loop_produce` / `quality_loop_verify`）
  接过了 **E/V 分家的结构**，但没有接过 **系统架构 / V&V 的方法**：没有默认方法包，验证者只读、跑不了测试，
  质量环只在 VP-Eng 手里。旧 SA/SQA 的 `systems-architecture` / `vv-playbook` 仍在 git 历史里，可以改成
  方法包，不必恢复旧 preset。
- `workflow` 是 **VP-Eng 的同身份并行扇出**（分支无 `agentPreset`，不能带 CMO/COO/CFO），不是全公司编排器。
  全组织的跨职能协同仍只能走 team（软角色）或命名 child（真角色、一次性）。**这是当前组织图与运行时图
  最大的缝**。
- 建议先补三处：**CEO 的 COO/CFO 覆盖**、**team 成员的方法注入**、**系统架构/V&V 方法包**；`workflow`
  维持 VP-Eng 单角色，不把它包装成全公司调度。详见 §7。

## 1. 先分清两层：50 人编制 ≠ 11 个 agent preset

用户说「他手下比这个多」——这句话在**公司编制**层成立，在**运行时 agent** 层不成立。两层必须分开看：

| 层 | 载体 | 数量 | 回答什么 |
|---|---|---|---|
| 公司编制（部署配置 / KB 事实） | [`content/state/org.md`](../../../../packages/company-pack/content/state/org.md) | 50 人、六条线、岗位级 | 角色做判断时引用的公司事实：多少人、什么岗位、预算线、并行上限 |
| 运行时角色（agent preset） | [`presets/<role>/agent.cordis.yml`](../../../../packages/company-pack/presets/) + [`PRESET_IDS`](../../../../tools/lib/delegation-model.mjs) | 11 个 preset：6 个公司角色 + 5 个 support（worker ×3、质量环 ×2） | 一个会话挂什么人格、工具、skills |
| 协同通道 | [`docs/contracts/delegation.md`](../../../../docs/contracts/delegation.md) | 4 条：命名 child / team / subagent/fork / workflow | 活怎么分、子代是谁、父代怎么收 |

- 50 人编制里，CEO 的直接汇报是 5 个职能：CMO、VP-Eng、VP-Sales、COO、CFO
  （[`ceo/agent.cordis.yml:38`](../../../../packages/company-pack/presets/ceo/agent.cordis.yml)）。
- 运行时里，这 5 个职能对应 5 个 preset（`cmo` / `vp-eng` / `vp-sales` / `coo` / `cfo`），
  加上 CEO 自己 = 6 个公司角色 preset；其余 5 个是 support，不占编制、不进名册。
- 50 人里的产品经理、测试、SRE、PMO、会计……**不是 agent**，是角色做判断时引用的编制事实。把它们当成
  「CEO 应该有 50 个手下」会误读运行时的委派图。
- 即便只看运行时，CEO 的「手下」也不是 5 条固定边：team 的 `maxMembers: 8` 只数 teammate
  （Lead 不在 `state.members` 里；[`roster.ts:257`](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)、
  [`projection.ts:148`](../../../../vendor/dsh/packages/experimental/agent-team/src/projection.ts)），
  5 个汇报 = 5 名成员，够用；命名 child 则只有 3 个角色 + 1 个调研手。**两条边的集合不一样**，这正是 §2 的问题。

> 结论：用户看到的「少」是**运行时命名边**少，不是公司编制少。公司编制是 50 人；运行时角色是 6 个；
> CEO 能「真人格」叫到的直接汇报是 3 个，能「软角色」拉进会议室的是 5 个。

## 2. CEO 的 delegation 为什么只有三条

### 2.1 事实：三条角色行 + 一条调研行

CEO preset 的 `delegation` 组（[`ceo/agent.cordis.yml:192-228`](../../../../packages/company-pack/presets/ceo/agent.cordis.yml)）
只有四行：

| 工具名 | 指向 | `maxDepth` | 是不是公司角色 |
|---|---|---|---|
| `subagent_research` | `worker-researcher` | 省略（Host 默认 1） | 不是；只读调研手 |
| `vp_eng` | `vp-eng` | 1 | 是 |
| `vp_sales` | `vp-sales` | 1 | 是 |
| `vp_cmo` | `cmo` | 1 | 是 |

也就是说，**角色命名行 = 3 条**，不是 5 条。COO/CFO 没有对应的 `tool-coo` / `tool-cfo`。

两点命名澄清：

- `vp_cmo` 是历史工具名（与 `vp_eng` / `vp_sales` 同前缀），实际指向 `cmo` preset；公司编制里 CMO 是
  CEO 的直接汇报，不是「VP of CMO」。UI 委派卡也把它显示为「CMO（市场与产品定义）」
  （[`DelegationCard.tsx:12-14`](../../../../packages/company-pack/src/client/ui/DelegationCard.tsx)）。
- CEO 没有 generic `subagent` / `subagent_fork` / `workflow`，这不是漏配：合同把 CEO 定位为**编排者**
  （team + 命名 child），深挖/并行交给 VP-Eng 命名 child；CEO 的通用调研手只有 `subagent_research`
  （`worker-researcher`）。所以这个 `delegation` 组的语义是「CEO 的委派面」，不是「全公司工具箱」
  （[`docs/contracts/delegation.md:92-96`](../../../../docs/contracts/delegation.md)）。

同一份文件第 174 行的注释写的是：

> 「④ 汇报线（通道 A，R3；**0.2.1 变形**）：每个直接汇报对象一个**命名委托工具**」

这句话与上面的表**不一致**。同一条注释紧接着自己列了「`vp_eng` / `vp_sales` / `vp_cmo` 三个工具」，
但没有解释为什么不是五个。测试也复制了这个盲点：`tests/presets/presets.spec.ts:223-246` 的
「CEO 汇报线」测试只循环断言 `vp_eng` / `vp_sales` / `vp_cmo` 三条工具；`:248-256` 的
「CEO 五职能在位」只查 persona 文案，不查工具行。**没有测试断言 COO/CFO 的命名行。** 静态模型
（[`delegation-model.mjs:181`](../../../../tools/lib/delegation-model.mjs)）同样只列了四条 `namedDelegates`
（三条角色 + 一条调研），所以模型矩阵也不会报这个缺口。

### 2.2 历史：不是一次「五汇报」设计，是逐步长出来的

git 历史把因果说得很清楚：

| 日期 | 提交 | 发生了什么 |
|---|---|---|
| 2026-09-22 | `81021482` | 五角色存活，CFO 加入；COO/CFO preset 已存在 |
| 2026-09-25 | `1ad2c39d` | CEO 的 `delegation` 组落地：`subagent`、`vp_eng`、`vp_sales`；没有 COO/CFO |
| 2026-10-19 | `3daae4f4` | 0.2.1 升 pin，命名行改成 `agentPreset` 形态；仍是两条角色行 |
| 2026-11-06 | `9a74994d` | CMO 加入命名行（`vp_cmo`），因为 CMO 是 2026-11-05 新增的角色，MRD/StRS 需要真人格 |
| 2026-11-09/10 | `b459faba` 等 | worker family / 质量环 / 模型化重构；CEO 命名行仍三条角色行 |

- **COO/CFO 从 2026-09-22 就存在**，不是后来才加的角色。
- 命名行是**按产出需要**加的：VP-Eng 出 PRD、VP-Sales 出定价/客户判断、CMO 出 MRD/StRS；
  COO/CFO 的输出更多是「核查/否决意见」，通常发生在多职能会议里，所以一直走 team。
- 没有任何提交、Note 或决策记录写「COO/CFO 故意不做命名行」。因此更准确的描述是：
  **历史增量 + 通道分工没有收口**，而不是一个被明确批准的「三条命名行」设计。

### 2.3 机制：命名 child 与 teammate 是两种东西

为什么「没有命名行」是个真问题？因为 team 不能替代命名 child 的人格/技能：

| 维度 | 命名 child（`vp_eng` / `vp_sales` / `vp_cmo`） | teammate（`spawn_teammate`） |
|---|---|---|
| 人格/组合 | 工具行钉 `agentPreset`，child 拿**该角色 preset** 的 skills 与工具面 | **继承 Lead 的组合**；成员名只是标签 |
| 持久性 | 一次 activation；终稿走完成通知；可 `send_to_subagent` 续同一个 child | 持久成员；可反复 `send_message`、任务板、互审 |
| 任务板 | 没有 | 有（CAS 修订号、`blockedBy`、`writeScopes`） |
| 控制 | 父用 `list_subagents` / `send_to_subagent`；CEO 的团队版控制名够不到它 | 父用团队版 `send_message` / `wait_agent` / `list_agents` |
| 角色方法 | 能加载自己的角色 skill | **不能**加载角色 preset 的 skill；只能读 CHARTER/KB 或任务书里给的路径 |

证据：

- 合同直说 teammate「共享 Lead 的组合」：
  [`docs/contracts/delegation.md:83-87`](../../../../docs/contracts/delegation.md)；
  公司手册也把这条写成机制事实：
  [`content/generic/collaboration.md:8-11`](../../../../packages/company-pack/content/generic/collaboration.md)。
- vendor 源码：teammate 的 `startActivation` 只传 `parent: root`，没有 `agentPreset`
  （[`agent-team/src/roster.ts:264-272`](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)）；
  named child 的 `agentPreset` 来自工具行 config，两者不是同一条路。
- 2026-11-06 的两件套 Note 已经承认这个边界：
  「team member 的人格仍是 lead 继承……不保证成员是 CMO/VP-Eng 的 preset 人格——那是另一条（上游
  per-member preset）」，
  [`notes/archived/2026-11-06-ceo-two-artifact-team-rule.md`](../../../../notes/archived/2026-11-06-ceo-two-artifact-team-rule.md)。

**后果**：CEO 可以用 team 起一个叫 `coo` 的成员，也可以用命名行起一个真的 `vp-eng` child；但
**不能**用 team 起一个「真的 COO preset」。在**单操作者 / CEO 会话**里，COO/CFO 只有软角色这一条路；
如果把 COO/CFO 作为**根会话**由人直接开门（多人模式），它们拿到的是真 preset——但那是另一条路，
不是 CEO 的 delegation（[`multi-human-runbook.md:21`](../../../../docs/guides/multi-human-runbook.md)）。
它们的 CHARTER/KB 读得到，但 `ops-feasibility` / `budget-check` / `project-economics` / `finance-compliance`
这些**完整方法**在角色 skill 里，CHARTER 只留部分事实/规则；team 成员的 skill catalog 是 CEO 的，加载不到
（可以 `read` 文件，但当前合同没有这条约定）。

更深一层：team 成员还继承 CEO 的 **delegation 面**（`vp_eng` / `vp_sales` / `vp_cmo` 三个 `maxDepth: 1`
命名行 + `subagent_research`），但它自己是 depth 1——这些命名行对它的子代是 depth 2，按绝对深度上限会被拒。
所以它既没有 COO/CFO preset 的 generic `subagent` / `fork`，也不能像 CEO 那样再叫 VP；它只能在自己的
上下文里把活干完。**「继承 CEO 组合」不是「拥有 CEO 的权力」，而是「拿到一套对当前深度大多失效的面」。**

> 这是一条**静态推断**，不是本轮真跑证据：team 成员的组合继承 Lead，CEO 的 `skill-filesystem` 只挂
> CEO 自己的 skills + 共享 delegation（见 CEO preset 的 `customSkillDirs`）。要证伪，需要一次真模型探针：
> 让 CEO 起一个 `cmo` teammate，看它能不能 `skill` 到 `mrd-playbook`。本轮没跑，见 §9。

### 2.4 那「COO/CFO 是评审角色，所以只进 team」成立吗？

这是最合理的替代解释，值得认真对待：

- COO/CFO 的核心产出是**否决/核查**（接不接得住、毛利够不够、合规过不过），而不是像 MRD/PRD 那样
  可以独立成篇的「产品文档」；它们的判断依赖别人的稿和会议上下文。
- 把它们放进 team，让它们读任务板、读别人的 drafts、在会议里互审，确实比一次性 child 更合理。
- COO/CFO 的 CHARTER 里有最关键的**事实**（并行上限、预算线、毛利底线、SoD），这些在 team 里读得到。

但这个解释**不能完全成立**，因为：

1. 它们的角色内容（preset persona 与 CHARTER）都写了产出路径：COO 写 `drafts/coo.md`、CFO 写
   `drafts/cfo.md`（[`coo/agent.cordis.yml:38`](../../../../packages/company-pack/presets/coo/agent.cordis.yml)、
   [`cfo/agent.cordis.yml:38`](../../../../packages/company-pack/presets/cfo/agent.cordis.yml)；
   [`content/charters/coo.md`](../../../../packages/company-pack/content/charters/coo.md)、
   [`content/charters/cfo.md`](../../../../packages/company-pack/content/charters/cfo.md)）；
   「一份单职能稿」正是命名行存在的理由。
2. 它们的**方法**在角色 skill 里，不在 CHARTER 里。team 路径没有方法注入约定；如果 H2 是故意设计，
   应该能看到「teammate 如何拿到角色方法」的合同，但现在的合同只说「从 CHARTER / KB 读」。
3. 文件注释写「每个直接汇报对象一个命名委托工具」，测试名写「CEO 五职能在位」——至少说明**表述与实现
   不一致**；如果 H2 是批准的设计，注释/测试应该写「三条命名 + 两条 team-only」，而不是现在这样。

**结论**：H2 是一个合理的**设计方向**，但当前实现没有把它收口。要么补命名行（让 COO/CFO 也能一次性出稿），
要么改注释/测试并补 team 方法注入（明确它们只进 team）。**不能继续让「注释说五个、代码只有三个」并存。**

## 3. 两条通道的代价：真角色 vs 真协作

把 §2 的机制抽象一下，当前 DSH 0.2.1 给的是一个**互斥三角**：

```
真角色 preset  ──────────────  命名 child：人格/skills 真，但一次性、无任务板
      │                              │
      │                              │
      └──── 真协作面 ──────  team：任务板/互审/多轮真，但成员继承 Lead、无角色 skills
                              │
                              └── workflow：并行真，但分支是调用者克隆、无 agentPreset、无任务板
```

- **命名 child**：真角色，但一次性。适合「一份单职能稿」，不适合「MRD+PRD 两件套 + 互审」。
- **team**：真协作，但软角色。适合「多职能会议」，不适合「必须由 CMO/VP-Eng 真人格出稿」。
- **workflow**：真并行，但同身份克隆。适合「≥3 个同构取证分支」，不适合「跨角色编排」。
- 三者**不能互相替代**；这不是实现偷懒，是 vendor 的能力边界。

### 3.1 两件套规则与角色技能的冲突

CEO 的组队 skill 有一条硬规则：

> 「**两件及以上产物（如 MRD+PRD）或多职能协作必须走 team + 任务板**；`vp_*` 命名委托只用于用户明确
> 只要一份、且只属一个职能的快捷出稿」，
> [`ceo/skills/assembling-the-team/SKILL.md:67`](../../../../packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md)。

这条规则的目的是让看板/依赖图/互审有数据（2026-11-06 用户实证：两件套拆成 `vp_cmo`/`vp_eng` 后
右侧看板全空）。但它与另一条事实冲突：

- CMO 的 persona/CHARTER 说：写 MRD 先加载 `product-definition`，再用 `mrd-playbook`
  （[`cmo/agent.cordis.yml:38`](../../../../packages/company-pack/presets/cmo/agent.cordis.yml)、
  [`content/charters/cmo.md`](../../../../packages/company-pack/content/charters/cmo.md)）。
- VP-Eng 的 persona 说：写 PRD 先加载 `product-definition` 与 `prd-playbook`
  （[`vp-eng/agent.cordis.yml:36`](../../../../packages/company-pack/presets/vp-eng/agent.cordis.yml)）。
- 但 team 成员继承 CEO 的组合；CEO 的 `skill-filesystem` 只挂了 CEO skills + 共享 delegation，
  **没有 CMO/VP-Eng 的 skills 目录**。所以 team 里的 `cmo` / `vp-eng` 成员**加载不到** `mrd-playbook` /
  `prd-playbook` / `product-definition`。
- 它们可以 `read` 这些 SKILL.md（如果任务书给了路径），但这不是当前合同规定的做法；合同说的是
  「方法论从自己的 CHARTER / KB 读」，而方法实际住在 skills 里。

**结果**：两件套规则把 CMO/VP-Eng 推进 team，而 team 恰好拿不到它们的方法；要拿方法就得走命名 child，
而命名 child 又没有任务板。**这是一个环，不是一条直线。** 2026-11-06 的 Note 只承认了「人格不是 preset」，
没有处理「方法也加载不到」；本轮把它补上。

### 3.2 这不是「再写一句 persona」能解决的

可选的方向只有三类：

1. **让 team 成员能拿到角色方法**：任务书里写角色 skill 的 pack 相对路径，成员先 `read` 再干；
   或把关键方法摘要进 CHARTER/KB。这是政策/内容层的补丁，不改 vendor。
2. **让命名 child 有协作面**：当前 vendor 不支持；命名 child 没有任务板，`send_to_subagent` 只能续同一个 child。
   这是上游能力，不是本仓能造的。
3. **接受软角色**：明确「team 是会议，不是部门」；team 成员只做协调/汇总，真角色方法一律走命名 child。
   这要求把两件套规则改成「team 做协调 + 命名 child 出稿」，而不是「team 成员直接出稿」。

第 3 条其实最接近现状，也最诚实；但它需要把「两件套必须 team」改成「两件套必须有 team 协调面，
出稿仍可由命名 child 完成」。这是一个**流程合同**的调整，不是代码调整。研究建议见 §7。

## 4. VP-Eng 与 SA/SQA：结构对了，能力没接上

### 4.1 VP-Eng 现在有什么

VP-Eng 的 `delegation` 组（[`vp-eng/agent.cordis.yml:170-253`](../../../../packages/company-pack/presets/vp-eng/agent.cordis.yml)）
是六个角色里最全的：

| 行 | 指向 | `maxDepth` | 用途 |
|---|---|---|---|
| `subagent` | `worker`（可升级 `worker-orchestrator`） | 3 | 1–2 件独立执行/调研；worker 是 leaf，不再委派 |
| `subagent_fork` | 父的克隆 | 3 | 接着本对话做续写/复核 |
| `workflow-ptc` + `tool-workflow` | 同身份 fresh 分支 | 分支 = parent+1 | ≥3 个同构分支的并行扇出/聚合 |
| `vp_cmo` | `cmo` | 2 | 要 CMO 真人格的上游产物（MRD/StRS） |
| `quality_loop_produce` | `quality-loop-producer` | 2 | 质量环「做」的一侧 |
| `quality_loop_verify` | `quality-loop-verifier` | 2 | 质量环「验」的一侧（只读） |

另有 `tool-subagent-control` / `tool-subagent-list-agents`，给命名 child 续驶/寻址用；根门是 Team Lead，
可以 `spawn_teammate` 带研发小队（同组合的工程师，不是别的角色）。

**深度预算**：CEO(0) → VP-Eng(1) → workflow 分支(2) → worker(3)，恰好用满 `maxDepth: 3`；VP-Eng 根门(0)
→ 分支(1) → worker(2) 仍有余量。这是 2026-11-09 为长链专门调的，源码事实是 workflow 分支/team 成员都走
`startActivation(parent)`，深度 = parent+1
（[`workflow-ptc/src/host.ts:203-215`](../../../../vendor/dsh/packages/workflow/workflow-ptc/src/host.ts)、
[`agent-team/src/roster.ts:264-272`](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)）。

### 4.2 SA/SQA 原来是什么

2026-11-06 落地的两个 support 子人格（[`notes/archived/2026-11-06-sa-sqa-subpersonas.md`](../../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)）：

- **system-architect（SA）**：V 模型左侧，先判五学科域（软件/固件/电气/机械/系统测试，固定五行 + 依据），
  再写 PRD → SyRS → IRS → 硬软一体架构；产出 `drafts/syrs.md` / `drafts/irs.md` / `allocation.md` /
  `system-architecture.md`；把「必须验证什么」列成引用 REQ/IF 的验证点交给 SQA。
- **system-qa（SQA）**：V 模型右侧，先做域审计（SA 的五行为是否成立、排除是否举证、承接面是否矛盾），
  再把左侧每个产物映射到右侧验证（L1–L4），用 `TC-###` + `covers` 写 V&V；不通过原样上报 CEO，
  VP-Eng 不能删结论（否决直达 CEO）。

这不是两个空壳：它们有完整的方法（五学科域判定、V 模型四层、TC 覆盖、记录时间可信、故障路径耐受、
对偶口径、超额声明检查等），并且有 3 轮完整真模型 E2E 证据（SA/SQA 子会话 depth 2、SQA 否决进入 final）。
旧 skill 仍在 git 里：

```sh
git show bf04ab1c:packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md
git show bf04ab1c:packages/company-pack/presets/system-qa/skills/vv-playbook/SKILL.md
```

### 4.3 为什么退役

退役动作见 [`notes/implemented/2026-11-09-retire-sa-sqa.md`](../../../../notes/implemented/2026-11-09-retire-sa-sqa.md)；
对「方法写死在人格里」的复盘，质量环 Note 写得更准确
（[`2026-11-10-producer-verifier-quality-loop.md:13`](../../../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md)）：

- 用户明确要求清理这两个旧 preset（旧思路的专职 V 模型子人格）；
- 质量环 Note 的复盘：历史 SA/SQA 用两个子人格解决了 **E/V 分家的结构**，但把方法（V 模型层级、TC 编号、
  五学科清单）写进了 persona 与 skill——**换一家公司就要改包**；
- 删除 preset、父级委托行、模型 specialist、support/patch、文档/测试/探针引用；
- SyRS/IRS/V&V 保留为**可选文档**，若 CEO 指派 owner，owner 写在文档头；默认产品定义链缩为
  **MRD → StRS → PRD**；
- 公司不再有 SA/SQA 命名 child，也没有 SQA veto 直达 CEO 的运行时路径。

**这个决定在结构上是对的**：身份/工具面（preset）与公司方法（skill/persona）耦合，换公司就要改包；
退役把「方法」从「人格」里剥出来，是正确的长期方向。

### 4.4 质量链接过了结构，但没接过方法

2026-11-10 的质量环（[`notes/implemented/2026-11-10-producer-verifier-quality-loop.md`](../../../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md)）
用两个 support preset 接过 E/V 分家：

- `quality-loop-producer`：有手（read/write/edit/bash/web/todo/skill/compaction），按任务书点名的方法产出。
- `quality-loop-verifier`：**真只读**（`write: false` + `edit: false`，无 bash），逐 check-id 出裁决。
- 方法住 `<DSH_HOME>/company/methods/<preset id>/<pack>/`，任务书必须写 `method: <pack>@<version>`；
  **没有默认方法包**，缺了任一侧就 fail-closed 停下
  （[`docs/guides/quality-loop.md:30`](../../../../docs/guides/quality-loop.md)、
  [`quality-loop/SKILL.md:19`](../../../../packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md)）。
- 验证者只读，**跑不了测试**；动态证据由产出者跑、原始输出交给它评，拿不到就标「未验证」
  （[`docs/guides/quality-loop.md:86`](../../../../docs/guides/quality-loop.md)）。
- 两条命名行只在 VP-Eng；CEO/其他角色没有质量环入口
  （[`docs/guides/quality-loop.md:14`](../../../../docs/guides/quality-loop.md)）。

**所以质量环是「E/V 复核的骨架」，不是「系统架构能力」**：

- 它能承载 SA/SQA 的方法（只要有人把方法写成 producer/verifier 两份 SKILL.md）；
- 它不自带方法，也没有系统架构/V&V 的默认包；
- 它的验证者是文档复核者，不是能跑测试/仿真的 V&V 工程师；
- 它只在 VP-Eng 手里，CEO 不能直接对一份交付物发起质量环。

这和 SA/SQA 退役前的实际能力差了一截：**结构更干净，能力更薄**。这不是说退役错了，而是说
「退役 + 质量环」只完成了**一半**——另一半是方法包，而方法包没有随包发布。

### 4.5 硬软一体的默认公司，恰好是缺方法的那种

出厂默认公司是 **hardware-software**：

- [`content/state/company.md:4`](../../../../packages/company-pack/content/state/company.md)：`productType: hardware-software`；
- 它的需求链包含 SyRS / IRS / V&V：
  [`requirements-model.md:13-18`](../../../../packages/company-pack/content/product-types/hardware-software/requirements-model.md)
  写的是 `owner: <assigned>`，默认链只到 PRD；
- VP-Eng 的 persona 只明确自己是 **PRD 主笔**，没有说 SyRS/IRS/V&V 归它
  （[`vp-eng/agent.cordis.yml:36-39`](../../../../packages/company-pack/presets/vp-eng/agent.cordis.yml)）；
- README 却对外说 VP-Eng 管「工程可行性、技术方案、**系统与测试**」，产品链「从 MRD 到 PRD，
  再到**系统需求与测试用例**」
  （[`README.md:13,21`](../../../../README.md)）。

这是**README 的表述宽于运行时能力**的典型缺口：

- 默认公司是硬软一体；
- 系统层（SyRS/IRS/V&V）是可选、无默认 owner；
- 唯一能写这些层的旧 SA/SQA 已退役；
- 质量环能复核，但没有系统方法包，也不能跑测试；
- 通用 worker 是 leaf，没有角色 skills，写不了 SyRS/IRS。

如果 CEO 把 SyRS/IRS/V&V 指派给 VP-Eng，VP-Eng 要么自己写（它有 `product-definition` 的层/编号知识，
但没有 `systems-architecture` 的五学科/架构方法），要么起 worker（没有方法），要么走质量环（没有方法包）。
**三条路都没有把「系统架构」的方法真正接上。**

### 4.6 这一节的判断

- **退役决定**：结构上正确，保留。
- **质量环**：方向正确，保留；但它是**骨架**，不是 SA/SQA 的等价替代。
- **能力缺口**：系统架构/V&V 的方法没有随包落地；硬软一体默认公司的系统层没有默认 owner。
- **最小修复**：把旧 SA/SQA 的方法改写成 `quality-loop-producer` / `quality-loop-verifier` 两侧的方法包
  （例如 `system-architecture@1.0.0` + `vv-plan@1.0.0`），装进方法层；同时把 hardware-software 的
  SyRS/IRS/V&V 默认 owner 写成 VP-Eng（或 CEO 显式指派）。这样既保留「方法外置」的结构，又恢复能力。
- **不建议**：恢复旧 `system-architect` / `system-qa` preset，把方法再写回 persona——那会回到退役前的耦合。

## 5. 全组织怎么用 workflow / subagent / team

### 5.1 四条通道，各自的真实边界

| 通道 | 子代身份 | 上下文 | 持久/协作 | 适合 | 不适合 |
|---|---|---|---|---|---|
| 命名 child（`agentPreset`） | 真角色 preset | fresh | 一次性；可 `send_to_subagent` 续 | 一份单职能稿、独立复核、要真人格 | 任务板、多轮互审、跨角色会议 |
| `subagent`（generic） | 继承调用者（可钉 `agentPreset`/白名单） | fresh | 一次性 | 1–2 件独立执行/调研 | 需要角色方法/任务板的活 |
| `subagent_fork` | 调用者克隆 + 已完成轮 | 继承父对话 | 可续 | 接着本对话续写/复核 | 独立人格、跨角色 |
| `workflow` | 调用者克隆（**无 `agentPreset`**） | fresh | 无任务板；run 级 | ≥3 个同构分支、聚合/交叉核对 | 跨角色编排、需要角色人格、多轮协作 |
| `team` | 继承 Lead | 继承 Lead 组合 | 持久、任务板、互审 | 多职能会议、反复追加意见 | 真角色方法、独立人格 |

另有 `dsh-sdk` 子进程通道（硬隔离 one-shot），当前六角色未使用；不影响本文结论。

两条 vendor 事实钉死边界：

- workflow 的 `agent()` 只支持 `label / phase / schema / provider / model`，没有 `agentPreset`
  （[`workflow-ptc/src/runtime.ts:33`](../../../../vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts)）；
  `startChild` 只传 `parent`，不传 preset
  （[`workflow-ptc/src/host.ts:203-215`](../../../../vendor/dsh/packages/workflow/workflow-ptc/src/host.ts)）。
- team 的 `spawn_teammate` 只有 `name / description / prompt / context`，没有 preset
  （[`tool-agent-team/src/index.ts:193-204`](../../../../vendor/dsh/packages/experimental/tool-agent-team/src/index.ts)）；
  `roster.spawn` 只传 `parent: root`
  （[`agent-team/src/roster.ts:264-272`](../../../../vendor/dsh/packages/experimental/agent-team/src/roster.ts)）。

### 5.2 全组织通道矩阵

以下是 `delegation-model.mjs` 的当前投影（只列公司角色 + support 的关键差异）：

| preset | 角色 | 命名行 | generic `subagent` | worker profile | workflow | team | 控制行 |
|---|---|---|---|---|---|---|---|
| `ceo` | CEO | 3 角色 + 1 调研 | 无 | — | 无 | 有（Lead） | 无（被 team shadow） |
| `vp-eng` | 研发 | 2 质量环 + CMO | 有（钉 `worker`，可升级 `worker-orchestrator`） | `worker` | **有** | 有（Lead） | 有 |
| `vp-sales` | 销售 | 无 | 有（继承自身） | 未钉（target `worker`） | 无 | 有（Lead） | 有 |
| `coo` | 运营 | 无 | 有（继承自身） | 未钉（target `worker`） | 无 | 有（Lead） | 有 |
| `cfo` | 财务 | 无 | 有（继承自身） | 未钉（target `worker`） | 无 | 有（Lead） | 有 |
| `cmo` | 市场 | 无 | 有（继承自身） | 未钉（target `worker`） | 无 | 有（Lead） | 有 |
| `worker` / `worker-researcher` / `worker-orchestrator` | support | — | 各自 | — | 无 | 无 | 无 |
| `quality-loop-producer` / `quality-loop-verifier` | support | — | 无 | — | 无 | 无 | 无 |

来源：[`tools/lib/delegation-model.mjs:173-345`](../../../../tools/lib/delegation-model.mjs)。

三个值得注意的不对称：

1. **VP-Eng 是唯一「全栈」角色**：worker + workflow + 质量环 + CMO + team。其他四个职能只有
   `subagent` / `fork` / `team`。这是有意的（研发的活最像「多分支取证 + 并行实现」），但也意味着
   「全公司都用 workflow」在运行时并不存在。
2. **其他角色的 generic `subagent` 没有钉 worker**：它们的孩子继承角色自身（一个「迷你 VP-Sales/COO/CFO/CMO」），
   不是 leaf worker。模型里 `targetWorkerProfile: 'worker'` 是目标，尚未铺开；只有 VP-Eng 已落地。
   对 1–2 件小事问题不大，但对「多件并行」会放大角色上下文与能力面。
3. **team 的 `maxMembers: 8`**：只数 teammate，Lead 不在其中；5 个汇报 = 5 名成员，够用。但 team 成员
   是继承 CEO 组合的软角色，不是 5 个部门。50 人编制不是 50 个 agent。

### 5.3 每个角色应该怎么用（建议模式，不是现状）

| 角色 | 推荐用法 | 不要用 |
|---|---|---|
| CEO | 多职能/多产物 → team + 任务板；单职能一份稿 → 命名 child；外部取证 → `subagent_research`；收口自己合稿 | 用 workflow 做全公司编排；用 team 成员冒充真 CMO/COO/CFO 出稿 |
| VP-Eng | ≥3 同构分支 → workflow；1–2 件执行 → worker；复杂产出 E/V → 质量环；工程小队 → team；上游 MRD/StRS → `vp_cmo` | 把 workflow 分支当独立人格；让质量环验证者跑测试 |
| VP-Sales | 1–2 件客户/定价取证 → `subagent`/`fork`；多职能定价/交付/毛利 → team | 用 workflow（当前没有）；用 team 成员自称「VP-Sales 的结论」而不署真角色 |
| COO | 交付承接/预算核查 → 单职能稿走命名 child（若补）；多职能落地判断 → team | 用 team 成员替代 `ops-feasibility`/`budget-check` 方法 |
| CFO | 经济性/合规 → 单职能稿走命名 child（若补）；报价/毛利/现金流 → team | 用 team 成员替代 `project-economics`/`finance-compliance` 方法 |
| CMO | MRD/StRS → `vp_cmo`（真人格）；与 VP-Eng 两件套 → team 协调 + 命名 child 出稿 | 用 team 里的 `cmo` 成员直接写 MRD（方法加载不到） |

### 5.4 workflow 不是全公司编排器

这是本轮最需要纠正的一个直觉：

- `workflow` 的分支是**调用者的克隆**，没有 `agentPreset`。VP-Eng 开 workflow，分支全是 VP-Eng 人格；
  CEO 开 workflow，分支全是 CEO 人格。它**不能**在一个脚本里放 CMO/COO/CFO 分支。
- 它没有任务板、没有成员名册、没有跨轮协作；它适合「一次 run 内把 N 个同构分支跑完、聚合 JSON」。
- 跨职能协同只能用 team（软角色）或命名 child（真角色、一次性）。**workflow 不解决跨角色身份问题**。
- 如果未来要让 workflow 支持角色，需要 vendor 给 `agent()` 加 `agentPreset`；当前没有。这是上游提案，
  不是本仓能造的。

所以「整个组织借助 workflow 把事协同做了」这句话，准确的说法是：

> **VP-Eng 用 workflow 把研发取证/覆盖审计并行化；全组织的跨职能协同靠 team + 命名 child；
> workflow 不是组织层调度器。**

## 6. 评分：哪里对，哪里没闭环

| 维度 | 判断 | 依据 |
|---|---|---|
| 六角色身份与 owner 唯一 | **对** | 每个角色有 persona/CHARTER/skills；产物 owner 唯一，缺角报缺不代行 |
| 两通道分工（team vs 命名 child） | **机制上对，表达上错** | 机制边界真实；但注释/测试说「每个汇报一个命名工具」，实际 3/5 |
| CEO 命名覆盖 | **不完整** | 3 角色行；COO/CFO 无命名行；无决策记录解释 |
| team 角色/方法 | **不完整** | 成员继承 CEO 组合；CHARTER 可读，角色 skills 不可加载；两件套规则与角色方法冲突 |
| VP-Eng worker family + 深度 | **对** | worker leaf/orchestrator；maxDepth 3 覆盖 CEO→VP→workflow→worker |
| SA/SQA 退役 | **结构对** | 方法从 persona 剥离；旧 preset 删除；SyRS/IRS/V&V 可选 |
| SA/SQA 能力替代 | **没接上** | 质量环是骨架；无默认方法包；验证者只读；无系统架构方法 |
| 硬软一体系统层 | **不完整** | 默认 productType = hardware-software；SyRS/IRS/V&V `<assigned>`；VP-Eng 只明确 PRD |
| workflow 定位 | **对，但容易被误读** | 只 VP-Eng；同身份扇出；不是跨角色编排 |
| 其他角色 worker profile | **未铺开** | 只有 VP-Eng 钉 `worker`；其他 target `worker` 但当前继承自身 |
| 文档/测试盲点 | **存在** | 「每个汇报一个命名工具」；「CEO 汇报线」只测三条；「五职能在位」只查 persona；README 承诺系统/测试 |

**总评：方向对，接口没闭合。** 这不是一个需要推翻重来的架构；它需要补四个缝：

1. CEO 命名覆盖（COO/CFO 走命名还是走 team-only，必须二选一写清楚）；
2. team 成员的方法注入（否则两件套规则与角色方法冲突）；
3. 系统架构/V&V 方法包（否则 SA/SQA 退役后的能力空洞一直在）；
4. 文档/测试的覆盖（否则下一个人还会问同样的问题）。

## 7. 选项与建议（只研究，不实施）

### 7.1 CEO 的 COO/CFO 覆盖

**选项 A：补两条命名行**（`coo` / `cfo`，`maxDepth: 1`，`agentPreset: coo` / `cfo`）。

- 优点：命名图 5/5，与 persona 的「五个直接汇报」一致；COO/CFO 能拿真人格与角色 skills；
  单职能稿（`drafts/coo.md` / `drafts/cfo.md`）有真路径；UI 委派卡可复用现有模式。
- 代价：CEO 工具面 +2；UI `DELEGATION_TOOL_KEYS` 要加两个 key
  （[`delegation-keys.ts:9`](../../../../packages/company-pack/src/client/wiring/delegation-keys.ts)）；
  测试/模型/patch/docs 同步；需要一次真模型挂载探针。
- 适用：用户希望 CEO 能像叫 VP-Eng 一样叫 COO/CFO 出单职能稿。

**选项 B：维持三条，明确 COO/CFO 只进 team**。

- 优点：不扩 CEO 工具面；符合「评审角色进会议」的直觉；改动小。
- 代价：必须改 persona/注释/测试，明确「三条命名 + 两条 team-only」；必须补 team 方法注入，
  否则 COO/CFO 在 team 里拿不到 `ops-feasibility` / `budget-check` / `project-economics` / `finance-compliance`；
  COO/CFO 的 `drafts/coo.md` / `drafts/cfo.md` 产出路径在单人模式下只能由 team 里的软角色写，
  而软角色又拿不到角色方法。
- 适用：用户认为 COO/CFO 的工作本质上依赖会议上下文，不应一次性出稿。

**选项 C：给 CEO 加 generic `subagent` + `allowedAgentPresets: [coo, cfo]`**。

- 优点：不新增两个命名工具；模型可按需选。
- 代价：身份靠模型自选，不可审计（质量环 Note 已经明确否决过这种做法）；不推荐。

**建议**：**A 为主，B 为备选**。如果用户要「组织图 = 运行时图」，A 是最小一致解；如果用户要
「COO/CFO 只进会议」，B 必须同时补 team 方法注入，不能只改注释。**无论选哪个，先把注释/测试的
「五个」谎言修掉。**

### 7.2 team 成员的方法注入

**选项 A：任务书带角色 skill 路径**。

- CEO/VP-Eng 在 `spawn_teammate` 的 `prompt` 里写：
  「你是 COO；先 `read` `node_modules/dsh-company-pack/presets/coo/skills/ops-feasibility/SKILL.md`
  与 `budget-check/SKILL.md`，再按任务书产出。」
- 优点：不改 vendor；立刻可用；方法仍在原家（角色 skills）。
- 代价：路径依赖安装布局（`node_modules/dsh-company-pack` vs `link:`）；任务书更长；
  模型可能不读。需要一条合同/测试钉住路径约定。

**选项 B：把关键方法摘要进 CHARTER/KB**。

- 优点：team 成员按现有「从 CHARTER/KB 读」的合同就能拿到。
- 代价：同一方法有两个家（skill + CHARTER），容易漂；只适合稳定、短的方法，不适合完整 playbook。

**选项 C：上游 per-member preset**。

- 让 `spawn_teammate` 接受 `agentPreset`，成员拿真角色组合 + 任务板。这是根本解。
- 代价：要动 vendor；当前 0.2.1 不支持；只能提案。

**建议**：**A 现在做，C 提上游**；B 只用于少量稳定规则。不要让「两件套必须 team」继续和
「角色方法只在 skill 里」互相打脸。

### 7.3 SA/SQA 能力

**选项 A：系统方法包**（推荐）。

- 把旧 `systems-architecture` / `vv-playbook` 改写成质量环方法包：
  - `quality-loop-producer` 侧：`system-architecture@1.0.0`（五学科域判定、SyRS/IRS/架构稿、验证点清单）；
  - `quality-loop-verifier` 侧：`vv-plan@1.0.0`（域审计、V 模型 L1–L4、TC 覆盖、记录时间/故障路径检查）。
- 装进 `<DSH_HOME>/company/methods/quality-loop-producer/` 与 `.../verifier/`；
  任务书写 `method: system-architecture@1.0.0`。
- 优点：保留「方法外置」的结构；不恢复旧 preset；质量环的审计/只读/串行机制直接复用；
  方法可换公司/换产品类型。
- 代价：方法包要人写/维护；验证者仍跑不了测试（动态证据由 producer 跑）；质量环只在 VP-Eng。

**选项 B：薄 `system-engineering` support preset**。

- 保留一个「系统工程师」身份 + 方法槽（像 quality-loop producer 一样），但方法仍外置；
  不把五学科/V 模型写进 persona。
- 优点：有专门的系统角色，组织图更直观。
- 代价：又回到「多一个 support preset」的维护面；与质量环 producer/verifier 的职责重叠；
  用户刚退役 SA/SQA，可能不想再引入新角色。**非必要不选。**

**选项 C：什么都不做**。

- 接受 SyRS/IRS/V&V 是可选、无默认 owner；README 改成「可选层，需 CEO 指派」。
- 优点：零改动；诚实。
- 代价：硬软一体默认公司的系统层仍然没有方法承接；对外承诺要降级。

**建议**：**A**；同时把 hardware-software 的 SyRS/IRS/V&V 默认 owner 写成 VP-Eng（或 CEO 显式指派），
让「默认链」与「可选层」的边界清楚。B 只在用户明确要「系统工程师」身份时考虑。

### 7.4 workflow 的作用域

**选项 A：维持 VP-Eng 单角色**。

- 优点：与 vendor 能力一致；深度/工具面/成本可控；不让所有角色为 workflow 付 token。
- 代价：VP-Sales/COO/CFO 的批量取证仍只能多次 `subagent`；没有 workflow 的聚合/异常优先。

**选项 B：在 CFO/COO 试点 workflow**。

- 历史上 2026-10-12 有一次 CFO teammate 四路取证的真实使用（当时 CEO 组合带 workflow）；
  说明财务/运营也有「多源并行取证」场景。
- 代价：要加 `workflow-ptc` + `tool-workflow` 两行、调深度、加合同/测试；CFO/COO 的 root 是 Lead，
  可以开 workflow，但成员继承的是他们的组合，分支是同身份 CFO/COO 克隆。
- 适用：用户希望财务/运营也做批量取证/覆盖审计。

**选项 C：把 workflow 包装成全公司编排器**。

- 不成立：没有 `agentPreset`，分支不能是 CMO/COO/CFO；没有任务板；不要这么做。

**建议**：**A 现在，B 作为试点选项**；明确写「workflow = 同身份扇出，不是组织调度」。

### 7.5 文档/测试的收口

- 把 CEO 注释的「每个直接汇报对象一个命名委托工具」改成事实（三条 + 两条 team-only，或补成五条）。
- 把「CEO 汇报线」的循环扩成 5 条（或加一条明确的「3 条命名 + 2 条 team-only」合同断言）；
  「五职能在位」的 persona 断言保留，但不要拿它当委派覆盖的证据。
- README 的「系统与测试」「从 MRD 到系统需求与测试用例」要与实际能力对齐：要么补方法包，
  要么写「系统层可选，需指派 owner」。
- `docs/contracts/delegation.md` 的 `vp_cmo` 行说「只在 vp-eng preset」，但 CEO 也有 `vp_cmo`
  （`maxDepth: 1`）；措辞要改成「CEO 版 maxDepth 1 / VP-Eng 版 maxDepth 2」，避免误读。
- 加一条 keyless 守卫：CEO 的命名行集合 == 模型 `namedDelegates` == 测试期望（当前是 4 个，含调研）。

## 8. 待用户裁决

1. **COO/CFO 走哪条**：补命名行（A）还是 team-only + 方法注入（B）？
   这决定 CEO 的「五个汇报」在运行时是 5 条边还是 3 条边 + 2 个软角色。
2. **SA/SQA 的方法要不要回来**：系统方法包（A）、薄系统工程师 preset（B），还是接受可选层（C）？
   如果默认公司继续是 hardware-software，我建议 A。
3. **产品类型**：按动议声明（`hardware-software` / `business-software`）还是固定公司默认？
   细究见 [产品类型模型](2026-11-10-product-type-model.md)；建议动议声明 + `company.md` 回落。
4. **workflow 是否只留在 VP-Eng**：要不要在 CFO/COO 试点？
5. **team 方法注入**：接受「任务书带 skill 路径」（A），还是等上游 per-member preset（C）？
   在 C 落地前，A 是唯一不改 vendor 的可用解。

## 9. 证据与边界

### 9.1 本轮的证据类型

| 类型 | 例子 | 可信度 |
|---|---|---|
| 静态配置 | CEO/COO/CFO/VP-Eng 的 YAML 行、`delegation-model.mjs`、`cordis.patch.yml` | 高；直接读文件 |
| git 历史 | 命名行的增量、SA/SQA 的删除、旧 skill 的内容 | 高；`git log` / `git show` |
| vendor 源码 | team/workflow 的 `startActivation` 无 `agentPreset` | 高；钉住 SHA 的源码 |
| 既有 Note 的真跑证据 | SA/SQA 3 轮 E2E、质量环 E2E、两件套 E2E | 中高；是历史证据，本轮未复跑 |
| 静态推断 | team CMO 加载不到 `mrd-playbook` | 中；由组合/技能目录推出，未真跑 |

### 9.2 本轮没做

- 没有改任何代码、preset、docs、tests；只新增研究文件与研究索引。后续按用户 2026-11-10 指示另立
  4 张 issue 卡（研究之外，不计入本文证据）。
- 没有跑 `pnpm test` / `pnpm verify` / `preset-smoke`；没有跑真模型探针。只跑了
  `backlogLivenessProblems('_backlog')` 的库函数（OK）与本地 Markdown 链接检查（OK，含新卡）。
- 另做了一轮**只读事实审计**（subagent）：确认承重断言；修正 3 处引用错位（测试归属、退役 Note 归属、
  CHARTER/persona 措辞）、2 处行号漂移、1 处 `maxMembers` 口径（只数 teammate，不含 Lead）。结论不变。
- 没有验证「team CMO 在真实会话里是否尝试 `skill` 并失败」；这需要一次定向探针。
- 没有验证「补 COO/CFO 命名行后 UI 卡/测试/深度是否全绿」；这是实施轮的事。

### 9.3 什么会推翻本文

- 如果真模型探针显示 team CMO 能通过某种现有机制加载 `mrd-playbook`（例如 `tool-skill` 能跨 preset
  读目录），§3.1 的「方法加载不到」需要降级。
- 如果 `docs/contracts/delegation.md` 或某张已批准卡明确写了「COO/CFO 只进 team，不补命名行」，
  §2.2 的「没有决策记录」需要修正。
- 如果上游 0.2.1 的 `spawn_teammate` 已经支持 `agentPreset`（本文读的 pin 不支持），§3/§7.2 的
  「上游 per-member preset」结论需要更新。
- 如果默认产品类型不是 hardware-software（部署可改），§4.5 的「默认公司恰好是缺方法的那种」需要
  按实际部署重判。

## 10. 附录

### 10.1 运行时组合矩阵（来自 `delegation-model.mjs`）

| preset | archetype | channels | namedDelegates | generic spawn | worker profile | workflow | control |
|---|---|---|---|---|---|---|---|
| ceo | lead | spawn, team | subagent_research, vp_eng, vp_sales, vp_cmo | no | — | no | no |
| vp-eng | full | spawn, fork, workflow, team | quality_loop_produce, quality_loop_verify, vp_cmo | yes | worker | yes | yes |
| vp-sales | full | spawn, fork, team | — | yes | —（target worker） | no | yes |
| coo | full | spawn, fork, team | — | yes | —（target worker） | no | yes |
| cfo | full | spawn, fork, team | — | yes | —（target worker） | no | yes |
| cmo | full | spawn, fork, team | — | yes | —（target worker） | no | yes |
| worker | worker | — | — | no | — | no | no |
| worker-researcher | worker | — | — | no | — | no | no |
| worker-orchestrator | worker | spawn | — | yes | worker | no | no |
| quality-loop-producer | support | — | — | no | — | no | no |
| quality-loop-verifier | support | — | — | no | — | no | no |

### 10.2 时间线

- 2026-09-22：五角色 + CFO，50 人编制。
- 2026-09-25：CEO 命名行 `subagent` / `vp_eng` / `vp_sales`。
- 2026-10-19：0.2.1 升 pin，命名行改 `agentPreset`。
- 2026-11-05：CMO 角色新增。
- 2026-11-06：`vp_cmo` 命名行；两件套必须 team；SA/SQA 子人格落地。
- 2026-11-08：VP-Eng 接 workflow；SA/SQA 能力组织（五学科/域审计）。
- 2026-11-09：SA/SQA 退役；委派面模型化重构；worker family；深度预算。
- 2026-11-10：质量环（producer/verifier）；本文。

### 10.3 术语

- **命名 child**：`tool-subagent` 行钉 `agentPreset`，child 拿该角色组合；activation 一次，终稿走完成通知。
- **teammate**：`spawn_teammate` 起的持久成员；继承 Lead 组合；任务板/互审/多轮。
- **质量环**：`quality_loop_produce` → 收工 → `quality_loop_verify`；方法外置，裁决原样落盘，事后审计。
- **SA/SQA**：2026-11-06 的两个 support 子人格（系统架构 / 系统质量保证），2026-11-09 退役。
- **workflow**：脚本化同身份并行扇出；分支无 `agentPreset`，不是跨角色编排。
