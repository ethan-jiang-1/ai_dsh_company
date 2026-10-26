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
import { bootstrapCompanyWorkspace, bootstrapEnabled, resolveCompanyHome, resolveSkeletonDir } from './host/bootstrap.ts'
import {
  appendUpgradeLog,
  applySkeletonUpgrade,
  bundleManifestPath,
  planBundleManifest,
  planSkeletonUpgrade,
  readBundleManifestState,
  resolveRecordedWorkspace,
  resolvePackMetadata,
  writeBundleManifest,
  writeUpgradedManifest,
} from './host/bundle-manifest.ts'
import { presentedFromEvent, regenerateCatalog } from './host/catalog.ts'
import { registerCultivation, type CultivationHostConfig } from './host/cultivation.ts'
import { staleWorkspacePaths } from './host/workspace-registry.ts'

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
  // 培养回路（2026-10-13 培养卡）：分身提案工具 + /cultivation 人侧命令族 + 方法层写入。
  // 机制与权限分工见 ./host/cultivation.ts 头注。
  registerCultivation(ctx, config)
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

  // ── 工作区门投影工具（BUG-002，2026-10-06）────────────────────────────────────
  // 检测面 = 同 cwd 同 preset ≥2 个根会话 ⇒ duplicateWarning。角色会话和维护者均可调，
  // 成本 = 进程内事件维护的投影（零模型）。create 对话框是 vendor UI 摸不到 ⇒ 防线落在
  // 本 pack 拥有的面：工具 + client 视图高亮。
  // 机制：听 vendor `api-session/added/removed/status` 事件维护 cwd×preset 投影（不注入
  // sessions 服务——host 面没有直接可注入的 sessions catalog，事件是 vendor 提供的标准面）。
  // 盘守卫（卡 6）：会话 cwd 必须落在本 run bundle 的公司盘内；不一致只告警（不拒绝会话），
  // 页签/身份会显示「非公司盘 / 身份未配置」。bundle.json 的 workspace 是权威；没有身份时退回
  // DSH_COMPANY_HOME/companyHome。realpath 规避符号链接假阳性。
  const bundleHome = resolveDshHome()
  const configuredCompanyHome = resolveCompanyHome(bundleHome)
  const bundleState = readBundleManifestState(bundleHome)
  const recordedWorkspace = bundleState.status === 'ok'
    ? resolveRecordedWorkspace(bundleHome, bundleState.manifest.workspace)
    : undefined
  // bundle 身份以 bundle.json 的 workspace 为准；DSH_COMPANY_HOME 改到别处时不能静默
  // 在新路径再建一份公司盘（那会让一个 home 分裂成两个盘）。本次跳过自举/升级/目录重建，
  // 只告警；换盘/搬家 = 新 DSH_HOME，或备份后删除 bundle.json 重建。
  const rebound = recordedWorkspace !== undefined
    && canonicalPath(recordedWorkspace) !== canonicalPath(configuredCompanyHome)
  if (rebound) {
    const warning = `company-pack：bundle.json 记录的公司盘是 ${recordedWorkspace}，当前 DSH_COMPANY_HOME 解析为 ${configuredCompanyHome}；`
      + 'bundle 身份以记录为准，本次不写新盘/不升级/不重建目录。换盘或搬家请用新 DSH_HOME（先备份）；'
      + '确要在本 home 换指针，备份后删除 bundle.json 再启动。'
    ctx.logger?.warn?.(warning)
    // 数据分裂风险必须出现在启动输出里，不能只进 logger 文件（2026-10-26 实测 logger 不落 stdout）。
    process.stderr.write(`dsh: ${warning}\n`)
  }
  const companyHome = recordedWorkspace ?? configuredCompanyHome
  const expectedWorkspace = canonicalPath(companyHome)
  ctx.on('api-session/added', (summary) => {
    if (summary.origin === 'subagent') return
    if (typeof summary.cwd !== 'string' || summary.cwd === '') return
    const cwd = canonicalPath(summary.cwd)
    const rel = relative(expectedWorkspace, cwd)
    if (rel !== '' && (rel.startsWith('..') || isAbsolute(rel))) {
      ctx.logger?.warn?.(`company-pack：会话 ${String(summary.sessionId)} 的 cwd ${cwd} 不在公司盘 ${expectedWorkspace}；`
        + '页签/身份会显示「非公司盘 / 身份未配置」，不静默改读 cwd')
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
  if (!rebound && bootstrapEnabled()) {
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
    if (!rebound && existsSync(companyHome)) {
      const skeleton = resolveSkeletonDir(import.meta.url)
      const pack = resolvePackMetadata(import.meta.url)
      const state = bundleState
      if (state.status === 'corrupt') {
        // 不静默：损坏的 manifest 不是首启。保留原文件（身份不丢给猜测），要求人工修复或备份后删除。
        ctx.logger?.warn?.(`company-pack：bundle.json 损坏，已保留原文件并跳过身份/升级（${state.path}：${state.error}）；`
          + '修好后重启，或备份后删除该文件让下次启动重建')
      } else if (state.status === 'missing') {
        const plan = planBundleManifest({ dshHome: bundleHome, companyHome, skeletonDir: skeleton, pack })
        if (writeBundleManifest(plan).created) {
          ctx.logger?.info?.(`company-pack：run bundle 身份已建立（${plan.path}）`)
        }
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
    const registry = join(bundleHome, 'storages/workspace.json')
    if (!rebound && existsSync(registry)) {
      const stale = staleWorkspacePaths(JSON.parse(readFileSync(registry, 'utf8')), existsSync)
      if (stale.length > 0) {
        const warning = `company-pack：DSH workspace 登记里有 ${String(stale.length)} 条路径已不存在（${stale.join('、')}）；`
          + '搬 home/改名后请在侧栏重新添加工作区，旧 session 仍在旧路径下；本包不自动改 DSH 的登记。'
        ctx.logger?.warn?.(warning)
        process.stderr.write(`dsh: ${warning}\n`)
      }
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack workspace 登记体检跳过（不影响运行）：${(error as Error).message}`)
  }

  // ── 成品目录（2026-10-25，RFC installed-shape-self-sufficient）──────────────────
  // 首启生成空 catalog（页签显示“还没有成品”，而不是“维护者运行 node tools/...”）；
  // present 事件落盘后重生成。只写 workspace 的 kb/ 索引，不碰交付物本体。
  try {
    if (!rebound && existsSync(companyHome)) {
      const result = regenerateCatalog(companyHome)
      if (result.written) ctx.logger?.info?.(`company-pack：成品目录已生成（${result.path}）`)
    }
  } catch (error) {
    ctx.logger?.warn?.(`company-pack 成品目录生成跳过（不影响运行）：${(error as Error).message}`)
  }
  ctx.on('session/event', (_session, event) => {
    if ((event as { type?: unknown }).type !== 'deliverables/presented') return
    if (rebound) return
    try {
      const observed = presentedFromEvent(event, companyHome)
      if (observed.paths.size > 0) regenerateCatalog(companyHome, observed)
    } catch (error) {
      ctx.logger?.warn?.(`company-pack 成品目录 present 投影跳过（不影响运行）：${(error as Error).message}`)
    }
  })
}
