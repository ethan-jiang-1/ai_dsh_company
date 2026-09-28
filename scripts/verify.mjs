#!/usr/bin/env node
// 结构门禁（**清单唯一源 = 本文件**；AGENTS.md 与 dev-loop 只留指针，不复述清单——复述必漂）。
// **本行不写类数与项数**：那是易腐常量，实测写"12 类 / 16 项"后加了 3 道门禁就立刻失真
// （D28：枚举型事实的家 = 实现自己）。要全表就跑一次看 PASS 行。
// 纪律：只报告实际跑过的检查（docs/design/architecture.md §6）。阶段 5 前不测行为，只测结构。
import { readFileSync, existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateMarkdownLinks } from './lib/markdown-links.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const ok = (name) => console.log(`  PASS ${name}`)
const fail = (name, detail) => { failures.push(`${name}: ${detail}`); console.log(`  FAIL ${name}: ${detail}`) }

// ── 0. 钉住基线（**唯一事实家**：vendor-pin 与 pin-* 两道门禁都用它）─────────────
// 为什么用 SHA 而不是 tag：tag 可被移动/别名，SHA 才是钉住的合同。
// ⚠ 升 pin 时改这里 + AGENTS.md §vendor 簿记 + package.json 兼容矩阵（pack-compat 会拦）。
const expectedTag = 'dsh-v0.1.7-rc.2'
const expectedSha = '477b4f420553e8a52c2fbccc464d7561b239c443'

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
// 磁盘发现含未跟踪的新 Note；根部/docs/notes/pack + 公司手册/章程/org/templates。
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
  ['AGENTS.md', 105],            // 2026-09-23 二次收口（渐进披露）；2026-09-27 瘦身轮：密钥/三实体/原生纪律/不发明段压缩（当时 108→100），棘轮 115→105
  ['docs/index.md', 146],        // 2026-09-26 升至 149（D29/D30 行）；2026-09-27 瘦身轮：合同落点段删并、D19+D21 / D23+D24 并行、肥行压一行指针（当时 149→139），棘轮 149→146
  ['docs/guides/dev-loop.md', 395], // 2026-09-26/27 升至 467（§13、inspect 句）后同日瘦身轮：§7 整段迁 guides/bootstrap.md、§7 留指针防断链（当时 467→376），棘轮 467→395
  ['company-workspace/AGENTS.md', 195], // 2026-09-28 借 FAQ 04：公司手册是随每个成员会话注入的最大常驻面（186 行 ≈ 16.4KB × 每会话），同享棘轮（只降不升、上调须 Note 论证）；岗位细节的家 = CHARTER/templates
]
for (const [rel, cap] of DOC_LINE_BUDGETS) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n').length - 1
  lines <= cap
    ? ok(`doc-budget ${rel} (${lines}/${cap})`)
    : fail('doc-budget', `${rel} ${lines} 行超上限 ${cap}（先搬内容到该去的家，再压；不直接加行）`)
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
  const out = ['AGENTS.md', 'README.md', 'ROADMAP.md', 'notes/intents.md', 'company-workspace/AGENTS.md',
    'snapshots/README.md', 'dev/harness-home/README.md', 'packages/company-pack/README.md',
    'packages/company-pack/src/README.md'].filter(f => existsSync(join(root, f)))
  const walkMd = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  // `company-workspace/**` 也纳入（2026-09-26 补盲区）：它是**随每个成员会话注入**的事实面，
  // 里面的活指针腐化代价更高；而此前它不在扫描面内——实测本仓刚在那里留下一处死指针
  // （台账指向不存在的快照 README），三条门禁全都没抓到。
  // ⚠ 边界与 `markdown-links.mjs` 一致：**排除 `deliverables/` 与 `journal/`**——那是公司
  // *产出物与记忆*（正文里出现 `packages/company-pack/...` 之类是业务叙述，不是仓库指针），
  // 拿仓库指针判据去扫它们必出假阳性（实测扩面第一跑即误报一份 final.md）。
  // `tests/**` 也纳入 pin-currency 的扫描面（2026-09-26 补）：夹具里的 pin 字面量同样会漂，
  // 实测全仓 tests/ 只有一处且等于当前 pin ⇒ 纳入零成本。
  return out.concat(
    walkMd(join(root, 'tests')),
    walkMd(join(root, 'docs')),
    // `notes/**` 分**两档**（2026-09-26 补盲区 + 分档）：
    // · **硬档**（`proposed/` `research/`）= **活文档**——fresh agent 会照着它去干活，死指针代价高；
    // · **观察档**（`implemented/` `postmortem/`）= **记录当时事实**的档案——里面引的路径**当时是对的**
    //   （实测 36/39 条是 vendor 上游改过名）。**改它就是篡改记录** ⇒ 每次提醒、不判红。
    // 此前只扫 `notes/` 直接子文件（`p.split('/').length === 2`）⇒ `proposed/` 与 `implemented/` 全在面外。
    walkMd(join(root, 'notes/proposed')),
    walkMd(join(root, 'notes/research')),
    walkMd(join(root, 'company-workspace')).filter(p => !/^company-workspace\/(deliverables|kb\/[^/]+\/journal)\//.test(p)),
  )
})()
/** 观察档：`notes/implemented|postmortem/**` —— 记录**当时**事实的档案，死指针只提醒不判红。 */
const WARN_FILES = (() => {
  const walkMd = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd(path)
    return entry.name.endsWith('.md') ? [path.slice(root.length + 1)] : []
  })
  return [...walkMd(join(root, 'notes/implemented')), ...walkMd(join(root, 'notes/postmortem'))]
})()
const TOP_DIRS = ['notes/', 'docs/', 'scripts/', 'packages/', 'snapshots/', 'dev/', 'tests/', 'company-workspace/', 'vendor/']
const RUNTIME_PREFIXES = ['dev/harness-home', 'dev/rehearsal-workspace', '.pnpm-store']   // gitignored 运行态
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
    console.log(`  观察项 ${barePathWarn.length} 条（观察档 = \`notes/implemented|postmortem/**\`：`
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
//   · `notes/intents.md` = 时序意图日志，逐行记"当时"——天生历史，不参与现在时扫描；
//   · `ROADMAP.md` §历史维护记录 以下 = 文件头自己声明"非当前指令"，同样不参与。
const EXTERNAL_PINS = new Set(['dsh-v0.1.7-rc.1'])   // 外部研究树语料的 pin，不是本仓 pin
const PIN_HISTORY_MARKERS = /历史|旧|曾|原|当时|已退役|矩阵|compat|legacy/i
const PIN_SKIP_FILES = new Set(['notes/intents.md'])
const pinScanLines = (rel, text) => {
  const lines = text.split('\n')
  if (rel !== 'ROADMAP.md') return lines
  const cut = lines.findIndex(line => line.startsWith('## 历史维护记录'))
  return cut === -1 ? lines : lines.slice(0, cut)
}
const agentsText = readFileSync(join(root, 'AGENTS.md'), 'utf8')
const bookkeepingOk = agentsText.includes(`tag \`${expectedTag}\``) && agentsText.includes(`= \`${expectedSha}\``)
bookkeepingOk
  ? ok(`pin-bookkeeping (AGENTS.md §vendor 簿记 = ${expectedTag} @ ${expectedSha.slice(0, 8)})`)
  : fail('pin-bookkeeping', `AGENTS.md §vendor 簿记没有逐字声明 tag \`${expectedTag}\` / SHA \`${expectedSha}\`（簿记是唯一人读事实家）`)
let pinCount = 0
let pinBad = false
for (const rel of NOW_FILES) {
  if (PIN_SKIP_FILES.has(rel)) continue
  pinScanLines(rel, readFileSync(join(root, rel), 'utf8')).forEach((line, i) => {
    for (const m of line.matchAll(/dsh-v\d+\.\d+\.\d+(?:-rc\.\d+)?/g)) {
      if (m[0] === expectedTag || EXTERNAL_PINS.has(m[0])) continue
      if (PIN_HISTORY_MARKERS.test(line)) continue
      pinBad = true
      fail('pin-currency', `${rel}:${i + 1} → \`${m[0]}\` ≠ 当前钉住 ${expectedTag}（现在时文件里的过期 pin：改指针到 AGENTS.md 簿记，或标历史）`)
    }
    pinCount += [...line.matchAll(/dsh-v\d+\.\d+\.\d+(?:-rc\.\d+)?/g)].length
  })
}
if (!pinBad) ok(`pin-currency ×${pinCount}（现在时文件的 dsh-v 字面量 = ${expectedTag}；intents 日志与 ROADMAP 历史段按性质排除）`)

// ── 2f. 脚本触发条件门禁（2026-09-26 立，技术债 B7/R5 类）───────────────
// 负例留证 2026-09-27：探针头注「何时跑」改形 → script-triggers 红。────────
// 为什么：dev-loop §9.1 被 AGENTS.md 指定为"何时跑"的唯一家，却漏了 6 个已存在脚本，而 AGENTS.md
// 又把它指回 §9.1——成环，fresh agent 查"dag-visual 什么时候跑"两处都查不到。
// 根因是"枚举型事实写在文档里、实现那处更新了"（本仓六份清单同一种病）。
// 解法：**触发条件的家 = 脚本自己**（一处事实一个家，紧挨实现、改脚本时必然看见）；
// 文档只留分层原则与指针；本门禁强制自述存在。
const TRIGGER_FILES = readdirSync(join(root, 'scripts'))
  .filter(n => /-(smoke|probe|audit|check)\.mjs$/.test(n)).sort()
const missingTrigger = TRIGGER_FILES.filter(n =>
  !readFileSync(join(root, 'scripts', n), 'utf8').split('\n').slice(0, 8).some(line => line.startsWith('// 何时跑：')))
missingTrigger.length === 0
  ? ok(`script-triggers ×${TRIGGER_FILES.length}（每个门禁/探针脚本头注自述「何时跑」）`)
  : fail('script-triggers', `这些脚本头注缺「// 何时跑：」（触发条件的家 = 脚本自己，别写回文档）：${missingTrigger.join(', ')}`)


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
// scripts/sync-dsh.mjs（它会同步加列），这条门禁保证忘加就红。
const compatReleases = pack?.dsh?.compatibility?.dshReleases
if (!Array.isArray(compatReleases) || !compatReleases.includes(expectedTag)) {
  fail('pack-compat', `dsh.compatibility.dshReleases 必须包含当前钉住的 ${expectedTag}（升 pin 走 scripts/sync-dsh.mjs 并同步加列）`)
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

// ── 9. 提案纪律：roadmap 必须把 notes/proposed/ 消化掉 ─────────────────────
// 负例留证 2026-09-27：无归宿提案 → proposal-scheduled 红；「已交付」状态滞留 proposed → proposal-graduated 红。
// 起因（R4 收尾后实测，用户要求"roadmap 一定要消化掉 notes/proposed 里的东西"）：`notes/proposed/`
// 里一条提案被写进某轮的"做什么"列，整轮跑完却从没实现——直到有人**想起来问**才发现。文档纪律
// （一处事实一个家）管不住"登记了但没人做"，所以变成两条门禁：
//   ① **每个提案都必须在 roadmap 出现**（有归宿：某轮 / 轮间待办 / 搁置池）；
//   ② **已消化的不许赖在 proposed/**——一旦某提案的条目全都有归宿（交付 / 排期 / 明确不做），
//      它的 状态 行会带终态字（已消化 / 已交付 / 部分交付），那它就该**毕业**到 notes/implemented/
//      （毕业 ≠ 全部实现，而是"每一条都有归宿"，如 `workspace-hygiene` 有一条转轮间待办）。
// ⚠ 门禁只保证"被引用 + 该毕业的毕业"，不保证"会实现"——真正被逐条核对的是 roadmap 的**验收列**。
const proposedDir = join(root, 'notes/proposed')
const roadmapText = readFileSync(join(root, 'ROADMAP.md'), 'utf8')
// README.md 是文件夹说明书（curated entry point，非提案）——DSH 同款：notes 层的 README 不在提案命名空间
const proposals = existsSync(proposedDir)
  ? readdirSync(proposedDir).filter(n => n.endsWith('.md') && n !== 'README.md')
  : []
const unscheduled = proposals.filter(name => !roadmapText.includes(name))
unscheduled.length === 0
  ? ok(`proposal-scheduled ×${proposals.length}`)
  : fail('proposal-scheduled', `这些提案没在 ROADMAP.md 里出现（挂进去才有人做）：${unscheduled.join(', ')}`)

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

// ── research 层活状态行门禁（2026-09-26，用户指认「research 挂一堆东西」的防复发）─────────
// 负例留证 2026-09-27：无户口活研究稿 → research-liveness 红。
// 规则（D30）：research/ = 未完结研究（TODO 语义，dev-loop §12）；完结迁 notes/archived/、过时迁 notes/rejected/。
// 每份未完结文件必须自带户口：前 10 行有「状态：」行，且前 12 行内写明「喂给谁」或「毕业动作」。
// 索引 README.md（curated entry point）豁免。
const researchDir = join(root, 'notes/research')
const researchFiles = existsSync(researchDir)
  ? readdirSync(researchDir).filter(n => n.endsWith('.md') && n !== 'README.md')
  : []
const noLiveness = researchFiles.filter(name => {
  const head = readFileSync(join(researchDir, name), 'utf8').split('\n').slice(0, 12).join('\n')
  return !(head.includes('状态：') && (head.includes('喂给谁') || head.includes('毕业动作')))
})
noLiveness.length === 0
  ? ok(`research-liveness ×${researchFiles.length}（每份活研究自带喂给谁/毕业动作户口）`)
  : fail('research-liveness', `这些研究稿缺活状态行（喂给谁/毕业动作）——死研究按 dev-loop §12 三选一处置，别挂着：${noLiveness.join(', ')}`)

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
