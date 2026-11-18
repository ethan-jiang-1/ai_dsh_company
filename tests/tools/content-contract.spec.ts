
// 负例留证 2026-11-19：inventory 写 `..\\evil` 时旧判据只 split('/') → 通过；本 spec 红（BUG-265）。
// 负例留证 2026-11-19：manifest 缺 version / version=2 时旧判据不看；本 spec 红（BUG-267）。
// 负例留证 2026-11-19：seed 的 target='../../evil.md'、缺 source 时旧 schema 只判字符串；本 spec 红（BUG-268）。
// 负例留证 2026-11-19：delivery documents 的 template 不在 content 时旧 schema 通过；本 spec 红（BUG-269）。
// 负例留证 2026-11-19：check-rules 的 files 值是对象时旧 schema 通过；本 spec 红（BUG-270）。
// 负例留证 2026-11-19：content 下的 symlink 文件被 `entry.isFile()` 静默跳过；本 spec 红（BUG-266）。
// 负例留证 2026-11-19：删 content/templates/ 整目录时 REQUIRED_DIRS 走 continue；本 spec 红（BUG-273）。
// 负例留证 2026-11-19：inventory 重复项 gate 不判、checker 判，两门结论相反；本 spec 红（BUG-274）。
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  CONTENT_VERSION,
  contentJsonProblems,
  contentManifestProblems,
  contentRelProblem,
  listContentFiles,
  requiredContentDirs,
} from '../../tools/lib/company/content-contract.mjs'

/**
 * content 合同的守卫（2026-11-19，BUG-265..270/273/274）。
 *
 * 这组卡不是八个补丁：同一份 content 合同被写了两遍（源树 gate + tarball checker），
 * 各自的洞不同。本 spec 钉的是**那份唯一实现**的判据；两处消费者（gate / shipped checker）
 * 的接线各有自己的 spec（`tests/checks/gates-negative.test.mjs` / `tests/repo/release/shipped-shape.spec.ts`）。
 */

const dirs: string[] = []

/** 建一棵合成 content 树（`manifest.json` 由调用方给）。 */
function tree(files: Record<string, string>): { dir: string, files: string[] } {
  const dir = mkdtempSync(join(tmpdir(), 'content-contract-'))
  dirs.push(dir)
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(rel)), { recursive: true })
    writeFileSync(join(dir, rel), text)
  }
  return { dir, files: Object.keys(files).sort() }
}

const readOf = (map: Record<string, string>) => (rel: string) => map[rel] ?? ''

describe('content 路径安全（BUG-265）', () => {
  it('反斜杠/盘符/绝对路径/NUL/.. 全部拒绝，正常相对路径通过', () => {
    expect(contentRelProblem('a/b.md')).toBeUndefined()
    expect(contentRelProblem('..\\evil.md')).toMatch(/反斜杠/)
    expect(contentRelProblem('a\\..\\b.md')).toMatch(/反斜杠/)
    expect(contentRelProblem('a/../b.md')).toMatch(/\.\./)
    expect(contentRelProblem('/etc/passwd')).toMatch(/绝对路径/)
    expect(contentRelProblem('C:/x.md')).toMatch(/盘符/)
    expect(contentRelProblem('a\0b.md')).toMatch(/NUL/)
    expect(contentRelProblem('')).toMatch(/非空/)
    expect(contentRelProblem(42)).toMatch(/非空/)
  })
})

describe('content manifest 的版本与双向对账（BUG-267）', () => {
  const files = { 'AGENTS.md': '# x\n', 'templates/prd.md': '# p\n' }
  const ok = { version: CONTENT_VERSION, inventory: ['AGENTS.md', 'templates/prd.md'], tiers: {} }

  it('version 不是当前版本即红（缺字段也算）', () => {
    const missing = contentManifestProblems({ manifest: { inventory: ['AGENTS.md'], tiers: {} }, files: ['AGENTS.md'], read: readOf(files), requiredFiles: [], requiredDirs: [] })
    expect(missing.some(problem => problem.includes('version'))).toBe(true)
    const future = contentManifestProblems({ manifest: { ...ok, version: 2 }, files: ['AGENTS.md'], read: readOf(files), requiredFiles: [], requiredDirs: [] })
    expect(future.some(problem => problem.includes('version 必须是 1'))).toBe(true)
    expect(contentManifestProblems({ manifest: ok, files: Object.keys(files), read: readOf(files), requiredFiles: [], requiredDirs: [] })).toEqual([])
  })

  it('inventory 重复项两处消费者同一结论（BUG-274）', () => {
    const duplicated = { ...ok, inventory: ['AGENTS.md', 'AGENTS.md', 'templates/prd.md'] }
    const fromTarball = contentManifestProblems({ manifest: duplicated, files: Object.keys(files), read: readOf(files), requiredFiles: [], requiredDirs: [] })
    expect(fromTarball.some(problem => problem.includes('inventory 重复'))).toBe(true)
    // gate 侧从盘枚举，checker 侧从条目枚举——同一棵树上结论必须逐字相同（BUG-274）。
    const { dir } = tree(files)
    const fromDisk = listContentFiles(dir)
    const fromGate = contentManifestProblems({ manifest: duplicated, files: fromDisk.files, symlinks: fromDisk.symlinks, read: readOf(files), requiredFiles: [], requiredDirs: [] })
    expect(fromGate).toEqual(fromTarball)
  })

  it('盘上有未登记文件 / 清单列了不存在的文件 两侧都红', () => {
    const unlisted = contentManifestProblems({ manifest: ok, files: [...Object.keys(files), 'extra.md'], read: readOf(files), requiredFiles: [], requiredDirs: [] })
    expect(unlisted.some(problem => problem.includes('未登记的 content 文件'))).toBe(true)
    const missing = contentManifestProblems({ manifest: ok, files: ['AGENTS.md'], read: readOf(files), requiredFiles: [], requiredDirs: [] })
    expect(missing.some(problem => problem.includes('inventory 缺文件'))).toBe(true)
  })
})

describe('content symlink 与必需面（BUG-266）', () => {
  it('content 下的 symlink 单列并红，不静默跳过', () => {
    const { dir } = tree({ 'AGENTS.md': '# x\n' })
    symlinkSync('/etc/hostname', join(dir, 'zz-link.md'))
    const listed = listContentFiles(dir)
    expect(listed.files).toEqual(['AGENTS.md'])
    expect(listed.symlinks).toEqual(['zz-link.md'])
    const problems = contentManifestProblems({ manifest: { version: CONTENT_VERSION, inventory: ['AGENTS.md'], tiers: {} }, files: listed.files, symlinks: listed.symlinks, read: readOf({ 'AGENTS.md': '# x\n' }), requiredFiles: [], requiredDirs: [] })
    expect(problems.some(problem => problem.includes('symlink'))).toBe(true)
  })

  it('必需目录为空 / 关键件缺失即红（BUG-273）', () => {
    expect(requiredContentDirs()).toContain('templates')
    expect(requiredContentDirs()).toContain('charters')
    expect(requiredContentDirs()).toContain('generic')
    const empties = contentManifestProblems({
      manifest: { version: CONTENT_VERSION, inventory: ['AGENTS.md'], tiers: {} },
      files: ['AGENTS.md'],
      read: readOf({ 'AGENTS.md': '# x\n' }),
      requiredFiles: ['AGENTS.md', 'charters/ceo.md'],
      requiredDirs: ['charters'],
    })
    expect(empties.some(problem => problem.includes('必需目录缺内容：content/charters/'))).toBe(true)
    expect(empties.some(problem => problem.includes('缺关键运行时件：content/charters/ceo.md'))).toBe(true)
  })
})

describe('content JSON 跨引用与读取器同义（BUG-268）', () => {
  const files = [
    'kb-setup/seed.json',
    'state/company.md',
    'state/org.md',
    'product-types/business-software/requirements-model.md',
    'delivery-modes/managed-service/delivery-rules.json',
    'delivery-modes/managed-service/overview.md',
    'delivery-modes/managed-service/templates/sla.md',
    'product-types/business-software/check-rules.json',
  ]

  it('合法 delivery-rules / seed / check-rules 零问题', () => {
    expect(contentJsonProblems({
      rel: 'delivery-modes/managed-service/delivery-rules.json',
      value: { deliveryMode: 'managed-service', kind: 'delivery', entry: 'overview.md', documents: { SLA: { file: 'drafts/sla.md', owner: 'COO', template: 'templates/sla.md' } } },
      files,
    })).toEqual([])
    expect(contentJsonProblems({
      rel: 'kb-setup/seed.json',
      value: { seeds: [{ source: 'state/company.md', target: '.dsh-company/kb/company.md' }, { source: 'product-types/{productType}/requirements-model.md', target: '.dsh-company/kb/process-docs.md' }] },
      files,
    })).toEqual([])
    expect(contentJsonProblems({ rel: 'product-types/business-software/check-rules.json', value: { productType: 'business-software', layers: ['MRD'], defaultLayers: ['MRD'], files: { MRD: 'mrd.md' } }, files })).toEqual([])
  })

  it('seed：target 越界 / source 缺文件 / target 重复 都红', () => {
    const escape = contentJsonProblems({ rel: 'kb-setup/seed.json', value: { seeds: [{ source: 'state/company.md', target: '../../evil.md' }] }, files })
    expect(escape.join()).toContain('.. 段')
    const outside = contentJsonProblems({ rel: 'kb-setup/seed.json', value: { seeds: [{ source: 'state/company.md', target: 'other/x.md' }] }, files })
    expect(outside.join()).toContain('不在 .dsh-company/ 内')
    const missing = contentJsonProblems({ rel: 'kb-setup/seed.json', value: { seeds: [{ source: 'state/missing.md', target: '.dsh-company/kb/x.md' }] }, files })
    expect(missing.join()).toContain('source 不在 inventory')
    const duplicated = contentJsonProblems({ rel: 'kb-setup/seed.json', value: { seeds: [
      { source: 'state/company.md', target: '.dsh-company/kb/x.md' },
      { source: 'state/org.md', target: '.dsh-company/kb/x.md' },
    ] }, files })
    expect(duplicated.join()).toContain('target 重复')
  })

  it('delivery-rules：template 不在 content / file 形状不对 / entry 缺失 都红（BUG-269）', () => {
    const missingTemplate = contentJsonProblems({
      rel: 'delivery-modes/managed-service/delivery-rules.json',
      value: { deliveryMode: 'managed-service', kind: 'delivery', entry: 'overview.md', documents: { SLA: { file: 'drafts/sla.md', owner: 'COO', template: 'templates/missing.md' } } },
      files,
    })
    expect(missingTemplate.join()).toContain('template 不在 content')
    const badFile = contentJsonProblems({
      rel: 'delivery-modes/managed-service/delivery-rules.json',
      value: { deliveryMode: 'managed-service', kind: 'delivery', entry: 'overview.md', documents: { SLA: { file: 'overview.md', owner: 'COO', template: 'templates/sla.md' } } },
      files,
    })
    expect(badFile.join()).toContain('file 必须是 drafts/')
    const missingEntry = contentJsonProblems({
      rel: 'delivery-modes/managed-service/delivery-rules.json',
      value: { deliveryMode: 'managed-service', kind: 'delivery', entry: 'nope.md', documents: { SLA: { file: 'drafts/sla.md', owner: 'COO', template: 'templates/sla.md' } } },
      files,
    })
    expect(missingEntry.join()).toContain('entry 不在 content')
  })

  it('check-rules：files 值形状 / layers 覆盖 / defaultLayers 子集 都红（BUG-270）', () => {
    const rel = 'product-types/business-software/check-rules.json'
    expect(contentJsonProblems({ rel, value: { productType: 'x', layers: ['MRD'], files: { MRD: {} } }, files }).join()).toContain('files.MRD 必须是')
    expect(contentJsonProblems({ rel, value: { productType: 'x', layers: ['MRD', 'PRD'], files: { MRD: 'mrd.md' } }, files }).join()).toContain('layers 的 PRD')
    expect(contentJsonProblems({ rel, value: { productType: 'x', layers: ['MRD'], defaultLayers: ['PRD'], files: { MRD: 'mrd.md' } }, files }).join()).toContain('defaultLayers 的 PRD')
    expect(contentJsonProblems({ rel, value: { layers: ['MRD'], files: { MRD: 'mrd.md' } }, files }).join()).toContain('缺 productType')
  })
})

afterAll(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }) })
