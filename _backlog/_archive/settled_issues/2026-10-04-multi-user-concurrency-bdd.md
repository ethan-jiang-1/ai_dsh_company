# 推敲：多用户并发数据完整性——BDD 场景组（C 系）

> 状态：已毕业（2026-10-04 第一批加工交付：C1/C2 固化 = scripts/team-concurrency-probe.mjs 首跑 4/4；去向与后续批次 = batch1 Note（已删，历史在 git））｜原判断：该做（C1 已有走查观察证据；毕业 = 用户圈定场景批次批 RFC → probe 固化判据）｜
> 圈定已兑现（C1–C7 第一批 = batch1 Note）；C8 已裁决关账（2026-10-05 用户拍板：**规矩层即答案**——单写进程部署约定已闭合，残余风险归部署纪律不归产品；复活触发 = 多进程写盘常态化 或 dsh-atomic-write 上游落地，触发兑现按写回规则立新卡引用本卡，不复活）。证据半边 =
> [reference/2026-10-04-multi-user-ux-walk](../research/2026-10-04-multi-user-ux-walk.md)。

## 背景 / 触发

用户 #1 担忧（2026-10-04）：「并发导致数据乱掉——数据都在共享盘上，总得有个规矩」+ 模糊感觉
「Agent Team 里头有一个把并发的事儿给处理了」。历史参照：传统程序这里要上 redis 类分布式锁。
本卡 = 从用户场景出发的 BDD case 清单，**逼出"内建机制到底够不够"的观察**，而不是源码推断。

## 已观察（走查二，133 秒）

同 team 两成员并发写同一文件：w1 创建成功；w2 首写被拒（守卫原话「file has not been read」）→
重读 → 安全追加 → **终态两行俱全，零静默互踩**；lead wait_agent 等齐两人并如实转述。
边界：单次观察 ≠ 全排列——固化 probe 后多次采样才是证明。

## BDD 场景清单（Given/When/Then；judge = 判据资产落点）

| # | Given | When | Then（判据） | 档位 |
|---|---|---|---|---|
| C1 | 同 team 两成员，同一文件写入指令 | 几乎同时写 | 恰一胜；败者被拒且错误**可行动**（重读成功或如实上报）；终态两份内容都不丢 | probe（真实 team，多次采样） |
| C2 | 一个 unowned task | 两成员同时 claim（同 revision） | CAS 一胜一拒；败者 re-list 后重试成功 | probe |
| C3 | 两成员各持 revision N | 同时 updateTask | 后者 revision 冲突被拒；任务终态一致 | probe |
| C4 | 成员正在写 final.md | lead 同时读 | 读到完整旧版或完整新版，**无半截**（原子发布） | probe |
| C5 | 两成员写同 writeScope 不同文件 | 并发提交 | 视图出 advisory 警告；数据完好（scope 是建议不是锁——预期行为钉住） | keyless（视图折叠） |
| C6 | 成员正在 updateTask | lead 同时 interrupt | 成员 inbox 保留、任务状态一致 | probe |
| C7 | 成员 cold-resume | 邮箱恢复 | queued-minus-delivered 消息不丢不重（dedup key） | probe |
| C8 | 跨进程（双 home）同文件并发写 | 同时写 | **已知互踩（E2 ×20）**——判据 = 规矩层资产（S1/S3/S5 已闭合）+ dsh-atomic-write 决策；**不承诺内建机制** | ⏸ 挂产品决策 |

## redis 问题的判定树（用户原话：不用 redis 再好不过，但不用也得用）

1. **单进程 team 内（C1–C7）→ 内建机制够**（C1 已观察：守卫逼败者重读安全收敛）→ 不需要 redis。
2. **跨进程（多 home/外部编辑器，C8）→ 内建不够**（E2 实证互踩）→ 先用规矩层（已闭合）；
   仍不够 → `dsh-atomic-write`（vendor 载体，pending）→ **redis 类外部协调 = 最后手段**
   （引入第二协调源 + 运维面，收益只有当"多进程并发写同一文件"成为日常高频形态才成立；现状不成立）。

## 毕业门

- **该不该**：该——C1 观察已证内建机制可见效，但未固化的观察防不住升 pin 漂移。
- **何时**：用户圈定批次后立 RFC（probe 组合为一条认证档资产，预算随批核定）。
- **次序**：C1（观察已有，最便宜固化）→ C2/C3（CAS 语义）→ C4/C5 → C6/C7；C8 挂决策。
- **放弃条件**：vendor 升 pin 若带来 fs-local/agent-team 并发语义的官方测试覆盖（或 upstream
  提供 team 并发测试资产），本卡降级为引用官方资产。
