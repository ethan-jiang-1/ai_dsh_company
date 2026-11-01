/**
 * 出厂公司盘骨架的**首启自举** + **workspace 解析/seed 同意**（2026-11-01 产品化改版）。
 *
 * 产品化后的纪律：
 * - **workspace 必须显式**：`DSH_COMPANY_HOME`（启动器设置）或显式 override；没有默认
 *   `<DSH_HOME>/company-workspace`。没有 workspace 时 host 不写盘（由调用方 dataBlocked）。
 * - **seed 要同意**：新 workspace 只有 `.dsh-company/.seed-consent` 匹配（workspace + pack 版本）
 *   或盘上已有公司标记时才写；直接 boot 无 consent 只告警、不写身份。
 * - **只补缺**：目标已存在的一律 skip；绝不覆盖/截断。
 * - **手册碰撞感知**：`AGENTS.md` 优先；若已有 `AGENTS.md`，手册写到 `COMPANY.md`。
 * - **不抛**：骨架缺失/无权限返回带 `error` 的空计划；apply 期抛错会连累应用（postmortem 0003）。
 * - **可重入**：同一目标重复调用 = 第二次全 skip。
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { expandHomePath } from '@deepseek-ai/dsh-home-paths'
import { canonicalPath } from './paths.ts'

const env = (name: string): string | undefined => (process.env as Record<string, string | undefined>)[name]

/** 手册源文件名（pack 骨架里的唯一真源）。 */
export const HANDBOOK_SOURCE = 'AGENTS.md'
/** 已有项目里 `AGENTS.md` 被占用时的公司手册目标名。 */
export const HANDBOOK_FALLBACK = 'COMPANY.md'
export type HandbookTarget = typeof HANDBOOK_SOURCE | typeof HANDBOOK_FALLBACK

/** seed 同意文件（相对 workspace 根，点目录不参与骨架）。 */
export const SEED_CONSENT_REL = '.dsh-company/.seed-consent'
export const SEED_CONSENT_VERSION = 1

export interface SeedConsent {
  readonly v: typeof SEED_CONSENT_VERSION
  readonly packVersion: string
  readonly workspace: string
  readonly consentedAt: string
}

/** 计划里的一条（相对公司盘根）。 */
export interface BootstrapEntry {
  /** 相对公司盘的**目标**路径（POSIX 分隔符，便于日志与断言）。 */
  readonly rel: string
  /** 目标路径不存在时内容从哪个骨架文件读；缺省 = rel。 */
  readonly sourceRel?: string
  readonly kind: 'dir' | 'file'
  readonly action: 'create' | 'skip'
}

/** 落盘计划：`error` 非空时 entries 为空（骨架不可用），调用方只记日志、不写盘。 */
export interface BootstrapPlan {
  readonly companyHome: string
  readonly skeletonDir: string
  readonly handbookTarget: HandbookTarget
  readonly entries: readonly BootstrapEntry[]
  readonly creates: number
  readonly skips: number
  readonly error?: string
}

/** 执行结果。 */
export interface BootstrapResult {
  readonly created: readonly string[]
  readonly skipped: readonly string[]
}

const toPosix = (path: string): string => path.split(sep).join('/')

/** 递归收集骨架里的目录与文件（排序；跳过 dotfile 与手册源——手册单独按碰撞处理）。 */
function collect(skeletonDir: string, rel = ''): { rel: string; kind: 'dir' | 'file' }[] {
  const out: { rel: string; kind: 'dir' | 'file' }[] = []
  const entries: Dirent[] = readdirSync(join(skeletonDir, rel), { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`
    if (child === HANDBOOK_SOURCE) continue
    if (entry.isDirectory()) {
      out.push({ rel: child, kind: 'dir' })
      out.push(...collect(skeletonDir, child))
    } else if (entry.isFile()) {
      out.push({ rel: child, kind: 'file' })
    }
  }
  return out
}

/**
 * 选公司手册目标：`AGENTS.md` 不存在 → `AGENTS.md`；已存在且 `COMPANY.md` 不存在 →
 * `COMPANY.md`；两者都在 → `COMPANY.md`（已存在，seed 会 skip）。
 * @param companyHome - 目标公司盘。
 */
export function chooseHandbookTarget(companyHome: string): HandbookTarget {
  if (!existsSync(join(companyHome, HANDBOOK_SOURCE))) return HANDBOOK_SOURCE
  return HANDBOOK_FALLBACK
}

/**
 * 读骨架 + 读目标盘，算出"要建什么"。**只读不写**。
 * @param skeletonDir - 出厂骨架目录（pack 内 `workspace/`）。
 * @param companyHome - 目标公司盘（必须是显式解析出来的绝对路径）。
 * @param handbookTarget - 可选；缺省按碰撞选择。
 * @returns 计划；骨架不可用时带 `error`。
 */
export function planBootstrap(
  skeletonDir: string,
  companyHome: string,
  handbookTarget?: HandbookTarget,
): BootstrapPlan {
  const target = handbookTarget ?? chooseHandbookTarget(companyHome)
  const base = { companyHome, skeletonDir, handbookTarget: target }
  if (!existsSync(skeletonDir) || !lstatSync(skeletonDir).isDirectory()) {
    return { ...base, entries: [], creates: 0, skips: 0, error: `骨架目录不存在：${skeletonDir}` }
  }
  let items: { rel: string; kind: 'dir' | 'file' }[]
  try {
    items = collect(skeletonDir, '')
  } catch (error) {
    return { ...base, entries: [], creates: 0, skips: 0, error: `骨架读不动：${(error as Error).message}` }
  }
  const entries: BootstrapEntry[] = []
  let creates = 0
  let skips = 0
  const add = (entry: BootstrapEntry): void => {
    entries.push(entry)
    if (entry.action === 'create') creates += 1
    else skips += 1
  }
  for (const item of items) {
    const exists = existsSync(join(companyHome, item.rel))
    add({ rel: toPosix(item.rel), kind: item.kind, action: exists ? 'skip' : 'create' })
  }
  // 手册：目标可能是 AGENTS.md 或 COMPANY.md；内容始终来自骨架的 AGENTS.md。
  const handbookExists = existsSync(join(companyHome, target))
  add({
    rel: target,
    sourceRel: HANDBOOK_SOURCE,
    kind: 'file',
    action: handbookExists ? 'skip' : 'create',
  })
  return { ...base, entries, creates, skips }
}

/**
 * 执行计划：建目录、补缺文件（内容取自骨架）。**只创建，绝不覆盖/截断已有文件。**
 * @param plan - {@link planBootstrap} 的产出。
 * @returns 实建与跳过的路径清单。
 */
export function applyBootstrap(plan: BootstrapPlan): BootstrapResult {
  const created: string[] = []
  const skipped: string[] = []
  if (plan.error !== undefined) return { created, skipped }
  mkdirSync(plan.companyHome, { recursive: true })
  for (const entry of plan.entries) {
    const target = join(plan.companyHome, entry.rel)
    if (entry.action === 'skip') {
      skipped.push(entry.rel)
      continue
    }
    if (entry.kind === 'dir') mkdirSync(target, { recursive: true })
    else {
      mkdirSync(join(target, '..'), { recursive: true })
      // 'wx' = 目标已存在就失败（并发/竞态下的第二道保险：绝不覆盖）
      try {
        const source = join(plan.skeletonDir, entry.sourceRel ?? entry.rel)
        writeFileSync(target, readFileSync(source), { flag: 'wx' })
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

/** 一步到位（计划 + 执行）；调用方拿结果记一行日志即可。 */
export function bootstrapCompanyWorkspace(
  skeletonDir: string,
  companyHome: string,
  handbookTarget?: HandbookTarget,
): { readonly plan: BootstrapPlan; readonly result: BootstrapResult } {
  const plan = planBootstrap(skeletonDir, companyHome, handbookTarget)
  return { plan, result: applyBootstrap(plan) }
}

/**
 * 骨架目录 = **包根**下的 `workspace/`（`lib/index.js` 的上一级）。
 * ⚠ 只此一条路：首版接线把"已解出的 workspace 路径"又喂给一个会再拼 `workspace` 的助手，
 * 结果指向 `<pack>/workspace/workspace`——**在真实例里静默失败**（只留一行 warn）。
 * @param moduleUrl - host 入口的 `import.meta.url`（形如 `<pack>/lib/index.js`）。
 */
export function resolveSkeletonDir(moduleUrl: string): string {
  return fileURLToPath(new URL('../workspace/', moduleUrl))
}

/**
 * 目标公司盘：显式值 / `DSH_COMPANY_HOME`。**没有默认落点**。
 *
 * 归一规则与 `resolveDshHome` 同口径：`~` / `~/` 展开、相对路径按当前工作目录绝对化、
 * 空白值视为未设置。产品入口由启动器在 boot 前设 `DSH_COMPANY_HOME`；没有时 host 不写盘。
 * @param _dshHome - 保留参数（旧签名兼容/测试注入）；不再用于拼默认盘。
 * @param override - 显式覆盖（测试/启动器）。
 * @returns 绝对路径；未设置返回 undefined。
 */
export function resolveCompanyHome(_dshHome: string, override?: string): string | undefined {
  const raw = (override ?? env('DSH_COMPANY_HOME'))?.trim()
  if (raw === undefined || raw === '') return undefined
  return resolve(expandHomePath(raw))
}

/**
 * 校验公司盘落点是否是“安全的独立目录”。
 *
 * `DSH_COMPANY_HOME=$DSH_HOME` 会把 `kb/`、`templates/` 写进 home 根；`DSH_COMPANY_HOME=$HOME`
 * 会污染 OS home。被拒绝的只有“等于/包含 home 或 OS home”的危险值，以及指向普通文件的落点。
 * @param dshHome - 当前 DSH home。
 * @param companyHome - 解析后的公司盘落点；空值 = 未指定。
 * @returns 合法，或一句可操作原因。
 */
export function validateCompanyHome(
  dshHome: string,
  companyHome: string,
): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  if (companyHome.trim() === '') return { ok: false, error: '未指定公司 workspace（DSH_COMPANY_HOME 为空）' }
  const canonicalOf = (path: string): string => {
    try { return realpathSync(path) } catch { return resolve(path) }
  }
  const home = canonicalOf(dshHome)
  const osHome = canonicalOf(homedir())
  const target = resolve(companyHome)
  let canonical = target
  try {
    if (existsSync(target)) {
      const info = lstatSync(target)
      if (!info.isSymbolicLink() && !info.isDirectory()) return { ok: false, error: `公司盘落点不是目录：${target}` }
      canonical = realpathSync(target)
      if (!lstatSync(canonical).isDirectory()) return { ok: false, error: `公司盘落点不是目录：${canonical}` }
    }
  } catch (error) {
    return { ok: false, error: `公司盘落点读不到：${(error as Error).message}` }
  }
  const isAncestor = (parent: string, child: string): boolean => {
    const rel = relative(parent, child)
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
  }
  if (canonical === home) return { ok: false, error: `公司盘落点不能等于 DSH_HOME：${canonical}` }
  if (isAncestor(canonical, home)) return { ok: false, error: `公司盘落点不能包含 DSH_HOME：${canonical}` }
  if (canonical === osHome || isAncestor(canonical, osHome)) {
    return { ok: false, error: `公司盘落点不能等于/包含 OS home：${canonical}` }
  }
  return { ok: true }
}

/** 自举开关：`DSH_COMPANY_BOOTSTRAP=off` 关闭（我们的 dev/排练场不需要它时用）。 */
export function bootstrapEnabled(): boolean {
  return env('DSH_COMPANY_BOOTSTRAP') !== 'off'
}

/** seed 同意文件绝对路径。 */
export const seedConsentPath = (companyHome: string): string => join(companyHome, SEED_CONSENT_REL)

/** 盘上是否已有“这是公司盘”的标记（`AGENTS.md` / `COMPANY.md` / `kb/company.md`）。 */
export function hasCompanyMarker(companyHome: string): boolean {
  return existsSync(join(companyHome, 'AGENTS.md'))
    || existsSync(join(companyHome, 'COMPANY.md'))
    || existsSync(join(companyHome, 'kb/company.md'))
}

/** 读 seed 同意；缺失/坏形状/版本不符返回 undefined（不抛）。 */
export function readSeedConsent(companyHome: string): SeedConsent | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(seedConsentPath(companyHome), 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    const value = parsed as Record<string, unknown>
    if (value.v !== SEED_CONSENT_VERSION
      || typeof value.packVersion !== 'string' || value.packVersion.trim() === ''
      || typeof value.workspace !== 'string' || value.workspace.trim() === ''
      || typeof value.consentedAt !== 'string' || value.consentedAt.trim() === '') return undefined
    return value as unknown as SeedConsent
  } catch {
    return undefined
  }
}

/** 写 seed 同意（启动器在用户确认后调用；host 只读）。 */
export function writeSeedConsent(
  companyHome: string,
  packVersion: string,
  now: Date = new Date(),
): SeedConsent {
  const consent: SeedConsent = {
    v: SEED_CONSENT_VERSION,
    packVersion,
    workspace: companyHome,
    consentedAt: now.toISOString(),
  }
  mkdirSync(join(companyHome, '.dsh-company'), { recursive: true })
  writeFileSync(seedConsentPath(companyHome), `${JSON.stringify(consent, null, 2)}\n`, { flag: 'w' })
  return consent
}

/**
 * 是否允许 seed：开关打开，且（盘上已有公司标记 或 consent 的 workspace/packVersion 匹配）。
 * @param companyHome - 目标盘（绝对）。
 * @param packVersion - 当前 pack 版本。
 */
export function seedAllowed(companyHome: string, packVersion: string): boolean {
  if (!bootstrapEnabled()) return false
  if (hasCompanyMarker(companyHome)) return true
  const consent = readSeedConsent(companyHome)
  return consent !== undefined
    && canonicalPath(consent.workspace) === canonicalPath(companyHome)
    && consent.packVersion === packVersion
}
