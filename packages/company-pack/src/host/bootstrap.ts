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
import { RUN_BUNDLE_DIR, RUN_BUNDLE_REL } from './run-bundle.ts'

/** 六角色（researcher 没有 CHARTER）。 */
export const COMPANY_ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo'] as const

/** 默认章程源目录（pack 内）。 */
const CHARTERS_SOURCE = 'charters'
/** 状态实例默认值源目录（pack 内）。 */
const STATE_SOURCE = 'state'

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
  readonly error?: string
}

export interface BootstrapResult {
  readonly created: readonly string[]
  readonly skipped: readonly string[]
}

const toPosix = (path: string): string => path.split(sep).join('/')

/** 状态实例：源文件 -> run bundle 目标。 */
const STATE_FILES: readonly { source: string; target: string }[] = [
  { source: `${STATE_SOURCE}/company.md`, target: `${RUN_BUNDLE_REL.kb}/company.md` },
  { source: `${STATE_SOURCE}/org.md`, target: `${RUN_BUNDLE_REL.kb}/org.md` },
  { source: `${STATE_SOURCE}/owners.md`, target: `${RUN_BUNDLE_REL.kb}/owners.md` },
  { source: `${STATE_SOURCE}/motion-ledger.md`, target: `${RUN_BUNDLE_REL.kb}/motion-ledger.md` },
  // 编号合同（A7）：fresh 盘 seed；既有盘只在缺失时补种，用户迁移过的版本一个字节不覆盖。
  { source: `${STATE_SOURCE}/process-docs.md`, target: `${RUN_BUNDLE_REL.kb}/process-docs.md` },
]

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

/** run bundle README（生成的说明，不是 pack 内容副本）。 */
const RUN_BUNDLE_README = `# .dsh-company · run bundle

这个目录属于当前公司/项目，**不是插件内容**。插件的人格、skills、公司手册、模板与默认章程
住在安装包内；这里只放运行状态与产物：

- \`kb/company.md\`、\`org.md\`、\`owners.md\`、\`motion-ledger.md\`：公司/编制/台账
- \`kb/<role>/CHARTER.md\`、\`kb/<role>/journal/\`：角色章程与当轮纪要
- \`deliverables/\`、\`deliverables-archive/\`：过程稿与定稿
- \`cultivation/records/\`：培养记录
- \`bundle.json\`：run bundle 身份
- \`logs/\`、\`exports/\`：升级日志与治理只读导出
- \`overrides/\`：可选的模板/章程覆盖（默认内容在插件包内）

方法层与 presented 审计账本的权威在 \`DSH_HOME/company/\`，不在这里；\`exports/\` 只是派生快照。
`

/**
 * 内容目录 = pack 根下的 `content/`（`lib/index.js` 的上一级）。
 * @param moduleUrl - host 入口的 `import.meta.url`。
 */
export function resolveContentDir(moduleUrl: string): string {
  return fileURLToPath(new URL('../content/', moduleUrl))
}

/**
 * 读 content/ + 目标 workspace，算出「要建什么」。只读不写。
 * @param contentDir - pack 的 `content/`。
 * @param workspace - 用户 workspace 根（绝对路径）。
 */
export function planBootstrap(contentDir: string, workspace: string): BootstrapPlan {
  const base = { workspace, contentDir }
  if (!existsSync(contentDir) || !lstatSync(contentDir).isDirectory()) {
    return { ...base, entries: [], creates: 0, skips: 0, error: `content 目录不存在：${contentDir}` }
  }
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
  for (const item of STATE_FILES) {
    const source = join(contentDir, item.source)
    if (!existsSync(source)) continue
    const exists = existsSync(join(workspace, item.target))
    add({ rel: item.target, sourceRel: item.source, kind: 'file', action: exists ? 'skip' : 'create' })
  }
  for (const role of COMPANY_ROLES) {
    const sourceRel = `${CHARTERS_SOURCE}/${role}.md`
    const source = join(contentDir, sourceRel)
    if (!existsSync(source)) continue
    const target = `${RUN_BUNDLE_REL.kb}/${role}/CHARTER.md`
    const exists = existsSync(join(workspace, target))
    add({ rel: target, sourceRel, kind: 'file', action: exists ? 'skip' : 'create' })
  }
  // 生成的 run bundle 说明；从不覆盖。
  const readmeTarget = RUN_BUNDLE_REL.readme
  add({
    rel: readmeTarget,
    kind: 'file',
    action: existsSync(join(workspace, readmeTarget)) ? 'skip' : 'create',
  })
  return { ...base, entries, creates, skips }
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
        if (entry.rel === RUN_BUNDLE_REL.readme) {
          writeFileSync(target, RUN_BUNDLE_README, { flag: 'wx' })
        } else if (entry.content !== undefined) {
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

/** 角色 slug → 编制表里的显示名（org/owners 用显示名）。 */
const ROLE_LABEL: Readonly<Record<string, string>> = {
  ceo: 'CEO', 'vp-eng': 'VP-Eng', 'vp-sales': 'VP-Sales', coo: 'COO', cfo: 'CFO', cmo: 'CMO',
}

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
  return text.replace(/^(##\s+)([一二三四五六七八九十]+)(条线)/m, (whole, head: string, num: string, tail: string) => {
    const at = digits.indexOf(num)
    return at === -1 || at === digits.length - 1 ? whole : `${head}${digits[at + 1]}${tail}`
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
    workspace, contentDir, entries, creates: 0, skips: 0, drift,
  }
  if (!existsSync(contentDir) || !lstatSync(contentDir).isDirectory()) {
    return { ...base, error: `content 目录不存在：${contentDir}` }
  }
  const kb = join(workspace, RUN_BUNDLE_REL.kb)
  if (!existsSync(kb) || !lstatSync(kb).isDirectory()) return base
  const canonicalOrgPath = join(contentDir, `${STATE_SOURCE}/org.md`)
  const canonicalOwnersPath = join(contentDir, `${STATE_SOURCE}/owners.md`)
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
