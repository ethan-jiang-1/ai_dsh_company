// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 为什么（2026-11-14 螺旋 + W4 逃生舱封堵）：
//   首轮 `notes-axes` 只查有没有 `→`，结果 P1 核心承诺被写成 `→ 决定：留后续卡` 塞进 `## 未覆盖轴` 全绿销账，
//   且只扫 `notes/implemented/`（迁入 `notes/archived/` 即逃逸）。
// 判据（生效日 = 2026-11-14，覆盖 `notes/implemented/` 与 `notes/archived/` 顶层 Note）：
//   ① 必须有非围栏结构节 `## 未覆盖轴`，且至少 1 条顶层 `- ` 条目；
//   ② 每条顶层 `- ` 条目必须以四分类前缀开头：`- [covered] ` | `- [policy] ` | `- [environment-gap] ` | `- [unprovable] `；
//   ③ 每条必须含 `→`（或 `->`），且箭头右侧至少包含 1 个盘上真实存在的文件锚点
//      （反引号包裹的仓库相对文件路径 `` `path/to/file` ``，或相对该 Note 解析到仓内真实文件的 Markdown 链接 `[label](rel/path)`），
//      禁止只写“留后续卡 / 以后再做”之类无落盘锚点的空头支票。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanDocumentDetailed, sectionRange } from '../../packages/company-pack/src/lib/markdown-shape-core.js'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const EFFECTIVE = '2026-11-14'
const AXIS = '未覆盖轴'
const ARROW = /(?:→|->)/
const CATEGORY_PREFIX = /^-\s+\[(covered|policy|environment-gap|unprovable)\]\s+/
const LIFECYCLE_DIRS = ['notes/implemented', 'notes/archived']

function isExistingRepoFile(rootDir, absTarget) {
  const rel = relative(rootDir, absTarget)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return false
  try {
    return existsSync(absTarget) && statSync(absTarget).isFile()
  } catch {
    return false
  }
}

function stripAnchorOrLine(raw) {
  return raw
    .trim()
    .replace(/#.*$/, '')
    .replace(/:\d+(?::\d+)?$/, '')
}

function hasRealTargetFile(target, rootDir, noteDir) {
  for (const match of target.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = stripAnchorOrLine(match[1] ?? '')
    if (href === '' || /^(?:https?:|mailto:|conversation:|file:)/i.test(href)) continue
    if (isExistingRepoFile(rootDir, resolve(noteDir, href))) return true
  }
  for (const match of target.matchAll(/`([^`\n]+)`/g)) {
    const candidate = stripAnchorOrLine(match[1] ?? '').replaceAll('\\', '/')
    if (candidate === '' || candidate.startsWith('/') || candidate.includes(' ')) continue
    const normalized = normalize(candidate)
    if (normalized.startsWith('..')) continue
    if (isExistingRepoFile(rootDir, resolve(rootDir, normalized))) return true
  }
  return false
}

/**
 * 检查一篇 Note 的「未覆盖轴」条目是否有合法四分类前缀与盘上真实锚点。
 * @param {string} text Note 全文。
 * @param {string} [name] 文件名（错误信息用）。
 * @param {{ rootDir?: string, noteDir?: string }} [options] 解析根目录与 Note 所在目录。
 * @returns {string[]} 问题；空 = 合规。
 */
export function axisProblems(text, name = 'note', options = {}) {
  const rootDir = options.rootDir ?? defaultRoot
  const noteDir = options.noteDir ?? join(rootDir, 'notes/implemented')
  const range = sectionRange(text, AXIS)
  if (range === undefined) return [`${name} 缺「## ${AXIS}」节（新 Note 必须显式写）`]
  const scan = scanDocumentDetailed(text)
  const problems = []
  let bullets = 0
  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = scan.lines[index]
    if (line === undefined || !line.structural) continue
    // 只检顶层 `- ` 条目（忽略缩进续行与二级列表）
    if (!/^-\s+/.test(line.text)) continue
    const trimmed = line.text.trim()
    bullets += 1
    const lineLabel = `${name}:${String(index + 1)}`
    if (!CATEGORY_PREFIX.test(trimmed)) {
      problems.push(`${lineLabel} 「${AXIS}」条目必须带四分类前缀 [covered|policy|environment-gap|unprovable]：${trimmed.slice(0, 70)}`)
      continue
    }
    if (!ARROW.test(trimmed)) {
      problems.push(`${lineLabel} 「${AXIS}」条目没有 → 去向：${trimmed.slice(0, 70)}`)
      continue
    }
    const target = trimmed.split(ARROW).slice(1).join('→').trim()
    if (target === '') {
      problems.push(`${lineLabel} 「${AXIS}」→ 后没有去向`)
      continue
    }
    if (!hasRealTargetFile(target, rootDir, noteDir)) {
      problems.push(`${lineLabel} 「${AXIS}」→ 右侧缺盘上真实文件锚点（须含真实反引号路径或有效 Markdown 文件链接，禁写无落盘去向的空头支票）：${target.slice(0, 70)}`)
    }
  }
  if (bullets === 0) problems.push(`${name} 「## ${AXIS}」没有顶层条目——无轴也要写一条带分类与真实锚点的条目`)
  return problems
}

export function run({ root = defaultRoot, ok, fail }) {
  const problems = []
  let checked = 0
  for (const relDir of LIFECYCLE_DIRS) {
    const dir = join(root, relDir)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isFile() && /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(entry.name) && entry.name.slice(0, 10) >= EFFECTIVE)
      .map(entry => entry.name)
      .sort()
    for (const name of files) {
      checked += 1
      const label = `${relDir}/${name}`
      problems.push(...axisProblems(readFileSync(join(dir, name), 'utf8'), label, { rootDir: root, noteDir: dir }))
    }
  }
  problems.length === 0
    ? ok(`notes-axes（新 Note ${String(checked)} 篇，覆盖 implemented+archived；四分类前缀 + 实盘锚点）`)
    : fail('notes-axes', problems.join('；'))
}
