/**
 * 运行前提守卫（2026-11-01 v3）。
 *
 * - workspace 由 `DSH_COMPANY_HOME` / 启动 cwd / saved 解析；不再由 launcher/TTY 提供；
 * - 没有 workspace 时不写盘：应用照常起，等 Client picker 选目录后由可见的 session/onboarding
 *   路径再初始化（本模块只表达“当前没有”的停写态）；
 * - manifest 在 `<workspace>/.dsh-company/bundle.json`（v3）；v2 只警告待升级，不阻塞；
 * - 方法层/账本留 home（D25/M2）；workspace 只放 run bundle；
 * - 没有 workspace / manifest 坏 / lease 败时 dataBlocked = 停写公司数据（DSH 会话仍可用）。
 *
 * 边界：只做启动前提与 lease effect；不注册工具/命令、不写业务数据。
 */
import type { Context } from '@deepseek-ai/cordis'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateCompanyHome } from '../run-bundle/bootstrap.ts'
import { readBundleManifestState, type BundleManifestState } from '../run-bundle/bundle-manifest.ts'
import { acquireCompanyLease } from '../run-bundle/lease.ts'
import { profilesWithCompanyPack } from '../run-bundle/profiles.ts'
import { canonicalPath } from '../run-bundle/paths.ts'
import { readSavedWorkspace, resolveWorkspace, writeSavedWorkspace, type WorkspaceSource } from '../workspace/workspace-resolution.ts'

/** 一次 apply 的运行前提（后续注册与自举都从这里取事实）。 */
export interface CompanyRuntime {
  readonly dshHome: string
  /** 解析到的 workspace（绝对 canonical）；没有时为空串。 */
  readonly workspace: string
  /** 兼容旧调用点的别名；新代码用 `workspace`。 */
  readonly expectedWorkspace: string
  readonly source: WorkspaceSource
  readonly dataBlocked: boolean
  readonly bundleState: BundleManifestState | undefined
  readonly hasWorkspace: boolean
  readonly resolutionError?: string
  /** `dataBlocked` 的人可读原因（BUG-058）；false 时为 undefined。 */
  readonly blockedReason?: string
}

/** 告警落 logger + stderr（启动输出里必须能看到数据分裂/停写风险）。 */
function warn(ctx: Context, message: string): void {
  ctx.logger?.warn?.(message)
  process.stderr.write(`dsh: ${message}\n`)
}

/** 解析并校验运行前提；告警直接落 logger/stderr，不抛错（停写由 dataBlocked 表达）。 */
export function prepareCompanyRuntime(ctx: Context): CompanyRuntime {
  const dshHome = resolveDshHome()
  let dataBlocked = false
  let blockedReason: string | undefined
  const block = (reason: string): void => {
    blockedReason = blockedReason === undefined ? reason : `${blockedReason}；${reason}`
    dataBlocked = true
  }

  const resolution = resolveWorkspace({ dshHome })
  if (resolution.savedProblem === 'corrupt') {
    warn(ctx, 'company-pack：最近 workspace 设置损坏（company/settings.json），已忽略；从项目目录启动或重新选择 workspace 会覆盖它')
  }
  if (resolution.workspace === undefined) {
    const why = resolution.source === 'env'
      ? (resolution.error ?? 'DSH_COMPANY_HOME 无效')
      : '未指定 workspace（DSH_COMPANY_HOME 为空，cwd 不是可用项目目录，也没有已保存选择）'
    warn(ctx, `company-pack：${why}；本次不写 run bundle/身份/登记，也不取 lease。`
      + '在项目目录执行 `dsh --profile company`、设 DSH_COMPANY_HOME，或从侧栏选择 workspace。')
    return {
      dshHome,
      workspace: '',
      expectedWorkspace: '',
      source: resolution.source,
      dataBlocked: true,
      bundleState: undefined,
      hasWorkspace: false,
      blockedReason: why,
      ...(resolution.error === undefined ? {} : { resolutionError: resolution.error }),
    }
  }

  // 有 workspace 才需要 writer 锁：没有 workspace 时本模块不写任何公司数据（「零写」含 lease 文件）。
  // 2026-11-03 第六轮：此前 lease 在 workspace 解析之前取，无 workspace 也会在 home 根落锁文件，
  // 与 README/profile 的「无 workspace 时零写」相反。
  const lease = acquireCompanyLease(dshHome)
  if (!lease.acquired) {
    warn(ctx, `company-pack：${lease.reason}；公司数据已停写（DSH 会话仍可用），先关掉另一个 writer`)
    block(`writer lease 被占用：${lease.reason}`)
  } else {
    if (lease.warning !== undefined) warn(ctx, `company-pack：${lease.warning}`)
    const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
    if (typeof effect === 'function') effect.call(ctx, () => () => lease.release())
  }

  // 文档承诺的「最近选择」tier（README / profile / data-model）：解析到就记住，下次从别的 cwd 启动也能回到它。
  // 只在 lease 到手（未被停写）且来源不是 saved 时写；内容未变不重写（避免每次启动 mtime 抖动）。
  // 写失败只告警，不影响本次启动——便利设置不是启动前提。
  if (lease.acquired && resolution.source !== 'saved') {
    try {
      if (readSavedWorkspace(dshHome).workspace !== resolution.workspace) writeSavedWorkspace(dshHome, resolution.workspace)
    } catch (error) {
      warn(ctx, `company-pack：记住最近 workspace 失败（不影响本次启动）：${String((error as { message?: string })?.message ?? error)}`)
    }
  }

  const configured = resolution.workspace
  const check = validateCompanyHome(dshHome, configured)
  if (!check.ok) {
    warn(ctx, `company-pack：workspace 落点不安全（${check.error}）；公司数据已停写`)
    block(`workspace 落点不安全：${check.error}`)
  }
  if (!existsSync(configured)) {
    warn(ctx, `company-pack：workspace 不存在：${configured}；本次不写盘。`)
    return {
      dshHome,
      workspace: configured,
      expectedWorkspace: configured,
      source: resolution.source,
      dataBlocked: true,
      bundleState: undefined,
      hasWorkspace: false,
      blockedReason: `workspace 不存在：${configured}`,
    }
  }

  const workspace = canonicalPath(configured)
  const bundleState = readBundleManifestState(workspace)
  if (bundleState.status === 'corrupt') {
    warn(ctx, `company-pack：bundle.json 损坏，已保留原文件并停写公司数据（${bundleState.path}：${bundleState.error}）；`
      + `修好后重启，或从 home 身份备份恢复（${join(dshHome, 'company/identity')}/<bundle-id>.json，仅作恢复参考）`)
    block(`bundle.json 损坏：${bundleState.error}`)
  }
  if (bundleState.status === 'unsupported') {
    warn(ctx, `company-pack：bundle.json 是更高版本（v${String(bundleState.version)}，本包支持 v3），`
      + '已保留原文件并跳过身份/升级；请安装匹配的新版 pack，或从备份恢复 manifest')
    block(`bundle.json 版本不支持：v${String(bundleState.version)}（本包支持 v3）`)
  }
  if (bundleState.status === 'legacy') {
    ctx.logger?.info?.('company-pack：检测到 v2 run bundle 身份；本次原地升级为 v3（旧文件备份 bundle.v2.json）')
  }

  // check.ok=false 已在上面 block()；保留这一行只防后续分支漏判（幂等）。
  if (!check.ok) dataBlocked = true
  try {
    const profiles = profilesWithCompanyPack(join(dshHome, 'profiles'))
    if (profiles.length > 1) {
      warn(ctx, `company-pack：同一个 home 里有 ${String(profiles.length)} 个 profile 装了本包`
        + `（${profiles.join('、')}）；方法层/记录/账本都是公司级共享；建议固定一个 company profile`)
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack profile 体检跳过（不影响运行）：${(error as Error).message}`)
  }

  return {
    dshHome,
    workspace,
    expectedWorkspace: workspace,
    source: resolution.source,
    dataBlocked,
    bundleState,
    hasWorkspace: true,
    ...(blockedReason === undefined ? {} : { blockedReason }),
  }
}
