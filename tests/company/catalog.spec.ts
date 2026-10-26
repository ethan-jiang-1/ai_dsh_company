/**
 * 成品目录 host 生成器（2026-10-25，RFC installed-shape-self-sufficient）的 keyless 判据。
 *
 * 判据：①空盘也生成 schema 1 的空目录（页签不再报“维护者运行 node tools/...”）；
 * ②条目未变时二次生成不写（generatedAt/字节稳定，不破 release-smoke 的二启零变更）；
 * ③present 事件按 path/slug 投影，归档后仍保留；④meta/台账解析与仓库口径一致。
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  catalogPath,
  presentedFromEvent,
  readCatalog,
  regenerateCatalog,
} from '../../packages/company-pack/src/host/catalog.ts'
import {
  ledgerSlugsFromText,
  parseMeta,
  slugFromDirName,
} from '../../packages/company-pack/src/lib/deliverables-catalog.ts'
import { parseCatalog } from '../../packages/company-pack/src/client/DeliverablesTab.tsx'

const roots: string[] = []
function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-'))
  roots.push(dir)
  mkdirSync(join(dir, 'kb'), { recursive: true })
  writeFileSync(join(dir, 'kb/motion-ledger.md'), '| slug | 日期 | 一句话结论 | 参与 |\n|---|---|---|---|\n')
  return dir
}
function deliverable(root: string, dir = 'deliverables/2026-10-25-alpha'): string {
  const path = join(root, dir)
  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, 'final.md'), '# final\n')
  writeFileSync(join(path, 'meta.md'), 'slug: alpha\nkickoff: 2026-10-25\n类型: 决策\n结果: 已完成\n一句话结论: 做完了\n')
  return path
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('meta/catalog 纯逻辑', () => {
  it('解析中文字段与首现值，剥日期前缀', () => {
    const meta = parseMeta('slug: alpha\n类型: 决策\n结果: 已完成\n落地事件: 第一版\n')
    expect(meta.fields.get('类型')).toBe('决策')
    expect(meta.fields.get('结果')).toBe('已完成')
    expect(slugFromDirName('2026-10-25-alpha')).toBe('alpha')
  })

  it('台账解析只认表行首列', () => {
    const slugs = ledgerSlugsFromText('| slug | 日期 |\n|---|---|\n| alpha | 2026-10-25 |\n| beta | 2026-10-26 |\n')
    expect([...slugs]).toEqual(['alpha', 'beta'])
  })
})

describe('host catalog', () => {
  it('空盘生成空目录，二次生成不写（字节稳定）', () => {
    const root = workspace()
    const first = regenerateCatalog(root)
    expect(first.written).toBe(true)
    expect(first.catalog?.counts.total).toBe(0)
    const before = readFileSync(catalogPath(root), 'utf8')
    const second = regenerateCatalog(root)
    expect(second.written).toBe(false)
    expect(readFileSync(catalogPath(root), 'utf8')).toBe(before)
  })

  it('present 事件投影 path/slug，归档后仍保留', () => {
    const root = workspace()
    deliverable(root)
    regenerateCatalog(root)
    const catalog = readCatalog(root)
    expect(catalog?.entries).toHaveLength(1)
    expect(catalog?.entries[0]?.presented).toBeNull()

    const event = { data: { files: [{ path: join(root, 'deliverables/2026-10-25-alpha/final.md') }] } }
    const observed = presentedFromEvent(event, root)
    expect([...observed.paths]).toEqual(['deliverables/2026-10-25-alpha/final.md'])
    expect([...observed.slugs]).toEqual(['alpha'])

    const afterPresent = regenerateCatalog(root, observed)
    expect(afterPresent.catalog?.entries[0]?.presented).toBe(true)
    expect(afterPresent.catalog?.counts.presented).toBe(1)

    mkdirSync(join(root, 'deliverables-archive'), { recursive: true })
    renameSync(join(root, 'deliverables/2026-10-25-alpha'), join(root, 'deliverables-archive/2026-10-25-alpha'))
    const archived = regenerateCatalog(root)
    expect(archived.catalog?.entries[0]?.root).toBe('deliverables-archive')
    expect(archived.catalog?.entries[0]?.presented).toBe(true)
  })

  it('保留既有 catalog 的 presented=false（审计结论不被冲成未核）', () => {
    const root = workspace()
    deliverable(root)
    regenerateCatalog(root)
    const path = catalogPath(root)
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { entries: { presented: boolean | null }[] }
    raw.entries[0]!.presented = false
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`)
    expect(regenerateCatalog(root).catalog?.entries[0]?.presented).toBe(false)
  })

  it('旧 false 只按精确 path 保留；同 slug 新件不继承未 present', () => {
    const root = workspace()
    deliverable(root)
    const path = catalogPath(root)
    writeFileSync(path, `${JSON.stringify({
      schema: 1,
      generatedAt: '2026-10-24T00:00:00.000Z',
      counts: {},
      entries: [{
        slug: 'alpha',
        path: 'deliverables/2026-10-24-alpha/final.md',
        presented: false,
      }],
    }, null, 2)}\n`)
    expect(regenerateCatalog(root).catalog?.entries[0]?.presented).toBeNull()
  })

  it('坏 catalog JSON：readCatalog 返回 null，regenerate 重建且不留 .tmp', () => {
    const root = workspace()
    deliverable(root)
    writeFileSync(catalogPath(root), '{ definitely not json')
    expect(readCatalog(root)).toBeNull()
    const result = regenerateCatalog(root)
    expect(result.catalog?.entries).toHaveLength(1)
    expect(readdirSync(join(root, 'kb')).some(name => name.endsWith('.tmp'))).toBe(false)
  })

  it('台账命中与未命中都写进目录', () => {
    const root = workspace()
    deliverable(root)
    writeFileSync(join(root, 'kb/motion-ledger.md'), '| slug | 日期 |\n|---|---|\n| alpha | 2026-10-25 |\n')
    const catalog = regenerateCatalog(root).catalog
    expect(catalog?.entries[0]?.ledgered).toBe(true)
    expect(catalog?.counts.unledgered).toBe(0)
  })

  it('两个公司盘的 presented 不互相串（数据平面隔离）', () => {
    const a = workspace()
    const b = workspace()
    deliverable(a)
    deliverable(b)
    regenerateCatalog(a, { paths: ['deliverables/2026-10-25-alpha/final.md'] })
    expect(readCatalog(a)?.entries[0]?.presented).toBe(true)
    expect(regenerateCatalog(b).catalog?.entries[0]?.presented).toBeNull()
  })

  it('meta 缺行/枚举外标出 metaProblem，不冒充形状通过', () => {
    const root = workspace()
    const dir = deliverable(root)
    writeFileSync(join(dir, 'meta.md'), 'slug: alpha\nkickoff: 2026-10-25\n类型: 决策\n结果: 完成\n')
    const catalog = regenerateCatalog(root).catalog
    expect(catalog?.entries[0]?.metaProblem).toContain('结果不在词表')
  })

  it('host 生成物可被页签 parser 解析（schema 边界）', () => {
    const root = workspace()
    deliverable(root)
    regenerateCatalog(root)
    const parsed = parseCatalog(readFileSync(catalogPath(root), 'utf8'))
    expect(parsed?.entries[0]?.slug).toBe('alpha')
    expect(parsed?.entries[0]?.metaProblem).toBeNull()
  })
})
