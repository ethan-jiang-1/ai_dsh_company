/**
 * run bundle 初始化（2026-11-01 v3）：
 * - 插件内容（手册/模板/默认章程）只读住 pack `content/`；
 * - 用户 workspace 只出现 `<workspace>/.dsh-company/`；
 * - 首次初始化只**补缺**：状态实例（company/org/owners/ledger/charter）与目录；
 * - 不复制手册/模板，不写根目录 `AGENTS.md`/`COMPANY.md`/`kb/`/`templates/`。
 *
 * 本模块只做纯计划/落盘，不注册服务、不抛错；调用方接住错误，避免 apply 期异常连累应用。
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { yamlScalar } from '../../lib/yaml-scalar.ts'
import { ROLE_CANONICAL } from '../../lib/role-copy.ts'
import { RUN_BUNDLE_DIR, RUN_BUNDLE_REL } from '../run-bundle/run-bundle.ts'

/** 六角色（researcher 没有 CHARTER）。 */
export const COMPANY_ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo'] as const

/** kb 装配清单（pack 内，source → workspace target）。 */
const SEED_MANIFEST = 'kb-setup/seed.json'
/** 类型相关 seed 的 source 占位：`product-types/{productType}/requirements-model.md`。 */
export const PRODUCT_TYPE_TOKEN = '{productType}'
/** 部署默认类型的来源（workspace 盘没有时读 pack 的出厂值）。 */
const COMPANY_SOURCE = 'state/company.md'
/** 编制漂移补种源（与 seed 清单分开：这里用 canonical 文本合并节/行）。 */
const ORG_SOURCE = 'state/org.md'
const OWNERS_SOURCE = 'state/owners.md'
const CHARTERS_SOURCE = 'charters'

export interface BootstrapEntry {
  /** 相对 workspace 的 POSIX 路径（目标）。 */
  readonly rel: string
  /** 内容来源，相对 pack 的 `content/`；目录条目缺省。 */
  readonly sourceRel?: string
  readonly kind: 'dir' | 'file'
  readonly action: 'create' | 'skip'
  /** 已合并好的内容（`org.md`/`owners.md` 补行用；给出时优先于 `sourceRel`）。 */
  readonly content?: string
  /** `replace` = 覆盖写（补席位用）；缺省 `create`（`wx`，绝不覆盖）。 */
  readonly mode?: 'create' | 'replace'
}

export interface BootstrapPlan {
  readonly workspace: string
  readonly contentDir: string
  readonly entries: readonly BootstrapEntry[]
  readonly creates: number
  readonly skips: number
  /** 可继续的装配告警（如类型相关 seed 缺 productType）：不阻断其余 seed。 */
  readonly warnings: readonly string[]
  readonly error?: string
}

export interface BootstrapResult {
  readonly created: readonly string[]
  readonly skipped: readonly string[]
}

const toPosix = (path: string): string => path.split(sep).join('/')

/** 目录骨架：只建 run bundle 内部目录。 */
const DIRS: readonly string[] = [
  RUN_BUNDLE_REL.root,
  RUN_BUNDLE_REL.kb,
  ...COMPANY_ROLES.map(role => `${RUN_BUNDLE_REL.kb}/${role}`),
  ...COMPANY_ROLES.map(role => `${RUN_BUNDLE_REL.kb}/${role}/journal`),
  RUN_BUNDLE_REL.deliverables,
  RUN_BUNDLE_REL.archive,
  RUN_BUNDLE_REL.cultivation,
  RUN_BUNDLE_REL.records,
  RUN_BUNDLE_REL.logs,
  RUN_BUNDLE_REL.exports,
  RUN_BUNDLE_REL.overrides,
]

/**
 * 内容目录 = pack 根下的 `content/`（`lib/index.js` 的上一级）。
 * @param moduleUrl - host 入口的 `import.meta.url`。
 */
export function resolveContentDir(moduleUrl: string): string {
  return fileURLToPath(new URL('../content/', moduleUrl))
}

/** 部署默认产品类型：workspace 的 company.md 优先；没有则读 pack 的出厂 `state/company.md`。 */
export interface CompanyProductType {
  readonly type: string | null
  readonly source: 'workspace' | 'pack' | null
}

/** 从 company.md 读 `productType:`（模板占位 `<...>` 视为未声明）。 */
function readProductType(path: string): string | null {
  if (!existsSync(path)) return null
  try {
    const match = /^productType\s*[:：]\s*(.+)$/m.exec(readFileSync(path, 'utf8'))
    const value = yamlScalar(match?.[1] ?? '')
    return value === '' || (value.startsWith('<') && value.endsWith('>')) ? null : value
  } catch {
    return null
  }
}

/**
 * 解析本次装配要用的产品类型：workspace 的 `kb/company.md` 优先（部署配置），
 * 没有这份盘再读 pack 的 `state/company.md`（首启要播种的出厂值）。
 */
export function resolveCompanyProductType(contentDir: string, workspace: string): CompanyProductType {
  const workspaceCompany = join(workspace, RUN_BUNDLE_REL.kb, 'company.md')
  if (existsSync(workspaceCompany)) return { type: readProductType(workspaceCompany), source: 'workspace' }
  const packCompany = join(contentDir, COMPANY_SOURCE)
  if (existsSync(packCompany)) return { type: readProductType(packCompany), source: 'pack' }
  return { type: null, source: null }
}

/**
 * 读 content/ + 目标 workspace，算出「要建什么」。只读不写。
 * @param contentDir - pack 的 `content/`。
 * @param workspace - 用户 workspace 根（绝对路径）。
 */
export function planBootstrap(contentDir: string, workspace: string): BootstrapPlan {
  const base = { workspace, contentDir, warnings: [] as string[] }
  if (!existsSync(contentDir) || !lstatSync(contentDir).isDirectory()) {
    return { ...base, entries: [], creates: 0, skips: 0, error: `content 目录不存在：${contentDir}` }
  }
  const company = resolveCompanyProductType(contentDir, workspace)
  const { seeds, error, warnings = [] } = readSeeds(contentDir, { productType: company.type })
  if (error !== undefined) return { ...base, entries: [], creates: 0, skips: 0, warnings, error }
  const entries: BootstrapEntry[] = []
  let creates = 0
  let skips = 0
  const add = (entry: BootstrapEntry): void => {
    entries.push(entry)
    if (entry.action === 'create') creates += 1
    else skips += 1
  }
  for (const rel of DIRS) {
    const exists = existsSync(join(workspace, rel))
    add({ rel, kind: 'dir', action: exists ? 'skip' : 'create' })
  }
  for (const seed of seeds) {
    const exists = existsSync(join(workspace, seed.target))
    add({ rel: seed.target, sourceRel: seed.source, kind: 'file', action: exists ? 'skip' : 'create' })
  }
  return { ...base, entries, creates, skips, warnings }
}

/** 读 kb 装配清单；缺源 / target 越界 / 重复 target 都在这里 fail-loud。 */
export interface SeedEntry {
  readonly source: string
  readonly target: string
}

export interface ReadSeedsOptions {
  /** 运行盘 company.md 的 productType；`null` = 未声明。 */
  readonly productType?: string | null
}

export interface SeedReadResult {
  readonly seeds: readonly SeedEntry[]
  readonly error?: string
  readonly warnings?: readonly string[]
}

/** 合法类型 id（与 `/req check` 的盘上目录名口径一致）。 */
const TYPE_ID = /^[a-z][a-z0-9-]*$/

/**
 * 读 kb 装配清单，解析 `{productType}` 占位。类型相关条目缺类型 / 未知类型时
 * **跳过该条并给 warning**（fail-closed：不猜一个类型播种），其余条目照常。
 */
export function readSeeds(contentDir: string, options: ReadSeedsOptions = {}): SeedReadResult {
  const path = join(contentDir, SEED_MANIFEST)
  if (!existsSync(path)) return { seeds: [], error: `缺 kb 装配清单：${SEED_MANIFEST}（安装形状不完整）` }
  let parsed: { seeds?: unknown }
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8')) as { seeds?: unknown }
  } catch (error) {
    return { seeds: [], error: `kb 装配清单不可解析：${(error as Error).message}` }
  }
  const items = Array.isArray(parsed.seeds) ? parsed.seeds : []
  if (items.length === 0) return { seeds: [], error: `kb 装配清单为空：${SEED_MANIFEST}` }
  const productType = options.productType ?? null
  const warnings: string[] = []
  const seeds: SeedEntry[] = []
  const sources = new Set<string>()
  const targets = new Set<string>()
  for (const item of items) {
    const record = item as { source?: unknown; target?: unknown }
    const rawSource = typeof record.source === 'string' ? record.source : ''
    const target = typeof record.target === 'string' ? record.target : ''
    if (rawSource === '' || target === '') return { seeds: [], error: `kb 装配清单条目不完整：${JSON.stringify(item)}` }
    if (isAbsolute(target) || target.split('/').includes('..')) {
      return { seeds: [], error: `kb 装配 target 越界：${target}` }
    }
    if (!target.startsWith(`${RUN_BUNDLE_DIR}/`)) {
      return { seeds: [], error: `kb 装配 target 必须在 ${RUN_BUNDLE_DIR}/ 内：${target}` }
    }
    if (targets.has(target)) return { seeds: [], error: `kb 装配重复 target：${target}` }
    targets.add(target)
    let source = rawSource
    if (source.includes(PRODUCT_TYPE_TOKEN)) {
      if (productType === null || productType === '') {
        warnings.push(`kb 装配条目 ${target} 需要 company.md 的 productType，但 company.md 未声明；跳过该条`)
        continue
      }
      if (!TYPE_ID.test(productType)) {
        warnings.push(`kb 装配条目 ${target} 的 productType「${productType}」不是合法类型 id；跳过该条`)
        continue
      }
      source = source.split(PRODUCT_TYPE_TOKEN).join(productType)
      if (!existsSync(join(contentDir, source))) {
        warnings.push(`kb 装配条目 ${target} 的 productType「${productType}」解析不到 ${source}；跳过该条`)
        continue
      }
    } else if (!existsSync(join(contentDir, source))) {
      return { seeds: [], error: `kb 装配缺源：${source}（${SEED_MANIFEST} 指向的文件不存在）` }
    }
    if (sources.has(source)) return { seeds: [], error: `kb 装配重复 source：${source}` }
    sources.add(source)
    seeds.push({ source, target })
  }
  return { seeds, ...(warnings.length > 0 ? { warnings } : {}) }
}

/**
 * 执行计划：建目录、补缺文件。**只创建，绝不覆盖/截断。**
 * @param plan - {@link planBootstrap} 的产出。
 */
export function applyBootstrap(plan: BootstrapPlan): BootstrapResult {
  const created: string[] = []
  const skipped: string[] = []
  if (plan.error !== undefined) return { created, skipped }
  mkdirSync(plan.workspace, { recursive: true })
  for (const entry of plan.entries) {
    const target = join(plan.workspace, entry.rel)
    if (entry.action === 'skip') {
      skipped.push(entry.rel)
      continue
    }
    if (entry.kind === 'dir') {
      mkdirSync(target, { recursive: true })
    } else {
      mkdirSync(join(target, '..'), { recursive: true })
      try {
        if (entry.content !== undefined) {
          writeFileSync(target, entry.content, { flag: entry.mode === 'replace' ? 'w' : 'wx' })
        } else {
          const source = join(plan.contentDir, entry.sourceRel ?? '')
          writeFileSync(target, readFileSync(source), { flag: 'wx' })
        }
      } catch (error) {
        if ((error as { code?: string }).code !== 'EEXIST') throw error
        skipped.push(entry.rel)
        continue
      }
    }
    created.push(entry.rel)
  }
  return { created, skipped }
}

/** 一步到位（计划 + 执行）。 */
export function bootstrapCompanyWorkspace(
  contentDir: string,
  workspace: string,
): { readonly plan: BootstrapPlan; readonly result: BootstrapResult } {
  const plan = planBootstrap(contentDir, workspace)
  return { plan, result: applyBootstrap(plan) }
}

/** 编制漂移：pack 六角色 vs 工作盘的章程 / 编制表（org.md）/ 归属表（owners.md）。 */
export interface RoleDrift {
  readonly missingCharter: readonly string[]
  readonly missingOrg: readonly string[]
  readonly missingOwners: readonly string[]
}

export interface RoleBackfillPlan extends BootstrapPlan {
  readonly drift: RoleDrift
}

/** 从 canonical `org.md` 切出每角色一节（`### …（ROLE，N）` 起，到下一个 `### ` 前）。 */
function orgSections(text: string): Map<string, string> {
  const sections = new Map<string, string>()
  const lines = text.split('\n')
  let role: string | undefined
  let buffer: string[] = []
  const flush = (): void => {
    if (role !== undefined && buffer.length > 0) sections.set(role, `${buffer.join('\n').replace(/\s+$/, '')}\n\n`)
  }
  for (const line of lines) {
    const heading = /^###\s+[^\n]*[（(]([A-Za-z-]+)[，,]\s*\d+[）)]/.exec(line)
    if (heading !== null) {
      flush()
      role = heading[1]
      buffer = [line]
      continue
    }
    if (line.startsWith('### ')) {
      flush()
      role = undefined
      buffer = []
      continue
    }
    if (role !== undefined) buffer.push(line)
  }
  flush()
  return sections
}

/** 角色 slug → 编制表里的显示名（org/owners 用显示名；canonical 来自 role-copy）。 */
const ROLE_LABEL: Readonly<Record<string, string>> = ROLE_CANONICAL

/** owners.md 里该角色的表格行。 */
const ownersRow = (role: string): RegExp => new RegExp(`^\\|\\s*${role}\\s*\\|`, 'm')

/** 把 canonical 的部门节插到工作盘「下一个角色」标题之前；没有下一个就追加到文末。 */
function mergeOrgSection(workspaceText: string, canonicalText: string, role: string): string | undefined {
  const canonical = orgSections(canonicalText)
  const section = canonical.get(role)
  if (section === undefined) return undefined
  const order = [...canonical.keys()]
  const lines = workspaceText.split('\n')
  for (const next of order.slice(order.indexOf(role) + 1)) {
    const marker = new RegExp(`^###\\s+[^\\n]*[（(]${next}[，,]`)
    const at = lines.findIndex(line => marker.test(line))
    if (at !== -1) return [...lines.slice(0, at), ...section.trimEnd().split('\n'), '', ...lines.slice(at)].join('\n')
  }
  return `${workspaceText.trimEnd()}\n\n${section.trimEnd()}\n`
}

/** 把 canonical 的 CMO 行插到 owners.md 最后一个角色行之后（无表行时插在分隔行后）。 */
function mergeOwnersRow(workspaceText: string, canonicalText: string, role: string): string | undefined {
  if (ownersRow(role).test(workspaceText)) return undefined
  const row = canonicalText.split('\n').find(line => ownersRow(role).test(line))
  if (row === undefined) return undefined
  const lines = workspaceText.split('\n')
  let insertAt = -1
  const anyRoleRow = /^\|\s*(?:CEO|CFO|VP-Sales|VP-Eng|COO|CMO)\s*\|/
  lines.forEach((line, index) => { if (anyRoleRow.test(line)) insertAt = index })
  if (insertAt === -1) {
    const separator = lines.findIndex(line => /^\|[-:|\s]+\|$/.test(line))
    insertAt = separator === -1 ? lines.length - 1 : separator
  }
  return [...lines.slice(0, insertAt + 1), row, ...lines.slice(insertAt + 1)].join('\n')
}

/** 「## N 条线」计数 +1（只在新补了部门时调用）。 */
function bumpLineCount(text: string): string {
  const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  const english = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
  const zh = text.replace(/^(##\s+)([一二三四五六七八九十]+)(条线)/m, (whole, head: string, num: string, tail: string) => {
    const at = digits.indexOf(num)
    return at === -1 || at === digits.length - 1 ? whole : `${head}${digits[at + 1]}${tail}`
  })
  return zh.replace(/^(##\s+)([A-Za-z]+)( lines)/m, (whole, head: string, num: string, tail: string) => {
    const at = english.indexOf(num)
    return at === -1 || at === english.length - 1 ? whole : `${head}${english[at + 1]}${tail}`
  })
}

/**
 * 编制漂移检查计划：只对**已经是公司盘**（有 `.dsh-company/kb`）的 workspace 做，
 * 补齐缺的角色章程、`org.md` 的部门节、`owners.md` 的归属行；只补缺，不覆盖既有内容。
 * @param contentDir - pack 的 `content/`。
 * @param workspace - 被打开会话的 workspace 根（可以是非默认公司盘）。
 */
export function planRoleBackfill(contentDir: string, workspace: string): RoleBackfillPlan {
  const entries: BootstrapEntry[] = []
  const drift = { missingCharter: [] as string[], missingOrg: [] as string[], missingOwners: [] as string[] }
  const base: RoleBackfillPlan = {
    workspace, contentDir, entries, creates: 0, skips: 0, drift, warnings: [],
  }
  if (!existsSync(contentDir) || !lstatSync(contentDir).isDirectory()) {
    return { ...base, error: `content 目录不存在：${contentDir}` }
  }
  const kb = join(workspace, RUN_BUNDLE_REL.kb)
  if (!existsSync(kb) || !lstatSync(kb).isDirectory()) return base
  const canonicalOrgPath = join(contentDir, ORG_SOURCE)
  const canonicalOwnersPath = join(contentDir, OWNERS_SOURCE)
  const canonicalOrg = existsSync(canonicalOrgPath) ? readFileSync(canonicalOrgPath, 'utf8') : ''
  const canonicalOwners = existsSync(canonicalOwnersPath) ? readFileSync(canonicalOwnersPath, 'utf8') : ''
  const orgPath = join(kb, 'org.md')
  const ownersPath = join(kb, 'owners.md')
  let orgText = existsSync(orgPath) ? readFileSync(orgPath, 'utf8') : undefined
  let ownersText = existsSync(ownersPath) ? readFileSync(ownersPath, 'utf8') : undefined
  for (const role of COMPANY_ROLES) {
    const label = ROLE_LABEL[role] ?? role
    const charterRel = `${RUN_BUNDLE_REL.kb}/${role}/CHARTER.md`
    if (!existsSync(join(workspace, charterRel))) {
      const sourceRel = `${CHARTERS_SOURCE}/${role}.md`
      if (existsSync(join(contentDir, sourceRel))) {
        entries.push({ rel: charterRel, sourceRel, kind: 'file', action: 'create' })
        drift.missingCharter.push(role)
      }
    }
    if (orgText !== undefined && canonicalOrg !== '') {
      const hasSection = new RegExp(`^###\\s+[^\\n]*[（(]${label}[，,]\\s*\\d+`, 'm').test(orgText)
      const hasToken = new RegExp(`\\b${label}\\b`, 'i').test(orgText)
      if (!hasSection && !hasToken) {
        const merged = mergeOrgSection(orgText, canonicalOrg, label)
        if (merged !== undefined) {
          orgText = bumpLineCount(merged)
          drift.missingOrg.push(role)
        }
      }
    }
    if (ownersText !== undefined && canonicalOwners !== '') {
      const merged = mergeOwnersRow(ownersText, canonicalOwners, label)
      if (merged !== undefined) {
        ownersText = merged
        drift.missingOwners.push(role)
      }
    }
  }
  if (drift.missingOrg.length > 0 && orgText !== undefined) {
    entries.push({ rel: `${RUN_BUNDLE_REL.kb}/org.md`, kind: 'file', action: 'create', content: orgText, mode: 'replace' })
  }
  if (drift.missingOwners.length > 0 && ownersText !== undefined) {
    entries.push({ rel: `${RUN_BUNDLE_REL.kb}/owners.md`, kind: 'file', action: 'create', content: ownersText, mode: 'replace' })
  }
  return { ...base, entries, creates: entries.length, skips: 0 }
}

/** 执行编制补种（复用 {@link applyBootstrap}；只补缺）。 */
export function applyRoleBackfill(plan: RoleBackfillPlan): BootstrapResult {
  return applyBootstrap(plan)
}

/** 一步到位：检查 + 补种。 */
export function backfillWorkspaceRoles(
  contentDir: string,
  workspace: string,
): { readonly plan: RoleBackfillPlan; readonly result: BootstrapResult } {
  const plan = planRoleBackfill(contentDir, workspace)
  return { plan, result: applyRoleBackfill(plan) }
}

/** 校验 workspace 落点：不能等于/包含 DSH_HOME 或 OS home，必须是目录。 */
export function validateCompanyHome(
  dshHome: string,
  workspace: string,
): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  if (workspace.trim() === '') return { ok: false, error: '未指定 workspace' }
  const canonicalOf = (path: string): string => {
    try { return realpathSync(path) } catch { return resolve(path) }
  }
  const home = canonicalOf(dshHome)
  const osHome = canonicalOf(homedir())
  const target = resolve(workspace)
  let canonical = target
  try {
    if (existsSync(target)) {
      const info = lstatSync(target)
      if (!info.isSymbolicLink() && !info.isDirectory()) return { ok: false, error: `workspace 落点不是目录：${target}` }
      canonical = realpathSync(target)
      if (!lstatSync(canonical).isDirectory()) return { ok: false, error: `workspace 落点不是目录：${canonical}` }
    }
  } catch (error) {
    return { ok: false, error: `workspace 落点读不到：${(error as Error).message}` }
  }
  const isAncestor = (parent: string, child: string): boolean => {
    const rel = relative(parent, child)
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
  }
  if (canonical === home) return { ok: false, error: `workspace 不能等于 DSH_HOME：${canonical}` }
  if (isAncestor(canonical, home)) return { ok: false, error: `workspace 不能包含 DSH_HOME：${canonical}` }
  if (canonical === osHome || isAncestor(canonical, osHome)) {
    return { ok: false, error: `workspace 不能等于/包含 OS home：${canonical}` }
  }
  return { ok: true }
}

/** 列出 run bundle 里的相对文件（诊断/测试用）。 */
export function listRunBundleFiles(workspace: string): string[] {
  const root = join(workspace, RUN_BUNDLE_REL.root)
  if (!existsSync(root)) return []
  const out: string[] = []
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const child = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else out.push(toPosix(`${RUN_BUNDLE_DIR}/${child}`))
    }
  }
  walk('')
  return out.sort()
}
