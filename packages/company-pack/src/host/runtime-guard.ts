/**
 * 公司盘守卫与 run bundle 身份（2026-10-27 R3-21 自 `index.ts` 的 `apply` 拆出，逐字搬家）：
 * 解析 DSH_HOME / 公司盘、校验落点、拿 writer lease、读/换 bundle 身份、点名同 home 多 profile。
 *
 * 为什么要拆：这段 100 行的「先决条件 + 副作用」原先嵌在 425 行的 `apply` 里，注册面（工具/命令）
 * 与运行前提混在一个函数；拆出后 `apply` 只做编排，守卫的判据与告警文案在这里一处维护。
 * 边界：只做**启动前提与一次性副作用**（告警、rebind、lease effect），不注册工具/命令、不写公司业务数据。
 */
import type { Context } from '@deepseek-ai/cordis'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { join } from 'node:path'
import { resolveCompanyHome, validateCompanyHome } from './bootstrap.ts'
import {
  applyWorkspaceRebind,
  planWorkspaceRebind,
  pruneBundleBackups,
  readBundleManifestState,
  rebindEnabled,
  resolveRecordedWorkspace,
} from './bundle-manifest.ts'
import { acquireCompanyLease } from './lease.ts'
import { profilesWithCompanyPack } from './profiles.ts'
import { canonicalPath } from './paths.ts'

/** 一次 apply 的运行前提（后续注册与自举都从这里取事实）。 */
export interface CompanyRuntime {
  readonly bundleHome: string
  readonly companyHome: string
  readonly expectedWorkspace: string
  readonly dataBlocked: boolean
  readonly bundleState: ReturnType<typeof readBundleManifestState>
  /** 本次是否处于「记录盘 ≠ 当前解析盘」的搬家未完成态（后续段落据此给搬家指针）。 */
  readonly rebound: boolean
}

/** 解析并校验运行前提；告警直接落 logger/stderr，不抛错（停写由 dataBlocked 表达）。 */
export function prepareCompanyRuntime(ctx: Context): CompanyRuntime {
  // ── 盘守卫（卡 6 + 2026-10-27 数据模型对齐 P0）──────────────────────────────
  // 公司数据只认 bundle 的公司盘根：session header.cwd 在子目录/盘外都不能写公司数据。
  // bundle.json 的 workspace 是权威；没有身份时退回 DSH_COMPANY_HOME/companyHome。
  // 换盘默认硬阻断，只有显式 `DSH_COMPANY_REBIND=1` 且旧盘已不存在时才做一次性 rebind。
  const bundleHome = resolveDshHome()
  const configuredCompanyHome = resolveCompanyHome(bundleHome)
  const configuredCheck = validateCompanyHome(bundleHome, configuredCompanyHome)
  if (!configuredCheck.ok) {
    const warning = `company-pack：DSH_COMPANY_HOME 落点不安全（${configuredCheck.error}）；本次不写自举/升级/成品目录`
    ctx.logger?.warn?.(warning)
    process.stderr.write(`dsh: ${warning}\n`)
  }
  const lease = acquireCompanyLease(bundleHome)
  const leaseBlocked = !lease.acquired
  if (leaseBlocked) {
    const warning = `company-pack：${lease.reason}；公司数据已停写（DSH 会话仍可用），先关掉另一个 writer`
    ctx.logger?.warn?.(warning)
    process.stderr.write(`dsh: ${warning}\n`)
  } else {
    const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
    if (typeof effect === 'function') effect.call(ctx, () => () => lease.release())
  }
  let bundleState = readBundleManifestState(bundleHome)
  let recordedWorkspace = bundleState.status === 'ok'
    ? resolveRecordedWorkspace(bundleHome, bundleState.manifest.workspace)
    : undefined
  let rebound = recordedWorkspace !== undefined
    && canonicalPath(recordedWorkspace) !== canonicalPath(configuredCompanyHome)
  if (bundleState.status === 'corrupt') {
    const warning = `company-pack：bundle.json 损坏，已保留原文件并停写公司数据（${bundleState.path}：${bundleState.error}）；`
      + '修好后重启，或备份后删除该文件让下次启动重建'
    ctx.logger?.warn?.(warning)
    process.stderr.write(`dsh: ${warning}\n`)
  }
  if (bundleState.status === 'unsupported') {
    const warning = `company-pack：bundle.json 是更高版本（v${String(bundleState.version)}，本包支持 v1），已保留原文件并跳过身份/升级（${bundleState.path}）；`
      + '请安装匹配的新版 pack，或从备份恢复 manifest'
    ctx.logger?.warn?.(warning)
    process.stderr.write(`dsh: ${warning}\n`)
  }
  if (rebound && configuredCheck.ok && !leaseBlocked && rebindEnabled() && bundleState.status === 'ok') {
    const decision = planWorkspaceRebind({
      dshHome: bundleHome,
      manifest: bundleState.manifest,
      companyHome: configuredCompanyHome,
    })
    if (!decision.ok) {
      const warning = `company-pack：换盘请求被拒绝（${decision.error}）；本次仍按 bundle.json 记录的公司盘运行，`
        + '不写新盘/不升级/不重建目录'
      ctx.logger?.warn?.(warning)
      process.stderr.write(`dsh: ${warning}\n`)
    } else {
      try {
        applyWorkspaceRebind(decision.plan)
        bundleState = { status: 'ok', path: decision.plan.manifestPath, manifest: decision.plan.manifest }
        recordedWorkspace = decision.plan.newWorkspace
        rebound = false
        const pruned = pruneBundleBackups(bundleHome)
        const message = `company-pack：已显式换盘 ${decision.plan.oldWorkspace} → ${decision.plan.newWorkspace}`
          + `（旧 manifest 备份于 ${decision.plan.backupPath}${pruned.length > 0 ? `；清理旧备份 ${String(pruned.length)} 份` : ''}）`
        for (const warning of decision.plan.warnings) ctx.logger?.warn?.(`company-pack：${warning}`)
        ctx.logger?.info?.(message)
        process.stderr.write(`dsh: ${message}\n`)
      } catch (error) {
        const warning = `company-pack：换盘写入失败（${(error as Error).message}）；原 manifest 保持不动，`
          + '本次跳过自举/升级/目录重建'
        ctx.logger?.warn?.(warning)
        process.stderr.write(`dsh: ${warning}\n`)
      }
    }
  }
  if (rebound) {
    const warning = `company-pack：bundle.json 记录的公司盘是 ${recordedWorkspace}，当前 DSH_COMPANY_HOME 解析为 ${configuredCompanyHome}；`
      + 'bundle 身份以记录为准，本次不写新盘/不升级/不重建目录。搬盘后确认旧路径已不存在，'
      + `再以 DSH_COMPANY_REBIND=1 启动做一次性换盘；或换新 DSH_HOME（先备份）。`
    ctx.logger?.warn?.(warning)
    // 数据分裂风险必须出现在启动输出里，不能只进 logger 文件（2026-10-26 实测 logger 不落 stdout）。
    process.stderr.write(`dsh: ${warning}\n`)
  }
  const identityBlocked = bundleState.status === 'corrupt' || bundleState.status === 'unsupported'
  const companyHome = recordedWorkspace ?? configuredCompanyHome
  const companyCheck = validateCompanyHome(bundleHome, companyHome)
  const dataBlocked = identityBlocked || leaseBlocked || !companyCheck.ok
  if (!companyCheck.ok) {
    const warning = `company-pack：公司盘落点不安全（${companyCheck.error}）；公司数据已停写，先修 DSH_COMPANY_HOME`
    ctx.logger?.warn?.(warning)
    process.stderr.write(`dsh: ${warning}\n`)
  }
  const expectedWorkspace = canonicalPath(companyHome)
  // 方法层是 profile 级：同 home 多 profile 不共享。这里只点名，不改 profile、不冒充隔离。
  try {
    const profiles = profilesWithCompanyPack(join(bundleHome, 'profiles'))
    if (profiles.length > 1) {
      const warning = `company-pack：同一个 home 里有 ${String(profiles.length)} 个 profile 装了本包（${profiles.join('、')}）；`
        + '方法层按 profile 隔离，记录/公司盘共享——一个公司请固定用一个 web profile，避免“记录显示已采纳、另一个 profile 不生效”'
      ctx.logger?.warn?.(warning)
      process.stderr.write(`dsh: ${warning}\n`)
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack profile 体检跳过（不影响运行）：${(error as Error).message}`)
  }
  return { bundleHome, companyHome, expectedWorkspace, dataBlocked, bundleState, rebound }
}

