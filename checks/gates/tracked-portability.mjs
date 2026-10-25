// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增活动文档/脚本/路径，或改 .gitattributes/换行策略后。
// 为什么：开源/多环境不是“大家机器一样”——活动 tracked 面里的绝对 home 路径、CRLF、大小写冲突、
// macOS 专属命令会在一台机器上绿、另一台上红。规则唯一家 = docs/repo-hygiene.md §四。
// 负例留证 2026-10-25：`docs/zz-portability.md` 写 `/Users/someone/tmp` → 红（点名 file:line）；
// 删除 → 绿。删 .gitattributes → 红；还原 → 绿。
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAX_BYTES = 2 * 1024 * 1024
const HOME_PATH_RE = /\/(?:Users|home)\/[A-Za-z0-9][A-Za-z0-9._-]*\//g
const MACOS_ONLY_RE = /\bsed -i\b|\bstat -f\b|\bdate -j\b|\bxargs -r\b|\bgrep -P\b|\brealpath \b|\bopen -a\b|\bpbcopy\b|\bpbpaste\b|security find-generic-password/
const SELF = 'checks/gates/tracked-portability.mjs'
const ALLOW_PREFIXES = [
  'notes/archived/',
  '_backlog/_archive/',
  'snapshots/',
  'checks/lib/ci-security-gates/fixtures/',
]
/** 合成 fixture 里允许的占位用户名（不是真实机器）。 */
const ALLOW_PATH_RE = /^\/Users\/someone\//

function trackedFiles(root) {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  }).split('\0').filter(Boolean)
}

function isPortabilityScript(rel) {
  return rel.endsWith('.sh') || (rel.endsWith('.mjs') && /^(run|tools|checks)\//.test(rel))
}

export function run({ root, ok, fail }) {
  const problems = []
  const gitattributes = join(root, '.gitattributes')
  if (!existsSync(gitattributes)) {
    problems.push('.gitattributes 缺失——跨环境行尾/二进制标记没有唯一家')
  } else if (!/^\* text=auto eol=lf$/m.test(readFileSync(gitattributes, 'utf8'))) {
    problems.push('.gitattributes 缺 `* text=auto eol=lf`（跨环境 LF 基线）')
  }

  const files = trackedFiles(root)
  const lower = new Map()
  for (const rel of files) {
    const key = rel.toLowerCase()
    if (lower.has(key)) problems.push(`大小写冲突（macOS 不敏感 / Linux 敏感）：${lower.get(key)} ↔ ${rel}`)
    else lower.set(key, rel)
  }

  const eol = execFileSync('git', ['ls-files', '--eol'], { cwd: root, encoding: 'utf8' })
  for (const line of eol.split('\n')) {
    if (/\bi\/crlf\b|\bw\/crlf\b/.test(line)) problems.push(`CRLF 入库：${line.slice(line.indexOf('\t') + 1)}`)
  }

  let scanned = 0
  for (const rel of files) {
    if (rel === SELF) continue // 本文件头注必须写出被禁形状（负例留证）；否则自己判自己
    if (rel.startsWith('vendor/') || ALLOW_PREFIXES.some(prefix => rel.startsWith(prefix))) continue
    const abs = join(root, rel)
    let stat
    try { stat = statSync(abs) } catch { continue }
    if (!stat.isFile() || stat.size > MAX_BYTES) continue
    const buffer = readFileSync(abs)
    if (buffer.includes(0)) continue
    scanned++
    const text = buffer.toString('utf8')
    const lines = text.split('\n')
    for (let index = 0; index < lines.length; index++) {
      for (const match of lines[index].matchAll(HOME_PATH_RE)) {
        if (rel.startsWith('tests/') && ALLOW_PATH_RE.test(match[0])) continue
        problems.push(`${rel}:${String(index + 1)} 绝对 home 路径（活动面应使用相对路径/环境变量）`)
      }
      if (isPortabilityScript(rel) && MACOS_ONLY_RE.test(lines[index])) {
        problems.push(`${rel}:${String(index + 1)} macOS 专属命令（用 Node API 或 POSIX 等价写法）`)
      }
    }
  }

  problems.length === 0
    ? ok(`tracked-portability ×${String(scanned)}（LF/无 home 路径/无大小写冲突/无 macOS 专属命令）`)
    : fail('tracked-portability', problems.slice(0, 12).join('；') + (problems.length > 12 ? '；…' : ''))
}
