# 2026-09-25 · 人机合一 · 阶段 0：人机交互模式候选集（UX 判据）

状态：阶段 0 完成（vendor 盘点 + 外部实践两路研究已回，候选集合成完毕；外部检索一手为主，Horvitz 两篇 PDF 未逐字核——如实标注）

> owner RFC = [proposed/human-agent-integration](../proposed/2026-09-25-human-agent-integration.md)「定性：这是 UX 问题」节。
> 形状约束（判"成不成立"的底）：审批**轮内有效 + fail-closed**（`ctx.approval` 管线）；无界面外推送 seam
> （搁置池「界面外推送」判定）；v1 **单操作者**坐在驾驶舱前（未来多物理人、各有各的班）；一切以**会话为中心**。
> 已有地基（不算缺口）：审批闸门 `request_signoff`（attention-e2e 7/7 全回路实证）、问询两条路
> （手册明文 + 五 preset 均挂 `tool-ask-user`）、注意力中心跨会话聚合四类等人状态（cockpit 切片一）。

## 〇、研究输入（两路在途，回来后摘录要点）

- **vendor 机制盘点**（一手，中立体子代理核，文件:行在案）：
  1. **answerer 路由** = Agent 作用域 waterfall，**无收件人字段**（无 recipients/role/session 指定）；
    无超时无默认答案；无人应答 → `NO_PROVIDER` 错误回传（fail-loud 非降级）；子代理禁问（DELEGATED_CALLER
    须在最终结果报告未决问题）。
  2. **approval** = 策略仅 `ask|never` 两档，**无"哪些操作要批"的中央清单**（各 asker 自调）；轮内有效
    （turn-enclosed，无 open turn 即 throw）、一次性 grant、fail-closed；面板字段 = reason/toolName/callId。
  3. **通知面**：**跨会话"谁在等人"聚合面在 vendor 不存在**（remotes 只中继给本会话连接）；team 信箱有
    背压（`maxPendingMessagesPerMember` + 持久 journal + 崩溃重投）⇒ 跨会话注意力中心必须自建（与本仓现状一致）。
  4. **继续语义**：审批/问答 resolve 在**同一 open turn 同一步**（turn-enclosed 即为此设计）；取消 =
    `cancel({kind:'user'}, {keepInbox:true})`，steering 消息 park 进 inbox 下轮再投。
  5. **记录面**：审批有结构化成对审计（`approval/asked`+`decided`）；**user-question 无专用事件**——人的
    答案藏在 tool result JSON 里；team 消息进 Lead journal。
  6. **附件直路** = **部分成立**：composer 上传 → `DSH_HOME/attachments/v1` 只读副本 → 模型收到 handle
    文本（指引其用文件工具读 + **拷进可写位置再改**）；"上传即入共享盘"不存在。
  **总判**：多收件人路由**不成立**（B1 按预案退化：owner 字段如实 + 单人路由 + 记证伪）；附件直路
  **部分成立**（B2 补料可走此路：人上传 → agent 读只读副本 → 拷入共享盘，需明写规矩）。
- **外部实践**（候选来源）：mixed-initiative（Horvitz 期望效用打断）、人审工作流（PR review /
  Temporal Signal / Slack 交互审批）、AI 产品 permission 形态（Copilot / Claude Code / Cursor）、
  on-call 注意力路由（分级/digest/SLA 升级）。〔待填〕

## 一、六问 × 候选集（外部实践 12 模式编号 #1–#12 沿用研究代理报告；每条已按本仓约束判成立性）

### 问 1 · 打断的时机与粒度
- **#1 期望效用打断判据（Horvitz）**：打断前算"行动价值 − 打断成本"。**半成立**——无忙碌度传感面；
  可用粗代理（在场板上人的近期回应延迟）近似，先作**排序原则**不建模型。
- **#2 Bounded Deferral**：非紧急通知延迟到断点、设上限防饿死。**半成立**——会话"轮结束"是现成粗断点；
  审批"轮内有效"天然构成 deferral 上限（vendor turn-enclosed 设计）。
- **#11 Digest/攒批**：**分面成立**——闸门类审批不可被攒批吞时效（轮内有效）；digest 只适用告知类（完成通知）。

### 问 2 · 人在哪里回应
- 已有答案的地基：**驾驶舱注意力中心**（跨会话聚合 + 一键跳会话，§三）。
- **#5 Slack 卡片审批**：通道抄不了（无界面外 seam），**形态可抄**——会话流内结构化选择卡 + hash 防过期
  覆盖校验（人点的是"当时那条"，不是"最新那条"）。
- **#6 GitHub pending 批量队列**：注意力中心聚合多条待批后**一次处理一组**——直接映射，v1 就能用。

### 问 3 · 同步与异步
- **#3 Temporal 阻塞等待+Signal**：**成立**——与现有审批闸门同构；最该抄 = 决策对象结构化
  （approver/decision/comments/timestamp 四字段）+ **超时默认路径显式化**（超时 reject/escalate，不悬空）。
- **#4 三态决策（approve/reject/escalate）**：**成立**——单操作者下 escalate ≠ 换人，而是
  "**稍后重问 / 降粒度重问**"（改时间窗或改问法）。
- **#7 Draft PR 事后审**：**成立且是钥匙**——凡能变成可回滚产出（diff/稿件/清单）的动作都可降级为事后审；
  这就是"**带假设继续**"的安全出口。
- **#8 Claude Code defer 挂起**：vendor 语义已有（问答无人应答=NO_PROVIDER fail-loud；steering park 进
  inbox 下轮投）——"人不在时排队"的现成语义，B3 直接对齐。

### 问 4 · 一条待办给人多少上下文
- **#12 Intent Preview + 明确选项 + 故意摩擦**：**成立**——审批/问询卡的内容判则：
  **谁（角色）/ 什么事（一句）/ 等了多久 / 有限选项 + 各自后果**；字段形状参照 Temporal 四字段
  + vendor 面板已有（reason/toolName/callId）。不给开放文本框当第一界面。

### 问 5 · 归属与放权
- **#9 Warp 档位权限**（Agent Decides / Always ask / Always allow / Never）：**成立**——静态档位形状
  直接对应 `kb/owners.md` 授权面四类（必批/可答/只给建议/自主）；但它是**人手调**，不是自动递进。
- **★ 关键洞察（研究最重要的一条结论）**：**没有任何现成产品做"随时间自动放权"**——现成世界里
  "递进" = **Q5 与 Q6 合流：批准即立法**（Claude Code 的"always allow 这类"→沉淀为规则库→同类不再问）。
  递进不是 agent 自动长权，而是**批准历史变成规矩后同类事项停止询问**。我们环境里的"规则库" =
  手册 / CHARTER / owners.md——A2 的"规矩回流"正是这个闭环的本仓形态。
- **#10 PagerDuty 升级链**：v1 不成立（单操作者无处可升）；多物理人各有班时直接可抄。

### 问 6 · 回看与组织记忆
- **★"批准即立法"闭环**（最值得抄，与 A2 缺口回流同构）：人批过/裁过的 → 回流改手册/CHARTER
  （带取代检查）→ journal 留痕 → 同类不再问。
- **#3 结构化审批对象**：审批已有成对审计（approval/asked+decided）；**问答无专用事件**（答案藏在
  tool result 里）——B4 记录面的缺口正在这里。
- **#6 带评论 bypass**：给 fail-closed 开一条**带审计的"人担责"口子**（显式确认 + 留评论）——
  对应"自主档"的越线形态：人可以说"这次我做主"，但必须留痕。

## 二、两种形态各给结论

- **当前唯一操作者**（v1 可直接用的组合）：**批量待办队列（#6）+ 批准即立法（Q5/Q6 合流）+ 三态决策
  （escalate=稍后重问/降粒度）+ 事后审降级（#7，凡可回滚产出皆非阻塞）**。打断判据用粗代理不建模型；
  攒批只用于告知类。**不适用**：PagerDuty 升级链（无处可升）、界面外推送（无 seam）、防自批（无意义）。
- **未来多物理人**（各有各的班）：PagerDuty 式升级链与值班表**变为可抄**；owner 路由仍受 vendor 单
  agent waterfall 限制（多收件人不成立 ⇒ answerer 侧自建 = 注意力中心模式的扩展，B1 退化预案维持）；
  owners.md 授权面从"单人多角色"逐行拆开（A1 已预留形状）。

## 三、已被驾驶舱四切片满足的（不重复发明；本仓一手证据，主会话自填）

| 六问 | 已满足面 | 证据 |
|---|---|---|
| 问1 部分 | 审批只在**触线时**打断（两条签字线：毛利<30% / 折扣<9折），非触线运营自主 | org.md 签字线 + attention-e2e 7/7（触线→asked→面板→人批 allowed-once→**同轮收口**） |
| 问2 部分 | 人回应的位置 = **驾驶舱注意力中心**（跨会话聚合四类等人状态：待答问询/待批审批/完成通知/升级待处理 + 一键跳会话） | cockpit 切片一（keyless 9/9 + 真模型挂起证据）；切片二补面板 DOM 最后一跳 |
| 问3 部分 | **阻塞型 fail-closed 已定**：审批一次性、轮内有效、无应答者即失败 | request_signoff 实现（ctx.approval 管线）+ 手册 |
| 问5 部分 | **归属已建模**：角色↔物理人 + 授权面四类（必批/可答/只给建议/自主）v1 | kb/owners.md（A1，2026-09-25） |
| 问6 部分 | **记录面已有**：approval/asked + approval/decided 入 session log（回看原料） | replay/snapshot 判据可回放 |

未满足（= 研究要补的，勿在候选集里重复发明现状）：要资料/要建议两类接口**无载体**；规矩缺口
**无回流路径**；非阻塞"带假设继续"**无纪律**；自主权**无递进**；多物理人**无路由**。

## 四、候选落地映射（→ A2 手册规矩 / B 机制层；只映射不实现）

- **A2 审批三档**：必批 = 两条签字线（现状）；**可事后告知 = #7 事后审降级**（凡能变成稿件/diff/清单的
  动作，做了再报告）；自主 = 其余运营决定。三档的"档位形状"参照 #9。
- **A2 缺口回流路径** = **批准即立法**的手册版：规矩不知道 → 按 owners.md 授权面问人 → 人的裁决回流
  （改手册/CHARTER 或登记磨清单，带取代检查）→ journal 留痕 → 同类不再问。
- **A2 不在场分档**：阻塞型（审批/裁决）fail-closed + 写进稿件未决项；非阻塞型（建议/补料/缺口）**带
  显式默认假设继续**（假设写进稿件与未决项，#7 是其安全出口），人不回来**不假装已答复**。
- **A2 上下文剂量**：审批/问询的卡 = 谁/什么事/等了多久/有限选项+后果（#12 + Temporal 四字段）。
- **B1 收件人路由**：vendor 证伪已定（§〇）→ 退化 = owner 字段如实 + 单人路由 + 证伪记录。
- **B2 补料**：附件直路部分成立（§〇）→ 规矩 = 人上传 → agent 读只读副本 → **显式拷入共享盘**再改；
  建议 = 非阻塞输入载体（不授予落稿权）。
- **B3 不在场机制化**：注意力中心条目类别扩展（"带假设走的"标记 + 阻塞挂起可见性）；defer/park 语义
  vendor 已有。
- **B4 证据回看**：审批成对审计已有；**问答/建议补记录面**（专用事件或 result 结构化）+ 面板显示
  "哪条是真人拍的板"。

## 验收自检（RFC 阶段 0 判据）

- [x] 候选集覆盖六问，每条有"解决哪点/代价/DSH 成不成立"（12 外部模式 + vendor 六面 + 本仓地基全数挂问）
- [x] 两种形态各有结论（§二）
- [x] 明确哪些已由驾驶舱四切片满足（§三，含未满足五项清单防重复发明）
- [x] 外部资料登记进 docs/index.md §外部研究材料登记（本 commit 同步；URL 全集存本文末）
- [x] 未改机制、未动 client（研究只产出本文 + index 登记）

## 附 · 外部引用来源（研究代理报告原文转存；Horvitz 两篇 PDF 未逐字核，如实标注）

Temporal Approval（docs.temporal.io/design-patterns/approval + /ai/cookbook/human-in-the-loop-python）；
Claude Code（code.claude.com/docs/en/agent-sdk/user-input + permissions）；Warp（docs.warp.dev/agents/
capabilities/agent-profiles-permissions/）；GitHub deployments（docs.github.com/…/review-deployments）；
PagerDuty escalation（support.pagerduty.com/docs/escalation-policies）；Slack block_actions
（api.slack.com/reference/interaction-payloads/block-actions）；Smashing agentic UX（smashingmagazine.com/
2026/02/designing-agentic-ai-practical-ux-patterns/）；Horvitz Bounded Deferral（erichorvitz.com/
Bounded_Deferral.pdf，PDF 未逐字核）；UBC TR-2011-04 interruptibility 综述；Desai 滑动标尺自主权
（robotics.cs.uml.edu，原文未核）；Copilot 审批排队讨论（github.com/orgs/community/discussions/167493）。
