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

// ── 6. pack 形状：dsh.bundle.patch 指向的文件存在 ───────────────────────────
const pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
const patchRel = pack?.dsh?.bundle?.patch
if (typeof patchRel !== 'string' || !existsSync(join(root, 'packages/company-pack', patchRel))) fail('pack-bundle', 'dsh.bundle.patch 缺失或未指向真实文件')
else ok('pack-bundle')

// ── 7. preset 行引用的插件必须在 pack dependencies 里 ──────────────────────
// DSH 的 verify-cordis-config 同构门禁（AGENTS.md：cordis.yml 的裸插件必须出现在
// 其解析清单的 dependencies）。漏了 → profile 安装后行解析不到 → preset 标记 broken，
// UI 里给不出可用角色（R1 实证：persona / skill-filesystem 缺依赖）。
const packDeps = new Set(Object.keys(pack?.dependencies ?? {}))
const rowPlugins = new Set()
for (const role of roles) {
  const text = readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
  for (const m of text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)) {
    rowPlugins.add(m[1])
    if (!packDeps.has(m[1])) fail('preset-dep', `${role} 的行引用 ${m[1]}，但不在 pack dependencies（安装后解析不到 → preset broken）`)
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

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
