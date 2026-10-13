/** Bounded, read-only GFM reference checks for current repository source documents. */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Reuse the pinned vendor gate's declared parser dependencies. Requires an installed
// workspace; no transitive-store guessing or vendor writes.
// 解析基址两级（2026-09-27 CI 首跑红后立）：① vendor/dsh 根包——本地完整引导（vendor 自带
// install 的 store）时的形状；② vendor 子包 ui-primitives——它声明**同一组**解析器（版本区间
// 与 vendor 根 pin 逐字一致，root store 单一版本 2.0.3/3.1.0/3.0.0 两边相同），根 workspace
// install 即覆盖（根 workspace 刻意不含 vendor/dsh 根包，只挂其子包——见 pnpm-workspace.yaml）。
// CI 只跑根 install（.github/workflows/ci.yml）靠 ② 解析。
const parserBases = [
  new URL('../../vendor/dsh/package.json', import.meta.url),
  new URL('../../vendor/dsh/packages/client/ui-primitives/package.json', import.meta.url),
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
 * 出厂公司盘骨架（2026-10-13 立）：它是**要发布到任意磁盘的运行语料**，不是本仓的源文档——
 * 手册里的相对指针（`../docs/*`）是**部署相对**的：在运行盘 `company-workspace/AGENTS.md`
 * 读到才成立，在 pack 家（`packages/company-pack/workspace/`）读到的深度没有意义。
 * 所以这里按**路径**排除（不按名字，避免误伤任何叫 workspace 的目录），链接校验落在运行盘那份
 * ——它已在下面显式加入（符号链接读到同一份内容，校验基准 = 读者看到的位置）。
 */
const EXCLUDED_PATHS = new Set(['packages/company-pack/workspace'])

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

const parse = (source) => fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
const visit = (node, fn) => { fn(node); for (const child of node.children ?? []) visit(child, fn) }

// Rendered Markdown text, not raw heading syntax: code, links, images, emphasis and entities.
const renderedText = (node) => {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? ''
  if (node.type === 'break') return ' '
  return (node.children ?? []).map(renderedText).join('')
}

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

/**
 * Check Markdown links/images/definitions with cached target headings and source line diagnostics.
 * Root-absolute URLs and schemes are renderer-owned; non-Markdown fragments are not interpreted.
 * Raw HTML hrefs and undefined reference-looking prose are outside this Markdown-only gate.
 */
export function validateMarkdownLinks(root) {
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
  const violations = []
  let linkCount = 0
  for (const file of files) {
    visit(treeOf(file), (node) => {
      if (!['link', 'image', 'definition'].includes(node.type)) return
      const url = node.url
      if (url.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return
      linkCount++
      const report = (reason) => violations.push({ file: relative(root, file), line: node.position.start.line, url, reason })
      const hash = url.indexOf('#')
      let path, fragment
      try {
        path = decodeURIComponent((hash < 0 ? url : url.slice(0, hash)).split('?')[0])
        fragment = hash < 0 ? '' : decodeURIComponent(url.slice(hash + 1))
      } catch {
        // A malformed URL escape is a diagnostic, not an uncaught decoder error.
        report('encoding')
        return
      }
      const target = path === '' ? file : resolve(dirname(file), path)
      if (!existsSync(target)) { report('target'); return }
      if (fragment !== '' && extname(target).toLowerCase() === '.md' && statSync(target).isFile()
        && !anchorsOf(target).has(fragment)) report('anchor')
    })
  }
  return { files, linkCount, violations }
}
