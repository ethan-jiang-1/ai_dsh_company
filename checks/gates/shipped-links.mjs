// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：改 pack 的 `content/**` 或 `presets/**/skills/**` Markdown 后；发布/导出前。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

// ── 安装形状的出厂内容（shipped-links，2026-10-25，RFC installed-shape-self-sufficient）──
// 为什么：workspace/ + skills 的 Markdown 会随包落到别人的 home；`../docs`、`checks/`、`tools/`、
// `runtime/` 这些只在维护者仓库里成立。旧 `md-links` 把 pack 骨架排除、只校验 dev 盘那份，
// 安装形状的死链在结构上不可见（2026-10-25 实测）。
// 判据：以“安装读者”视角解析——content 文件的相对链接不得穿出 content；skills 的链接按
// 相对/运行盘（`.dsh-company/`）分别解析；两类都不许出现仓库顶目录；裸路径（反引号）同样按段扫描。
// 负例留证 2026-11-03（R5-02）：在 `content/AGENTS.md` 末尾加 `[broken](zz-missing-shipped.md)` →
//   `FAIL shipped-links: packages/company-pack/content/AGENTS.md:158 链接目标不在随包 content：zz-missing-shipped.md`；
//   还原 → `OK shipped-links（content 17 份 + skill 14 份 + persona 6 份）`；root 缺失 → 报「不在盘上」不崩。
const CONTENT = 'packages/company-pack/content'
const PRESETS = 'packages/company-pack/presets'
const REPO_PATH = /(^|[\s"'`(])(?:\.\.\/)?(docs|notes|_backlog|checks|tests|probes|tools|run|runtime|snapshots|vendor|packages|company-workspace)\//
const REPO_TOP = new Set(['docs', 'notes', '_backlog', 'checks', 'tests', 'probes', 'tools',
  'run', 'runtime', 'snapshots', 'vendor', 'packages', 'company-workspace'])

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

const yamlFiles = (root, rel = '') => {
  const dir = join(root, rel)
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...yamlFiles(root, child))
    else if (entry.isFile() && ['.yml', '.yaml'].includes(extname(entry.name).toLowerCase())) out.push(child)
  }
  return out
}

const isFence = line => /^\s*(```|~~~)/.test(line)
const linkTargets = line => {
  const out = []
  const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  for (const match of line.matchAll(re)) out.push(match[1])
  const ref = /^\s*\[[^\]]+\]:\s*(\S+)/.exec(line)
  if (ref !== null) out.push(ref[1])
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
const isExternal = target => target === '' || target.startsWith('#')
  || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)
const topOf = (target) => target.replace(/^\.\//, '').split('/')[0]

export function run({ root, ok, fail }) {
  const contentRoot = resolve(root, CONTENT)
  const presetsRoot = resolve(root, PRESETS)
  if (!existsSync(contentRoot)) {
    fail('shipped-links', `${CONTENT} 不在盘上——随包分发的只读内容（手册/模板/默认章程/状态默认值）不许消失；发布面会少一整层`)
    return
  }
  // `content/wiki-template/` 是**被拷贝出去**的起点，不是随包被角色阅读的内容：它的相对链接
  // （`../index.md`）解析目标是**拷贝后的那份 wiki**，按安装读者视角判必然假红。它的链接完整性
  // 由 `tests/content/wiki-template.spec.ts` 守（index→示例页在盘上、无仓库绝对路径）。
  // 负例留证 2026-11-12（建模板当天实跑）：纳入扫描 → `.dsh-company`... 八条
  // 「链接指向仓库/穿出 workspace」；排除后绿。spec 侧反证：把 index 的链接改名 → spec 红。
  const files = [
    ...mdFiles(contentRoot).filter(rel => !rel.startsWith('wiki-template/'))
      .map(rel => ({ rel: `${CONTENT}/${rel}`, file: join(contentRoot, rel), kind: 'content' })),
    ...mdFiles(presetsRoot).filter(rel => rel.split('/').includes('skills')).map(rel => ({ rel: `${PRESETS}/${rel}`, file: join(presetsRoot, rel), kind: 'skill' })),
  ]
  const problems = []
  for (const { rel, file, kind } of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    let fenced = false
    lines.forEach((line, index) => {
      if (isFence(line)) { fenced = !fenced; return }
      const at = `${rel}:${String(index + 1)}`
      if (fenced) {
        // 代码块也是指令面：`node tools/...` / `source run/...` 在安装后的盘上同样不存在。
        // 负例：在任一 SKILL.md 加一行 fenced `node tools/x.mjs` → 红。
        const trimmed = line.trim()
        if (trimmed !== '' && !/https?:\/\//.test(trimmed)
          && REPO_PATH.test(trimmed)) {
          problems.push(`${at} 代码块指向仓库：${trimmed.slice(0, 100)}`)
        }
        return
      }
      for (const raw of linkTargets(line)) {
        const target = stripTarget(raw)
        if (isExternal(target)) continue
        if (target.startsWith('/')) {
          if (REPO_TOP.has(target.slice(1).split('/')[0] ?? '')) problems.push(`${at} 链接指向仓库绝对路径：${raw}`)
          continue
        }
        const top = topOf(target)
        if (REPO_TOP.has(top) || target.startsWith('../')) {
          problems.push(`${at} 链接指向仓库/穿出 workspace：${raw}`)
          continue
        }
        if (kind === 'content') {
          const resolved = resolve(dirname(file), target)
          const within = relative(contentRoot, resolved)
          if (within.startsWith(`..${sep}`) || within === '..' || isAbsolute(within)) {
            problems.push(`${at} 链接穿出 content：${raw}`)
            continue
          }
          if (!existsSync(resolved)) problems.push(`${at} 链接目标不在随包 content：${raw}`)
        } else if (target.startsWith('./') || target.startsWith('../')) {
          // skill 的相对链接按 pack 内解析；非相对目标是角色 cwd 的运行时路径
          // （`.dsh-company/...`，由 host 首启自举创建），不在包里要求存在——否则必假红。
          const resolved = resolve(dirname(file), target)
          const within = relative(presetsRoot, resolved)
          if (within.startsWith(`..${sep}`) || within === '..') problems.push(`${at} 链接穿出 pack：${raw}`)
          else if (!existsSync(resolved)) problems.push(`${at} 链接目标不在 pack：${raw}`)
        }
      }
      for (const span of codeSpans(line)) {
        if (/^\s*(https?:|mailto:)/.test(span)) continue
        if (REPO_PATH.test(span)) {
          problems.push(`${at} 裸路径指向仓库：${span}`)
        }
      }
    })
  }
  // persona 文本也进会话（agent.cordis.yml 的非注释行）；注释里的设计依据不算注入面。
  const personas = yamlFiles(presetsRoot).filter(rel => rel.endsWith('agent.cordis.yml'))
  for (const rel of personas) {
    const file = join(presetsRoot, rel)
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) return
      if (REPO_PATH.test(trimmed)) problems.push(`${PRESETS}/${rel}:${String(index + 1)} persona 指向仓库：${trimmed.slice(0, 100)}`)
    })
  }
  problems.length === 0
    ? ok(`shipped-links（content ${String(files.filter(f => f.kind === 'content').length)} 份 + skill ${String(files.filter(f => f.kind === 'skill').length)} 份 + persona ${String(personas.length)} 份；零仓库路径/穿出 content）`)
    : fail('shipped-links', problems.join('；'))
}
