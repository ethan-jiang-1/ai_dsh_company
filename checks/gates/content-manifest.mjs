// 状态：常驻
// 何时跑：新增/改名/移动 content 文件，或调整加载层（T0/T1/T2）后；发布前。跑法 = pnpm verify。
//
// 清单即契约（2026-11-09 三层）：`content/manifest.json` 逐份声明文件与 tier。
// 判据分两段，**合同段不在本文件**（2026-11-19 BUG-265..270/273/274）：
//   ① 合同段 = `tools/lib/company/content-contract.mjs`（与 tarball checker 同一份实现）：version、
//      inventory 双向对账、路径跨平台安全、symlink 拒绝、tiers 引用闭包、必需目录/关键件、
//      JSON 跨引用。**不在这里再写一遍**——两份判据就是 BUG-274 的来源。
//   ② 本地段（本文件）：tier 预算（t0 ≤6KB / t1 ≤4KB / t2 单件 ≤6KB）、tier 名封闭集、
//      文件头 `加载：` 与 manifest tier 一致（agent 的读法 vs host 的读法）。
// 负例留证（建门时实跑）：在 generic/ 加一份未登记文件 → ①红；把 T1 文件加 5KB → ②红；还原 → 绿。
// 负例留证 2026-11-19：content/company/ 加一份未登记 .md → ①「未登记的 content 文件」红；删除 → 绿。
// 负例留证 2026-11-19：删 content/templates/ 整目录 → ①「必需目录缺内容」红；还原 → 绿。
// 负例留证 2026-11-19：content/ 下放一个 symlink 文件 → ①「出现 symlink」红；删除 → 绿。
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { contentManifestProblems, listContentFiles, requiredContentDirs } from '../../tools/lib/company/content-contract.mjs'

const CONTENT = 'packages/company-pack/content'
const MANIFEST = 'manifest.json'
const BUDGETS = { t0: 6_144, t1: 4_096, t2: 6_144 }
const TOTAL_BUDGETS = { t0: 6_144, t1: 4_096 }

/** 从文件头解析 `加载：` 声明的 tier；没有声明返回 null。 */
function declaredTier(text) {
  const head = text.split('\n').slice(0, 12).join('\n')
  const match = /加载：([^；;。\n]+)/.exec(head)
  if (match === null) return null
  const value = match[1]
  if (/legacy/i.test(value)) return 'legacy'
  if (/\bT0\b|常驻/.test(value)) return 't0'
  if (/\bT1\b|摘要/.test(value)) return 't1'
  if (/\bT2\b|按需/.test(value)) return 't2'
  return null
}

/**
 * content 清单的全部问题（合同段 + 本地段）。导出供 keyless spec 对合成 content 树直接调用。
 * @param {string} root 仓库根
 * @returns {{problems: string[], listed: Map<string,string>, tiers: Record<string, unknown>}}
 */
export function contentProblems(root) {
  const content = join(root, CONTENT)
  const listed = new Map()
  if (!existsSync(join(content, MANIFEST))) return { problems: [`${CONTENT}/${MANIFEST} 缺失`], listed, tiers: {} }
  let manifest
  try {
    manifest = JSON.parse(readFileSync(join(content, MANIFEST), 'utf8'))
  } catch (error) {
    return { problems: [`${MANIFEST} 不可解析：${String(error)}`], listed, tiers: {} }
  }
  const { files, symlinks } = listContentFiles(content)
  const problems = contentManifestProblems({
    manifest,
    files,
    symlinks,
    read: rel => readFileSync(join(content, rel), 'utf8'),
    requiredDirs: requiredContentDirs(),
  })
  const tiers = manifest?.tiers ?? {}
  for (const [tier, entries] of Object.entries(tiers)) {
    if (!(tier in BUDGETS) && tier !== 'legacy') { problems.push(`未知 tier：${tier}`); continue }
    if (!Array.isArray(entries)) { problems.push(`tier ${tier} 不是数组`); continue }
    for (const rel of entries) {
      if (typeof rel === 'string' && existsSync(join(content, rel))) listed.set(rel, tier)
    }
    if (tier in TOTAL_BUDGETS) {
      const total = entries.reduce((sum, rel) => typeof rel === 'string' && existsSync(join(content, rel)) ? sum + statSync(join(content, rel)).size : sum, 0)
      if (total > TOTAL_BUDGETS[tier]) problems.push(`${tier} 合计 ${String(total)}B > ${String(TOTAL_BUDGETS[tier])}B`)
    }
  }
  for (const rel of tiers.t2 ?? []) {
    if (typeof rel !== 'string' || !existsSync(join(content, rel))) continue
    const size = statSync(join(content, rel)).size
    if (size > BUDGETS.t2) problems.push(`t2 单文件 ${rel} ${String(size)}B > ${String(BUDGETS.t2)}B（拆成更具体的问题）`)
  }
  // 文件头的 `加载：` 是 agent 的读法；manifest 是 host 的读法。两者不一致 = 两份事实。
  for (const [rel, tier] of listed) {
    const declared = declaredTier(readFileSync(join(content, rel), 'utf8'))
    if (declared !== null && declared !== tier) problems.push(`tier 声明不一致：${rel}（manifest=${tier}，文件头=${declared}）`)
  }
  return { problems, listed, tiers }
}

export function run({ root, ok, fail }) {
  const { problems, listed, tiers } = contentProblems(root)
  const count = tier => Array.isArray(tiers[tier]) ? tiers[tier].length : 0
  problems.length === 0
    ? ok(`content-manifest（${String(listed.size)} 份；T0 ${String(count('t0'))} / T1 ${String(count('t1'))} / T2 ${String(count('t2'))}）`)
    : fail('content-manifest', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
