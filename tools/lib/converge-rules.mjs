/**
 * converge.mjs 的纯判定规则（判据单一来源；IO 留在驱动脚本，tests/company/converge-rules.spec.ts 消费）。
 * 三条规则各有自己的事故卡：journal 归属 = 2026-10-12 前缀误吞教训（BUG-014 卡引用）；
 * 查重锚 = BUG-014（子串查重假跳过）；证据目录解析 = BUG-015（日期耦合写断链）。
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** journal 文件名 → 所属 slug；无属主 = null（当轮散件，不清）。
 *  规则：剥日期后精确等于 slug，或以 slug- 开头且**不与任何其他 slug 精确同名**
 *  （裸前缀匹配会误吞后继 slug——2026-10-12 实测：收敛 ai-coding-security-2026 时
 *  把未闭合的 -light / -v2 两 slug 的 journal 一并清了）。 */
export function journalSlug(fileName, slug, allSlugs = []) {
  const stripped = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
  if (stripped !== slug && allSlugs.includes(stripped)) return null // 它是另一个 slug 的正主
  return stripped === slug || stripped.startsWith(`${slug}-`) ? fileName : null
}

/** CHARTER 是否已有该 slug 的历史纪要**条目**。
 *  锚 = 条目行形「- <YYYY-MM-DD> · <slug>（」——整文件子串查重（includes）会被
 *  引用路径里的 slug 字样误触（BUG-014：COO 的证据路径含 slug → 假跳过、条目漏登）。 */
export function charterHasEntry(charterText, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^\\s*-\\s*\\d{4}-\\d{2}-\\d{2}\\s*·\\s*${esc}（`, 'm').test(charterText)
}

/** 解析某已收敛 slug 的证据目录名（convergence-<日期>）。
 *  扫 snapshots/archive/ 下各 convergence-* 目录，认「<目录>/<dirName> 在场」为证据；
 *  多日并存取最新（ISO 日期字典序 = 时间序）；无证据目录 = throw（fail-loud——
 *  BUG-015：写死运行日曾静默写出断链指针）。 */
export function resolveEvidenceDir(archiveRoot, dirName) {
  const matches = []
  if (existsSync(archiveRoot)) {
    for (const d of readdirSync(archiveRoot)) {
      if (!/^convergence-\d{4}-\d{2}-\d{2}$/.test(d)) continue
      if (existsSync(join(archiveRoot, d, dirName))) matches.push(d)
    }
  }
  if (matches.length === 0) {
    throw new Error(`无收敛证据目录：snapshots/archive/convergence-*/ 下没有 ${dirName}（backfill 只补已收敛 slug）`)
  }
  matches.sort()
  return matches[matches.length - 1]
}
