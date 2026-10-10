---
status: 推敲中
opened: 2026-10-10
---

# 推敲：主动唤醒闭环——公司到点自己醒，用户不当闹钟

> 立卡：2026-10-10 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否

**问题与期望结果：** 卡兹克案（ai-transformation-2026，2026-10-10）三连教训：①会话收口即停机，
补料 11:06 落盘无人知；②CEO 说"已立 6 小时跟进提醒"但 schedule.json 为空（**行动幻觉**）；
③复推动靠用户 11:30 在窗口踢了一脚（11:37-11:41 第二轮，final v2 收口）。期望的用户体验：
**信息源头一变动，公司主动复议**——收口带待补料 ⇒ 自动立 schedule ⇒ 到点 follow-up 回原会话 ⇒
查 `sources/` ⇒ 有料自动复算；用户全程零踢。技术只是实现，主语是"人驾驭公司的体验"。

**当前情况：** DSH 深支撑已核实（`vendor/dsh/docs/subsystems/schedule.md`）：schedule 存储
**独立于 Session 激活**、六种节律（at/after/every/daily/weekly/cron，title 必填 ≤120 字符）、
**到点把 follow-up 送回原会话**、ui-schedule = 任务页 + 会话提醒目录——"主动唤醒"是出厂
一等能力，不是要发明的东西。`registerScheduleTools`（模型面建删改查）随 schedule 服务注册，
schedule-bundle 已在本 profile 挂载。已落：手册闸门④（复算触发 = 真 schedule 任务，
schedule.json 可审计）+ playbook 第 8 步。**未验证：schedule 工具在公司会话里的真实在场性**
（从未驱动真会话调用过；头部证据 = 源码 + 服务挂载）。

**未决问题：**
1. ~~真会话探针~~ **已解决（2026-10-10 12:40 实测）**：`runtime/probe-schedule.mjs`（一次性探针，gitignored）——
   真 CEO 会话经 `session/prompt`（`{ requestId, sessionId, mode:'queue', content:[{type:'text',text}] }`）让模型
   用 schedule 工具立 `after 60s` 提醒 → **schedule.json 出现 probe-wake 任务（绑原 sessionId）** →
   到点 **follow-up 已送达原会话**（lastDelivery 现态）。主动唤醒闭环端到端全通 ⇒ 早上的空头支票
   纯属"说了没做"（工具一直在场），闸门④审计即为全部解药。
2. follow-up 回原会话时的窗口呈现 —— **已裁定（2026-10-10 用户拍板）：执行类照跑，决策类排队**。
   执行类 = 报告 / 查料 / 读档类 follow-up 到点自动跑；决策类 = 花钱、对外承诺、砍项、签字类
   进待办面板等人——与待办四格哲学一致。模板（未决 3）按此分类写。
3. ~~follow-up 模板~~ **已落**（playbook 第 8 步 + 手册闸门④：title 锚 `待补料·<slug>·<T号>` + 两型分写）。
4. ~~审计判据~~ **已落**（deliverables-check：待补料派活行 ↔ schedule.json 交叉核对，缺锚 =
   `pending-material-without-schedule` 违规；单测红绿 + 真检查无待补料时静默）。
5. **排练场全链演练 receipt 与新发现**（`runtime/probe-drill.mjs`，2026-10-10）：演练走到 bash
   探针时 **bash 首用触发权限升级卡**（`approval/asked`：sandbox-exec 在本机不可用 ⇒ bash-sandbox
   executor 无法沙箱化 ⇒ 请求 danger-full-access，fail-closed 等人）——**HITL 跳出正确发生**
   （模型 todo 计划 → 探针 → 卡壳即弹出 → 静默等待，完全按章办事）；演练 PARTIAL 是因为
   无人点卡 + 脚本 6 分钟窗口后杀服务器。⇒ **新张力**："零踢全自动"撞上 bash 权限面——
   要么公司会话 bash 审批设 never（全自动达成，安全代价登记），要么保持 ask（唤醒后首用
   bash 弹一次卡，点一次即畅）。**待人拍板**。

**下一步：** 拍板未决 5（bash 权限面三选一）→ 按拍板收口本卡（机制面已全部就绪）。

## 范围与排除项

单操作者模式优先（CEO 代表公司立任务）；不做常驻 watcher 进程（不发明——用出厂载体）；
不接 `*_PROXY` 代理（另案，见 fact-finding-ladder Note 后果节）；不写自由文本 memory
（空头支票病灶，裁定见同日 [fact-finding-ladder Note](../../notes/implemented/2026-10-10-fact-finding-ladder.md)）。

## 方案与取舍

- **schedule 服务（选定）**：出厂 durable、六种节律、回原会话、可审计（storages/schedule.json）、
  有 UI 目录页——零发明。
- 备选「pack 自建 watcher」：否——发明调度器，违反不发明纪律。
- 备选「自由文本 memory」：否——写了"已立"却无可执行载体背书，正是本轮事故病灶。
- 生态参考：vendor 自身 standard preset + schedule = "个人助理主动提醒"形态；本仓的创新位 =
  **组织级**——CEO 代表公司立任务，follow-up 回 CEO 会话再分派（下任务给分身）。

## 关闭条件

真盘一单全链跑通：收口带待补料 → schedule.json 出现对应任务 → 到点 follow-up 回会话 →
自动复算完成 → 用户零踢。跑通即关；跑不通按缺口拆卡。
