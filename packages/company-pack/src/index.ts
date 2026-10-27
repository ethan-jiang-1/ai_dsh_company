/** Host half of the company pack: signoff tool (驾驶舱②) + workspace doors tool (BUG-002) + cultivation loop (2026-10-13 培养卡) + presence read-model re-export.
 * The browser half lives in `./client`. */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
// 纯类型导入：只需要 `ctx.approval` 的 Context 类型增强（服务本体由 web profile 挂载）。
// ⚠ 不做值导入——那会把 host 侧核心包的类型图拉进本程序，遮掉 client 面的 sessions 增强（实测）。
import type {} from '@deepseek-ai/dsh-user-approval'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { signoffDecisionNote, signoffReason } from './lib/signoff.ts'
import { doorsFromSessions } from './lib/doors.ts'
import { bootstrapCompanyWorkspace, bootstrapEnabled, resolveCompanyHome, resolveSkeletonDir, validateCompanyHome } from './host/bootstrap.ts'
import {
  appendUpgradeLog,
  applySkeletonUpgrade,
  applyWorkspaceRebind,
  bundleManifestPath,
  planBundleManifest,
  planSkeletonUpgrade,
  planWorkspaceRebind,
  readBundleManifestState,
  rebindEnabled,
  pruneBundleBackups,
  resolveRecordedWorkspace,
  resolvePackMetadata,
  writeBundleManifest,
  writeUpgradedManifest,
} from './host/bundle-manifest.ts'
import {
  ensurePresentedLedger,
  presentedFromEvent,
  presentedFromSessions,
  readCatalogState,
  recordPresented,
  regenerateCatalog,
  setPresentedAudit,
  type PresentedSessionQuery,
} from './host/catalog.ts'
import { registerCultivation, type CultivationHostConfig } from './host/cultivation.ts'
import { acquireCompanyLease } from './host/lease.ts'
import { profilesWithCompanyPack } from './host/profiles.ts'
import { staleWorkspacePaths, staleWorkspacePathsFromRegistry, type WorkspaceRegistryLike } from './host/workspace-registry.ts'

/**
 * 在场板读模型（R5b）从 host 入口再导出：`checks/smoke/replay-smoke.mjs` 用它把重放会话的
 * team 事件折成在场板做判据 4 断言；纯函数、零依赖，不影响 host 挂载面。
 */
export * from './lib/presence.ts'

/**
 * 工作区门投影（BUG-002，2026-10-06）：同 cwd 的根会话 × preset 聚合——同 preset ≥2 = duplicateWarning。
 * 再导出纯函数供 keyless spec 与 client 视图消费。
 */
export * from './lib/doors.ts'

/** Host half now registers tools and the cultivation command family: tool registry + approval + commands services. */
export const inject = ['tools', 'approval', 'commands']

/**
 * bundle patch 行可注入的 host config（`cordis.patch.yml` 的 `company-client` 行）。
 * 2026-10-13 培养卡：`cultivationRoot` = 方法层根（!!js 锚 baseUrl = profile 根下的
 * `company-cultivation/`），与各角色 preset 的第二 customSkillDirs 同前缀构造对齐。
 */
export type HostConfig = CultivationHostConfig

/**
 * Host plugin body：注册 `request_signoff` 工具——公司签字线（双签 / 会签）的机制停点。
 *
 * 机制（vendor `user-approval`）：`ctx.approval.request()` 一次性审批、轮内有效、无应答者
 * fail-closed；事件对 `approval/asked` + `approval/decided` 进会话日志。浏览器侧由官方
 * `ui-approval` 面板应答（web bundle 已挂），我们的注意力中心观察者（client 半）跨会话显示。
 * 挂载面 = 既有 `company-client` 行（bundle 级）⇒ 全部会话与 teammate 可见——r2-motion 实证
 * teammate 可见全局工具行（20 工具清单里有 fs / present / ask_user_question）。
 */
function canonicalPath(path: string): string {
  try { return realpathSync(path) } catch { return resolve(path) }
}

export function apply(ctx: Context, config: HostConfig = {}): void {
  ctx.tools.register(defineTool({
    name: 'request_signoff',
    description: 'Request human sign-off for a company sign-line (双签 / 会签线). '
      + 'Call this BEFORE finalizing any conclusion that crosses a sign line — for example a proposal with margin below 30% or a discount below 9折. '
      + 'The turn pauses until the human decides; proceed with the conclusion only when the decision is allowed-once.',
    parameters: {
      line: {
        type: 'string',
        required: true,
        description: 'Which sign line this hits, e.g. "毛利<30% 双签" or "折扣<9折 双签".',
      },
      summary: {
        type: 'string',
        required: true,
        description: 'One sentence of what needs the human decision, numbers included.',
      },
      detail: {
        type: 'string',
        description: 'Optional supporting context: options considered and their numbers.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string', required: true },
          note: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      // approval.request() 读取 agent.session（轮内审计配对），无发起会话时不请求。
      if (exec.agent === undefined) {
        return { decision: 'unavailable', note: '审批请求需要发起会话（agent）上下文。' }
      }
      const decision = await ctx.approval.request({
        agent: exec.agent,
        toolName: 'request_signoff',
        ...(exec.callId !== undefined ? { callId: exec.callId } : {}),
        reason: signoffReason(args),
        signal: exec.signal,
      })
      return { decision, note: signoffDecisionNote(decision) }
    },
  }))

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
  // 培养回路（2026-10-13 培养卡）：公司数据只写公司盘根，不跟随 session cwd 的子目录。
  // 身份损坏/更高版本/落点不安全时拒绝公司数据写入，避免写到猜测的默认盘。
  registerCultivation(ctx, config, expectedWorkspace, dataBlocked)
  // 交付审计命令（2026-10-27 F7）：presented=false 的第一入口，不再要求手改 JSON。
  ctx.commands.register({
    name: 'deliverables',
    description: '交付审计：把一条 final.md 的 presented 结论写入审计账本并重生成索引（人命令）',
    input: { hint: 'audit <deliverables/<dir>/final.md> true|false' },
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      if (dataBlocked) return { kind: 'error' as const, text: '公司数据已停写（身份/落点/lease 问题）；先修再审计。' }
      const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
      if (tokens[0] !== 'audit' || tokens.length < 3) {
        return { kind: 'error' as const, text: '用法：/deliverables audit <deliverables/<dir>/final.md> true|false' }
      }
      const value = tokens[tokens.length - 1]
      if (value !== 'true' && value !== 'false') {
        return { kind: 'error' as const, text: `审计结论只认 true/false：${value ?? ''}` }
      }
      const path = tokens.slice(1, -1).join(' ')
      const result = setPresentedAudit(expectedWorkspace, path, value === 'true')
      if (result.ledger === undefined) {
        return { kind: 'error' as const, text: result.warning ?? '审计写入失败' }
      }
      regenerateCatalog(expectedWorkspace, result.ledger)
      return { kind: 'success' as const, text: `已审计 ${result.path ?? path} = ${value}（写入 presented 账本并重生成索引）。` }
    },
  })
  ctx.on('api-session/added', (summary) => {
    if (summary.origin === 'subagent') return
    if (typeof summary.cwd !== 'string' || summary.cwd === '') return
    const cwd = canonicalPath(summary.cwd)
    const rel = relative(expectedWorkspace, cwd)
    if (rel !== '' && (rel.startsWith('..') || isAbsolute(rel))) {
      ctx.logger?.warn?.(`company-pack：会话 ${String(summary.sessionId)} 的 cwd ${cwd} 不在公司盘 ${expectedWorkspace}；`
        + '页签/身份会显示「非公司盘 / 身份未配置」，公司数据命令会拒绝写入')
    } else if (rel !== '') {
      ctx.logger?.warn?.(`company-pack：会话 ${String(summary.sessionId)} 的 cwd ${cwd} 在公司盘子目录，不是公司盘根 ${expectedWorkspace}；`
        + '公司数据（培养记录/方法层/成品目录）只在盘根生效，请以盘根开新会话')
    }
  })

  const doorFacts = new Map<string, { cwd: string; agentPreset: string | undefined; running: boolean }>()
  ctx.on('api-session/added', (summary) => {
    if (summary.origin === 'subagent') return // 只追根会话
    doorFacts.set(String(summary.sessionId), {
      cwd: String(summary.cwd ?? ''),
      agentPreset: typeof summary.projections?.values?.agentPreset === 'string'
        ? summary.projections.values.agentPreset
        : undefined,
      running: summary.running,
    })
  })
  ctx.on('api-session/removed', (sessionId) => { doorFacts.delete(String(sessionId)) })
  ctx.on('api-session/status', (sessionId, running) => {
    const fact = doorFacts.get(String(sessionId))
    if (fact !== undefined) fact.running = running
  })

  ctx.tools.register(defineTool({
    name: 'workspace_doors',
    description: 'Show which role presets currently have root sessions (doors) open on this workspace. '
      + 'A duplicate warning means two or more sessions share the same preset — for example two CEO doors '
      + '(the default preset is ceo; forgetting to select your role creates a second CEO). '
      + 'Use this before closing a motion or presenting final.md to detect silent supersession.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          hasDuplicate: { type: 'boolean', required: true },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                preset: { type: 'string', required: true },
                sessionCount: { type: 'number', required: true },
                duplicateWarning: { type: 'boolean', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(_args, exec) {
      if (exec.agent === undefined) {
        return { hasDuplicate: false, rows: [] }
      }
      // 用当前 agent 的 cwd 过滤门投影
      const cwd = exec.agent.session?.header?.cwd ?? ''
      const facts = [...doorFacts.entries()]
        .filter(([, fact]) => fact.cwd === cwd)
        .map(([sessionId, fact]) => ({ sessionId, cwd: fact.cwd, agentPreset: fact.agentPreset, running: fact.running }))
      const model = doorsFromSessions(facts)
      return {
        hasDuplicate: model.hasDuplicate,
        rows: model.rows.map(row => ({
          preset: row.preset,
          sessionCount: row.sessionCount,
          duplicateWarning: row.duplicateWarning,
        })),
      }
    },
  }))

  // ── 出厂公司盘骨架的**首启自举**（2026-10-13 立；用户令：「company-workspace 不在就建立一下，
  //    建立好了就不用再建立了」）。规则与纪律 = ./lib/bootstrap.ts 头注（只补缺 / 不抛 / 可重入）：
  //    默认落到 `<DSH_HOME>/company-workspace`（第三方装完即有盘可连）；已存在的盘一个字节都不动
  //    ——本仓自己的 `company-workspace/` 因此天然免疫（那里的制度件还是符号链接）。
  //    `DSH_COMPANY_HOME` 换落点、`DSH_COMPANY_BOOTSTRAP=off` 关掉（自管盘的部署用，见 run/env.sh）。
  if (!rebound && !dataBlocked && bootstrapEnabled()) {
    try {
      const skeleton = resolveSkeletonDir(import.meta.url)
      const { plan, result } = bootstrapCompanyWorkspace(skeleton, companyHome)
      if (plan.error !== undefined) {
        ctx.logger?.warn?.(`company-pack 骨架自举跳过：${plan.error}`)
      } else if (result.created.length > 0) {
        ctx.logger?.info?.(`company-pack：出厂公司盘骨架已落到 ${plan.companyHome}`
          + `（新建 ${String(result.created.length)} 件）——填 kb/owners.md 后即可开工`)
      }
    } catch (error) {
      // 首发自举绝不许连累应用（postmortem 0003：apply 期抛错会砖整窗）
      ctx.logger?.warn?.(`company-pack 骨架自举失败（不影响运行）：${(error as Error).message}`)
    }
  }

  // ── run bundle 身份（2026-10-24 立；RFC run-bundle-install-unit）：与首启同一次 apply 写
  //    `<DSH_HOME>/bundle.json`。只创建、绝不覆盖；workspace 不存在则不写（没有盘就不冒充 bundle）。
  //    与 bootstrap 开关解耦：自管盘的部署（本仓 dev）仍需要一个身份与骨架指纹。
  try {
    if (!rebound && !dataBlocked && existsSync(companyHome)) {
      const skeleton = resolveSkeletonDir(import.meta.url)
      const pack = resolvePackMetadata(import.meta.url)
      const state = bundleState
      if (state.status === 'corrupt') {
        // 不静默：损坏的 manifest 不是首启。保留原文件（身份不丢给猜测），要求人工修复或备份后删除。
        ctx.logger?.warn?.(`company-pack：bundle.json 损坏，已保留原文件并跳过身份/升级（${state.path}：${state.error}）；`
          + '修好后重启，或备份后删除该文件让下次启动重建')
      } else if (state.status === 'missing') {
        const plan = planBundleManifest({ dshHome: bundleHome, companyHome, skeletonDir: skeleton, pack })
        const written = writeBundleManifest(plan)
        if (written.created) {
          ctx.logger?.info?.(`company-pack：run bundle 身份已建立（${plan.path}）`)
          if (written.fallback !== undefined) {
            const warning = `company-pack：manifest 首建不支持 hard link（${written.fallback} 回退，非原子发布）；${plan.path}`
            ctx.logger?.warn?.(warning)
            process.stderr.write(`dsh: ${warning}\n`)
          }
        }
      } else if (state.status === 'unsupported') {
        // 启动时已按 v 高于本包告警；保留原文件，不做升级、不覆盖身份。
      } else {
        const existing = state.manifest
        const plan = planSkeletonUpgrade({ manifest: existing, skeletonDir: skeleton, workspace: companyHome, pack })
        if (plan.changed) {
          const result = applySkeletonUpgrade(plan, skeleton, companyHome)
          writeUpgradedManifest(bundleManifestPath(bundleHome), plan.manifest)
          const modified = plan.actions.filter(action => action.reason === 'modified').map(action => action.rel)
          const summary = `基部升级 ${existing.skeleton.version} → ${pack.version}`
            + `（新增 ${String(result.created.length)} / 替换 ${String(result.updated.length)}`
            + ` / 保留用户改过 ${String(modified.length)}${modified.length > 0 ? `：${modified.join(', ')}` : ''}）`
          appendUpgradeLog(bundleHome, summary)
          ctx.logger?.info?.(`company-pack：${summary}`)
        }
      }
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack run bundle 身份写入跳过（不影响运行）：${(error as Error).message}`)
  }

  // ── 搬家指针体检（2026-10-26，P1）：DSH 的 workspace 登记存绝对路径，搬 home 后不会自动迁移。
  // 只读点名，不修改 vendor 存储；用户需要在侧栏重新添加工作区。rebound 时已有更强告警，跳过。
  try {
    if (!rebound && !dataBlocked) {
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
        // N1 合同：等 workspaceRegistry 就绪再列；不读持久化层私有 JSON。
        inject.call(ctx, ['workspaceRegistry'], (scoped) => {
          const registry = (scoped as { readonly workspaceRegistry?: WorkspaceRegistryLike }).workspaceRegistry
          if (registry !== undefined) report(staleWorkspacePathsFromRegistry(registry, existsSync))
        })
      } else {
        // 旧组合/无 registry 的保底：只读 DSH 的登记文件做诊断，不再作为主路径。
        const registryPath = join(bundleHome, 'storages/workspace.json')
        if (existsSync(registryPath)) report(staleWorkspacePaths(JSON.parse(readFileSync(registryPath, 'utf8')), existsSync))
      }
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack workspace 登记体检跳过（不影响运行）：${(error as Error).message}`)
  }

  // ── 成品目录 + presented 审计账本（2026-10-25 目录；2026-10-27 账本拆分）──
  // 首启生成空 catalog（页签显示“还没有成品”，而不是“维护者运行 node tools/...”）。
  // presented 的权威 = kb/deliverables-presented.json（true 来自事件，false 是操作员审计）；
  // 索引只做派生视图。账本缺失时先从旧索引迁移（保住 false），再后台回扫会话事件补 true。
  try {
    if (!rebound && !dataBlocked && existsSync(companyHome)) {
      const catalogState = readCatalogState(companyHome)
      if (catalogState.status === 'corrupt' || catalogState.status === 'unsupported') {
        const warning = `company-pack：成品目录 ${catalogState.status === 'unsupported' ? `schema ${String(catalogState.schema)} 高于本包支持` : `损坏（${catalogState.error}）`}；`
          + '已按盘上 meta/final 重建派生索引（presented 以审计账本为准）'
        ctx.logger?.warn?.(warning)
      }
      const bootstrap = ensurePresentedLedger(companyHome)
      if (bootstrap.warning !== undefined) ctx.logger?.warn?.(`company-pack：${bootstrap.warning}`)
      if (bootstrap.migrated) {
        ctx.logger?.info?.('company-pack：presented 审计账本已从旧成品索引迁移')
      }
      const result = regenerateCatalog(companyHome, bootstrap.ledger)
      if (result.written) ctx.logger?.info?.(`company-pack：成品目录已生成（${result.path}）`)
      if (bootstrap.needsScan) {
        // 后台回扫，不阻塞首屏：账本缺失/从旧索引迁移时，旧 present 事件可能只在会话日志里。
        // 用 ctx.inject 等 sessionQuery 服务就绪，而不是在 apply 时 ctx.get（后者在真实 boot 里可能还是 undefined）。
        const scan = async (query: PresentedSessionQuery): Promise<void> => {
          try {
            const observed = await presentedFromSessions(query, companyHome, AbortSignal.timeout(30_000))
            const recorded = recordPresented(companyHome, observed)
            if (recorded.ledger === undefined) {
              ctx.logger?.warn?.(`company-pack：presented 回扫结果未写账本（${recorded.warning ?? '未知原因'}）`)
              return
            }
            const regenerated = regenerateCatalog(companyHome, recorded.ledger)
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
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack 成品目录生成跳过（不影响运行）：${(error as Error).message}`)
  }
  ctx.on('session/event', (_session, event) => {
    if ((event as { type?: unknown }).type !== 'deliverables/presented') return
    if (rebound || dataBlocked) return
    try {
      const observed = presentedFromEvent(event, companyHome)
      if (observed.paths.size === 0 && observed.slugs.size === 0) return
      const recorded = recordPresented(companyHome, observed)
      if (recorded.ledger === undefined) {
        ctx.logger?.warn?.(`company-pack 成品目录 present 投影未写账本（${recorded.warning ?? '未知原因'}）`)
        return
      }
      regenerateCatalog(companyHome, recorded.ledger)
    } catch (error) {
      ctx.logger?.warn?.(`company-pack 成品目录 present 投影跳过（不影响运行）：${(error as Error).message}`)
    }
  })
}
