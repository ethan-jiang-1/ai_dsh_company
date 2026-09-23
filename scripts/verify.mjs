#!/usr/bin/env node
// 结构门禁：UTF-8 / 文档链接 / preset 结构 / symlink / vendor pin / pack 形状。
// 纪律：只报告实际跑过的检查（docs/design/10-architecture.md §6）。阶段 5 前不测行为，只测结构。
import { readFileSync, existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const ok = (name) => console.log(`  PASS ${name}`)
const fail = (name, detail) => { failures.push(`${name}: ${detail}`); console.log(`  FAIL ${name}: ${detail}`) }

// ── 1. Markdown：严格 UTF-8 + 单个结尾换行 ──────────────────────────────────
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

// ── 2. 相对链接可解析（docs/ + AGENTS.md + pack 文档） ─────────────────────
let linkCount = 0
const linkHolders = [...mdFiles.filter(p => p.startsWith(join(root, 'docs')) || p === join(root, 'AGENTS.md') || p.includes('company-pack'))]
for (const p of linkHolders) {
  const text = readFileSync(p, 'utf8')
  for (const m of text.matchAll(/\]\((\.{1,2}\/[^)#\s]+)\)/g)) {
    linkCount++
    const target = resolve(dirname(p), m[1])
    if (!existsSync(target)) fail('link', `${p} → ${m[1]}`)
  }
}
ok(`md-links ×${linkCount}`)

// ── 2b. notes/ 树链接核验（W6 移交：notes/ 曾是 md-links 盲区，两条断链存活数月才被发现） ──
// 与 2 同一规则（相对链接必须可解析），只是覆盖面扩到 notes/ 全树。
let notesLinkCount = 0
for (const p of mdFiles.filter(p2 => p2.startsWith(join(root, 'notes')))) {
  const text = readFileSync(p, 'utf8')
  for (const m of text.matchAll(/\]\((\.{1,2}\/[^)#\s]+)\)/g)) {
    notesLinkCount++
    const target = resolve(dirname(p), m[1])
    if (!existsSync(target)) fail('notes-link', `${p} → ${m[1]}`)
  }
}
ok(`notes-links ×${notesLinkCount}`)

// ── 2c. 词数预算（缩编自 vendor `verify-doc-budgets`；防入口链继续膨胀——R6 D23/清单 B #52） ──
// 上限 = 当前值 + 余量；超限先搬（内容挪到该去的家）再压，确需空间才在 Note 里说明后升上限。
const DOC_BUDGETS = [
  ['AGENTS.md', 165],            // 2026-09-23 整治后 149 行（此前沉积 214）
  ['docs/00-index.md', 145],     // 整治后 131
  ['docs/guides/60-dev-loop.md', 440], // 整治后 ~397
]
for (const [rel, cap] of DOC_BUDGETS) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n').length - 1
  lines <= cap
    ? ok(`doc-budget ${rel} (${lines}/${cap})`)
    : fail('doc-budget', `${rel} ${lines} 行超上限 ${cap}（先搬内容到该去的家，再压；不直接加行）`)
}


// ── 3. preset 结构：5 角色 × (composition + metadata + ≥1 skill) ───────────
const roles = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
for (const role of roles) {
  const dir = join(root, 'packages/company-pack/presets', role)
  for (const f of ['agent.cordis.yml', 'preset.yml']) {
    if (!existsSync(join(dir, f))) fail('preset-file', `${role}/${f} 缺失`)
  }
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
const claude = join(root, 'CLAUDE.md')
try {
  if (!lstatSync(claude).isSymbolicLink() || readlinkSync(claude) !== 'AGENTS.md') fail('claude-symlink', 'CLAUDE.md 应为指向 AGENTS.md 的 symlink')
  else ok('claude-symlink')
} catch { fail('claude-symlink', 'CLAUDE.md 不存在') }

// ── 5. vendor/dsh：submodule 钉在簿记 SHA，且工作树**一个字节都不许改**（铁律）──────
// 铁律的允许面（见 AGENTS.md §vendor 铁律）：**只读** + 在 vendor 内产生 **gitignore 覆盖的
// 构建产物**（lib/、dist/、node_modules/——"从源码跑"要求构建，构建必须在树内）。
// 任何 tracked 文件的改动、或未被 gitignore 的新文件，都判 FAIL。
// 为什么用 SHA 而不是 tag：tag 可被移动/别名，SHA 才是钉住的合同。
const expectedTag = 'dsh-v0.1.5-rc.2'
const expectedSha = 'fb2c4b9e698e30edb738bca4cf0618587db7d203'
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
const pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
const patchRel = pack?.dsh?.bundle?.patch
if (typeof patchRel !== 'string' || !existsSync(join(root, 'packages/company-pack', patchRel))) fail('pack-bundle', 'dsh.bundle.patch 缺失或未指向真实文件')
else ok('pack-bundle')
// 兼容矩阵（R5a 发布欠账，guides/60 §5）：`dsh.compatibility.dshReleases` 必须包含当前
// 钉住的 vendor tag——升 pin 不加矩阵列 = 没验证过就装作验证过。升 pin 走
// scripts/sync-dsh.mjs（它会同步加列），这条门禁保证忘加就红。
const compatReleases = pack?.dsh?.compatibility?.dshReleases
if (!Array.isArray(compatReleases) || !compatReleases.includes(expectedTag)) {
  fail('pack-compat', `dsh.compatibility.dshReleases 必须包含当前钉住的 ${expectedTag}（升 pin 走 scripts/sync-dsh.mjs 并同步加列）`)
} else ok(`pack-compat (${expectedTag} ×${String(compatReleases.length)})`)

// ── 7. preset 行引用的插件必须在 pack 依赖声明里（R5a 起：dependencies ∪ peerDependencies）──
// DSH 的 verify-cordis-config 同构门禁（AGENTS.md：cordis.yml 的裸插件必须出现在
// 其解析清单的 dependencies）。漏了 → profile 安装后行解析不到 → preset 标记 broken，
// UI 里给不出可用角色（R1 实证：persona / skill-filesystem 缺依赖）。
// R5a 起 runtime 依赖声明从 dependencies 精确钉改 peerDependencies（guides/60 §5：
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
  // preset-smoke 的"真 profile + 浏览器模块表"断言兜底（guides/60 §7）。
  const clientRel = manifest.exports['./client']
  const clientPath = typeof clientRel === 'string' ? clientRel : clientRel?.default
  if (existsSync(join(dir, 'lib')) && typeof clientPath === 'string' && !existsSync(join(dir, clientPath))) {
    fail('client-half', `${manifest.name} 的 "./client" 指向 ${clientPath}，但产物不存在（重新构建？guides/60 §7）`)
  }
}
ok(`client-halves ×${clientHalves.length}`)

// ── 9. 提案纪律：roadmap 必须把 notes/proposed/ 消化掉 ─────────────────────
// 起因（R4 收尾后实测，用户要求"roadmap 一定要消化掉 notes/proposed 里的东西"）：`notes/proposed/`
// 里一条提案被写进某轮的"做什么"列，整轮跑完却从没实现——直到有人**想起来问**才发现。文档纪律
// （一处事实一个家）管不住"登记了但没人做"，所以变成两条门禁：
//   ① **每个提案都必须在 roadmap 出现**（有归宿：某轮 / 轮间待办 / 搁置池）；
//   ② **已消化的不许赖在 proposed/**——一旦某提案的条目全都有归宿（交付 / 排期 / 明确不做），
//      它的 状态 行会带终态字（已消化 / 已交付 / 部分交付），那它就该**毕业**到 notes/implemented/
//      （毕业 ≠ 全部实现，而是"每一条都有归宿"，如 `workspace-hygiene` 有一条转轮间待办）。
// ⚠ 门禁只保证"被引用 + 该毕业的毕业"，不保证"会实现"——真正被逐条核对的是 roadmap 的**验收列**。
const proposedDir = join(root, 'notes/proposed')
const roadmapText = readFileSync(join(root, 'docs/plans/roadmap.md'), 'utf8')
const proposals = existsSync(proposedDir) ? readdirSync(proposedDir).filter(n => n.endsWith('.md')) : []
const unscheduled = proposals.filter(name => !roadmapText.includes(name))
unscheduled.length === 0
  ? ok(`proposal-scheduled ×${proposals.length}`)
  : fail('proposal-scheduled', `这些提案没在 plans/roadmap.md 里出现（挂进去才有人做）：${unscheduled.join(', ')}`)

/** 终态字：提案的状态行里出现这些，说明它已经被消化，该毕业了。 */
const DIGESTED_MARKERS = ['已消化', '已交付', '部分交付']
const notGraduated = proposals.filter(name => {
  const statusLine = readFileSync(join(proposedDir, name), 'utf8').split('\n').find(line => line.startsWith('状态：')) ?? ''
  return DIGESTED_MARKERS.some(marker => statusLine.includes(marker))
})
notGraduated.length === 0
  ? ok('proposal-graduated (proposed/ 里只剩未落地的)')
  : fail('proposal-graduated', `这些提案已消化却仍在 notes/proposed/（搬到 notes/implemented/ 并写明条目去向）：${notGraduated.join(', ')}`)

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
