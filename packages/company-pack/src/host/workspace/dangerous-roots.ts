/**
 * 「危险落点」的唯一派生面（2026-11-13，BUG-095）。
 *
 * workspace 解析与 `validateCompanyHome` 都要拒绝 `/`、OS home、系统临时根。此前两处各写一份
 * 手写枚举，tmpdir 只活在注释里；macOS 的 `/tmp` 还是 `/private/tmp` 的 symlink，字符串比较必漏。
 * 这里从平台事实（`homedir()` / `tmpdir()` 的 realpath）派生，两处共用。
 */
import { realpathSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'

/** realpath；路径不存在时退回字面 path。 */
export function canonicalOf(path: string): string {
  try { return realpathSync(path) } catch { return resolve(path) }
}

/**
 * 危险落点集合：文件系统根、OS home、系统临时根（含 `/tmp` / `/private/tmp` 别名）。
 * 子目录不在集合里（`tmpdir()/project-a` 仍是合法项目目录）。
 */
export function dangerousRoots(): readonly string[] {
  const roots = new Set<string>(['/', canonicalOf(homedir()), canonicalOf(tmpdir())])
  for (const alias of ['/tmp', '/private/tmp']) roots.add(canonicalOf(alias))
  return [...roots]
}

/** path（规范化后）是否是危险落点本身。 */
export function isDangerousRoot(path: string): boolean {
  return dangerousRoots().includes(canonicalOf(path))
}
