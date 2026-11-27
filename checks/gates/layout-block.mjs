// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；改 AGENTS.md 布局面或软链后跑 pnpm test:checks。
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { headingSections, splitGfmTableCells } from '../../tools/lib/core/repo-markdown.mjs'
import { FIXTURE_PATH, RETIRED_PATHS, RUNTIME_PREFIXES } from './bare-path.mjs'

// ── 2d-quater. 入口布局块与 DSH 软链门禁（layout-block，2026-10-10 立；2026-11-27 并入软链守卫）──
// 为什么：
//   ① AGENTS.md 的布局面是 fresh agent 第一眼指针块，必须机械校验每条路径真实存在；
//   ② 三仓统一要求保留 DSH 原生软链 `CLAUDE.md -> AGENTS.md` 与 `.claude/skills -> ../.agents/skills`；
//      受 policy §P2 门禁总数封顶约束，将软链守卫并入本入口布局门禁，不新增独立 gate 文件。
// 规则：
//   A. 布局面路径存在性（支持 fenced 布局块首列路径及 Markdown 布局表链接，至少命中 1 条，零命中判红防空转）；
//   B. `REQUIRED_SYMLINKS` 中每条路径必须存在、为符号链接且目标逐字匹配。
// 负例留证 2026-10-10：布局块临时插 `vendor/README.md` 行 → `FAIL layout-block: AGENTS.md:N → \`vendor/README.md\` 不存在`；还原即绿。
// 负例留证 2026-11-27：将 `CLAUDE.md` 改为普通文件或删掉 `.claude/skills` → `FAIL layout-block: … 不是符号链接 / 缺失`；还原即绿。
export const REQUIRED_SYMLINKS = [
  ['CLAUDE.md', 'AGENTS.md'],
  ['.claude/skills', '../.agents/skills'],
]

export function run({ root, ok, fail }) {
  const layoutRel = 'AGENTS.md'
  const layoutPath = join(root, layoutRel)
  if (!existsSync(layoutPath)) {
    fail('layout-block', `${layoutRel} 不在盘上——根入口不许消失`)
    return
  }
  const layoutLines = readFileSync(layoutPath, 'utf8').split('\n')
  let inFence = false
  let layoutChecked = 0
  let layoutBad = false
  const KNOWN_TOP = /^(\.agents\/|\.claude\/|CLAUDE\.md|packages\/|company-workspace\/|vendor\/|docs\/|notes\/|_backlog\/|checks\/|tests\/|probes\/|tools\/|_dist\/|run\/|runtime\/|snapshots\/)/
  for (let i = 0; i < layoutLines.length; i++) {
    const line = layoutLines[i]
    if (line.startsWith('```')) { inFence = !inFence; continue }
    if (!inFence) continue
    const m = line.match(/^(\S+)/)
    if (!m) continue
    const raw = m[1]
    if (line.includes('->')) continue
    if (!KNOWN_TOP.test(raw)) continue
    if (FIXTURE_PATH.test(raw)) continue
    if (RUNTIME_PREFIXES.some(p => raw.startsWith(p))) continue
    if (RETIRED_PATHS.has(raw)) continue
    layoutChecked++
    if (!existsSync(join(root, raw))) {
      layoutBad = true
      fail('layout-block', `${layoutRel}:${i + 1} → \`${raw}\` 不存在（布局块指了盘上没有的路径）`)
    }
  }
  // 兼容：若根 AGENTS.md 改用「## 布局」Markdown 表格呈现目录树，同样校验表格首列链接/路径，防止门禁退化为 ×0 空转。
  if (layoutChecked === 0) {
    const rawText = layoutLines.join('\n')
    const layoutSec = headingSections(rawText, { depth: 2 }).find(
      sec => sec.title.includes('布局') || sec.rawTitle.includes('布局'),
    )
    if (layoutSec !== undefined) {
      const secLines = layoutSec.structuralBody.split('\n')
      for (let idx = 0; idx < secLines.length; idx += 1) {
        const line = secLines[idx]
        if (!line.trim().startsWith('|')) continue
        const firstCell = splitGfmTableCells(line)[0] ?? ''
        const linkMatch = /\]\((?:\.\/)?([^)#\s]+)\)/.exec(firstCell)
        const codeMatch = /`([^`\s]+)`/.exec(firstCell)
        const raw = (linkMatch?.[1] ?? codeMatch?.[1] ?? '').replace(/^\.\//, '')
        if (!raw || !KNOWN_TOP.test(raw)) continue
        if (FIXTURE_PATH.test(raw)) continue
        if (RUNTIME_PREFIXES.some(p => raw.startsWith(p))) continue
        if (RETIRED_PATHS.has(raw)) continue
        layoutChecked++
        if (!existsSync(join(root, raw))) {
          layoutBad = true
          fail('layout-block', `${layoutRel}:${layoutSec.startLine + 1 + idx} → \`${raw}\` 不存在（布局表指了盘上没有的路径）`)
        }
      }
    }
  }
  if (layoutChecked === 0) {
    layoutBad = true
    fail('layout-block', `${layoutRel} 未解析到任何布局路径（禁止门禁 ×0 空转假绿）`)
  }
  for (const [linkRel, expectedTarget] of REQUIRED_SYMLINKS) {
    const abs = join(root, linkRel)
    let stat
    try { stat = lstatSync(abs) } catch { stat = null }
    if (stat === null) {
      layoutBad = true
      fail('layout-block', `${linkRel} 缺失（须为指向 ${expectedTarget} 的符号链接）`)
      continue
    }
    if (!stat.isSymbolicLink()) {
      layoutBad = true
      fail('layout-block', `${linkRel} 不是符号链接（严禁手写副本，须软链至 ${expectedTarget}）`)
      continue
    }
    const actual = readlinkSync(abs)
    if (actual !== expectedTarget) {
      layoutBad = true
      fail('layout-block', `${linkRel} 软链目标为 ${actual}，应为 ${expectedTarget}`)
    }
  }
  if (!layoutBad) ok(`layout-block ×${layoutChecked}（AGENTS.md 布局路径存在性 + ${REQUIRED_SYMLINKS.length} 条 DSH 软链）`)
}
