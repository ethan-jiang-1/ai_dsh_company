/** Bounded, read-only GFM reference checks for current repository source documents. */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Reuse the pinned vendor gate's declared parser dependencies. Requires the normal
// initialized/installed vendor workspace; no transitive-store guessing or vendor writes.
const vendorRequire = createRequire(new URL('../../vendor/dsh/package.json', import.meta.url))
const { fromMarkdown } = await import(pathToFileURL(vendorRequire.resolve('mdast-util-from-markdown')).href)
const { gfmFromMarkdown } = await import(pathToFileURL(vendorRequire.resolve('mdast-util-gfm')).href)
const { gfm } = await import(pathToFileURL(vendorRequire.resolve('micromark-extension-gfm')).href)

// These are not source corpora. Active implemented/rejected/postmortem Notes ARE sources.
const EXCLUDED = new Set(['node_modules', 'vendor', 'lib', 'dist', 'build', 'generated', 'dev',
  'snapshots', 'journal', 'deliverables', 'archived', 'archive', 'historical'])

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
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || EXCLUDED.has(entry.name)) continue
      const file = join(dir, entry.name)
      if (entry.isDirectory()) { if (recursive) walk(file) }
      else if (entry.isFile() || entry.isSymbolicLink() && statSync(file).isFile()) add(file)
    }
  }
  walk(root, false)
  for (const dir of ['docs', 'notes', 'packages/company-pack', 'company-workspace/templates']) walk(join(root, dir))
  for (const file of ['company-workspace/AGENTS.md', 'company-workspace/kb/org.md']) {
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
