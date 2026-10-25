// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：改 pack 的 `workspace/**` 或 `presets/**/skills/**` Markdown 后；发布/导出前。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

// ── 安装形状的出厂内容（shipped-links，2026-10-25，RFC installed-shape-self-sufficient）──
// 为什么：workspace/ + skills 的 Markdown 会随包落到别人的 home；`../docs`、`checks/`、`tools/`、
// `runtime/` 这些只在维护者仓库里成立。旧 `md-links` 把 pack 骨架排除、只校验 dev 盘那份，
// 安装形状的死链在结构上不可见（2026-10-25 实测）。
// 判据：以“安装读者”视角解析——workspace 文件的相对链接不得穿出 workspace；skills 的链接按
// workspace 相对（角色 cwd）解析；两类都不许出现仓库顶目录；裸路径（反引号）同样按段扫描。
const WORKSPACE = 'packages/company-pack/workspace'
const PRESETS = 'packages/company-pack/presets'
const REPO_TOP = new Set(['docs', 'notes', '_backlog', 'checks', 'tests', 'probes', 'tools',
  'run', 'runtime', 'snapshots', 'vendor', 'packages', 'company-workspace'])
const WORKSPACE_TOP = new Set(['kb', 'templates', 'deliverables', 'deliverables-archive'])

const mdFiles = (root, rel = '') => {
  const dir = join(root, rel)
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...mdFiles(root, child))
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') out.push(child)
  }
  return out
}

const isFence = line => /^\s*(```|~~~)/.test(line)
const linkTargets = line => {
  const out = []
  const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  for (const match of line.matchAll(re)) out.push(match[1])
  return out
}
const codeSpans = line => [...line.matchAll(/`([^`\n]+)`/g)].map(match => match[1])
const stripTarget = (raw) => {
  let target = raw.trim().replace(/^<|>$/g, '')
  const hash = target.indexOf('#')
  if (hash >= 0) target = target.slice(0, hash)
  const query = target.indexOf('?')
  if (query >= 0) target = target.slice(0, query)
  try { return decodeURIComponent(target) } catch { return target }
}
const isExternal = target => target === '' || target.startsWith('#') || target.startsWith('/')
  || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)
const topOf = (target) => target.replace(/^\.\//, '').split('/')[0]

export function run({ root, ok, fail }) {
  const workspaceRoot = resolve(root, WORKSPACE)
  const presetsRoot = resolve(root, PRESETS)
  const files = [
    ...mdFiles(workspaceRoot).map(rel => ({ rel: `${WORKSPACE}/${rel}`, file: join(workspaceRoot, rel), kind: 'workspace' })),
    ...mdFiles(presetsRoot).filter(rel => rel.split('/').includes('skills')).map(rel => ({ rel: `${PRESETS}/${rel}`, file: join(presetsRoot, rel), kind: 'skill' })),
  ]
  const problems = []
  for (const { rel, file, kind } of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    let fenced = false
    lines.forEach((line, index) => {
      if (isFence(line)) { fenced = !fenced; return }
      if (fenced) return
      const at = `${rel}:${String(index + 1)}`
      for (const raw of linkTargets(line)) {
        const target = stripTarget(raw)
        if (isExternal(target)) continue
        const top = topOf(target)
        if (REPO_TOP.has(top) || target.startsWith('../')) {
          problems.push(`${at} 链接指向仓库/穿出 workspace：${raw}`)
          continue
        }
        if (kind === 'workspace') {
          const resolved = resolve(dirname(file), target)
          const within = relative(workspaceRoot, resolved)
          if (within.startsWith(`..${sep}`) || within === '..' || isAbsolute(within)) {
            problems.push(`${at} 链接穿出 workspace：${raw}`)
            continue
          }
          if (!existsSync(resolved)) problems.push(`${at} 链接目标不在出厂骨架：${raw}`)
        } else {
          const resolved = target.startsWith('./') || target.startsWith('../')
            ? resolve(dirname(file), target)
            : resolve(workspaceRoot, target)
          if (target.startsWith('./') || target.startsWith('../')) {
            const within = relative(presetsRoot, resolved)
            if (within.startsWith(`..${sep}`) || within === '..') problems.push(`${at} 链接穿出 pack：${raw}`)
            else if (!existsSync(resolved)) problems.push(`${at} 链接目标不在 pack：${raw}`)
          } else if (!WORKSPACE_TOP.has(top) && !existsSync(resolved)) {
            problems.push(`${at} 链接目标不在出厂骨架：${raw}`)
          } else if (!existsSync(resolved)) {
            problems.push(`${at} 链接目标不在出厂骨架：${raw}`)
          }
        }
      }
      for (const span of codeSpans(line)) {
        if (/^\s*(https?:|mailto:)/.test(span)) continue
        if (/(^|[\s`(])(?:\.\.\/)?(docs|notes|_backlog|checks|tests|probes|tools|run|runtime|snapshots|vendor|packages|company-workspace)\//.test(span)
          || /(^|[\s`(])\.\.\/docs\//.test(span)) {
          problems.push(`${at} 裸路径指向仓库：${span}`)
        }
      }
    })
  }
  problems.length === 0
    ? ok(`shipped-links（${String(files.length)} 份出厂 Markdown；零仓库路径/穿出 workspace）`)
    : fail('shipped-links', problems.join('；'))
}
