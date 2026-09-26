# 多人协作 · 同一工作目录，各自开自己的门（现在时）

> 顶层合同：**多个物理人**在同一家公司共享盘上协作的**形态、开门配方、边界与迁移清单**。
> 人侧归属与授权面的事实家 = [`company-workspace/kb/owners.md`](../company-workspace/kb/owners.md)；
> 成员侧的协作规矩 = [`company-workspace/AGENTS.md`](../company-workspace/AGENTS.md)。
> 来源与取舍（含输掉的方案）= [proposed/multi-human-role-routing](../notes/proposed/2026-09-26-multi-human-role-routing.md)。
> **不许复杂化**（用户定的）：不搞 client/server、不搞账号体系、**不在 DSH 里造"人"这一层**。

## 0. 先读这条：机制边界（决定一切怎么摆）

**DSH 是单操作者设计**——没有账号体系；客户端身份 = 每进程一个 launch token + 签名 cookie；
**审批与问询的路由键是 `agent`（会话），不是"人"**。由此推出两条实测结论（2026-09-26）：

| 事实 | 证据 |
|---|---|
| **卡按"发起它的那个 agent 的会话"作用域** ⇒ 只有那个会话的 owner 看得到 | 两门实测：让其中一扇门的 agent 发 `request_signoff`，面板只在"请求所属会话"那扇门显示（A=true / B=false） |
| **被委派的成员（含 team teammate）一律拉不到人**——问询在服务层被拒、审批硬编码 `never` | `scripts/member-inquiry-probe.mjs` 逐字报错：`human interaction is unavailable while the calling agent is owned by another live agent`；`user-questions/src/index.ts:101-106` + `child-agent.ts:254` |

⇒ **一场由 CEO 主持的动议里，所有卡都只落到 CEO 那扇门。** 所以：

- **多人的价值在"盘上的分工"（drafts / journal / final），不在"卡的分发"**；
- 要展示"谁该批的事落到谁的门"，得让**那个人在自己的根会话里**触线；
- 手册那条「成员触线一律升级 CEO」**不是礼貌，是机制强制的**（成员自己发 = 白发）。

## 1. 形态（已定，可逆）

**每角色一个浏览器 profile**（2026-09-26 自裁）：三扇门互不串味、最接近"3 个登录"、零额外结构。
备选"一个浏览器多标签"被否（"人"的边界最模糊，容易顺手替别人签）。
**可逆**：真演示嫌麻烦就退回多标签——机制上路由仍按会话作用域生效，不受影响。

## 2. 开门配方（runbook）

```sh
cd <仓库根> && source dev/env.sh
CI=true pnpm dsh web -- --port 3081 --no-open      # 端口示例；见下方"端口不是仓库事实"
# 启动横幅里会打印带 token 的 URL：http://127.0.0.1:<port>/?token=<token>
```

1. **一个服务**，三个人各自用自己的浏览器（或各自的浏览器 profile）打开**同一个带 token 的 URL**。
2. **每人钉住自己角色的根会话**（Agent Teams 的成员会话在侧栏 Team 名册里点开，或按标题搜索）。
   人甲 → CEO 会话；人乙 → CFO 会话；人丙 → COO/VP 会话。
3. **协作全部走共享盘 + 邮箱**：分身之间用 Agent Teams 消息；人对人用文件
   （`drafts/<角色>.md`、`kb/<角色>/journal/`、`final.md` 归 CEO）+ 说一声"我写完了"。
4. **人该动的时候**：谁的门上出现卡，就由**那个人**答/批。

**端口不是仓库事实**（环境状态，会被别的实例占用——实测 3080/3081/3082 三个都可能是别人的 DSH）：
被占就换一个空闲端口，或直接 `--port 0`（系统分配，端口与 token 从启动横幅读）。
**脚本一律 `--port 0`**；文档里的 3081 只是示例。

**已知边界：卡是实时事件、刷新即丢**——页面加载后**不重建挂起请求**。⇒ 人不在台面前时，
被问的事事后看不到、也答不了；离台期间要的东西必须写进稿件「待人确认」（见公司手册「人机接口」）。

## 3. 协作前提（多人在同一盘上必须先约定）

1. **slug 唯一性**——共享盘上 slug 就是交付物的键。开动议前先看 `deliverables/` 有没有同名；
   重跑要么换 slug，要么先归档旧产物。（实测撞车：两场动议共用 `renewal-y-2026` ⇒ 产物互相覆盖，
   而三态判据**看不出**；现已加观察项 `slug-collision` 每次提醒。）
2. **写入边界**——各自只写 `drafts/<角色>.md` + 自己的 `kb/<角色>/journal/`；`final.md` 只有 CEO 写。
   三态判据盯着"成品有没有 present 背书"，但**盯不住"是谁写的"** ⇒ 靠手册纪律 + 互审。
3. **同盘并发**——多人同时写同一文件**没有锁**（DSH 无多写者协调）⇒ 约定"一个文件同一时刻一个写者"，
   交接靠"我写完了"的消息 + 文件本身。

## 4. 迁移清单（搬共享目录到真实多人环境）

**要搬的**（全是文件，无进程/账号状态）：

| # | 搬什么 | 为什么 |
|---|---|---|
| 1 | `company-workspace/` 整盘——`kb/`（CHARTER + journal + **owners.md** + org.md + motion-ledger.md）、`deliverables/`、`templates/`、`AGENTS.md`（公司手册） | 这是**真正的共享层**；协作全落在它上面 |
| 2 | `packages/company-pack/`（角色 persona/skills + bundle 行 + client 面） | 角色与规矩的来源 |
| 3 | `docs/` + `notes/`（当前合同与开发记忆） | 迁过去的人要能读懂"规矩从哪来" |
| 4 | 环境：DSH 本体（**同一 pin**）+ 各自的 `$DSH_HOME` | home **每台机器自己的**（会话库/凭据是本地的，不共享） |

**不能搬的**：`$DSH_HOME/sessions/`（会话日志是**运行时残留**、含机器专属路径）。
要留证据就按会话 id 归档到 `snapshots/`，别搬会话库。

**迁移后的第一件事**：把 `kb/owners.md` 的 `人甲/人乙/人丙` 换成**真名**（本仓是本地模拟映射）。

## 5. 边界（诚实说清，不假装是安全隔离）

- "谁该签"是**政策级**约束（写在 `owners.md` + 公司手册里，人和 agent 都照它走），**不是安全级**：
  同一台机器上谁都能按那个按钮。demo 阶段够用；真要多租户/安全隔离 ⇒ 另立条目并提上游 seam。
- **不做**：账号体系、权限模型、多服务、identity 扩展、answerer 路由插件（全部留到 MVP 且需上游 seam）。
- **client 侧"身份过滤"增强**（防"看得到但按不动"）= **红线**（要动 client 数据层），本轮**不做**、只留案；
  demo 期靠"人各守自己的门 + owners.md 纪律"成立。

## 6. 验收（本条目的完成定义）

一场**真动议**：至少两个角色各自在**自己的门**里干活，稿件/纪要/合稿沿文件约定交接成功
（`deliverables-check` 0 违规 + journal 各自在场）；迁移清单随本合同交付；`pnpm verify` / `pnpm test` 保持绿。
