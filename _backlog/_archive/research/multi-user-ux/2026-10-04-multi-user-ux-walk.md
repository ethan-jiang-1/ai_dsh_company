# 2026-10-04 · 多用户全交互走查实录（人机合一 journey + 并发观察）

> 性质：reference——喂 [issue 2026-10-04-multi-user-concurrency-bdd](../../settled_issues/2026-10-04-multi-user-concurrency-bdd.md)
> 与 [issue 2026-10-04-human-agent-unity-ux-bdd](../../settled_issues/2026-10-04-human-agent-unity-ux-bdd.md) 的证据半边。
> 走查仪器 = 一次性驱动脚本（仓外 /tmp，产出本文件后即弃；场景转正时按宪法 §1.1 重新立项命名）。
> 截图：/tmp/multi-user-walk/（问询卡/审批卡/待办面板/终态 ×5）。

## 走查一：人机合一全旅程（CEO 一会话，走查者扮人，T0 起 159 秒完整闭环）

动议 = 续约报价（要求：先问人 → spawn 成员做对标 → 触线签核 → 落盘收口）。实际发生（wall clock 修正后）：

| t+ | 事件 | 人的视感 |
|---|---|---|
| 34s | `ask_user_question` 落日志；**注意力中心同帧出现「待答问询」**（含会话名 + 问题 header + 相对时间） | 通知即时；走查者点选项 + Enter 应答（radio+Enter 通路） |
| 39s | `spawn_teammate`（mkt，市场对标） | 人侧无通知（设计如此——不需要你） |
| 115s | mkt 的对标结论 **Steer 投递进 lead 轮内**（`team/message/queued→delivered` 全链在 lead 日志） | 人侧无通知 |
| 118s | `approval/asked`（折扣<9折 双签）→ **注意力中心出现「待批审批」** | 通知即时；Allow once 应答 |
| 134s | 应答落 `approval/decided (allowed-once)` | — |
| 159s | lead 写方案落盘 → turn/end (completed) | — |

**mkt 的真实工作**（其会话日志 83 事件）：读了手册/CHARTER/org/台账/历史稿，glob 确认本 slug 无任务书，
13:01:51 `send_message` 回 lead（messageId b2380e32，queued=已投递），13:01:54 收口。
**核心结论 = 正面分歧**：「8.5 折偏高（让价过深）……与 8.5 折口径的分歧点，已保留未抹平」；
lead 收到后整合才发起签核、收口时**分歧保留与否未在最终方案片段出现**（见 H 系卡 H9）。

**观感（走查者的体感）**：
- 通知面**只报「需要你」**（问询/审批），成员生命周期（spawned/working/finished）不进注意力中心——
  人想知道"活儿干到哪"要自己去任务板/在场板。这是设计还是缺陷 → H 系卡 H6。
- 等人事件到人可操作 ≤5s（注意力中心轮询设计），全程体感"机器在等我"很清楚。
- 159 秒走完 问询→派活→成员并发工作→汇报→签核→落盘 全链，无一次人侧卡顿。

## 走查二：并发观察（两成员同时写同一文件——"内建协调"的观察证据）

动议 = lead spawn w1、w2，两者同指令写 `journal/concurrent-probe.md`，lead `wait_agent` 等齐后转述。
**观察结果（133 秒）**：

- w1：文件不存在 → 创建写入成功。
- w2：首读时文件尚不存在 → 直接写**被拒**，守卫原话：`file has not been read — read the file, then retry`
  → w2 重读（已含 w1 的行）→ 走「已存在则追加」分支 → 成功。
- **终态两行俱全，零静默互踩、零丢内容**；lead `wait_agent` 等齐两人、如实转述——
  并在成员补充收口件后**主动自查更正了自己第一份转述的错误**（"撤回"原话在案）。

**边界（诚实登记）**：单次观察只采样了一种交错（w2 首读在 w1 写入前、写尝试在后）；
"真同时"的交错靠 fs-local per-target FIFO 锁（源码读）——C1 固化成 probe 后多次采样才是全排列证明。

## Agent Team 能力面清单（源码 + 官方文档核对；"内建并发"的完整形状）

**单进程机制（一个 team 的全部成员同进程——内建协调的真实边界）**：

| 机制 | 语义 | 出处 |
|---|---|---|
| fs-local per-target FIFO 锁 | 同一目标文件的写操作进程内串行 | `vendor/dsh/packages/fs/fs-local/src/index.ts:117` |
| 版本守卫 | 读后写版本不符 = `FS_STALE_VERSION`；盲写已存在 = `FS_NOT_OBSERVED`（E1 真会话 4/4 拒） | 同上 :216-222 |
| 原子发布 | 私有临时目录 stage + `'wx'` 独占创建 + 原子 publish → 读者只见完整旧版/新版 | `fsio.ts:620` |
| 任务 DAG CAS | 每次 mutation 带 `revision` compare-and-set；blockedBy 必须无环 | `docs/subsystems/agent-team.md` |
| durable mailbox + Steer | 消息先落 lead 日志再投递（queued-minus-delivered = 恢复邮箱）；running=step boundary，inactive=唤醒/冷启 | 同上 |
| wait_agent | 成员等变更（10s–1h），**不唤醒任何人**；「Lead must wait for required teammates」写进工具说明 | `tool-agent-team/src/index.ts:37` |
| roster 生命周期 | provisioning → active/failed（终态）；running/inactive 派生 | 同上 |
| writeScopes | **advisory path prefixes，不是锁**——重叠只出警告 | agent-team.md |
| interrupt | lead 打断成员轮，inbox 保留 | TeamService.interrupt |
| 成员拉人 | **被拒**：`DELEGATED_CALLER`（审批侧 child 硬编码 'never'） | member-inquiry-probe 实证 |

**跨进程缺口**：E2 实测（两进程同版本守卫写 ×20 = 20/20 互踩）——多 home/外部编辑器场景守卫失效。
现有缓解 = 规矩层（单稿负责人/slug 唯一/占位认领/审计拼图）+ pending 产品决策 `dsh-atomic-write`。

## 方法论教训（喂宪法 §3 的活例）

走查一途中走查者一度误判「mkt 失踪 20 分钟」（未收到汇报）——落日志复核后证明：
消息 Steer 投递发生在轮内、lead 正常整合。**印象不作数，日志说了算**——这正是宪法
§3.1（验证世界不信自报）在走查方法上的投影，也是用户选 BDD 的理由本身。
