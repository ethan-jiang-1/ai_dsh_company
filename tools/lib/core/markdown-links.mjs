/** Bounded, read-only GFM reference checks for current repository source documents. */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { repositoryRoot } from './repository-layout.mjs'

// Reuse the pinned vendor gate's declared parser dependencies. Requires an installed
// workspace; no transitive-store guessing or vendor writes.
// 解析基址两级（2026-09-27 CI 首跑红后立）：① vendor/dsh 根包——本地完整引导（vendor 自带
// install 的 store）时的形状；② vendor 子包 ui-primitives——它声明**同一组**解析器（版本区间
// 与 vendor 根 pin 逐字一致，root store 单一版本 2.0.3/3.1.0/3.0.0 两边相同），根 workspace
// install 即覆盖（根 workspace 刻意不含 vendor/dsh 根包，只挂其子包——见 pnpm-workspace.yaml）。
// CI 只跑根 install（.github/workflows/ci.yml）靠 ② 解析。
// 仓库根按「向上找 workspace 根」解析，**不按固定深度**：lib 分组/搬家不得改变解析面；
// 实现单源 = repository-layout 的 findRepositoryRoot（本文件不再各写一份）。
const repoRoot = repositoryRoot
const parserBases = [
  pathToFileURL(join(repoRoot, 'vendor/dsh/package.json')),
  pathToFileURL(join(repoRoot, 'vendor/dsh/packages/client/ui-primitives/package.json')),
]
const resolveParser = (id) => {
  for (const base of parserBases) {
    try { return createRequire(base).resolve(id) } catch { /* 换下一基址 */ }
  }
  throw new Error(`${id} 在 vendor 根包与 ui-primitives 成员处都解析不到（引导 = guides/bootstrap 的 install）`)
}
const { fromMarkdown } = await import(pathToFileURL(resolveParser('mdast-util-from-markdown')).href)
const { gfmFromMarkdown } = await import(pathToFileURL(resolveParser('mdast-util-gfm')).href)
const { gfm } = await import(pathToFileURL(resolveParser('micromark-extension-gfm')).href)

// These are not source corpora. Active implemented/postmortem Notes ARE sources (no rejected/ dir).
const EXCLUDED = new Set(['node_modules', 'vendor', 'lib', 'dist', 'build', 'generated', 'dev',
  'snapshots', 'journal', 'deliverables', 'deliverables-archive', 'archived', 'archive', 'historical'])

/**
 * 随包分发的只读内容（2026-11-03 自 workspace 迁入 `content/`）：它是**要发布到任意磁盘的运行语料**，
 * 不是本仓的源文档——手册里的相对指针是**部署相对**的：在运行盘读到才成立，在 pack 家读到的深度
 * 没有意义。所以这里按**路径**排除；安装形状的链接校验由 `shipped-links` 门禁按 content 基准负责
 * （2026-11-03 同 diff 迁移）。不按名字排除，避免误伤任何叫 content 的目录。
 */
const EXCLUDED_PATHS = new Set(['packages/company-pack/content'])

/** Discover current Markdown from disk, including untracked/new Notes; never follow directory symlinks. */
export function sourceMarkdownFiles(root) {
  const files = new Map()
  const add = (file) => {
    if (extname(file).toLowerCase() !== '.md') return
    const real = realpathSync(file)
    if (!files.has(real)) files.set(real, file)
  }
  const walk = (dir, recursive = true) => {
    if (!existsSync(dir) || !lstatSync(dir).isDirectory()) return
    if (EXCLUDED_PATHS.has(relative(root, dir))) return
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || EXCLUDED.has(entry.name)) continue
      const file = join(dir, entry.name)
      if (entry.isDirectory()) { if (recursive) walk(file) }
      else if (entry.isFile() || entry.isSymbolicLink() && statSync(file).isFile()) add(file)
    }
  }
  walk(root, false)
  for (const dir of ['docs', 'notes', '_backlog', 'checks', 'probes', 'tools', 'packages/company-pack', 'company-workspace/templates']) walk(join(root, dir))
  // Agent skills are live agent-facing instructions whose links must not rot; the generic
  // walk above skips dot-directories, so the skills root is named explicitly (2026-10-08 dev-skills-pilot).
  walk(join(root, '.agents/skills'))
  // The evidence payload remains frozen; the root contract is current navigation.
  for (const file of ['snapshots/README.md', 'company-workspace/AGENTS.md', 'company-workspace/kb/org.md']) {
    if (existsSync(join(root, file))) add(join(root, file))
  }
  const kb = join(root, 'company-workspace/kb')
  if (existsSync(kb) && lstatSync(kb).isDirectory()) {
    for (const entry of readdirSync(kb, { withFileTypes: true })) {
      if (!entry.isDirectory() || EXCLUDED.has(entry.name) || entry.name.startsWith('.')) continue
      const charter = join(kb, entry.name, 'CHARTER.md')
      if (existsSync(charter)) add(charter)
    }
  }
  return [...files.values()].sort()
}

// 进程内有界 AST 缓存（BUG-406/407）：返回只读 mdast 树，调用方不得就地修改节点；
// 4096 上限覆盖全仓 1330+ 份源/归档文档及剥离 frontmatter 后的正文变体，消除 run-gates 下 md-links/backlog-liveness/link-debt 间缓存清零抖动。
const MAX_AST_CACHE_ENTRIES = 4096
const astCache = new Map()
export const parseMarkdownAst = (source, maxEntries = MAX_AST_CACHE_ENTRIES) => {
  if (maxEntries <= 0) return fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  const cached = astCache.get(source)
  if (cached !== undefined) return cached
  const tree = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  if (astCache.size >= maxEntries) astCache.clear()
  astCache.set(source, tree)
  return tree
}
const parse = parseMarkdownAst
const visit = (node, fn) => { fn(node); for (const child of node.children ?? []) visit(child, fn) }

// Rendered Markdown text, not raw heading syntax: code, links, images, emphasis and entities.
export const renderedNodeText = (node) => {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? ''
  if (node.type === 'break') return ' '
  return (node.children ?? []).map(renderedNodeText).join('')
}
const renderedText = renderedNodeText

/** Pinned vendor verify-md-links.ts semantics, not a claim of full Unicode GitHub renderer parity. */
function documentAnchors(tree) {
  const anchors = new Set()
  const occurrences = new Map()
  visit(tree, (node) => {
    if (node.type !== 'heading') return
    const base = renderedText(node).toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-')
    let result = base
    let bump = occurrences.get(base) ?? 0
    while (anchors.has(result)) result = `${base}-${++bump}`
    occurrences.set(base, bump)
    anchors.add(result)
  })
  visit(tree, (node) => {
    if (node.type !== 'html') return
    const html = node.value.replace(/<!--[\s\S]*?-->/g, '')
    for (const match of html.matchAll(/<a\b[^>]*\sid\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
      anchors.add(match[1] ?? match[2])
    }
  })
  return anchors
}

/** Resolve local Markdown link/definition targets for index membership; prose names are not links. */
export function markdownLinkTargets(file, source = readFileSync(file, 'utf8')) {
  const targets = new Set()
  visit(parse(source), (node) => {
    if (!['link', 'definition'].includes(node.type)) return
    const url = node.url
    if (url.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return
    try {
      const path = decodeURIComponent(url.split('#')[0].split('?')[0])
      targets.add(path === '' ? resolve(file) : resolve(dirname(file), path))
    } catch { /* Malformed escapes are reported by validateMarkdownLinks. */ }
  })
  return targets
}

// 本地证据树（与「缺失目标跳过」同一口径）：里面的字节不随 repo handoff 走，链接只作本地观察。
// 与 bare-path 的 RUNTIME_PREFIXES 同边界；新增证据树时两处一起改。
export const EVIDENCE_PREFIXES = ['runtime/', 'company-workspace/', 'snapshots/']
// 目录本身（`company-workspace`，无尾斜杠）与树下文件同属证据面。
export const isEvidencePath = (rel) => EVIDENCE_PREFIXES.some(prefix => rel === prefix.slice(0, -1) || rel.startsWith(prefix))

/**
 * Check Markdown links/images/definitions with cached target headings and source line diagnostics.
 * Root-absolute URLs and schemes are renderer-owned; non-Markdown fragments are not interpreted.
 * Raw HTML hrefs and undefined reference-looking prose are outside this Markdown-only gate.
 *
 * 两遍：先收集链接，再批量判 gitignored（一次 git 调用），最后产出违例。判据三类：
 * `outside`（相对链接逃出仓库根）、`ignored`（目标 gitignored：本机有、干净 clone 无）、
 * `target`/`anchor`/`encoding`（原有）。
 *
 * `options.isIgnored(targets) -> Set<absPath>` 由 judge 层注入（git 查询不得住 tools/lib；
 * 见 tests/repo/structure/layering.spec.ts 的分层守卫）。不注入 = 不判 ignored。
 */
export function validateMarkdownLinks(root, options = {}) {
  const files = sourceMarkdownFiles(root)
  const trees = new Map()
  const anchorSets = new Map()
  const treeOf = (file) => {
    if (!trees.has(file)) trees.set(file, parse(readFileSync(file, 'utf8')))
    return trees.get(file)
  }
  const anchorsOf = (file) => {
    if (!anchorSets.has(file)) anchorSets.set(file, documentAnchors(treeOf(file)))
    return anchorSets.get(file)
  }
  const entries = []
  for (const file of files) {
    visit(treeOf(file), (node) => {
      if (!['link', 'image', 'definition'].includes(node.type)) return
      const url = node.url
      if (url.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return
      const hash = url.indexOf('#')
      let path, fragment
      try {
        path = decodeURIComponent((hash < 0 ? url : url.slice(0, hash)).split('?')[0])
        fragment = hash < 0 ? '' : decodeURIComponent(url.slice(hash + 1))
      } catch {
        // A malformed URL escape is a diagnostic, not an uncaught decoder error.
        entries.push({ file, line: node.position.start.line, url, reason: 'encoding' })
        return
      }
      entries.push({ file, line: node.position.start.line, url, path, fragment, target: path === '' ? file : resolve(dirname(file), path) })
    })
  }
  // 忽略判定由调用方注入（judge 层可 spawn git；本模块保持 keyless 纯逻辑，见 tests/repo/structure/layering.spec）。
  const existing = entries.filter(entry => entry.target !== undefined && existsSync(entry.target)).map(entry => entry.target)
  const ignored = options.isIgnored === undefined ? new Set() : options.isIgnored(existing)
  const violations = []
  let linkCount = 0
  for (const entry of entries) {
    linkCount++
    const report = (reason) => violations.push({ file: relative(root, entry.file), line: entry.line, url: entry.url, reason })
    if (entry.reason !== undefined) { report(entry.reason); continue }
    const targetRel = relative(root, entry.target).split(sep).join('/')
    // 相对链接必须留在仓库内：逃出根的目标只在作者机器上与相邻研究树重合，clone 必断。
    if (targetRel === '..' || targetRel.startsWith('../')) { report('outside'); continue }
    if (!existsSync(entry.target)) {
      // runtime/ 与 company-workspace/ 不是产品仓的保证：runtime 证据按政策可清（runtime/README §五），
      // company-workspace 是 run bundle 的 workspace（整树 gitignored），snapshots 的真实证据已移产品仓外。三类按“本地证据引用”观察，
      // 不判死链；产品源码/文档的硬链接不受影响。bare-path 的 RUNTIME_PREFIXES 同口径。
      const sourceRel = relative(root, entry.file).split(sep).join('/')
      const fromRuntimeDoc = sourceRel.startsWith('runtime/') || sourceRel.startsWith('company-workspace/')
      if (!fromRuntimeDoc && isEvidencePath(targetRel)) continue
      report('target'); continue
    }
    // 目标在场但被 git 忽略 ⇒ 干净 clone 里不存在，不能算绿（证据树例外，见上）。
    if (!isEvidencePath(targetRel) && ignored.has(entry.target)) { report('ignored'); continue }
    if (entry.fragment !== '' && extname(entry.target).toLowerCase() === '.md' && statSync(entry.target).isFile()
      && !anchorsOf(entry.target).has(entry.fragment)) report('anchor')
  }
  return { files, linkCount, violations }
}
