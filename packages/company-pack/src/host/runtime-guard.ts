/**
 * 公司盘守卫与 run bundle 身份（2026-10-27 拆出；2026-11-01 产品化改版）。
 *
 * 产品化后的运行前提：
 * - workspace 必须由启动器/环境显式给出（`DSH_COMPANY_HOME`）；没有默认 `<home>/company-workspace`；
 * - manifest 在 `<workspace>/.dsh-company/bundle.json`（v2）；home 里的 v1 可在 workspace 匹配时迁移；
 * - `DSH_COMPANY_REBIND` 退役：设置时只告警，不执行旧逻辑；
 * - 方法层/账本留 home（D25/M2）；workspace 只放业务产物 + 派生导出；
 * - 没有 workspace / manifest 坏 / lease 败时 dataBlocked = 停写公司数据（DSH 会话仍可用）。
 *
 * 边界：只做**启动前提与一次性副作用**（告警、迁移、lease effect），不注册工具/命令、不写业务数据。
 */
import type { Context } from '@deepseek-ai/cordis'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  chooseHandbookTarget,
  resolveCompanyHome,
  validateCompanyHome,
  type HandbookTarget,
} from './bootstrap.ts'
import {
  identityBackupPath,
  migrateLegacyManifest,
  readBundleManifestState,
  type BundleManifestState,
} from './bundle-manifest.ts'
import { acquireCompanyLease } from './lease.ts'
import { profilesWithCompanyPack } from './profiles.ts'
import { canonicalPath } from './paths.ts'

const env = (name: string): string | undefined => (process.env as Record<string, string | undefined>)[name]

/** 一次 apply 的运行前提（后续注册与自举都从这里取事实）。 */
export interface CompanyRuntime {
  readonly dshHome: string
  /** 显式 workspace；未设置/不存在时为空串（调用方必须看 dataBlocked）。 */
  readonly companyHome: string
  readonly expectedWorkspace: string
  readonly dataBlocked: boolean
  readonly bundleState: BundleManifestState | undefined
  readonly handbookTarget: HandbookTarget
  readonly hasWorkspace: boolean
}

/** 告警落 logger + stderr（启动输出里必须能看到数据分裂/停写风险）。 */
function warn(ctx: Context, message: string): void {
  ctx.logger?.warn?.(message)
  process.stderr.write(`dsh: ${message}\n`)
}

/** 解析并校验运行前提；告警直接落 logger/stderr，不抛错（停写由 dataBlocked 表达）。 */
export function prepareCompanyRuntime(ctx: Context): CompanyRuntime {
  const dshHome = resolveDshHome()
  const configured = resolveCompanyHome(dshHome)
  const lease = acquireCompanyLease(dshHome)
  let dataBlocked = false
  if (!lease.acquired) {
    warn(ctx, `company-pack：${lease.reason}；公司数据已停写（DSH 会话仍可用），先关掉另一个 writer`)
    dataBlocked = true
  } else {
    const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
    if (typeof effect === 'function') effect.call(ctx, () => () => lease.release())
  }

  if (env('DSH_COMPANY_REBIND') !== undefined) {
    warn(ctx, 'company-pack：DSH_COMPANY_REBIND 已退役（manifest 现在跟 workspace 走）；本次忽略该变量，'
      + '不会改写任何盘。搬 workspace 请用启动器重新指定路径并重新登记。')
  }

  if (configured === undefined) {
    warn(ctx, 'company-pack：未指定公司 workspace（DSH_COMPANY_HOME 为空）；本次不写自举/身份/目录。'
      + '用 `pnpm company --workspace <dir>` 或显式 `DSH_HOME=… DSH_COMPANY_HOME=… dsh --profile company` 启动。')
    return {
      dshHome,
      companyHome: '',
      expectedWorkspace: '',
      dataBlocked: true,
      bundleState: undefined,
      handbookTarget: 'AGENTS.md',
      hasWorkspace: false,
    }
  }

  const check = validateCompanyHome(dshHome, configured)
  if (!check.ok) {
    warn(ctx, `company-pack：公司 workspace 落点不安全（${check.error}）；公司数据已停写`)
    dataBlocked = true
  }
  if (!existsSync(configured)) {
    warn(ctx, `company-pack：公司 workspace 不存在：${configured}；本次不写盘。`
      + '先由启动器创建/选择目录，或手工 `mkdir -p` 后重试。')
    return {
      dshHome,
      companyHome: configured,
      expectedWorkspace: configured,
      dataBlocked: true,
      bundleState: undefined,
      handbookTarget: 'AGENTS.md',
      hasWorkspace: false,
    }
  }

  const companyHome = canonicalPath(configured)
  let bundleState = readBundleManifestState(companyHome)
  // 已有 v2 manifest 时，手册目标以 manifest 为准（否则第二次 boot 会把 AGENTS 当“已有项目”
  // 再补一份 COMPANY.md，造成双手册）。没有 manifest 时才按碰撞选择；v1 迁移沿用 AGENTS。
  let handbookTarget = bundleState.status === 'ok'
    ? bundleState.manifest.handbookTarget
    : chooseHandbookTarget(companyHome)
  if (bundleState.status === 'missing') {
    const migration = migrateLegacyManifest({ dshHome, companyHome, handbookTarget: 'AGENTS.md' })
    if (migration.migrated) {
      ctx.logger?.info?.(`company-pack：v1 bundle manifest 已迁移到 ${companyHome}/.dsh-company/bundle.json`
        + `（旧文件 ${migration.legacyPath ?? '保留'}；id/createdAt 保留）`)
      bundleState = readBundleManifestState(companyHome)
      if (bundleState.status === 'ok') handbookTarget = bundleState.manifest.handbookTarget
    } else if (migration.skippedReason !== undefined) {
      ctx.logger?.info?.(`company-pack：未迁移 v1 manifest（${migration.skippedReason}）`)
    }
  }
  if (bundleState.status === 'corrupt') {
    const backup = bundleState.path.endsWith('.json')
      ? join(dshHome, 'company/identity') : join(dshHome, 'company/identity')
    warn(ctx, `company-pack：bundle.json 损坏，已保留原文件并停写公司数据（${bundleState.path}：${bundleState.error}）；`
      + `修好后重启，或从 home 身份备份恢复（${backup}/<bundle-id>.json，仅作恢复参考）`)
    dataBlocked = true
  }
  if (bundleState.status === 'unsupported') {
    warn(ctx, `company-pack：bundle.json 是更高版本（v${String(bundleState.version)}，本包支持 v${String(2)}），`
      + '已保留原文件并跳过身份/升级；请安装匹配的新版 pack，或从备份恢复 manifest')
    dataBlocked = true
  }

  if (!check.ok) dataBlocked = true
  // 2026-10-28 M3 起方法层是公司级（同 home 共享）；仍点名多 profile，避免会话/偏好分叉。
  try {
    const profiles = profilesWithCompanyPack(join(dshHome, 'profiles'))
    if (profiles.length > 1) {
      warn(ctx, `company-pack：同一个 home 里有 ${String(profiles.length)} 个 profile 装了本包`
        + `（${profiles.join('、')}）；方法层/记录/公司盘都是公司级共享；建议固定一个 company profile`)
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack profile 体检跳过（不影响运行）：${(error as Error).message}`)
  }

  const expectedWorkspace = companyHome
  return {
    dshHome,
    companyHome,
    expectedWorkspace,
    dataBlocked,
    bundleState,
    handbookTarget,
    hasWorkspace: true,
  }
}

/** 诊断用：给出 home 身份备份目录（不保证存在）。 */
export const identityBackupDir = (dshHome: string): string => join(dshHome, 'company/identity')

/** 诊断用：某个 bundle id 的身份备份路径。 */
export const identityBackupFor = (dshHome: string, id: string): string => identityBackupPath(dshHome, id)
