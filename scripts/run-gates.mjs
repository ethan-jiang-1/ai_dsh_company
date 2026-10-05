#!/usr/bin/env node
// 状态：常驻
// 结构门禁（**清单唯一源 = 本文件**；AGENTS.md 与 dev-loop 只留指针，不复述清单——复述必漂）。
// **本行不写类数与项数**：那是易腐常量，实测写"12 类 / 16 项"后加了 3 道门禁就立刻失真
// （D28：枚举型事实的家 = 实现自己）。要全表就跑一次看 PASS 行。
// 纪律：只报告实际跑过的检查（docs/design/architecture.md §6）。阶段 5 前不测行为，只测结构。
// 切分触发线（2026-10-05 立）：>800 行或 >30 个门禁时，切成 verify/gates/*.mjs + 本文件做薄
// runner（「跑一次看 PASS 行即得全表」的性质不因切分而变）。在那之前保持单文件——同构
// 约 20 行/门禁，分区头（── 编号 ──）即目录。
import { readFileSync, existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateMarkdownLinks } from './lib/markdown-links.mjs'
import { inspectScripts, canonicalSnapshotScenes } from './lib/repository-layout.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const ok = (name) => console.log(`  PASS ${name}`)
const fail = (name, detail) => { failures.push(`${name}: ${detail}`); console.log(`  FAIL ${name}: ${detail}`) }

// ── 0. 钉住基线（**唯一事实家**：vendor-pin 与 pin-* 两道门禁都用它）─────────────
// 为什么用 SHA 而不是 tag：tag 可被移动/别名，SHA 才是钉住的合同。
// ⚠ 升 pin 时改这里 + AGENTS.md §vendor 簿记 + package.json 兼容矩阵（pack-compat 会拦）。
const expectedTag = 'dsh-v0.2.0-rc.2'
const expectedSha = '639ed015397290b3745d163aafe02ffee4aa3f84'

// ── 1. Markdown：严格 UTF-8 + 单个结尾换行 ──────────────────────────────────
// 负例留证 2026-09-27：临时 md 无尾换行 → md-newline 红（还原后绿）。
const mdFiles = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'vendor') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.md')) mdFiles.push(p)
  }
}
walk(root)
for (const p of mdFiles) {
  const buf = readFileSync(p)
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    if (!text.endsWith('\n') || text.endsWith('\n\n')) fail('md-newline', `${p} 需以单个换行结尾`)
  } catch { fail('md-utf8', `${p} 不是严格 UTF-8`) }
}
ok(`md-utf8/newline ×${mdFiles.length}`)

// ── 2. 当前源文档的 Markdown 引用：文件 + 标题锚点 + reference definitions ──────
// 负例留证 2026-09-27：公司手册追加死链 → link 红。
// 磁盘发现含未跟踪的新 Note；根部/docs/notes/scripts/pack + 公司手册/章程/org/templates。
// 生成物、vendor 源、dev/snapshots、journal/deliverables、明确归档不作出链检查源。
const links = validateMarkdownLinks(root)
for (const v of links.violations) {
  fail(v.file.startsWith('notes/') ? 'notes-link' : 'link', `${v.file}:${v.line} → ${v.url} (${v.reason})`)
}
if (links.violations.length === 0) ok(`md-links (含 notes) ×${links.linkCount} / ${links.files.length} files`)

// ── 2c. 行数预算（缩编自 vendor `verify-doc-budgets`；防入口链继续膨胀——R6 D23/清单 B #52） ──
// 负例留证 2026-09-27：AGENTS.md 临时超上限 → doc-budget 红。
// 上限 = 立项时值 + 余量；超限先搬（内容挪到该去的家）再压，确需空间才在 Note 里说明后升上限。
// **2026-09-27 起采 DSH 棘轮语义（FAQ 07 入口链）**：瘦身轮后上限随内容下调（≥5% 头寸）、只降不升；
// 上调须在 Note 里论证（三文件曾同时顶格 = 常驻层饱和信号，处置 = 瘦身不是提额）。
// ⚠ 注释里**不要复述当前行数**——那是易腐常量，实测值由每次跑出的 PASS 行给出（2026-09-26 修：
//   原注释写"后 107 行"/"整治后 131"，实为 108 / 142，属"枚举型事实写两处"那一类腐化）。
const DOC_LINE_BUDGETS = [
  ['AGENTS.md', 84],             // 2026-09-23 二次收口；2026-09-27 瘦身轮 108→100、棘轮 115→105；2026-10-06 条目 D 纯路由化（删复述与括号链，纪律指针化；当时 95→72），棘轮 105→84
  ['docs/index.md', 148],        // 2026-09-26 升至 149（D29/D30 行）；2026-09-27 瘦身轮：合同落点段删并、D19+D21 / D23+D24 并行、肥行压一行指针（当时 149→139），棘轮 149→146；2026-10-04 升至 147（文档地图加 testing.md 宪法行，Note 同 diff）；2026-10-05 升至 148（D35 台账行，Note 同 diff）
  ['docs/orient.md', 80],        // 2026-10-06 立（RFC driver-surface-package 条目 C：驾驭者白话五问单页，只导航不复述事实；反证 = 初稿超限红）
  ['docs/guides/dev-loop.md', 395], // 2026-09-26/27 升至 467（§13、inspect 句）后同日瘦身轮：§7 整段迁 guides/bootstrap.md、§7 留指针防断链（当时 467→376），棘轮 467→395
  ['docs/testing.md', 75],       // 2026-10-04 立测试宪法（_digested/test-strategy 消化采纳轮；政策唯一家，只写 now——膨胀先迁，不加预算）；同日 61（§3.8 红/场景先行）；同日 75（§1.1 资产命名语法，用户点破 DSH「后缀即层」实践）
  ['company-workspace/AGENTS.md', 195], // 2026-09-28 借 FAQ 04：公司手册是随每个成员会话注入的最大常驻面（186 行 ≈ 16.4KB × 每会话），同享棘轮（只降不升、上调须 Note 论证）；岗位细节的家 = CHARTER/templates
]
for (const [rel, cap] of DOC_LINE_BUDGETS) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n').length - 1
  lines <= cap
    ? ok(`doc-budget ${rel} (${lines}/${cap})`)
    : fail('doc-budget', `${rel} ${lines} 行超上限 ${cap}（先搬内容到该去的家，再压；不直接加行）`)
}

// ── 2c-bis. 手册注入字节预算（2026-10-02 立，消化对账轮）─────────────────────────
// 为什么：agent-instructions 的 maxBytes 超限时**静默截断**（vendor render.ts：先丢更宽的指令
// 文件、再截最具体的文件；负例 = 本门禁出生现场——preset 钉 16384 落地时手册仅 1.2KB，手册长到
// 17.4KB 后成员会话从「问询节流」中句起整段丢失，「工作纪律」节从未注入；行数栅栏管不到字节，
// 09-28 的 maxBytes 两端核对查了 overlay 层漏了 preset 层）。此门禁把字节对齐钉进执行面。
{
  const handbookBytes = readFileSync(join(root, 'company-workspace/AGENTS.md')).length
  const budgets = readdirSync(join(root, 'packages/company-pack/presets')).flatMap(role =>
    [...readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
      .matchAll(/maxBytes:\s*(\d+)/g)].map(m => Number(m[1])))
  const maxBytes = Math.max(...budgets)
  new Set(budgets).size === 1
    ? ok(`handbook-budget 五 preset maxBytes 一致（${maxBytes}）`)
    : fail('handbook-budget', `五 preset 的 maxBytes 不一致：${budgets.join(', ')}（预算应同值）`)
  const margin = 1024 // render 包装（intro/省略注记）开销余量
  handbookBytes + margin <= maxBytes
    ? ok(`handbook-budget 手册 ${handbookBytes}B + ${margin}B 余量 ≤ maxBytes ${maxBytes}`)
    : fail('handbook-budget', `手册 ${handbookBytes}B + ${margin}B > maxBytes ${maxBytes}——agent-instructions 正在静默截断手册尾部（升 preset maxBytes 或先瘦身手册）`)
}

// ── 2c-ter. intents 行预算门禁——已随 intents.md 退役拆除（2026-10-04，D34，用户令）────
// 为什么拆：该文件是第三本账（内容 100% 派生自 Note 状态行，_backlog 章程反双记账同款病），
// 且违反上游 no-index 教义（vendor notes README："Do not add a centralized INDEX.md"）——两道规矩
// （行预算 + 窗口冻结）都是在给派生索引续命。退役 = 整表冻结进 notes/archived/intents-2026-10.md
// （终档）后删除文件；授权链线索住 Note 状态行。依据 = cleanup-round Note 决定 ④。

// ── 2c-quater. snapshots 体积预算（2026-10-05 立，复跑轮用户拍板「无法承受没完没了的增长」）──
// 为什么：memory-convergence-*（轮末收敛整盘拷贝）是**唯一无界增长源**——每轮一份、两周 7 目录，
// 无预算时增长不可见。回归基线（r1/r2/r4/r5b/scenario-b/foundation）与探针证据按设计常驻本目录，
// 不设单项预算；总预算 + 收敛子预算让增长每次 verify 都可见。超线处置次序：tar.zst 压缩归档 →
// 外置冷存（三保：journal-audit 的 workspace.actual/kb 路径契约、CHARTER 历史纪要指针完整性、
// git remote 备份连续性）。反证 = 预算常量临时调 1 → 本门禁红（2026-10-05 实证）。
// 噪声剔除先例：r2-motion/replay/raw（6.4M）与 sessions/ 逐字节重复（md5 五对全双），已剔除——
// 派生/重复形状不入库；恢复路径 = git 历史。
{
  const walkBytes = dir => readdirSync(dir, { withFileTypes: true })
    .reduce((sum, d) => {
      const p = join(dir, d.name)
      return sum + (d.isDirectory() ? walkBytes(p) : lstatSync(p).size)
    }, 0)
  const SNAPSHOTS_TOTAL_BUDGET_MB = 64
  const SNAPSHOTS_CONVERGENCE_BUDGET_MB = 16
  const snapshotsDir = join(root, 'snapshots')
  const totalBytes = walkBytes(snapshotsDir)
  const convergenceBytes = canonicalSnapshotScenes(root)
    .filter(scene => scene.name.startsWith('memory-convergence-'))
    .reduce((sum, scene) => sum + walkBytes(scene.path), 0)
  const mb = b => (b / 1024 / 1024).toFixed(1) + 'M'
  totalBytes <= SNAPSHOTS_TOTAL_BUDGET_MB * 1024 * 1024
    ? ok(`snapshots-budget 总量 ${mb(totalBytes)}/${SNAPSHOTS_TOTAL_BUDGET_MB}M`)
    : fail('snapshots-budget', `snapshots 总量 ${mb(totalBytes)} > ${SNAPSHOTS_TOTAL_BUDGET_MB}M——压缩归档（tar.zst）或外置冷存（保 journal-audit 路径契约 / CHARTER 指针 / 备份连续性）`)
  convergenceBytes <= SNAPSHOTS_CONVERGENCE_BUDGET_MB * 1024 * 1024
    ? ok(`snapshots-budget memory-convergence ${mb(convergenceBytes)}/${SNAPSHOTS_CONVERGENCE_BUDGET_MB}M`)
    : fail('snapshots-budget', `memory-convergence-* 累计 ${mb(convergenceBytes)} > ${SNAPSHOTS_CONVERGENCE_BUDGET_MB}M——收敛切片是唯一无界源（压旧切片或外置）`)
}

// ── 2d. 裸路径门禁（notebook-hygiene §机械防线，2026-09-25；2026-09-26 扩面）─────────
// 负例留证 2026-09-27：公司手册反引号死路径 → bare-path 红（⚠ 负例要真破坏子串——includes 是子串匹配）。
// 为什么：活指针腐化有复发史（AGENTS 写 `notes/rejected/` 而目录不存在；升 pin 后旧机制引用漂移）。
// md-links 门禁只管 Markdown 链接，管不到反引号里的裸路径。
// **2026-09-26 扩面**（技术债清扫 B 组）：原范围只有导航五文件，而腐化实际长在 docs/design、
// docs/guides、notes/*.md、各 README 里（architecture 引了两条 0.1.7 拆包后已成空壳的 vendor 路径，
// budget-and-ops 引的 workflow-worker-thread 同样成空壳）——门禁边界与叙述边界不重合 = 盲区。
// 同时收窄匹配器，避免扩面后自带假阳性：跳过 `{a,b}` 花括号展开，剥掉 `path:12-34` 的引文行号后缀。
const NOW_FILES = (() => {
  const out = ['AGENTS.md', 'README.md', 'ROADMAP.md', 'company-workspace/AGENTS.md',
    'snapshots/README.md', 'runtime/README.md', 'runtime/harness-home/README.md', 'packages/company-pack/README.md',
    'packages/company-pack/src/README.md'].filter(f => existsSync(join(root, f)))
  const walkMd = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  // `company-workspace/**` 也纳入（2026-09-26 补盲区）：它是**随每个成员会话注入**的事实面，
  // 里面的活指针腐化代价更高；而此前它不在扫描面内——实测本仓刚在那里留下一处死指针
  // （台账指向不存在的快照 README），三条门禁全都没抓到。
  // ⚠ 边界与 `markdown-links.mjs` 一致：**排除 `deliverables(-archive)/` 与 `journal/`**——那是公司
  // *产出物与记忆*（正文里出现 `packages/company-pack/...` 之类是业务叙述，不是仓库指针），
  // 拿仓库指针判据去扫它们必出假阳性（实测扩面第一跑即误报一份 final.md）。
  // `tests/**` 也纳入 pin-currency 的扫描面（2026-09-26 补）：夹具里的 pin 字面量同样会漂，
  // 实测全仓 tests/ 只有一处且等于当前 pin ⇒ 纳入零成本。
  return out.concat(
    walkMd(join(root, 'tests')),
    walkMd(join(root, 'docs')),
    // `notes/**` 分**两档**（2026-09-26 补盲区 + 分档）：
    // · **硬档**（`proposed/` + `_backlog/` 活跃推敲卡）= **活文档**——fresh agent 会照着它去干活，死指针代价高；
    // · **观察档**（`implemented/` `postmortem/`）= **记录当时事实**的档案——里面引的路径**当时是对的**
    //   （实测 36/39 条是 vendor 上游改过名）。**改它就是篡改记录** ⇒ 每次提醒、不判红。
    // 此前只扫 `notes/` 直接子文件（`p.split('/').length === 2`）⇒ `proposed/` 与 `implemented/` 全在面外。
    walkMd(join(root, 'notes/proposed')),
    walkMd(join(root, '_backlog')).filter(p => !p.startsWith('_backlog/_done/')),
    walkMd(join(root, 'company-workspace')).filter(p => !/^company-workspace\/(deliverables|deliverables-archive|kb\/[^/]+\/journal)\//.test(p)),
  )
})()
/** Historical bare receipts are observed; rendered Markdown navigation still uses the hard link gate. */
// 2026-10-05：_backlog/_done 明确冻结且不是任务源（dev-loop §0.5），其历史裸命令不能按活指针改写。
// 不豁免活跃 plans/bugs/reference，也不豁免这些历史文件的 Markdown 导航目标。
/** 观察档：notes implemented/postmortem 与明确冻结的 _backlog/_done；保留当时裸路径并提醒。 */
const WARN_FILES = (() => {
  const walkMd = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  return [...walkMd(join(root, 'notes/implemented')), ...walkMd(join(root, 'notes/postmortem')), ...walkMd(join(root, '_backlog/_done'))]
})()
const TOP_DIRS = ['notes/', 'docs/', 'scripts/', 'packages/', 'snapshots/', 'dev/', 'runtime/', 'tests/', 'company-workspace/', 'vendor/']
const RUNTIME_PREFIXES = ['runtime/harness-home', 'runtime/harness-home-b', 'runtime/rehearsal-workspace', 'runtime/pw-browsers', '.pnpm-store']   // gitignored 运行态（2026-10-06 条目 A：dev/ 拆分，运行残留随迁顶层 runtime/）
// 双树查：本仓根 **或** vendor/dsh 命中即过（AGENTS 纪律表的"权威（vendor 树）"列合法使用 vendor 相对写法）。
// 白名单 = 历史性退役路径的叙述性提及（自带"现迁至…"说明的历史段）。
const RETIRED_PATHS = new Set(['docs/plans/roadmap.md'])
let barePathCount = 0
let barePathBad = false
const barePathWarn = []
/** 扫一批文件的反引号裸路径；hit 回调决定"判红"还是"记观察"。 */
const scanBarePaths = (files, hit) => {
  for (const rel of files) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/`([^`\n]+)`/g)) {
        let raw = m[1].replace(/^\.\//, '').replace(/\/+$/, '')
        if (!TOP_DIRS.some(d => `${raw}/`.startsWith(d))) continue
        if (/[*<>…{}]/.test(raw) || raw.includes(' ')) continue          // 通配/占位/花括号展开/命令行不是路径
        raw = raw.replace(/:\d+(?:-\d+)?$/, '')                          // 引文行号不是路径的一部分
        if (RUNTIME_PREFIXES.some(p => raw.startsWith(p))) continue
        barePathCount++
        if (!existsSync(join(root, raw)) && !existsSync(join(root, 'vendor/dsh', raw)) && !RETIRED_PATHS.has(raw)) {
          hit(`${rel}:${i + 1}`, raw)
        }
      }
    })
  }
}
scanBarePaths(NOW_FILES, (where, raw) => {
  barePathBad = true
  fail('bare-path', `${where} → \`${raw}\` 不存在（双树均无——活指针腐化：改指针到现行家）`)
})
scanBarePaths(WARN_FILES, (where, raw) => { barePathWarn.push(`${where} → \`${raw}\``) })
if (!barePathBad) {
  ok(`bare-path ×${barePathCount}（${NOW_FILES.length} 文件反引号裸路径存在性；另观察档 ${WARN_FILES.length} 文件）`)
  if (barePathWarn.length > 0) {
    console.log(`  观察项 ${barePathWarn.length} 条（观察档 = \`notes/implemented|postmortem/**\` 与 \`_backlog/_done/**\`：`
      + '记录**当时**事实的档案，里面引的路径当时是对的——**改它就是篡改记录**，故只提醒不判红）：')
    for (const w of barePathWarn) console.log(`    ${w}`)
  }
}

// ── 2e. pin 版本一致性门禁（2026-09-26 立，技术债清扫 B2/B3/B4 类）───────────────
// 负例留证 2026-09-27：簿记 SHA 漂一字 → pin-bookkeeping 红；README 现在时行过期 pin 字面量 → pin-currency 红。
// 为什么：升 pin 的消费面只改了一半——代码改对了，叙述机制的老文档留在上一代（dev-loop 头部
// 自称"已在 0.1.5-rc.2 核对"、index 的 `_digested` 行写 0.1.5-rc.2、release.md 的依赖与矩阵示例）。
// 这类"易腐常量多拷贝、无机械单一源"没有守卫，只能靠人交叉核对。
// 规则：**唯一事实家 = 本文件的 expectedTag/expectedSha**（vendor-pin 门禁已用它核对 submodule HEAD）。
//   ① AGENTS.md §vendor 簿记必须逐字声明该 tag 与 SHA（簿记是给 agent 读的那一份，不能漂）；
//   ② 现在时文件里出现的 `dsh-v<x.y.z>` 字面量必须等于 expectedTag，除非该行自带历史/外部标记。
// 收窄理由（避免假阳性）：只认 `dsh-v` 前缀形式——裸 `x.y.z-rc.n` 在本仓多为历史叙述或外部语料；
//   外研树 `_agent_ready_development` 钉的是另一个 tag，登记在 EXTERNAL_PINS（同 RETIRED_PATHS 的显式豁免体例）。
// 结构性排除（不是内容白名单，而是尊重文件自述的性质）：
//   · 原 `notes/intents.md`（时序意图日志）与 `ROADMAP.md` §历史维护记录两个特例，均随各自文件
//     退役移除（D32 / D34）——现在无结构性排除项，集合留空备用。
const EXTERNAL_PINS = new Set(['dsh-v0.1.7-rc.1'])   // 外部研究树语料的 pin，不是本仓 pin
const PIN_HISTORY_MARKERS = /历史|旧|曾|原|当时|已退役|矩阵|compat|legacy/i
const PIN_SKIP_FILES = new Set([])
const agentsText = readFileSync(join(root, 'AGENTS.md'), 'utf8')
const bookkeepingOk = agentsText.includes(`tag \`${expectedTag}\``) && agentsText.includes(`= \`${expectedSha}\``)
bookkeepingOk
  ? ok(`pin-bookkeeping (AGENTS.md §vendor 簿记 = ${expectedTag} @ ${expectedSha.slice(0, 8)})`)
  : fail('pin-bookkeeping', `AGENTS.md §vendor 簿记没有逐字声明 tag \`${expectedTag}\` / SHA \`${expectedSha}\`（簿记是唯一人读事实家）`)
let pinCount = 0
let pinBad = false
for (const rel of NOW_FILES) {
  if (PIN_SKIP_FILES.has(rel)) continue
  readFileSync(join(root, rel), 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/dsh-v\d+\.\d+\.\d+(?:-rc\.\d+)?/g)) {
      if (m[0] === expectedTag || EXTERNAL_PINS.has(m[0])) continue
      if (PIN_HISTORY_MARKERS.test(line)) continue
      pinBad = true
      fail('pin-currency', `${rel}:${i + 1} → \`${m[0]}\` ≠ 当前钉住 ${expectedTag}（现在时文件里的过期 pin：改指针到 AGENTS.md 簿记，或标历史）`)
    }
    pinCount += [...line.matchAll(/dsh-v\d+\.\d+\.\d+(?:-rc\.\d+)?/g)].length
  })
}
if (!pinBad) ok(`pin-currency ×${pinCount}（现在时文件的 dsh-v 字面量 = ${expectedTag}）`)

// ── 2f. 脚本触发条件门禁（2026-09-26 立，技术债 B7/R5 类）───────────────
// 负例留证 2026-09-27：探针头注「何时跑」改形 → script-triggers 红。────────
// 为什么：dev-loop §9.1 被 AGENTS.md 指定为"何时跑"的唯一家，却漏了 6 个已存在脚本，而 AGENTS.md
// 又把它指回 §9.1——成环，fresh agent 查"dag-visual 什么时候跑"两处都查不到。
// 根因是"枚举型事实写在文档里、实现那处更新了"（本仓六份清单同一种病）。
// 解法：**触发条件的家 = 脚本自己**（一处事实一个家，紧挨实现、改脚本时必然看见）；
// 文档只留分层原则与指针；本门禁强制自述存在。
const scriptInspection = inspectScripts(root)
const TRIGGER_FILES = scriptInspection.triggers
const missingTrigger = scriptInspection.missingTriggers
missingTrigger.length === 0
  ? ok(`script-triggers ×${TRIGGER_FILES.length}（每个门禁/探针脚本头注自述「何时跑」）`)
  : fail('script-triggers', `这些脚本头注缺「// 何时跑：」（触发条件的家 = 脚本自己，别写回文档）：${missingTrigger.join(', ')}`)

// ── 2f-bis. 脚本状态头注门禁（2026-10-04 清扫批，用户裁断③：头注加状态字段）────
// 负例留证 2026-10-04：剥掉任一脚本「状态」行 → script-status 红，还原即绿。
// 为什么：scripts/ 混住常驻门禁与已耗一次性仪器，fresh agent 分不清活门禁与用完的探针
// （实测 migration-rehearsal 迁移已执行后头注仍像活触发器、--execute 改真盘）。解法与 2f 同教义：
// 家 = 脚本自己——每个脚本头注自述「状态：常驻」或「状态：已耗（YYYY-MM-DD …原因/复跑条件）」。
const ALL_SCRIPTS = scriptInspection.entries
const statusMissing = scriptInspection.missingStatus
const statusBad = scriptInspection.invalidStatus
statusMissing.length === 0 && statusBad.length === 0
  ? ok(`script-status ×${ALL_SCRIPTS.length}（头注自述「状态：常驻|已耗（日期+原因）」）`)
  : fail('script-status', `脚本状态头注缺失或形非法：缺 = ${statusMissing.join(', ') || '无'}；非法 = ${statusBad.join('；') || '无'}（格式：「// 状态：常驻」或「// 状态：已耗（YYYY-MM-DD …）」）`)

// ── 2g. 手动分发手册版本门禁（2026-09-28 立，精神借 ai_dsh_architect 的 tracked manual）────
// 负例留证 2026-09-28：手改手册表头版本 → dist-manual 红，跑 export-dist 还原 → 绿。
// 为什么：_dist/安装手册.md 是 tracked 生成物（tgz 之外的唯一 tracked 例外），表头版本若与
// pack package.json 漂移 = 手册教人装的版本不是仓库当前版本；升版本忘重导 = 谎报。
// 解法：版本 bump 必须同 diff 重跑 `node scripts/tools/export-dist.mjs`（手册由脚本生成、永不手改）。
{
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const manualPath = join(root, '_dist', '安装手册.md')
  if (!existsSync(manualPath)) {
    fail('dist-manual', '_dist/安装手册.md 缺失——跑 `node scripts/tools/export-dist.mjs` 生成（tracked 生成物，随版本变更同 diff 重导）')
  } else {
    const manual = readFileSync(manualPath, 'utf8')
    const header = manual.split('| 版本 |')[1]?.split('|')[0]?.trim()
    header === packVersion
      ? ok(`dist-manual（安装手册表头版本 = pack package.json ${packVersion}）`)
      : fail('dist-manual', `安装手册表头版本（${header ?? '解析不到'}）≠ pack package.json（${packVersion}）——重跑 \`node scripts/tools/export-dist.mjs\` 再提交，别手改手册`)
  }
}

// ── 2h. 脚本默认端口门禁（2026-09-29 立，fresh-agent 入场摩擦整治）─────────────
// 负例留证 2026-09-29：把 preset-smoke 的 `arg('port', '0')` 改回 `'3099'` → script-port 红；还原 → 绿。
// 为什么：端口是**环境状态不是仓库事实**（multi-human.md §端口不是仓库事实），但 5 个脚本曾把
// `arg('port', '30xx')` 当默认——整治当天实测 3099 正被别的实例占用，跑冒烟要先撞上再手改端口。
// 本仓另有 11 个脚本早就是 `'0'`：规范存在而无人守，文档与实现打架正是新代理的静默翻车点。
// 解法：**自起 web 实例的脚本一律 `--port 0`**（系统分配；真实端口从启动横幅读——这些脚本本就这么取）。
// 它们 spawn 实例、用完即杀，不需要稳定 origin；给人开的观察窗不受本条约束（稳定 origin 有回报）。
{
  const offenders = scriptInspection.fixedPorts
  offenders.length === 0
    ? ok('script-port（脚本默认端口一律 --port 0：端口是环境状态，真实端口从启动横幅读）')
    : fail('script-port', `这些脚本把固定端口当默认（一律改 '0'）：${offenders.join(', ')}`)
}

// ── 3. preset 结构：5 角色 × (声明文件 + ≥1 skill) ─────────────────────────
// 负例留证 2026-09-27：移走一个 SKILL.md → skill-file 红。
// 0.1.7 起显示名/描述/order 内联进 `agent.cordis.yml` 的 `dsh-agent-preset` 行（原 preset.yml 并入），
// 故这里只要求声明文件；挂载验证归 preset-smoke（真 web 逐角色建会话）。
const roles = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
for (const role of roles) {
  const dir = join(root, 'packages/company-pack/presets', role)
  if (!existsSync(join(dir, 'agent.cordis.yml'))) fail('preset-file', `${role}/agent.cordis.yml 缺失`)
  const skillsDir = join(dir, 'skills')
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()) : []
  if (skills.length === 0) { fail('preset-skill', `${role} 无 skills/<name>/SKILL.md`); continue }
  for (const s of skills) {
    const skillMd = join(skillsDir, s.name, 'SKILL.md')
    if (!existsSync(skillMd)) { fail('skill-file', `${role}/${s.name}/SKILL.md 缺失`); continue }
    const body = readFileSync(skillMd, 'utf8')
    if (!body.includes(`name: ${s.name}`)) fail('skill-name', `${role}/${s.name} frontmatter name 不匹配目录名`)
  }
}
ok(`presets ×${roles.length}`)

// ── 4. CLAUDE.md symlink → AGENTS.md ────────────────────────────────────────
// 负例留证 2026-09-27：CLAUDE.md 换成普通文件 → claude-symlink 红。
const claude = join(root, 'CLAUDE.md')
try {
  if (!lstatSync(claude).isSymbolicLink() || readlinkSync(claude) !== 'AGENTS.md') fail('claude-symlink', 'CLAUDE.md 应为指向 AGENTS.md 的 symlink')
  else ok('claude-symlink')
} catch { fail('claude-symlink', 'CLAUDE.md 不存在') }

// ── 5. vendor/dsh：submodule 钉在簿记 SHA，且工作树**一个字节都不许改**（铁律）──────
// 负例留证 2026-09-27：submodule HEAD 移到 HEAD~1 → vendor-pin 红；vendor 内 tracked 文件加一字节 → vendor-clean 红；.gitmodules URL 破坏 → gitmodules 红。
// 铁律的允许面（见 AGENTS.md §vendor 铁律）：**只读** + 在 vendor 内产生 **gitignore 覆盖的
// 构建产物**（lib/、dist/、node_modules/——"从源码跑"要求构建，构建必须在树内）。
// 任何 tracked 文件的改动、或未被 gitignore 的新文件，都判 FAIL。
// 为什么用 SHA 而不是 tag：tag 可被移动/别名，SHA 才是钉住的合同。
// （expectedTag / expectedSha 的唯一事实家 = 本文件 §0；此处不再重复声明。）
const vendorDir = join(root, 'vendor/dsh')
const gm = readFileSync(join(root, '.gitmodules'), 'utf8')
if (!gm.includes('vendor/dsh') || !gm.includes('deepseek-ai/deepseek-harness')) fail('gitmodules', 'URL/路径不符')
else {
  const git = (args) => execFileSync('git', ['-C', vendorDir, ...args], { encoding: 'utf8' }).trim()
  try {
    const sha = git(['rev-parse', 'HEAD'])
    sha === expectedSha
      ? ok(`vendor-pin (${expectedTag} @ ${sha.slice(0, 8)})`)
      : fail('vendor-pin', `HEAD 是 ${sha}，簿记为 ${expectedSha}（${expectedTag}）`)
    const dirty = git(['status', '--porcelain'])
    dirty === ''
      ? ok('vendor-clean (工作树零改动)')
      : fail('vendor-clean', `vendor/dsh 被改动（铁律：只读；改动应走 upstream 升 pin 或本仓覆盖）→ ${dirty.split('\n').slice(0, 5).join(' | ')}`)
  } catch { fail('vendor-pin', 'vendor/dsh 未初始化（git submodule update --init）') }
}

// ── 6. pack 形状：dsh.bundle.patch 指向的文件存在 + 兼容矩阵覆盖钉住的 tag ──────
// 负例留证 2026-09-27：patch 指向不存在文件 → pack-bundle 红；矩阵滤掉当前 tag → pack-compat 红。
const pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
// 0.1.7 起 `dsh.bundle.patch` 可以是字符串或**数组**（registry + 每预设一个 patch 文件）。
const patchRel = pack?.dsh?.bundle?.patch
const patchRels = typeof patchRel === 'string' ? [patchRel] : Array.isArray(patchRel) ? patchRel : []
const badPatch = patchRels.filter(rel => typeof rel !== 'string' || !existsSync(join(root, 'packages/company-pack', rel)))
if (patchRels.length === 0 || badPatch.length > 0) fail('pack-bundle', `dsh.bundle.patch 缺失、为空或未指向真实文件：${JSON.stringify(badPatch)}`)
else ok(`pack-bundle ×${patchRels.length}`)
// 兼容矩阵（R5a 发布欠账，guides/dev-loop §5）：`dsh.compatibility.dshReleases` 必须包含当前
// 钉住的 vendor tag——升 pin 不加矩阵列 = 没验证过就装作验证过。升 pin 走
// scripts/tools/sync-dsh.mjs（它会同步加列），这条门禁保证忘加就红。
const compatReleases = pack?.dsh?.compatibility?.dshReleases
if (!Array.isArray(compatReleases) || !compatReleases.includes(expectedTag)) {
  fail('pack-compat', `dsh.compatibility.dshReleases 必须包含当前钉住的 ${expectedTag}（升 pin 走 scripts/tools/sync-dsh.mjs 并同步加列）`)
} else ok(`pack-compat (${expectedTag} ×${String(compatReleases.length)})`)

// ── 7. preset 行引用的插件必须在 pack 依赖声明里（R5a 起：dependencies ∪ peerDependencies）──
// 负例留证 2026-09-27：行引用未声明依赖的插件 → preset-dep 红。
// DSH 的 verify-cordis-config 同构门禁（AGENTS.md：cordis.yml 的裸插件必须出现在
// 其解析清单的 dependencies）。漏了 → profile 安装后行解析不到 → preset 标记 broken，
// UI 里给不出可用角色（R1 实证：persona / skill-filesystem 缺依赖）。
// R5a 起 runtime 依赖声明从 dependencies 精确钉改 peerDependencies（guides/dev-loop §5：
// pre-stable API 拒绝钉死；profile 模板自带 autoInstallPeers: false，行解析走安装锚
// 兜底）——本门禁按包名归一，两种声明都算"在列"。
const packDeps = new Set([...Object.keys(pack?.dependencies ?? {}), ...Object.keys(pack?.peerDependencies ?? {})])
const rowPlugins = new Set()
for (const role of roles) {
  const text = readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
  for (const m of text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)) {
    // 行名可带 subpath（如 `@deepseek-ai/dsh-tool-subagent-control/list-agents`，shipped
    // standard preset 就这么写）；依赖存在性按**包名** `@scope/name` 归一（R3 实证：
    // 不归一 → 把合法的 subpath 行误判成缺依赖）。
    const spec = m[1]
    const pkg = /^(@[^/]+\/[^/]+)/.exec(spec)?.[1] ?? spec
    rowPlugins.add(spec)
    if (!packDeps.has(pkg)) fail('preset-dep', `${role} 的行引用 ${spec}，但 pack 依赖声明（dependencies ∪ peerDependencies）里没有 ${pkg}（安装后解析不到 → preset broken）`)
  }
}
ok(`preset-row-deps ×${rowPlugins.size}`)

// ── 8. client 两半声明一致（DSH verify-cordis-config 的 validateClientHalvesDeclared 同构）──
// 负例留证 2026-09-27：删 dsh.client 声明（导出仍在）→ client-half 红。
// 规则：导出 "./client" ⟺ 声明 dsh.client。不一致时该包"组合得上、激活得了、什么都不贡献"，
// 且**任何地方都不报错**。⚠ 宿主那条门禁只扫 `packages/client/*/package.json`，**覆盖不到本仓
// 的 client 面**（R1 实证：这条缺口让一个 client 插件静默挂不上，UI 里什么都没有）。
const ownPackages = readdirSync(join(root, 'packages'), { withFileTypes: true })
  .filter(e => e.isDirectory() && existsSync(join(root, 'packages', e.name, 'package.json')))
const clientHalves = []
for (const entry of ownPackages) {
  const dir = join(root, 'packages', entry.name)
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const shipsClient = manifest.exports !== undefined && Object.hasOwn(manifest.exports, './client')
  const declaresClient = manifest.dsh?.client !== undefined
  if (shipsClient !== declaresClient) {
    fail('client-half', shipsClient
      ? `${manifest.name} 导出 "./client" 但没声明 dsh.client → 浏览器半永远不会被伺服`
      : `${manifest.name} 声明 dsh.client 但没导出 "./client" → 组合得上却什么都不贡献，且不报错`)
    continue
  }
  if (!declaresClient) continue
  clientHalves.push(manifest.name)
  // 产物面：只在构建过（lib/ 存在）时检查——lib/ 是 gitignore 的产物，未构建时由
  // preset-smoke 的"真 profile + 浏览器模块表"断言兜底（guides/bootstrap）。
  const clientRel = manifest.exports['./client']
  const clientPath = typeof clientRel === 'string' ? clientRel : clientRel?.default
  if (existsSync(join(dir, 'lib')) && typeof clientPath === 'string' && !existsSync(join(dir, clientPath))) {
    fail('client-half', `${manifest.name} 的 "./client" 指向 ${clientPath}，但产物不存在（重新构建？guides/bootstrap）`)
  }
}
ok(`client-halves ×${clientHalves.length}`)

// ── 9. 提案纪律：notes/proposed/ 只收已批 RFC，且该毕业的必须毕业 ─────────────
// 负例留证 2026-09-27：无归宿提案 → proposal-scheduled 红；「已交付」状态滞留 proposed → proposal-graduated 红。
// 2026-09-28 D32 重构（队列层退役）：原判据「提案必须在 ROADMAP 出现」的防病机理 = 防"登记了但没人做"。
// 队列没了，病根不变 ⇒ 判据换成等价物：**每份 RFC 状态行必须带「批准」标记**（用户令 / Plan Mode 通过 +
// 日期）——没批准的思考属于 _backlog/plans/ 推敲卡，不配住 proposed/；
//   ① proposal-scheduled：状态行（逻辑行，含缩进续行）带「批准」；
//   ② proposal-graduated（不变）：已消化的不许赖在 proposed/——毕业 ≠ 全部实现，而是"每一条都有归宿"。
//   ③ proposal-scheduled 扩展（2026-10-05 TDD 环立，用户令「一定 TDD 手段、全程证据、不随性发挥」）：
//      RFC 必须带「## 验收」节——「怎么测」先行的载体；红绿环序列合同 = notes/proposed/README 生命周期段。
//      负例留证：无验收节的 fixture RFC → red → 还原 → green（三步 = implemented/2026-10-05-rfc-tdd-loop.md）。
// ⚠ 门禁只保证"被批准 + 该毕业的毕业"，不保证"会实现"——实施由用户指令逐条进入。
const proposedDir = join(root, 'notes/proposed')
// README.md 是文件夹说明书（curated entry point，非提案）——DSH 同款：notes 层的 README 不在提案命名空间
const proposals = existsSync(proposedDir)
  ? readdirSync(proposedDir).filter(n => n.endsWith('.md') && n !== 'README.md')
  : []
const unapproved = proposals.filter(name => {
  const head = readFileSync(join(proposedDir, name), 'utf8').split('\n').slice(0, 12).join('\n')
  return !(head.includes('批准：') || head.includes('批准:'))
})
const noAcceptance = proposals.filter(name =>
  !/^##\s*验收/m.test(readFileSync(join(proposedDir, name), 'utf8')))
const scheduledProblems = [
  ...unapproved.map(name => `${name} 缺「批准：」标记（未批准的思考住 _backlog/plans/ 推敲卡）`),
  ...noAcceptance.map(name => `${name} 缺「## 验收」节（验收 = RFC 三件之一，「怎么测」先行的载体——见 notes/proposed/README 生命周期段）`),
]
scheduledProblems.length === 0
  ? ok(`proposal-scheduled ×${proposals.length}（批准标记 + 验收节）`)
  : fail('proposal-scheduled', `这些 RFC 不合规：${scheduledProblems.join('；')}`)

/** 终态字：提案的状态行里出现这些，说明它已经被消化，该毕业了。 */
const DIGESTED_MARKERS = ['已消化', '已交付', '部分交付']
/**
 * 取提案的「状态：」**逻辑行**——含其后的缩进续行（到空行为止）。
 * 为什么不能只读第一个物理行（2026-09-26 修盲区）：状态行常写成两行（首行给去向、续行给
 * "执行待批准"之类的补充），只读首行时，把「已消化」落在续行就能**逃过毕业门禁**。
 * 现行 RFC 的 `状态：` 就是跨两行写的——这不是假想风险。
 */
const statusBlockOf = (text) => {
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.startsWith('状态：'))
  if (start === -1) return ''
  const block = [lines[start]]
  for (let i = start + 1; i < lines.length && lines[i].trim() !== ''; i++) block.push(lines[i])
  return block.join('\n')
}
const notGraduated = proposals.filter(name =>
  DIGESTED_MARKERS.some(marker => statusBlockOf(readFileSync(join(proposedDir, name), 'utf8')).includes(marker)))
notGraduated.length === 0
  ? ok('proposal-graduated (proposed/ 里只剩未落地的)')
  : fail('proposal-graduated', `这些提案已消化却仍在 notes/proposed/（搬到 notes/implemented/ 并写明条目去向）：${notGraduated.join(', ')}`)

// ── 9-bis. Note 活状态门禁（notes-liveness，2026-10-05 D35 立；notes/ 分类 owner = notes/README.md）──
// implemented/ 新写 Note（文件名日期 ≥ 生效日）前 6 行须有「状态：」行且以生命周期词开头
// （implemented/已交付/已消化——词表唯一家 = notes/README §一）；存量按生效日祖父豁免
// （存量不回扫 = 状态行规矩的既有口径，2026-09-24）。
// 负例留证（2026-10-05 实跑，红→还原→绿三步）：fixture A 无状态行 / fixture B 状态词错位
// （proposed 开头）双红 → 删 fixture 还原 → green；收据 = implemented/2026-10-05-notes-taxonomy-owner.md。
{
  const NOTES_EFFECTIVE_DATE = '2026-10-05'
  const implDir = join(root, 'notes/implemented')
  const implNotes = existsSync(implDir)
    ? readdirSync(implDir).filter(n => n.endsWith('.md'))
    : []
  const freshNotes = implNotes.filter(n => {
    const m = /^(\d{4}-\d{2}-\d{2})-/.exec(n)
    return m !== null && m[1] >= NOTES_EFFECTIVE_DATE
  })
  const LIFECYCLE_WORD = /^状态：\s*\**\s*(implemented|已交付|已消化)/m
  const badNotes = freshNotes.filter(name =>
    !LIFECYCLE_WORD.test(readFileSync(join(implDir, name), 'utf8').split('\n').slice(0, 6).join('\n')))
  badNotes.length === 0
    ? ok(`notes-liveness ×${freshNotes.length}（implemented/ 新写 Note 状态行；生效日前存量豁免）`)
    : fail('notes-liveness', `这些 implemented/ Note 前 6 行缺合规「状态：」行（须以 implemented/已交付/已消化 开头——词表与规则 = notes/README）：${badNotes.join(', ')}`)
}

// ── _backlog 活状态 + 索引交叉核对门禁（backlog-liveness；原 plans-liveness，2026-10-03 D33 章制回借升格）──
// 复发依据：① 状态行侧 = D30 起因（未完结思考稿缺户口挂着不动；负例留证 2026-09-27 research 稿 /
//   2026-09-28 plans 卡复测）；② 索引侧 = D33 轮实测活违规两处——两张已毕业卡不在 _done/README
//   索引、两张活跃卡不在 plans/README 活跃列表：「位置即状态」只护文件搬迁没护索引同步，
//   FAQ 15 升格判据成立（负例 = 本轮红→还原→绿，见 D33 Note）。
// 规则（D33 章程 _backlog/README.md）：① 制度目录在场；② 活跃卡状态行——plans 卡前 12 行含
//   「状态：」且含「毕业」，bugs 卡含「状态：」；③ 索引交叉核对——每张卡/材料文件必须被
//   plans|bugs|reference|_done 四份 README 之一点名（反向——索引行指向不存在的文件——由
//   md-links 硬档扫描覆盖，此处不重复）。
{
  const bl = '_backlog'
  const dirs = [`${bl}/plans`, `${bl}/bugs`, `${bl}/reference`,
    `${bl}/_done/_closed_plans`, `${bl}/_done/_suspended_plans`, `${bl}/_done/_fixed_bugs`,
    `${bl}/_done/_suspended_bugs`, `${bl}/_done/_reference`, `${bl}/_done/_misc`]
  const listMd = d => existsSync(join(root, d))
    ? readdirSync(join(root, d)).filter(n => n.endsWith('.md') && n !== 'README.md')
    : []
  const missingDirs = dirs.filter(d => !existsSync(join(root, d)))
  missingDirs.length === 0
    ? ok(`backlog-liveness 制度目录 ×${dirs.length}`)
    : fail('backlog-liveness', `制度目录缺失（章程的目录形状，别删）：${missingDirs.join(', ')}`)

  const badPlans = listMd(`${bl}/plans`).filter(name => {
    const head = readFileSync(join(root, `${bl}/plans`, name), 'utf8').split('\n').slice(0, 12).join('\n')
    return !(head.includes('状态：') && head.includes('毕业'))
  })
  const badBugs = listMd(`${bl}/bugs`).filter(name =>
    !readFileSync(join(root, `${bl}/bugs`, name), 'utf8').split('\n').slice(0, 12).join('\n').includes('状态：'))
  const livenessBad = [...badPlans.map(n => `${bl}/plans/${n}（缺状态行/毕业门判断）`),
    ...badBugs.map(n => `${bl}/bugs/${n}（缺状态行）`)]
  livenessBad.length === 0
    ? ok(`backlog-liveness 状态行 ×${listMd(`${bl}/plans`).length + listMd(`${bl}/bugs`).length}（每张活跃卡自带户口）`)
    : fail('backlog-liveness', `这些活跃卡缺活状态行——按 _backlog/README.md 毕业四门处置，别挂着：${livenessBad.join(', ')}`)

  const indexHaystack = [`${bl}/plans/README.md`, `${bl}/bugs/README.md`,
    `${bl}/reference/README.md`, `${bl}/_done/README.md`]
    .map(p => readFileSync(join(root, p), 'utf8')).join('\n')
  const unindexed = dirs.flatMap(d => listMd(d).map(name => `${d}/${name}`))
    .filter(rel => !indexHaystack.includes(rel.split('/').pop()))
  unindexed.length === 0
    ? ok('backlog-liveness 索引交叉核对（每张卡/材料件都被索引点名）')
    : fail('backlog-liveness', `这些卡/材料件没被任何索引点名（位置即状态必须连索引同步）：${unindexed.join(', ')}`)
}

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
