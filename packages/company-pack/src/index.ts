/** Host half of the company pack: signoff, workspace doors, cultivation, run bundle, catalog/ledger. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-user-approval'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { registerSignoffTool } from './host/signoff-tool.ts'
import { registerWorkspaceDoors } from './host/workspace-doors.ts'
import {
  applyBootstrap,
  planBootstrap,
  resolveContentDir,
} from './host/bootstrap.ts'
import {
  appendUpgradeLog,
  bundleManifestPath,
  planBundleManifest,
  resolvePackMetadata,
  writeBundleManifest,
} from './host/bundle-manifest.ts'
import {
  presentedFromEvent,
  presentedFromSessions,
  readCatalogState,
  regenerateCatalog,
  type PresentedSessionQuery,
} from './host/catalog.ts'
import { registerCultivation, type CultivationHostConfig } from './host/cultivation.ts'
import { registerHandbook } from './host/handbook.ts'
import { migrateLegacyMethodLayers } from './host/cultivation-storage.ts'
import {
  auditLedger,
  createPresentedLedgerStore,
  ensureLedger,
  type PresentedLedgerStore,
  recordLedger,
} from './host/presented-domain.ts'
import { registerClientDiagnostics } from './host/client-diagnostics.ts'
import { exportGovernance, type ExportLedgerSource } from './host/governance-export.ts'
import { prepareCompanyRuntime } from './host/runtime-guard.ts'
import { staleWorkspacePaths, staleWorkspacePathsFromRegistry, type WorkspaceRegistryLike } from './host/workspace-registry.ts'
import { canonicalPath } from './host/paths.ts'

export * from './lib/presence.ts'
export * from './lib/doors.ts'

/** Host half registers tools, approval and the cultivation command family. */
export const inject = ['tools', 'approval', 'commands', 'workspaceRegistry']

export type HostConfig = CultivationHostConfig

/**
 * Host plugin body. Workspace is resolved at boot from env/cwd/saved; no launcher/TTY.
 * If no workspace is known, the app stays usable but company data is blocked until the user
 * opens a session in a workspace (the native DSH picker path) and the host is restarted/activated.
 */
export async function apply(ctx: Context, config: HostConfig = {}): Promise<void> {
  registerSignoffTool(ctx)

  const runtime = prepareCompanyRuntime(ctx)
  const workspace = runtime.workspace
  const hasWorkspace = workspace !== ''
  const dataBlocked = runtime.dataBlocked || !hasWorkspace

  const ledgerStorePromise: Promise<PresentedLedgerStore> | undefined =
    hasWorkspace && !runtime.dataBlocked
      ? createPresentedLedgerStore(ctx, runtime.dshHome, workspace)
      : undefined

  const exportNow = (ledger?: ExportLedgerSource): void => {
    if (dataBlocked || !hasWorkspace) return
    try {
      const result = exportGovernance({
        dshHome: runtime.dshHome,
        workspace,
        ...(ledger === undefined ? {} : { ledger }),
      })
      for (const warning of result.warnings) ctx.logger?.warn?.(`company-pack：治理导出：${warning}`)
    } catch (error) {
      ctx.logger?.warn?.(`company-pack 治理导出跳过（不影响运行）：${(error as Error).message}`)
    }
  }

  if (!dataBlocked && config.cultivationRoot !== undefined) {
    try {
      const migrated = migrateLegacyMethodLayers(runtime.dshHome, config.cultivationRoot)
      if (migrated.copied.length > 0) {
        ctx.logger?.info?.(`company-pack：方法层已迁公司级（${String(migrated.copied.length)} 个；旧 profile 路径只读留一版）`)
      }
      if (migrated.conflicts.length > 0) {
        ctx.logger?.warn?.(`company-pack：方法层迁移冲突 ${String(migrated.conflicts.length)} 个（${migrated.conflicts.join('、')}）；旧版本落 .legacy/，不覆盖新根`)
      }
      for (const warning of migrated.warnings) ctx.logger?.warn?.(`company-pack：方法层迁移：${warning}`)
    } catch (error) {
      ctx.logger?.warn?.(`company-pack 方法层迁移跳过（不影响运行）：${(error as Error).message}`)
    }
  }

  registerCultivation(ctx, config, hasWorkspace ? workspace : undefined, dataBlocked)
  registerHandbook(ctx, resolveContentDir(import.meta.url), hasWorkspace ? workspace : undefined)
  registerClientDiagnostics(ctx, runtime.dshHome)

  ctx.commands.register({
    name: 'deliverables',
    description: '交付审计：把一条 final.md 的 presented 结论写入审计账本并重生成索引（人命令）',
    input: { hint: 'audit .dsh-company/deliverables/<dir>/final.md true|false' },
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      if (dataBlocked) return { kind: 'error' as const, text: '公司数据已停写（无 workspace/身份/lease 问题）；先选 workspace 再审计。' }
      const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
      if (tokens[0] !== 'audit' || tokens.length < 3) {
        return { kind: 'error' as const, text: '用法：/deliverables audit .dsh-company/deliverables/<dir>/final.md true|false' }
      }
      const value = tokens[tokens.length - 1]
      if (value !== 'true' && value !== 'false') {
        return { kind: 'error' as const, text: `审计结论只认 true/false：${value ?? ''}` }
      }
      if (ledgerStorePromise === undefined) {
        return { kind: 'error' as const, text: 'presented 账本未初始化（无 workspace）。' }
      }
      const path = tokens.slice(1, -1).join(' ')
      const store = await ledgerStorePromise
      const result = await auditLedger(workspace, store, path, value === 'true')
      if (result.ledger === undefined) {
        return { kind: 'error' as const, text: result.warning ?? '审计写入失败' }
      }
      regenerateCatalog(workspace, result.ledger)
      exportNow(store)
      return {
        kind: 'success' as const,
        text: `已审计 ${result.path ?? path} = ${value}（presented 账本 = ${store.kind}；索引已重生成）。`,
      }
    },
  })

  ctx.on('api-session/added', (summary) => {
    if (summary.origin === 'subagent') return
    if (!hasWorkspace) return
    if (typeof summary.cwd !== 'string' || summary.cwd === '') return
    const cwd = canonicalPath(summary.cwd)
    const rel = relative(workspace, cwd)
    if (rel !== '' && (rel.startsWith('..') || isAbsolute(rel))) {
      ctx.logger?.warn?.(`company-pack：会话 ${String(summary.sessionId)} 的 cwd ${cwd} 不在 workspace ${workspace}；`
        + '页签/身份会显示「非公司盘 / 身份未配置」，公司数据命令会拒绝写入')
    } else if (rel !== '') {
      ctx.logger?.warn?.(`company-pack：会话 ${String(summary.sessionId)} 的 cwd ${cwd} 在 workspace 子目录，不是根 ${workspace}；`
        + '公司数据（培养记录/方法层/成品目录）只在 workspace 根生效，请以 workspace 根开新会话')
    }
  })

  registerWorkspaceDoors(ctx)

  if (hasWorkspace && !runtime.dataBlocked) {
    ensureRunBundle(ctx, workspace, runtime.dshHome, runtime.bundleState)
    const registration = registerWorkspace(ctx, workspace)
    if (registration !== undefined) await registration
  }

  if (ledgerStorePromise !== undefined) {
    void initializeCatalog(ctx, workspace, ledgerStorePromise, exportNow)
  }

  ctx.on('session/event', (_session, event) => {
    if ((event as { type?: unknown }).type !== 'deliverables/presented') return
    if (dataBlocked || ledgerStorePromise === undefined) return
    try {
      const observed = presentedFromEvent(event, workspace)
      if (observed.paths.size === 0 && observed.slugs.size === 0) return
      void ledgerStorePromise.then(async store => {
        const recorded = await recordLedger(store, observed)
        if (recorded.ledger === undefined) {
          ctx.logger?.warn?.(`company-pack 成品目录 present 投影未写账本（${recorded.warning ?? '未知原因'}）`)
          return
        }
        regenerateCatalog(workspace, recorded.ledger)
        exportNow(store)
      }).catch(error => ctx.logger?.warn?.(`company-pack 成品目录 present 投影跳过（不影响运行）：${(error as Error).message}`))
    } catch (error) {
      ctx.logger?.warn?.(`company-pack 成品目录 present 投影跳过（不影响运行）：${(error as Error).message}`)
    }
  })

  // 搬家指针体检：DSH 的 workspace 登记存绝对路径，搬 home 后不会自动迁移。
  try {
    if (!dataBlocked) {
      const report = (stale: readonly string[]): void => {
        if (stale.length === 0) return
        const warning = `company-pack：DSH workspace 登记里有 ${String(stale.length)} 条路径已不存在（${stale.join('、')}）；`
          + '搬 home/改名后请在侧栏重新添加工作区，旧 session 仍在旧路径下；本包不自动改 DSH 的登记。'
        ctx.logger?.warn?.(warning)
        process.stderr.write(`dsh: ${warning}\n`)
      }
      const inject = (ctx as unknown as {
        inject?: (deps: readonly string[], callback: (scoped: unknown) => void) => unknown
      }).inject
      if (typeof inject === 'function') {
        inject.call(ctx, ['workspaceRegistry'], (scoped) => {
          const registry = (scoped as { readonly workspaceRegistry?: WorkspaceRegistryLike }).workspaceRegistry
          if (registry !== undefined) report(staleWorkspacePathsFromRegistry(registry, existsSync))
        })
      } else {
        const registryPath = join(runtime.dshHome, 'storages/workspace.json')
        if (existsSync(registryPath)) report(staleWorkspacePaths(JSON.parse(readFileSync(registryPath, 'utf8')), existsSync))
      }
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack workspace 登记体检跳过（不影响运行）：${(error as Error).message}`)
  }
}

/** 初始化 run bundle 目录/状态 + v3 身份。没有 workspace 时调用方已跳过。 */
function ensureRunBundle(
  ctx: Context,
  workspace: string,
  dshHome: string,
  bundleState: ReturnType<typeof prepareCompanyRuntime>['bundleState'],
): void {
  try {
    const contentDir = resolveContentDir(import.meta.url)
    const plan = planBootstrap(contentDir, workspace)
    if (plan.error !== undefined) {
      ctx.logger?.warn?.(`company-pack run bundle 初始化跳过：${plan.error}`)
    } else {
      const result = applyBootstrap(plan)
      if (result.created.length > 0) {
        ctx.logger?.info?.(`company-pack：run bundle 已初始化 ${workspace}/.dsh-company（新建 ${String(result.created.length)} 件）`)
      }
    }
    const pack = resolvePackMetadata(import.meta.url)
    const manifestPlan = planBundleManifest({ dshHome, workspace, pack })
    if (manifestPlan.error !== undefined) {
      ctx.logger?.warn?.(`company-pack run bundle 身份未更新：${manifestPlan.error}`)
      return
    }
    const written = writeBundleManifest(manifestPlan)
    if (written.created || written.upgraded) {
      const action = written.upgraded ? 'v2→v3' : 'v3'
      ctx.logger?.info?.(`company-pack：run bundle 身份已写入（${bundleManifestPath(workspace)}；${action}）`)
      if (written.fallback !== undefined) {
        const warning = `company-pack：manifest 首建不支持 hard link（${written.fallback} 回退，非原子发布）；${bundleManifestPath(workspace)}`
        ctx.logger?.warn?.(warning)
        process.stderr.write(`dsh: ${warning}\n`)
      }
      try {
        appendUpgradeLog(workspace, `run bundle identity ${action}; pack ${pack.version}; previous ${bundleState?.status ?? 'missing'}`)
      } catch { /* 日志失败不影响运行 */ }
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack run bundle 初始化跳过（不影响运行）：${(error as Error).message}`)
  }
}

/**
 * 登记 workspace；失败只告警，不连累 boot。
 * 生产：导出的 `inject` 已声明 workspaceRegistry，loader 等它就绪后才运行 apply；
 * 返回 Promise 让 Web readiness 等到登记完成（前轮探针同形）。
 * 测试/无 registry 组合：属性访问不到就跳过，返回 undefined。
 */
function registerWorkspace(ctx: Context, workspace: string): Promise<void> | undefined {
  let registry: { create(path: string): Promise<{ id: string; path: string }> } | undefined
  try {
    registry = (ctx as unknown as {
      readonly workspaceRegistry?: { create(path: string): Promise<{ id: string; path: string }> }
    }).workspaceRegistry
  } catch {
    registry = undefined
  }
  if (registry === undefined) return undefined
  return registry.create(workspace)
    .then(registered => { ctx.logger?.info?.(`company-pack：workspace 已登记 ${registered.id} @ ${registered.path}`) })
    .catch((error: unknown) => { ctx.logger?.warn?.(`company-pack：workspace 登记失败（不影响启动）：${(error as Error).message}`) })
}

/** 初始化成品目录 + presented 账本；缺失时后台回扫会话。 */
async function initializeCatalog(
  ctx: Context,
  workspace: string,
  storePromise: Promise<PresentedLedgerStore>,
  exportNow: (ledger?: ExportLedgerSource) => void,
): Promise<void> {
  const store = await storePromise
  if (!existsSync(workspace)) return
  const catalogState = readCatalogState(workspace)
  if (catalogState.status === 'corrupt' || catalogState.status === 'unsupported') {
    ctx.logger?.warn?.(`company-pack：成品目录 ${catalogState.status === 'unsupported' ? `schema ${String(catalogState.schema)} 高于本包支持` : `损坏（${catalogState.error}）`}；`
      + '已按盘上 meta/final 重建派生索引（presented 以审计账本为准）')
  }
  const bootstrap = await ensureLedger(store)
  if (bootstrap.warning !== undefined) ctx.logger?.warn?.(`company-pack：${bootstrap.warning}`)
  const result = regenerateCatalog(workspace, bootstrap.ledger)
  if (result.written) ctx.logger?.info?.(`company-pack：成品目录已生成（${result.path}）`)
  exportNow(store)
  if (!bootstrap.needsScan) return
  const scan = async (query: PresentedSessionQuery): Promise<void> => {
    try {
      const observed = await presentedFromSessions(query, workspace, AbortSignal.timeout(30_000))
      const recorded = await recordLedger(store, observed)
      if (recorded.ledger === undefined) {
        ctx.logger?.warn?.(`company-pack：presented 回扫结果未写账本（${recorded.warning ?? '未知原因'}）`)
        return
      }
      const regenerated = regenerateCatalog(workspace, recorded.ledger)
      exportNow(store)
      if (regenerated.written) {
        ctx.logger?.info?.(`company-pack：presented 回扫完成（扫 ${String(observed.scanned)} 会话 / 失败 ${String(observed.failed)}）`)
      }
    } catch (error) {
      ctx.logger?.warn?.(`company-pack：presented 回扫跳过（不影响运行）：${(error as Error).message}`)
    }
  }
  const inject = (ctx as unknown as {
    inject?: (deps: readonly string[], callback: (scoped: unknown) => void) => unknown
  }).inject
  if (typeof inject === 'function') {
    inject.call(ctx, ['sessionQuery'], (scoped) => {
      const query = (scoped as { readonly sessionQuery?: PresentedSessionQuery }).sessionQuery
      if (query !== undefined) void scan(query)
    })
  } else {
    const getter = (ctx as unknown as { get?: (name: string) => unknown }).get
    const query = typeof getter === 'function' ? getter.call(ctx, 'sessionQuery') as PresentedSessionQuery | undefined : undefined
    if (query !== undefined) void scan(query)
  }
}
