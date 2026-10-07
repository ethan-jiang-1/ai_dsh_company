import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sourceMarkdownFiles, validateMarkdownLinks } from '../../tools/lib/markdown-links.mjs'

const scratch = join(ROOT, 'node_modules/.cache/company-markdown-links')
let root: string
beforeEach(() => {
  mkdirSync(scratch, { recursive: true })
  root = mkdtempSync(join(scratch, 'fixture-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))
const put = (path: string, text = '# Present\n') => {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  return file
}
const check = (source: string) => {
  put('README.md', source)
  return validateMarkdownLinks(root)
}

// Fixtures have no Git index: newly authored Notes must not depend on git add.
describe('bounded source discovery', () => {
  it('checks all root Markdown, active Notes, pack source and current company documents', () => {
    const sources = ['README.md', 'README.zh.md', 'AGENTS.md',
      'docs/guides/new.md', 'checks/README.md', 'checks/guides/README.md', 'snapshots/README.md', 'notes/proposed/new.md',
      'notes/implemented/new.md', 'notes/rejected/new.md', 'notes/postmortem/new.md',
      '_backlog/new.md', '_backlog/plans/new.md', 'packages/company-pack/README.md',
      'packages/company-pack/src/README.md', 'packages/company-pack/presets/ceo/skills/new/SKILL.md',
      'company-workspace/AGENTS.md', 'company-workspace/kb/org.md',
      'company-workspace/kb/new-role/CHARTER.md', 'company-workspace/templates/nested/new.md']
    for (const file of sources) put(file, '[broken](missing.md)\n')
    const report = validateMarkdownLinks(root)
    expect(report.files.map(file => relative(root, file)).sort()).toEqual(sources.sort())
    expect(report.violations.map(v => v.file).sort()).toEqual(sources.sort())
  })

  it('excludes generated, vendor, runtime, journal, deliverable and explicitly historical sources', () => {
    const excluded = ['vendor/dsh/README.md', 'run/README.md', 'snapshots/expected.md',
      'docs/generated/catalog.md', 'notes/archived/old.md', 'notes/archive/old.md',
      'notes/historical/old.md', 'notes/node_modules/README.md', 'notes/.cache/README.md',
      'packages/company-pack/lib/README.md', 'packages/company-pack/dist/README.md',
      'packages/company-pack/build/README.md', 'packages/company-pack/node_modules/README.md',
      'packages/company-pack/vendor/README.md', 'packages/other/README.md',
      'company-workspace/deliverables/draft.md', 'company-workspace/kb/ceo/journal/old.md',
      'company-workspace/kb/ceo/other.md', 'docs-not-source/README.md']
    for (const file of excluded) put(file, '[frozen](missing.md)\n')
    put('README.md')
    expect(sourceMarkdownFiles(root)).toEqual([join(root, 'README.md')])
    expect(validateMarkdownLinks(root).violations).toEqual([])
  })

  it('deduplicates instruction-file symlinks without following directory symlinks', () => {
    put('AGENTS.md', '[broken](missing.md)\n')
    symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))
    mkdirSync(join(root, 'docs'))
    symlinkSync(root, join(root, 'docs/loop'), 'dir')
    const report = validateMarkdownLinks(root)
    expect(report.files).toEqual([join(root, 'AGENTS.md')])
    expect(report.violations).toHaveLength(1)
  })
})

describe('GFM local paths and references', () => {
  it('accepts ./, ../, bare paths, angle destinations, titles, nested parentheses, queries and empty anchors', () => {
    put('docs/target.md')
    put('docs/space name.md')
    put('docs/a(b).md')
    put('docs/back.md', '[parent](../README.md#root)\n')
    const report = check('# Root\n\n[bare](docs/target.md) [dot](./docs/target.md "title")\n'
      + '[spaces](<docs/space name.md>) [balanced](docs/a(b).md)\n'
      + '[query](docs/target.md?raw=1#present) [top](docs/target.md#) [self](#root) [empty]()\n')
    expect(report.violations).toEqual([])
    expect(report.linkCount).toBe(9)
  })

  it('checks full, collapsed and shortcut reference definitions, and reference images', () => {
    put('docs/target.md')
    put('assets/image.png', 'image')
    const report = check('[full][DOC] [collapsed][] [shortcut] ![image][asset]\n\n'
      + '[doc]: docs/target.md#present "title"\n[collapsed]: ./docs/target.md\n'
      + '[shortcut]: docs/target.md\n[asset]: assets/image.png\n')
    expect(report.violations).toEqual([])
    expect(report.linkCount).toBe(4)
  })

  it('reports broken paths, fragments and image definitions with their source line', () => {
    put('docs/target.md')
    const report = check('[bare](docs/missing.md)\n[dot](./missing.md)\n[parent](../missing.md)\n'
      + '[full][anchor]\n![img][asset]\n\n[anchor]: docs/target.md#missing\n[asset]: missing.png\n')
    expect(report.violations.map(v => [v.line, v.url, v.reason])).toEqual([
      [1, 'docs/missing.md', 'target'], [2, './missing.md', 'target'], [3, '../missing.md', 'target'],
      [7, 'docs/target.md#missing', 'anchor'], [8, 'missing.png', 'target'],
    ])
  })

  it('percent-decodes paths and fragments after separating URL delimiters', () => {
    put('docs/中文 #?.md', '# 中文 标题\n')
    const report = check('[encoded](docs/%E4%B8%AD%E6%96%87%20%23%3F.md?raw=1#%E4%B8%AD%E6%96%87-%E6%A0%87%E9%A2%98)\n')
    expect(report.linkCount).toBe(1)
    expect(report.violations).toEqual([])
  })

  it('rejects malformed percent encoding as a diagnostic, not an exception', () => {
    put('docs/target.md')
    const report = check('[bad path](missing%zz.md) [bad anchor](docs/target.md#%E0%A4)\n')
    expect(report.violations.map(v => v.reason)).toEqual(['encoding', 'encoding'])
  })

  it('ignores fenced/indented/inline code and comments, but checks live GFM table links', () => {
    const report = check('```md\n[broken](missing.md)\n[ref]: missing.md\n```\n\n'
      + '~~~\n[broken](missing.md)\n~~~\n\n    [broken](missing.md)\n\n'
      + '`[broken](missing.md)`\n<!-- [broken](missing.md) -->\n\n'
      + '| Link |\n| --- |\n| [live](missing.md) |\n')
    expect(report.linkCount).toBe(1)
    expect(report.violations).toEqual([{ file: 'README.md', line: 17, url: 'missing.md', reason: 'target' }])
  })

  it('leaves external/root-absolute URLs and non-Markdown fragments to their renderer', () => {
    put('tools/source.ts', 'export {}\n')
    const report = check('[https](https://example.invalid/missing) [mail](mailto:a@example.invalid)\n'
      + '[protocol](//example.invalid/missing) [root](/missing.md) [scheme](vscode:open)\n'
      + '[line](tools/source.ts#L100) [missing source](tools/missing.ts#L100)\n')
    expect(report.linkCount).toBe(2)
    expect(report.violations.map(v => v.url)).toEqual(['tools/missing.ts#L100'])
  })

  it('does not invent links from unresolved reference-looking prose or raw HTML hrefs', () => {
    const report = check('[unknown][undefined]\n\n<a href="missing.md">HTML link</a>\n')
    expect(report.linkCount).toBe(0)
    expect(report.violations).toEqual([])
  })
})

describe('rendered heading anchors (pinned vendor GitHub-style semantics)', () => {
  it('uses rendered Chinese, inline code, emphasis, links, images, entities and setext text', () => {
    put('docs/target.md', '# 中文 标题\n\n## `some_code()` **bold** [Link](#中文-标题) ![Alt](asset.png) &amp;\n\nSetext `code`\n---\n')
    put('docs/asset.png', 'image')
    const report = check('[Chinese](docs/target.md#中文-标题)\n'
      + '[rendered](docs/target.md#some_code-bold-link-alt-)\n[setext](docs/target.md#setext-code)\n')
    expect(report.violations).toEqual([])
  })

  it('suffixes duplicate slugs past existing numbered headings; fragments remain case-sensitive', () => {
    const report = check('# Repeat\n# Repeat-1\n# Repeat\n# Repeat\n\n'
      + '[first](#repeat) [numbered](#repeat-1) [second](#repeat-2) [third](#repeat-3)\n'
      + '[wrong case](#Repeat) [nonexistent](#repeat-4)\n')
    expect(report.violations.map(v => v.url)).toEqual(['#Repeat', '#repeat-4'])
  })

  it('reads explicit anchor ids but not sample headings, sample anchors or commented anchors', () => {
    const report = check('<a id="Exact"></a>\n<a class="anchor" id=\'中文\'></a>\n<a data-id="not-an-id"></a>\n\n'
      + '```md\n# Fake\n<a id="fenced"></a>\n```\n\n<!-- <a id="comment"></a> -->\n\n'
      + '[id](#Exact) [Chinese](#中文) [wrong](#exact) [fake](#fake) [fenced](#fenced) [comment](#comment) [data](#not-an-id)\n')
    expect(report.violations.map(v => v.url)).toEqual(['#exact', '#fake', '#fenced', '#comment', '#not-an-id'])
  })

  it('validates anchors on excluded source targets without scanning their historical outbound links', () => {
    put('vendor/dsh/README.md', '# Vendor\n\n[historical](missing.md)\n')
    put('notes/archived/old.md', '# Archive\n\n[frozen](missing.md)\n')
    const report = check('[vendor](vendor/dsh/README.md#vendor) [archive](notes/archived/old.md#archive)\n'
      + '[bad vendor](vendor/dsh/README.md#missing)\n')
    expect(report.files).toEqual([join(root, 'README.md')])
    expect(report.violations.map(v => v.url)).toEqual(['vendor/dsh/README.md#missing'])
  })

  it('leaves every source byte unchanged on positive and negative checks', () => {
    const source = '# Root\n\n[good](#root) [bad](#missing)\n'
    const file = put('README.md', source)
    expect(validateMarkdownLinks(root).violations).toHaveLength(1)
    expect(readFileSync(file, 'utf8')).toBe(source)
  })
})
