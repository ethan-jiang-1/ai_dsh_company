// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── packageManager 同钉（2026-11-11 接手审计）────────────────────────────────
// 为什么：bootstrap 曾写 root `pnpm@11.7.0` 与 vendor 逐字一致，实际 vendor 随
// dsh-v0.2.1-rc.5 已是 11.28.5；clean clone 的 setup 会先 root 11.7.0、再 vendor 11.28.5。
// 两套 pnpm 本身可运行，但“同钉”是仓的合同；漂了会让 frozen-lockfile / 工具行为不可复现。
// 判据 = 两处 packageManager 都存在、都是 pnpm@x.y.z，且逐字相等。
// 负例留证 2026-11-11：root 11.7.0 / vendor 11.28.5 → 本门禁红；root 对齐 11.28.5 → 绿。
export function run({ root, ok, fail }) {
  const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))
  let rootPm
  let vendorPm
  try {
    rootPm = read('package.json').packageManager
    vendorPm = read('vendor/dsh/package.json').packageManager
  } catch (error) {
    fail('package-manager-parity', `读不到 package.json / vendor/dsh/package.json（vendor 未初始化？）：${String(error?.message ?? error)}`)
    return
  }
  const valid = (value) => typeof value === 'string' && /^pnpm@\d+\.\d+\.\d+(?:[-+].+)?$/.test(value)
  const problems = []
  if (!valid(rootPm)) problems.push(`root packageManager 缺失或不是 pnpm@x.y.z：${String(rootPm)}`)
  if (!valid(vendorPm)) problems.push(`vendor packageManager 缺失或不是 pnpm@x.y.z：${String(vendorPm)}`)
  if (rootPm !== vendorPm) problems.push(`root ${String(rootPm)} ≠ vendor ${String(vendorPm)}（同钉；改 root 后重跑 pnpm install）`)
  problems.length === 0
    ? ok(`package-manager-parity (${rootPm})`)
    : fail('package-manager-parity', problems.join('；'))
}
