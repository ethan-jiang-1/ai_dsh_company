#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 packages/company-pack/src/** 后（已接进 `pnpm lint` 与 pre-push）。
// 成本：keyless（TypeScript Compiler API 扫双 tsconfig，不调模型/不起浏览器；~1s）。
// 用法：node checks/audit/company-static-audit.mjs [--strict] [--json]
// 判据（实现 = checks/lib/company-static-audit.mjs）：
//   R1 must-use-boundary（WorkspaceTextRead / DeliverablesCatalog / PendingApprovals / MotionLedger / workspaceFiles.read）
//   R2 no-literal-cjk-or-punct（src/client/** 除字典外零字面中文与 .join('、'|'；')；src/lib/** 按文件棘轮）
//   R3 no-type-escape（禁 undefined/null as never；其余 as never / JSON.parse as T 只读计数）
//   R4 hygiene-smells（静默 catch / jsx defaultValue / fail-open 只读基线）
// 不证明：运行时行为 / E2E 交互；真 DOM 与模型链路归 ui-scene / preset 档。
import { repositoryRoot as ROOT } from '../../tools/lib/core/repository-layout.mjs'
import { formatStaticAuditReport, runStaticAudit } from '../lib/company-static-audit.mjs'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const asJson = args.includes('--json')

const report = runStaticAudit(ROOT)

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(formatStaticAuditReport(report))
}

if (strict && report.violations.length > 0) {
  process.exit(1)
}
