#!/usr/bin/env node
// 状态：常驻（随 pack 分发，质量环 skill 的资源）
// 何时跑：写 / 修 `quality-loop/verdict-r<N>.md` 时；或核对头里的 body-sha256。
// 用法（路径相对 pack 的 content 上两级）：
//   node <company-content>/../presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs --fix quality-loop/verdict-r1.md
//   node <company-content>/../presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs --check quality-loop/verdict-r1.md
//   node <company-content>/../presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs --body <正文文件>
// 口径：正文去掉结尾空白（与 `tools/lib/quality-loop.mjs` 的 normalizeVerdictBody 同义；
//       parity spec = tests/harness/tools/quality-loop.spec.ts）。
// 为什么存在：`tail -n +2 file | shasum` 会把文件尾随换行算进哈希，audit 的归一化口径会判
//       `body-modified`（BUG-056 真实事故）。手算口径不可靠，哈希只走这条命令。
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const HEADER_RE = /^<!--\s*quality-loop:\s*(.+?)\s*-->\s*$/u
const HASH_RE = /^body-sha256=(.+)$/u
const HASH_TOKEN_RE = /body-sha256=\S+/u

/** 正文口径：去掉结尾空白（文件尾随换行不算改了）。 */
export function normalizeVerdictBody(text) {
  return String(text ?? '').replace(/\s+$/u, '')
}

/** 正文哈希（hex64）；与 audit 的 `verdictBodyHash` 同口径。 */
export function hashBody(text) {
  return createHash('sha256').update(normalizeVerdictBody(text), 'utf8').digest('hex')
}

/** 拆头行：返回头行下标、头字段与正文（正文 = 头行之后的全部内容，保持字节）。 */
function split(text) {
  const source = String(text ?? '')
  const lines = source.split('\n')
  const index = lines.findIndex(line => HEADER_RE.test(line.trim()))
  if (index < 0) throw new Error('缺 quality-loop 头行（先写头，再跑 --fix / --check）')
  const header = lines[index]
  const fields = {}
  for (const chunk of HEADER_RE.exec(header.trim())[1].split(/\s+/)) {
    const eq = chunk.indexOf('=')
    if (eq > 0) fields[chunk.slice(0, eq)] = chunk.slice(eq + 1)
  }
  return { lines, index, header, fields, body: lines.slice(index + 1).join('\n') }
}

/** 回填头里的 body-sha256（只改一个 token；正文一个字节不动）。 */
export function fixVerdictText(text) {
  const { lines, index, header, body } = split(text)
  const hash = hashBody(body)
  const next = header.replace(HASH_TOKEN_RE, `body-sha256=${hash}`)
  if (!HASH_TOKEN_RE.test(header)) throw new Error('头行缺 body-sha256 字段；请按 skill 的头行模板补齐')
  lines[index] = next
  return lines.join('\n')
}

/** 核头里的 hash 与正文是否一致。 */
export function checkVerdictText(text) {
  const { header, body } = split(text)
  const actual = HASH_RE.exec(
    HEADER_RE.exec(header.trim())[1].split(/\s+/).find(chunk => chunk.startsWith('body-sha256=')) ?? '',
  )?.[1] ?? null
  const expected = hashBody(body)
  return { ok: actual === expected, actual, expected }
}

function main(argv) {
  const valueOf = (name) => {
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? undefined : argv[index + 1]
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('用法：verdict-hash.mjs --fix <verdict-file> | --check <verdict-file> | --body <body-file>')
    return 0
  }
  const fixFile = valueOf('fix')
  if (fixFile !== undefined) {
    if (!existsSync(fixFile)) throw new Error(`文件不存在：${resolve(fixFile)}`)
    const fixed = fixVerdictText(readFileSync(fixFile, 'utf8'))
    writeFileSync(fixFile, fixed)
    console.log(`body-sha256=${hashBody(split(fixed).body)}`)
    return 0
  }
  const checkFile = valueOf('check')
  if (checkFile !== undefined) {
    if (!existsSync(checkFile)) throw new Error(`文件不存在：${resolve(checkFile)}`)
    const result = checkVerdictText(readFileSync(checkFile, 'utf8'))
    if (result.ok) {
      console.log(`OK body-sha256=${result.actual}`)
      return 0
    }
    console.error(`MISMATCH body-sha256=${String(result.actual)} expected=${result.expected}（用 --fix 回填）`)
    return 1
  }
  const bodyFile = valueOf('body')
  if (bodyFile !== undefined) {
    if (!existsSync(bodyFile)) throw new Error(`文件不存在：${resolve(bodyFile)}`)
    console.log(hashBody(readFileSync(bodyFile, 'utf8')))
    return 0
  }
  console.error('用法：verdict-hash.mjs --fix <verdict-file> | --check <verdict-file> | --body <body-file>')
  return 2
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    console.error(`verdict-hash: ${error.message}`)
    process.exitCode = 2
  }
}
