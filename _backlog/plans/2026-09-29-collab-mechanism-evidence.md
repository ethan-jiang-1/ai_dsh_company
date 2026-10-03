# 推敲（调研）：协作机制证据底座——原生栈实测 E1/E2/E3 + 生态与先例扫描 Q1/Q2/Q3

> 状态：推敲中（调研卡——产出是证据不是方案）｜毕业门判断 = Q0/Q1/E2/E3 已答（2026-09-29/30：vendor 盘点 + 外部生态 + 跨进程实测 + 日志导出闭环，结论已喂消费卡）；余 **E1（真模型单步）/ Q2（源码定案）** 待跑、Q3 条件触发｜⚠ 地基对账（2026-10-03）：升 pin 0.2.0-rc.2 已于 09-30 落地（下文 Q0「升 pin 不急」按当时事实保留、已被超越）；收割轮已消费本卡登记区三件（schedule/workflow/goal，见归宿节）；E1/Q2 跑时一律以现行钉树为准，E2 已由 10-01 自测轮在新 pin 复跑通过｜下一步 = 用户点名跑 E1/Q2（分钟级），跑完本卡即可毕业迁 _done

## 背景 / 触发

两张判断卡压在同一批"机制事实"上，其中几条**是推断不是实测**：

- [writing-collab-locks-redis](./2026-09-29-writing-collab-locks-redis.md)（Redis/锁判断）的整个 R0 地基
  = "`fs-observation-policy` 已激活且行为如文档所述"——组合层事实核实了（base bundle 插行、无人禁用），
  但**角色会话里的实际行为没实测过**；
- [deliverables-lifecycle-metadata](./2026-09-29-deliverables-lifecycle-metadata.md)（deliverables 布局）的
  收敛回填依赖会话日志，而快照侧的日志导出缺口是[已登记的坑](../../snapshots/README.md)。

用户 2026-09-29 要求按"先研究什么、后研究什么"排产 ⇒ 把全部研究项**收进一张卡**（D31：调研 = 卡性质），
跑完喂判断。判断卡不吃实证就毕业 = 违反 D15（完成定义 = 真检查）。

## 已知与未决

**已核实、不再研究的**（都有出处，直接引用即可）：fs-observation-policy 的组合层插行
（[base bundle](../../vendor/dsh/packages/bundle/base/cordis.patch.yml) 第 278–279 行，无人禁用；
0.1.7 时代引 277 行，0.2.0-rc.2 实测已移至 278–279）；fs-local
实例内锁 + `FS_STALE_VERSION` 官方测试；Agent Teams 任务板 CAS / 邮箱 / `wait_agent` 语义
（[vendor Note](../../vendor/dsh/.agents/notes/implemented/feature/2026-08-05-agent-teams.md)）；跨 home 无
Team 寻址、多机只剩共享盘（[multi-human.md](../../docs/multi-human.md) §5）。

**推断未实测的 = 本卡的活**，见下。

## 待答问题 / 待跑实验

| # | 实验/问题 | 形状与成本 | 预期结果（红 = 推翻判断卡倾向） |
|---|---|---|---|
| **Q0 ✅已答** | DSH 自家插件体系的协作能力盘点（用户 2026-09-29 点名"查查 DSH 插件体系里有没有可借鉴的多角色协作"） | vendor 钉树通读 + 上游 GitHub ls-remote/浅 fetch，零模型，已跑 | 见下节「Q0 结论」——**头号发现 = time-context**（改写日期卡） |
| **Q1 ✅已答** | 成熟 DSH 插件生态扫描（D29 口径）：有没有现成的协作锁/事件流/存在感插件 | 子代理 npm registry + GitHub API 实测（2026-09-29/30），已跑 | 见下节「Q1 结论」——**锁真空、无 Redis 型插件、team-rooms 幼苗** |
| **E1** | 角色会话 fs 守卫实测：① 不读直接覆写既有文件；② 读→外部改→写；③ 两会话并发 create 同一新文件 | `date-rule-probe` 同款单步真模型探针，排练场（`dev/rehearsal-workspace/`），分钟级/分币级；**跑时以 0.2.0-rc.2 树为准** | ①被拒（要求先读）②`FS_STALE_VERSION` ③一胜一拒。**任一红 ⇒ Redis 卡的 R0 地基重估** |
| **E2 ✅已答** | 双进程同盘覆写实测：两个进程各自挂真 fs-local（vendor 构建产物），对同一目标写 | 零模型，`scripts/cross-process-fs-probe.mjs`，秒级，已跑 | 见下节「E2 结论」——**跨进程连守卫都不闭合（20/20 互踩）** |
| **E3 ✅已答** | 会话日志导出/聚合可行性：zstd 多帧 → 明文 `.jsonl` 目录，让 `deliverables-check --sessions` 的快照审计路径真能落地 | 零模型，`scripts/session-log-export.mjs`，已跑 | 见下节「E3 结论」——**工具落地 + 09-26 快照 4 场 0 违规，缺口闭合** |
| **Q2** | `wait_agent` 跨根会话可用性（CEO 门等 CFO 门） | 机制推断即可：不同根会话 = 不同 Team ⇒ 查 vendor 源码定案，不必跑 | 预期不可用 ⇒ **模型间跨根感知 = 无主留白**（面板只解决**人的**感知——Redis 卡 P4 留白声明），不是"归面板"；编号更正：该议题现 = Redis 卡 R0 第 4 条 |
| **Q3** | 框架先例深扫（[LangGraph×Redis 教程](https://redis.io/tutorials/what-is-agent-memory-example-using-langgraph-and-redis/) 这类"Redis 当状态库"先例） | **条件触发**：只在 Redis 卡的 R2 触发条件成立时才值得深扫 | 现在只登记链接不展开，防止为不做的方案做研究 |

### Q0 结论（vendor 钉树 + 上游，2026-09-29；结论已写回消费卡）

- **头号发现（喂日期卡，促成其重写）**：出厂时钟插件 [`time-context`](../../vendor/dsh/packages/context/time-context/README.md)
  随 web-app 挂载但 `disabled: true`——durable user-role 消息注入当前时间，留案"自建日期注入"被它超越。
- **喂 Redis 卡的先例五件**：`atomic-write`（跨进程 wx 锁 + liveness 接管）、`storage-domain`
  （共享状态 + `domain/changed` 事件 seam）、SessionWriteLease（TTL 两连否 → 内核 flock）、
  activity 观察面（只读不偷数据/只在有人看时流动）、完成唤醒空闲 owner（busy=inject/idle=wakeup；
  **封顶 = opt-in**——`maxConsecutiveWakes` 默认无界，上游 0922 Note 改判，盲审 F-19 对齐）。
- **现成未用件**（登记待用，不预设结论）：`schedule`（持久提醒，web-app 亦 disabled——多人模式催稿可考虑）、
  `session-reference`（@ 引用他会话为有界快照——跨角色交接可考虑）、`goal`（会话级持久目标 + 自动续驶）、
  `tool-subagent-control`（全局 continuable 控制，被 team 版 shadow）、`workflow`+`ralph`（脚本化
  fan-out 编排 + 固定 fresh-agent 循环——一次性结构化写作流水线的轻通道，与 team 主通道互补）。
- **上游动向**：真实上游已 tag 0.2.0 线的 rc.1/rc.2（448 个未发布提交，多为 desktop/web UX；
  本仓 pin 字面量唯一事实家 = AGENTS.md §vendor 簿记，此处不写带前缀全名）；
  协作机制无大件，唯一相关 = `user-questions` 支持 timed waits + late replies（对"卡刷新即丢"利好）。
  我们 pin 的 0.1.7-rc.2 仍是 0.1.x 线最新 ⇒ **为协作目的升 pin 不急**；0.2.0 正式后按 release.md 程序重校。
  （**2026-10-03 附注：本段已被超越**——09-30 用户点名升 0.2.0-rc.2，动机是 0.2.0 能力面而非协作
  （[升 pin Note](../../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md)）；本段按当时事实保留，
  `user-questions` timed waits 利好已随新基线在场。）
- **"现成未用件"归宿（盲审 B12：无归宿=毕业即埋，逐件定案如下；复活任一件须重读本节）**：
  - `schedule`：~~登记待触发~~ **已收（09-30 收割轮批3）**——schedule-bundle 落地（cron/定频 + 到点投递
    回原会话 + **宿主恢复冷会话**；行归 bundle 所有，pack 只留替换行钉 timeZone）；旧搁置池「自主节律」
    复活条件实证闭合（[harvest Note](../../notes/implemented/2026-09-30-plugin-harvest-round.md) 批3）；
  - `session-reference`：**登记待触发**（仍未收）——跨角色交接出现"引用他会话上下文"真实需求时评估；
  - `goal`：~~登记待触发~~ **已收（批1）**——tool-goal + `/goal` 落地（动议跨轮推进 create/get/update）；
  - `workflow` + `ralph`：~~登记为场景 C 类候选通道~~ **workflow 已收（批4，仅 CEO 编排位——persona
    派活两条路→三条路，"编排面不是分工面"）**；`tool-ralph` 用户裁定**登记不动**（出厂关，激进循环）；
  - `tool-subagent-control`：**不用**——被 team 版按名 shadow（R3 实证），登记仅为防重复探索。
  - （登记区外同族事实：批1 `tool-subagent-fork` 落地——旧搁置池「并行快捷派活」的 seam 到位，
    delegation.md §4.4 已改判；本卡不持有该判断，仅记指向防重复探索。）

### E2 结论（2026-09-30，`scripts/cross-process-fs-probe.mjs`；真 fs-local 服务 × 2 进程，零模型）

- **T1 基线**（对齐官方测试 `filesystem.spec.ts:641-653`）：进程内两路并发守卫写 = 1 胜 + 1
  `FS_STALE_VERSION` ✓（复现不了官方语义后面就不作数——复现了）。
- **T2 跨进程无守卫**：两进程各自挂 fs-local，`writeText(intent=undefined)` ⇒ **双双成功、
  终态 = 后写者载荷、目录零锁/租约工件**——静默互踩从源码论断变实测。
- **T3 重磅（超预期）**：跨进程**同版本** `replaceIfVersion` 同时放行 ×20 轮 ⇒ **20/20 双双成功互踩**
  ——不是窄竞态窗，是"两进程同时持有同版本"时序下**系统性**不闭合：守卫的版本检查与文件发布
  之间没有跨进程原子性（进程内靠实例锁兜住，跨进程没有）。
- **结论**：跨进程场景（双 home / 双服务 / 多机）**连乐观守卫都不可依赖**；正解 = 官方
  [`atomic-write`](../../vendor/dsh/packages/util/atomic-write/README.md)（wx 锁 + liveness 接管）
  或内核锁模式——TTL 家族已被上游两连否（消费卡事实 8）。喂给：Redis 卡（"跨进程差价"从推断变实测）。
  **措辞精度（盲审 A12/C5 回灌）**：更硬的直引 = [fs-local README](../../vendor/dsh/packages/fs/fs-local/README.md)
  原文 "The per-target mutation lock is in-process only … never serialized"（机制直证，先于编排取证）；
  T3 的 20/20 是"GO 屏障同步双发 + 同版本"的强制紧循环（脚本自标"尽力而为"）——实测命题是
  "同时持同版本同时放行必互踩"，**不是**"真实写节奏必然互踩"（秒级间隔未测）；设计结论不变：
  守卫不能当跨进程互斥**依赖**。

### E3 结论（2026-09-30，`scripts/session-log-export.mjs` + 快照审计实跑）

- 工具落地：`$DSH_HOME` 的 zstd 多帧日志 → 明文平铺 `.jsonl`（`--workspace` 过滤单 bucket 或全导）；
  实跑 349 份导出 / 0 失败（company-workspace bucket）。
- **闭环验证**：[memory-convergence-2026-09-26](../../snapshots/memory-convergence-2026-09-26/README.md)
  的 4 场动议快照审计全 **0 违规**——snapshots README 登记过的"快照无可用日志源"缺口**闭合**。
- **彩蛋**：`renewal-y-2026` 的两场撞车被 `slug-collision` 观察项**当场指认**（"成品被 2 个不同的
  Lead 会话声明过"）——散文记录里的事故第一次变成机器可见证据。
- 规矩已回流：[snapshots/README.md](../../snapshots/README.md)「审归档快照的日志源」节（工具 + 配方）。
- 喂给：布局卡（收敛回填/快照审计工具底座就位——无台账 5 场补日期现在有抓取通道）、维护者日常。

### Q1 结论（子代理外部实测，2026-09-29/30；结论已写回 Redis卡）

- **锁是生态真空**：无成熟文件协作锁/租约插件（dsh-presence 占位名、@georesearch/dsh-runtime-lease 自用）；
  **全生态未见 Redis 型 DSH 插件**——与 Redis 卡"不引 Redis"的倾向一致。
- **可借幼苗**：[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)（跨独立会话持久消息总线 +
  共享任务板，落 storage-domain 单写链；3 stars、2026-09-11 建仓——太年轻，借思想不引依赖）；
  [@nanmicoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams)（~5.8 万/月，最成熟，
  但 README 明言跨进程不协调）。完整候选表与检索面链接 = 子代理报告原文（外部数据，快照值，不复述进本卡正文）。

**喂给谁**：Q0/Q1/E2/E3 **已喂**（日期卡重写+探针绿 + Redis 卡补事实 6–8 与实测差价 + snapshots 规矩回流）；
E1/Q2 → [writing-collab-locks-redis](./2026-09-29-writing-collab-locks-redis.md)
（R0 地基的最后一角：角色会话里 observation-policy 实际行为 + wait_agent 跨根定案）；Q3 →（条件）Redis 实验新卡。

## 候选与取舍

调研卡不做方案取舍，只登记一个执行形状的取舍：

- **顺序内聚**：E1/E2 是判断卡的硬前置（先跑）；E3 独立可后跑；Q1/Q2 可并行穿插。
  注意这不是排期（_backlog 不承载调度）——是**证据依赖方向**：判断卡毕业门里写的就是"吃 E1/E2 结果"。
- **反例防呆**：不做 E1 直接信组合层推断 = D15 反面（"伺服了"≠"能加载"的同款病）；
  为不存在的 R2 提前跑 Q3 = 为不做的方案做研究（登记触发条件防这个）。

## 毕业门

- **毕业 = 消化**：E1/E2/E3 有结论（跑过、红绿如实记录）+ Q2 有答案（Q0/Q1 已答、Q3 未触发不算欠账）⇒
  结论行写回各消费卡（消费卡各自的"已知"节补一行 + 出处指本卡），本卡迁 `_done/_closed_plans/`，状态行记去向。
- 无"该不该做"门——研究不改盘上任何合同；**唯一要人裁决的 = 花不花这点探针成本**
  （E1 一次真模型单步 + E2/E3/Q2 零模型），用户点头即开跑。
