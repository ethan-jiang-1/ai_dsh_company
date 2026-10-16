/**
 * converge.mjs 的纯判定规则（判据单一来源；IO 留在驱动脚本，tests/company/converge-rules.spec.ts 消费）。
 * 三条规则各有自己的事故卡：journal 归属 = 2026-10-12 前缀误吞教训（BUG-014 卡引用）；
 * 查重锚 = BUG-014（子串查重假跳过）；证据目录解析 = BUG-015（日期耦合写断链）。
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'

/** journal 文件名 → 所属 slug；无属主 = null（当轮散件，不清）。
 *  规则：剥日期后精确等于 slug，或以 slug- 开头且**不与任何其他 slug 精确同名**
 *  （裸前缀匹配会误吞后继 slug——2026-10-12 实测：收敛 ai-coding-security-2026 时
 *  把未闭合的 -light / -v2 两 slug 的 journal 一并清了）。 */
export function journalSlug(fileName, slug, allSlugs = []) {
  const stripped = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
  if (stripped !== slug && allSlugs.includes(stripped)) return null // 它是另一个 slug 的正主
  return stripped === slug || stripped.startsWith(`${slug}-`) ? fileName : null
}

/**
 * 收敛前置：本动议**是否有可收割的 journal**（2026-10-16 立，事故 = ai-transformation-2026-v4）。
 *
 * 为什么需要它：`converge.mjs` 的 journal 收割预览**只报数、不设前置**——一场动议即使
 * 五职零留痕也照样「可收敛」，收敛动作把 live journal 清掉（`git rm`）之后，**没有任何
 * 痕迹**能证明它曾经缺留痕。实测现场：`ai-transformation-2026-v4`（10-10 kickoff、10-11
 * closed、已归档）在 live 与 `kb/archive/` 两处**都没有任何 journal**，而 `journal-audit`
 * 只能事后按会话报**缺席 6 条**——坑在收敛这一步，闸门却只在事后响。
 *
 * ⚠ 只数、不判性质：函数回答「有几篇 journal 可收割」；「缺留痕该不该放行」是人的判断
 * （`--allow-no-journal` 显式放行即留痕），不在纯函数里替人拍。
 * @param input - `{ slug, journals }`；`journals` = 该动议可收割的 journal（`harvestJournal` 的产物）。
 * @returns `{ count, missing }`；`missing === true` ⇒ 零篇，收敛前置未满足。
 */
export function journalPresence(input) {
  const count = (input.journals ?? []).length
  return { count, missing: count === 0 }
}

/**
 * 收敛切片的识别与计量（2026-10-16 立；事故 = 预算门禁的过滤器只认旧命名）。
 *
 * 为什么住这里：**收敛切片的命名有两代**——旧 `memory-convergence-<日期>[-N]`（至 2026-10-07）、
 * 新 `convergence-<日期>`（本文件同目录的 `tools/converge.mjs` 现行 `evName`）。命名知识属收敛面，
 * 所以过滤器住这里、由预算门禁（`checks/gates/snapshots-budget.mjs`）消费；判据单一来源，
 * 且可被 keyless 单测直接钉（`checks/**` 不许被 tests 导入 ⇒ 住在门禁里就测不到）。
 * @param input - `{ scenes, bytesOf }`：`scenes` = `canonicalSnapshotScenes(root)`；`bytesOf` = 目录 → 字节数。
 * @returns `{ scenes, bytes }`——属于收敛代际的场景与合计字节。
 */
export function convergenceSlices(input) {
  const scenes = (input.scenes ?? []).filter(scene => /^(?:memory-)?convergence-/.test(scene.name))
  const bytes = scenes.reduce((sum, scene) => sum + input.bytesOf(scene.path), 0)
  return { scenes, bytes }
}

/**
 * 半态续跑判定（2026-10-16 立，BUG-020：崩溃在收敛中途且工具认不出半态）。
 *
 * 现场：收敛是一串有副作用的顺序操作（证据副本 → 交付物 fs rename + git add → 清 live journal
 * → 台账行 → 打印 backfill 指引）。`git rm` 撞未跟踪 journal 时抛在**第 3 步**，盘面停在
 * 「交付物已入归档家、journal 清一半、台账未追加」；而 `converge(slug)` 的前置只认**活跃区**的
 * slug ⇒ 重跑得「deliverables/ 下无此目录」，半态无法被工具自己接手。
 *
 * 判据只读**可观察状态**（两处目录在不在 + 还有几篇 live journal 可收割），不猜过程。
 * @param input - `{ dirName, journalled, hasFinal }`
 *   - `hasFinal`：活跃区**存在该目录**（正常收敛的入口；与半态互斥）；
 *   - `journalled`：**还有** live journal 可收割（`harvestJournal` 非空）。
 * @returns `{ resumable, reason, remaining }`；`reason ∈ 'ok' | 'still-active' | 'directions-missing'`。
 *   `remaining` 只列**还需做**的步骤（journal 步在零篇时视为已完成——续跑幂等）。
 */
export function convergenceResume(input) {
  if (input.hasFinal) return { resumable: false, reason: 'still-active', remaining: [] }
  if (!input.archived) return { resumable: false, reason: 'directions-missing', remaining: [] }
  const remaining = []
  if (input.journalled) remaining.push('journal')
  remaining.push('ledger', 'backfill')
  return { resumable: true, reason: 'ok', remaining }
}

/** CHARTER 是否已有该 slug 的历史纪要**条目**。
 *  锚 = 条目行形「- <YYYY-MM-DD> · <slug>（」——整文件子串查重（includes）会被
 *  引用路径里的 slug 字样误触（BUG-014：COO 的证据路径含 slug → 假跳过、条目漏登）。 */
export function charterHasEntry(charterText, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^\\s*-\\s*\\d{4}-\\d{2}-\\d{2}\\s*·\\s*${esc}（`, 'm').test(charterText)
}

/** CLI 旗标解析（纯函数）——参数唯一源在 converge.mjs 头注（BUG-016：未知旗标曾静默收下）。 */
const KNOWN_FLAGS = ['--slug', '--dry-run', '--charter-backfill', '--resume', '--allow-no-journal', '--allow-open-findings']
export function parseFlags(args) {
  for (const a of args) {
    if (a.startsWith('--') && !KNOWN_FLAGS.includes(a)) {
      throw new Error(`未知旗标 ${a}——认识：--slug <目录名> / --dry-run / --charter-backfill <目录名> / --allow-no-journal / --allow-open-findings / --resume <目录名>；无参 = 计划模式`)
    }
  }
  const argOf = name => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
  return { slug: argOf('slug'), dryRun: args.includes('--dry-run'), charterBackfill: argOf('charter-backfill'), allowNoJournal: args.includes('--allow-no-journal'), allowOpenFindings: args.includes('--allow-open-findings'), resume: argOf('resume') }
}

/** 解析某已收敛 slug 的证据目录名（convergence-<日期>）。
 *  扫 snapshots/archive/ 下各 convergence-* 目录，认「<目录>/<dirName> 在场」为证据；
 *  多日并存取最新（ISO 日期字典序 = 时间序）；无证据目录 = throw（fail-loud——
 *  BUG-015：写死运行日曾静默写出断链指针）。 */
export function resolveEvidenceDir(archiveRoot, dirName) {
  const matches = []
  if (existsSync(archiveRoot)) {
    for (const d of readdirSync(archiveRoot)) {
      if (!/^convergence-\d{4}-\d{2}-\d{2}$/.test(d)) continue
      if (existsSync(join(archiveRoot, d, dirName))) matches.push(d)
    }
  }
  if (matches.length === 0) {
    throw new Error(`无收敛证据目录：snapshots/archive/convergence-*/ 下没有 ${dirName}（backfill 只补已收敛 slug）`)
  }
  matches.sort()
  return matches[matches.length - 1]
}

/**
 * 归档搬移的**步骤计划**（2026-10-13）。为什么不再用 `git mv`：自本日起交付物的 `drafts/**`
 * （含 `sources/`）**不进 git**（仓库瘦身，见 Note 2026-10-13-workspace-slimming），
 * 而 `git mv <目录>` 遇到未跟踪文件会 fatal（`not under version control`）——目录必须用
 * **文件系统搬**，tracked 面（final/meta 等）再用 `git add -A` 收进索引（删除+新增一起 stage）。
 * @param dirName - deliverables/ 下的目录名（`<日期>-<slug>`）。
 * @returns 相对仓库根的 from/to + git 参数（执行留在驱动脚本；spec 在临时 git 仓里真跑同一份计划）。
 */
export function archiveMovePlan(dirName) {
  const from = join('company-workspace', 'deliverables', dirName).split(sep).join('/')
  const to = join('company-workspace', 'deliverables-archive', dirName).split(sep).join('/')
  return { from, to, gitArgs: ['add', '-A', '--', from, to] }
}
