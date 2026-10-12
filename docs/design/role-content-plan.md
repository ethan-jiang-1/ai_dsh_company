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

## 1. 五角色现时内容（指针）

persona 要点 / 工作流与打法 skills / KB 骨架 / 逐角色验证的**现时语义唯一家 = [presets.md](../presets.md)**
（内容本体 = [presets/](../../packages/company-pack/presets/) 各角色文件）。本篇曾复刻一份逐角色
清单，实测漂移过一次（2026-09-26 按盘核对：旧文列的 skills 名从未落地）——2026-10-12 退役复刻面，
只留设计原则（§0）、落点政策（§2）与探针设计（§3）。

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
