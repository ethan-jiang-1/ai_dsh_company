---
name: delegation-policy
description: 公司委派政策（共享）——四条通道怎么选、brief 四要素、effort 预算、控制/寻址、结果可读性、链设计与重试边界。委派前先加载；引擎事实见 workflow-contract section。
---
# 委派政策（公司教义，跨角色共享）

> 这是**政策的唯一家**。角色 skill 只留领域方法；不要在这里复述 DSH 引擎细节（schema 子集/截断/重启），那些在 workflow-contract section。

## 1. 四条通道

| 通道 | 子代 | 钉 preset | 上下文 | 何时用 |
|---|---|---|---|---|
| `subagent`（spawn） | 全新 child | **能**（`agentPreset`） | 不继承父对话 | 1–2 件独立调研/盘点/测算 |
| `subagent_fork` | 父的克隆 | **不能** | 继承父对话 | 接着**本对话**做续写/复核 |
| `workflow` | 并行分支 | **不能**（克隆父组合） | fresh 克隆 | ≥3 件同构、要合并/交叉核对/只回异常；**必须可重试/可聚合时首选** |
| `team` | teammate | **不能**（继承 Lead） | 继承 Lead 组合 | 多轮协作、任务板、互审；成员继承 Lead，不是角色 preset |

**默认自己做**。只有“并行上下文 / 独立验证 / 异构角色”至少占一个，才委派；多 agent 约 15× token，先算账。

## 2. brief 四要素（缺一不可）

1. **objective**：要什么结果，验收口径。
2. **output format**：结构化输出/文件路径/一页纸。
3. **tools & sources**：可用工具、允许读写的路径、来源坐标（文件/会话/URL）。
4. **boundaries**：不做什么、不能越的权、失败时怎么回。

child 看不到你本轮刚读的东西（fresh）；fork 才带已完成轮。brief 自包含。

## 3. effort 预算

- 简单事实：1 个 agent，3–10 次工具调用。
- 直接比较：2–4 个 agent，10–15 次。
- 复杂研究：>10 个 agent，明确分工；先写预算再 spawn。
- 不把“多跑几个”当质量；证据够就收。

## 4. 控制与寻址

- team 成员：按 **成员名**（`send_message` / `wait_agent`），只认名册。
- subagent child：按 **session id**（`send_to_subagent` / `list_subagents`），不要用 team 控制名。
- workflow：按 **run id**（`workflow_runs`）。
- 父只控制直接子代；跨层用图/地址，不猜。

## 5. 结果可读性

- 子代写文件、父只拿 path/摘要；不要把大段文本穿过三层（传话游戏）。
- workflow 分支只回一行可解析 JSON；schema 只留给单次 `agent()`，分支不传。
- 失败保留原文/诊断；`null` 不等于“没有结果”。

## 6. 链设计

- **先扁平后嵌套**：能一层并行解决，不要套三层。
- 长链（CEO→VP→workflow→subagent；VP-Eng→workflow→subagent）必须有预算：depth、fan-out、并发。
- **深度是 parent+1**：workflow 分支/team 成员也是 activation 子代。CEO→VP-Eng(1)→workflow(2)→worker(3) 需要 VP-Eng 的 `subagent` 预算 3；VP-Eng 根→workflow(1)→worker(2) 仍有余量。
- 父会话的根门是 Team Lead；命名 child 不是 member。别把两套控制混用。
- 缺数据标 `unavailable`，不把“缺失”说成状态。

## 7. 重试（subagent 失败）

- 只对**幂等**任务重试；最多 1 次（attempt 2）。
- 可重试：`error` / `interrupted` / `lost`。
- 不重试：`refusal` / `aborted` / `completed`；`max-tokens` 不自动（缩任务/提预算/交人）。
- 批量/必须成功：走 workflow，脚本内显式 `missing`/`exhausted`。
- **短、幂等、重试敏感的活**可用 `subagent_retry`（同步等待、最多 2 attempts、结果带 attempts/exhausted）；长/批量仍走 workflow。
- 不静默自动重试；attempt/terminal 要可见。

## 8. worker profile

- 默认 `worker`（leaf）：只做单件活、只回证据、不再委派。
- 需要子层时显式升级 `worker-orchestrator`（已落；它只带 leaf）；并行扇出已判定 no-go（P-K 采用不稳定后不发布）；不要给 leaf 加万能开关。

## 9. 三条硬规则

1. 成员不能冒充角色；CMO 的结论只能由命名 child 出。
2. 一个文件一个写者；正式交付物只由父/owner 写。
