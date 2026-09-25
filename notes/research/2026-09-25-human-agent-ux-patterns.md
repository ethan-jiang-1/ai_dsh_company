# 2026-09-25 · 人机合一 · 阶段 0：人机交互模式候选集（UX 判据）

状态：进行中（两路研究在途：vendor 机制盘点 + 外部实践；本笔记为候选集骨架——填满即成阶段 0 交付物）

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

## 一、六问 × 候选集（每条候选：解决哪几问 / 代价 / DSH 约束下成不成立）

### 问 1 · 打断的时机与粒度
〔待填〕

### 问 2 · 人在哪里回应（驾驶舱页签 / 会话内 inline / 界面外）
〔待填〕

### 问 3 · 同步与异步（排队 / 超时 / 默认动作 / 带假设继续）
〔待填〕

### 问 4 · 一条待办给人多少上下文
〔待填〕

### 问 5 · 归属与放权（owner 路由 / 自主权随时间递进）
〔待填〕

### 问 6 · 回看与组织记忆（人批的怎么变规矩）
〔待填〕

## 二、两种形态各给结论

- **当前唯一操作者**：〔待填〕
- **未来多物理人**：〔待填〕

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

〔待填〕

## 验收自检（RFC 阶段 0 判据）

- [ ] 候选集覆盖六问，每条有"解决哪点/代价/DSH 成不成立"
- [ ] 两种形态各有结论
- [ ] 明确哪些已由驾驶舱四切片满足
- [ ] 外部资料登记进 docs/index.md §外部研究材料登记
- [ ] 未改机制、未动 client
