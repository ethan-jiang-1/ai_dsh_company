/**
 * 出厂公司盘骨架的**首启自举**（2026-10-13 立，用户点名：「如果 company-workspace 不在，你需要
 * 建立一下；当然建立好了就不用再建立了」）。
 *
 * 分工：本模块是**纯逻辑 + fs**（计划 → 执行，两步都可单独测）；host 入口只负责"何时调"。
 *
 * 纪律（三条，缺一条就会咬人）：
 * - **只补缺**：目标已存在的一律 skip——已有公司盘（尤其是本仓 `company-workspace/`，里面的制度件
 *   还是符号链接）绝不会被覆盖或改写成副本。
 * - **不抛**：骨架缺失/无权限时返回带 `error` 的空计划，由调用方记一行日志——插件在 apply 期抛错
 *   会连累整个应用（postmortem 0003 的教训），首发自举不该有这种破坏面。
 * - **可重入**：同一目标重复调用 = 第二次全 skip（"建立好了就不用再建立了"的机器判据）。
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { expandHomePath } from '@deepseek-ai/dsh-home-paths'

/**
 * 环境面（两个旋钮）：
 * - `DSH_COMPANY_HOME`：公司盘落点（默认 `<DSH_HOME>/company-workspace`）。
 * - `DSH_COMPANY_BOOTSTRAP=off`：关掉自举（**自管盘的部署**用；本仓 dev home 在 `run/env.sh` 里关）。
 * ⚠ 刻意不走 plugin Config/schemastery：本仓 dev home 的 profile patch 是 gitignored（改不进 git），
 * 而 env 在 `run/env.sh`（tracked）就能表达"我们自管盘"；旋钮涨到三个以上再升级成 Config。
 * （vendor 的 env 类型只声明 `DSH_CLIENT_*`/`NODE_ENV`，所以这里显式收窄读取面。）
 */
const env = (name: string): string | undefined => (process.env as Record<string, string | undefined>)[name]

/** 计划里的一条（相对公司盘根）。 */
export interface BootstrapEntry {
  /** 相对公司盘的路径（POSIX 分隔符，便于日志与断言）。 */
  readonly rel: string
  readonly kind: 'dir' | 'file'
  readonly action: 'create' | 'skip'
}

/** 落盘计划：`error` 非空时 entries 为空（骨架不可用），调用方只记日志、不写盘。 */
export interface BootstrapPlan {
  readonly companyHome: string
  readonly skeletonDir: string
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

/** 递归收集骨架里的目录与文件（排序；跳过 dotfile——`.gitkeep` 之类的占位不进目标盘）。 */
function collect(skeletonDir: string, rel = ''): { rel: string; kind: 'dir' | 'file' }[] {
  const out: { rel: string; kind: 'dir' | 'file' }[] = []
  const entries: Dirent[] = readdirSync(join(skeletonDir, rel), { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`
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
 * 读骨架 + 读目标盘，算出"要建什么"。**只读不写**。
 * @param skeletonDir - 出厂骨架目录（pack 内 `workspace/`）。
 * @param companyHome - 目标公司盘（默认 `<DSH_HOME>/company-workspace`）。
 * @returns 计划；骨架不可用时带 `error`。
 */
export function planBootstrap(skeletonDir: string, companyHome: string): BootstrapPlan {
  const base = { companyHome, skeletonDir }
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
  for (const item of items) {
    const target = join(companyHome, item.rel)
    let exists = false
    try {
      exists = existsSync(target)
    } catch {
      exists = false
    }
    const action = exists ? 'skip' : 'create'
    if (exists) skips += 1
    else creates += 1
    entries.push({ rel: toPosix(item.rel), kind: item.kind, action })
  }
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
        writeFileSync(target, readFileSync(join(plan.skeletonDir, entry.rel)), { flag: 'wx' })
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
export function bootstrapCompanyWorkspace(skeletonDir: string, companyHome: string): {
  readonly plan: BootstrapPlan
  readonly result: BootstrapResult
} {
  const plan = planBootstrap(skeletonDir, companyHome)
  return { plan, result: applyBootstrap(plan) }
}

/**
 * 骨架目录 = **包根**下的 `workspace/`（`lib/index.js` 的上一级）。
 * ⚠ 只此一条路：首版接线把"已解出的 workspace 路径"又喂给一个会再拼 `workspace` 的助手，
 * 结果指向 `<pack>/workspace/workspace`——**在真实例里静默失败**（只留一行 warn），
 * 靠模拟安装（release-smoke ⑥）才抓出来。本函数与它的 keyless 断言就是那道防复发。
 * @param moduleUrl - host 入口的 `import.meta.url`（形如 `<pack>/lib/index.js`）。
 * @returns 骨架绝对路径（不校验存在性——由 planBootstrap 报"骨架目录不存在"）。
 */
export function resolveSkeletonDir(moduleUrl: string): string {
  return fileURLToPath(new URL('../workspace/', moduleUrl))
}

/**
 * 目标公司盘：显式值 > `DSH_COMPANY_HOME` > `<DSH_HOME>/company-workspace`。
 *
 * 归一规则与 `resolveDshHome` 同口径：`~` / `~/` 展开、相对路径按当前工作目录绝对化、
 * 空白值视为未设置。**不能把 env 原样返回**——相对/带 `~` 的值会让落点随 cwd 漂移，
 * 并让 `bundle.json.workspace` 记下一个不可复现的字符串（2026-10-26 实测）。
 * @param dshHome - `dshHomePath()` 的根（由 host 入口注入，便于测试）。
 * @param override - 显式覆盖（目前只有 env 面）。
 * @returns 绝对路径（默认落点也基于传入的 dshHome）。
 */
export function resolveCompanyHome(dshHome: string, override?: string): string {
  const raw = (override ?? env('DSH_COMPANY_HOME'))?.trim()
  if (raw === undefined || raw === '') return join(dshHome, 'company-workspace')
  return resolve(expandHomePath(raw))
}

/**
 * 校验公司盘落点是否是“安全的独立目录”。
 *
 * 为什么不能只 resolve：`DSH_COMPANY_HOME=$DSH_HOME` 会把 `kb/`、`templates/` 写进 home 根；
 * `DSH_COMPANY_HOME=$HOME` 会污染 OS home。默认落点 `<DSH_HOME>/company-workspace` 是 home 的子目录，
 * 合法；被拒绝的只有“等于/包含 home 或 OS home”的危险值，以及指向普通文件的落点。
 * @param dshHome - 当前 DSH home。
 * @param companyHome - 解析后的公司盘落点。
 * @returns 合法，或一句可操作原因。
 */
export function validateCompanyHome(dshHome: string, companyHome: string): { readonly ok: true } | { readonly ok: false; readonly error: string } {
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
