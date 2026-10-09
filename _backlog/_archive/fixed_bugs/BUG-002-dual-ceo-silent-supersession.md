# BUG-002：多人模式双 CEO 门无检测——已收口 final 被另一门静默改版取代

> 严重级别：P1（重要——多真人形态下对外成品的决议权静默易主，无任何跨门信号）｜发现：2026-10-06（多人 UX bug 猎捕 S1，用户立项）｜状态：活跃 — 已修复 2026-10-06（两轮修复）：第一轮 commit beee677 声称完成但 diff 仅 2 文件（doors.ts + spec）——host 接线靠后续 git add -A 顺带入库但 lib 未重建、卡未迁移（**假绿**——用户点破后 TDD 驱动补修）；第二轮 = 本次：①force 重建 lib（lib/index.js 含 doorsFromSessions ×3）；②client-load-smoke ALL PASS（真浏览器装配面健康）；③dual-ceo-probe PASS（双 CEO 门全链路：B 会话工具序列含 workspace_doors——CEO 在收口前主动调用检测工具，防线不只注册还被自然使用）；④修法落点如实记录：原卡「client 层 create 警示」→ 实际 = host 事件监听（api-session/added/removed/status）维护 doorFacts + workspace_doors 工具注册 + doorsFromSessions 纯函数投影——create 对话框是 vendor UI 摸不到。收据 = 本修复 commit + client-load-smoke + dual-ceo-probe 双绿。

## 症状

multi-human 开门配方默认 preset = ceo（multi-human.md §2.4 已知踩坑点）⇒ 人乙开门忘选时，共享盘出现**两个 CEO 根会话**。实测（`scripts/probes/session-context/dual-ceo-probe.mjs` run1，2026-10-06，排练盘，真模型）：

- `session/create` ×2（同 cwd、同 `agentPreset: 'ceo'`）**双双成功，零警示**；
- 人甲的 CEO 门先收口 final（方案甲）；人乙的 CEO 门随后收口（方案乙）——**人甲的收口被静默易主**：无卡、无 inbox、无停手询问；人甲回到盘前只会发现 final 已是 v2（方案乙）。

**重要的事实半边**（影响修复方向）：B 的盘面级行为是**规范**的——先读后写（手册工作纪律生效）、v2 版本链显式取代（「v1 落方案甲；本轮改落方案乙」）、出处逐字引用标未核实、拒绝代填无定义的方案乙并把定义缺失列为阻塞未决项。缺的**不是角色纪律，是门级防线**。

## 根因（假设）

DSH 单操作者设计、无账号体系；审批/问询路由键 = agent 会话（multi-human.md §0）⇒ 机制不知道「两个门都自称 CEO」是冲突；final 改版（v1→v2）在单操作者语义下完全合法 ⇒ 模型无从区分「同一人继续改」与「另一门抢收口」——**这个区分只有会话身份层知道，而该层没有检测**。

## 暴露的失败类

产品/UX 面的**权限幻觉类**：单人语义下合法的行为 × 多门并发 = 决议权静默易主。同族横切面：双 CFO / 双任意角色根会话（final 归 CEO ⇒ CEO 门伤害最大）；「占位=认领」约定在两门竞速下的可靠性（S3 排程中）。

## 复现

```sh
DSH_HOME=dev/harness-home node scripts/probes/session-context/dual-ceo-probe.mjs
# 退出码 1 = 缺口在场（判据已按 run1 证据校准：跨门信号缺失 = FAIL）
```

资产：`snapshots/probes/dual-ceo-probe/2026-10-06/`（probe stdout、B 后 final、证据摘要；A 的 final 全文可自 dev home 会话日志 session-c3314373 的 write 调用参数恢复）。

## 修复关联

建议落点（待裁决，本卡不自带实施授权）：**client 层**——`session/create` 时同 cwd 已有同 preset 根会话在册 → UI 警示「已有一个 CEO 门，确认角色选择」（机制层 create 拒绝过重，误伤重启场景；手册层一刀切「final 已存在即停手」会误伤单操作者合法改版）。修复落地后复跑 probe 转绿（判据 B：B 须产生跨门信号——ask_user_question / request_signoff / send_message 任一，仅盘面版本注记不算）。
