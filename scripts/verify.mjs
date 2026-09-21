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

// ── 3. preset 结构：4 角色 × (composition + metadata + ≥1 skill) ───────────
const roles = ['ceo', 'vp-eng', 'vp-sales', 'coo']
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

// ── 5. vendor/dsh：submodule 存在且钉在簿记的 tag ──────────────────────────
const expectedTag = 'dsh-v0.1.5-rc.2'
const gm = readFileSync(join(root, '.gitmodules'), 'utf8')
if (!gm.includes('vendor/dsh') || !gm.includes('deepseek-ai/deepseek-harness')) fail('gitmodules', 'URL/路径不符')
else {
  try {
    const desc = execFileSync('git', ['-C', join(root, 'vendor/dsh'), 'describe', '--tags'], { encoding: 'utf8' }).trim()
    desc === expectedTag ? ok(`vendor-pin (${desc})`) : fail('vendor-pin', `钉在 ${desc}，簿记为 ${expectedTag}`)
  } catch { fail('vendor-pin', 'vendor/dsh 未初始化（git submodule update --init）') }
}

// ── 6. pack 形状：dsh.bundle.patch 指向的文件存在 ───────────────────────────
const pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
const patchRel = pack?.dsh?.bundle?.patch
if (typeof patchRel !== 'string' || !existsSync(join(root, 'packages/company-pack', patchRel))) fail('pack-bundle', 'dsh.bundle.patch 缺失或未指向真实文件')
else ok('pack-bundle')

console.log(failures.length === 0 ? '\nverify: ALL PASS' : `\nverify: ${failures.length} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
