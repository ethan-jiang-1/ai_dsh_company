import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

// 六维提分 D5：夹具出处（`tests/fixtures/README.md` 是唯一家；盘上每个顶层条目都要有行）。
// 为什么：夹具是"期望"的载体，出处不明的夹具会让失败变成猜谜；且产品仓只允许合成数据。
const FIXTURES = join(ROOT, 'tests/fixtures')
const README = readFileSync(join(FIXTURES, 'README.md'), 'utf8')

describe('夹具出处登记', () => {
  it('盘上每个顶层夹具都在 README 有一行', () => {
    const entries = readdirSync(FIXTURES).filter(name => name !== 'README.md')
    const missing = entries.filter(name => !README.includes(name))
    expect(entries.length).toBeGreaterThan(0)
    expect(missing, `未登记的夹具：${missing.join('、')}（在 tests/fixtures/README.md 补一行来源/用途）`).toEqual([])
  })

  it('README 声明了来源性质与"真实数据不进本目录"的硬规矩', () => {
    expect(README).toContain('来源')
    expect(README).toContain('真实部署数据不进本目录')
  })
})
