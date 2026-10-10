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
1. 真会话探针：创建 CEO 会话调 schedule 工具立 60s 提醒 → schedule.json 出现条目 → 到点
   follow-up 是否真回会话（决定性验证；此前卡在 send-message RPC 形状未定位）。
2. follow-up 回原会话时的窗口呈现：用户不在场时是积累还是丢失（"卡是实时事件、刷新即丢"的
   已知边界对 follow-up 是否同样成立）？
3. "查料 → 复算"的 follow-up prompt 模板（查 `sources/` 有料 → 重启动议；无料 → 顺延再立）。
4. 审计判据挂哪：deliverables-check 扫「待补料」↔ schedule.json 交叉核对（行动幻觉 = 违规）？

**下一步：** 真会话探针（未决 1）→ 模板定稿（3）→ 审计判据（4）→ 真盘一单带待补料的动议全链验证。

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
