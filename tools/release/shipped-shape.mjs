#!/usr/bin/env node
// 状态：常驻
// 何时跑：`pnpm release:shape`；`export-dist` 在替换 `_dist` 前自动跑 sanitize + check。
// shipped package 形状的解包/CLI（判据纯逻辑 = tools/lib/release/shipped-shape.mjs）。
//
// 为什么：tarball 是仓库树的子集，dev 字节/元数据/文本/未声明依赖会一起漏进安装面。仓库内
// `pnpm test`/`verify` 证明不了安装形态；本脚本对 `_dist` 的 tarball 解包后用同一套判据判。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { checkShippedPackage } from '../lib/release/shipped-shape.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
const DEFAULT_TARBALL = join(root, `_dist/dsh-company-pack-${String(packVersion)}.tgz`)

/** tarball → { entries, read(entry), pkg }。 */
export function readTarball(tarball) {
  const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const cache = new Map()
  const read = entry => {
    if (!cache.has(entry)) cache.set(entry, execFileSync('tar', ['-xOf', tarball, entry], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }))
    return cache.get(entry)
  }
  return { entries, read, pkg: JSON.parse(read('package/package.json')) }
}

/** 解包 tarball 到临时目录（调用方清理）。 */
export function extractTarball(tarball, destination) {
  mkdirSync(destination, { recursive: true })
  execFileSync('tar', ['-xzf', tarball, '-C', destination])
  return join(destination, 'package')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2)
  const tarballIndex = args.indexOf('--tarball')
  const tarball = tarballIndex >= 0 ? args[tarballIndex + 1] : DEFAULT_TARBALL
  if (!tarball || !existsSync(tarball)) {
    console.error(`shipped-shape: 找不到 tarball ${String(tarball)}——先 pnpm release --prepare`)
    process.exit(2)
  }
  let parsed
  try {
    parsed = readTarball(tarball)
  } catch (error) {
    console.error(`shipped-shape: 读不到 tarball：${error.message}`)
    process.exit(2)
  }
  const problems = checkShippedPackage(parsed)
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ tarball, problems }, null, 2)}\n`)
  } else {
    for (const problem of problems) console.log(`shipped-shape FAIL ${problem}`)
    if (problems.length === 0) console.log(`shipped-shape PASS（${tarball}；${String(parsed.entries.length)} entries）`)
  }
  process.exit(problems.length === 0 ? 0 : 1)
}
