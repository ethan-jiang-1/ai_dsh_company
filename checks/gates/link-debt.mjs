// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { markdownLinkTargets } from '../../tools/lib/markdown-links.mjs'

// ── 链接欠账棘轮门（link-debt，2026-11-03 第六轮立）──────────────────────────────
// 为什么：`md-links` 对三类"缺失目标"直接 return（`tools/lib/markdown-links.mjs` 的本地证据引用豁免）：
// ① 目标在 `snapshots/`、`runtime/`、`company-workspace/` 下（证据已移出产品仓 / 运行残留）；
// ② 源头在冻结层（`notes/archived/`、`_backlog/_archive/`，按政策不回写）；③ 归档修复门只查 `.md`。
// 于是 2026-11-03 实测 **44 条死链全在豁免区，`md-links` 报 0**——豁免把"缺失"变成了"不看"。
// 本门不复活那些死链（冻结层不回写、证据确已移走），只把"看不见"变成**有数字、只能降**：
// 按三类计数，超过 `checks/gates/lib/link-debt.json` 的基线即红；低于基线只提示可下调。
// 口径：
//   live     = 源头非冻结层、目标也不在三个证据树 → 真·活层死链（`md-links` 同样会红；此计数须为 0）
//   moved    = 源头非冻结层，目标落在 snapshots/ runtime/ company-workspace/（证据引用已移走）
//   archived = 源头在冻结层（无论目标）——归档是历史记录，不回写，只设天花板
// 不查的反面（明说）：① 只认 Markdown 链接（HTML href / 裸文件名不在内）；② 不认 URL 与锚点；
//   ③ `packages/company-pack/content/` 按部署相对语料排除（其链接由 `shipped-links` 按 content 基准查）。
// 负例留证 2026-11-03（实地造红→还原→绿）：在 `notes/implemented/2026-11-03-round6-hygiene-batch.md`
//   末尾加 `[x](../../snapshots/visual/zz-missing.png)` →
//   `FAIL link-debt: moved 1 > 基线 0（源头非冻结层、目标已移出产品仓的证据引用只许降）`；删除 → 绿
//   `archived 39 / moved 0 / live 0`。同轮把 5 条 moved 死链改写成散文（证据已移私有仓）后才把基线降到 0。
// 负例留证 2026-11-11（clean clone）：无 runtime/company-workspace 证据树时 archived 23 > 20；
//   冻结层证据树目标改为跳过 → archived 4 ≤ 20 绿；普通 archived 目标仍计数（不放过普通断链）。
const CLASSES = ['archived', 'moved', 'live']
const MOVED_TARGET_PREFIXES = ['snapshots/', 'runtime/', 'company-workspace/']

/** git ls-files 取 tracked markdown（-z 避免中文文件名被转义）；不读 node_modules/vendor。 */
function trackedMarkdown(root) {
  const output = execFileSync('git', ['ls-files', '-z', '*.md'], { cwd: root, encoding: 'utf8' })
  return output.split('\0').filter(Boolean)
}

function classify(root, sourceRel, targetAbs) {
  const frozen = sourceRel.startsWith('notes/archived/') || sourceRel.startsWith('_backlog/_archive/')
  if (frozen) return 'archived'
  const targetRel = relative(root, targetAbs).split(sep).join('/')
  if (targetRel.startsWith('..')) return 'live'
  if (MOVED_TARGET_PREFIXES.some(prefix => targetRel.startsWith(prefix))) return 'moved'
  return 'live'
}

export function run({ root, ok, fail }) {
  const baselinePath = join(root, 'checks/gates/lib/link-debt.json')
  if (!existsSync(baselinePath)) {
    fail('link-debt', 'checks/gates/lib/link-debt.json 缺失——没有基线就没有棘轮（不是静默跳过）')
    return
  }
  let baseline
  try {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  } catch (error) {
    fail('link-debt', `基线不可解析：${String(error?.message ?? error)}`)
    return
  }
  const missingKeys = CLASSES.filter(key => typeof baseline[key] !== 'number')
  if (missingKeys.length > 0) {
    fail('link-debt', `基线缺字段 ${missingKeys.join(', ')}（三类计数是形状锚，缺一即红）`)
    return
  }

  const counts = Object.fromEntries(CLASSES.map(key => [key, 0]))
  const samples = Object.fromEntries(CLASSES.map(key => [key, []]))
  for (const sourceRel of trackedMarkdown(root)) {
    if (sourceRel.startsWith('packages/company-pack/content/')) continue
    const absolute = join(root, sourceRel)
    if (!existsSync(absolute)) continue
    let targets
    try {
      targets = markdownLinkTargets(absolute)
    } catch (error) {
      fail('link-debt', `${sourceRel} 解析失败：${String(error?.message ?? error)}`)
      return
    }
    for (const target of targets) {
      if (existsSync(target)) continue
      const frozen = sourceRel.startsWith('notes/archived/') || sourceRel.startsWith('_backlog/_archive/')
      const targetRel = relative(root, target).split(sep).join('/')
      // 2026-11-11 clean clone 实测：冻结层引用 runtime/... 证据，warm 盘存在、clone 不存在。
      // 冻结层不回写，且这类目标 gitignored（证据树不在 repo handoff 内）⇒ 不计 archived；
      // 非冻结源引用证据树仍归 moved（baseline 0），不放过活层。
      if (frozen && MOVED_TARGET_PREFIXES.some(prefix => targetRel.startsWith(prefix))) continue
      const kind = classify(root, sourceRel, target)
      counts[kind]++
      if (samples[kind].length < 5) samples[kind].push(`${sourceRel} → ${relative(root, target).split(sep).join('/')}`)
    }
  }

  const grown = CLASSES.filter(key => counts[key] > baseline[key])
  if (grown.length > 0) {
    fail('link-debt', grown.map(key => `${key} ${String(counts[key])} > 基线 ${String(baseline[key])}`
      + `（${key === 'live' ? '活层死链必须为 0' : key === 'moved' ? '证据已移出产品仓的引用只许降' : '冻结层只设天花板'}）`
      + (samples[key].length > 0 ? `：${samples[key].join('；')}` : '')).join(' / '))
    return
  }
  const slack = CLASSES.filter(key => counts[key] < baseline[key])
  ok(`link-debt（archived ${String(counts.archived)} / moved ${String(counts.moved)} / live ${String(counts.live)}`
    + `；基线 ${String(baseline.archived)}/${String(baseline.moved)}/${String(baseline.live)}`
    + `${slack.length > 0 ? `——${slack.join('/')} 已低于基线，可下调 link-debt.json` : ''}）`)
}
