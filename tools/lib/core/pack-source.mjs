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
export const PACKAGE_SOURCE_FILES = ['package.json', 'cordis.patch.yml', 'README.shipped.md', 'LICENSE', 'icon.svg',
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


/**
 * 发布管线的**目录**（相对仓库根）：目录里每个 `.mjs` 都是发布字节/判据的决定者。
 * 2026-11-19（BUG-263/264）：此前是手写 5 条，install-manual/market-index 后来加入管线却没进清单，
 * 改它们 `_dist` 不重打也能绿。输入集必须随目录增长，不靠人记得改清单。
 */
export const RELEASE_PIPELINE_DIRS = ['tools/release', 'tools/lib/release']

/**
 * 跨目录的发布字节决定者（这些目录之外、但改了就改变 `_dist` 字节或手册表头）：
 * - `pack-source.mjs` 定义源指纹本身；
 * - `pin.mjs` 的 expectedTag 写进安装手册表头。
 */
export const RELEASE_PIPELINE_FILES = ['tools/lib/core/pack-source.mjs', 'tools/lib/core/pin.mjs']

/**
 * 决定 tarball 字节/发布判据的管线文件（相对仓库根） = 目录派生 ∪ 显式跨目录项。
 * @param {string} root 仓库根
 * @returns {string[]} 排序后的相对路径
 */
export function releasePipelineFiles(root) {
  const files = new Set()
  for (const relDir of RELEASE_PIPELINE_DIRS) {
    const dir = join(root, relDir)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.mjs')) files.add(`${relDir}/${entry.name}`)
    }
  }
  for (const rel of RELEASE_PIPELINE_FILES) if (existsSync(join(root, rel))) files.add(rel)
  return [...files].sort()
}

/** 发布管线指纹：改 sanitizer/export-dist/手册模板/市场索引等任一决定者都必须触发重打。 */
export function releasePipelineFingerprint(root) {
  const hash = createHash('sha256')
  for (const rel of releasePipelineFiles(root)) {
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(join(root, rel)))
    hash.update('\0')
  }
  return hash.digest('hex')
}
