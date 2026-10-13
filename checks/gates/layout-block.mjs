// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FIXTURE_PATH, RETIRED_PATHS, RUNTIME_PREFIXES } from './bare-path.mjs'

// ── 2d-quater. 入口布局块门禁（layout-block，2026-10-10 立）──────────────────────
// 为什么：AGENTS.md 的 fenced 布局块是**全仓最常被读的指针块**（fresh agent 第一眼），但它此前
// **不在任何门禁射程**——bare-path 只吃单反引号 + TOP_DIRS 前缀，fenced 块里的路径既无反引号、
// 又按列对齐带尾随空格注释，两条都不满足。后果实测过两次（同轮）：① 幽灵指针 `vendor/README.md`
// 类腐化能在纪律表存活；② `runtime/` 行声称"整树 gitignored"而实际 9 个文件 tracked（"整树豁免"
// 正建立在这句话上）。两处都是"最多人读的一页写着盘上没有/不对的事实"，而门禁全绿。
// 规则：取布局块每行**首列路径 token**（`^\S+`，忽略其后的对齐空格与说明），存在性检查（双树口径同
// bare-path）。跳过三类非"存在性断言"的行：symlink 形态（含 `->`）、说明性续行（不以已知顶层目录/
// 文件形态开头）、以及带 `zz` 夹具记号的负例行。只查存在性——**不查"这句话对不对"**（散文语义不做机械
// 判定，那是本仓既有边界：计数/措辞类靠纪律与审读，不靠门禁）。
// 负例留证 2026-10-10（实跑原话）：布局块临时插 `vendor/README.md` 行 →
//   `FAIL layout-block: AGENTS.md:N → \`vendor/README.md\` 不存在（布局块指了盘上没有的路径）`；还原即绿。
export function run({ root, ok, fail }) {
  const layoutRel = 'AGENTS.md'
  const layoutLines = readFileSync(join(root, layoutRel), 'utf8').split('\n')
  let inFence = false
  let layoutChecked = 0
  let layoutBad = false
  const KNOWN_TOP = /^(CLAUDE\.md|\.agents\/|packages\/|company-workspace\/|vendor\/|docs\/|notes\/|_backlog\/|checks\/|tests\/|probes\/|tools\/|_dist\/|run\/|runtime\/|snapshots\/)/
  for (let i = 0; i < layoutLines.length; i++) {
    const line = layoutLines[i]
    if (/^```/.test(line)) { inFence = !inFence; continue }
    if (!inFence) continue
    const m = line.match(/^(\S+)/)
    if (!m) continue
    const raw = m[1]
    if (line.includes('->')) continue                      // symlink 形态：右侧才是目标，另由 symlink 门禁查
    if (!KNOWN_TOP.test(raw)) continue                     // 说明性续行/非路径开头
    if (FIXTURE_PATH.test(raw)) continue                   // 负例夹具记号
    if (RUNTIME_PREFIXES.some(p => raw.startsWith(p))) continue
    if (RETIRED_PATHS.has(raw)) continue
    layoutChecked++
    if (!existsSync(join(root, raw))) {
      layoutBad = true
      fail('layout-block', `${layoutRel}:${i + 1} → \`${raw}\` 不存在（布局块指了盘上没有的路径）`)
    }
  }
  if (!layoutBad) ok(`layout-block ×${layoutChecked}（AGENTS.md fenced 布局块首列路径存在性）`)
}
