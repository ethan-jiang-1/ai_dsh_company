---
topic: 协作
intent: "补BUG-007真实成员freshness拒写与恢复子路径，区分同轮stale、跨轮未观察拒绝和认领让位。"
---

# 真实成员同轮拒写与重读合并

消费者：[BUG-007](../../_archive/fixed_bugs/BUG-007-collaboration-probe-false-positives.md)、[协作安全issue](../../issues/2026-10-09-collaboration-safety-acceptance.md)。授权：用户要求继续推进BUG-007；本轮不改生产协议、preset或vendor，也不把认领失败让位当C1b。

## 结论与边界

[新真实入口](../../../probes/team/member-stale-write-probe.mjs)成功观察到同一成员同一轮的完整链：真实read基线 → 驱动外部修改 → 首次旧载荷write收到FS_STALE_VERSION → 成员真实read最新内容 → 成员合并成功write → 独立文件精确BASE/EXTERNAL/MEMBER三行，Lead未代写。原team-concurrency的历史4/5不改写成5/5；本场景补C1b成员freshness子路径，不证明双成员同时竞写、任务owner阻止写、认领失败让位或任意时序稳定触发。

上一轮建议把C1b说成认领失败路径是归因错误：原C1b要求文件写入拒绝，C2才检查task claim，角色让位归issue的行为研究。本轮已校正，不通过替换性质关闭BUG。

## 已实跑场景与反馈

命令：`source run/env.sh && node probes/team/member-stale-write-probe.mjs`。使用仓内开发home与排练盘独立临时子目录；一个Lead、一个observer成员，最多五分钟场景、十二分钟总预算，无自动重跑。boot/rpc异常exit2，未触发/判据失败exit1。stdout不打印token。

| 样本 | 场景 | 真实结果 | 判定 |
|---|---|---|---|
| session-56290b3c-2f09-4c63-bc4c-4c50b42ef547 | 成员read-only轮结束后，外部修改，再resume写 | 首次目标write是FS_NOT_OBSERVED；重读后edit，末态还有额外空行 | exit1，不能当stale或精确合并通过 |
| session-5f0732ef-5727-48e9-b19d-629e1cacaba0 | 同轮read后驱动修改；成员send_message提供观察窗口，再旧载荷write | 首write真实FS_STALE_VERSION；再read/write；三行精确终态；Lead与成员completed | exit0，7项全部通过 |

成员身份取自该fresh root的team/member事件及对应childSessionId，不凭名称或模型正文认成员。原始完整事件保留于本机gitignored：[失败证据](../../../runtime/harness-home/member-stale-evidence/session-56290b3c-2f09-4c63-bc4c-4c50b42ef547-evidence.json)、[通过证据](../../../runtime/harness-home/member-stale-evidence/session-5f0732ef-5727-48e9-b19d-629e1cacaba0-evidence.json)、[通过成员事件](../../../runtime/harness-home/member-stale-evidence/session-5f0732ef-5727-48e9-b19d-629e1cacaba0-member.json)、[通过Lead事件](../../../runtime/harness-home/member-stale-evidence/session-5f0732ef-5727-48e9-b19d-629e1cacaba0-lead.json)。fresh clone可运行命令复验，但不能继承本机日志。

失败样本只证明这个组合里跨轮读取未给新轮写授权，不泛化为所有Session观察策略；不依赖这一猜想实施修复。改为同轮后是真实拒写而非注入错误。驱动轮询读取成员日志，只有成功基线read且尚无目标write call、在盘仍是基线才修改。轮询不是原子屏障；如果时序错过，判据失败而不是重跑凑绿。实际stale码、第一次写旧载荷及真实读写顺序一起构成成功路径证据。

## 判据与回归

[纯判据](../../../tools/lib/member-stale-evidence.mjs)由真实驱动复用：成功read必须offset=1、totalLines与lines一致、行号连续及载荷精确；外部修改水位后第一次write实际stale；期间不重读；stale后read真实最新外部载荷，再write/edit精确合并；独立文件精确；Lead无目标write；最新turn completed且总预算未过。

`pnpm test tests/harness/member-stale-evidence.spec.ts`实际4/4通过；覆盖FS_NOT_OBSERVED不能替stale、缺水位、read-only、部分read、错误合并payload、无配对write result、间隔重读、活动轮、预算过期、Lead代写与多空行。使用收紧后的helper重放上述成功成员/Lead实际JSON，7项全true；这不是另一次真模型运行。

## 语义审、收割与下一步

独立只读审核对授权、原C1b、当前实现和已有Note，未发现同轮子路径阻断；建议完整read metadata、明确合并write payload和sticky预算，已落实并用真事件回放验证。原concurrency脚本保持原实现；审阅代理曾误编辑该脚本并启动跨轮实验，父代理核对diff后恢复原文件，未把该失败方案留入实现。没有生产切片需revert。

收割：①首次失败暴露跨轮未观察拒绝与stale不同，留本研究；②7项真实链值得钉，新增纯判据与4项回归；③子Session需父地址、观察归属与事件顺序均显式记录。下一步若继续要关闭原双成员concurrency全项缺口，应设计两成员同轮真实读取后的共同放行，不能以本场景替代；认领失败者让位仍是另一个issue实验。

最终检查实跑：`set -o pipefail; pnpm verify && pnpm test && git diff --check && git -C vendor/dsh status --short` exit0；verify ALL PASS，41 files / 413 tests passed，diff卫生通过，vendor零修改。挂载/行为证据取自上述真实会话与日志回放；安装/发布认证未执行。
