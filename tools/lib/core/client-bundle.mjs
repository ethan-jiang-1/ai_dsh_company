// client 构建产物的**新鲜度**判据（BUG-296，2026-11-21）。
//
// 为什么需要：`packages/company-pack/lib/client.js` 是 gitignored 的构建产物，三条真页面车道
// （ui-scene / client-load / client-error-chain）都直接或间接伺服它。此前它们只查「文件存在」——
// 源码改了没重建时，车道照样启动、照样对着**旧字节**断言、照样报绿。2026-11-21 就是这么把
// BUG-293（`list: undefined as never` 的槽崩溃）藏了一整个提交：那次提交后的「真绿」跑的是旧 bundle。
//
// 判据 = 「输入指纹」：把决定 `lib/client.js` 字节的源文件（client + 它 import 的 lib、构建配置、
// package.json）按相对路径排序后逐份喂进 sha256；构建脚本在构建成功后把指纹写进 `lib/.build-fingerprint`，
// 车道启动前比对。**存在 ≠ 新鲜**：只要源与产物指纹不一致，车道必须 fail-loud（exit 2，点名先构建），
// 不许拿旧字节报绿。
//
// 口径与发布面的 `sourceFingerprint`（tools/lib/core/pack-source.mjs）同族，但**输入集不同**：
// 这里只收 client 包的字节决定者，避免改 presets/content 就逼人重建 client（那些不影响 client.js）。
// 输入集是**目录级**的（新增文件自动纳入），不是手写清单——手写清单正是 BUG-296 的同类病。
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** 指纹落点（相对仓库根；在 gitignored 的 `lib/` 里，不进包、不进 git）。 */
export const CLIENT_BUILD_FINGERPRINT_PATH = 'packages/company-pack/lib/.build-fingerprint'

/** 决定 client 产物的源目录（递归收 `.ts`/`.tsx`）。 */
export const CLIENT_SOURCE_DIRS = ['packages/company-pack/src/client', 'packages/company-pack/src/lib']

/** 决定 client 产物的构建配置（单文件；缺一个就说明构建形状变了）。 */
export const CLIENT_BUILD_FILES = [
  'packages/company-pack/tsdown.config.ts',
  'packages/company-pack/tsconfig.json',
  'packages/company-pack/tsconfig.client.json',
  'packages/company-pack/package.json',
]

/**
 * 递归收一个目录下的 .ts/.tsx（相对仓库根、正斜杠、排序）。
 * @param root - 仓库根。
 * @param dirRel - 相对目录。
 * @returns 相对路径清单。
 */
function walkSources(root, dirRel) {
  const abs = join(root, dirRel)
  if (!existsSync(abs)) return []
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(relative(root, path).replaceAll('\\', '/'))
    }
  }
  walk(abs)
  return out
}

/**
 * 指纹的输入清单（相对路径，排序）。
 * @param root - 仓库根。
 * @returns 参与哈希的文件清单。
 */
export function clientFingerprintInputs(root) {
  const files = CLIENT_SOURCE_DIRS.flatMap(dir => walkSources(root, dir))
  for (const file of CLIENT_BUILD_FILES) if (existsSync(join(root, file))) files.push(file)
  return files.sort()
}

/**
 * 由当前源码算出的 client 指纹。
 * @param root - 仓库根。
 * @returns 十六进制 sha256。
 */
export function clientSourceFingerprint(root) {
  const hash = createHash('sha256')
  for (const rel of clientFingerprintInputs(root)) {
    hash.update(rel)
    hash.update('\0')
    hash.update(readFileSync(join(root, rel)))
    hash.update('\0')
  }
  return hash.digest('hex')
}

/**
 * 读构建时写下的指纹。
 * @param root - 仓库根。
 * @returns 指纹；文件缺失或为空时 undefined。
 */
export function readClientBuildFingerprint(root) {
  const path = join(root, CLIENT_BUILD_FINGERPRINT_PATH)
  if (!existsSync(path)) return undefined
  const text = readFileSync(path, 'utf8').trim()
  return text === '' ? undefined : text
}

/**
 * 构建成功后调用：把当前源码指纹写进产物面。
 * @param root - 仓库根。
 * @returns 写入的指纹。
 */
export function writeClientBuildFingerprint(root) {
  const fingerprint = clientSourceFingerprint(root)
  writeFileSync(join(root, CLIENT_BUILD_FINGERPRINT_PATH), `${fingerprint}\n`)
  return fingerprint
}

/**
 * 产物是否可用于真页面断言。
 * @param root - 仓库根。
 * @returns undefined = 新鲜；否则 `{ kind, detail }`（detail 是给实施者看的一句话，含先构建的命令）。
 */
export function clientBundleProblem(root) {
  const built = join(root, 'packages/company-pack/lib/client.js')
  if (!existsSync(built)) {
    return {
      kind: 'missing',
      detail: `pack client 未构建（${CLIENT_BUILD_FINGERPRINT_PATH.replace(/\/\.build-fingerprint$/, '')}/client.js 缺失）——先构建：node tools/dev/build-client.mjs`,
    }
  }
  const recorded = readClientBuildFingerprint(root)
  if (recorded === undefined) {
    return {
      kind: 'missing',
      detail: `pack client 产物没有构建指纹（${CLIENT_BUILD_FINGERPRINT_PATH} 缺失）——无法判断是否由当前源码构建；先构建：node tools/dev/build-client.mjs`,
    }
  }
  const current = clientSourceFingerprint(root)
  if (recorded !== current) {
    return {
      kind: 'stale',
      detail: `pack client 产物过期（指纹 ${recorded.slice(0, 12)} ≠ 源码 ${current.slice(0, 12)}）——真页面断言会跑在旧字节上；先构建：node tools/dev/build-client.mjs`,
    }
  }
  return undefined
}
