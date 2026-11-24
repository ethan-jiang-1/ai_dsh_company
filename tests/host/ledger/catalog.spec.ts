// 负例留证 2026-11-13：presented 写回 temp+rename 不捕获目录 ⇒ setPresentedAudit 抛 EISDIR（BUG-138）；safe 写 + 捕获即绿。
// 负例留证 2026-11-18：deliverables 子目录 symlink 被静默跳过、warnings 为空（BUG-231）；加 symlink warning 后绿。
// 负例留证 2026-11-18：`slug:` 空值被当已声明（entry.slug=''）（BUG-232）；回退目录名 + warning 后绿。
// 负例留证 2026-11-18：meta/ledger chmod 000 直接抛 EACCES（BUG-238）；catch 成 warning 后绿。
// 负例留证 2026-11-18：final chmod 000 仍 final:true、warnings 空（BUG-239）；按不可读降级后绿。
// 负例留证 2026-11-18：零字节 final 仍 present（BUG-259）；按空文件降级后绿。
// 负例留证 2026-11-18：catalog.json symlink 被静默替换（BUG-260）；拒绝写后绿。
/**
 * 成品目录 host 生成器（2026-10-25；2026-11-01 v3 路径）的 keyless 判据。
 *
 * 判据：①空盘也生成 schema 1 的空目录；②条目未变时二次生成不写；
 * ③present 事件按 `.dsh-company/deliverables.../final.md` 投影；④meta/台账解析与仓库口径一致；
 * ⑤一个 workspace 的扫描不读另一个。
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  auditRelPath,
  catalogPath,
  emptyPresentedLedger,
  mergePresented,
  presentedFromEvent,
  presentedOf,
  presentedFromSessions,
  readCatalog,
  readCatalogState,
  readPresentedLedger,
  regenerateCatalog,
  scanCatalogEntries,
  setPresentedAudit,
} from '../../../packages/company-pack/src/host/ledger/catalog.ts'
import {
  ledgerSlugsFromText,
  parseMeta,
  slugFromDirName,
} from '../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts'
import { parseMotionLedger } from '../../../packages/company-pack/src/lib/accounting/ledger.ts'
import { parseCatalog } from '../../../packages/company-pack/src/client/data/deliverables-index.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/shared/run-bundle-paths.ts'
import { makeTempDir } from '../../support/temp-env.ts'

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
  writeFileSync(join(path, 'meta.md'), 'slug: alpha\nkickoff: 2026-10-25\ntype: decision\nresult: completed\nsummary: 做完了\n')
  return path
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('meta/catalog 纯逻辑', () => {
  it('解析中文字段与首现值，剥日期前缀', () => {
    const meta = parseMeta('slug: alpha\ntype: decision\nresult: completed\nevents: 第一版\n')
    expect(meta.fields.get('type')).toBe('decision')
    expect(meta.fields.get('result')).toBe('completed')
    expect(slugFromDirName('2026-10-25-alpha')).toBe('alpha')
  })

  it('台账解析只认表行首列', () => {
    const header = '| slug | date | type | participants | wallClock | deliverable | summary |\n|---|---|---|---|---|---|---|\n'
    const slugs = ledgerSlugsFromText(`${header}| alpha | 2026-10-25 | decision | ceo | 1m | ✅ | s |\n| beta | 2026-10-26 | decision | ceo | 1m | ✅ | s |\n`)
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

  // 负例留证 2026-11-19：坏索引被静默覆盖，无 warning、旧字节丢失（BUG-276）；备份 + warning 后绿。
  it('旧 catalog JSON 损坏 → warning 且旧字节备份到 .bak（BUG-276）', () => {
    const root = workspace()
    deliverable(root)
    const path = catalogPath(root)
    const oldBytes = '{ definitely not json'
    writeFileSync(path, oldBytes)
    const result = regenerateCatalog(root)
    expect(result.warnings.some(warning => warning.includes('旧索引') && warning.includes('重建'))).toBe(true)
    expect(existsSync(`${path}.bak`)).toBe(true)
    expect(readFileSync(`${path}.bak`, 'utf8')).toBe(oldBytes)
  })

  it('kb 目录不可写：备份与写入各降级成 warning，不抛（BUG-276 边界）', () => {
    const root = workspace()
    deliverable(root)
    const path = catalogPath(root)
    writeFileSync(path, '{ definitely not json')
    const kb = join(root, RUN_BUNDLE_PATHS.kb)
    chmodSync(kb, 0o500)
    try {
      const result = regenerateCatalog(root)
      expect(result.written).toBe(false)
      expect(result.warnings.some(warning => warning.includes('备份失败'))).toBe(true)
      expect(result.warnings.some(warning => warning.includes('写入失败'))).toBe(true)
    } finally {
      chmodSync(kb, 0o755)
    }
  })

  it('旧索引的备份目标被目录占用：跳过备份 + warning，仍重建（BUG-276 边界）', () => {
    const root = workspace()
    deliverable(root)
    const path = catalogPath(root)
    writeFileSync(path, '{ definitely not json')
    mkdirSync(`${path}.bak`)
    const result = regenerateCatalog(root)
    expect(result.warnings.some(warning => warning.includes('跳过旧索引备份'))).toBe(true)
    expect(result.written).toBe(true)
  })

  it('台账命中与未命中都写进目录', () => {
    const root = workspace()
    deliverable(root)
    writeFileSync(join(root, RUN_BUNDLE_PATHS.ledger), '| slug | date | type | participants | wallClock | deliverable | summary |\n|---|---|---|---|---|---|---|\n| alpha | 2026-10-25 | decision | ceo | 1m | ✅ | s |\n')
    const catalog = regenerateCatalog(root).catalog
    expect(catalog?.entries[0]?.ledgered).toBe(true)
    expect(catalog?.counts.unledgered).toBe(0)
  })

  it('deliverables 子目录 symlink → warning 且不纳入（BUG-231）', () => {
    const root = workspace()
    const base = join(root, RUN_BUNDLE_PATHS.deliverables)
    mkdirSync(join(base, '2026-10-25-real'), { recursive: true })
    writeFileSync(join(base, '2026-10-25-real', 'meta.md'), 'slug: real\n')
    writeFileSync(join(base, '2026-10-25-real', 'final.md'), '# final\n')
    symlinkSync(join(base, '2026-10-25-real'), join(base, '2026-10-25-linked'))
    const result = regenerateCatalog(root)
    expect(result.catalog?.entries.map(entry => entry.dir)).toEqual(['2026-10-25-real'])
    expect(result.warnings.some(warning => warning.includes('2026-10-25-linked') && warning.includes('symlink'))).toBe(true)
  })

  it('meta.md / ledger 不可读 → warning 降级，不抛（BUG-238）', () => {
    const root = workspace()
    const dir = deliverable(root)
    const meta = join(dir, 'meta.md')
    const ledger = join(root, RUN_BUNDLE_PATHS.ledger)
    try {
      chmodSync(meta, 0o000)
      const metaResult = regenerateCatalog(root)
      expect(metaResult.warnings.some(warning => warning.includes('不可读'))).toBe(true)
      chmodSync(meta, 0o644)
      chmodSync(ledger, 0o000)
      const ledgerResult = regenerateCatalog(root)
      expect(ledgerResult.warnings.some(warning => warning.includes('不可读'))).toBe(true)
    } finally {
      chmodSync(meta, 0o644)
      chmodSync(ledger, 0o644)
    }
  })

  it('零字节 final → 不算 present，出 warning（BUG-259）', () => {
    const root = workspace()
    const dir = deliverable(root)
    writeFileSync(join(dir, 'final.md'), '')
    const result = regenerateCatalog(root)
    expect(result.catalog?.entries).toEqual([])
    expect(result.warnings.some(warning => warning.includes('为空'))).toBe(true)
  })

  // 负例留证 2026-11-19：纯空白 final.md（'   \n'）仍 final:true、warnings 空（BUG-275）；按 trim 判空后绿。
  it('纯空白 final.md → final:false 且 warning 点名路径（BUG-275）', () => {
    const root = workspace()
    const dir = deliverable(root)
    const final = join(dir, 'final.md')
    writeFileSync(final, '   \n')
    const scan = scanCatalogEntries(root, emptyPresentedLedger())
    expect(scan.entries[0]?.final).toBe(false)
    expect(scan.warnings.some(warning => warning.includes(final))).toBe(true)
  })

  it('catalog.json 是 symlink → 拒绝写并 warning（BUG-260）', () => {
    const root = workspace()
    deliverable(root)
    const target = join(root, 'elsewhere.json')
    symlinkSync(target, catalogPath(root))
    const result = regenerateCatalog(root)
    expect(result.written).toBe(false)
    expect(result.warnings.some(warning => warning.includes('symlink'))).toBe(true)
    expect(existsSync(target)).toBe(false)
  })

  it('final.md 不可读 → 不算 present，出 warning（BUG-239）', () => {
    const root = workspace()
    const dir = deliverable(root)
    const final = join(dir, 'final.md')
    try {
      chmodSync(final, 0o000)
      const result = regenerateCatalog(root)
      expect(result.catalog?.entries).toEqual([])
      expect(result.warnings.some(warning => warning.includes('不可读'))).toBe(true)
    } finally {
      chmodSync(final, 0o644)
    }
  })

  it('meta.md 的空 slug 回退目录名并 warning（BUG-232）', () => {
    const root = workspace()
    const dir = join(root, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-empty')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.md'), 'slug:\n')
    writeFileSync(join(dir, 'final.md'), '# final\n')
    const result = regenerateCatalog(root)
    expect(result.catalog?.entries[0]?.slug).toBe('empty')
    expect(result.warnings.some(warning => warning.includes('slug 为空'))).toBe(true)
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
    writeFileSync(join(dir, 'meta.md'), 'slug: alpha\nkickoff: 2026-10-25\ntype: decision\nresult: complete\n')
    const catalog = regenerateCatalog(root).catalog
    expect(catalog?.entries[0]?.metaProblem).toContain('result 不在词表')
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

describe('坏形状：存在 ≠ 可读普通文件', () => {
  it('final.md / meta.md 是目录：不抛、不产生假 final、warnings 点名', () => {
    const root = workspace()
    const dir = join(root, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-baddir')
    mkdirSync(join(dir, 'final.md'), { recursive: true })
    mkdirSync(join(dir, 'meta.md'), { recursive: true })
    const result = regenerateCatalog(root)
    expect(result.warnings.some(warning => warning.includes('final.md'))).toBe(true)
    expect(result.warnings.some(warning => warning.includes('meta.md'))).toBe(true)
    expect(result.catalog?.entries.some(item => item.dir === '2026-10-25-baddir')).toBe(false)
  })

  it('kb/motion-ledger.md 是目录：不抛 EISDIR，按空账本处理', () => {
    const root = workspace()
    deliverable(root)
    rmSync(join(root, RUN_BUNDLE_PATHS.ledger), { force: true })
    mkdirSync(join(root, RUN_BUNDLE_PATHS.ledger), { recursive: true })
    const result = regenerateCatalog(root)
    expect(result.warnings.some(warning => warning.includes('motion-ledger.md'))).toBe(true)
    expect(result.catalog?.entries.length).toBe(1)
  })

  it('审计不存在的 final.md → 可操作错误，账本不预写 slug', () => {
    const root = workspace()
    const rel = `${RUN_BUNDLE_PATHS.deliverables}/nope/final.md`
    const result = setPresentedAudit(root, rel, true)
    expect(result.ledger).toBeUndefined()
    expect(result.warning).toContain('不存在')
    expect(readPresentedLedger(root).status).not.toBe('ok')
  })

  it('审计 final.md 是目录 → 拒绝（不是普通文件）', () => {
    const root = workspace()
    const dir = join(root, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-dirfinal')
    mkdirSync(join(dir, 'final.md'), { recursive: true })
    const result = setPresentedAudit(root, `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-dirfinal/final.md`, true)
    expect(result.ledger).toBeUndefined()
    expect(result.warning).toContain('不是普通文件')
  })

  it('final.md / meta.md 是 symlink（指向 workspace 外）→ warning 且不纳入成品', () => {
    const root = workspace()
    const outside = mkdtempSync(join(tmpdir(), 'catalog-outside-'))
    const dir = join(root, RUN_BUNDLE_PATHS.deliverables, '2026-11-13-link')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(outside, 'final.md'), '# outside final\n')
    writeFileSync(join(outside, 'meta.md'), 'slug: linked\n')
    symlinkSync(join(outside, 'final.md'), join(dir, 'final.md'))
    symlinkSync(join(outside, 'meta.md'), join(dir, 'meta.md'))
    const result = regenerateCatalog(root)
    expect(result.catalog?.entries.some(entry => entry.dir === '2026-11-13-link')).toBe(false)
    expect(result.warnings.some(warning => warning.includes('symlink'))).toBe(true)
    rmSync(outside, { recursive: true, force: true })
  })

  it('扫描根是文件/symlink → warning 不抛；catalog 输出是目录 → written:false', () => {
    const root = workspace()
    const deliverables = join(root, RUN_BUNDLE_PATHS.deliverables)
    rmSync(deliverables, { recursive: true, force: true })
    writeFileSync(deliverables, 'not a dir')
    const first = regenerateCatalog(root)
    expect(first.warnings.some(warning => warning.includes('不是目录'))).toBe(true)
    // 输出路径被目录占用
    rmSync(deliverables, { force: true })
    rmSync(join(root, RUN_BUNDLE_PATHS.catalog), { force: true })
    mkdirSync(join(root, RUN_BUNDLE_PATHS.catalog), { recursive: true })
    const second = regenerateCatalog(root)
    expect(second.written).toBe(false)
    expect(second.warnings.some(warning => warning.includes('目录占用'))).toBe(true)
  })

  it('kb 是 symlink → 拒绝写 catalog，外部目录字节不动', () => {
    const root = workspace()
    const outside = mkdtempSync(join(tmpdir(), 'catalog-outside-kb-'))
    rmSync(join(root, RUN_BUNDLE_PATHS.kb), { recursive: true, force: true })
    symlinkSync(outside, join(root, RUN_BUNDLE_PATHS.kb))
    const result = regenerateCatalog(root)
    expect(result.written).toBe(false)
    expect(result.warnings.some(warning => warning.includes('symlink'))).toBe(true)
    expect(existsSync(join(outside, 'deliverables-index.json'))).toBe(false)
    rmSync(outside, { recursive: true, force: true })
  })

  it('catalog 索引是 symlink → 读面 corrupt，不返回外部条目', () => {
    const root = workspace()
    const outside = mkdtempSync(join(tmpdir(), 'catalog-outside-index-'))
    writeFileSync(join(outside, 'index.json'), JSON.stringify({ schema: 1, generatedAt: 'x', entries: [{ slug: 'fake' }], counts: {} }))
    mkdirSync(join(root, RUN_BUNDLE_PATHS.kb), { recursive: true })
    symlinkSync(join(outside, 'index.json'), join(root, RUN_BUNDLE_PATHS.catalog))
    expect(readCatalogState(root).status).toBe('corrupt')
    rmSync(outside, { recursive: true, force: true })
  })

  it('presented 账本 symlink → corrupt；审计 symlink final → 拒绝且不写账本', () => {
    const root = workspace()
    const y = deliverable(root, `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-y`)
    const xDir = join(root, RUN_BUNDLE_PATHS.deliverables, '2026-10-25-x')
    mkdirSync(xDir, { recursive: true })
    symlinkSync(join(y, 'final.md'), join(xDir, 'final.md'))
    const audit = setPresentedAudit(root, `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-x/final.md`, true)
    expect(audit.ledger).toBeUndefined()
    expect(audit.warning).toContain('symlink')
    expect(readPresentedLedger(root).status).not.toBe('ok')

    const outside = mkdtempSync(join(tmpdir(), 'catalog-outside-ledger-'))
    writeFileSync(join(outside, 'ledger.json'), JSON.stringify({ schema: 1, updatedAt: 'x', paths: { fake: true }, slugs: { fake: true } }))
    mkdirSync(join(root, RUN_BUNDLE_PATHS.kb), { recursive: true })
    symlinkSync(join(outside, 'ledger.json'), join(root, RUN_BUNDLE_PATHS.presented))
    expect(readPresentedLedger(root).status).toBe('corrupt')
    rmSync(outside, { recursive: true, force: true })
  })

  it('presented 输出被目录占用 → 审计可读失败，不抛 EISDIR（BUG-138）', () => {
    const root = workspace()
    deliverable(root, `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-a`)
    mkdirSync(join(root, RUN_BUNDLE_PATHS.presented), { recursive: true })
    const result = setPresentedAudit(root, `${RUN_BUNDLE_PATHS.deliverables}/2026-10-25-a/final.md`, true)
    expect(result.ledger).toBeUndefined()
    expect(result.warning).toBeTruthy()
  })
})

// 负例留证 2026-11-24：present 写入退回 slugFromDirName、或 presentedOf 去掉目录名回退 ⇒ 本组红。BUG-357
describe('presented 身份与归档延续（BUG-357）', () => {
  it('meta 自定义 slug：present 写 custom slug，归档后仍 presented: true', () => {
    const root = workspace()
    const dir = `${RUN_BUNDLE_PATHS.deliverables}/2026-11-20-dir-name`
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, 'final.md'), '# final\n')
    writeFileSync(join(root, dir, 'meta.md'), 'slug: custom-name\nkickoff: 2026-11-20\ntype: decision\nresult: completed\nsummary: done\n')
    const rel = `${dir}/final.md`

    const event = { data: { files: [{ path: join(root, rel) }] } }
    const observed = presentedFromEvent(event, root)
    expect([...observed.slugs]).toEqual(['custom-name'])
    const ledger = mergePresented(emptyPresentedLedger(), observed)
    expect(regenerateCatalog(root, ledger).catalog?.entries[0]?.presented).toBe(true)

    mkdirSync(join(root, RUN_BUNDLE_PATHS.archive), { recursive: true })
    renameSync(join(root, dir), join(root, RUN_BUNDLE_PATHS.archive, '2026-11-20-dir-name'))
    expect(regenerateCatalog(root, ledger).catalog?.entries[0]?.presented).toBe(true)
  })

  it('presentedFromEvent：meta 缺失退回目录名 slug', () => {
    const root = workspace()
    const dir = `${RUN_BUNDLE_PATHS.deliverables}/2026-11-20-no-meta`
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, 'final.md'), '# final\n')
    const observed = presentedFromEvent({ data: { files: [{ path: join(root, dir, 'final.md') }] } }, root)
    expect([...observed.slugs]).toEqual(['no-meta'])
  })

  it('自定义 meta slug 不会拿别处的目录名 slug 冒领（BUG-357 复审 finding 3）', () => {
    const other = mergePresented(emptyPresentedLedger(), { paths: [], slugs: ['demo'] })
    expect(presentedOf(other, `${RUN_BUNDLE_PATHS.deliverables}/2026-11-21-demo/final.md`, 'my-custom')).toBe(true) // 旧语义：无 dirSlugs 时 slugs 视作目录名集
    const upgraded = { ...other, dirSlugs: {} }
    expect(presentedOf(upgraded, `${RUN_BUNDLE_PATHS.deliverables}/2026-11-21-demo/final.md`, 'my-custom')).toBeNull()
  })

  it('presentedOf：旧账本只有目录名 slug 时，归档路径也能回退命中', () => {
    const legacy = mergePresented(emptyPresentedLedger(), { paths: [], slugs: ['dir-name'] })
    expect(presentedOf(legacy, `${RUN_BUNDLE_PATHS.archive}/2026-11-20-dir-name/final.md`, 'custom-name')).toBe(true)
  })

  it('升级前账本只有目录名 slug：presentedOf 回退比对，不丢背书', () => {
    const root = workspace()
    const dir = `${RUN_BUNDLE_PATHS.deliverables}/2026-11-20-dir-name`
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, 'final.md'), '# final\n')
    writeFileSync(join(root, dir, 'meta.md'), 'slug: custom-name\nkickoff: 2026-11-20\ntype: decision\nresult: completed\n')
    // 故意只给 slug（不给精确 path），逼 presentedOf 走 dirSlugs 回退（BUG-357 复审 finding 2）。
    const legacy = mergePresented(emptyPresentedLedger(), { paths: [], slugs: ['dir-name'] })
    expect(regenerateCatalog(root, legacy).catalog?.entries[0]?.presented).toBe(true)
  })
})

// 负例留证 2026-11-24：让 slug 集合继续接受非权威表头/重复表头 ⇒ 本组红（与台账面板结论相反）。BUG-362
describe('台账 slug 集合与权威解析同判据（BUG-362 复审）', () => {
  it('非权威表头 ⇒ 空集合（与权威解析一致）', () => {
    const text = '| slug | 日期 |\n|---|---|\n| alpha | 2026-10-25 |\n'
    expect([...ledgerSlugsFromText(text)]).toEqual([])
    expect(parseMotionLedger(text).rows).toEqual([])
  })

  it('重复表头不产出字面量 slug', () => {
    const header = '| slug | date | type | participants | wallClock | deliverable | summary |'
    const text = [header, '|---|---|---|---|---|---|---|', '| a | 2026-10-25 | decision | ceo | 1m | ✅ | s |', header].join('\n')
    expect([...ledgerSlugsFromText(text)]).toEqual(['a'])
  })
})
