// 负例留证 2026-11-13（P0 矩阵落地时补）：把 `companyFileProblemAt` 的根 symlink 检查去掉 ⇒
// root-symlink-out 用例里 fileProblemAt 说 ok / 其它载体说 not-ok，Agreement 红；还原即绿。
// 负例留证 2026-11-14：把 prd-gate 的 unsafe 分支改回 continue（折成旧动议）⇒ BUG-156 的 symlink 用例红；还原即绿。
// 负例留证 2026-11-14：BUG-156 实地造红→还原→绿——把 `readCompanyFileAt` 的
// `if (problem !== null) return { kind: 'unsafe' … }` 折成 `return { kind: 'missing' }`
// ⇒ 「leaf symlink → unsafe」用例红（1 failed / 20 passed）；还原即 21/21 绿。
/**
 * 公司盘文件形状的 Agreement 矩阵（P0，2026-11-13）。
 *
 * 判据：同一形状下，所有读载体归一后必须一致——要么都说 ok，要么都说 not-ok；
 * 只有 `readCompanyText` 把 missing/unsafe 折成 undefined 是**声明过**的更粗视图。
 * 子类（missing vs unsafe）允许分歧，但 primary 载体必须等于形状的预期类。
 *
 * 证明不了：写路径、跨进程/重启、内容语义（只判形状，不判 JSON 对不对）。
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { companyFileProblem, companyFileProblemAt, readCompanyFileAt, readCompanyText, readCompanyTextAt } from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import { plainFileProblem } from '../../../packages/company-pack/src/host/fs/safe-file.ts'
import { ALL_SHAPES, makeWorld, type World } from '../../support/world-shapes.ts'

const TARGET = 'kb/company.md'

interface Reader {
  readonly id: string
  run(world: World): unknown
}

const READERS: readonly Reader[] = [
  { id: 'company.fileProblem', run: (world) => companyFileProblem(world.ws, TARGET) },
  { id: 'company.fileProblemAt', run: (world) => companyFileProblemAt(join(world.ws, '.dsh-company'), TARGET) },
  {
    id: 'safe.plainFileProblem',
    run: (world) => plainFileProblem(join(world.ws, '.dsh-company'), join(world.ws, '.dsh-company', TARGET)),
  },
  { id: 'company.readText', run: (world) => readCompanyText(world.ws, TARGET) },
  { id: 'company.readFileAt', run: (world) => readCompanyFileAt(join(world.ws, '.dsh-company'), TARGET) },
]

/** 归一：ok / not-ok。`readCompanyText` 的 undefined 与 `readCompanyFileAt` 的 missing/unsafe 都是声明过的「更粗」视图。 */
function isOk(id: string, value: unknown): boolean {
  if (id === 'company.readText') return typeof value === 'string'
  if (id === 'company.readFileAt') return (value as { readonly kind?: string } | null)?.kind === 'text'
  return value === null
}

function describeViews(views: readonly { readonly id: string; readonly ok: boolean }[]): string {
  return views.map(view => `${view.id}=${view.ok ? 'ok' : 'not-ok'}`).join(' / ')
}

describe('公司盘文件形状的 Agreement 矩阵', () => {
  for (const shape of ALL_SHAPES) {
    it(`${shape.id}：所有读载体归一后一致`, () => {
      const world = makeWorld()
      try {
        shape.build(world, TARGET)
        const views = READERS.map(reader => ({ id: reader.id, ok: isOk(reader.id, reader.run(world)) }))
        expect(new Set(views.map(view => view.ok)).size, `载体不一致：${describeViews(views)}`).toBe(1)
        expect(views[0]?.ok, `primary 预期 ${shape.expected}，实得 ${describeViews(views)}`).toBe(shape.expected === 'ok')
        const primary = companyFileProblem(world.ws, TARGET)
        expect(primary, `primary 子类不等于预期 ${shape.expected}`).toBe(shape.expected === 'ok' ? null : shape.expected)
      } finally { world.cleanup() }
    })
  }
})

/**
 * `readCompanyFileAt` 自己的三态契约（BUG-156）：matrix 只判 ok/not-ok，这里判 missing 与 unsafe 不混。
 *
 * 为什么要单独一组：矩阵把 missing/unsafe 归一到同一个 not-ok，所以「把 unsafe 折成 missing」
 * 在矩阵里看不出来——而那正是 BUG-156 的错法（旧动议豁免会误吞 symlink）。
 */
describe('readCompanyFileAt 三态（missing 与 unsafe 不可互折）', () => {
  const readAt = (world: World, rel = TARGET) => readCompanyFileAt(join(world.ws, '.dsh-company'), rel)

  it('正常文件 → text；内容原样读回', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(world.ws, '.dsh-company', TARGET), 'hello\n')
      expect(readAt(world)).toEqual({ kind: 'text', text: 'hello\n' })
    } finally { world.cleanup() }
  })

  it('真没有 → missing（唯一可当旧动议豁免的一态）', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.ws, '.dsh-company/kb'), { recursive: true })
      expect(readAt(world)).toEqual({ kind: 'missing' })
    } finally { world.cleanup() }
  })

  it('leaf symlink → unsafe（不是 missing；折成 missing 就是 BUG-156 复发）', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(world.outside, 'secret.md'), 'secret\n')
      symlinkSync(join(world.outside, 'secret.md'), join(world.ws, '.dsh-company', TARGET))
      const result = readAt(world)
      expect(result.kind).toBe('unsafe')
      expect(result).not.toEqual({ kind: 'missing' })
    } finally { world.cleanup() }
  })

  it('公司盘根不是可读目录（根是文件）→ unsafe，不抛', () => {
    const world = makeWorld()
    try {
      writeFileSync(join(world.ws, '.dsh-company'), 'not a dir\n')
      const result = readAt(world)
      expect(result.kind).toBe('unsafe')
      if (result.kind === 'unsafe') expect(result.reason).toContain('公司盘根不是可读目录')
    } finally { world.cleanup() }
  })

  it('父目录越出公司盘 → 不吐内容（子类可能是 unsafe 或 missing）', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.ws, '.dsh-company'), { recursive: true })
      writeFileSync(join(world.outside, 'secret.md'), 'TOP SECRET\n')
      const result = readAt(world, '../outside/secret.md')
      // 判据是「不吐内容」：越界路径永远不算 text。子类不钉死——见下方已知不一致。
      expect(result.kind).not.toBe('text')
      // 已知不一致（2026-11-14 实测，不是本卡回归）：`../outside/x` 报 missing，
      // 而等价的 `../../outside/x` 报 unsafe——`walkCompanyDirs` 遇到不存在的段先 return，
      // 不抛，于是走到 plainFileProblem 的 missing。安全面不受影响（两种都不吐内容），
      // 但 subclass 不稳定：任何把 missing 当「可豁免」的读者在 `../` 形状上会跳过而非拒绝。
    } finally { world.cleanup() }
  })

  it('越界路径零泄漏：任意 ../ 形状都不返回 text', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(world.outside, 'secret.md'), 'TOP SECRET\n')
      for (const rel of ['../outside/secret.md', '../../outside/secret.md', '../outside/../outside/secret.md', 'kb/../../outside/secret.md']) {
        const result = readAt(world, rel)
        expect(result.kind, `${rel} 不能是可读 text`).not.toBe('text')
      }
    } finally { world.cleanup() }
  })

  it('根是 symlink → unsafe（不跟进去读外面）', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.outside, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(world.outside, '.dsh-company', TARGET), 'outside\n')
      symlinkSync(join(world.outside, '.dsh-company'), join(world.ws, '.dsh-company'))
      const result = readAt(world)
      expect(result.kind).toBe('unsafe')
      expect(result).not.toEqual({ kind: 'text', text: 'outside\n' })
    } finally { world.cleanup() }
  })

  it('readCompanyTextAt 对同一形状给「折成 undefined」的有损视图（与 readCompanyFileAt 同源）', () => {
    const world = makeWorld()
    try {
      mkdirSync(join(world.ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(world.ws, '.dsh-company', TARGET), 'hello\n')
      expect(readCompanyTextAt(join(world.ws, '.dsh-company'), TARGET)).toBe('hello\n')
      // 坏形状 → undefined（有损：拿不到 text 就是 undefined，分不出 missing/unsafe）
      writeFileSync(join(world.outside, 'secret.md'), 'secret\n')
      symlinkSync(join(world.outside, 'secret.md'), join(world.ws, '.dsh-company', 'kb/link.md'))
      expect(readCompanyTextAt(join(world.ws, '.dsh-company'), 'kb/link.md')).toBeUndefined()
    } finally { world.cleanup() }
  })
})

describe('越界 `..` 路径的三态子类（BUG-170）', () => {
  it('../ / ../../ / a/../../ 一律 unsafe，不折成 missing', () => {
    const ws = mkdtempSync(join(tmpdir(), 'shape-dotdot-'))
    try {
      mkdirSync(join(ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(ws, '.dsh-company/kb/company.md'), '# ok\n')
      const home = join(ws, '.dsh-company')
      for (const rel of [
        '../outside/secret.md',
        '../../outside/secret.md',
        'a/../../outside/secret.md',
        '..\\outside\\secret.md',
        'kb\\..\\..\\outside\\secret.md',
      ]) {
        expect(readCompanyFileAt(home, rel).kind, rel).toBe('unsafe')
        expect(companyFileProblemAt(home, rel), rel).toBe('unsafe')
      }
      // 内部 `..` 消解后仍在根内 → 照常读（BUG-179）；等价规范路径结果一致。
      expect(readCompanyFileAt(home, 'kb/../kb/company.md')).toEqual({ kind: 'text', text: '# ok\n' })
      expect(readCompanyFileAt(home, 'kb/company.md')).toEqual({ kind: 'text', text: '# ok\n' })
    } finally { rmSync(ws, { recursive: true, force: true }) }
  })
})

describe('路径等价类矩阵（P1，2026-11-14）', () => {
  const cases: Array<[string, 'text' | 'missing' | 'unsafe']> = [
    ['kb/company.md', 'text'],
    ['kb/./company.md', 'text'],
    ['kb/../kb/company.md', 'text'],
    ['kb//company.md', 'text'],
    ['kb\\company.md', 'text'],
    ['.../company.md', 'missing'],
    ['..\\outside\\secret.md', 'unsafe'],
    ['kb\\..\\..\\outside\\secret.md', 'unsafe'],
    ['a/../../outside/secret.md', 'unsafe'],
  ]

  it.each(cases)('%s → %s', (rel, expected) => {
    const ws = mkdtempSync(join(tmpdir(), 'shape-paths-'))
    try {
      mkdirSync(join(ws, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(ws, '.dsh-company/kb/company.md'), '# ok\n')
      writeFileSync(join(ws, 'outside-secret.md'), 'secret\n')
      const home = join(ws, '.dsh-company')
      const result = readCompanyFileAt(home, rel)
      expect(result.kind, rel).toBe(expected)
      if (expected === 'text') expect(result).toEqual({ kind: 'text', text: '# ok\n' })
      expect(companyFileProblemAt(home, rel), rel).toBe(expected === 'text' ? null : expected)
    } finally {
      rmSync(ws, { recursive: true, force: true })
    }
  })
})
