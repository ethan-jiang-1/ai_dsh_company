import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_DESCRIBE_MAP, diffManifests, manifestFromReport, normalizeName, parseDescribeMap,
  parseManifest, renderManifest, sourceBodyHashes,
} from '../../checks/lib/refactor-drift.mjs'

/**
 * 纯搬移等价 oracle 的判别面（BUG-202）。
 *
 * 旧实现的两处假绿：`--hashes` 拿 `titlePath`（标题）冒充测试体；`--compare` 用 `Array.includes`
 * 做集合差、重复行被吞。这里把两处都变成可复现负例：同标题改断言 → 指纹必须变；重复行 2→1 →
 * 多重集差必须非空；只有文件/describe 搬家 → 空差。
 */
const dir = mkdtempSync(join(tmpdir(), 'refactor-drift-'))
const testsDir = join(dir, 'tests')
mkdirSync(testsDir, { recursive: true })
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const head = "import { describe, it, expect } from 'vitest'\n"
const strong = `${head}describe('suite', () => {\n  it('does a thing', () => {\n    // comments are not behavior\n    expect(1).toBe(1)\n  })\n})\n`
const weak = `${head}describe('suite', () => {\n  it('does a thing', () => {\n    expect(1).toContain(1)\n  })\n})\n`
const reformatted = `${head}describe('suite', () => {\n  it('does a thing', () => {\n\n    expect(1).toBe(1)\n  })\n})\n`

function sourceFile(name: string, text: string): string {
  const path = join(testsDir, name)
  writeFileSync(path, text)
  return path
}

function reportFor(file: string, fullName = 'suite does a thing') {
  return {
    testResults: [{
      name: file,
      assertionResults: [{ fullName, ancestorTitles: ['suite'], title: 'does a thing', status: 'passed' }],
    }],
  }
}

function linesOf(file: string) {
  const manifest = manifestFromReport(reportFor(file))
  return { manifest, lines: parseManifest(renderManifest(manifest.entries)) }
}

// 负例留证 2026-11-17：同标题改断言 / 重复行 2→1 在本 spec 下红（BUG-202）；修复后绿。
describe('测试体指纹（不是标题指纹）（BUG-202）', () => {
  it('同标题改断言 → 指纹不同；只改注释/空白 → 指纹相同', () => {
    const strongHash = sourceBodyHashes(strong).hashes.get('suite does a thing')
    const weakHash = sourceBodyHashes(weak).hashes.get('suite does a thing')
    const reformatHash = sourceBodyHashes(reformatted).hashes.get('suite does a thing')
    expect(strongHash).toBeDefined()
    expect(weakHash).toBeDefined()
    expect(strongHash).not.toEqual(weakHash)
    expect(strongHash).toEqual(reformatHash)
  })

  it('真实文件：manifestFromReport 回读源码并标记 resolved', () => {
    const file = sourceFile('before.spec.ts', strong)
    const { manifest } = linesOf(file)
    expect(manifest.entries[0]).toMatchObject({ resolved: true })
    expect(manifest.unresolvedCount).toBe(0)
  })

  it('读不到源码时退回标题指纹，并如实标记未定位', () => {
    const report = reportFor(join(dir, 'missing.spec.ts'), 'suite does a thing')
    const manifest = manifestFromReport(report)
    expect(manifest.entries[0]?.resolved).toBe(false)
    expect(manifest.unresolvedCount).toBe(1)
    const sameTitle = manifestFromReport(reportFor(join(dir, 'missing.spec.ts')))
    expect(sameTitle.entries[0]?.hash).toEqual(manifest.entries[0]?.hash)
  })
})

describe('多重集比较（不是集合差）', () => {
  it('拆前 2 条、拆后 1 条必须判红', () => {
    const dup = 'tests/x.spec.ts :: a > b\tdeadbeef'
    const { onlyA, onlyB } = diffManifests([dup, dup], [dup])
    expect(onlyA).toEqual([dup])
    expect(onlyB).toEqual([])
  })

  it('同标题不同测试体 → 差异非空', () => {
    const before = linesOf(sourceFile('weak-before.spec.ts', strong))
    const after = linesOf(sourceFile('weak-after.spec.ts', weak))
    const { onlyA, onlyB } = diffManifests(before.lines, after.lines)
    // 同一名字、不同指纹 = 两个不同的行：两侧各一条（这就是「测试体被改」的形状）。
    expect(onlyA).toHaveLength(1)
    expect(onlyB).toHaveLength(1)
    expect(onlyA[0]).toContain('suite does a thing')
    expect(onlyB[0]).toContain('suite does a thing')
  })

  it('真搬移（仅文件改名、测试体不变）→ 空差', () => {
    const before = linesOf(sourceFile('move-before.spec.ts', strong))
    const after = linesOf(sourceFile('move-after.spec.ts', strong))
    expect(diffManifests(before.lines, after.lines)).toEqual({ onlyA: [], onlyB: [] })
  })
})

describe('源码解析的兼容分支', () => {
  it('参数化/动态标题 / each / todo / 无回调 / 函数表达式：能索引的索引，其余如实计数', () => {
    const text = `${head}
const dynamic = 'x'
describe.each([1])('table', () => { it('a', () => { expect(1).toBe(1) }) })
describe(dynamic, () => { it('b', () => { expect(1).toBe(1) }) })
it.each([1])('each', () => {})
it.todo('later')
it('no callback')
it('with callback', function () { expect(1).toBe(1) })
it(dynamic, () => {})
foo.bar()
;(function () { return 1 })()
`
    const { hashes, unresolved } = sourceBodyHashes(text)
    expect(hashes.get('with callback')).toBeDefined()
    expect(unresolved.length).toBeGreaterThan(0)
  })

  it('manifest 兼容 titlePath / skipped / 缺 name；多条排序', () => {
    const file = sourceFile('multi.spec.ts', strong)
    const report = {
      testResults: [
        {
          name: file,
          assertionResults: [
            { titlePath: ['suite', 'does a thing'], title: 'does a thing', status: 'passed' },
            { fullName: 'suite does a thing', title: 'does a thing', status: 'skipped' },
            { fullName: 'zz last', title: 'zz last', status: 'passed' },
            { fullName: 'aa first', title: 'aa first', status: 'passed' },
          ],
        },
        { assertionResults: [{ title: 'only title', status: 'passed' }] },
      ],
    }
    const manifest = manifestFromReport(report)
    expect(manifest.entries.some(entry => entry.name.includes('only title'))).toBe(true)
    expect(manifest.entries).toHaveLength(4) // 1 skipped 被排除
    expect(manifestFromReport(report, { withBodies: false }).entries).toHaveLength(4)
    expect(manifest.entries.map(entry => entry.name)).toEqual(manifest.entries.map(entry => entry.name).sort())
  })

  it('parseDescribeMap 缺省与非法值；renderManifest 两档', () => {
    expect(parseDescribeMap()).toMatchObject(DEFAULT_DESCRIBE_MAP)
    expect(() => parseDescribeMap('broken')).toThrow(/a=b/)
    expect(renderManifest([{ name: 'n', hash: 'h', resolved: true }], { withHashes: false })).toBe('n\n')
  })
})

describe('归一规则', () => {
  it('默认 describe 表折叠域名；--describe-map 覆盖默认表', () => {
    expect(normalizeName('tests/x.spec.ts :: 交付物三态判据（R4：keyless 行为层） does it'))
      .toBe('交付物判据·域 does it')
    const map = parseDescribeMap('a=b')
    expect(map.a).toBe('b')
    expect(map).toMatchObject(DEFAULT_DESCRIBE_MAP)
  })

  it('--names 清单（无 tab）也能多重集比较', () => {
    const a = parseManifest('tests/x.spec.ts :: suite does a thing\n')
    const b = parseManifest('tests/y.spec.ts :: suite does a thing\n')
    expect(diffManifests(a, b)).toEqual({ onlyA: [], onlyB: [] })
  })
})
