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
import { basename, dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { markdownLinkTargets, validateMarkdownLinks } from '../tools/lib/markdown-links.mjs'
import { inspectScripts, canonicalSnapshotScenes } from '../tools/lib/repository-layout.mjs'
// Reuse a declared parser from the pinned vendor; member fallback covers root-workspace CI installs.
const loadYaml = (() => {
  for (const base of ['../vendor/dsh/package.json', '../vendor/dsh/packages/preset/agent-preset/package.json']) {
    try {
      const yaml = createRequire(new URL(base, import.meta.url))('js-yaml')
      return text => yaml.load(text, { schema: yaml.CORE_SCHEMA })
    } catch { /* next declared owner */ }
  }
  throw new Error('js-yaml 缺失：先按 bootstrap 安装 workspace 依赖')
})()

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
// 磁盘发现含未跟踪的新 Note；根部/docs/notes/checks/pack + 公司手册/章程/org/templates。
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
  ['docs/index.md', 143],        // 2026-09-26 升至 149（D29/D30 行）；2026-09-27 瘦身轮：合同落点段删并、D19+D21 / D23+D24 并行、肥行压一行指针（当时 149→139），棘轮 149→146；2026-10-04 升至 147（文档地图加 testing.md 宪法行，Note 同 diff）；2026-10-05 升至 148（D35 台账行，Note 同 diff）；2026-10-09 D36 台账降级纯路由表（33 行 8.8KB → 34 行一句话，最长行 644→≤100）+ N1 分层规矩迁 docs/AGENTS.md（原 §文档组织原则 表 + 生命周期列搬出，本文件只留现状登记），棘轮 148→143（当时 141，留 ≥5% 头寸）；2026-10-09 N4 加 D37–D40 四行台账（+4），**同 diff 压回 143 顶格**——压掉的都是已被 docs/AGENTS.md 或下表接管的复述（导航句、§文档路由 前言、外部研究段三行折两行）。⚠ **结构张力已到顶**：台账每加一个 D 号就要腾一行，而 D1–D9 的「家」仍指向 design/（N1 章程说落地决定该归 Note，迁移是独立一轮）。下一轮再加 D 号前，先做 D1–D9 的家迁移（腾 9 行），不提额
  ['docs/orient.md', 80],        // 2026-10-06 立（RFC driver-surface-package 条目 C：驾驭者白话五问单页，只导航不复述事实；反证 = 初稿超限红）
  ['docs/guides/dev-loop.md', 395], // 2026-09-26/27 升至 467（§13、inspect 句）后同日瘦身轮：§7 整段迁 guides/bootstrap.md、§7 留指针防断链（当时 467→376），棘轮 467→395
  ['docs/testing.md', 75],       // 2026-10-04 立测试宪法（_digested/test-strategy 消化采纳轮；政策唯一家，只写 now——膨胀先迁，不加预算）；同日 61（§3.8 红/场景先行）；同日 75（§1.1 资产命名语法，用户点破 DSH「后缀即层」实践）；2026-10-09 §3.7 prove-it-red 补「标题带 BUG-nnn 的 describe/it = 守卫声明」判据句（guard-red-record 门禁接上；原句只写「三步留证」没给可判形状），**同 diff 压回 75 顶格**（引用链改「见该 Note」，不重复路径）。⚠ 顶格：下一句加进来前先迁——§1 分层表与 tests/README「改动面→最窄检查」有重叠面可搬
  ['docs/AGENTS.md', 62],        // 2026-10-09 N1 立（docs/ 分层规矩唯一家：一处事实一个家表 + 长度棘轮 + 更新时机 + 负知识；行数上限唯一源在 run-gates 不复述数字）；反证 = doc-taxonomy 门禁（表头/不属于这层 列缺失即红）
  ['company-workspace/AGENTS.md', 195], // 2026-09-28 借 FAQ 04：公司手册是随每个成员会话注入的最大常驻面（186 行 ≈ 16.4KB × 每会话），同享棘轮（只降不升、上调须 Note 论证）；岗位细节的家 = CHARTER/templates
]
for (const [rel, cap] of DOC_LINE_BUDGETS) {
  // 文件缺失时报「缺失」而不是抛异常：抛异常会**中断整个 run-gates**，
  // 后面所有门禁一行都不出（2026-10-09 红证：删 docs/AGENTS.md 时 doc-taxonomy 的失败菜单没机会打印）。
  if (!existsSync(join(root, rel))) {
    fail('doc-budget', `${rel} 不在盘上——受预算管的常驻文档不许消失（内容该搬去哪就搬，文件本身留着）`)
    continue
  }
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

// ── 2c-bis. 决策台账路由门禁（ledger-routing，2026-10-09 D36 立）────────────────
// 为什么：docs/index.md 的 D 台账曾是**第三本账**——D34 以「内容 100% 派生自 Note 状态行 +
// 胖行病史 + 违反上游 no-index 教义」退役 intents.md，而台账是同一个病的主犯（实测 33 行 8.8KB，
// 最长行 644 字符，D1–D17 共 16 行**没有任何可解析的家**——决定的唯一住处就是那张表）。
// 处置与 D34 同款：降级为**纯路由表**（D 号 → 一句话 → 链接），决定正文归各自 Note。
// 本门禁挡住回潮——没有它，「一句话」会再次长回段落。
// 负例留证（实跑，红→还原→绿）：① 任一行「一句话」超过 100 字符 → 红；② 任一行「家」格无
// 可解析链接/路径 → 红；③ 删表头行 → 红；④ 把某行加成四列 → 红。四例均还原即绿。
// ⚠ 形状守卫必须锚定表头：首版只查「行数 ≥ 20」是**假守卫**——数据行的正则与表头无关，删掉表头
//   照样 34 行全解析、门禁全绿。红 C 实证该漏洞后改为「表头在场 + 表头下面才是数据行 + 恰三列」。
{
  const LEDGER_CELL_MAX = 100
  const LEDGER_MIN_ROWS = 20
  const LEDGER_HEADER = /^\|\s*#\s*\|\s*一句话\s*\|\s*决定的家\s*\|\s*$/
  const LEDGER_SEPARATOR = /^\|(?:\s*-{3,}\s*\|){3}\s*$/
  const dataRow = /^\|\s*(D\d+(?:\+D\d+)?)\s*\|(.*)\|\s*$/
  const indexLines = readFileSync(join(root, 'docs/index.md'), 'utf8').split('\n')
  const headerAt = indexLines.findIndex(line => LEDGER_HEADER.test(line))
  const problems = []
  if (headerAt === -1) {
    problems.push('找不到台账表头「| # | 一句话 | 决定的家 |」——表头是本门禁的形状锚，删了它下面的行就不再是台账')
  } else if (!LEDGER_SEPARATOR.test(indexLines[headerAt + 1] ?? '')) {
    problems.push(`台账表头下一行不是三列分隔行（第 ${headerAt + 2} 行）`)
  }
  // 数据行只从表头之后算起，防止别处的 | D 号 | 形式的表格蹭进来。
  const rows = headerAt === -1 ? [] : indexLines
    .slice(headerAt + 1)
    .map((line, i) => ({ line, no: headerAt + 2 + i }))
    .filter(({ line }) => dataRow.test(line))
  const tooLong = []
  const malformed = []
  const noHome = []
  for (const { line, no } of rows) {
    const cells = line.split('|').map(c => c.trim())
    // cells[0]/[cells.length-1] 为空段（来自行首尾的 |）⇒ 合法列数 = 5 段
    if (cells.length !== 5) {
      malformed.push(`第 ${no} 行（${cells.length - 2} 列）`)
      continue
    }
    const summary = cells[2]
    const home = cells[3]
    if (summary.length > LEDGER_CELL_MAX) tooLong.push(`第 ${no} 行（${summary.length} 字符）`)
    const targets = [...home.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]).filter(p => !p.startsWith('http'))
    const resolvable = targets.some(p => existsSync(join(root, 'docs', p)) || existsSync(join(root, p)))
    if (targets.length === 0 || !resolvable) noHome.push(`第 ${no} 行`)
  }
  if (headerAt !== -1 && rows.length < LEDGER_MIN_ROWS) {
    problems.push(`表头之下只解析到 ${rows.length} 行（< ${LEDGER_MIN_ROWS}）——台账被削或行形状被改坏`)
  }
  problems.push(
    ...(malformed.length ? [`行必须是三列（# / 一句话 / 决定的家）：${malformed.join('、')}`] : []),
    ...(tooLong.length ? [`「一句话」超 ${LEDGER_CELL_MAX} 字符（决定正文归 Note，本表只路由）：${tooLong.join('、')}`] : []),
    ...(noHome.length ? [`「家」格无可解析链接（决定的唯一住处不许是本表）：${noHome.join('、')}`] : []),
  )
  problems.length === 0
    ? ok(`ledger-routing ×${rows.length}（表头锚在场，每行三列、一句话 ≤${LEDGER_CELL_MAX} 字符、家可解析）`)
    : fail('ledger-routing', problems.join('；'))
}

// ── 2c-bis-2. 文档层规范门禁（doc-taxonomy，2026-10-09 N1 立）─────────────────────
// 为什么：docs/ 有地图（index.md）但**没有分层规矩的家**——「哪层放什么」写在 index §文档组织原则里
// （表只有「性质」列，没有「不属于这层」列），而 DSH docs/AGENTS.md 的 tier 表**必须有一列说反例**
// （"Does NOT belong there"）：只写正向职责，边界就靠读的人自己猜，实测后果 = docs/design/ 长出
// 「动工前的设计决策记录」（已落地决定的叙述留在设计层，正是 tier 表说该归 Note 的那一格）。
// 本门禁守两件事：① docs/AGENTS.md 在场且带「不属于这层」列（分层的**反例半边**不许丢）；
// ② docs/ 下每个 .md 都在 index §现有文档 登记（实测漏登 2 份：cdp-probe / runtime-map）。
// 负例留证（实跑，红→还原→绿）：① 删 docs/AGENTS.md → 红；② 删「不属于这层」表头 → 红；
// ③ 新建一个未登记的 docs/*.md → 红（点名该文件）→ 还原 → 绿。
{
  const taxonomyPath = join(root, 'docs/AGENTS.md')
  const docTaxProblems = []
  if (!existsSync(taxonomyPath)) {
    docTaxProblems.push('docs/AGENTS.md 缺失——docs/ 分层规矩没有家（规矩会散回 index 与各文件的散文里）')
  } else {
    const taxonomy = readFileSync(taxonomyPath, 'utf8')
    if (!taxonomy.includes('不属于这层')) {
      docTaxProblems.push('docs/AGENTS.md 的 tier 表缺「不属于这层」列——只写正向职责则边界靠猜（DSH tier 表的反例半边）')
    }
  }
  const indexForDocs = readFileSync(join(root, 'docs/index.md'), 'utf8')
  const allDocsMd = []
  const walkDocs = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = join(dir, entry.name)
      const relNext = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walkDocs(next, relNext)
      else if (entry.name.endsWith('.md')) allDocsMd.push(relNext)
    }
  }
  walkDocs(join(root, 'docs'), '')
  const unregistered = allDocsMd
    .filter(rel => rel !== 'index.md')
    .filter(rel => !indexForDocs.includes(`./${rel}`) && !indexForDocs.includes(`](${rel})`))
    .sort()
  if (unregistered.length) {
    docTaxProblems.push(`这些 docs/ 文件未在 index.md §现有文档 登记（登记是路由，一件一行）：${unregistered.join('、')}`)
  }
  docTaxProblems.length === 0
    ? ok(`doc-taxonomy（分层规矩在场 + ${allDocsMd.length} 份 docs 全登记）`)
    : fail('doc-taxonomy', docTaxProblems.join('；'))
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
// 负例留证 2026-10-09（N5 生效日分档）：`notes/implemented/2099-01-01-x.md` 内写死路径 → 红（见 N5 Note 验证表）。
// **N5 事实落点时效（currency）生效日**：文件名日期 ≥ 此日的 implemented/ Note 进入硬档——里面的
// 仓库裸路径必须指到现行家（DSH `.agents/notes/implemented/AGENTS.md`："Keep paths, symbols, defaults,
// and mechanisms current in the same change that alters them"）。此日之前的存量祖父豁免（历史负债，
// 清理是独立一轮）。选 2026-10-09 = 本政策落地日，此后新写/改动的 Note 一律受约束。
const NOTES_CURRENCY_EFFECTIVE_DATE = '2026-10-09'
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
  const walkMd = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
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
    // `notes/**` 分**两档**（2026-09-26 补盲区 + 分档；2026-10-09 N5 **重新划线**）：
    // · **硬档**（`proposed/` + `implemented/` + `_backlog/` 活跃推敲卡）= **活文档**——fresh agent 会照着它去干活；
    // · **观察档**（`postmortem/` + 明确冻结的 `_backlog/_archive/`）= **记录当时事实**的档案，只提醒不判红。
    //
    // ⚠ 2026-10-09 把 `implemented/` 从观察档移入硬档（N5 修复）。原注释说「改它就是篡改记录」，**这句是错的**：
    //   vendor `.agents/notes/implemented/AGENTS.md` 明文区分两件事——
    //     "Keep paths, symbols, defaults, and mechanisms current in the same change that alters them.
    //      Rewrite stale facts in place; do not append change history." +
    //     "**This is not a license to rewrite the *decision*** … A reversal of the decision or its rationale
    //      requires a new Agent Note and cross-link."
    //   即：**决定的正文不动**（改了要新 Note + 交叉链接），**事实的落点（路径/符号/默认值）要就地改新**。
    //   我们此前把这两件事一起冻住，等于把"当时的路径"当成了决定的一部分。
    // 实测代价（2026-10-09，同一把尺子）：本仓 574 处仓库裸路径提及里 **122 处（21.3%）盘上不存在**，
    //   52/135 个文件（38.5%）至少含一处死指针；vendor 自己的 implemented 树是 9/247（3.6%）与 7/527（1.3%）。
    //   **6 倍差距不是"历史必然"，是这条政策造出来的**——死了 6 倍，说明它一直在批量生产误导。
    // 反面证据（那条"36/39 是 vendor 上游改名"的观察）：只对**vendor 内部**路径成立。本仓自己的树
    //   （`notes/research`→退役、`snapshots/r2-motion`→重定位、`tests/*.spec.ts`→改名）是**本仓改名**造成的，
    //   改指针到现行家成本极低，没有任何"篡改记录"问题。指向 vendor 的路径若上游已删，写清"上游 X 版已删"
    //   或引向现行家即可，同样不是篡改——**篡改是把当时的结论改成另一套，不是把门牌号改成新的**。
    // 例外（仍是观察档）：`postmortem/` = 事故故事，DSH 语料明说它是**唯一**该有 war-story narrative 的层；
    //   `_backlog/_archive/` = 明确冻结且不是任务源（dev-loop §0.5）。
    // 此前只扫 `notes/` 直接子文件（`p.split('/').length === 2`）⇒ `proposed/` 与 `implemented/` 全在面外。
    walkMd(join(root, 'notes/proposed')),
    // ⚠ `notes/implemented/` 分**生效日两档**（2026-10-09 N5）——不能整棵拉进硬档：
    //   DSH 规矩是**前瞻性**的（"in the same change that alters them"），只管**改动发生的那一刻起**。
    //   生效日之前的存量是历史负债，一次性全判红会逼出一场 122 处的大清理，而不是建立一条会自己维持的规矩。
    //   （与 notes-liveness 同款口径：存量祖父豁免、新写从严。存量清理是独立一轮的事，见 N5 Note「未做」。）
    ...walkMd(join(root, 'notes/implemented')).filter(p => {
      const m = /\/(\d{4}-\d{2}-\d{2})-/.exec(p)
      return m !== null && m[1] >= NOTES_CURRENCY_EFFECTIVE_DATE
    }),
    walkMd(join(root, '_backlog')).filter(p => !p.startsWith('_backlog/_archive/')),
    walkMd(join(root, 'company-workspace')).filter(p => !/^company-workspace\/(deliverables|deliverables-archive|kb\/[^/]+\/journal)\//.test(p)),
  )
})()
/** Historical bare receipts are observed; rendered Markdown navigation still uses the hard link gate. */
// 2026-10-05：_backlog/_archive 明确冻结且不是任务源（dev-loop §0.5），其历史裸命令不能按活指针改写。
// 不豁免活跃 issues/bugs/research/methods，也不豁免这些历史文件的 Markdown 导航目标。
/** 观察档 = 事故故事与冻结归档：`notes/postmortem/`（DSH 语料：唯一该有 war-story narrative 的层）+
 *  明确冻结的 `_backlog/_archive/`；保留当时裸路径并提醒。
 *  ⚠ 2026-10-09 起 **`notes/implemented/` 不在此列**（N5）：它受「随改动就地更新事实落点」约束，见上方硬档注释。 */
const WARN_FILES = (() => {
  const walkMd = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  return [...walkMd(join(root, 'notes/postmortem')), ...walkMd(join(root, '_backlog/_archive'))]
})()
const TOP_DIRS = ['notes/', 'docs/', 'checks/', 'probes/', 'tools/', 'packages/', 'snapshots/', 'run/', 'runtime/', 'tests/', 'company-workspace/', 'vendor/']
const RUNTIME_PREFIXES = ['runtime/harness-home', 'runtime/harness-home-b', 'runtime/rehearsal-workspace', 'runtime/pw-browsers', '.pnpm-store']   // gitignored 运行态（2026-10-06 条目 A：dev/ 拆分，运行残留随迁顶层 runtime/）
// 双树查：本仓根 **或** vendor/dsh 命中即过（AGENTS 纪律表的"权威（vendor 树）"列合法使用 vendor 相对写法）。
// 白名单 = 历史性退役路径的叙述性提及（自带"现迁至…"说明的历史段）。
const RETIRED_PATHS = new Set(['docs/plans/roadmap.md'])
// 负例自重（2026-10-09 N5 立）：**故意写出来给人复现的假路径**，与「腐化指针」形状完全相同，静态扫描
// 分不开（实测：N5 生效后头两条命中就是我自己 Note 里描述负例用的 `docs/zz-tmp-unregistered.md`）。
// 约定 = 假路径里带 `zz-`/`zzz-`（本仓从未有过以 zz 开头的真实路径；见命名自带"这是测试值"的语义）。
// 为什么要放行而不能改措辞绕开：负例必须**逐字可复现**——把路径写成 `docs/zz‑tmp…`（换字符）或
// 「某个不存在的 docs 文件」就复现不了了。天真的做法是让作者改文风，正确做法是给假路径一个可判别的记号。
const FIXTURE_PATH = /(^|\/)zz+-/
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
        if (FIXTURE_PATH.test(raw)) continue                             // 负例假路径（见上）
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
    console.log(`  观察项 ${barePathWarn.length} 条（观察档 = \`notes/postmortem/**\` 与 \`_backlog/_archive/**\`：`
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
//   外研语料 `_dsh_plugin_agent_ready_development`（更名前 `_agent_ready_development`）现钉 rc.2 = 本仓
//   pin 无需豁免；EXTERNAL_PINS 只兜旧名时代 0.1.7-rc.1 的历史提及（同 RETIRED_PATHS 的显式豁免体例）。
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
// 为什么：形态名 scripts/ 曾混住验证/调试/工具三用途（2026-10-07 S2 升顶层拆分），fresh agent 分不清活门禁与用完的探针
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
// 解法：版本 bump 必须同 diff 重跑 `node tools/export-dist.mjs`（手册由脚本生成、永不手改）。
{
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const manualPath = join(root, '_dist', '安装手册.md')
  if (!existsSync(manualPath)) {
    fail('dist-manual', '_dist/安装手册.md 缺失——跑 `node tools/export-dist.mjs` 生成（tracked 生成物，随版本变更同 diff 重导）')
  } else {
    const manual = readFileSync(manualPath, 'utf8')
    const header = manual.split('| 版本 |')[1]?.split('|')[0]?.trim()
    header === packVersion
      ? ok(`dist-manual（安装手册表头版本 = pack package.json ${packVersion}）`)
      : fail('dist-manual', `安装手册表头版本（${header ?? '解析不到'}）≠ pack package.json（${packVersion}）——重跑 \`node tools/export-dist.mjs\` 再提交，别手改手册`)
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

// ── 3-bis. preset 行 schema 必填字段门禁（preset-required-config，2026-10-09 N4 立）────
// 复发依据（**已实地复发**，不是推测）：postmortem 0001（preset 挂载失败、用户浏览器里才发现）
// 明文把「`scripts/verify.mjs` check 8 — rows with known schema-required fields must carry them」
// 列为它产出的护栏之一；**该门禁现已不存在**（N4 实测：删掉 0001 的元凶字段
// `sampleOverCapGlobResults`，`pnpm verify` 依然 ALL PASS，只有真挂载的 preset-smoke 才红）。
// ⇒ 事故留下的护栏在改名/重构中**静默丢失**，而没有任何机制发现它丢了。
// 判据源 = vendor **committed** 生成物 `docs/config-catalog.md`（145 个 catalog 块 / 56 包有必填字段）：
// 结构即事实——`  name: type` = 必填，`  name?: type` = 有默认值。不用 import vendor TS（免构建、免越界）。
// 病灶形状 = 行**声明了 config 却漏字段**；行压根没 config（如 tool-todo 在别处）不归本门禁管
// （那是"该不该配"的设计问题，preset-smoke 的真挂载覆盖）。
// 负例留证 2026-10-09：删 ceo 行 `sampleOverCapGlobResults: false` → preset-required-config 红 + preset-smoke 红
//（3 FAILURE）；还原 → 双绿。收据 = implemented/2026-10-09-postmortem-guard-restoration.md。
{
  // 空转下限：声明了 config 的行数不该莫名缩水（形状变了要报，不是静默少查几行）。
  const MIN_EXPECTED_CONFIG_ROWS = 20
  const catalogPath = join(root, 'vendor/dsh/docs/config-catalog.md')
  const presetRequired = new Map()   // '@scope/pkg' → ['field', ...]
  if (existsSync(catalogPath)) {
    const catalog = readFileSync(catalogPath, 'utf8')
    const blockRe = /<!-- BEGIN GENERATED config-catalog:(@\S+) -->([\s\S]*?)<!-- END GENERATED config-catalog:\1 -->/g
    for (const [, pkg, body] of catalog.matchAll(blockRe)) {
      const fence = /```ts config-catalog\n([\s\S]*?)```/.exec(body)
      if (fence === null) continue
      // 只认顶层 `export interface Config {`（缩进 0）里的字段（缩进恰 2 空格）；嵌套对象/其它接口不算。
      const iface = /^export interface Config \{\n([\s\S]*?)^\}/m.exec(fence[1])
      if (iface === null) continue
      const fields = []
      for (const line of iface[1].split('\n')) {
        const m = /^ {2}([A-Za-z_][A-Za-z0-9_]*):/.exec(line)   // 无 `?` = 必填
        if (m !== null) fields.push(m[1])
      }
      if (fields.length > 0) presetRequired.set(pkg, fields)
    }
  }
  if (presetRequired.size === 0) {
    fail('preset-required-config', '解析不出 vendor docs/config-catalog.md 的必填字段（判据源没了：catalog 格式改了还是文件被移走了？）')
  } else {
    const missing = []
    let checkedRows = 0
    for (const role of roles) {
      const file = join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml')
      if (!existsSync(file)) continue
      const lines = readFileSync(file, 'utf8').split('\n')
      // 逐行找 `- id:` 行块，取块的 name 与 config 子键（YAML 子集：够读本仓自写的 preset 文件）
      for (let i = 0; i < lines.length; i++) {
        const idm = /^\s*-\s*id:\s*(\S+)/.exec(lines[i])
        if (idm === null) continue
        const indent = /^(\s*)/.exec(lines[i])[1].length
        let name = null
        const configKeys = []
        let sawConfig = false
        let inConfig = false
        let configIndent = -1
        for (let j = i + 1; j < lines.length; j++) {
          const raw = lines[j]
          if (raw.trim() === '') continue
          const ind = /^(\s*)/.exec(raw)[1].length
          if (ind <= indent && /^\s*-/.test(raw)) break        // 下一个兄弟行
          if (ind <= indent && /\S/.test(raw)) break
          const nm = /^\s*name:\s*'?"?([^'"\s]+)'?"?\s*$/.exec(raw)
          if (nm !== null && name === null) { name = nm[1]; continue }
          const cfg = /^(\s*)config:\s*$/.exec(raw)
          if (cfg !== null) { sawConfig = true; inConfig = true; configIndent = cfg[1].length; continue }
          if (inConfig === true) {
            const km = /^(\s*)([A-Za-z_][A-Za-z0-9_]*):/.exec(raw)
            if (km !== null) {
              if (km[1].length <= configIndent) { inConfig = false; continue }   // config 块结束
              configKeys.push(km[2])
            }
          }
        }
        // ⚠ 判据必须是「这一行**声明了** config」，不是「config 里还剩几个键」——后者会让
        //   "删掉最后一个必填键"变成"这行不再有 config ⇒ 跳过"，**门禁静默放行**（N4 实测首版就栽在这，
        //   删元凶字段后只看到计数 32→30 而全绿）。声明了 config 的行一律受判，哪怕 config 已空。
        if (name === null || sawConfig === false) continue    // 压根没 config 行 = 不归本门禁（见上）
        const required = presetRequired.get(name)
        if (required === undefined) continue
        checkedRows++
        const lacked = required.filter(f => !configKeys.includes(f))
        if (lacked.length > 0) missing.push(`${role}: ${name}（${lacked.length} 个必填字段缺）${lacked.join(', ')}`)
      }
    }
    if (checkedRows < MIN_EXPECTED_CONFIG_ROWS) {
      fail('preset-required-config', `只识别到 ${checkedRows} 个「声明了 config」的行（期望 ≥${MIN_EXPECTED_CONFIG_ROWS}）——解析退化了（YAML 形状改了？），门禁可能在空转`)
    } else {
      missing.length === 0
        ? ok(`preset-required-config ×${checkedRows} 行（声明了 config 的行，必填字段齐——判据 = vendor config-catalog）`)
        : fail('preset-required-config', `这些 preset 行的 config 漏 schema 必填字段（挂载时整份 preset 失败且 UI 静默——事故 0001 复原）：${missing.join('；')}`)
    }
  }
}

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
// tools/sync-dsh.mjs（它会同步加列），这条门禁保证忘加就红。
const compatReleases = pack?.dsh?.compatibility?.dshReleases
if (!Array.isArray(compatReleases) || !compatReleases.includes(expectedTag)) {
  fail('pack-compat', `dsh.compatibility.dshReleases 必须包含当前钉住的 ${expectedTag}（升 pin 走 tools/sync-dsh.mjs 并同步加列）`)
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
// 日期）——没批准的思考属于 _backlog/issues/ 推敲卡，不配住 proposed/；
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
  ...unapproved.map(name => `${name} 缺「批准：」标记（未批准的思考住 _backlog/issues/ 推敲卡）`),
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

// ── _backlog 活状态 + 索引交叉核对门禁（backlog-liveness；D33 原门唯一家）───────
// 为什么：D30 未完结卡缺户口、D33 搬卡未同步索引，两类真漂移要求位置、头与索引一起检查。
// 2026-10-09 整体借入 ai_dsh_assitant/scripts/checks/verify-checks.mjs 的
// backlogLivenessProblems + backlogGraduationProblems；method 字段形状来自源 methods/README。
// 本仓适配：制度目录与 README 必需；递归材料按 owner README 解析后的真实目标核对，不能用
// basename 跨桶碰巧满足。活跃区各桶根 README 持有索引，归档统一由 _archive/README 持有。归档旧讨论保留原文、不追补头；新研究与新归档自生效日起从严。
// 既有负例留证 2026-09-27/28：旧状态头缺失 → 红；D33 搬卡漏索引 → 红。
// 迁移反例留证 2026-10-09（真实仓文件，pnpm verify 红→逐项还原绿）：issues 卡删 opened →
//   backlog-liveness 报「缺 opened」；归档总索引改掉一条 settled issue 目标 → 报该卡未被 _archive/README.md 索引；
//   issues/README.md 暂移 → 报必需索引缺失；新 research 文件缺 frontmatter → 报缺 frontmatter。四项各自还原后 ALL PASS。
function backlogLivenessProblems(backlogRoot) {
  const problems = []
  const effectiveDate = '2026-10-09'
  const pools = ['issues', 'bugs', 'research', 'methods', '_archive/settled_issues',
    '_archive/suspended_issues', '_archive/fixed_bugs', '_archive/suspended_bugs',
    '_archive/research', '_archive/legacy']
  const isDir = path => existsSync(path) && lstatSync(path).isDirectory()
  const isFile = path => existsSync(path) && lstatSync(path).isFile()
  for (const dir of ['', '_archive', ...pools]) {
    const full = join(backlogRoot, dir)
    const where = `_backlog${dir ? `/${dir}` : ''}`
    if (!isDir(full)) problems.push(`${where} 制度目录缺失或不是目录`)
    if (!isFile(join(full, 'README.md'))) problems.push(`${where}/README.md 必需索引缺失或不是文件`)
  }
  const markdownFiles = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return markdownFiles(join(dir, entry.name), join(prefix, entry.name))
    return entry.isFile() && entry.name.endsWith('.md') ? [join(prefix, entry.name)] : []
  })
  const statuses = {
    issues: ['推敲中', '等人拍板'], bugs: ['活跃'],
    '_archive/settled_issues': ['已结'], '_archive/suspended_issues': ['叫停'],
    '_archive/fixed_bugs': ['已修'], '_archive/suspended_bugs': ['待修'],
  }
  const topicByDir = { positioning: '定位', upstream: '上游', 'tech-exploration': '技术' }
  const isFresh = (name, undated = true) => {
    // Both the existing YYYY-MM-DD filenames and the borrowed YYMMDD card names are accepted.
    const long = /^(\d{4}-\d{2}-\d{2})-/.exec(basename(name))
    const short = /^(\d{2})(\d{2})(\d{2})-/.exec(basename(name))
    const date = long?.[1] ?? (short ? `20${short[1]}-${short[2]}-${short[3]}` : undefined)
    // Undated new material cannot use the historical exemption.
    return date === undefined ? undated : date >= effectiveDate
  }
  const frontmatter = (text, where) => {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
    if (!match) { problems.push(`${where}:1 缺 frontmatter`); return }
    let data
    try { data = loadYaml(match[1]) } catch (error) {
      problems.push(`${where}:1 frontmatter YAML 不可解析：${String(error).split('\n')[0]}`)
      return
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      problems.push(`${where}:1 frontmatter 须为字段映射`)
      return
    }
    return data
  }
  // Source graduation checks inspect only the first 12 lines: historical discussion is not a verdict.
  const closureSignals = [
    /可关闭\s*[：:=＝]\s*是\s*(?=[｜|\n（(]|$)/,
    /关闭条件(?:判断)?\s*[：:=＝]\s*(?:已满足|已通过|已过)\s*(?=[｜|\n（(]|$)/,
    /毕业门(?:判断)?\s*[=＝]\s*(?:已过|已通过|已毕业)/,
    /状态：\s*(?:已全部实施|已消化|已毕业|已完成|已实施)/,
    /状态：\s*[^｜|\n]*已交付\s*(?=｜|$)/,
  ]
  for (const pool of pools) {
    const fullDir = join(backlogRoot, pool)
    if (!isDir(fullDir)) continue
    const files = markdownFiles(fullDir)
    const indexPath = pool.startsWith('_archive/') ? '_archive/README.md' : `${pool}/README.md`
    const indexFile = join(backlogRoot, indexPath)
    const indexed = isFile(indexFile) ? markdownLinkTargets(indexFile) : new Set()
    for (const name of files.filter(name => basename(name) !== 'README.md')) {
      const full = join(fullDir, name)
      const where = `_backlog/${pool}/${name}`
      if (!indexed.has(resolve(full))) problems.push(`${where} 未被 ${indexPath} 索引链接点名`)
      const text = readFileSync(full, 'utf8')
      if (pool === 'issues' || pool === 'bugs') {
        const head = text.split('\n').slice(0, 12).join('\n').replaceAll('**', '')
        if (closureSignals.some(signal => signal.test(head))) {
          problems.push(`${where}:1 声明可关闭/关闭条件已满足却仍在活跃区；移至 _archive/${pool === 'issues' ? 'settled_issues' : 'fixed_bugs'}/ 并同步索引`)
        }
      }
      if (pool === '_archive/legacy') continue
      const hasHead = text.startsWith('---\n') || text.startsWith('---\r\n')
      // Active issue/bug headers are migrated now; old archived prose and research keep their text.
      if (pool !== 'issues' && pool !== 'bugs' && pool !== 'methods' && !hasHead && !isFresh(name, !pool.startsWith('_archive/'))) continue
      const data = frontmatter(text, where)
      if (!data) continue
      const keys = Object.keys(data)
      if (statuses[pool]) {
        if (keys[0] !== 'status') problems.push(`${where}:2 frontmatter 首字段须为 status`)
        else if (!statuses[pool].includes(String(data.status))) problems.push(`${where}:2 status ${JSON.stringify(data.status)} 不属于此桶`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.opened ?? ''))) problems.push(`${where}:1 缺 opened: YYYY-MM-DD`)
        if (pool.endsWith('bugs') && !['P0', 'P1', 'P2'].includes(data.severity)) problems.push(`${where}:1 缺 severity: P0/P1/P2`)
      } else if (pool.endsWith('research')) {
        if (keys[0] !== 'topic' || typeof data.topic !== 'string' || !data.topic.trim()) problems.push(`${where}:2 frontmatter 首字段须为非空 topic`)
        const topic = topicByDir[name.split('/')[0]]
        if (topic !== undefined && data.topic !== topic) problems.push(`${where}:2 topic 应与子目录匹配（${topic}）`)
        if (typeof data.intent !== 'string' || !data.intent.trim() || /[\r\n]/.test(data.intent)) problems.push(`${where}:1 缺单行非空 intent`)
      } else if (pool === 'methods') {
        if (data.name !== basename(name, '.md')) problems.push(`${where}:2 name 须匹配文件名 ${basename(name, '.md')}`)
        for (const key of ['description', 'whenToUse']) {
          if (typeof data[key] !== 'string' || !data[key].trim()) problems.push(`${where}:1 缺非空 ${key}`)
        }
      }
    }
  }
  return problems
}
// Runner stays in the owning gate; the read-only function is also used by isolated shape tests.
{
  const problems = backlogLivenessProblems(join(root, '_backlog'))
  problems.length === 0
    ? ok('backlog-liveness（制度目录/README、卡头、关闭判断、method 形状、递归索引）')
    : fail('backlog-liveness', problems.join('；'))
}

// ── 重放场景活性门禁（replay-scene-liveness，2026-10-09 立）─────────────────────
// 为什么：`snapshots/replay/` 42MB（占资产树 77%），而默认只重放 1 个场景（r3-delegation
// 420KB = 1% 字节）；replay-smoke **不在 hook、不在 CI**，纯手动。⇒ 场景可以无限累积、
// "这个场景算不算能跑的回归门"全靠 README 散文记着，没有任何机制发现"又收了一个跑不起来的场景"。
// DSH 立场：Skill = guidance，只有**机械可判**的规则才进门禁。本门禁把散文升成字段。
// 三态（各场景 snapshot.yml 的 `replayEligible:`）+ 每种态各查什么：
//   runnable —— 必须**有** fixture（replay/session*.v3.jsonl）**且**有 replay/cordis.snapshot.yml
//               （后者是 replay-smoke 硬要求的组合 patch，缺了 exit(2) 起不来）；
//   archived —— 必须**有** fixture（否则该归 baseline）；判据红/起不来的理由写在「# 资格理由（日期）：」；
//   baseline —— 必须**没有** fixture（有输入却叫 baseline = 静默死资产，正是本门禁要抓的）。
// 另：每个场景都必须有 snapshot.yml + `replayEligible` 三值之一 + 「# 资格理由（YYYY-MM-DD）：」行
// （资格是判断，判断要留痕 **且带判定日期**——无日期就查不出"这条还成立吗"：一轮实测的 ALL PASS
//  会随机制漂移过期，日期让陈旧资格可被回溯。r6 为什么不算回归门也因此可查）。
// 判据源 = 磁盘 + 场景自己的 snapshot.yml。**不另立登记表文件**：内容派生的第三本账必然漂移
// （D34/D36 已拆过一次），场景元数据本来就该住各场景自己。
// ⚠ 本门禁**不证明**的（边界照 testing.md §1 写清）：它不跑 replay-smoke，所以**不证明**
//   `runnable` 的判据真的绿、也不证明 `archived` 真的红——那要起进程、单场景 11–49s，
//   远超门禁"秒级"预算。它证明的是**声明与磁盘相符 + 判断留痕**，即"没人能悄悄让一个
//   场景失去可跑性而不被注意"。真绿由 replay-smoke 自己报（触发条件见其头注）。
// 🩸 这条边界**有活证据**（2026-10-09 收尾实测）：首版把 r3-delegation / foundation-workspace
//   定成 runnable（依据 = 一次实跑 ALL PASS），门禁照绿；复跑却 4 / 3 FAILURE——录制是内容快照，
//   仓库在动而快照不动（AGENTS.md 涨过注入预算、workspace_doors 入工具表、vendor 工具描述演进），
//   full 档"逐字节零 diff"于是必红。⇒ **声明本身会过期，而本门禁抓不到**。这正是「资格理由」
//   必须带**日期**的原因（无日期查不出判断多旧），也是 1/9 场景仍可用的由来。
// 负例留证 2026-10-09（三态各一，实地造红→还原→绿）：
//   ① r1-motion: baseline → runnable（无输入却声明可跑）→ 红；
//   ② r3-delegation: runnable → baseline（有输入却降级为基线 = 静默死资产）→ 红；
//   ③ r3-delegation: 删 replay/cordis.snapshot.yml 而声明仍 runnable → 红；
//   ④ 删任一场景的「# 资格理由（日期）：」行，或**抹掉其中的日期** → 红。
//   还原 → 全绿（见 implemented/2026-10-09-replay-scene-liveness.md）。
const replayRoot = join(root, 'snapshots/replay')
if (existsSync(replayRoot)) {
  const scenes = readdirSync(replayRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.isSymbolicLink())
    .map(e => e.name).sort()
  const problems = []
  const tally = { runnable: 0, archived: 0, baseline: 0 }
  for (const scene of scenes) {
    const sceneDir = join(replayRoot, scene)
    const ymlPath = join(sceneDir, 'snapshot.yml')
    if (!existsSync(ymlPath)) { problems.push(`${scene}（缺 snapshot.yml——场景元数据必填）`); continue }
    const yml = readFileSync(ymlPath, 'utf8')
    const m = /^replayEligible:\s*(\S+)\s*$/m.exec(yml)
    if (m === null) { problems.push(`${scene}（缺 replayEligible 字段）`); continue }
    const state = m[1]
    if (!(state in tally)) { problems.push(`${scene}（replayEligible: ${state} 不是三态之一——只认 runnable|archived|baseline）`); continue }
    if (!/^#\s*资格理由（\d{4}-\d{2}-\d{2}）：/m.test(yml)) { problems.push(`${scene}（缺「# 资格理由（YYYY-MM-DD）：」行——资格是判断，判断会过期，无日期就查不出「这条还成立吗」）`); continue }
    // fixture 判据 = replay-smoke 真正读的输入；replay/ 与场景根两处都认（r3 历史形状在 replay/ 下）
    const hasFixture = [join(sceneDir, 'replay'), sceneDir]
      .some(d => existsSync(d) && readdirSync(d).some(n => /^session(\.\d+)?\.v3\.jsonl$/.test(n)))
    const hasPatch = ['replay', ''].some(sub => existsSync(join(sceneDir, sub, 'cordis.snapshot.yml')))
    if (state === 'baseline' && hasFixture) {
      problems.push(`${scene}（有 replay/session*.v3.jsonl 却声明 baseline——能重放却没人知道，静默死资产）`)
    } else if (state !== 'baseline' && !hasFixture) {
      problems.push(`${scene}（声明 ${state} 但盘上没有 replay/session*.v3.jsonl——重放起不来）`)
    } else if (state === 'runnable' && !hasPatch) {
      problems.push(`${scene}（声明 runnable 但缺 replay/cordis.snapshot.yml——replay-smoke 硬要求，缺了直接 exit(2)）`)
    }
    if (state in tally) tally[state]++
  }
  problems.length === 0
    ? ok(`replay-scene-liveness ×${scenes.length}（声明↔磁盘一致；runnable ${tally.runnable} / archived ${tally.archived} / baseline ${tally.baseline}）`)
    : fail('replay-scene-liveness', `重放场景声明与磁盘不符或元数据缺字段（三态事实家 = 各场景 snapshot.yml，散文旧记 = snapshots/README.md §快照与 live 盘差异的语义）：${problems.join('；')}`)
}

// ── 守卫负例门禁（guard-red-record，2026-10-09 立）──────────────────────────────
// 为什么：门禁有 23 处「负例留证」，而 36 个 spec **一处都没有**——同样是"守卫"，
// 一边强制证明自己能红、一边不强制。testing.md §3.7 明文要求 prove-it-red
// （「守卫只有挡得住回归才算守卫——制造回归看红、还原看绿，三步留证」），但只写在散文里。
// **实测触发（不是推测）**：`tests/company/deliverables.spec.ts` 的 BUG-004 守卫
// （让位行机器可查面）被弱化成子串匹配——即它自己声称要防的"措辞走样也认"失效——
// 全套 355 项**依然全绿**，且能让「持认 ∧ 让位」同时为真（BUG-004 存在要防的互斥失效）。
// 那条守卫的 fixture 正文不含让位行原文，所以两种实现都返回 false，验不出弱化。
// ⇒ 一条从没红过的守卫，就是一条**没人知道能不能红**的守卫。
// 判据（机械可判，不靠关键词猜测）：
//   ① **守卫声明** = 某个 `describe('…')` / `it('…')` 的**标题里带 `BUG-nnn`**。
//      标题是"我在这里守一条具体不变量"的正式声明；正文注释里提 BUG 号只是解释
//      （反例：`signoff-tool.spec.ts` 用注释解释 mock 为何要 no-op，它不声称守卫 BUG-002）。
//   ② **事故必须可解析**：`BUG-nnn` 必须能对到 `_backlog/_archive/fixed_bugs/BUG-nnn-*.md`
//      真卡（悬空编号 = 声称守一个不存在的过去 → 红）。
//   ③ **每个声明必须有对应的负例留证行**：文件里存在 `// 负例留证 YYYY-MM-DD：…BUG-nnn…`
//      （按编号对齐——一篇 spec 声明守卫 N 个事故，就要 N 条，不许一条笼统行糊过去）。
// 判据源 = `tests/**/*.spec.ts` 自身 + `_backlog/_archive/fixed_bugs/` 真卡。
// ⚠ 本门禁**不证明**的：它不制造回归、不跑 vitest，所以**不证明**那条留证是真的
//   （留证写了但假的，本门禁看不出来——那要靠人复现）。它证明的是"**声称守卫具体事故的
//   spec 必须交出可复现的红的配方**"，把"没人知道能不能红"变成"红法写在守卫旁边"。
// 负例留证 2026-10-09（实地造红→还原→绿）：
//   ① 新增一个 `describe('…（BUG-006）', …)` 但文件里没有对应留证行 → 红；
//   ② 把某条留证的 BUG 编号改错（BUG-004 → BUG-009，卡不存在）→ 红（悬空编号）；
//   ③ 把留证行整行删掉 → 红。还原 → 全绿（见 implemented/2026-10-09-guard-red-record.md）。
{
  const specFiles = []
  const walkSpecs = d => {
    if (!existsSync(d)) return
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walkSpecs(p)
      else if (e.name.endsWith('.spec.ts')) specFiles.push(p)
    }
  }
  walkSpecs(join(root, 'tests'))
  const bugCardExists = n => existsSync(join(root, '_backlog/_archive/fixed_bugs')) &&
    readdirSync(join(root, '_backlog/_archive/fixed_bugs')).some(f => f.startsWith(`BUG-${n}-`))
  const problems = []
  let claims = 0
  for (const file of specFiles.sort()) {
    const text = readFileSync(file, 'utf8')
    const rel = file.slice(root.length + 1)
    // ① 标题里的 BUG 号 = 守卫声明
    const claimed = new Set()
    for (const m of text.matchAll(/^\s*(?:describe|it)\(\s*['"`][^'"`]*?(BUG-\d{3})/gm)) claimed.add(m[1])
    if (claimed.size === 0) continue
    // ② 事故必须可解析 + ③ 每个声明要自己的留证行
    for (const id of [...claimed].sort()) {
      claims++
      const num = id.slice(4)
      if (!bugCardExists(num)) {
        problems.push(`${rel}：标题声称守卫 ${id}，但 _backlog/_archive/fixed_bugs/ 里没有 ${id}-* 卡（悬空事故号）`)
        continue
      }
      // 留证是**块**（首行「// 负例留证 日期：…」，续行是 // …）——与 run-gates 自身同形，
      // 故按块找：本行或其后紧邻的 // 续行里出现该 ID 即可。
      const record = new RegExp(
        `^\\s*//\\s*负例留证\\s+\\d{4}-\\d{2}-\\d{2}：(?:[^\\n]*\\n(?:\\s*//[^\\n]*\\n)*)?[^\\n]*${id}`,
        'm')
      if (!record.test(text)) {
        problems.push(`${rel}：标题声称守卫 ${id}，但文件里没有「// 负例留证 YYYY-MM-DD：…${id}…」行（这条守卫没人知道能不能红）`)
      }    }
  }
  problems.length === 0
    ? ok(`guard-red-record ×${claims} 条守卫声明（${specFiles.length} 个 spec；每条都对到真事故卡 + 自带红配方）`)
    : fail('guard-red-record', `这些 spec 声称守卫具体事故却没交出可复现的红配方（testing.md §3.7 prove-it-red；留证形状照 run-gates 自身的「负例留证」）：${problems.join('；')}`)
}

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
