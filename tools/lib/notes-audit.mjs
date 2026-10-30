// notes/ 一致性审计的**纯逻辑**（2026-10-30 立）。
//
// 为什么：notes/ 的噪声不是一次性的——每次机制改口都会新增一层旧文；没有机械面，
// 只能靠人记得回扫。这里只做**可机械判**的部分：死路径、取代缺回链、收据特征、
// 无活引用。它输出**工作表**，不判语义、不判该删该留——语义分诊住
// `.agents/skills/notes-consistency-audit/SKILL.md`。
//
// 边界：只读；不跑 git、不读会话；不把 `notes/` 当第二本账（不生成索引文件）。
import { existsSync } from 'node:fs'
import { basename, dirname, join, normalize } from 'node:path'

const NOTE_DATE = /^(\d{4}-\d{2}-\d{2})-/
const NOTE_LINK = /\]\(([^)\s]+?\.md)(?:#[^)]*)?\)/g
const CODE_PATH = /`([^`\s]+?\.(?:mjs|js|ts|tsx|md|json|ya?ml|sh))`/g
const REPO_ROOTS = new Set([
  'packages', 'docs', 'checks', 'tools', 'tests', 'probes', 'run', '_backlog',
  'notes', 'snapshots', 'runtime', 'company-workspace', '.agents', '.github', '_dist',
])

// 收据特征只查「标题 / 状态行 / 前 4 行 / 性质行」——正文里的“基线”“批次”多半是证据，不是体裁。
// 状态行常带证据词（“收据 = 八个 commit”），所以只认自述句与标题体裁，不认状态行里的泛词。
const RECEIPT_SIGNALS = [
  [/不是新决定/, '自述「不是新决定」'],
  [/只记(测量|结果)/, '自述「只记测量/结果」'],
  [/不是产品合同/, '自述「不是产品合同」'],
  [/一次真环境模拟/, '自述「一次真环境模拟」'],
  [/收尾回执/, '标题/性质是收尾回执'],
  [/^#\s*第[一二三四五六七八九十\d]+场/m, '标题是演练场次'],
  [/^#\s*批[ A-Z0-9]/m, '标题是批次进度'],
  [/批次收尾/, '标题是批次收尾'],
  [/^#.*(基线|走查|模拟)/m, '标题是基线/走查/模拟'],
]

/** 文件名日期（`YYYY-MM-DD-<slug>.md`）；不合命名 = null。 */
export function noteDate(file) {
  const m = basename(file).match(NOTE_DATE)
  return m?.[1] ?? null
}

/** 首个 H1；没有 = null。 */
export function noteTitle(text) {
  const m = String(text).match(/^#\s+(.+)$/m)
  return m?.[1]?.trim() ?? null
}

/** 首部「状态：」行；没有 = null。 */
export function noteStatus(text) {
  const line = String(text)
    .split('\n')
    .slice(0, 12)
    .map(row => row.trim())
    .find(row => /^状态[:：]/.test(row))
  return line ?? null
}

/** 生命周期词：目录优先（implemented/archived），其余看状态行。 */
export function lifecycleOf(file, status) {
  if (file.includes('/archived/')) return 'archived'
  if (file.includes('/implemented/')) return 'implemented'
  return statusKind(status) === 'implemented' ? 'implemented' : 'other'
}

/** 状态行正文是否是生命周期词（去掉「状态：」与可能的加粗）。 */
function statusKind(status) {
  const body = String(status ?? '')
    .replace(/^状态[:：]\s*/, '')
    .replace(/^\*\*/, '')
  return /^(implemented|已交付|已消化)/i.test(body) ? 'implemented' : 'other'
}

/** Markdown 里指向 `.md` 的相对链接，解析为相对仓库根的路径（去 `#anchor`）。 */
export function noteLinks(file, text) {
  const out = new Set()
  for (const m of String(text).matchAll(NOTE_LINK)) {
    const href = m[1]
    if (/^(https?:|#|\/)/.test(href)) continue
    out.add(normalize(join(dirname(file), href.replace(/#.*$/, ''))))
  }
  return [...out]
}

/** 反引号里的仓库路径；去掉示例/负例/占位，去重。 */
export function repoPaths(text) {
  const out = new Set()
  for (const m of String(text).matchAll(CODE_PATH)) {
    let p = m[1].replace(/[),.;]+$/, '').replace(/#.*$/, '').replace(/:\d+$/, '')
    if (/[:<>*?{}…]/.test(p)) continue
    if (/^(https?|mailto):/.test(p)) continue
    if (!REPO_ROOTS.has(p.split('/')[0])) continue
    if (/(^|\/)(zz-|zzz-|2099-)/.test(p)) continue
    out.add(p)
  }
  return [...out]
}

/**
 * 路径是否存在。`vendor/dsh` 是钉住的只读源码树，notes 里大量引用它的内部路径
 * （`packages/...`、`docs/config-catalog.md`），裸根找不到时回落到 vendor。
 */
export function pathExists(root, p, exists = existsSync) {
  if (exists(join(root, p))) return true
  // 只有 docs/ 与 packages/ 在 notes 里常被当作 vendor 内部路径引用；其余仓库目录不回落，
  // 否则“根上已死、vendor 同路径还在”会被误判为活（2026-10-30 复核）。
  if (!p.startsWith('docs/') && !p.startsWith('packages/')) return false
  return exists(join(root, 'vendor', 'dsh', p))
}

/** 该死路径（按给定 root 判定）；返回去重后的路径。 */
export function deadPaths(root, text, exists = existsSync) {
  return repoPaths(text).filter(p => !pathExists(root, p, exists))
}

/** 收据/状态快照特征；返回命中的理由（空数组 = 不像收据）。 */
export function receiptReasons(text) {
  if (hasDecisionSection(text)) return []
  const rows = String(text).split('\n')
  const head = rows.slice(0, 4).join('\n')
  const nature = rows.find(row => /^\s*性质[:：]/.test(row)) ?? ''
  const scope = `${noteTitle(text) ?? ''}\n${noteStatus(text) ?? ''}\n${head}\n${nature}`
  return RECEIPT_SIGNALS.filter(([re]) => re.test(scope)).map(([, why]) => why)
}

/** 是否有「## 决定 / ## 决策」节（容许 `## ② 决定（机制栈）` 这类编号前缀）。 */
export function hasDecisionSection(text) {
  return /^##[^\n]*(决定|决策)/m.test(String(text))
}

/** 把围栏代码块替换成空行（保留行号）；门禁不把示例/代码里的“取代”当指针。 */
function maskFences(text) {
  let fenced = false
  return String(text).split('\n').map(line => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return '' }
    return fenced ? '' : line
  }).join('\n')
}

/** 目标文里是否真的提到了源文件名（整词；`new` 不能命中 `newer`）。 */
function mentionsBasename(text, basenameText) {
  const escaped = basenameText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`).test(maskFences(text))
}

/**
 * 取代回链：implemented Note 说“取代”并链接另一篇 implemented Note 时，目标文必须出现源文件名。
 * archived 目标豁免（冻结层不回写，由新 Note 单侧承载）。
 * 判据是**启发式**：只认显式“取代”行；否定/被动/围栏代码不算；整词匹配；同目标去重。
 * 返回 `{file, line, target}`。
 */
export function supersessionBacklinks(notes) {
  const byFile = new Map(notes.map(n => [normalize(n.file), n]))
  const seen = new Set()
  const out = []
  for (const note of notes) {
    const file = normalize(note.file)
    if (!file.includes('/implemented/')) continue
    const sourceName = basename(file, '.md')
    const masked = maskFences(note.text)
    for (const [index, line] of masked.split('\n').entries()) {
      if (!/取代/.test(line)) continue
      if (/(不|未|无|没有|无需|不必|不会)[^，。；\n]{0,8}取代/.test(line)) continue
      if (/被[^，。；\n]{0,60}取代/.test(line)) continue
      for (const m of line.matchAll(NOTE_LINK)) {
        const target = normalize(join(dirname(file), m[1].replace(/#.*$/, '')))
        if (target === file || !byFile.has(target)) continue
        if (!target.includes('/implemented/')) continue
        if (mentionsBasename(byFile.get(target).text, sourceName)) continue
        const key = `${file}:${index + 1}:${target}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ file, line: index + 1, target })
      }
    }
  }
  return out
}

/**
 * 审计一组 Note。
 * @param {ReadonlyArray<{file: string, text: string}>} notes 相对仓库根的路径 + 全文
 * @param {{root?: string, exists?: (p: string) => boolean}} [options]
 */
export function auditNotes(notes, options = {}) {
  const root = options.root ?? process.cwd()
  const exists = options.exists ?? existsSync
  const byFile = new Map(notes.map(n => [normalize(n.file), n]))
  const inbound = new Map(notes.map(n => [normalize(n.file), 0]))
  const inboundMissing = supersessionBacklinks(notes)

  for (const note of notes) {
    for (const target of noteLinks(note.file, note.text)) {
      if (target === normalize(note.file)) continue
      if (byFile.has(target)) inbound.set(target, inbound.get(target) + 1)
    }
  }

  const rows = notes.map(note => {
    const file = normalize(note.file)
    const status = noteStatus(note.text)
    const lifecycle = lifecycleOf(file, status)
    const receipt = receiptReasons(note.text)
    const links = noteLinks(file, note.text).filter(p => byFile.has(p) && p !== file)
    const missingBacklinks = inboundMissing
      .filter(item => item.file === file)
      .map(item => ({ line: item.line, target: item.target }))
    return {
      file,
      date: noteDate(file),
      title: noteTitle(note.text),
      status,
      lifecycle,
      lines: note.text.split('\n').length,
      inbound: inbound.get(file) ?? 0,
      outbound: links.length,
      receipt,
      hasDecision: hasDecisionSection(note.text),
      deadPaths: deadPaths(root, note.text, exists),      missingBacklinks,
      statusMismatch: file.includes('/implemented/') && statusKind(status) !== 'implemented',
    }
  })

  const pick = predicate => rows.filter(predicate).map(row => row.file)
  return {
    rows,
    summary: {
      implemented: rows.filter(row => row.lifecycle === 'implemented').length,
      archived: rows.filter(row => row.lifecycle === 'archived').length,
      receipts: pick(row => row.receipt.length > 0),
      noDecision: pick(row => row.lifecycle === 'implemented' && row.receipt.length === 0 && !row.hasDecision),
      deadPaths: rows
        .filter(row => row.lifecycle === 'implemented' && row.deadPaths.length > 0)
        .map(row => ({ file: row.file, paths: row.deadPaths })),
      missingBacklinks: rows
        .filter(row => row.missingBacklinks.length > 0)
        .map(row => ({ file: row.file, links: row.missingBacklinks })),
      orphans: pick(row => row.lifecycle === 'implemented' && row.inbound === 0),
      statusMismatch: pick(row => row.statusMismatch),
    },
  }
}
