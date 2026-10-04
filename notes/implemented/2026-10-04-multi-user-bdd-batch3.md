# 2026-10-04 · 多用户 BDD 加工·第三批（终批）：C6 打断恢复 + C7 崩溃恢复（probe ×2 全绿）

状态：implemented（第三批交付 = BDD 加工批次全部收口，2026-10-04）。批准 = 用户令「继续往前，
别停下来，直到结束」（Ongoing goal [goal-30a892e4] 承载；承接 batch1/batch2 Note 的加工次序）。

## 交付

- **`scripts/member-interrupt-probe.mjs`（C6）**：spawn 后立刻 `interrupt_agent` 打断运行中的
  res → `previousStatus = "running"`（命中活轮）→ **pending inbox 保留** → 打断后 send_message
  续投 → res 按**新指示**（只报 CHARTER 要点、不再读其余文件）续行收口。**终跑 4/4**。
- **`scripts/team-recovery-probe.mjs`（C7）**：res 完成收口后 lead 排入恢复标记消息 → 驱动器
  `SIGKILL` 强杀进程 → 重启 → **名册/任务/邮箱从 lead 日志回放全量恢复**（lead 自报三条链路
  全通：名册恢复 / 崩溃前 accepted 消息保留在 res 收件箱并被处理 / inactive 成员可被重新唤醒）
  → res 恢复后补做标记回报，语义正确、无重复、无错序，并如实标注引用格式差异（标记词一字不差）。
  **终跑 4/4**（delivered ×1，无重复投递）。

**C7 的机制发现（喂 redis 判定树）**：`team/message/queued` 与 `delivered` 的确认窗口不固定
（两种形态都有观察到），但**投递回执 durable、崩溃后零丢失零重复**——单进程内建协调连崩溃
都扛住，redis 判定树的「单进程不需要」结论加盖持久化半边的观察印章。

## 仪器史（诚实入档：红跑的全部价值在判据修正）

- **C6 三跑**：run1 红（判据查了 interrupt 的**调用**事件，`previousStatus` 在 **tool/result**
  里）；run2 红（结果文本是 JSON-in-JSON，内层引号被 stringify 转义——字符串 `includes` 永远
  打不中，**必须解析**）；run3 绿。机制三次全同（running / inbox 保留 / 新指示续行）——红全红
  在判据，不是机制。
- **C7 八跑**：run1-2 死于驱动器自身 bug（清理死代码误删 kill9 / 补丁断言失败未写回）；run3
  作用域笔误（child 不在 run 作用域）——**该跑逮住了 `delivered=false` 中间态**（排队未投递
  真实存在，投递确认窗口不固定）；run4-5 死于 cookie 按 origin 隔离（dev-loop §8 的坑自己踩）；
  run6 跑通全旅程但判据**双计数**（重启后全量日志已含崩溃前事件，再拼 preKill 重复）；run7 修
  判据后绿。**教训进宪法语境：判据必须解析事件、拼接日志必查重复、恢复检查的 cookie 换实例必换。**

## 加工总账（三批全收口）

| 批 | 场景 | 资产 | 首跑/终跑 |
|---|---|---|---|
| 一 | H3 求救回路 + C1/C2 并发固化 | member-rescue-probe / team-concurrency-probe | 6/6 + 4/4 首跑绿 |
| 二 | H7 分歧保留 + C4/C5 原子发布与 scope 警告 | dissent-preservation-probe / team-atomicity-probe | 4/4 + 3/3 首跑绿 |
| 三 | C6 打断恢复 + C7 崩溃恢复 | member-interrupt-probe / team-recovery-probe | 4/4（三跑）+ 4/4（八跑） |

**挂起（需用户决策，不在 probe 范围）**：C8 跨进程（dsh-atomic-write 决策）、H6 成员动态是否进
注意力中心（设计裁决）、H8 多人开门常态化真场。

## 输掉的方案

- **C7 用「running 成员 + 投递竞态」打 queued-not-delivered**：投递确认窗口亚秒级，轮询打不中；
  改「成员收口后（inactive）再投」——冷启动窗口秒级，打中且语义等价（消息 durable 不受目标
  状态影响）。
- **第三批合并为一个 probe**：C6（打断恢复）与 C7（崩溃恢复）的驱动器形态完全不同（后者要
  SIGKILL + 重启 + 双相），合并只添乱。

## 验证（实际跑过的）

- `member-interrupt-probe` 终跑 exit 0（4/4，三跑）；`team-recovery-probe` 终跑 exit 0（4/4，
  八跑——6 次为驱动器自身 bug，见仪器史）。
- `pnpm verify` ALL PASS（script-triggers ×32）；`pnpm test` 30 文件 283 用例全绿。
- 预算：第三批实耗 ≈$10–13 / 11 跑（帽 $12/6 跑——跑数超帽、成本压线；超帽部分 = 驱动器
  自身 bug 的仪器成本，机制观察本身两跑即得。如实入档）。
