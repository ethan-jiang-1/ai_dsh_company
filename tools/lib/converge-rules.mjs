/**
 * converge.mjs 的纯判定规则（判据单一来源；IO 留在驱动脚本，tests/company/converge-rules.spec.ts 消费）。
 * 三条规则各有自己的事故卡：journal 归属 = 2026-10-12 前缀误吞教训（BUG-014 卡引用）；
 * 查重锚 = BUG-014（子串查重假跳过）；证据目录解析 = BUG-015（日期耦合写断链）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

/**
 * 归档区里找一场动议的 journal（converge 的证据副本形状）。
 *
 * 事故（2026-10-16）：`converge.mjs` 把 journal 留底到 `<场景>/<dirName>/journal/<role>/`，
 * 而 `journal-audit` 只查老形状 `<场景>/workspace.actual/kb/<role>/journal/`（那是
 * `memory-convergence-*` 时代的整盘拷贝形状）⇒ **命名换代时这条链接断了**：收敛过的场次
 * 明明有证据在盘，审计却报「五职全缺席」。实测 16 条缺席里 9 场有证据。
 * @param input - `{ dirs, slug }`：`dirs` = 候选目录（由调用方按形状枚举）；`slug` = 目标动议。
 * @returns 命中文件的**绝对路径**；未命中 = null。
 */
export function pickArchivedJournal(input) {
  // ⚠ **只认文件名命中**（2026-10-16 两次实测定的口径）：
  //   ① 先试「文件名含 slug」——最强证据，唯一可靠；
  //   ② 文件名认不出 slug 时（`日期待核-<slug>.md` 这类历史命名）**才**退回「文件名末尾段 == slug」
  //      的精确等值，不做**正文包含**。
  // 为什么不做正文包含：journal 正文常引用别的 slug（判决、交叉引用），包含式匹配会把 A 场的
  // 纪要当成 B 场的证据——实测 `emergency-x` 的 coo 行被解析到 `role-boundary-diagnosis-2026/journal/coo/…`
  // （完全无关的一份文件），那是**假阳性在场**：比漏报更坏，因为它会静默掩盖真缺口。
  for (const dir of input.dirs ?? []) {
    if (!existsSync(dir)) continue
    let names
    try { names = readdirSync(dir) } catch { continue }
    for (const name of names) {
      const path = join(dir, name)
      let isFile = false
      try { isFile = statSync(path).isFile() } catch { continue }
      if (!isFile) continue
      if (name.includes(input.slug)) return path
      // 历史命名：`<前缀>-<slug>.md` / `日期待核-<slug>.md` ⇒ 剥 `.md` 后按 `-` 分段做**精确尾段**判等
      const base = name.replace(/\.md$/, '')
      if (base === input.slug || base.endsWith(`-${input.slug}`)) return path
    }
  }
  return null
}

/**
 * 台账「参与」列的规范写法（2026-10-16 立；口径唯一家 = 门禁 `checks/gates/ledger-participation.mjs` 注释）。
 *
 * 为什么住这里：**写入点（`converge.mjs` 追加台账行）与守卫（门禁）必须同一把尺**——否则
 * 收敛写进去的行会被自家门禁判红（2026-10-16 实测：真动议收敛后新增一行即触发
 * `ledger-participation` 红，因为写入点照抄 meta 的「参与」原文 `CEO+VP-Eng+VP-Sales+COO+CFO`）。
 * @param raw - meta 的「参与」字段原文（如 `CEO+VP-Eng+VP-Sales+COO+CFO`、`CEO+全职能`）。
 * @returns 规范写法：五角色集合 ⇒ `全员五人`；否则按固定序 `+` 连接；含非角色名 ⇒ `—`。
 */
export function canonicalParticipation(raw) {
  const ROLES = ['CEO', 'VP-Eng', 'VP-Sales', 'COO', 'CFO']
  const value = String(raw ?? '').trim()
  if (value === '') return '—'
  if (value === '全员五人' || value === 'CEO+全职能') return '全员五人'
  const parts = value.replace(/（[^）]*）/g, '').split('+').map(part => part.trim()).filter(Boolean)
  const uniq = [...new Set(parts)]
  if (uniq.length === 0 || uniq.some(role => !ROLES.includes(role))) return '—'
  return uniq.length === ROLES.length ? '全员五人' : uniq.sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b)).join('+')
}

/** CHARTER 是否已有该 slug 的历史纪要**条目**。
 *  锚 = 条目行形「- <YYYY-MM-DD> · <slug>（」——整文件子串查重（includes）会被
 *  引用路径里的 slug 字样误触（BUG-014：COO 的证据路径含 slug → 假跳过、条目漏登）。 */
export function charterHasEntry(charterText, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^\\s*-\\s*\\d{4}-\\d{2}-\\d{2}\\s*·\\s*${esc}（`, 'm').test(charterText)
}

/** CLI 旗标解析（纯函数）——参数唯一源在 converge.mjs 头注（BUG-016：未知旗标曾静默收下）。 */
const KNOWN_FLAGS = ['--slug', '--dry-run', '--charter-backfill', '--resume', '--allow-no-journal', '--allow-open-findings', '--rebuild-index']
export function parseFlags(args) {
  for (const a of args) {
    if (a.startsWith('--') && !KNOWN_FLAGS.includes(a)) {
      throw new Error(`未知旗标 ${a}——认识：--slug <目录名> / --dry-run / --charter-backfill <目录名> / --allow-no-journal / --allow-open-findings / --resume <目录名> / --rebuild-index；无参 = 计划模式`)
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
 * （含 `sources/`）**不进 git**（仓库瘦身，见 archived Note 2026-10-13-workspace-slimming），
 * 而 `git mv <目录>` 遇到未跟踪文件会 fatal（`not under version control`）——目录必须用
 * **文件系统搬**，tracked 面（final/meta 等）再用 `git add -A` 收进索引（删除+新增一起 stage）。
 * @param dirName - deliverables/ 下的目录名（`<日期>-<slug>`）。
 * @returns 相对仓库根的 from/to + git 参数（执行留在驱动脚本；spec 在临时 git 仓里真跑同一份计划）。
 */
export function archiveMovePlan(dirName, wsRel = 'company-workspace') {
  const from = join(wsRel, 'deliverables', dirName).split(sep).join('/')
  const to = join(wsRel, 'deliverables-archive', dirName).split(sep).join('/')
  return { from, to, gitArgs: ['add', '-A', '--', from, to] }
}

/**
 * 收敛/续跑后重建成品索引的**命令形状**（2026-10-20；成品目录卡的「未接 converge」）。
 * 为什么只给形状、不在这里起进程：回归层不许起子进程（layering 守卫），真执行留在
 * `tools/converge.mjs` 驱动层；生成器是单一来源（`tools/deliverables-index.mjs`），
 * 收敛器不重写扫描逻辑。
 * @param {object} input
 * @param {string} input.root - 仓库根。
 * @param {string} [input.execPath] - node 可执行文件（默认当前进程）。
 * @returns {{ command: string, args: string[], cwd: string }} spawnSync 参数。
 */
export function catalogIndexInvocation({ root, execPath = process.execPath }) {
  return { command: execPath, args: [join(root, 'tools', 'deliverables-index.mjs')], cwd: root }
}

/**
 * 收敛就绪判据里的「一句话结论未回填」判定（2026-10-20；事故 = 真结论里**提到**「未回填」
 * 被当成占位，ai-transformation-2026-v2 明明有完整结论却被计划档判「未备」）。
 * 只认**整值就是占位**：空串 / `回填` / `待回填` / 括号包的这两种；正文里的「未回填」是内容。
 * @param {string} value - meta 的一句话结论。
 * @returns {boolean} true = 占位/未回填。
 */
export function isPlaceholderConclusion(value) {
  const trimmed = value.trim()
  if (trimmed === '') return true
  return /^[（(]?\s*(?:待)?回填\s*[）)]?$/.test(trimmed)
}

/**
 * 「可收敛」判据的单一来源（2026-10-23，架构评审候选 1）。
 *
 * 为什么收进来：此前六道闸在 `converge.mjs` 写了三份——计划模式 `scanSlugs` 硬编码一份、
 * `converge()` 内联再查一份、`resume()` 自带第三份部分版本；且放行旗标只有执行路径认，
 * 于是**计划说「未备」而带旗标执行却能收**。判据住这里，计划与执行共用同一函数；
 * 驱动层只负责采集 state、打印、执行。
 *
 * state = **可观察事实**（不是过程）：
 *   - `closed` / `conclusion`：meta 字段原文
 *   - `hasFinal`：活跃目录里有 final.md
 *   - `archived`：归档家已有同名目录
 *   - `journals`：可收割的 live journal（`harvestJournal` 产物）
 *   - `findings`：`{ ok, detail }`；`hasFinal === false` 时可缺席——**不要为此调审计**
 * flags = `parseFlags` 的产物（只认 `allowNoJournal` / `allowOpenFindings` 两个放行面）。
 *
 * @returns `{ ready, reasons, blocking, accepted }`：`reasons` = 全部失败闸（计划模式可逐条展示）；
 *   `blocking` = 未被放行的失败闸（决定 ready）；`accepted` = 被旗标放行的闸码。
 */
export function assess(state, flags = {}) {
  const reasons = []
  if (!/\d{4}-\d{2}-\d{2}/.test(state.closed ?? '')) reasons.push({ code: 'closed-missing', message: 'meta.closed 未回填' })
  if (isPlaceholderConclusion(state.conclusion ?? '')) reasons.push({ code: 'conclusion-missing', message: '一句话结论未回填' })
  if (!state.hasFinal) reasons.push({ code: 'no-final', message: '无 final' })
  if (state.archived) reasons.push({ code: 'already-archived', message: '已存在同名归档' })
  if (journalPresence({ slug: state.slug ?? '', journals: state.journals ?? [] }).missing) {
    reasons.push({ code: 'no-journal', message: '零 journal（收工留痕缺口）——补齐或显式 --allow-no-journal', override: 'allowNoJournal' })
  }
  if (state.hasFinal && state.findings?.ok === false) {
    reasons.push({ code: 'open-findings', message: `有未结审计发现：${state.findings.detail}`, override: 'allowOpenFindings' })
  }
  const blocking = reasons.filter(reason => !(reason.override && flags[reason.override]))
  const accepted = reasons.filter(reason => reason.override && flags[reason.override]).map(reason => reason.code)
  return { ready: blocking.length === 0, reasons, blocking, accepted }
}

/**
 * 收敛动作序列（数据，不是 IO）——`--dry-run` 的清单与执行器消费**同一份**（2026-10-23 第二刀）。
 *
 * 为什么：此前计划清单是 `converge()` 里手写的 actions 数组，执行是另一段顺序代码；
 * 改一处必漂（与上面 assess 收判据同因）。steps 只描述「有序的做什么」，副作用仍在驱动层。
 *
 * 每步 `{ kind, label?, ... }`：`label` 存在 = 会打印进 dry-run 清单；`rewrite-refs` 静默
 * （历史行为：CHARTER/notes 的路径重指不进取景清单），但执行器仍按序消费它。
 * @param {{ dirName: string, evName: string, conclusion: string, journal: Array<{role: string, file: string}> }} state
 * @returns {Array<{kind: string, label?: string, [k: string]: unknown}>}
 */
export function steps(state) {
  const journal = state.journal ?? []
  const move = archiveMovePlan(state.dirName, state.wsRel)
  return [
    { kind: 'evidence-copy', label: `证据副本 → snapshots/archive/${state.evName}/${state.dirName}/（journal ×${journal.length} 留底；交付物本体 git mv 进归档家，不双份拷贝）` },
    { kind: 'rewrite-refs', dirName: state.dirName, evName: state.evName, journal },
    { kind: 'archive-move', label: `git mv deliverables/${state.dirName} → deliverables-archive/${state.dirName}`, ...move },
    ...journal.map(entry => ({ kind: 'clear-journal', label: `git rm kb/${entry.role}/journal/${entry.file}（副本已入证据目录）`, entry })),
    { kind: 'ledger-append', label: `台账追加一行（逐字取 meta：${state.conclusion.slice(0, 40)}…）` },
    { kind: 'rebuild-index', label: '成品索引重建（node tools/deliverables-index.mjs）' },
    { kind: 'backfill-hint', label: `CHARTER 历史纪要补登：node tools/converge.mjs --charter-backfill ${state.dirName}（结论逐字取 meta）` },
  ]
}

/**
 * 归档搬移后的 `git add` 参数（2026-10-20 现场：新建交付物的 final/meta 尚未 tracked，
 * 搬走后 `git add -A -- <旧路径> <新路径>` 因旧路径无任何 tracked 项而 fatal，收敛半途崩）。
 * 旧路径有 tracked 文件 ⇒ 用原计划（同时 stage 删除+新增）；没有 ⇒ 只 stage 归档家。
 * @param {{ from: string, to: string, gitArgs: string[] }} plan - `archiveMovePlan` 结果。
 * @param {boolean} fromTracked - 搬移前 `git ls-files -- <from>` 是否非空。
 * @returns {string[]} git add 参数。
 */
export function archiveGitArgs(plan, fromTracked) {
  return fromTracked ? plan.gitArgs : ['add', '-A', '--', plan.to]
}
