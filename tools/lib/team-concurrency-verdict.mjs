// team-concurrency 探针的判分（verdict）纯逻辑（2026-10-14 重构轮自探针内联块抽出）。
// 为什么抽出：原先 keyless spec（collaboration-probe-verdict）靠**源码切片 + vm 求值**取这段逻辑
// （字面锚 "  check('C1a"…'\n} catch (error)'），探针一改格式就假红——backlog-liveness 2026-10-10
// 同款病灶、同款修法（改为直接 import）；抽成普通 import 后判据改动即测试改动，不再怕锚漂。
// 何时跑：被 probes/team/team-concurrency-probe.mjs 与 tests/harness/collaboration-probe-verdict.spec.ts
//   import；改判据后跑 pnpm test（keyless 11 例全覆盖：缺任一证据 ⇒ 恰一红 + exit 1）。
// 判据的机制依据唯一家 = 探针头注（C1a–C2c）；本模块只做「证据 → 判据行」的纯映射，不碰 IO。

/** 判据行：一条 check 的全部输入（label / ok / 诊断 detail）——顺序即输出顺序。 */
export function concurrencyVerdict({ evidence, barrier, barrierReleased, complete, file }) {
  return [
    { label: 'C1a 文件终态精确含 w1/w2 各一行（无重复/额外行）', ok: Boolean(evidence.fileExact && barrier.publications && barrier.noLeadWrites), detail: JSON.stringify(file) },
    { label: 'C1b 同轮屏障读取后真实stale且重读合并发布', ok: Boolean(barrierReleased && barrier.barrierReads && barrier.recovery), detail: JSON.stringify(barrier) },
    { label: 'C2a 同 revision claim 一胜一拒且owner归属匹配', ok: Boolean(evidence.claimRace), detail: JSON.stringify({ task: evidence.task, claims: evidence.claims.map(claim => ({ name: claim.name, revision: claim.expectedRevision, code: claim.result?.error?.code })) }) },
    { label: 'C2b w1/w2 回报均有真实 queued + delivered 事件', ok: Boolean(evidence.reports), detail: '' },
    { label: 'C2c lead 与两成员 turn 均正常结束', ok: Boolean(complete && evidence.membersEnded), detail: '' },
  ]
}

/** 判分行 → 汇总（任一红 ⇒ exit 1）。探针的收尾日志与退出码都从这取数。 */
export function verdictOutcome(rows) {
  const failed = rows.filter(row => !row.ok).length
  return { failed, total: rows.length, exitCode: failed === 0 ? 0 : 1 }
}
