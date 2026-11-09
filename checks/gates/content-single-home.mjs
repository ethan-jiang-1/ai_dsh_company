// 状态：常驻
// 何时跑：改 content 的政策数字、或新增公司层文件后；发布前。跑法 = pnpm verify。
//
// 一事实一个家：报价/预算/产能阈值只在 `content/company/policy-lines.md` 出现。
// 为什么：2026-11-09 盘点实测毛利线有 8 个源文件 10 余处；换公司要逐句判断哪句是特殊的。
// 判据（双向）：
//   ① 负向：除 policy-lines.md 外，任何 content Markdown 出现核心政策数字 → 红；
//   ② 正向：policy-lines.md 必须同时含四条核心线（删掉一条 = 公司没了签字线，也红）。
// 负例留证（建门时实跑）：把「毛利 < 30%」写回 charters/ceo.md → 本门红；还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const ALLOWED = 'company/policy-lines.md'

/** 核心政策线：名字只用于报错，正则可同时抓「复述」与「漏写」。 */
const LINES = [
  { name: '毛利底线 30%', re: /毛利[^\n]{0,16}30\s*%/ },
  { name: '折扣底线 9 折', re: /折扣[^\n]{0,16}9\s*折/ },
  { name: '固定支出 $500/月', re: /\$\s?500\s*\/\s*月|\$\s?500/ },
  { name: '并行上限 8 个', re: /并行[^\n]{0,20}8\s*个|8\s*个[^\n]{0,16}并行/ },
]

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

export function run({ root, ok, fail }) {
  const content = join(root, CONTENT)
  if (!existsSync(content)) {
    fail('content-single-home', `content 目录不存在：${CONTENT}`)
    return
  }
  const problems = []
  const files = markdownFiles(content)
  for (const rel of files) {
    if (rel === ALLOWED) continue
    const lines = readFileSync(join(content, rel), 'utf8').split('\n')
    for (const [index, line] of lines.entries()) {
      for (const policy of LINES) {
        if (policy.re.test(line)) {
          problems.push(`${CONTENT}/${rel}:${String(index + 1)} 复述政策线「${policy.name}」——唯一家 = ${CONTENT}/${ALLOWED}`)
        }
      }
    }
  }
  // 代码/预设面也不许复述政策数字（工具描述、skill 正文、preset 注释都算）。
  const CODE_ROOTS = ['packages/company-pack/src', 'packages/company-pack/presets']
  const CODE_EXTS = /\.(?:ts|tsx|yml|md)$/
  for (const dir of CODE_ROOTS) {
    const abs = join(root, dir)
    if (!existsSync(abs)) continue
    for (const rel of textFiles(abs, CODE_EXTS)) {
      const lines = readFileSync(join(abs, rel), 'utf8').split('\n')
      for (const [index, line] of lines.entries()) {
        for (const policy of LINES) {
          if (policy.re.test(line)) {
            problems.push(`${dir}/${rel}:${String(index + 1)} 复述政策线「${policy.name}」——唯一家 = ${CONTENT}/${ALLOWED}`)
          }
        }
      }
    }
  }

  const allowedPath = join(content, ALLOWED)
  if (!existsSync(allowedPath)) {
    problems.push(`${CONTENT}/${ALLOWED} 缺失（政策线唯一家不在）`)
  } else {
    const text = readFileSync(allowedPath, 'utf8')
    for (const policy of LINES) {
      if (!policy.re.test(text)) problems.push(`${CONTENT}/${ALLOWED} 缺政策线「${policy.name}」`)
    }
  }
  problems.length === 0
    ? ok(`content-single-home（${String(files.length)} 份 Markdown；政策线只在 ${ALLOWED}）`)
    : fail('content-single-home', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
