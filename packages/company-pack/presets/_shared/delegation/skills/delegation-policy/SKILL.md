---
name: delegation-policy
description: 公司委派政策（core）——默认自己做、brief 四要素、effort 预算、链设计、结果可读性；各通道的用法由本会话注入的 capability section 给。
---
# 委派政策（core）

> **先看本会话的 capability header。** 它列出的通道才是可用的；header 没有的通道 = 本会话没有该工具，不要调用、也不要让下游“试试”。
> 每条通道的具体规则在 `company:delegation-<channel>` section；workflow 引擎事实在 `company:workflow-contract` section。本 skill 只留跨通道的决策与纪律。

## 1 默认自己做

- 只有「并行上下文 / 独立验证 / 异构角色」至少占一个，才委派；多 agent 约 15× token，先算账。
- 能一层并行解决，不套三层；先扁平后嵌套。
- 委派不是“显得忙”；证据够就收。

## 2 brief 四要素（缺一不可）

1. **objective**：要什么结果，验收口径。
2. **output format**：结构化输出 / 文件路径 / 一页纸。
3. **tools & sources**：可用工具、允许读写的路径、来源坐标（文件/会话/URL）。
4. **boundaries**：不做什么、不能越的权、失败时怎么回。

child 看不到你本轮刚读的东西（fresh）；brief 自包含。fork 才带已完成轮，且**当前轮不在种子里**。

## 3 effort 预算

- 简单事实：1 个 agent，3–10 次工具调用。
- 直接比较：2–4 个 agent，10–15 次。
- 复杂研究：>10 个 agent，明确分工；先写预算再 spawn。
- 不把“多跑几个”当质量；证据够就收。

## 4 链设计

- **深度是 parent+1 的绝对量**；`maxDepth` 是**这一行**的上限，不是链预算。你的直接 child 再派，看它自己 preset 的行（如 vp-eng 的通用 `subagent` 行）。
- 长链（CEO→VP→workflow→subagent；VP-Eng→workflow→subagent）要有 depth、fan-out、并发预算；具体预算看 capability section 与各 preset 的行。
- 根门 = Team Lead；命名 child 不是 member。**别把两套控制混用**：成员按名字，subagent child 按 session id。
- 缺数据标 `unavailable`，不把“缺失”说成状态。

## 5 结果可读性

- 子代写文件，父只拿 path/摘要；不要把大段文本穿过三层（传话游戏）。
- 失败保留原文/诊断；`null` 不等于“没有结果”。
- 完成通知只证明“它停了”，不证明结果正确；验收看结构化产物与文件，不看自述。

## 6 三条硬规则

1. 成员不能冒充角色；角色的结论只能由该角色的命名 child 出。
2. 一个文件一个写者；正式交付物只由父/owner 写。
3. 不静默重试；attempt/terminal 要可见（短任务见 retry section）。
