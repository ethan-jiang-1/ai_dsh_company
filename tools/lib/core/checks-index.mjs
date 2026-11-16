// 纯逻辑：公开入口扫描 + checks/INDEX.generated.md 渲染 + README 覆盖判据。
//
// 2026-10-20：checks/README 手维护漏了 5 个公开入口，先补了「入口 → README 链接」覆盖门禁。
// 2026-11-03（A- D1）：覆盖门禁反过来强制 README 手工枚举（违反 D28「枚举的家 = 实现自己」）。
// 现在改成：扫描目录 → 渲染生成物 → 门禁校验生成物新鲜度 + README 只链接生成物。
// gates/lib/drivers/archive 是内部实现，不在射程。

import { existsSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

/** 公开入口所在目录（相对仓库根）。 */
export const PUBLIC_DIRS = ['checks/lanes', 'checks/audit', 'probes']
/** 工具面的三个用途组（目录 = 何时进这个门；清单 = 目录本身）。 */
export const TOOL_GROUPS = ['dev', 'repo', 'release']
/** 工具面顶层允许项：三组 + 实现层三目录 + README。其余一律算散件（文件 / 未知目录 / symlink）。 */
export const TOOL_TOP_ALLOWED = new Set([...TOOL_GROUPS, 'lib', 'drivers', 'archive', 'README.md'])

/**
 * 工具面顶层散件：不在 TOOL_TOP_ALLOWED 里的任何 entry。
 * 为什么：入口只许进三组；散在顶层的新入口会逃出生成库存与「组」的语义。
 */
export function strayToolEntries(root) {
  const dir = join(root, 'tools')
  if (!existsSync(dir)) return ['tools（目录缺失）']
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => !TOOL_TOP_ALLOWED.has(entry.name))
    .map(entry => `tools/${entry.name}`)
    .sort()
}
/** 内部实现前缀：不要求进公开库存。 */
export const EXCLUDED_PREFIXES = ['checks/gates/', 'checks/lib/', 'checks/lanes/lib/', 'probes/lib/', 'tools/drivers/', 'tools/lib/', 'tools/archive/']

/** 递归收集某目录下的 .mjs（仓库相对路径）。 */
function walk(root, rel) {
  const out = []
  const dir = join(root, rel)
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...walk(root, child))
    else if (entry.name.endsWith('.mjs')) out.push(child)
  }
  return out
}

/**
 * 扫描公开入口：smoke/audit/probes 全树 + tools 三个用途组；排除内部实现前缀。
 * @param {string} root 仓库根。
 * @returns {ReadonlyArray<string>} 排序后的仓库相对路径。
 */
export function scanPublicScripts(root) {
  const scripts = []
  for (const dir of PUBLIC_DIRS) scripts.push(...walk(root, dir))
  for (const group of TOOL_GROUPS) scripts.push(...walk(root, `tools/${group}`))
  return scripts.filter(rel => !EXCLUDED_PREFIXES.some(prefix => rel.startsWith(prefix))).sort()
}

/** 索引链接目标（从 checks/README.md 所在目录算）。 */
export function indexTargetFor(rel) {
  if (rel.startsWith('checks/')) return rel.slice('checks/'.length)
  return `../${rel}`
}

const labelOf = (rel) => extname(rel) === '.mjs' ? rel.slice(rel.lastIndexOf('/') + 1, -'.mjs'.length) : rel

/** 按行宽折行（只在 ` · ` 分隔处折，保留 Markdown 链接完整）。 */
function wrap(parts, width = 110) {
  const lines = []
  let line = ''
  for (const part of parts) {
    const next = line === '' ? part : `${line} · ${part}`
    if (next.length > width && line !== '') {
      lines.push(line)
      line = part
    } else {
      line = next
    }
  }
  if (line !== '') lines.push(line)
  return lines
}

const links = (scripts) => scripts.map(rel => `[${labelOf(rel)}](${indexTargetFor(rel)})`)

/**
 * 渲染公开入口库存（checks/INDEX.generated.md 全文）。
 * @param {ReadonlyArray<string>} scripts 仓库相对路径（scanPublicScripts 的输出）。
 * @param {{ gateCount?: number }} [options] 结构门禁模块数（只算数量，不逐个列；目录才是清单）。
 * @returns {string} Markdown 全文（含生成说明）。
 */
export function renderScriptInventory(scripts, { gateCount } = {}) {
  const laneFiles = scripts.filter(rel => rel.startsWith('checks/lanes/'))
  const audit = scripts.filter(rel => rel.startsWith('checks/audit/'))
  const probes = scripts.filter(rel => rel.startsWith('probes/'))
  const tools = scripts.filter(rel => rel.startsWith('tools/'))
  const probeGroups = new Map()
  for (const rel of probes) {
    const rest = rel.slice('probes/'.length)
    const domain = rest.includes('/') ? rest.split('/')[0] : '（未分组）'
    const list = probeGroups.get(domain) ?? []
    list.push(rel)
    probeGroups.set(domain, list)
  }
  const out = [
    '# 公开入口库存（生成物，勿手改）',
    '',
    '> 生成：`node tools/repo/checks-index.mjs --write`；门禁 `script-index` 校验新鲜度。',
    '> 触发条件/成本/状态唯一源 = 各脚本头注；本文件只回答“有哪些公开入口、在哪”。',
    '',
    `## 冒烟 / 真实入口（checks/lanes/，${String(laneFiles.length)}）`,
    '',
    ...wrap(links(laneFiles)),
    '',
    `## 盘面审计（checks/audit/，${String(audit.length)}）`,
    '',
    ...wrap(links(audit)),
    '',
    `## 窄机制与视觉探针（probes/，${String(probes.length)}）`,
    '',
  ]
  for (const [domain, list] of [...probeGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`### ${domain}（${String(list.length)}）`, '', ...wrap(links(list)), '')
  }
  const toolGroups = new Map()
  for (const rel of tools) {
    const rest = rel.slice('tools/'.length)
    const group = rest.includes('/') ? `${rest.split('/')[0]}/` : '（未分组）'
    const list = toolGroups.get(group) ?? []
    list.push(rel)
    toolGroups.set(group, list)
  }
  out.push(
    `## 维护工具（tools/，${String(tools.length)}）`,
    '',
  )
  for (const [group, list] of [...toolGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`### ${group}（${String(list.length)}）`, '', ...wrap(links(list)), '')
  }
  out.push(
    `## 结构门禁（checks/gates/，${String(gateCount ?? '?')} 个模块）`,
    '',
    '清单唯一源 = 目录本身；装配 = [run-gates](run-gates.mjs)，接线一致性由 `gate-wiring` 门禁强制。',
    '',
  )
  return out.join('\n')
}
