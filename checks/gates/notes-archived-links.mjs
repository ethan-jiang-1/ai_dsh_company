// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：移动/删除 notes/archived 下的文件，或修改其中链接后；每次 verify。
// 为什么：md-links 排除 archived（冻结层不当作源语料扫描），所以移动/归档后断链不会被 verify 发现。
//   2026-10-30 移动 16+21 篇归档时一次性断了 66 处，靠一次性脚本才补回；本门禁补这条覆盖。
// 判据：notes/archived/**/*.md 里的 markdown `.md` 链接（相对路径）必须指向存在的文件。
//   外链、纯锚点、非 .md 目标不管；archived 的背引号裸路径仍按“历史事实”不判红（bare-path 观察档口径）。
// 负例留证 2026-10-30：新建 notes/archived/zz-link-probe.md，写 `](zz-missing.md)`
//   → FAIL notes-archived-links: …zz-link-probe.md → zz-missing.md；删文件 → PASS ×92。
// 负例留证 2026-11-11（clean clone）：无 runtime/ 证据树时 2 处 runtime 链接红；改为跳过三棵证据树后绿；
//   同 probe 里普通 zz-missing.md 仍红（证明不是全放行）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(path)
  }
  return out
}

// 2026-11-11 clean clone 实测：归档笔记引用 runtime/... / company-workspace/... 运行证据，
// warm 盘存在、clone 不存在；这些目标 gitignored，不属于 repo handoff 的链接面（md-links
// 本来就豁免它们）。只跳过这三棵证据树，普通 .md 断链仍判红。
const RUNTIME_ONLY_PREFIXES = ['runtime/', 'company-workspace/', 'snapshots/']

export function run({ root, ok, fail }) {
  const dir = join(root, 'notes', 'archived')
  if (!existsSync(dir)) { fail('notes-archived-links', 'notes/archived 不在盘上——归档链接无从检查'); return }
  const files = walk(dir)
  const bad = []
  for (const file of files) {
    const rel = relative(root, file).split('\\').join('/')
    for (const m of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+\.md)(?:#[^)]*)?\)/g)) {
      const href = m[1]
      if (/^(https?:|\/)/.test(href)) continue
      const target = normalize(join(dirname(rel), href)).split('\\').join('/')
      if (RUNTIME_ONLY_PREFIXES.some(prefix => target.startsWith(prefix))) continue
      if (!existsSync(join(root, target))) bad.push(`${rel} → ${href}`)
    }
  }
  bad.length === 0
    ? ok(`notes-archived-links ×${String(files.length)}（归档层 markdown 链接全部在场）`)
    : fail('notes-archived-links', `${bad.slice(0, 8).join('；')}${bad.length > 8 ? ` …共 ${String(bad.length)} 处` : ''}`)
}
