/**
 * 包源指纹（纯逻辑；release 与 dev 启动器共用单一 owner）。
 *
 * 边界：这里的文件 = 随包分发的源（不含构建产物 `lib/`，构建由调用方负责）。
 * release 用它判断 `_dist` 是否过期；dev 启动器用它判断能否复用上次构建的 tarball。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const PACKAGE_SOURCE_DIRS = ['presets', 'content', 'locale', 'src']
export const PACKAGE_SOURCE_FILES = ['package.json', 'cordis.patch.yml', 'README.md', 'LICENSE', 'icon.svg',
  'tsconfig.json', 'tsconfig.host.json', 'tsconfig.client.json', 'tsdown.config.ts']

/** 随包分发的源文件相对路径（排序、去重）。 */
export function packageSourceFiles(packDir) {
  const files = []
  for (const rel of PACKAGE_SOURCE_FILES) if (existsSync(join(packDir, rel))) files.push(rel)
  for (const relDir of PACKAGE_SOURCE_DIRS) {
    const root = join(packDir, relDir)
    if (!existsSync(root)) continue
    const walk = (abs, relBase) => {
      for (const entry of readdirSync(abs, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue
        const absChild = join(abs, entry.name)
        const relChild = join(relBase, entry.name)
        if (entry.isDirectory()) walk(absChild, relChild)
        else if (entry.isFile()) files.push(relChild)
      }
    }
    walk(root, relDir)
  }
  return [...new Set(files)].sort()
}

/** 发布物的源指纹（与既有 release manifest 语义逐字一致）。 */
export function sourceFingerprint(packDir) {
  const hash = createHash('sha256')
  for (const rel of packageSourceFiles(packDir)) {
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(join(packDir, rel)))
    hash.update('\0')
  }
  return hash.digest('hex')
}

/**
 * dev 构建缓存的复合指纹：包源 ⊕ vendor pin ⊕ 根 lockfile。
 * 后两者让「基座升 pin / 依赖变化但包源没动」也触发重建，避免拿旧产物冒充新环境。
 */
export function devBuildFingerprint(packDir, { vendorSha, lockfilePath }) {
  const hash = createHash('sha256')
  hash.update(sourceFingerprint(packDir))
  hash.update('\0')
  hash.update(typeof vendorSha === 'string' && vendorSha !== '' ? vendorSha : 'unknown')
  hash.update('\0')
  if (typeof lockfilePath === 'string' && existsSync(lockfilePath)) hash.update(readFileSync(lockfilePath))
  return hash.digest('hex')
}
