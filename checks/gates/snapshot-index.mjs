// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增/迁移 snapshots 场景后。
// 为什么：2026-10-20 审计发现 README 43 行 vs 盘上 47 场景，4 个新场景未登记。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { missingSnapshotIndexRows, SNAPSHOT_KINDS } from '../../tools/lib/snapshot-index.mjs'

export function run({ root, ok, fail }) {
  const readmePath = join(root, 'snapshots', 'README.md')
  if (!existsSync(readmePath)) {
    fail('snapshot-index', 'snapshots/README.md 不在盘上——场景索引不许消失')
    return
  }
  const scenes = []
  for (const kind of SNAPSHOT_KINDS) {
    const dir = join(root, 'snapshots', kind)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) scenes.push({ kind, name: entry.name })
    }
  }
  const missing = missingSnapshotIndexRows(scenes, readFileSync(readmePath, 'utf8'))
  missing.length === 0
    ? ok(`snapshot-index ×${String(scenes.length)}（盘上场景全部在 README 场景表）`)
    : fail('snapshot-index', `未登记的 snapshots 场景：${missing.join('、')}（新增场景同 diff 补 README 行；清单不许手漏）`)
}
