// 状态：常驻
// 何时跑：改 `packages/company-pack/**` 的 Markdown 路径指针、搬 content 文件后；发布前。跑法 = pnpm verify。
//
// 判据：pack 内反引号 `content/...` 路径必须解析到 pack 根下的真实文件 / 目录。
//   这是 bare-path 的 pack-relative 补格：`content/state/process-docs.md` 不是仓库根路径，
//   bare-path 看不见它，搬家后的死指针就能穿过门禁（BUG-067）。
// 边界：带 `<...>` / `{...}` / `*` / `...` 的占位路径跳过；只扫 `packages/company-pack/**/*.md`。
// 负例留证 2026-11-11（实地造红→还原→绿）：把 `content/templates/meta.md` 的合同指针改回
//   `content/state/process-docs.md` → 红（`死指针`）；还原 → 绿。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PACK = 'packages/company-pack'

/** 递归收集 Markdown（相对 pack）。 */
function markdownFiles(absDir, prefix = '') {
  if (!existsSync(absDir)) return []
  const out = []
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...markdownFiles(join(absDir, entry.name), rel))
    else if (entry.name.endsWith('.md')) out.push(rel)
  }
  return out
}

export function run({ root, ok, fail }) {
  const pack = join(root, PACK)
  if (!existsSync(pack)) { fail('pack-content-paths', `${PACK} 不在盘上`); return }
  const files = markdownFiles(pack)
  const problems = []
  let checked = 0
  for (const rel of files) {
    const text = readFileSync(join(pack, rel), 'utf8')
    for (const [index, line] of text.split('\n').entries()) {
      for (const match of line.matchAll(/`(content\/[^`\n]+)`/g)) {
        let token = match[1].trim()
        if (/[<{*]|\.\.\./.test(token)) continue
        token = token.replace(/#.*$/, '').replace(/[:：]\d+(?:-\d+)?$/, '')
        if (!token.startsWith('content/')) continue
        checked += 1
        if (!existsSync(join(pack, token))) {
          problems.push(`${PACK}/${rel}:${String(index + 1)} 死指针 \`${token}\`（${PACK}/${token} 不存在）`)
        }
      }
    }
  }
  problems.length === 0
    ? ok(`pack-content-paths ×${String(checked)}（pack 内反引号 content/... 路径均可解析）`)
    : fail('pack-content-paths', problems.slice(0, 10).join('；') + (problems.length > 10 ? ` …共 ${String(problems.length)} 处` : ''))
}
