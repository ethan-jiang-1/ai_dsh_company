# 多人协作 · 同一工作目录，各自开自己的门（现在时）

> 什么时候读：多个物理人要进同一家公司盘协作、或协作行为不符预期时。路线 = 形态表 → 边界/验收；开门 runbook = [guides/multi-human-runbook.md](../guides/multi-human-runbook.md)。
> 合同：**多个物理人**在同一家公司共享盘上协作的**形态、边界与验收**；开门/交接/前提/迁移 = [guides/multi-human-runbook.md](../guides/multi-human-runbook.md)。
> 人侧归属与授权面的事实家 = [`kb/owners.md`（dev bundle workspace；pack 单源）](../../packages/company-pack/content/state/owners.md)；
> 成员侧的协作规矩 = [`AGENTS.md`（pack 单源）](../../packages/company-pack/content/AGENTS.md)。
> 来源与取舍（含输掉的方案）= [multi-human-role-routing（已归档）](../../notes/archived/2026-09-26-multi-human-role-routing.md)。
> **不许复杂化**（用户定的）：不搞 client/server、不搞账号体系、**不在 DSH 里造"人"这一层**。

## 0. 先读这条：机制边界（决定一切怎么摆）

**DSH 是单操作者设计**——没有账号体系；客户端身份 = 每进程一个 launch token + 签名 cookie；
**审批与问询的路由键是 `agent`（会话），不是"人"**。由此推出两条实测结论（2026-09-26）：

| 事实 | 证据 |
|---|---|
| **卡按"发起它的那个 agent 的会话"作用域** ⇒ 只有那个会话的 owner 看得到 | 两门实测：让其中一扇门的 agent 发 `request_signoff`，面板只在"请求所属会话"那扇门显示（A=true / B=false） |
| **被委派的成员（含 team teammate）一律拉不到人**——问询在服务层被拒、审批硬编码 `never` | `probes/team/member-inquiry-probe.mjs` 逐字报错：`human interaction is unavailable while the calling agent is owned by another live agent`；`packages/interaction/user-questions/src/index.ts`（:140 附近）+ `child-agent.ts:254` |
| **任务板 per-team**：每根会话一个 team（`TeamId(root.id)`）⇒ `team_task_*` 工具看到的板**互不可见**——两门各自创建的任务对方看不到 | S5 实测（2026-10-06 `taskboard-scope-probe`）：CFO 门 `team_task_create` renewal-z + `team_task_list` 确认可见；COO 门 `team_task_list` 返回空数组——跨门 CAS 仲裁不可用，协调只能靠文件层约定（占位/让位 + 派活行，BUG-004 的面） |
| **日志只读半旁路**：根会话能通过 `session_event_read`/`session_event_search` 读到别门根会话的事件（含审批请求的存在与等待状态），但**看不到人面面板、也调不了批准服务**——可见性半旁路、处理通道为零 | BUG-005 现场实测（2026-10-06 `dual-signoff-probe`）：CEO 根会话逐 seq 查到 CFO 门的 pending 请求 + "Not accessible to me" + "I can't call services" |

⇒ **一场由 CEO 主持的动议里，所有卡都只落到 CEO 那扇门。** 所以：

- **多人的价值在"盘上的分工"（drafts / journal / final），不在"卡的分发"**；
- 要展示"谁该批的事落到谁的门"，得让**那个人在自己的根会话里**触线；
- 手册那条「成员触线一律升级 CEO」**不是礼貌，是机制强制的**（成员自己发 = 白发）。

### ⚠ 但**每扇门都不是成员**——这条最容易搞反

「被委派的成员拉不到人」**不等于**"角色自己拉不到人"。两者的分水岭是 **`parent`（运行时归属）**：

| 谁 | 是不是 root | 能不能拉人 | 该怎么做 |
|---|---|---|---|
| CEO 动议里 spawn 出来的 teammate / 委派 child | ✗（有 `parent`） | ✗ 必被拒 | **升级给 CEO**（手册那条走法） |
| **每人自己开的那扇门**（该角色的**根会话**，他本人就是 owner） | ✓ | ✓ 能 | **自己发起** `request_signoff` / `ask_user_question`——**卡才会落到他自己的门上** |

**所以多人模式下的正确动作是反过来的**：門乙（CFO 的根会话）撞签字线时**由它自己发起**，
**不要**"升级给 CEO"（那会把卡送到甲的门上，恰好演示反了）。
实测依据：`probes/session-context/budget-signoff-probe.mjs` 的正例——CFO 根会话确实会发 `request_signoff`。

（手册「问人两条路」与「审批三档」均已含这条根会话 vs 被委派成员的区分——见两节的 ⚠ 段；
[RFC](../../notes/archived/2026-09-26-multi-human-role-routing.md) 进度表 f 行随之闭合。）

## 1. 形态（已定，可逆）

**每角色一个浏览器 profile**（2026-09-26 自裁）：三扇门互不串味、最接近"3 个登录"、零额外结构。
备选"一个浏览器多标签"被否（"人"的边界最模糊，容易顺手替别人签）。
**可逆**：真演示嫌麻烦就退回多标签——机制上路由仍按会话作用域生效，不受影响。

## 开门与交接

> 开门配方、交接协议、协作前提、迁移清单已迁 [guides/multi-human-runbook.md](../guides/multi-human-runbook.md)；本文件只留机制、形态、边界与验收。

## 6. 边界（诚实说清，不假装是安全隔离）

- **"门"不是"人"**（2026-09-26 复核补）：门 = **承载一个会话上下文、模型工作与实时人机交互的位置**；
  它**不是**身份边界、权限边界，也不是话题本身。"看不到别人的门"≠"没有权限进"，
  "卡在哪扇门"≠"谁拥有授权"（授权唯一看 `owners.md`）。侧栏分组走 **workspace 实体**（`fs.realpath` 归一），
  所以**同一个真盘 = 同一个分组**，用路径别名**造不出**按人隔离。
- "谁该签"是**政策级**约束（写在 `owners.md` + 公司手册里，人和 agent 都照它走），**不是安全级**：
  同一台机器上谁都能按那个按钮。demo 阶段够用；真要多租户/安全隔离 ⇒ 另立条目并提上游 seam。
- **不做**：账号体系、权限模型、多服务、identity 扩展、answerer 路由插件（全部留到 MVP 且需上游 seam）。
- **client 侧"身份过滤"增强**（防"看得到但按不动"）= **红线**（要动 client 数据层），本轮**不做**、只留案；
  demo 期靠"人各守自己的门 + owners.md 纪律"成立。

## 7. 验收（本条目的完成定义）

一场**真动议**：至少两个角色各自在**自己的门**里干活，稿件/纪要/合稿沿文件约定交接成功
（`deliverables-check` 0 违规 + journal 各自在场）；迁移清单随本合同交付；`pnpm verify` / `pnpm test` 保持绿。
**已完成（2026-10-04）**：firstdeal-v-2026 三扇门真盘动议——双签两半各落各门均人应答、
根会话归属 ✓×3（cfo/coo/ceo 各自会话写各自稿）、0 spawn、check 违规 0、journal 三在场。
快照已随真实部署证据移私有归档（2026-10-25）。
