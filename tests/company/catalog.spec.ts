/**
 * 成品目录 host 生成器（2026-10-25；2026-11-01 v3 路径）的 keyless 判据。
 *
 * 判据：①空盘也生成 schema 1 的空目录；②条目未变时二次生成不写；
 * ③present 事件按 `.dsh-company/deliverables.../final.md` 投影；④meta/台账解析与仓库口径一致；
 * ⑤一个 workspace 的扫描不读另一个。
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  auditRelPath,
  catalogPath,
  emptyPresentedLedger,
  mergePresented,
  presentedFromEvent,
  presentedFromSessions,
  readCatalog,
  readCatalogState,
  readPresentedLedger,
  regenerateCatalog,
  setPresentedAudit,
} from '../../packages/company-pack/src/host/catalog.ts'
import {
  ledgerSlugsFromText,
  parseMeta,
  slugFromDirName,
} from '../../packages/company-pack/src/lib/deliverables-catalog.ts'
import { parseCatalog } from '../../packages/company-pack/src/client/data/deliverables-index.ts'
import { RUN_BUNDLE_PATHS } from '../../packages/company-pack/src/lib/run-bundle-paths.ts'
import { makeTempDir } from '../support/temp-env.ts'

const roots: string[] = []
function workspace(): string {
  const dir = makeTempDir('catalog-')
  roots.push(dir)
  mkdirSync(join(dir, RUN_BUNDLE_PATHS.kb), { recursive: true })
  writeFileSync(join(dir, RUN_BUNDLE_PATHS.ledger), '| slug | 日期 | 一句话结论 | 参与 |\n|---|---|---|---|\n')
  return dir
}
function deliverable(root: string, dir = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha`): string {
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

    const event = { data: { files: [{ path: join(root, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha/final.md') }] } }
    const observed = presentedFromEvent(event, root)
    const expected = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`
    expect([...observed.paths]).toEqual([expected])
    expect([...observed.slugs]).toEqual(['alpha'])

    const ledger = mergePresented(emptyPresentedLedger(), observed)
    const afterPresent = regenerateCatalog(root, ledger)
    expect(afterPresent.catalog?.entries[0]?.presented).toBe(true)
    expect(afterPresent.catalog?.counts.presented).toBe(1)

    mkdirSync(join(root, RUN_BUNDLE_PATHS.archive), { recursive: true })
    renameSync(join(root, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-alpha'), join(root, RUN_BUNDLE_PATHS.archive, '2026-10-25-alpha'))
    const archived = regenerateCatalog(root, ledger)
    expect(archived.catalog?.entries[0]?.root).toBe(RUN_BUNDLE_PATHS.archive)
    expect(archived.catalog?.entries[0]?.presented).toBe(true)
  })

  it('账本里的 presented=false 是权威：索引重生成不会把它冲成未核', () => {
    const root = workspace()
    deliverable(root)
    const ledger = {
      schema: 1 as const,
      updatedAt: '2026-10-27T00:00:00.000Z',
      paths: { [`${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`]: false },
      slugs: {},
    }
    expect(regenerateCatalog(root, ledger).catalog?.entries[0]?.presented).toBe(false)
  })

  it('false 只按精确 path 生效；同 slug 新件不继承未 present', () => {
    const root = workspace()
    deliverable(root)
    const ledger = {
      schema: 1 as const,
      updatedAt: '2026-10-27T00:00:00.000Z',
      paths: { [`${RUN_BUNDLE_PATHS.deliverables}/2026-10-24-alpha/final.md`]: false },
      slugs: { alpha: false },
    }
    expect(regenerateCatalog(root, ledger).catalog?.entries[0]?.presented).toBeNull()

    const exact = {
      ...ledger,
      paths: { [`${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`]: false },
    }
    expect(regenerateCatalog(root, exact).catalog?.entries[0]?.presented).toBe(false)
  })

  it('catalog schema 2 → unsupported（host 可告警），坏 JSON → corrupt', () => {
    const root = workspace()
    writeFileSync(catalogPath(root), JSON.stringify({ schema: 2, entries: [] }))
    expect(readCatalogState(root)).toMatchObject({ status: 'unsupported', schema: 2 })
    writeFileSync(catalogPath(root), '{ bad json')
    expect(readCatalogState(root).status).toBe('corrupt')
  })

  it('坏 catalog JSON：readCatalog 返回 null，regenerate 重建且不留 .tmp', () => {
    const root = workspace()
    deliverable(root)
    writeFileSync(catalogPath(root), '{ definitely not json')
    expect(readCatalog(root)).toBeNull()
    const result = regenerateCatalog(root)
    expect(result.catalog?.entries).toHaveLength(1)
    expect(readdirSync(join(root, RUN_BUNDLE_PATHS.kb)).some(name => name.endsWith('.tmp'))).toBe(false)
  })

  it('台账命中与未命中都写进目录', () => {
    const root = workspace()
    deliverable(root)
    writeFileSync(join(root, RUN_BUNDLE_PATHS.ledger), '| slug | 日期 |\n|---|---|\n| alpha | 2026-10-25 |\n')
    const catalog = regenerateCatalog(root).catalog
    expect(catalog?.entries[0]?.ledgered).toBe(true)
    expect(catalog?.counts.unledgered).toBe(0)
  })

  it('两个 workspace 的扫描不互相串', () => {
    const a = workspace()
    const b = workspace()
    deliverable(a)
    deliverable(b)
    expect(regenerateCatalog(a).catalog?.entries[0]?.slug).toBe('alpha')
    expect(regenerateCatalog(b).catalog?.entries[0]?.slug).toBe('alpha')
    expect(readCatalog(a)?.entries[0]?.presented).toBeNull()
    expect(readCatalog(b)?.entries[0]?.presented).toBeNull()
  })

  it('presentedFromSessions：只扫 workspace 内会话，收集事件并释放 observation', async () => {
    const root = workspace()
    deliverable(root)
    mkdirSync(join(root, 'sub'), { recursive: true })
    const disposed: string[] = []
    const expected = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`
    const events = new Map<string, unknown[]>([
      ['s-in', [{ type: 'deliverables/presented', data: { files: [{ path: join(root, expected) }] } }]],
      ['s-sub', [{ type: 'deliverables/presented', data: { files: [{ path: join(root, expected) }] } }]],
      ['s-out', [{ type: 'deliverables/presented', data: { files: [{ path: '/tmp/elsewhere/final.md' }] } }]],
    ])
    const query = {
      listSessions: async () => [
        { header: { id: 's-in', cwd: root } },
        { header: { id: 's-sub', cwd: join(root, 'sub') } },
        { header: { id: 's-out', cwd: '/tmp/elsewhere' } },
      ],
      observeSession: async (id: string) => ({
        events: (events.get(id) ?? []) as { type?: string, data?: unknown }[],
        [Symbol.dispose]: () => { disposed.push(id) },
      }),
    }
    const result = await presentedFromSessions(query, root)
    expect(result.scanned).toBe(2)
    expect([...result.paths]).toEqual([expected])
    expect([...result.slugs]).toEqual(['alpha'])
    expect(disposed.sort()).toEqual(['s-in', 's-sub'])
  })

  it('auditRelPath 只认交付物根下的 final.md（拒绝 meta / 穿越 / 外部绝对路径）', () => {
    const root = workspace()
    deliverable(root)
    const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`
    expect(auditRelPath(root, rel)).toEqual({ rel })
    expect(auditRelPath(root, join(root, rel))).toEqual({ rel })
    expect(auditRelPath(root, `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/meta.md`).warning).toContain('final.md')
    expect(auditRelPath(root, '../escape/final.md').warning).toBeDefined()
    expect(auditRelPath(root, '/tmp/elsewhere/final.md').warning).toBeDefined()
  })

  it('setPresentedAudit：true 同时写 path+slug；false 只认精确 path；账本可回读', () => {
    const root = workspace()
    deliverable(root)
    const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-alpha/final.md`
    const yes = setPresentedAudit(root, rel, true, new Date('2026-11-03T00:00:00Z'))
    expect(yes.path).toBe(rel)
    expect(yes.ledger?.paths[rel]).toBe(true)
    expect(yes.ledger?.slugs.alpha).toBe(true)
    const read = readPresentedLedger(root)
    expect(read.status).toBe('ok')
    const no = setPresentedAudit(root, rel, false)
    expect(no.ledger?.paths[rel]).toBe(false)
    // 坏账本不被覆盖，返回可读 warning
    writeFileSync(join(root, RUN_BUNDLE_PATHS.presented), '{not-json')
    const bad = setPresentedAudit(root, rel, true)
    expect(bad.warning).toContain('损坏')
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
    expect(parsed?.entries[0]?.root).toBe(RUN_BUNDLE_PATHS.deliverables)
  })
})
