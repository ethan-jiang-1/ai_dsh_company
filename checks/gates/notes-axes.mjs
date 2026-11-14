// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 为什么（2026-11-14 螺旋）：v3→v4→v5 的下一轮 bug 已经写在上一轮 Note 的 `## 未覆盖轴` 里，
// 但那些轴只是 prose，没有人把它们变成资产/卡。本门禁把「未覆盖轴 → 去向」变成机械面：
// 新 Note（文件名日期 ≥ 2026-11-15）的 `## 未覆盖轴` 每个顶层条目必须带 `→`（或 `->`）且去向非空；
// 没有条目也红——「无未覆盖轴」要显式写成一条带去向的条目，不能留空节。
//
// 边界：只查「有没有去向」，不查去向是否合理（语义审仍是人/独立 agent）。
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanDocumentDetailed, sectionRange } from '../../packages/company-pack/src/lib/markdown-shape-core.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const EFFECTIVE = '2026-11-15'
const AXIS = '未覆盖轴'
const ARROW = /(?:→|->)/

/**
 * 检查一篇 Note 的「未覆盖轴」条目是否有去向。
 * @param {string} text Note 全文。
 * @param {string} [name] 文件名（错误信息用）。
 * @returns {string[]} 问题；空 = 合规。
 */
export function axisProblems(text, name = 'note') {
  const range = sectionRange(text, AXIS)
  if (range === undefined) return [`${name} 缺「## ${AXIS}」节（新 Note 必须显式写）`]
  const scan = scanDocumentDetailed(text)
  const problems = []
  let bullets = 0
  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = scan.lines[index]
    if (line === undefined || !line.structural) continue
    const trimmed = line.text.trim()
    if (!trimmed.startsWith('- ')) continue
    bullets += 1
    if (!ARROW.test(trimmed)) {
      problems.push(`${name}:${String(index + 1)} 「${AXIS}」条目没有 → 去向：${trimmed.slice(0, 70)}`)
      continue
    }
    const target = trimmed.split(ARROW).slice(1).join('→').trim()
    if (target === '') problems.push(`${name}:${String(index + 1)} 「${AXIS}」→ 后没有去向`)
  }
  if (bullets === 0) problems.push(`${name} 「## ${AXIS}」没有顶层条目——无轴也要写一条带去向的「无」`)
  return problems
}

export function run({ ok, fail }) {
  const dir = join(root, 'notes/implemented')
  const files = readdirSync(dir)
    .filter(name => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(name) && name.slice(0, 10) >= EFFECTIVE)
    .sort()
  const problems = []
  for (const name of files) problems.push(...axisProblems(readFileSync(join(dir, name), 'utf8'), name))
  problems.length === 0
    ? ok(`notes-axes（新 Note ${String(files.length)} 篇；未覆盖轴 → 去向）`)
    : fail('notes-axes', problems.join('；'))
}
