# 推敲：写作协作的锁与感知——文件系统现状盘点、Redis 评估与原生替代阶梯

> 状态：已毕业（2026-10-03，R0 四条落地）｜批准：用户 2026-10-03 点头 R0 四条清单（对话在案）｜去向 = [notes/archived/2026-10-03-redis-r0-native-collab.md](../../../notes/archived/2026-10-03-redis-r0-native-collab.md)（四条落地证据 + R1/R2/R3 触发条件的归属家）｜原毕业门判断 = 先满载原生 + 门禁补强，Redis 不进默认形态、只留带触发条件的实验位——R0 已落地，R2 待触发随 Note

## 背景 / 触发

用户原话（2026-09-29）："因为这里头是写作，光靠文件系统做协作太困难了，所以我在思考是不是要用
Redis 来做，至少这里头有锁的概念，同时 redis 里是不是有好的机制来帮助我们更好地做写作？"

即两问：① 多角色（多人模式下 = 多个根会话）在同一共享盘上写稿，要不要引入 Redis 获得真正的锁；
② Redis 还有哪些机制（除锁之外）对"写作协作"有用。本卡把两问放到一张卡里答，因为答案共享同一份
机制事实盘点。姊妹卡：[deliverables-lifecycle-metadata](./2026-09-29-deliverables-lifecycle-metadata.md)
（静态布局：日期/metadata/状态归宿）——**接缝**：那张卡的 meta/台账聚合问题与本卡的"审计与事件流"
是同一块地（谁记录谁做了什么），两张卡不要各自发明一套。

## 已知与未决

### 写作协作的痛点盘点（每条带盘上/源码证据，先确认真痛点再选药）

| # | 痛点 | 证据 |
|---|---|---|
| P1 | **同文件并发写**：跨进程/跨 home/外部编辑器没有共享租约——"一个文件同一时刻一个写者"只是流程政策，不是机制保证 | [multi-human.md §4](../../../docs/multi-human.md) |
| P2 | **撞 slug / 撞稿**：两场动议共用 `renewal-y-2026`，产物互相覆盖、两场混装，三态判据看不出 | [memory-convergence-2026-09-26 §边界 1](../../../snapshots/archive/memory-convergence-2026-09-26/README.md)；已有观察项 `slug-collision`（纯逻辑，带回归） |
| P3 | **版本一致性**：quote-z-2026 双签 allowed-once 但**只对 cfo v2 生效**，盘面已 v3，final 只能记"版号待对齐"；署名行版号是手写的 | 台账 `quote-z-2026` 行结论；`scripts/authorship-audit.mjs` 头注 |
| P4 | **感知/通知**：根会话之间**没有消息通道**（Agent Teams 按队伍作用域，不同根会话是不同队）；"我写完了"靠人开口说；实时卡刷新即丢 | [multi-human.md §0+§3](../../../docs/multi-human.md)（§0 证卡按会话作用域，§3 证非团队会话互不通信）；手册「待办」节"刷新即丢" |
| P5 | **审计与日期**：谁在何时写了什么，唯一权威 = `$DSH_HOME` 会话日志（zstd 多帧），**按 home 分桶**（跨 home 审计要每家跑一遍）、~~快照里没有日志（导出缺口）~~ **导出缺口已闭合（2026-09-30 E3：`session-log-export.mjs` + 09-26 快照 4 场审计 0 违规）**，日期要靠它回填 | [journal-date-mechanism](../../../notes/archived/2026-09-26-journal-date-mechanism.md)；memory-convergence README"登记一条缺口"；**E3 收据 = 研究卡 E3 结论** |
| P6 | **派活状态回写滞后**：任务书状态行不回写，扫盘把过期待办报成活 | 公司手册「机器可读派活行」节（实验实证） |

### 关键机制事实（vendor 只读核实 + 本仓实证，2026-09-29 复核）

**先说结论性的事实：今天的多人形态下，"锁"的大部分已经存在，只是长得不像锁。**

1. **`fs-observation-policy` 大概率已激活**（base bundle 第 278–279 行 insert 该插件——0.1.7 时代引
   277 行，0.2.0-rc.2 实测 278–279，
   web-app 与本仓 pack 均未禁用——[vendor/dsh/packages/bundle/base/cordis.patch.yml](../../../vendor/dsh/packages/bundle/base/cordis.patch.yml)）。
   它给每个会话的 fs 工具装上：**读后才能覆写**（没读过就 write/edit 会被拒，fail-loud 带指引）、
   **读过之后文件变了再写 = `FS_STALE_VERSION` 拒绝**（"一胜一 stale"有官方测试）、
   **写不存在的路径 = 带守卫的创建**（并发创建只有第一个成功）——最后这条就是**原生的
   "先到先得抢注"原语**（README = [vendor/dsh/packages/fs/fs-observation-policy/README.md](../../../vendor/dsh/packages/fs/fs-observation-policy/README.md)）。
   ⚠ 注意它**按会话**观察且不跨进程持久（resume 后要重读）——**E1 已实测（2026-10-03，全绿）**：守卫在
   角色会话真实生效（盲写被机械拒、stale 拒 4/4）；**新机制事实：守卫管新鲜度不管独占**——并发同文件
   败者天然先读后合法重写 = 后写者静默胜出，机械拒只在败者恰好盲写时出现（收据 = 研究卡 E1 结论）
   ⇒ R0-2 的「占位=认领」主张语义是必需品。
2. **fs 后端实例内 per-target 排队锁**：同一 DSH 进程内所有会话共享（`fs-local` 的 `withLock`）。
   **而现行多人 runbook = 一个 `dsh web` 服务进程 + 三扇浏览器门**（[multi-human.md §2](../../../docs/multi-human.md)）
   ⇒ **今天的三门并发全在这一个进程里，锁和版本守卫都罩得住**。真正的裸区是：两个服务进程共用一张盘
   （双 home 开发态、未来的多机形态）和外部编辑器。
   **E2 实测（2026-09-30，真 fs-local × 2 进程）**：裸区比想象的更秃——跨进程**同版本守卫写**
   （两进程同时持有同版本 `replaceIfVersion` 同时放行）×20 轮 **20/20 双双成功互踩**（进程内同场景
   = 1 胜 + 1 stale）；无守卫路径双双成功、目录零互斥工件。⇒ 跨进程差价从"推断真实"变"实测系统性"
   ——守卫的检查与发布之间**没有跨进程原子性**，"跨进程差价"这一栏的标的物坐实。
   **措辞精度（盲审 C5）**：20/20 是"GO 屏障同步双发 + 同版本"的**强制紧循环**——实测命题是
   "同时持同版本同时放行必互踩"，**不是**"真实写节奏必然互踩"（秒级读写间隔的命中率未测）；
   设计结论不受影响：守卫不能当跨进程互斥**依赖**。更硬的直引补上（盲审 A12）：
   [fs-local README](../../../vendor/dsh/packages/fs/fs-local/README.md) 原文
   "The per-target mutation lock is in-process only … never serialized"——机制直证，先于编排取证。
3. **Agent Teams 是现成的协调面**（本仓 pack 直插）：任务板带 `expectedRevision` CAS（过时修订被拒）、
   `ownerId`、`writeScopes`（**advisory**——重叠只告警不阻断）；邮箱持久投递（带署名、去重、离线补投）；
   `wait_agent` 能**阻塞等边**（名册/邮箱/任务/存活变化），替代轮询。
4. **vendor 对"把 X 当锁"已有裁决**（[agent-teams Note · Alternatives](../../../vendor/dsh/.agents/notes/implemented/feature/2026-08-05-agent-teams.md)）：
   "Treat task ownership or write scopes as locks. Rejected because **external writers bypass them**,
   crashed owners remain durable, and path-prefix overlap cannot prove semantic independence.
   **False mutual exclusion is more dangerous than an explicit warning.**"
   ——这条论证对 Redis 锁**同样成立**（外部写者照样绕过；崩溃 owner 要 TTL，TTL 到期写一半要 fencing token）。
   我们引 Redis 进来并不会让这条消失，只是把"绕过面"从 DSH 会话换成"没装 Redis 客户端的写者"。
5. **跨机形态的事实**：Agent Teams 消息跨 home 无寻址路径，多机协作**只剩共享盘**
   （[multi-human.md §5](../../../docs/multi-human.md)）⇒ 即使多机，协调面也只有文件 + git——
   除非再引网络服务（用户已裁决"不搞 client/server"，multi-human.md 篇首）。
6. **官方已有跨进程文件写锁件（2026-09-29 新核实）**：[`dsh-atomic-write`](../../../vendor/dsh/packages/util/atomic-write/README.md)
   （util 库，零依赖、非插件）——`wx` 创建 `<file>.lock` 兄弟文件**串行化跨进程读-改-写循环**；
   持有者进程不存在即接管（**liveness 接管，非 TTL 续租**——无续租流量、不依赖时钟）；
   rename 原子提交、读者无锁。边界：无 fsync（不承诺崩溃持久性）、只收字符串。
   ⇒ E2 那个"跨进程互踩"缺口，**官方在库层面已给答案**（R1 据此改写，见下）。
7. **官方共享状态/变更事件 seam（2026-09-29 新核实；盲审 A4 补边界）**：[`dsh-storage-domain`](../../../vendor/dsh/packages/storage/storage-domain/README.md)
   ——schema 校验 KV 域（**SQLite/JSON** 后端），同步读 + **持久有序写** + `domain/changed` 事件，
   host 侧对模型不可见。⇒ 若 pack 侧将来要"动议事件域"（谁在何时做了什么的结构化记录），
   **原生载体就在这**，不引 daemon。⚠ 边界（README Known Limitations）：`domain/changed` 是**进程内**
   事件——第二进程/重连的 GUI 观察不到变更（跨进程 revision 模式上游未落地），且对模型与客户端
   零暴露 ⇒ "喂驾驶舱"须自建 client 渲染面；本卡自己认定的多机形态下这条 seam 罩不住。
8. **上游对"跨进程互斥"的两次裁决（TTL 家族两连否）**：
   [SessionWriteLease Note](../../../vendor/dsh/.agents/notes/implemented/feature/2026-08-31-cross-process-session-write-lease.md)
   ——会话日志的跨进程写锁**先实现了 TTL 记录式（owner token + 过期 + 续租 + rename 接管），评审中推翻**，
   原话："a distributed algorithm in miniature: renewal timers, loss detection, takeover claiming …
   its residual multi-actor races still allowed bounded dual-writer overlap"，换成了**内核 flock**
   （崩溃自动释放、零记账；wedged holder 阻塞到进程退出是明选的语义；NFSv3 上 advisory flock 不可靠）；
   npm 的 `proper-lockfile`（TTL+touch 同款）也被否（接管竞态、2021 起无维护）。
   ⇒ **Redis 锁（SET NX EX + TTL + fencing）正是被上游否掉两次的那个家族**——仲裁者从锁文件换成
   daemon 不会消灭续租/接管/ fencing 的复杂度，只是搬家。

### Redis 机制 → 痛点映射（诚实盘点，不吹不黑）

| Redis 机制 | 能买什么 | 对应痛点 | 与原生替代物的差价 |
|---|---|---|---|
| `SET NX EX` + Lua 释放（/ Redlock 多实例） | **跨进程**互斥锁 + TTL 收尸 | P1 | 实例内已有锁+版本守卫（事实 1/2）；跨进程差价真实，但前提 = **所有写者都走 Redis**——角色没有 shell，得先在 company-pack 里造工具面（真开发量）；且 vendor 裁决 4 原样适用 |
| `WATCH/MULTI/EXEC` 乐观事务 | 键级 CAS | P1/P3 | `FS_STALE_VERSION` + 署名行版号已是文件级 CAS；差价≈0 |
| Lua 原子脚本 | 多键原子 check-and-set | P2/P6 | 任务板 `expectedRevision` 已是 CAS；slug 抢注可用 createIfAbsent（事实 1）+ `slug-collision` **当事后审计哨**（盲审 E4：它是事后日志观察，**不是**开工前查重——前置查重 = createIfAbsent + 姊妹卡"剥前缀查重"） |
| **Streams**（持久事件流 + 消费组） | 追加型"谁在何时做了什么"日志，双读（审计 + 回放） | P5（+姊妹卡的日期/聚合） | 会话日志**本来就是**带署名的持久事件流；~~缺口是跨 home 聚合与 zstd 导出——脚本能解~~ **导出半边已被 E3 实证解掉**（`session-log-export.mjs`）；引 Redis 反而把唯一事实源劈成两个 |
| Pub/Sub | 即时变更通知 | P4 | 即发即丢、离线丢消息；agent 是回合制的，"通知"落不到一个没在跑的会话上——邮箱+`wait_agent` 原生就是**持久**版 |
| Hash / Sorted Set | 结构化元数据索引 | 姊妹卡的 meta | 元数据必须住 git（人可读、可 diff、可迁移）；Redis 当缓存/索引是纯加层 |
| Keyspace notifications（过期事件等） | 锁过期的旁路通知 | — | 边角，用不上 |

**外部先例与生态扫描（2026-09-29/30 两轮，结论已核）**：

- **第三方 DSH 生态存在但锁是真空**：npm 上有上百个 dsh-plugin 包与社区市场（dshmarket 月下载
  ~45 万），但**文件协作锁/租约无成熟插件**（dsh-presence 仅占位名；@georesearch/dsh-runtime-lease
  系自用件）；**未见任何 Redis 型 DSH 插件**——"不引 Redis"与整个生态的走向一致。
  最成熟的第三方多 agent 协作件 [@nanmicoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams)
  （~5.8 万下载/月）README 明言跨进程不协调——与官方 Agent Teams 同一边界。
- **跨根会话消息总线有最对口的幼苗**：[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)
  （跨**独立会话**持久消息总线 + 共享任务板 + 时间线，落 storage-domain 单写链）——直击 P4 的
  "根会话之间无通道"，但 3 stars、2026-09-11 才建仓，**太年轻：借思想（storage-domain 单写链当
  跨根总线），不引依赖**（D29 成熟度门槛不过）。
- Redis 官方教程把 Redis 定位为 LangGraph 的 agent memory/checkpoint 后端
  （[What is AI Agent Memory? …LangGraph and Redis](https://redis.io/tutorials/what-is-agent-memory-example-using-langgraph-and-redis/)）——
  先例支持的是"Redis 当**状态/记忆**库"，不是"Redis 当共享**文件**写作的锁层"。
  （以上下载量/star 为子代理 2026-09-29/30 实测快照，逐条链接见研究卡 Q1。）

### 未决（四问）

- **该不该**：倾向"不该**现在**引"（见阶梯），但**R0 也有真开发量**（门禁扩面 + 盘面面板），
  该不该立刻做 R0 本身也要拍板；
- **何时**：R0 可随姊妹卡迁移同轮做；R2 只在触发证据出现后；
- **次序**：先吃研究卡实证（E1/E2）后任何实施（机制事实没实证前不写 RFC）；
- **放弃**：Redis-as-default 若在 N 场真多人动议后无触发证据，就关门（N 由用户定）。

## 候选与取舍：推荐阶梯（R0 → R3；2026-09-30 盲审后 R0 瘦身重写——原 3/6/7 是决策与登记不是可验收任务，挪卡正文）

- **R0 满载原生 + 门禁补强（推荐默认形态，零新基建；四条可验收项）**
  1. 实证并写进合同：`fs-observation-policy` 在角色会话的实际行为（**E1 已实证 2026-10-03 全绿**
     ——剩手册落地这一半）——
     手册措辞须写全守卫边界：**本进程内 + 本会话读过之后**；进程重启观察清零（长命多日的人机门
     重启后全员回裸奔态）；写进公司手册协作节的机制事实栏（**手册预算池**：`DOC_LINE_BUDGETS` 195 顶，
     **2026-10-03 实测 192/195 余 3 行**（09-30 时余 9 行——期间手册又长了 6 行）
     **且 maxBytes 16384 已被手册 16768 字节越线**（BUG-001，**2026-10-02 已修复**：maxBytes 升 32768
     + `handbook-budget` 门禁）——与布局卡修正 7 共享同一预算池；**字节侧约束已除，仅余行数棘轮（且更紧）**，
     两条 RFC 的改文须排收敛顺序，RFC 带腾位/扩额计划）；
  2. 抢注语义显式化——**拆两段**（盲审：原稿隐含反向依赖姊妹卡 meta 未拍板；且与
     [multi-human.md §4](../../../docs/multi-human.md) "文件存在≠收到/认领/授权/完成"既有合同打架，
     给"存在"第二语义须同 diff 改合同）：(a) **不依赖 meta 的版本** = 开场建 `drafts/<角色>.md` 占位、
     **首行写明"占位=认领，非出稿"**、门禁认占位形状；(b) **meta 建档抢注**（前置 = 布局卡 B1 毕业），
     两卡接缝合并。原稿"createIfAbsent 天然幂等"措辞撤回——它是一次性抢注，重写被拒，这正是本义；
  3. 版本一致性上机器（口径重写——原"版号 vs 写入次数"思路错，一版改三次很正常）：**交叉核对
     "final 合稿依据里引用的稿版本 == 该稿署名行当前版本"**——quote-z-2026 失败模式（双签只对 v2
     生效、盘面已 v3）的直接对应物；最小验收 = quote-z fixture + keyless 红绿；
  4. **人的感知**：**先实测出厂件**（盲审：`workspace-changes` + changed-files card 已随 web-app
     bundle 挂载、手册「出厂两个人机面」节已在教角色用（0.1.7 时代引 185 行，0.2.0-rc.2 实测 191 行）——原稿"人看不见盘在动"的前提大半为假）；实测后列真实
     缺口，再谈增量。**验收对照表**（P4 的四个成分 × 出厂卡覆盖情况，实测时逐格填）：
     稿件已存在/已更新 = 出厂卡覆盖（按 turn 列变更文件）；**谁认领了什么 / 状态到哪了 = 不覆盖**
     （那是署名行+meta 的领地）；**轮内实时在场感 = 不覆盖**（出厂卡是按 turn 的事后汇总）。
     增量（若实测证明需要）= client 面板（**中小工作量非零成本**，client 面有红线先例——先 spike
     再立项；架构模式借 activity 观察面：只读、不偷模型数据、只在有人看时流动）。
  代价：仓内开发，无守护进程、无新工具面给角色。
- **R1 跨进程串行化（盲审后拆两段——原稿"包一层"对角色是幻觉）**：
  (a) **维护者/外部脚本侧**：用 [`dsh-atomic-write`](../../../vendor/dsh/packages/util/atomic-write/README.md)
  （wx 锁 + liveness 接管）——**边界补记**：README 明写 **one host, one PID namespace**，跨机共享盘上
  liveness 探活会误判接管、双写照样发生（与事实 8 的 NFSv3 flock 注记同族）；
  (b) **角色侧**：**现状无解，如实登记**——角色写入走进程内 fs 工具面（无 shell），pack 没有执行位
  去"包"任何库；靠单服务进程 runbook 兜住（multi-human §2），多机形态走上游 seam（R3）。原稿
  "包一层"的错觉撤回。
  触发条件：R0 出真洞才动——洞的形状已被 E2 钉死（跨进程守卫不闭合）；**互斥需求成立即上
  atomic-write，不依赖命中率论证**。
- **R2 单机 Redis 实验（time-boxed，只进排练场，不进默认形态）**：company-pack 造两个工具
  （`motion_lock` / `motion_event_log`，SET NX EX + Streams），在 `dev/rehearsal-workspace/` 跑对比场。
  **触发条件（缺一不进）**：① 一场真多人动议撞上 R0 罩不住的具体失败（如单进程内两同角色会话
  互相覆盖——按事实 2 不应发生，发生了就是 E1 反证）；② 用户批准（引 daemon 与"不搞 client/server"
  裁决的精神冲突面要先问）。产出 = 实验报告进本卡，不是 RFC。
- **R3 跨机网络 Redis（明确不现在做）**：只有公司形态升级成"多机多 home 实时协作"才重新开题；
  届时按 D29 先扫成熟插件、按 D9 优先上游 seam，自建是最后选项。今天的多机事实是"只剩共享盘"，
  而 git 本身就是那张盘上的追加式事实源。

- **登记区（决策与模式，非任务——盲审 C：原 R0-3/6/7 无验收形状，挪此）**：
  - **团队场景感知**用任务板（owner/状态/writeScopes 重叠告警）+ 邮箱 + `wait_agent`，不另造通道
    （用法声明；wait_agent 跨根可用性 = Q2 待定案）；
  - **跨根感知若将来机制化**：借上游"完成唤醒空闲 owner"投递模式（busy=inject / idle=wakeup）——
    **盲审 A3 修正**：封顶**须显式配** `maxConsecutiveWakes`（上游 2026-09-22 起**默认无界**，
    0811 Note 现行文本自写 "Waking is unbounded unless maxConsecutiveWakes is set"）；`Agent.send`
    的 target×wakeup 矩阵原生在；
  - **pack 侧事件域**（若要）：用 `storage-domain`——**盲审 A4 补边界**：`domain/changed` 是**进程内**
    事件（第二进程/重连 GUI 观察不到，跨进程 revision 模式上游未落地），且对模型/客户端零暴露 ⇒
    "喂驾驶舱"= 自建 client 渲染面 + 跨进程可见性待上游；后端为 SQLite/JSON（原稿误写 JSONL）；
  - **P4 留白声明**：R0 不解决**模型间**跨根感知（无通道是机制事实，Q2 已定案 2026-10-03：跨根不可用，
    `teamId = TeamId(root.id)`，见研究卡 Q2 结论）；面板只解决**人的**
    感知，模型侧靠盘面文件 + 人转达——这是已知留白不是遗漏。

**给反方留的话（什么证据会推翻本卡倾向）**：① E1 实测角色会话覆写既有文件**没有**被拒
（policy 未激活 ⇒ R0 的地基塌一块，锁问题升级）；② 真多人动议出现"两 CEO 门同 slug 同文件"
且 createIfAbsent/门禁没拦住；③ 跨 home 审计聚合成为高频人工税，且 git/会话日志导出脚本解不掉
（那时先评估 Streams vs "事件文件进 git"，Redis 仍是后者之后的选项）。

## 证据依赖（研究项已拆到研究卡）

本卡原带的实验/扫描清单（E1 角色会话 fs 守卫实测、E2 双进程同盘覆写实测、Q1 成熟插件生态扫描、
Q2 `wait_agent` 跨根会话可用性、Q3 框架先例深扫）已整体迁至研究卡
[collab-mechanism-evidence](./2026-09-29-collab-mechanism-evidence.md)
（2026-10-03 该卡毕业迁档：E1/Q2 已答并写回本卡）。拆卡理由：用户要按"先研究什么"
排产，研究项集中在一张卡才看得见、排得动；本卡只持有**判断**（阶梯 + 反方清单），不持有实验。
喂给关系与结果：E1/E2 定 R0 地基与跨进程差价（**均已实测钉死**）、Q1 定"借还是自建"（已定：不引）、
Q2 定跨根感知归面板还是等机制（已定案：跨根不可用 = 无主留白）。

## 毕业门

- **R0 的该做门**：~~研究卡 **E1 有结论**~~ **已满足（2026-10-03 E1 全绿，绿路径 = 写进手册机制事实栏）**
  ——剩 **用户点头 R0 四条清单** 这一道。E2/Q1 已答并写回本卡（差价已钉死，不再是待办）。
- **R2 的待触发门**：触发条件两条齐 + 用户批；只做实验不进产品形态。
- **放弃门**：E1 全绿 + N 场真多人动议（N 用户定）无触发证据 ⇒ Redis 线关门，结论并进
  [multi-human.md](../../../docs/multi-human.md) §4 的机制事实栏（"锁已由 X 提供"），本卡迁 `_done`。
- 卡本身不阻塞姊妹卡：deliverables 迁移（那张）先行不依赖本卡结论。
