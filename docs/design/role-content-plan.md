# 角色内容设计（persona / skills / KB / 模板）

> 什么时候读：设计或重构角色内容（persona、skills、KB 骨架）时；现时语义查 [../presets.md](../contracts/presets.md)。
> 机制已定（[10](./architecture.md) / [20](./roles-isolation.md)）；本篇只留**内容面的设计原则与落点**。
> 状态：已定稿——六角色内容随 R2 + CMO（2026-11-05）落地；逐角色清单已退役
> （[navigation-enumeration-retirement](../../notes/archived/2026-10-12-navigation-enumeration-retirement.md)）。

## 0. 设计原则

1. **CEO 是个体，VP 是职能**（用户原话）：CEO 的 persona 写"一个人"（判断力、担当、语气），
   VP 的 persona 写"一个职能的化身"（该职能的视角、关切、veto 点）——换人不变职能。
2. **persona 管"是谁"，skills 管"怎么做"，KB 管"知道什么"**：不要把操作细节堆进 persona
   prefix（每个请求都计 token）；可复用方法进 skills（按需加载），事实与历史进 KB 文件。
   skill frontmatter 的 `description` 是**常驻注入面**（catalog 只注入 name+description）——
   每条必含一句"何时用"触发时机（2026-09-28 借 FAQ 05）。
3. **开工动作标准化**：每个角色 persona 末尾固定一段——"开工先读 `kb/<role>/CHARTER.md`
   与最近 3 篇 `kb/<role>/journal/`，收工追加 journal"。这是 D8 决策（无 memory seam）的落点。
4. **模板即流程**：写作类工作流的第一版就是"模板 + skill 指引"，不写代码。

## 1. skills / KB 的落点（对照 architecture §5 三载体）

| 内容 | 落点 | 说明 |
|---|---|---|
| persona | `presets/<role>/agent.cordis.yml` 的 persona row | 每请求计 token，控制在 ~300 字内 |
| 角色方法 skills | `presets/<role>/skills/<name>/SKILL.md` | per-preset layer，硬隔离（别的角色看不见） |
| 公司手册 | `packages/company-pack/content/AGENTS.md`（随会话经 `agent-instructions` 注入） | 全员可见（D7/D17 三载体） |
| 事实/客户/历史 | `company-workspace/.dsh-company/kb/<role>/` | 活数据，fs 工具读取 |
| journal（角色记忆） | `company-workspace/.dsh-company/kb/<role>/journal/<日期>-<slug>.md` | D8：文件即记忆 |

## 2. 探针与已闭合接口（指针）

- 入戏三探针（身份 / 知识 / 产出）的现行判据 = [`probe-smoke.mjs`](../../checks/smoke/probe-smoke.mjs) 头注；
  `--full` 档按 KB 事实与 veto 语义断言。
- 闭合接口：Q2 → D16（全员同模型）、Q3 → D17（事实留 workspace）、Q4 → 2026-09-22 动议；
  台账 = [decisions.md](../reference/decisions.md)。
