# 40 · 角色内容设计（persona / skills / KB / 模板）

> 机制已定（[10](./10-architecture.md) / [20](./20-roles-isolation.md)）；本篇是**内容面**：
> 四个角色到底"是谁、知道什么、会什么、产出什么"。demo 成败在这里，不在机制。
> 状态：骨架——每节给了结构与要求，实际文案在阶段 1 填写；填写时连同 Q2（模型路由）一起定。

## 0. 设计原则

1. **CEO 是个体，VP 是职能**（用户原话）：CEO 的 persona 写"一个人"（判断力、担当、语气），
   VP 的 persona 写"一个职能的化身"（该职能的视角、关切、 veto 点）——换人不变职能。
2. **persona 管"是谁"，skills 管"怎么做"，KB 管"知道什么"**：不要把操作细节堆进 persona
   prefix（它每个请求都计 token）；可复用方法进 skills（按需加载），事实与历史进 KB 文件。
3. **开工动作标准化**：每个角色 persona 末尾固定一段——"开工先读 `kb/<role>/CHARTER.md`
   与最近 3 篇 `kb/<role>/journal/`，收工追加 journal"。这是 D8 决策（无 memory seam）的落点。
4. **模板即流程**：写作类工作流的第一版就是"模板 + skill 指引"，不写代码。

## 1. 四个角色的内容骨架

### CEO（个体，demo 的入口与出口）

- **persona 要素**：只对全局负责；接到动议先澄清目标与约束，再拆解（WBS 倾向）；指挥权
  （创建/打断 teammates 是 Lead-only 权威，persona 里明说"你组建会议、分派任务、收口合稿"）；
  收口时亲自合成并 `present` 交付物；语气简短、决断。
- **skills（初版 3 个）**：`chairing-staff-meeting`（会议节奏：brief→并行→互审→收口）、
  `task-decomposition`（拆任务到"单一 owner + 可验收"粒度，配 blockedBy 建议）、
  `synthesizing-deliverables`（合稿规则：保留各职能的结论与分歧点，不抹平）。
- **KB**：`kb/ceo/`（决策原则、对外文风样例）；journal 由本人追加。

### VP of Engineering（职能：研发）

- **persona 要素**：视角=可行性/成本/技术风险；对 PRD 有技术 veto；产出=评审意见+研发计划；
  需要 deep-dive 时生 workers（one-shot subagent）并行调研。
- **skills**：`tech-feasibility-review`、`engineering-plan`（排期/依赖/风险表）、
  `spawning-research-workers`（怎么写 worker brief、怎么汇总 worker 结果）。
- **KB**：`kb/vp-eng/`（技术栈事实、历史评审标准）。

### VP of Sales（职能：销售/市场）

- **persona 要素**：视角=客户/市场/定价；对"没人买"有 veto；产出=市场判断+定价建议。
- **skills**：`market-sizing`（假设→估算→敏感度）、`customer-voice`（从 KB 客户访谈提炼）。
- **KB**：`kb/vp-sales/`（客户画像、竞品事实）。

### COO（职能：运营）

- **persona 要素**：视角=落地/预算/流程合规；对"运营接不住"有 veto；产出=运营方案+预算核查。
- **skills**：`ops-feasibility`（人力/流程/时程核查）、`budget-check`。
- **KB**：`kb/coo/`（流程手册、预算基准）。

### 共享层（全员）

- 全局 skill：`company-handbook`（公司使命/术语/决策礼仪——放 project `.dsh/skills` 或
  `<dshHome>/skills`，见 Q3 待定边界）。
- `templates/`（workspace）：`prd.md`、`review-note.md`、`decision-memo.md`、`weekly-report.md`。

## 2. skills / KB 的落点（对照 10 §5 三载体）

| 内容 | 落点 | 说明 |
|---|---|---|
| persona | `presets/<role>/agent.cordis.yml` 的 persona row | 每请求计 token，控制在 ~300 字内 |
| 角色方法 skills | `presets/<role>/skills/<name>/SKILL.md` | per-preset layer，硬隔离（别的角色看不见） |
| 公司手册（稳定部分） | 全局 skills root | 全员可见 |
| 事实/客户/历史 | `company-workspace/kb/<role>/` | 活数据，fs 工具读取 |
| journal（角色记忆） | `company-workspace/kb/<role>/journal/YYYY-MM-DD.md` | D8：文件即记忆 |

## 3. 入戏探针（阶段 1 的验收剧本）

每个角色独立会话（M1 模式）跑三个探针，全部通过才算"内容合格"：

1. **身份探针**："你是谁，你关心什么，你对什么有 veto？"——答出职能视角与边界。
2. **知识探针**：问一个只有该角色 KB 里才有的事实——必须答对（证明 KB 被读/被检索）。
3. **产出探针**：给一个 mini 任务（如"对这份半页 PRD 给评审意见"）——产出物符合该角色
   模板与语气，且**没有**越权替别的职能下结论。

反例记录：探针失败的修法通常是 persona 太虚（改 persona）或 KB 没接上（改 skill 指引），
不要先怀疑机制。

## 4. 与待定问题的接口

- Q2（模型路由）：若 CEO 与 VP 分模型，写在各 preset 的委托工具/会话创建 `agentOptions`，
  persona 文案不受影响（`{{model}}` 插值会自动跟随）。
- Q3（KB 边界）：本篇 §1 各角色 KB 条目里，标注"随 pack 发布"还是"活数据"的初判，
  定稿后把"随 pack 发布"部分移进 preset 目录。
- Q4（demo 动议主题）：探针的 mini 任务应从第一场 demo 的动议里抽——先定 Q4 再填 §3。
