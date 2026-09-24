# 2026-09-24 · 驾驶舱·人机协作线：注意力中心 + 审批闸门 + 问询路径 + 培养面板

状态：proposed（2026-09-24 晚主线改向后落盘——驾驶舱·人机协作为当前重点；四切片各为队列条目、独立验收；**三个待裁点见文内**）

## 问题

这家公司不是"纯 agent 自治组织"，是"人 + agent"的经营体：agent 协作之外，会停在三个地方等人——
**通知人**（做到哪了）、**问人**（要信息）、**等人批**（要授权）；而 agent 能力靠人养（培养是一等
公民，不是后台维护）。现状四缺口：

1. 驾驶舱（在场板 + 动态流）只是**观察窗**：看得见谁在忙，看不见"**谁在等我**"；
2. 审批只存在于**内容层**（`kb/org.md` 签字线、手册承诺权），没有机制停点——agent 不会真的停下来等签；
3. 问询只有 CEO 有工具（ask-user），VP 刻意无（R3 汇报线定案），且跨会话无聚合显示；
4. 培养（journal → 人审 → skill 提升，D25）是后台开发任务，不在驾驶舱体验里。

## 机制盘点（rc.2 已核实——驾驶舱线**不需要升 pin**）

| 节点 | 机制载体（vendor rc.2） | 现状缺口 |
|---|---|---|
| 问询 | `packages/interaction/tool-ask-user`（agent 暂停问人）+ `user-questions`（问题/答案 seam）；CEO preset 已挂此行 | VP 无（刻意）；跨会话无聚合 |
| 审批 | `packages/interaction/user-approval`：`ctx.approval`；`approval/asked`/`approval/decided` 事件进会话日志（invariant 轮内配对）；**answerer waterfall 可由 pack 组合**——"这单谁批"可路由；policy ask/never、fail-closed | pack 未组合 answerer；公司签字线未接机制；无待批显示面 |
| 通知 | 无界面外 egress（搁置池 d 判定不变）；但**驾驶舱内通知可从会话事件推导**——`remote.session.follow` 事件流（在场板已在用）携带 `tool.call` / `approval/asked` / `present` / `turn/end` | 无聚合面 |

实证基础：r2-motion 五份会话日志均含 ask-user 与 approval 相关字样（lead.jsonl `tool.call` 事件 ×133）——
具体**调用形状**（真发生 ask-user 调用 / `approval/asked` 事件 vs 工具目录与上下文字串）由切片一第一步
实证，不在本 RFC 预设结论。

⚠ 已知边界（`user-approval` README 原话）："Requests are valid only inside an open turn — a durable
out-of-turn approval workflow is deferred"——审批闸门第一版设计在**轮内语义**（agent 提案时请求、人当场
批）；跨轮审批是上游 deferred 项，不自行发明。

## 切片一 ·「需要你」注意力中心（四切片的公共显示面）

- **干什么**：驾驶舱新增聚合面，跨会话收集三类"等人"状态：**待答问询**（ask-user 挂起）、**待批审批**
  （`approval/asked` 未决）、**完成通知**（`present` / 动议收口 / journal 收尾）。每条 = 谁 / 什么事 /
  等了多久 + **一键跳到那个会话**（成员空间入口已有）。
- **数据**：`remote.session.follow` 事件流 + 会话日志事件推导；companyDash 自有 remote 加读面（$mount
  机制升级后仍在，装配面细节升 pin 时再核）。
- **实施第一步**：窄核实事件形状（snapshots 找真实调用实例；无则先录一条带 ask-user 的探针会话再动
  UI——D15 发现权在代理）。
- **验收**：keyless 读模型单测（事件 → 注意力条目的纯函数）+ client-load 零挂载失败 + 真会话一条挂起
  问询出现在面板（presence-e2e 式认证档）+「不讲解也能看懂」走查。

## 切片二 · 审批闸门（公司签字线变机制停点）【待裁点 ①】

- **干什么**：`kb/org.md` 签字线（固定支出 ≥$500/月 = CFO 会签 + CEO 签；毛利 <30% 或折扣 <9折 =
  双签）接上 `ctx.approval`——需要签字的动作由 agent 主动请求审批；pack 组合**公司 answerer** 路由给
  人；注意力中心显示待批项；人批完 agent 同轮继续。
- **第一版只闸一个动作（待裁）**：候选 ①动议中的预算 / 对外承诺提案环节（CFO 视角，最有"经营"味，
  **倾向此项**）；②`final.md` present 前的 CEO 确认（但 present 本就是 CEO 亲手做，语义弱）；
  ③新增固定支出评估结论（org.md 已有触发词）。裁后实施。
- **角色侧配套**：相应 skill/persona 写明"何时必须请求审批"（如 CFO `project-economics` 加"签约口径
  落定后请求审批"）——内容改动走培养验收四门禁。
- **验收**：一场真动议中出现 `approval/asked`→`decided` 事件对（会话日志证据）+ 注意力中心显示 + 人批
  后 agent 继续 + keyless 单测（签字线 → 审批请求映射的纯函数）。

## 切片三 · 问询路径【待裁点 ②】

现状：CEO 有 ask-user；VP 无（"VP 不直接问用户"，问题升级回 CEO——R3 汇报线定案）。用户愿景："不同
的人的 Agent 可能会停在那儿跟人交互获取信息"。两个方向不互斥：

- **方案甲 · 汇报线中继显性化**：VP 的问题仍走 CEO（send_message 升级），注意力中心把中继链显示为
  "VP-Eng 有问题 → CEO 转述问你"——承诺权与单一对外口径不动，驾驶舱补可见性。改动小（显示层），
  **推荐先行**。
- **方案乙 · VP 会话直接问人**：给 VP preset 加 ask-user——贴合"每人养自己的 agent"；但动议内会出现
  多头问询、承诺权边界要重画（手册规则改）。适用于**独立 VP 会话**形态（本就是"和你的职能 agent 直接
  对话"），随培养轮节奏再开。
- **推荐组合**：动议内走甲，独立会话走乙；甲先做。

## 切片四 · 培养面板（养 Agent 成为一等体验）

- **干什么**：驾驶舱加"培养"面——每角色：自上次人审以来的**新 journal 教训**（待审收件箱）、最近提升
  的 skill、探针状态（上次 `probe --full` 结果）。让人审提升从后台任务变成驾驶舱日常动作。
- **衔接**：已排队的「记忆收敛 + 培养轮 3」是其素材地基（收敛后 journal 只留当前轮，面板读"当前轮
  未审条目"——收敛未做前面板先以 baseline 标记运行，不阻塞）。
- **验收**：keyless 读模型（journal 差分 → 待审清单纯函数）+ client-load + 真 journal 数据渲染走查。

## 收件人模型【待裁点 ③ · 设计立场，可推翻】

v1 按**单操作者**实现，但每个注意力 / 审批条目带 `owner` 字段——"不同的人养不同 agent"的多人未来在
数据模型上不堵死；界面外推送（多物理人收件）仍住搁置池等 seam。

## 输掉的方案

- **先升 pin 再做驾驶舱**（投影架构更漂亮）：机制盘点证明三节点在 rc.2 全部可用——升 pin 已挪触发型
  ⏸（材料备于 research/）；输给"体验优先、不为架构买单"。
- **通知走界面外推送**（桌面通知 / email）：无上游 seam（搁置池 d 判定不变），v1 的收件人就在驾驶舱
  前面坐着；复活条件照旧。
- **审批全闸**（所有对外文本都要批）：毁掉动议节奏，agent 变成事事请示；第一版只闸一条最"经营"的线。

## 非目标

不动 vendor；不做界面外推送；不升 pin；不重画承诺权（切片三方案乙若裁"动议内直问"才动手册）；
不建跨轮审批（上游 deferred，不自建）。

## 风险

follow 流的事件覆盖面（ask-user / approval 事件是否真进流）未实证——切片一第一步兜底；`user-approval`
轮内边界限制审批场景形态（第一版避开跨轮）；跨会话聚合的会话发现面（team roster 之外的独立会话）可能
要补枚举逻辑；companyDash 自有 remote 在升 pin 后的装配细节（remotes client 固定装配）待升级时再核。
