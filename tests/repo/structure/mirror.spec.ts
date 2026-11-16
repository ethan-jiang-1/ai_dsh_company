/**
 * 测试树 ↔ 源码树的目录镜像（2026-11-15，卡 `tests-tree-axis` 落地）。
 *
 * 为什么：「tests/host 与 tests/client 镜像 src 组」这条规则从 2026-11 起只活在 tests/README 的一行散文里，
 *   而四份文档给出三个不同的组数（8 个名字 / 表里 9 行 / 盘上 11 个目录），漂了没人发现——`nav-count-claims`
 *   只扫「页签」，组数不在任何门禁的射程。镜像的收益只有一个：维护者的检索反射「改了 src/X → 去 tests/X 找证据」。
 *   把这条反射变成断言，才算接缝而不是口号。
 * 判据：两侧目录名集合相等；对不上的必须在 EXCEPTIONS 里带理由登记；**登记过的例外必须真的对不上**
 *   （源组补齐了而例外没删 = 红），例外表因此不会腐化成第二份过期清单。例外只服务 host/client——
 *   lib 两侧没有例外，且顶层不许留散件（`src/lib/x.ts` 或 `tests/lib/x.spec.ts` 都会红）。
 * 不证明：目录里的 spec 是否真覆盖了对应模块（那是各区自己的事）；属性轴（i18n、presets 的一次扫全量）
 *   不在镜像判据内——它按「属性」组织，按单位拆会把一条属性碎成 N 份。
 * 2026-11-15 扩展：lib 也从「都平铺」升级成「两侧目录名集合相等」——src/lib 按域分八组后，
 *   镜像统一成同一条规则；例外只剩三条「另一种单位」（contract/ index/ i18n/）。
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

/** 例外表的「侧」：这条不对应关系落在哪边。 */
type Side = 'src-only' | 'tests-only'

/**
 * 已登记的不对应。每条必须带理由，且必须仍然真的对不上——补齐后忘了删 = 红。
 * 新增例外前先问：这个目录是「另一种单位」还是「少了一个测试家」？少测试家就补，不要登记。
 */
const EXCEPTIONS = new Map<string, { side: Side; reason: string }>([
  ['tests/host/contract', { side: 'tests-only', reason: '跨载体不变量，不对应单一源组' }],
  ['tests/host/index', { side: 'tests-only', reason: '根组合面，对应 src/index.ts 而不是某个组' }],
  ['tests/client/i18n', { side: 'tests-only', reason: '属性区（字典/页签壳/缺省 locale），一次扫多组' }],
])

const orphans = (rel: string): string[] => readdirSync(join(ROOT, rel), { withFileTypes: true })
  .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
  .map(entry => entry.name)
  .sort()

const dirs = (rel: string): string[] =>
  readdirSync(join(ROOT, rel), { withFileTypes: true })
    .filter(entry => {
      if (entry.name === 'node_modules') return false
      if (entry.isDirectory()) return true
      // 软链目录也算一个组：Dirent 对 symlink 报 isDirectory() = false，漏掉它会造出「新组没测试家」的静默绿。
      if (!entry.isSymbolicLink()) return false
      try {
        return statSync(join(ROOT, rel, entry.name)).isDirectory()
      } catch {
        return false
      }
    })
    .map(entry => entry.name)
    .sort()

/** 两半的目录差集，每边去掉已登记的例外。 */
function compare(half: 'host' | 'client'): { srcOnly: string[]; testsOnly: string[] } {
  const src = dirs(`packages/company-pack/src/${half}`)
  const tests = dirs(`tests/${half}`)
  const known = (name: string, side: Side): boolean => EXCEPTIONS.get(name)?.side === side
  return {
    srcOnly: src.filter(name => !tests.includes(name) && !known(`src/${half}/${name}`, 'src-only')),
    testsOnly: tests.filter(name => !src.includes(name) && !known(`tests/${half}/${name}`, 'tests-only')),
  }
}

describe('测试树 ↔ 源码树：目录镜像', () => {
  it('src/host 的每个组都有同名测试目录（例外已登记）', () => {
    expect(compare('host').srcOnly).toEqual([])
  })

  it('tests/host 的每个目录都是某个源组（例外已登记）', () => {
    expect(compare('host').testsOnly).toEqual([])
  })

  it('src/client 与 tests/client 目录名对齐（例外已登记）', () => {
    const { srcOnly, testsOnly } = compare('client')
    expect({ srcOnly, testsOnly }).toEqual({ srcOnly: [], testsOnly: [] })
  })

  it('例外表不腐化：每条都真实存在、且仍然真的对不上', () => {
    const rotten: string[] = []
    for (const [path, { side, reason }] of EXCEPTIONS) {
      if (reason.trim() === '') rotten.push(`${path}：缺理由`)
      const [scope, half, name] = path.split('/')
      if (scope === undefined || half === undefined || name === undefined || (half !== 'host' && half !== 'client')) {
        rotten.push(`${path}：形状不认识（要 <src|tests>/<host|client>/<dir>）`)
        continue
      }
      const other = dirs(scope === 'src' ? `tests/${half}` : `packages/company-pack/src/${half}`)
      const own = dirs(scope === 'src' ? `packages/company-pack/src/${half}` : `tests/${half}`)
      if (!own.includes(name)) { rotten.push(`${path}：盘上没有这个目录`); continue }
      if (other.includes(name)) rotten.push(`${path}：两边都已存在——例外该删了`)
      if (side !== (scope === 'src' ? 'src-only' : 'tests-only')) rotten.push(`${path}：side 与所在侧不符`)
    }
    expect(rotten).toEqual([])
  })

  it('src/lib 与 tests/lib 目录名集合相等（按域分八组）', () => {
    expect(dirs('tests/lib')).toEqual(dirs('packages/company-pack/src/lib'))
  })

  it('两侧顶层都不留散件（模块与 spec 都必须归组）', () => {
    expect(orphans('packages/company-pack/src/lib')).toEqual([])
    expect(orphans('tests/lib')).toEqual([])
  })
})
