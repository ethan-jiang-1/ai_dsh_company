import { describe, expect, it } from 'vitest'
import { missingSnapshotIndexRows } from '../../tools/lib/snapshot-index.mjs'

// 2026-10-20 审计：README 43 行 vs 盘上 47 场景；本 spec 钉住「目录 → README 行」的判据。
describe('snapshot-index 纯逻辑', () => {
  it('只报告未出现在 README 里的场景目录', () => {
    const readme = '| [replay/a](replay/a/) | x |\n| [visual/b](visual/b/) | y |\n'
    expect(missingSnapshotIndexRows([
      { kind: 'replay', name: 'a' },
      { kind: 'visual', name: 'b' },
      { kind: 'archive', name: 'c' },
    ], readme)).toEqual(['archive/c'])
  })

  it('不把目录名出现在正文里当成已登记——只认场景表链接形状', () => {
    expect(missingSnapshotIndexRows(
      [{ kind: 'visual', name: 'cultivation-gui' }],
      '正文提到 cultivation-gui 但没有链接。',
    )).toEqual(['visual/cultivation-gui'])
  })
})
