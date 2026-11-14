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
import { deliverableOf, gateToolCall } from '../../../packages/company-pack/src/host/commands/prd-gate.ts'
import {
  UnsafeCompanyPathError,
  companyFileProblem,
  companyFileProblemAt,
  createCompanyDir,
  ensureCompanyDir,
  ensureCompanyDirAt,
  readCompanyFileAt,
  readCompanyText,
  readCompanyTextAt,
  verifyCompanySubpathAt,
  writeCompanyAtomic,
  writeCompanyAtomicAt,
} from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import { plainFileProblem } from '../../../packages/company-pack/src/host/fs/safe-file.ts'
import { validateProductDocs } from '../../../packages/company-pack/src/lib/prd-check.ts'
import { ALL_SHAPES, makeWorld, outsideSnapshot, type World } from '../../support/world-shapes.ts'

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

describe('路径等价类与读写目录闸门全通道同判据矩阵（W3.3，2026-11-14）', () => {
  const cases: Array<[string, 'text' | 'missing' | 'unsafe']> = [
    ['kb/company.md', 'text'],
    ['./kb/company.md', 'text'],
    ['kb/./company.md', 'text'],
    ['kb/../kb/company.md', 'text'],
    ['kb//company.md', 'text'],
    ['kb\\company.md', 'text'],
    ['.../company.md', 'missing'],
    ['.', 'unsafe'],
    ['..', 'unsafe'],
    ['kb/..', 'unsafe'],
    ['kb/../..', 'unsafe'],
    ['kb/symlink/../company.md', 'unsafe'],
    ['kb/not-a-dir/../company.md', 'unsafe'],
    ['..\\outside\\secret.md', 'unsafe'],
    ['kb\\..\\..\\outside\\secret.md', 'unsafe'],
    ['a/../../outside/secret.md', 'unsafe'],
  ]

  it.each(cases)('读 + problem + 原子写 + createCompanyDir 同判：%s → %s', (rel, expected) => {
    const world = makeWorld('shape-paths-')
    try {
      const home = join(world.ws, '.dsh-company')
      mkdirSync(join(home, 'kb'), { recursive: true })
      writeFileSync(join(home, 'kb/company.md'), '# ok\n')
      writeFileSync(join(home, 'kb/not-a-dir'), 'plain file\n')
      mkdirSync(join(world.outside, 'target-dir'), { recursive: true })
      writeFileSync(join(world.outside, 'secret.md'), 'secret\n')
      symlinkSync(join(world.outside, 'target-dir'), join(home, 'kb/symlink'))
      const before = outsideSnapshot(world)

      const resultAt = readCompanyFileAt(home, rel)
      expect(resultAt.kind, `readCompanyFileAt(${rel})`).toBe(expected)
      if (expected === 'text') expect(resultAt).toEqual({ kind: 'text', text: '# ok\n' })
      expect(companyFileProblemAt(home, rel), `companyFileProblemAt(${rel})`).toBe(expected === 'text' ? null : expected)
      expect(companyFileProblem(world.ws, rel), `companyFileProblem(${rel})`).toBe(expected === 'text' ? null : expected)

      if (expected === 'unsafe') {
        expect(() => writeCompanyAtomic(world.ws, rel, 'bad\n'), `writeCompanyAtomic(${rel})`).toThrow(UnsafeCompanyPathError)
        expect(() => writeCompanyAtomicAt(home, rel, 'bad\n'), `writeCompanyAtomicAt(${rel})`).toThrow(UnsafeCompanyPathError)
        expect(() => createCompanyDir(world.ws, rel), `createCompanyDir(${rel})`).toThrow(UnsafeCompanyPathError)
        expect(outsideSnapshot(world), `outside 被污染：${rel}`).toEqual(before)
      }
    } finally {
      world.cleanup()
    }
  })

  it('prd-gate 对混合分隔符、尾部 `..` 与中间段 symlink 目录回退一律拦截而非静默放行', () => {
    const world = makeWorld('shape-prd-gate-')
    try {
      const mrd = [
        '---',
        'layer: MRD',
        'definition: json-ledger',
        '---',
        '',
        '```json',
        '{"mrd":{"version":"0.1","status":"draft","opportunities":[{"id":"MR-001","title":"机会","segment":"财务","pain":"慢","evidence":[{"kind":"fact","source":"访谈"}],"recommendation":"go"}]}}',
        '```',
      ].join('\n')
      const badPrd = [
        '---',
        'layer: PRD',
        'definition: headings',
        '---',
        '',
        '## Slices',
        '| slice | Goal | Requirements (explicit ids) | Exit condition |',
        '|---|---|---|---|',
        '| S1 | 端到端 | REQ-001 | ok |',
        '',
        '### REQ-001 需求',
        '- userStory: 作为用户我要它',
        '- acceptance:',
        '  - AC-001-1',
        '    - given: g',
        '    - when: w',
        '    - then: t',
        '- source: [MR-999]',
        '- slice: S1',
        '- type: functional',
        '- priority: P0',
        '- status: draft',
        '- verification: test',
      ].join('\n')
      const goodPrd = badPrd.replace('[MR-999]', '[MR-001]')

      const badDir = join(world.ws, '.dsh-company/deliverables/bad')
      mkdirSync(join(badDir, 'drafts'), { recursive: true })
      writeFileSync(join(badDir, 'meta.md'), 'slug: bad\nnumbering: identity\n')
      writeFileSync(join(badDir, 'drafts/mrd.md'), mrd)
      writeFileSync(join(badDir, 'drafts/prd.md'), badPrd)

      const goodDir = join(world.ws, '.dsh-company/deliverables/good')
      mkdirSync(join(goodDir, 'drafts'), { recursive: true })
      writeFileSync(join(goodDir, 'meta.md'), 'slug: good\nnumbering: identity\n')
      writeFileSync(join(goodDir, 'drafts/mrd.md'), mrd)
      writeFileSync(join(goodDir, 'drafts/prd.md'), goodPrd)
      writeFileSync(join(goodDir, 'final.md'), '# ok\n')

      symlinkSync(world.outside, join(world.ws, '.dsh-company/deliverables/symlink-slug'))
      const realDeps = { check: validateProductDocs, readFile: readCompanyFileAt }

      // 1) 混合分隔符绝对路径与相对路径都必须命中 bad 动议并被拦截
      const mixedAbs = `${world.ws}/.dsh-company\\deliverables\\bad\\prd.md`
      expect(deliverableOf(mixedAbs, undefined)?.slug).toBe('bad')
      const mixedAbsVerdict = gateToolCall(
        { name: 'present', arguments: { files: [{ path: mixedAbs }] } },
        realDeps,
      )
      expect(mixedAbsVerdict?.kind).toBe('deny')
      if (mixedAbsVerdict?.kind === 'deny') expect(mixedAbsVerdict.reason).toContain('MR-999')

      const mixedRelVerdict = gateToolCall(
        { name: 'present', arguments: { files: [{ path: '.dsh-company\\deliverables\\bad\\prd.md' }] }, cwd: world.ws },
        realDeps,
      )
      expect(mixedRelVerdict?.kind).toBe('deny')

      // 2) 中间段经由 symlink 目录再 `..` 回退到合法动议 good → 必须按不安全形状拒绝
      const hopSymlinkVerdict = gateToolCall(
        {
          name: 'present',
          arguments: { files: [{ path: '.dsh-company/deliverables/symlink-slug/../good/final.md' }] },
          cwd: world.ws,
        },
        realDeps,
      )
      expect(hopSymlinkVerdict?.kind).toBe('deny')
      if (hopSymlinkVerdict?.kind === 'deny') expect(hopSymlinkVerdict.reason).toContain('文件形状挡住')

      // 3) 尾部 `..` 与越出 deliverables / .dsh-company 的路径一律按形状拒绝
      for (const unsafeDeliverablePath of [
        '.dsh-company/deliverables/..',
        '.dsh-company/deliverables/good/..',
        '.dsh-company/deliverables/../../outside/secret.md',
        '.dsh-company\\deliverables\\..\\..\\outside\\secret.md',
      ]) {
        const verdict = gateToolCall(
          { name: 'present', arguments: { files: [{ path: unsafeDeliverablePath }] }, cwd: world.ws },
          realDeps,
        )
        expect(verdict?.kind, unsafeDeliverablePath).toBe('deny')
        if (verdict?.kind === 'deny') expect(verdict.reason).toContain('文件形状挡住')
      }
    } finally {
      world.cleanup()
    }
  })

  it('空字节、盘符/绝对路径、不存在中间段回退、根级原子写 TOCTOU 与 verifyCompanySubpathAt 叶子 symlink', () => {
    const world = makeWorld('shape-edges-')
    try {
      const home = join(world.ws, '.dsh-company')
      mkdirSync(join(home, 'kb'), { recursive: true })
      writeFileSync(join(home, 'kb/company.md'), '# ok\n')
      writeFileSync(join(world.outside, 'secret.md'), 'secret\n')
      symlinkSync(join(world.outside, 'secret.md'), join(home, 'kb/leaf-link.md'))

      // 不存在中间目录再 `..` 回退（盘上无 symlink 可跟随）→ 允许按消解路径读到合法文件
      expect(readCompanyFileAt(home, 'kb/missing-hop/../company.md')).toEqual({ kind: 'text', text: '# ok\n' })
      expect(readCompanyText(world.ws, './.dsh-company/kb/company.md')).toBe('# ok\n')
      expect(ensureCompanyDir(world.ws, '.dsh-company')).toBe(home)
      expect(ensureCompanyDirAt(home, '.')).toBe(home)

      // 空字节、绝对路径、Windows 盘符路径一律 unsafe
      for (const badRel of ['kb/a\0b.md', '/etc/passwd', 'C:/evil.md', 'C:\\evil.md']) {
        expect(readCompanyFileAt(home, badRel).kind, badRel).toBe('unsafe')
        expect(() => writeCompanyAtomicAt(home, badRel, 'x'), badRel).toThrow(UnsafeCompanyPathError)
      }

      // verifyCompanySubpathAt：未落盘路径放行；叶子自身是 symlink 则抛
      expect(verifyCompanySubpathAt(home, 'deliverables/m1/prd.md')).toEqual(['deliverables', 'm1', 'prd.md'])
      expect(() => verifyCompanySubpathAt(home, 'kb/leaf-link.md')).toThrow(UnsafeCompanyPathError)

      // 根级文件（parentSegments.length === 0）原子写期间根真实路径或根形状被替换 → 拒绝 rename
      expect(() =>
        writeCompanyAtomicAt(home, 'bundle.json', '{}', {
          realpath: (() => {
            let calls = 0
            return (p: string) => (++calls === 1 ? p : `${p}-swapped`)
          })(),
        }),
      ).toThrow(UnsafeCompanyPathError)

      const worldSwap = makeWorld('shape-root-swap-')
      try {
        const swapHome = join(worldSwap.ws, '.dsh-company')
        mkdirSync(swapHome, { recursive: true })
        expect(() =>
          writeCompanyAtomicAt(swapHome, 'bundle.json', '{}', {
            writeFile: () => {
              rmSync(swapHome, { recursive: true, force: true })
              symlinkSync(worldSwap.outside, swapHome)
            },
          }),
        ).toThrow(UnsafeCompanyPathError)
      } finally {
        worldSwap.cleanup()
      }
    } finally {
      world.cleanup()
    }
  })
})
