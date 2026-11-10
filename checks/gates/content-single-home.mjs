// 状态：常驻
// 何时跑：改 content / preset / src 的政策数字、或新增公司层文件后；发布前。跑法 = pnpm verify。
//
// 一事实一个家：报价、预算、产能与政策阈值（百分比 / 美元 / 个数 / 折扣）只在
// `content/company/policy-lines.md` 出现。
// 为什么：2026-11-09 盘点实测毛利线有 8 个源文件 10 余处；2026-11-11 BUG-069 又发现
//   10% 服务信用藏在 charter 里、四条硬编码正则覆盖不到。判据改成**从 policy-lines 派生词表**，
//   新增一条政策数字不用再改门禁。
// 判据（双向）：
//   ① 负向：从 policy-lines 的 `- **Key**：...` 行抽出数字 token（%、$、个、折），除 policy-lines
//      外任何 content / presets / src 的 Markdown/代码出现同一 token → 红；
//   ② 正向：policy-lines 必须仍含四条核心线（删一条 = 公司没了签字线，也红）。
// 边界：只抓政策行里的数字 token；不算公式里的普通常数。`<待填>` 等占位没有数字，不参与。
// 负例留证 2026-11-11（实地造红→还原→绿）：把「毛利 < 30%」写回 charters/vp-eng.md → 红；
//   把 `10%` 写回 charters/cfo.md → 红；从 policy-lines 删「并行交付上限」→ 正向红；还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const ALLOWED = 'company/policy-lines.md'
const CODE_ROOTS = ['packages/company-pack/src', 'packages/company-pack/presets']
const CODE_EXTS = /\.(?:ts|tsx|yml|md)$/
const REQUIRED = ['毛利底线', '折扣底线', '固定支出会签线', '并行交付上限', '服务信用']

/** 递归收集目录下的文本文件（相对路径）；`filter` 决定收哪些。 */
function textFiles(dir, filter, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...textFiles(join(dir, entry.name), filter, rel))
    else if (filter.test(entry.name)) out.push(rel)
  }
  return out
}

/** content 下的 Markdown（政策线扫描的主面）。 */
function markdownFiles(dir, prefix = '') {
  return textFiles(dir, /\.md$/, prefix)
}

/** 从 policy-lines 的 `- **Key**：...` 行抽出数字 token。 */
function policyTokens(text) {
  const tokens = new Map()
  for (const line of text.split('\n')) {
    const match = /^- \*\*(.+?)\*\*[：:](.+)$/.exec(line)
    if (match === null) continue
    const label = match[1]
    let body = match[2]
    // 区间先抽并从 body 删掉，避免端点又被单值计数一次。
    for (const range of [...body.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*%/g)]) {
      tokens.set(`${range[1]}-${range[2]}%`, label)
      body = body.replace(range[0], ' ')
    }
    for (const range of [...body.matchAll(/(?<![\d.])(\d+)\s*[–—-]\s*(\d+)\s*个/g)]) {
      tokens.set(`${range[1]}-${range[2]}个`, label)
      body = body.replace(range[0], ' ')
    }
    for (const matchPct of body.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*%/g)) tokens.set(`${matchPct[1]}%`, label)
    for (const matchUsd of body.matchAll(/\$\s*(\d[\d,]*)/g)) tokens.set(`$${matchUsd[1].replace(/,/g, '')}`, label)
    for (const matchCount of body.matchAll(/(?<![\d.])(\d+)\s*个/g)) tokens.set(`${matchCount[1]}个`, label)
    for (const matchDiscount of body.matchAll(/(?<![\d.])(\d+)\s*折/g)) tokens.set(`${matchDiscount[1]}折`, label)
  }
  return tokens
}

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** token → 可跨空格/破折号/千分位的匹配器。 */
function tokenRegex(token) {
  if (token.endsWith('%')) {
    const num = token.slice(0, -1)
    if (num.includes('-')) {
      const [low, high] = num.split('-')
      return new RegExp(`(?<![\\d.])${escapeRe(low)}\\s*[–—-]\\s*${escapeRe(high)}\\s*%`, 'g')
    }
    return new RegExp(`(?<![\\d.])${escapeRe(num)}\\s*%`, 'g')
  }
  if (token.startsWith('$')) {
    const num = token.slice(1)
    const grouped = num.replace(/\B(?=(\d{3})+(?!\d))/g, ',?')
    return new RegExp(`\\$\\s*${grouped}(?![\\d,])`, 'g')
  }
  if (token.endsWith('折')) return new RegExp(`(?<![\\d.])${escapeRe(token.slice(0, -1))}\\s*折`, 'g')
  if (token.endsWith('个')) {
    const num = token.slice(0, -1)
    if (num.includes('-')) {
      const [low, high] = num.split('-')
      return new RegExp(`(?<![\\d.])${escapeRe(low)}\\s*[–—-]\\s*${escapeRe(high)}\\s*个`, 'g')
    }
    return new RegExp(`(?<![\\d.])${escapeRe(num)}\\s*个`, 'g')
  }
  return null
}

export function run({ root, ok, fail }) {
  const content = join(root, CONTENT)
  if (!existsSync(content)) {
    fail('content-single-home', `content 目录不存在：${CONTENT}`)
    return
  }
  const allowedPath = join(content, ALLOWED)
  if (!existsSync(allowedPath)) {
    fail('content-single-home', `${CONTENT}/${ALLOWED} 缺失（政策线唯一家不在）`)
    return
  }
  const policyText = readFileSync(allowedPath, 'utf8')
  const tokens = policyTokens(policyText)
  const matchers = [...tokens.entries()]
    .map(([token, label]) => ({ token, label, re: tokenRegex(token) }))
    .filter(entry => entry.re !== null)
  const problems = []
  if (matchers.length === 0) problems.push(`${CONTENT}/${ALLOWED} 没有可解析的政策数字（门禁无从扫）`)
  for (const key of REQUIRED) {
    const line = new RegExp(`^- \\*\\*${escapeRe(key)}\\*\\*[：:]`, 'm')
    if (!line.test(policyText)) problems.push(`${CONTENT}/${ALLOWED} 缺政策线「${key}」`)
  }

  const scan = (display, text) => {
    for (const [index, line] of text.split('\n').entries()) {
      for (const { token, label, re } of matchers) {
        re.lastIndex = 0
        if (re.test(line)) {
          problems.push(`${display}:${String(index + 1)} 复述政策数字「${token}」——唯一家 = ${CONTENT}/${ALLOWED}「${label}」`)
        }
      }
    }
  }

  const files = markdownFiles(content)
  for (const rel of files) {
    if (rel === ALLOWED) continue
    scan(`${CONTENT}/${rel}`, readFileSync(join(content, rel), 'utf8'))
  }
  for (const dir of CODE_ROOTS) {
    const abs = join(root, dir)
    if (!existsSync(abs)) continue
    for (const rel of textFiles(abs, CODE_EXTS)) {
      scan(`${dir}/${rel}`, readFileSync(join(abs, rel), 'utf8'))
    }
  }
  problems.length === 0
    ? ok(`content-single-home（policy-lines ${String(tokens.size)} 个政策数字；${String(files.length)} 份 Markdown + 代码面零复述）`)
    : fail('content-single-home', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
