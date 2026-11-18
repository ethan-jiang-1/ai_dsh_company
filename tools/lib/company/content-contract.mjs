/**
 * content 包的合同（纯逻辑；**唯一家**）。
 *
 * 为什么有本文件（2026-11-19，BUG-265..270/273/274）：同一份 `content/` 合同此前有**两份实现**——
 * `checks/gates/content-manifest.mjs`（源树，`pnpm verify`）与 `tools/lib/release/shipped-shape.mjs`
 * 的 `contentManifestProblems`/`jsonSchemaProblem`（tarball，`release:shape`）。两份各长各的洞：
 * 一份判重复一份不判、一份认 symlink 一份看不见；跨引用判据（seed 的 target、delivery 的 template）
 * 只活在源树门禁里，于是**同一个包从仓库装是红的、从 tarball 装是绿的**。
 *
 * 判据边界（机械、窄）：
 *   1. 路径：一律 content 相对、单段安全——拒绝对路径/盘符/反斜杠/NUL/`..` 段（Windows 反斜杠不算分隔符
 *      是漏洞来源：`..\evil` 在 posix-only 的判据里是普通文件名）；
 *   2. 清单：`version` 必须是本模块认识的那一版；inventory 非空、安全、无重复、与盘面双向对账；
 *      tiers 只引用 inventory 内且存在的文件、同一文件不许登记两次；
 *   3. 关键件：运行时**真的读**的 content 文件与它们所在目录必须在场（输入集 = 下面的
 *      `REQUIRED_CONTENT_FILES`，目录由它派生——不再手写一份目录清单）；
 *   4. JSON：delivery-rules / seed / check-rules 的**跨引用**（template 在场、seed target 在
 *      `.dsh-company/` 内、check-rules 的 files 覆盖 layers）与运行时读取器同义，不是只判"非空对象"。
 *
 * 本模块不判：字节预算（gate 的本地判据）、tier 与文件头 `加载：` 的一致性（gate 的本地判据）、
 * 交付模式/产品类型目录自身的形状（`delivery-mode-sources` / `product-type-sources` 门禁）。
 */
import { existsSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'

/** 本模块认识的 manifest 版本；读到更高的版本 = 旧 host 不认识新包，必须红。 */
export const CONTENT_VERSION = 1

/**
 * 运行时读取的 content 关键件（相对 `content/`）。**这份清单的事实来源** = host 读取面 +
 * `content/AGENTS.md` 的指针表（T0 手册把 agent 指向 generic/*.md 与 templates/）：
 * - host：`kb-setup/seed.json`、各交付模式的 `delivery-rules.json`、各产品类型的 `check-rules.json`、
 *   各 charter、`company/policy-lines.md`、`state/*`；
 * - agent（按需读）：`AGENTS.md`、`generic/` 六件、`templates/`、`contracts/`、`methods/`、`wiki-template/`。
 * 加一件"运行时必须读"的 content 文件 = 在这里加一行；目录不入表（由本表派生）。
 */
export const REQUIRED_CONTENT_FILES = [
  'AGENTS.md',
  'charters/ceo.md',
  'charters/cfo.md',
  'charters/cmo.md',
  'charters/coo.md',
  'charters/vp-eng.md',
  'charters/vp-sales.md',
  'company/policy-lines.md',
  'company/review-protocol.md',
  'company/rates.md',
  'templates/prd.md',
  'templates/mrd.md',
  'templates/meta.md',
  'contracts/workflow.md',
  'contracts/delegation/spawn.md',
  'contracts/delegation/team-spawn.md',
  'contracts/delegation/retry.md',
  'contracts/delegation/workflow.md',
  'contracts/delegation/team.md',
  'contracts/delegation/fork.md',
  'delivery-modes/managed-service/delivery-rules.json',
  'delivery-modes/project-services/delivery-rules.json',
  'product-types/business-software/requirements-model.md',
  'product-types/business-software/check-rules.json',
  'product-types/hardware-software/requirements-model.md',
  'product-types/hardware-software/check-rules.json',
  'methods/quality-loop-producer/system-architecture/SKILL.md',
  'methods/quality-loop-producer/vv-plan/SKILL.md',
  'methods/quality-loop-verifier/system-architecture/SKILL.md',
  'methods/quality-loop-verifier/vv-plan/SKILL.md',
  'kb-setup/seed.json',
  'kb-setup/guide.md',
  'kb-setup/run-bundle.md',
  'wiki-template/AGENTS.md',
  'wiki-template/index.md',
  'state/company.md',
  'state/org.md',
  'state/owners.md',
  'state/roster.md',
  'state/motion-ledger.md',
  'generic/collaboration.md',
  'generic/deliverable-states.md',
  'generic/human-interface.md',
  'generic/role-boundary.md',
  'generic/routing.md',
  'generic/work-handoff.md',
]

/**
 * 必需目录 = `REQUIRED_CONTENT_FILES` 的目录集合（派生；删整目录会让它的关键件一起消失）。
 * @returns {string[]} 排序后的 content 相对目录
 */
export function requiredContentDirs() {
  const dirs = new Set()
  for (const rel of REQUIRED_CONTENT_FILES) {
    const dir = posix.dirname(rel)
    if (dir !== '.') dirs.add(dir)
  }
  return [...dirs].sort()
}

/**
 * content 相对路径的安全判据。**两个分隔符都判**：`..\evil` 在 Windows 上是越界，在 posix 上只是一个
 * 怪文件名——判据不能只在一种平台上成立。
 * @param {unknown} rel
 * @returns {string|undefined} 问题描述；安全 = undefined
 */
export function contentRelProblem(rel) {
  if (typeof rel !== 'string' || rel === '') return '不是非空字符串'
  if (rel.includes('\0')) return '含 NUL'
  if (rel.includes('\\')) return '含反斜杠（跨平台分隔符）'
  if (rel.startsWith('/')) return '是绝对路径'
  if (/^[A-Za-z]:/.test(rel)) return '含盘符'
  if (rel.split('/').includes('..')) return '含 .. 段'
  return undefined
}

/** `.dsh-company/` 内的 workspace 相对 target（seed 用；与 bootstrap.readSeeds 同义）。 */
function seedTargetProblem(target) {
  if (typeof target !== 'string' || target === '') return '不是非空字符串'
  if (target.includes('\0')) return '含 NUL'
  if (target.includes('\\')) return '含反斜杠（跨平台分隔符）'
  if (target.startsWith('/')) return '是绝对路径'
  if (/^[A-Za-z]:/.test(target)) return '含盘符'
  if (target.split('/').includes('..')) return '含 .. 段'
  if (!target.startsWith('.dsh-company/')) return '不在 .dsh-company/ 内'
  return undefined
}

/** 把带 `{token}` 占位符的 content 路径变成匹配已登记文件的正则。 */
function placeholderRegExp(source) {
  const parts = source.split(/(\{[A-Za-z][A-Za-z0-9]*\})/)
  const pattern = parts
    .map(part => /^\{[A-Za-z][A-Za-z0-9]*\}$/.test(part) ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('')
  return new RegExp(`^${pattern}$`)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const NON_EMPTY_STRING = value => typeof value === 'string' && value.trim() !== ''

/** delivery-rules 的 documents 条目形状（与 `req-command.deliveryReminderFiles` 读的字段同义）。 */
function documentProblem(dir, key, doc, files) {
  if (!isRecord(doc)) return `documents.${key} 不是对象`
  if (typeof doc.file !== 'string' || !/^drafts\/[a-z0-9-]+\.md$/.test(doc.file)) return `documents.${key}.file 必须是 drafts/<slug>.md`
  if (!NON_EMPTY_STRING(doc.owner)) return `documents.${key}.owner 必须非空`
  if (!NON_EMPTY_STRING(doc.template)) return `documents.${key}.template 必须非空`
  if (!files.includes(`${dir}/${doc.template}`)) return `documents.${key}.template 不在 content：${doc.template}`
  return undefined
}

/** 单个 JSON 关键件的跨引用判据（rel 是 content 相对路径）。 */
function jsonKeyRefProblems(rel, value, files, problems) {
  const dir = posix.dirname(rel)
  if (rel.endsWith('delivery-rules.json')) {
    if (typeof value.entry !== 'string' || value.entry === '') problems.push('entry 必须非空')
    else if (!files.includes(`${dir}/${value.entry}`)) problems.push(`entry 不在 content：${value.entry}`)
    for (const [key, doc] of Object.entries(value.documents)) {
      const problem = documentProblem(dir, key, doc, files)
      if (problem !== undefined) problems.push(problem)
    }
    if (value.requiredFields !== undefined) {
      if (!isRecord(value.requiredFields)) problems.push('requiredFields 不是对象')
      else {
        for (const [key, fields] of Object.entries(value.requiredFields)) {
          if (!(key in value.documents)) problems.push(`requiredFields.${key} 没有对应 documents 条目`)
          else if (!Array.isArray(fields) || fields.some(field => !NON_EMPTY_STRING(field))) problems.push(`requiredFields.${key} 必须是非空字符串数组`)
        }
      }
    }
    if (value.v1Reminder !== undefined) {
      if (!Array.isArray(value.v1Reminder)) problems.push('v1Reminder 不是数组')
      else for (const key of value.v1Reminder) {
        if (typeof key !== 'string' || !(key in value.documents)) problems.push(`v1Reminder 引用了不存在的 documents 条目：${String(key)}`)
      }
    }
  }
  if (rel.endsWith('seed.json')) {
    const targets = new Set()
    const sources = new Set()
    for (const [index, seed] of value.seeds.entries()) {
      const where = `seeds[${index}]`
      if (!isRecord(seed)) { problems.push(`${where} 不是对象`); continue }
      const sourceProblem = contentRelProblem(seed.source)
      if (sourceProblem !== undefined) problems.push(`${where}.source ${sourceProblem}：${String(seed.source)}`)
      else if (!files.includes(seed.source) && !(seed.source.includes('{') && files.some(file => placeholderRegExp(seed.source).test(file)))) {
        problems.push(`${where}.source 不在 inventory：${seed.source}`)
      }
      const targetProblem = seedTargetProblem(seed.target)
      if (targetProblem !== undefined) problems.push(`${where}.target ${targetProblem}：${String(seed.target)}`)
      if (typeof seed.target === 'string') {
        if (targets.has(seed.target)) problems.push(`${where}.target 重复：${seed.target}`)
        targets.add(seed.target)
      }
      if (typeof seed.source === 'string') {
        if (sources.has(seed.source)) problems.push(`${where}.source 重复：${seed.source}`)
        sources.add(seed.source)
      }
    }
  }
  if (rel.endsWith('check-rules.json')) {
    const layers = Array.isArray(value.layers) ? value.layers : []
    for (const [layer, file] of Object.entries(value.files)) {
      if (typeof file !== 'string' || !/^[a-z0-9-]+\.md$/.test(file)) problems.push(`files.${layer} 必须是 <slug>.md 文件名`)
    }
    for (const layer of layers) if (!(layer in value.files)) problems.push(`layers 的 ${String(layer)} 没有对应 files 条目`)
    if (value.defaultLayers !== undefined) {
      if (!Array.isArray(value.defaultLayers)) problems.push('defaultLayers 不是数组')
      else for (const layer of value.defaultLayers) if (!layers.includes(layer)) problems.push(`defaultLayers 的 ${String(layer)} 不在 layers`)
    }
    if (value.retiredPrefixes !== undefined && (!Array.isArray(value.retiredPrefixes) || value.retiredPrefixes.some(item => !NON_EMPTY_STRING(item)))) {
      problems.push('retiredPrefixes 必须是非空字符串数组')
    }
  }
}

/**
 * 单个 JSON 关键件的 schema + 跨引用判据。
 * @param {{rel:string, value:unknown, files:string[]}} input
 * @returns {string[]} 问题列表（空 = 通过）；非关键件恒空
 */
export function contentJsonProblems({ rel, value, files }) {
  const kind = rel.endsWith('delivery-rules.json') ? 'delivery-rules'
    : rel.endsWith('seed.json') ? 'seed'
      : rel.endsWith('check-rules.json') ? 'check-rules' : undefined
  if (kind === undefined) return []
  if (!isRecord(value)) return [`${kind} 不是对象`]
  const problems = []
  if (kind === 'delivery-rules') {
    if (!NON_EMPTY_STRING(value.deliveryMode)) problems.push('缺 deliveryMode')
    if (value.kind !== 'delivery') problems.push('kind 必须是 delivery')
    if (!isRecord(value.documents) || Object.keys(value.documents).length === 0) problems.push('缺非空 documents')
    else jsonKeyRefProblems(rel, value, files, problems)
  } else if (kind === 'seed') {
    if (!Array.isArray(value.seeds) || value.seeds.length === 0) problems.push('缺非空 seeds')
    else jsonKeyRefProblems(rel, value, files, problems)
  } else {
    if (!NON_EMPTY_STRING(value.productType)) problems.push('缺 productType')
    if (!Array.isArray(value.layers) || value.layers.length === 0) problems.push('缺非空 layers')
    if (!isRecord(value.files) || Object.keys(value.files).length === 0) problems.push('缺非空 files')
    if (problems.length === 0) jsonKeyRefProblems(rel, value, files, problems)
  }
  return problems.map(problem => `${kind} ${problem}`)
}

/**
 * content/manifest.json 的判据（inventory / tiers / 关键件 / JSON 跨引用）。
 * @param {{
 *   manifest: unknown,
 *   files: string[],
 *   symlinks?: string[],
 *   read: (rel:string) => string,
 *   requiredFiles?: string[],
 *   requiredDirs?: string[],
 * }} input
 * @returns {string[]} 问题列表（空 = 通过）
 */
export function contentManifestProblems({
  manifest,
  files,
  symlinks = [],
  read,
  requiredFiles = REQUIRED_CONTENT_FILES,
  requiredDirs = requiredContentDirs(),
}) {
  if (!isRecord(manifest)) return ['content/manifest.json 不是对象']
  const problems = []
  if (manifest.version !== CONTENT_VERSION) {
    problems.push(`version 必须是 ${String(CONTENT_VERSION)}（当前 ${JSON.stringify(manifest.version)}）`)
  }
  const fileSet = new Set(files)
  // 必需目录先判：删整个目录是结构问题，别让它被后面的逐文件缺件消息淹掉。
  for (const dir of requiredDirs) {
    if (![...fileSet].some(rel => rel.startsWith(`${dir}/`))) problems.push(`必需目录缺内容：content/${dir}/`)
  }
  const inventory = manifest.inventory
  if (!Array.isArray(inventory) || inventory.length === 0) {
    problems.push('缺非空 inventory（content/** 全量清单）')
  } else {
    const seen = new Set()
    for (const rel of inventory) {
      const relProblem = contentRelProblem(rel)
      if (relProblem !== undefined) { problems.push(`inventory 不安全路径（${relProblem}）：${String(rel)}`); continue }
      if (seen.has(rel)) problems.push(`inventory 重复：${rel}`)
      seen.add(rel)
      if (!fileSet.has(rel)) { problems.push(`inventory 缺文件：${rel}`); continue }
      let text
      try { text = read(rel) } catch { problems.push(`inventory 文件不可读：${rel}`); continue }
      if (typeof text !== 'string' || text.trim() === '') { problems.push(`inventory 文件为空：${rel}`); continue }
      if (rel.endsWith('.json')) {
        let value
        try { value = JSON.parse(text) } catch { problems.push(`${rel} 不是合法 JSON`); continue }
        for (const problem of contentJsonProblems({ rel, value, files })) problems.push(`${rel} schema 不符：${problem}`)
      }
    }
    for (const rel of [...fileSet].sort()) if (!seen.has(rel)) problems.push(`未登记的 content 文件：${rel}（在 manifest.json 声明 tier）`)
  }
  for (const rel of symlinks) problems.push(`content 下出现 symlink（不跟随，无法入清单）：content/${rel}`)
  const tiers = manifest.tiers
  if (!isRecord(tiers)) problems.push('缺 tiers')
  else {
    const tierOf = new Map()
    for (const [tier, listed] of Object.entries(tiers)) {
      if (!Array.isArray(listed)) { problems.push(`tier ${tier} 不是数组`); continue }
      for (const rel of listed) {
        const relProblem = contentRelProblem(rel)
        if (relProblem !== undefined) { problems.push(`tier ${tier} 不安全路径（${relProblem}）：${String(rel)}`); continue }
        if (Array.isArray(inventory) && !inventory.includes(rel)) problems.push(`tier ${tier} 引用不在 inventory：${rel}`)
        if (!fileSet.has(rel)) problems.push(`tier ${tier} 引用缺文件：${rel}`)
        if (tierOf.has(rel)) problems.push(`同一文件被登记两次：${rel}（${String(tierOf.get(rel))} / ${tier}）`)
        else tierOf.set(rel, tier)
      }
    }
  }
  for (const rel of requiredFiles) {
    if (!fileSet.has(rel)) { problems.push(`缺关键运行时件：content/${rel}`); continue }
    try {
      const text = read(rel)
      if (typeof text !== 'string' || text.trim() === '') problems.push(`关键运行时件为空：content/${rel}`)
    } catch { problems.push(`关键运行时件不可读：content/${rel}`) }
  }
  return problems
}

/**
 * 枚举盘上的 content 文件（gate 侧适配器）：普通文件进 `files`，symlink 单列——**不跟随、不静默跳过**。
 * `manifest.json` 由调用方另判，不入 `files`（它是清单本体，不是被登记项）。
 * @param {string} dir content 目录绝对路径
 * @param {string} [prefix]
 * @returns {{files:string[], symlinks:string[]}}
 */
export function listContentFiles(dir, prefix = '') {
  const files = []
  const symlinks = []
  if (!existsSync(dir)) return { files, symlinks }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isSymbolicLink()) { symlinks.push(rel); continue }
    if (entry.isDirectory()) {
      const nested = listContentFiles(`${dir}/${entry.name}`, rel)
      files.push(...nested.files)
      symlinks.push(...nested.symlinks)
      continue
    }
    if (entry.isFile() && rel !== 'manifest.json') files.push(rel)
  }
  return { files: files.sort(), symlinks: symlinks.sort() }
}
