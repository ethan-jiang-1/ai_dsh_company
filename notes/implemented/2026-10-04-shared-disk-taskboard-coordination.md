# 2026-10-04 · 共享盘写完整性收敛：动议任务板认领立进手册（小修，无 RFC）

状态：已交付（2026-10-04 用户拍板走 Agent Teams 协调面并点名推进；**小修不设 RFC**——章程毕业四门
明文「小修可不设 RFC，由用户点名直接做」；推敲全程 = [cross-process-shared-disk 卡](../../_backlog/_archive/settled_issues/2026-10-04-cross-process-shared-disk.md)）

## 问题

E2 实测（2026-10-03，双进程 fs-local）：同版本守卫写 ×20 = 20/20 **静默互踩**——守卫管新鲜度
不管独占，跨进程没人排队。推敲卡经三步收敛（dsh-atomic-write 形状复核 → Agent Teams 盘点 →
用户拍板），结论：重型锁基建对本仓部署形态（本地盘、单机、单操作者模式为主）过度工程，
选定方案 = **部署约定 + 现有三层，零新代码**。

## 采用方案（本 Note 落的 = 手册一行）

**部署约定**：写共享盘的 DSH 进程收敛为一个（单操作者模式：CEO 一进程装下公司，真人走 web
观察窗）——跨进程互踩的前提被约定移除。其下三层各管一段：

- **机制面（防）**：fs-local 实例内 per-target 锁 + 版本守卫（E1 实证：一胜一 `FS_STALE_VERSION` 拒，
  被拒方重读重写）；
- **协调面（看得见，Agent Teams）**：动议交付物落任务板——一稿一任务带 `writeScopes`、成员先认领
  （ownerId）后动笔、重叠弹 `writeScopeWarnings` 由 CEO 就近协调、完成任务 + 邮箱回执；真人经 web
  团队面板全员可见；
- **审计面（可查）**：占位=认领 / 派活行 / 稿首署名行（`authorship-audit`）。

手册落点 = 「协作规矩」节新增**「动议任务板」行**（含部署约定），紧跟「写盘守卫」行（同主题
延长线）。多人模式（多扇门）下 Agent Teams 跨 home 不可达——协调面用它的文件化投影（派活行 /
占位=认领 / 署名行），手册既有条目已覆盖，本行不重复。

## 输掉的方案（留尸——防复犯指针）

- **重型锁基建**（fs-seam 包装后端：子类化 LocalFileSystem、守卫突变路径包 `withFileLock`，
  新包 + 测试驱动）：技术可行（fs seam 明文支持 alternate backends；vendor 自带
  [fs-sandbox](../../vendor/dsh/packages/fs/fs-sandbox/README.md) = `extends LocalFileSystem` 的
  wrapper 先例），但对本地盘单机部署过度——**用户裁决搁置**；复活条件 = 多实例常态写同盘成为
  真实工作形态。
- **把 Agent Teams 任务所有权/writeScopes 当锁**：上游裁决否决（「假互斥比明示警告更危险」；
  README 三处声明 process-local、无文件锁）——它的正确用法是协调面，不是互斥面。
- **redis/TTL 锁家族**：上游两连否，见 [writing-collab-locks-redis 卡事实 8](../../_backlog/_archive/settled_issues/2026-09-29-writing-collab-locks-redis.md)。
- **dsh-atomic-write 脚本侧采纳**：形状已复核属实（`withFileLock` 跨进程写锁，同机可用），但当前
  无常驻脚本写者——指针住 [multi-human.md §4](../../docs/multi-human.md)，需求出现再采纳。

## 后果 / 验证

- 手册「动议任务板」行已落；`pnpm verify` 绿（backlog-liveness / md-links / proposal 门禁）。
- **零代码变更** ⇒ 无回归面；`pnpm test` 不适用（未跑）。
- **待真实验证 → 已判收（2026-10-04 probe 首跑 5/5）**：[taskboard-presence-probe](../../probes/fs-taskboard/taskboard-presence-probe.mjs)
  真会话实证 P1a/P1b（认领两态：两任务各有 ownerId 非空快照 + 视图回报含 ownerName；in_progress+owner
  每任务 ≥1）与 P3（`writeScopeWarnings` 真重叠在场——另叠加 [batch2](./2026-10-04-multi-user-bdd-batch2.md)
  C5a 首跑逐字证据）；资产 =
  [snapshots/taskboard-presence-probe/2026-10-04](../../snapshots/probes/taskboard-presence-probe/2026-10-04/probe-stdout.md)。

## 依据

- 推敲全过程与形状复核证据：[cross-process-shared-disk 卡](../../_backlog/_archive/settled_issues/2026-10-04-cross-process-shared-disk.md)
- E1 守卫实证 + E2 互踩实证：[collab-mechanism-evidence 卡](../../_backlog/_archive/settled_issues/2026-09-29-collab-mechanism-evidence.md)
- Agent Teams 能力与边界（process-local / advisory writeScopes / 无文件锁）：vendor 树
  `packages/experimental/agent-team/README.md`（pin dsh-v0.2.0-rc.2）
