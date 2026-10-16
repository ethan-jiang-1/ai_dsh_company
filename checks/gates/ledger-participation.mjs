// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { canonicalParticipation } from '../../tools/lib/converge-rules.mjs'

// ── 台账「参与」列口径门禁（ledger-participation，2026-10-16 立）──────────────────
// 为什么：2026-10-16 真动议诊断实测——`kb/motion-ledger.md` 的「参与」列 **36 行 18 种写法**，
// 同一集合有 2–4 种拼写（`CEO+CFO+COO` / `CEO+COO+CFO`、`CEO+全职能` / `全员五人`…），
// 于是「哪些角色参与了哪类动议」的矩阵**不可机械复算**，下一份经营件又照着错的预登记写。
// 台账是经营历史的唯一事实家；它的列口径是**机械可判**的 ⇒ 按「机械不变量进执行门禁」立此门禁。
//
// 判据（两条，都是口径不是文风）：
//   ① 取值只有两种形状：**五个角色名之一到五个的 `+` 连接**，或集合恰好五人的 `全员五人`；
//   ② 角色顺序固定 = `COMPANY_ROLE_IDS` 的**降序**（CEO→VP-Eng→VP-Sales→COO→CFO）；
//      同集合不同拼写是本门禁要抓的腐化（顺序不固定 ⇒ 字符串比对无意义）。
// ⚠ 本门禁**不证明**的：不证明「列出了正确的参与者」——那要读该场的 journal（人判）。
//   它证明的是「这一列可以被机器当集合读」。
// 负例留证 2026-10-16（实地造红 → 还原 → 绿）：
//   ① 把某行改成 `CEO+COO+CFO`（顺序非规范）→ 红；
//   ② 改成 `CEO+VP-Eng+VP-Sales`（合法子集，仍绿）+ 追加一个 `CEO+CEO`（重复）→ 红；
//   ③ 把某行改成 `全员` （集合不完整）→ 红。还原 → 全绿。
export function run({ root, ok, fail }) {
  const LEDGER = join(root, 'company-workspace', 'kb', 'motion-ledger.md')
  // 判据单一来源 = lib `canonicalParticipation`（写入点 converge.mjs 与门禁同一把尺）；
  // 非角色名/空 ⇒ lib 给 `—`，在本门禁里视为不合规。
  const canonical = raw => {
    const value = raw.trim()
    if (value === '') return undefined
    const want = canonicalParticipation(value)
    return want === '—' ? undefined : want
  }
  let text
  try {
    text = readFileSync(LEDGER, 'utf8')
  } catch {
    fail('ledger-participation', 'company-workspace/kb/motion-ledger.md 不在盘上——台账是经营历史唯一事实家，不许消失')
    return
  }
  const offenders = []
  let rows = 0
  for (const [index, line] of text.split('\n').entries()) {
    if (!line.startsWith('| ') || line.startsWith('| slug') || line.startsWith('|---')) continue
    rows += 1
    const raw = line.split('|')[4] ?? ''
    const want = canonical(raw)
    if (want === undefined) {
      offenders.push(`第 ${index + 1} 行：参与列含非角色名（或空）——${JSON.stringify(raw.trim())}`)
      continue
    }
    if (want !== raw.trim()) {
      offenders.push(`第 ${index + 1} 行：参与列写法非规范——${JSON.stringify(raw.trim())} ⇒ 应为 ${JSON.stringify(want)}`)
    }
  }
  offenders.length === 0
    ? ok(`ledger-participation ×${rows}（五角色集合、固定序；口径唯一家 = 本门禁注释）`)
    : fail('ledger-participation', `台账「参与」列口径漂移（${offenders.length} 行）：\n      ${offenders.slice(0, 8).join('\n      ')}`)
}
