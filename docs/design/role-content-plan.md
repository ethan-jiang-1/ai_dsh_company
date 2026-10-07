# 角色内容设计（persona / skills / KB / 模板）

> 什么时候读：设计或重构角色内容（persona、skills、KB 骨架）时；现时语义查 [../presets.md](../presets.md)。
> 机制已定（[10](./architecture.md) / [20](./roles-isolation.md)）；本篇是**内容面**：
> 五个角色到底"是谁、知道什么、会什么、产出什么"。demo 成败在这里，不在机制。
> 状态：已定稿——五角色内容随 R2 全员落地（现时语义 = [../presets.md](../presets.md) 合同与各 preset 文件；模型路由 = 全员同模型，D16）。

## 0. 设计原则

1. **CEO 是个体，VP 是职能**（用户原话）：CEO 的 persona 写"一个人"（判断力、担当、语气），
   VP 的 persona 写"一个职能的化身"（该职能的视角、关切、 veto 点）——换人不变职能。
2. **persona 管"是谁"，skills 管"怎么做"，KB 管"知道什么"**：不要把操作细节堆进 persona
   prefix（它每个请求都计 token）；可复用方法进 skills（按需加载），事实与历史进 KB 文件。
   skill frontmatter 的 `description` 是**常驻注入面**（catalog 只注入 name+description）——
   每条必含一句"何时用"触发时机（2026-09-28 借 FAQ 05）。
3. **开工动作标准化**：每个角色 persona 末尾固定一段——"开工先读 `kb/<role>/CHARTER.md`
   与最近 3 篇 `kb/<role>/journal/`，收工追加 journal"。这是 D8 决策（无 memory seam）的落点。
4. **模板即流程**：写作类工作流的第一版就是"模板 + skill 指引"，不写代码。

## 1. 五个角色的内容骨架

### CEO（个体，demo 的入口与出口）

- **persona 要素**：只对全局负责；接到动议先澄清目标与约束，再拆解（WBS 倾向）；指挥权
  （创建/打断 teammates 是 Lead-only 权威，persona 里明说"你组建会议、分派任务、收口合稿"）；
  收口时亲自合成并 `present` 交付物；语气简短、决断。
- **skills（初版 3 个）**：`chairing-staff-meeting`（会议节奏：brief→并行→互审→收口）、
  `task-decomposition`（拆任务到"单一 owner + 可验收"粒度，配 blockedBy 建议）、
  `synthesizing-deliverables`（合稿规则：保留各职能的结论与分歧点，不抹平）。
- **skills（2026-09-22 增补，轮间待办①按问题组队落地）**：`assembling-the-team`
  （组队五步：要不要叫人 / 叫谁 / 不叫谁 / 哪条通道 / 定 slug），**排在 chairing 之前**，
  职能归属从 chairing 步骤 2 搬进它（不并存）；`task-decomposition` / `synthesizing-deliverables`
  未建——其职责实际由 chairing 步骤 2 / 5 承担。
- **KB**：`kb/ceo/`（决策原则、对外文风样例）；journal 由本人追加。

### VP of Engineering（职能：研发）

- **persona 要素**：视角=可行性/成本/技术风险；对 PRD 有技术 veto；产出=评审意见+研发计划；
  需要 deep-dive 时生 workers（one-shot subagent）并行调研。
- **skills**（盘上现状）：`eng-workflow`（1 号端到端工作流）、`tech-feasibility-review`。
  （旧文列的 `engineering-plan` / `spawning-research-workers` **从未落地**——2026-09-26 按盘核对更正；
  需要时按 `<role>-workflow-<主题>` 追加。）
- **KB**：`kb/vp-eng/`（技术栈事实、历史评审标准）。

### VP of Sales（职能：销售/市场）

- **persona 要素**：视角=客户/市场/定价；对"没人买"有 veto；产出=市场判断+定价建议。
- **skills**（盘上现状）：`sales-workflow`（1 号端到端工作流）、`market-sizing`（假设→估算→敏感度）、`customer-voice`（从 KB 客户访谈提炼）。
- **KB**：`kb/vp-sales/`（客户画像、竞品事实）。

### COO（职能：运营）

- **persona 要素**：视角=落地/预算/流程合规；对"运营接不住"有 veto；产出=运营方案+预算核查。
- **skills**（盘上现状）：`ops-workflow`（1 号端到端工作流）、`ops-feasibility`（人力/流程/时程核查）、`budget-check`。
- **KB**：`kb/coo/`（流程手册、预算基准）。

### CFO（职能：财务，R2 增设）

- **persona 要素**：视角=现金/成本/合规；对"现金流撑不住 / 毛利低于底线 / 账务不合规"有 veto；
  产出=项目经济性测算 + 财务合规意见（SoD 与留痕是硬闸门）。
- **skills**（盘上现状）：`cfo-workflow`（1 号端到端工作流）、`project-economics`（毛利底线 30%
  签字线、人·周分摊、里程碑收款曲线）、`finance-compliance`（SoD、留痕字段、四流一致、AI 产出不得入账）。
- **KB**：`kb/cfo/`（财务条线事实、SoD 纪律、双签线、现金流原则）。

### 共享层（全员）

- 全局指令：公司手册经 `agent-instructions` 行注入（基线 = `company-workspace/AGENTS.md`，D17；守卫 = `checks/smoke/handbook-smoke.mjs`）。
- `templates/`（workspace）：`prd.md`、`review-note.md`、`decision-memo.md`、`weekly-report.md`、`ops-review-note.md`（COO 专用运营核查）。

## 2. skills / KB 的落点（对照 architecture §5 三载体）

| 内容 | 落点 | 说明 |
|---|---|---|
| persona | `presets/<role>/agent.cordis.yml` 的 persona row | 每请求计 token，控制在 ~300 字内 |
| 角色方法 skills | `presets/<role>/skills/<name>/SKILL.md` | per-preset layer，硬隔离（别的角色看不见） |
| 公司手册 | `company-workspace/AGENTS.md`（随会话经 `agent-instructions` 注入） | 全员可见（D7/D17 三载体；手册本体即合同，见 [index](../index.md) 文档路由） |
| 事实/客户/历史 | `company-workspace/kb/<role>/` | 活数据，fs 工具读取 |
| journal（角色记忆） | `company-workspace/kb/<role>/journal/<日期>-<slug>.md`（取不到真日期用 `日期待核-<slug>.md`，见公司手册「日期口径」） | D8：文件即记忆 |

## 3. 入戏探针（R1 验 CEO/VP-Eng；R2 新增 vp-sales / coo / cfo 三角色）

每个角色独立会话（M1 模式）跑三个探针，全部通过才算"内容合格"：

1. **身份探针**："你是谁，你关心什么，你对什么有 veto？"——答出职能视角与边界。
2. **知识探针**：问一个只有该角色 KB 里才有的事实——必须答对（证明 KB 被读/被检索）。
3. **产出探针**：给一个 mini 任务（如"对这份半页 PRD 给评审意见"）——产出物符合该角色
   模板与语气，且**没有**越权替别的职能下结论。

反例记录：探针失败的修法通常是 persona 太虚（改 persona）或 KB 没接上（改 skill 指引），
不要先怀疑机制。

## 4. 已闭合接口

- Q2 → D16（全员同模型默认路由）；Q3 → D17（公司事实留 workspace 活数据，pack 只发方法论 skills 与结构模板）；Q4 → 已定 2026-09-22（动议见 [../demo.md](../demo.md)）。
