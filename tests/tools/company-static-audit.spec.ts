/**
 * Domain static audit tests (`checks/lib/company-static-audit.mjs`):
 * proves R1 (TypeChecker boundary consumption), R2 (CJK/punct AST guard + lib ratchet),
 * R3 (`undefined/null as never` ban + baseline metrics), and R4 (read-only hygiene counts)
 * both pass on the live repo AND fail loudly on injected negative controls.
 */
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createVirtualProgram,
  formatStaticAuditReport,
  LIB_CJK_RATCHET,
  loadTsProgram,
  runStaticAudit,
} from '../../checks/lib/company-static-audit.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/core/repository-layout.mjs'

const V_TYPES = resolve(ROOT, 'packages/company-pack/src/client/virtual-types.ts')

const BOUNDARY_DEFS = `
export interface DeliverablesCatalog { readonly schema: 1; readonly entries: readonly { slug: string }[]; readonly skipped: number }
export type WorkspaceTextRead = { readonly ok: true; readonly text: string; readonly eof: boolean } | { readonly ok: false; readonly reason: string }
export interface PendingApprovals { readonly items: readonly string[]; readonly capped: number }
export interface Bounded<T> { readonly items: readonly T[]; readonly total: number; readonly capped: number; readonly truncated: boolean }
export interface MotionLedger { readonly rows: readonly string[]; readonly badRows: readonly number[]; readonly headerOk: boolean }
export function parseCatalog(): DeliverablesCatalog | null { return { schema: 1, entries: [], skipped: 0 } }
export async function readWorkspace(): Promise<WorkspaceTextRead> { return { ok: true, text: '', eof: true } }
export async function remoteRead(): Promise<{ readonly ok: true; readonly value: { readonly text: string; readonly eof: boolean } } | { readonly ok: false }> {
  return { ok: true, value: { text: '', eof: true } }
}
export function readApprovals(): PendingApprovals { return { items: [], capped: 0 } }
export function takeBounded<T>(items: readonly T[]): Bounded<T> { return { items, total: items.length, capped: 0, truncated: false } }
export function readLedger(): MotionLedger { return { rows: [], badRows: [], headerOk: true } }
export interface PendingAcrossSessions { readonly items: readonly string[]; readonly asksCapped: number; readonly scanned: number; readonly failed: number; readonly window: 'none' | 'some' }
export type HistoryCandidates = { readonly ok: true; readonly ids: readonly string[]; readonly total: number; readonly capped: number } | { readonly ok: false; readonly reason: 'workspace-unknown' }
export type ContextSourceResult = { readonly ok: true; readonly value: readonly string[]; readonly skipped?: number; readonly capped?: number } | { readonly ok: false; readonly problem: string }
export interface CultivationPanelData { readonly journalRows: readonly string[] | null; readonly records: readonly string[] | null; readonly recordsProblem: string | null; readonly brokenRecords: readonly string[]; readonly unexpandedRecords: number; readonly refresh: () => void }
export function readAcross(): PendingAcrossSessions { return { items: [], asksCapped: 0, scanned: 0, failed: 0, window: 'none' } }
export function pickCandidates(): HistoryCandidates { return { ok: true, ids: [], total: 0, capped: 0 } }
export function listContext(): ContextSourceResult { return { ok: true, value: [], skipped: 0, capped: 0 } }
export function readPanel(): CultivationPanelData { return { journalRows: null, records: null, recordsProblem: null, brokenRecords: [], unexpandedRecords: 0, refresh: () => {} } }
`

function runVirtual(relPath: string, code: string) {
  const abs = resolve(ROOT, relPath)
  const program = createVirtualProgram({ [V_TYPES]: BOUNDARY_DEFS, [abs]: code })
  return runStaticAudit(ROOT, { programs: [program] })
}

describe('company-static-audit · 实仓扫描与格式', () => {
  it('实仓全量双面扫描 zero violations（R1/R2/R3 全部通过）', () => {
    const report = runStaticAudit(ROOT)
    expect(report.scannedFiles).toBeGreaterThanOrEqual(100)
    expect(report.violations).toEqual([])
    expect(LIB_CJK_RATCHET.size).toBeGreaterThan(0)
    const formatted = formatStaticAuditReport(report)
    expect(formatted).toContain('violations=0')
    expect(formatted).toContain('metrics(baseline):')
  }, 180_000)

  it('无效 tsconfig 路径立即抛错（fail-loud）', () => {
    expect(() => loadTsProgram('/tmp/nonexistent-company-pack-tsconfig.json')).toThrow(/tsconfig read failed/)
  })
})

describe('R1 must-use-boundary · 负例与正例', () => {
  it('读 catalog.entries 却忽略 catalog.skipped ⇒ 阻断', () => {
    const report = runVirtual('packages/company-pack/src/client/bad-catalog.ts', `
      import { parseCatalog } from './virtual-types.js'
      export function bad() {
        const catalog = parseCatalog()
        if (!catalog) return []
        return catalog.entries
      }
    `)
    expect(report.violations.map(v => v.rule)).toContain('R1:must-use-boundary')
  })

  it('解构/行内/封装 value 只取 data 不读 eof/capped/badRows ⇒ 阻断', () => {
    const report = runVirtual('packages/company-pack/src/client/bad-reads.ts', `
      import { parseCatalog, readWorkspace, remoteRead, readApprovals, readLedger } from './virtual-types.js'
      export async function badAll() {
        const a = parseCatalog()?.entries
        const { items } = readApprovals()
        const { rows } = readLedger()
        const txt = await readWorkspace()
        const textVal = txt.ok ? txt.text : ''
        const rem = await remoteRead()
        const remText = rem.ok ? rem.value.text : ''
        return { a, items, rows, textVal, remText }
      }
    `)
    const r1 = report.violations.filter(v => v.rule === 'R1:must-use-boundary')
    expect(r1.length).toBeGreaterThanOrEqual(5)
  })

  it('三元表达式、useMemo 封装、嵌套 value 解构与 console.log 假透传均不可绕过 R1', () => {
    const report = runVirtual('packages/company-pack/src/client/bad-wrappers.ts', `
      import { parseCatalog, readApprovals, readLedger, remoteRead, takeBounded } from './virtual-types.js'
      declare function useMemo<T>(fn: () => T, deps: unknown[]): T
      export async function wrapped(ready: boolean) {
        const l = ready ? readLedger() : null
        const rows = l ? l.rows : []
        const asks = useMemo(() => readApprovals(), [])
        const items = asks.items
        const { value: { text } } = await remoteRead()
        const c = parseCatalog()
        console.log(c)
        const ce = c ? c.entries : []
        const bItems = takeBounded(['a', 'b']).items
        return { rows, items, text, ce, bItems }
      }
    `)
    const r1 = report.violations.filter(v => v.rule === 'R1:must-use-boundary')
    expect(r1.length).toBeGreaterThanOrEqual(5)
  })

  it('同时消费 boundary 字段或透传整个结果对象 ⇒ 通过（零误报）', () => {
    const report = runVirtual('packages/company-pack/src/client/good-reads.ts', `
      import { parseCatalog, readWorkspace, remoteRead, readApprovals, readLedger, takeBounded } from './virtual-types.js'
      export async function goodAll() {
        const c = parseCatalog()
        const entries = c ? { rows: c.entries, skipped: c.skipped } : null
        const { items, capped } = readApprovals()
        const b = takeBounded(['a', 'b'])
        const bt = takeBounded(['c'])
        const { rows, badRows } = readLedger()
        const w = await readWorkspace()
        const text = w.ok && w.eof ? w.text : ''
        const rem = await remoteRead()
        const remText = rem.ok && rem.value.eof ? rem.value.text : ''
        return {
          entries, items, capped,
          bItems: b.items, bCapped: b.capped,
          btItems: bt.truncated ? bt.items : [],
          rows, badRows, text, remText,
        }
      }
      export function passthrough() {
        const res = readApprovals()
        return res
      }
    `)
    expect(report.violations).toEqual([])
  })
})

describe('R2 no-literal-cjk-or-punct · R3 no-type-escape · R4 hygiene', () => {
  it('src/client 非字典中文、JSX 中文文本、.join("；")、以及 src/lib 新泄漏均被 R2 拦截', () => {
    const clientReport = runVirtual('packages/company-pack/src/client/bad-i18n.tsx', `
      export function Bad({ items }: { items: string[] }) {
        const s = '未翻译错误'
        const joined = items.join('；')
        return <div>{'标签'}{joined}{s}<span>面板文本</span></div>
      }
    `)
    const r2Client = clientReport.violations.filter(v => v.rule === 'R2:no-literal-cjk-or-punct')
    expect(r2Client.length).toBeGreaterThanOrEqual(4)
    expect(r2Client.some(v => v.message.includes('Chinese join separator'))).toBe(true)

    const libReport = runVirtual('packages/company-pack/src/lib/new-leak.ts', `
      export const leak = '不该出现的中文提示'
    `)
    expect(libReport.violations.map(v => v.rule)).toContain('R2:no-literal-cjk-or-punct')
  })

  it('注释、正则、类型字面量与字典白名单不误报', () => {
    const okReport = runVirtual('packages/company-pack/src/client/locales.ts', `
      /* 中文注释 */
      export const re = /中文正则/
      export type Kind = '决策' | '生产'
      export const zh = { title: '中文标题' }
    `)
    expect(okReport.violations).toEqual([])
  })

  it('undefined as never / null as never 被 R3 阻断；R4 只读计数准确', () => {
    const report = runVirtual('packages/company-pack/src/client/bad-escape.tsx', `
      export function Demo(x: unknown, a?: string) {
        const u = undefined as never
        const n = (null) as never
        const o = x as never
        const j = JSON.parse('{}') as { ok: boolean }
        try {
          if (a === undefined || a === 'x') return { u, n, o, j }
        } catch {}
        try { return o } catch { /* intentional-fallback: suppressed */ }
        return <input defaultValue="hi" />
      }
    `)
    const r3 = report.violations.filter(v => v.rule === 'R3:no-type-escape')
    expect(r3).toHaveLength(2)
    expect(report.metrics.asNever).toBe(1)
    expect(report.metrics.jsonParseAs).toBe(1)
    expect(report.metrics.silentCatch).toBe(1)
    expect(report.metrics.jsxDefaultValue).toBe(1)
    expect(report.metrics.failOpenUndefined).toBe(1)
    expect(formatStaticAuditReport(report)).toContain('FAIL [R3:no-type-escape]')
  })
})

// 负例留证 2026-11-24：删掉左枝解包 / Promise.all 绑定 / requireAllBoundaryProps / host 扫描 / 字典拆分任一项 ⇒ 对应用例红。BUG-340
describe('BUG-340 · 六条绕过缝隙的负控', () => {
  it('?? 左枝默认兜底、Promise.all 数组解构、MotionLedger 只读 headerOk 都被 R1 拦住', () => {
    const report = runVirtual('packages/company-pack/src/client/bad-bypass.ts', `
      import { parseCatalog, readWorkspace, readLedger } from './virtual-types.js'
      export async function leftDefault() {
        const { entries } = parseCatalog() ?? { schema: 1 as const, entries: [], skipped: 0 }
        return entries
      }
      export async function viaPromiseAll() {
        const [a] = await Promise.all([readWorkspace()])
        return a.ok ? a.text : ''
      }
      export function partialLedger() {
        const { rows, headerOk } = readLedger()
        return { rows, headerOk }
      }
    `)
    const r1 = report.violations.filter(v => v.rule === 'R1:must-use-boundary')
    expect(r1.length).toBeGreaterThanOrEqual(3)
  })

  it('新纳管的边界类型（跨会话/候选/背景源/培养面板）丢边界字段都拦住', () => {
    const report = runVirtual('packages/company-pack/src/client/bad-new-boundaries.ts', `
      import { readAcross, pickCandidates, listContext, readPanel } from './virtual-types.js'
      export function across() { const p = readAcross(); return p.items }
      export function candidates() { const h = pickCandidates(); if (!h.ok) return []; return h.ids }
      export function context() { const c = listContext(); return c.ok ? c.value : [] }
      export function panel() { const d = readPanel(); return d.records }
    `)
    const r1 = report.violations.filter(v => v.rule === 'R1:must-use-boundary')
    expect(r1.length).toBeGreaterThanOrEqual(4)
  })

  it('src/host 新增文件写死中文被 R2 拦住；已有基线文件不误报', () => {
    const hostBad = runVirtual('packages/company-pack/src/host/commands/new-leak.ts', `
      export const message = 'host 新写死的中文回执'
    `)
    expect(hostBad.violations.map(v => v.rule)).toContain('R2:no-literal-cjk-or-punct')

    const hostBaseline = runVirtual('packages/company-pack/src/host/commands/blocked-text.ts', `
      export const message = '公司数据已停写（原因：运行前提未满足）；先处理该原因再设置。'
    `)
    expect(hostBaseline.violations).toEqual([])
  })

  it('cultivation-actions 逻辑区不再整文件豁免；字典文件仍是白名单', () => {
    const logic = runVirtual('packages/company-pack/src/client/cultivation/cultivation-actions.ts', `
      export const bad = '逻辑区写死的中文'
    `)
    expect(logic.violations.map(v => v.rule)).toContain('R2:no-literal-cjk-or-punct')
    const dict = runVirtual('packages/company-pack/src/client/cultivation/cultivation-copy.ts', `
      export const zh = { title: '字典里的中文标题' }
    `)
    expect(dict.violations).toEqual([])
  })
})
