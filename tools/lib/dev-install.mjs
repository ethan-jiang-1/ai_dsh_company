/**
 * dev 启动器的安装规划（纯逻辑；无进程/文件副作用）。
 *
 * 为什么单独抽：`pnpm company` 默认要走**产品同形安装**（npm pack → `dsh plugin add file:<tgz>`），
 * 而 link 快速通道要显式 `--link`。这条判断必须能被单测与门禁读，不能只藏在 spawn 里。
 * 合同 = [dev-product-parity](../../docs/guides/dev-product-parity.md)。
 */

/** 安装模式：默认 tarball（产品同形）；`--link` 显式切快速通道。 */
export function resolveDevMode(argv = []) {
  return argv.includes('--link') ? 'link' : 'tarball'
}

/** 内容寻址的 tarball 文件名：内容一变 spec 就变，pnpm 才会真的换安装副本。 */
export function devTarballName({ name, version, sha256 }) {
  if (typeof name !== 'string' || name === '') throw new Error('devTarballName: name 缺失')
  if (typeof version !== 'string' || version === '') throw new Error('devTarballName: version 缺失')
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) throw new Error('devTarballName: sha256 必须是 64 位小写十六进制')
  return `${name}-${version}-${sha256.slice(0, 8)}.tgz`
}

/** `dsh plugin add` 的 spec（file: 前缀走本地 tarball；link: 走源码目录）。 */
export function devInstallSpec({ mode, tarballPath, sourceDir }) {
  if (mode === 'link') {
    if (typeof sourceDir !== 'string' || sourceDir === '') throw new Error('devInstallSpec: link 模式需要 sourceDir')
    return `link:${sourceDir}`
  }
  if (typeof tarballPath !== 'string' || tarballPath === '') throw new Error('devInstallSpec: tarball 模式需要 tarballPath')
  return `file:${tarballPath}`
}

/** 当前依赖是否已经是目标 spec（同 spec 不重复 add，保持启动快）。 */
export function needsInstall(currentDependency, nextSpec) {
  return currentDependency !== nextSpec
}

/** 从 link 迁到 tarball 时给人看的一句提示；不需要迁移时返回 undefined。 */
export function migrationNotice({ mode, currentDependency }) {
  if (mode !== 'tarball') return undefined
  if (typeof currentDependency !== 'string' || !currentDependency.startsWith('link:')) return undefined
  return `dev profile 当前是 link: 安装（${currentDependency}）；默认已切到产品同形 tarball 安装。`
    + ' 需要保留旧的快速通道请加 --link。'
}

/** 规划一次 dev 启动要跑的步骤（顺序即执行顺序；只描述，不执行）。 */
export function planDevStart({ mode, version, profileExists, currentDependency, tarballPath, sourceDir }) {
  const steps = []
  if (!profileExists) steps.push({ kind: 'init-profile' })
  if (mode === 'tarball') {
    steps.push({ kind: 'build' }, { kind: 'pack' })
  }
  const spec = devInstallSpec({ mode, tarballPath, sourceDir })
  if (needsInstall(currentDependency, spec)) steps.push({ kind: 'install', spec })
  steps.push({ kind: 'exec' })
  return { mode, version, spec, steps }
}

/**
 * 构建缓存判据（纯逻辑）：戳、指纹、版本、产物与强制位全部允许时才复用。
 * 任何一项不成立都回落到真实构建，宁可多花 4s 也不拿旧产物冒充新环境。
 */
export function shouldReuseBuild({ stamp, fingerprint, version, tarballPresent, tarballShaMatches, libPresent, force = false }) {
  if (force === true) return false
  if (stamp === null || typeof stamp !== 'object') return false
  if (stamp.schema !== 1) return false
  if (stamp.version !== version) return false
  if (typeof fingerprint !== 'string' || fingerprint === '' || stamp.fingerprint !== fingerprint) return false
  if (tarballPresent !== true) return false
  if (tarballShaMatches !== true) return false
  if (libPresent !== true) return false
  return true
}

