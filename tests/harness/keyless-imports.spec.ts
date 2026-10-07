import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { join, relative } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inspectKeylessGraph, isForbiddenKeylessModule, localImportPath, parseKeylessImports } from '../../tools/lib/keyless-imports.mjs'

const fixtures: string[] = []
const fixture = (files: Record<string, string>) => {
  const cache = join(repositoryRoot, 'node_modules/.cache/company-keyless-imports')
  mkdirSync(cache, { recursive: true })
  const root = mkdtempSync(join(cache, 'fixture-'))
  fixtures.push(root)
  for (const [name, text] of Object.entries(files)) {
    const path = join(root, name)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, text)
  }
  return root
}
afterEach(() => { while (fixtures.length) rmSync(fixtures.pop(), { recursive: true, force: true }) })

describe('keyless local import analysis', () => {
  it('parses static, re-export and literal dynamic imports without evaluating source', () => {
    const parsed = parseKeylessImports([
      "import './static.mjs'",
      "export * from './reexport.mjs'",
      "await import('./dynamic.mjs')",
      "const name = './computed.mjs'; await import(name)",
    ].join('\n'))
    expect(parsed.imports).toEqual([
      { specifier: './static.mjs', kind: 'static' },
      { specifier: './reexport.mjs', kind: 'static' },
      { specifier: './dynamic.mjs', kind: 'dynamic' },
    ])
    expect(parsed.unresolvedImports).toEqual(['name'])
    expect(parsed.forbiddenCalls).toEqual([])
  })

  it('follows nested local imports and rejects an indirect driver escape', () => {
    const root = fixture({
      'lib/entry.mjs': "import './nested/middle.mjs'\n",
      'lib/nested/middle.mjs': "export * from './leaf.mjs'\n",
      'lib/nested/leaf.mjs': "import '../../drivers/browser.mjs'\n",
      'drivers/browser.mjs': 'export const driver = true\n',
    })
    const libRoot = join(root, 'lib')
    const report = inspectKeylessGraph([join(libRoot, 'entry.mjs')], { libRoot })
    expect(report.violations.map(item => item.reason)).toContain('local dependency leaves tools/lib')
    const canonicalRoot = realpathSync(libRoot)
    expect(report.files.map(path => relative(canonicalRoot, path)).sort()).toEqual(['entry.mjs', 'nested/leaf.mjs', 'nested/middle.mjs'])
  })

  it('follows literal dynamic imports and rejects indirect network dependencies and calls', () => {
    const root = fixture({
      'entry.mjs': "await import('./nested/network.mjs')\n",
      'nested/network.mjs': "import 'node:net'\nexport function go() { return fetch('/status') }\n",
    })
    const report = inspectKeylessGraph([join(root, 'entry.mjs')], { libRoot: root })
    expect(report.violations.map(item => item.reason)).toEqual(expect.arrayContaining([
      'forbidden builtin: node:net',
      'forbidden runtime call: fetch',
    ]))
  })

  it('does not claim arbitrary computed imports are proven', () => {
    const parsed = parseKeylessImports("await import(moduleName)\n")
    expect(parsed.imports).toEqual([])
    expect(parsed.unresolvedImports).toEqual(['moduleName'])
  })

  it('keeps package resolution outside the local graph', () => {
    expect(isForbiddenKeylessModule('node:child_process')).toBe(true)
    expect(isForbiddenKeylessModule('node:http')).toBe(true)
    expect(isForbiddenKeylessModule('mdast-util-from-markdown')).toBe(false)
    expect(localImportPath('/repo/tools/lib/a.mjs', 'mdast-util-from-markdown')).toBeUndefined()
  })
})
