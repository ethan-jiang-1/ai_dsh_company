# 2026-10-04 · 多用户 BDD 加工·第一批：H3 求救回路 + C1/C2 并发固化（probe ×2 首跑全绿）

状态：implemented（第一批交付，2026-10-04）。批准 = 用户令「_backlog/plans 这里的东西应该你评估，
评估之后开始加工……告诉我加工的次序」（同日对话）。

## 评估与加工次序（用户授权我定）

三张活跃卡四门评估：**H 系卡 = 该做**（H3 主回路零资产）；**C 系卡 = 该做**（C1 已观察只差固化）；
**deferred-verifications = 等待卡不动**（seam 阻塞等触发）。加工次序：

1. **第一批（本 Note，已交付）**：H3 成员求救回路 probe + C1/C2 并发固化 probe——两者共享
   "真实 team + lead 日志判据" 基建，且分别是用户 #2/#1 担忧的核心缺口。
2. **第二批**：H7 分歧呈现 probe（手册「不抹平」的行为面）+ C4/C5（原子发布读侧、writeScopes
   advisory）——依赖第一批基建。
3. **第三批**：C6（interrupt 竞态）/C7（cold-resume 邮箱恢复）——prompt 最难驱动，可能需要更
   确定的驱动器。
4. **挂起**：C8（跨进程——等产品决策 `dsh-atomic-write`；**推敲卡已立** =
   [_backlog/plans/2026-10-04-cross-process-shared-disk](../../_backlog/plans/2026-10-04-cross-process-shared-disk.md)）、
   H6（注意力中心是否报成员动态——设计裁决）、H8（多人开门常态化触发）。

## 交付

- **`scripts/member-rescue-probe.mjs`（H3）**：成员 res 先试 `ask_user_question` → 被拒 →
  `send_message` 求助 lead → lead `ask_user_question` 拉人 → 注意力中心「待答问询」→ 人答 →
  lead 转达 → res 续行回执 → lead 收口。**首跑 6/6**（J1–J6 全绿；注意力条目自带升级语义
  「子会话人机问询不可用，需由你裁决」）。截图 =
  `snapshots/attention-e2e/2026-10-04-rescue/`。
- **`scripts/team-concurrency-probe.mjs`（C1+C2）**：lead 建任务后**连续** spawn w1/w2，
  两成员并发认领同一任务（CAS）+ 并发写同一文件。**首跑 4/4**（文件终态两行俱全、
  冲突/重试/次序证据在成员回报与 lead 转述中可见）。
- 判据全部从 lead 日志 + 文件终态取（verify the world；成员被指令如实回报含错误原文），
  不依赖成员会话访问——probe 可重复、可进认证档排程。

## 与既有资产的接续

- 走查实录（两轮观察 + 能力面清单）随卡毕业迁 `_backlog/_done/_reference/2026-10-04-multi-user-ux-walk.md`
  ——C1 的单次观察至此升格为可重复判据。
- 两张推敲卡毕业迁 `_done/_closed_plans/`（状态行补去向）；后续批次（上表 2/3/挂起）由本 Note 接续跟踪。
- [multi-user-concurrency-lane Note](./2026-10-04-multi-user-concurrency-lane.md) 的 S1–S6 =
  粗粒度跟踪；本 Note 的 C/H 系 = 细粒度展开（S4 双门与 H2 同物；S5/S6 与 H8/C8 交叠处以后到者为准）。
- redis 判定树与 [writing-collab-locks-redis 毕业卡](../../_backlog/_done/_closed_plans/2026-09-29-writing-collab-locks-redis.md)
  同宗（R0 四条原生协作已落地）：单进程内建够 → 跨进程规矩层 → dsh-atomic-write → redis 最后手段。

## 输掉的方案

- **两 probe 合一脚本**：求救回路（H）与并发语义（C）触发条件不同、判据面不同——合一只省
  boot 成本，牺牲独立排程与判据清晰；各留一个脚本（宪法 §1.1 名词各自成立）。
- **判据走成员会话日志**：需要 session/list 反查成员 id、且把判据面扩到不可控侧；成员被指令
  "如实回报含错误原文" 后，lead 日志即完整证据面（walk-1/walk-2 已验证此通路）。
- **keyless 钉 C5（writeScopes 视图折叠）**：钉的是 vendor 视图语义——升 pin 时 vendor 自有
  test 已复验；本仓 probe 只观察行为面（并入第二批）。

## 验证（实际跑过的）

- `member-rescue-probe` 首跑 exit 0，6/6（J1–J6）；`team-concurrency-probe` 首跑 exit 0，4/4。
- `pnpm verify` ALL PASS（script-triggers ×28 罩住两个新 probe）；`pnpm test` 30 文件 283 用例全绿。
- 预算：两跑合计 ≈$3–5（帽 $8），各一次过。
