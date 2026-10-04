# 2026-10-04 · 任务板/在场板真盘判收：taskboard-presence-probe 首跑 5/5

状态：已交付（2026-10-04 用户令「去推进…最好是测试驱动…测试完资产到最后汇报」；**判据先行**——
头注 P1a/P1b/P2a/P2b/P3 写死后真跑；probe =
[taskboard-presence-probe.mjs](../../scripts/taskboard-presence-probe.mjs)）

## 交付

- **`scripts/taskboard-presence-probe.mjs`（常驻）**：真会话驱动 CEO 落两任务（`writeScopes` 故意
  重叠）→ spawn w1/w2 各自认领→置 in_progress→回报→完成，判据取 lead 日志 `team/*` 事件与成员
  回报——web 面板读 `agentTeam` 投影的**原料链**（渲染半边 keyless 已钉，不重复建浏览器面）。
- **判收回填**：[shared-disk-taskboard-coordination](./2026-10-04-shared-disk-taskboard-coordination.md)
  与 [presence-board-progress-surface](./2026-10-04-presence-board-progress-surface.md) 两 Note 的
  「待真实验证」全部闭环（各自 Note 内已回填证据指针）。

## 验证（实际跑过的）

- **首跑 5/5 ALL PASS**（≈8min；排练场 cwd，**零共享盘写入**——全程只动任务板与消息）：
  - P1a 认领可读（A/B ownerId 快照各 2 + ownerName 在 lead 视图回报）；
  - P1b 加工中可读（A/B 各 1 条 `in_progress`+owner 快照）；
  - P2a 在场板原料（名册 w1/w2；in_progress 快照 subject↔owner 经名册 id→name 映射对上 2/2）；
  - P2b 成员回报链 7 条；
  - P3 `write scopes overlap` 警告在场（C5a 同场复核）。
- 资产 = [snapshots/taskboard-presence-probe/2026-10-04/](../../snapshots/taskboard-presence-probe/2026-10-04/probe-stdout.md)
  （probe-stdout.md + probe-run.log 控制台全文）；session = `session-56aa981a`（dev home 排练会话，
  运行残留不迁移）。
- `pnpm verify` 绿（script-triggers/script-status 门禁含新脚本头注自述）。

## 输掉的方案

- **CDP 截图断言 web 面板渲染**：渲染半边已有 keyless 钉（presence-board.spec 16/16；v3 公司视图
  读模型 keyless 单测含 board/presence），真盘增量在**原料链**不在渲染——不重复建浏览器自动化面。
- **复用 team-atomicity-probe 扩判据**：一 probe 一关注点（C4/C5 已固化各自可复跑），认领两态/
  在场原料另立新 probe，判据互不牵连。

## 依据

- 两张被判收 Note：shared-disk-taskboard-coordination / presence-board-progress-surface
- 机制语义（写判据前已读）：vendor `packages/experimental/agent-team`——警告=任务间 scope 比對、
  ownerId=成员 id、ownerName=视图派生（batch2「写判据前先读机制」教训沿用）
