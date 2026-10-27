/**
 * profile 边界体检（2026-10-27 G7）：方法层是 profile 级，同 home 多 profile 不共享。
 *
 * 一个公司 = 一个 web profile 是当前合同；但用户完全可以在同 home 再装一个 profile。
 * 这里只读 `profiles/<profile>/package.json` 的 `dsh.profile.bundles`，点名哪些 profile 装了本包，
 * 供 host 在启动输出里告警——不改变任何 profile，也不冒充隔离。
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
