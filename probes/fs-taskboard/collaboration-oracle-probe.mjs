#!/usr/bin/env node
// 状态：常驻
// 何时跑：BUG-007 修复前后或协作探针判据改变时；输入已证实反例，零模型、秒级。
// 退出码：0 = 完整坏样本集均被判拒；1 = 判据误接受；2 = 执行失败或反例缺失。
// 判据纯函数唯一家 = tools/lib/collaboration-oracle-verdict.mjs（单测直连，不再切片求值）。
import {
  collectCollaborationOracleFindings,
  evaluateCollaborationOracle,
} from '../../tools/lib/collaboration-oracle-verdict.mjs'

try {
  const findings = collectCollaborationOracleFindings()
  for (const item of findings) {
    console.log(`${item.accepted ? 'FAIL' : 'PASS'} ${item.label}: ${JSON.stringify(item.evidence)}`)
  }
  const verdict = evaluateCollaborationOracle(findings)
  console.log(`collaboration-oracle-probe: ${verdict.exitCode === 0 ? 'PASS' : 'FAIL'}; ${String(verdict.acceptedCount)}/${String(verdict.total)} invalid cases accepted`)
  process.exitCode = verdict.exitCode
} catch (error) {
  console.error(`collaboration-oracle-probe: ERROR ${error.message}`)
  process.exitCode = 2
}
