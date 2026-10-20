---
status: 已修
severity: P1
opened: 2026-10-09
---

# BUG-007：协作探针接受无操作/错误状态，且等待不存在的第2轮

> 严重级别：P1（重要）｜发现：2026-10-09｜状态：已修；2026-10-10 判据/驱动收紧并由真实双成员入口5/5验收

## 症状

修复结论：原五类判据假绿已修复，required判据接入实际退出码；双成员原入口改为实验overlay同轮共同read放行，真实复跑5/5、exit0。旧4/5样本继续保留为修复前的工具时序不足事实，不替代修复后验收。可复现实验、marker/callId配对、败者read/write顺序和限制见[双成员验收研究](../research/collaboration/2026-10-09-team-read-barrier-acceptance.md)及[屏障接入源研究](../research/collaboration/2026-10-09-team-read-barrier-seam.md)。claim让位是否符合产品行为仍属独立协作issue问题。

用户要求复核多人协作与历史落地；调查阶段执行原真实判据片段，5类独立坏样本仍被接受。完整研究、基线、工具事件定位与解释见 [协作研究](../research/collaboration/2026-10-09-teamagent-locks-and-acceptance-audit.md)，问题范围归 [协作安全卡](../settled_issues/2026-10-09-collaboration-safety-acceptance.md)。用户随后批准先修 BUG-007；五条探针判据与驱动均已修正。修复前未触发的并发写冲突由修复后的受控双成员入口覆盖，结果见本卡结论和双成员研究。

| 位置 | 反例/实际观察 | 错误判据 |
|---|---|---|
| [team-concurrency:91–97](../../../probes/team/team-concurrency-probe.mjs#L91-L97) | 纯文字“claim revision 尚未执行”，无task/write事件 | C1b/C2a/C2b均true；没有证明任务终态、拒绝通路或成员归因 |
| [team-atomicity:92–96](../../../probes/team/team-atomicity-probe.mjs#L92-L96) | 6行+重复行+额外scope-note | C4a仍true；“无重复/六行”未断言；终态也不测全过程reader |
| [fs-guard](../../../probes/fs-taskboard/fs-guard-probe.mjs) 的 judgeWriteGuard | 只read、无write call/result | 仍标“先读后写”通过 |
| [team-recovery:138–140](../../../probes/team/team-recovery-probe.mjs#L138-L140) | 崩溃前正文含res/恢复标记，零恢复后事件 | R1/R4通过；扫描范围未被kill/resume水位限定 |
| [taskboard-scope:102–116](../../../probes/fs-taskboard/taskboard-scope-probe.mjs#L102-L116) | 两门均报告同任务，B3=false | 退出只看b1，仍exit0，与头注不一致 |
| [concurrency:79–83](../../../probes/team/team-concurrency-probe.mjs#L79-L83)、[atomicity:83–86](../../../probes/team/team-atomicity-probe.mjs#L83-L86) | 两个真实lead分别turn/end1 completed、成员inactive、文件终态齐 | 驱动硬等至少2轮；未保证有第2轮，空转直到deadline |

前四类只复现列出的子判据假绿，不宣称整个probe在坏输入下全绿。scope是退出码错误。驱动错误来自本轮真实入口观察，不靠合成输入推断。

## 根因（已核对）

- 模型文字关键词代替了状态事件、tool call/result归因及真实写盘结果，违背 [证据纪律](../../../docs/testing.md)。
- includes/宽正则代替精确多重集合；恢复全历史扫词代替恢复后新事件。
- 退出条件没有使用真正的完成状态，也没有把每个required判据接到退出码。
- [旧C系卡](../settled_issues/2026-10-04-multi-user-concurrency-bdd.md)所承诺C2 claim失败重试成功与owner占用语义不符，C4同时读写无半截退化为终态行集；修代码前必须保留原目标、辨明错误规格，不改标准迁就绿。

## 暴露的失败类

验收可执行但不独立：真实工具动作被模型转述替代、局部观察推广成全过程保证、command exit掩盖required row失败。横切已核到5条协作/fs探针；不把本轮结论推广成全仓测试均无效。

## 复现

```sh
node probes/fs-taskboard/collaboration-oracle-probe.mjs
# 修前 exit1：5/5 known invalid cases accepted；修后 exit0：0/11 invalid cases accepted
```

该 [保留复现](../../../probes/fs-taskboard/collaboration-oracle-probe.mjs)现在直接使用驱动共用的纯判据，不自抄逻辑；固定反例标签/数量，缺失、重复或非布尔判定exit2。它是零模型诊断；正例及实际required行退出码在keyless回归覆盖，仍不代替真实入口。

真实入口另实跑 `source run/env.sh && node probes/team/team-concurrency-probe.mjs` 与 `source run/env.sh && node probes/team/team-atomicity-probe.mjs`。lead IDs和seq见研究；两个lead正常完成第1轮，managed驱动仍等待。关键日志导出后本轮停止作业，状态killed，未记PASS。任务书“本任务不写”与spawn写入矛盾是本轮模型行为观察，亦见研究。

## 修复关联与验收要求（已批准、修复落地）

用户批准先修判据与驱动；实现理由及输掉的方案见 [事实判据 Note](../../../notes/archived/2026-10-09-collaboration-probe-evidence.md)。已按callId、精确目标路径、成员、任务/revision/owner、水位与messageId收紧，并将required行接到退出码。

本卡修复验收完成：修复后原双成员concurrency真实入口正常结束5/5、exit0；此前4/5是修复前没有共同read放行机制的历史样本，继续保留但不代表当前入口。atomicity4/4、recovery4/4、scope3/3、fs-guard三项真实入口此前均PASS。没有改生产锁/协作协议/preset/vendor。

补充机制证据：[可控同版本竞写研究](../research/collaboration/2026-10-09-deterministic-write-conflict-seam.md)已实际得到两种提交顺序的一胜一FS_STALE_VERSION及败者重读合并；取消version条件的对照双成功，被同一套验收断言判为exit1。这补齐可控机制路径。FS_NOT_OBSERVED不单独证明读后竞争。

补充模型入口证据：[成员 stale 写入口探针](../../../probes/team/member-stale-write-probe.mjs)（决定与判据取舍见 [Note](../../../notes/archived/2026-10-09-member-stale-write-entry.md)）在单成员 + 外部改盘的受控场景下，真实模型第二次运行确实拿到 FS_STALE_VERSION、重读并合并出精确终态；首跑成员上一轮实际read过，但恢复新轮首次write得到 FS_NOT_OBSERVED，被如实判红；它证明跨轮未观察拒绝不能冒充读后stale。场景与真实事件见[成员验收研究](../research/collaboration/2026-10-09-member-stale-write-acceptance.md)。这是**独立仪器**的 C1b 模型入口演示；双成员同轮入口及当前全项复跑见[双成员验收研究](../research/collaboration/2026-10-09-team-read-barrier-acceptance.md)。

1. 本复现5类坏样本全部拒绝，且对应正常样本均通过；不得删除反例或只改文案。
2. 缺工具结果、其他任务/成员/path错误、仅正文宣称完成、重复行、预恢复事件、无第2轮等反例都fail或证据不足，绝不自动pass。
3. 修复后的真实最窄入口正常结束；原C4读侧性质若继续承诺，补正确seam观察而不是只验末尾文件。
4. 逐项按 [验收判断](../../methods/validation-judgment.md)记录结果；真实模型与机制、恢复及人的产品判断分别报告。
