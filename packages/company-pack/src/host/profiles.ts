/**
 * profile 体检（2026-10-27 G7；2026-10-28 M3 起方法层公司级共享）：列出同 home 装了本包的 profile。
 *
 * 一个公司 = 一个 web profile 仍是建议；用户可以在同 home 再装。方法层/记录/公司盘都是公司级共享，
 * 多 profile 不再造成方法分叉，只会分叉会话与偏好。这里只读 `profiles/<profile>/package.json` 的
 * `dsh.profile.bundles`，供 host 启动点名——不改变任何 profile。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface ProfileDescriptor {
  readonly name: string
  readonly bundles: readonly string[]
}

/** 列出装了本包的 profile（按名字排序；坏 package.json 跳过）。 */
export function profilesWithCompanyPack(profilesDir: string, packName = 'dsh-company-pack'): string[] {
  if (!existsSync(profilesDir)) return []
  const found: string[] = []
  for (const entry of readdirSync(profilesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    try {
      const raw = JSON.parse(readFileSync(join(profilesDir, entry.name, 'package.json'), 'utf8')) as {
        dsh?: { profile?: { bundles?: unknown } }
      }
      const bundles = raw?.dsh?.profile?.bundles
      if (Array.isArray(bundles) && bundles.includes(packName)) found.push(entry.name)
    } catch { /* 坏 profile 不参与点名 */ }
  }
  return found.sort()
}
