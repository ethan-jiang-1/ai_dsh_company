/**
 * 培养回路 host 面（2026-10-13 培养卡 C 路径）：`cultivation_propose` 工具 + `/cultivation`
 * 命令族 + 部署本地角色方法层写入。
 *
 * 权限分工（培养卡拍板③/V3/V4）：**提案对分身开放**（工具署 preset/会话），**采纳/拒绝/
 * 撤回/验证是人专用**——命令只由人在会话输入框敲（vendor `dsh-commands` 教义：命令不经模型、
 * run 记会话日志）；模型侧没有这些动作的工具。采纳的角色闸 = 命令所在会话的 preset 必须等于
 * 记录的目标角色（仅建议权：跨角色建议由目标本人采纳；单操作者可信协作口径，不宣称认证隔离）。
 *
 * 两个落点：
 * - **培养记录** = 会话 cwd 的 `cultivation/records/*.md`（公司盘共享，UI 与分身均可读，写留日志）；
 * - **方法层** = `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`（2026-10-28 M3 起公司级；
 *   旧 `<profile>/company-cultivation/<role>/` 只读留一版，host 启动一次性迁移）——根由 bundle patch
 *   行 config.cultivationRoot 注入（!!js 锚 baseUrl = loader 树根），与各角色 preset 的第二
 *   customSkillDirs 同前缀构造对齐；在分身 workspace 沙箱之外（D25 自改否决维持——workspace-write
 *   下分身写不了；danger-full-access 无围栏），pack 升级不擦。生效边界：**新开的该角色会话**加载
 *   （运行中会话不吃热更新——presets.md 生效边界表）。
 *
 * 文件操作与路径安全判据住 `./cultivation-storage.ts`（2026-10-16 拆出——存储层独立成模块，
 * 本文件只留命令语义与注册面）；安全不变量与威胁模型见该模块头注。
 *
 * keyless 判据 = `tests/host/cultivation.spec.ts`（读模型 + 已注册命令与临时文件行为）；真机制（目录发现/
 * 隔离/命令 wiring/跨会话生效）= `probes/session-context/cultivation-method-layer-probe.mjs`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { blockedCompanyText } from '../commands/blocked-text.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
// 纯类型导入：ctx.commands 的 Context 增强（服务本体由 base bundle 挂载，vendor patch 钉行）。
import type {} from '@deepseek-ai/dsh-commands'
import { join } from 'node:path'
import {
  contextSummary,
  decodeContextToken,
  type CultivationContext,
} from '../../lib/cultivation-context.ts'
import {
  CULTIVATION_ROLES,
  methodSkillText,
  parseRecord,
  recordText,
  recordBody,
  recordStampOf,
  roleLabel as defaultRoleLabel,
  type CultivationRecord,
  type CultivationVerification,
  encodeVerificationHistory,
  WORK_TEXT_LIMIT,
  VERIFICATION_EVIDENCE_LIMIT,
  VERIFICATION_HISTORY_LIMIT,
} from '../../lib/cultivation.ts'
import {
  clearPendingRevoke,
  recoverPendingRevoke,
  writePendingRevoke,
} from '../cultivation/revoke-journal.ts'
import { readContext } from '../cultivation/cultivation-context-read.ts'
import {
  ROSTER,
  SLUG_RE,
  UnsafeCultivationPathError,
  nodeCultivationStorage,
  writeRecordViaFs,
  type CultivationStorage,
  type FsWriteLike,
} from '../cultivation/cultivation-storage.ts'
import { canonicalPath } from '../run-bundle/paths.ts'
import { CompanyWriteBlockedError } from '../run-bundle/write-gate.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'

/** bundle patch 行注入的 host config（cordis.patch.yml `company-client` 行）。 */
export interface CultivationHostConfig {
  /** 方法层根（绝对路径，公司级 `$DSH_HOME/company/methods/`）；缺席时 adopt/revoke 明确报错。 */
  readonly cultivationRoot?: string
}

/** 记录目录（相对会话 cwd；公司盘共享）。 */
const RECORDS_REL = RUN_BUNDLE_PATHS.records

/** 会话角色 + cwd 的最小读面（工具与命令共用）。 */
interface SessionFace {
  readonly role: string
  readonly cwd: string
}

/** 命令/工具执行上下文里 Agent 的最小结构面（本地声明，不引 dsh-agent 类型图）。 */
interface AgentLike {
  readonly session?: { readonly header?: { readonly cwd?: string, readonly agentPreset?: string } } | undefined
}

/** 取可选 `ctx.fs`（模型发起的写优先走它；缺席回退 node:fs）。 */
function fsOf(ctx: Context): FsWriteLike | undefined {
  try {
    const get = (ctx as unknown as { get?: (name: string) => unknown }).get
    return typeof get === 'function' ? get.call(ctx, 'fs') as FsWriteLike | undefined : undefined
  } catch {
    return undefined
  }
}

/** 取会话 sandbox policy（fs-sandbox 需要；缺席时由 backend 用部署 fallback）。 */
function sandboxPolicyOf(ctx: Context, agent: unknown): unknown {
  try {
    const get = (ctx as unknown as { get?: (name: string) => unknown }).get
    const service = typeof get === 'function'
      ? get.call(ctx, 'sandboxPolicy') as { resolve?: (request: { session?: unknown }) => unknown } | undefined
      : undefined
    if (service?.resolve === undefined) return undefined
    const session = (agent as AgentLike | undefined)?.session
    return service.resolve(session === undefined ? {} : { session })
  } catch {
    return undefined
  }
}

/** 从执行上下文取「所在会话的角色 + cwd」；任一缺席给 null（调用方报可操作错误）。 */
function sessionFaceOf(agent: AgentLike | undefined): SessionFace | null {
  const header = agent?.session?.header
  const role = header?.agentPreset
  const cwd = header?.cwd
  if (typeof role !== 'string' || role === '' || !ROSTER.has(role)) return null
  if (typeof cwd !== 'string' || cwd === '') return null
  return { role, cwd }
}

/**
 * 公司数据作用域：bundle 的公司盘根，不是 session cwd。
 *
 * FAQ 26 的“作用域先于存储”：公司是 home/bundle 级；session cwd 只是会话工作目录，用户完全
 * 可以把会话开在公司盘子目录。若按 cwd 写培养记录，一个公司会出现多份账本。这里只认盘根；
 * 盘外/子目录一律给出可操作错误，由调用方决定文案。`companyHome` 缺席 = 兼容 keyless 测试与
 * 非 bundle 组合，退回 cwd（生产 host 恒传盘根）。
 * @param face - 会话角色 + cwd。
 * @param companyHome - bundle 解析出的公司盘根（已 canonical）。
 * @returns 可写根；或一句给用户看的问题。
 */
function companyScopeOf(face: SessionFace, companyHome: string | undefined): { readonly root: string; readonly problem?: string } {
  const cwd = canonicalPath(face.cwd)
  if (companyHome === undefined) return { root: cwd }
  const root = canonicalPath(companyHome)
  if (cwd === root) return { root }
  return {
    root,
    problem: `公司数据只写 bundle 的公司盘根（${root}）；当前会话 cwd 是 ${cwd}。请在侧栏以公司盘根开新会话，不要在子目录/盘外会话里培养。`,
  }
}

function splitBody(raw: string): { readonly head: string, readonly body: string } {
  const at = raw.indexOf('::')
  if (at === -1) return { head: raw.trim(), body: '' }
  return { head: raw.slice(0, at).trim(), body: raw.slice(at + 2).trim() }
}

/** 一个培养子命令的共享上下文（handler 只做分派，子命令各自成函数）。 */
interface CultivationCommandContext {
  readonly face: NonNullable<ReturnType<typeof sessionFaceOf>>
  readonly root: string
  readonly recordsDir: string
  readonly config: CultivationHostConfig
  readonly storage: CultivationStorage
  readonly ctx: Context
  readonly roleLabel: (role: string) => string
  readonly resultLabel: (result: string) => string
}

type CultivationCommandResult = { readonly kind: 'error' | 'success'; readonly text: string }

/** 命令行为只依赖会话输入、配置与培养存储；Cordis 注册留在外层适配器。 */
function cultivationCommandHandlerInner(config: CultivationHostConfig, storage: CultivationStorage, ctx: Context, companyHome?: string, dataBlocked = false, blockedReason?: string, roleLabel: (role: string) => string = defaultRoleLabel, resultLabel: (result: string) => string = result => result) {
  return async ({ agent, rawInput }: { readonly agent?: AgentLike, readonly rawInput: string }) => {
    const face = sessionFaceOf(agent)
    if (face === null) {
      return { kind: 'error' as const, text: '培养命令需要公司角色会话（当前会话不是公司角色 preset，或 cwd 缺席）。' }
    }
    if (dataBlocked) {
      return { kind: 'error' as const, text: blockedCompanyText(blockedReason, '培养') }
    }
    const scope = companyScopeOf(face, companyHome)
    if (scope.problem !== undefined) return { kind: 'error' as const, text: scope.problem }
    const { head, body } = splitBody(rawInput)
    const tokens = head.split(/\s+/).filter(t => t !== '')
    const sub = tokens[0] ?? ''
    const recordsDir = join(scope.root, RECORDS_REL)

    // correct [--context=<token>] <期望行为一句话> :: <做法与证据正文>
    // suggest <角色> [--context=<token>] <期望行为一句话> :: <建议与证据>
    if (sub === 'correct' || sub === 'suggest') {
      return commandCorrectOrSuggest({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, sub, tokens, body)
    }

    // adopt <id> [as <slug>]
    if (sub === 'adopt') {
      return commandAdopt({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, tokens)
    }

    // reject <id> :: <理由>
    if (sub === 'reject') {
      return commandReject({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, tokens, body)
    }

    // verify <id> <pass|fail> :: <后续相似工作的具体依据>
    if (sub === 'verify') {
      return commandVerify({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, tokens, body)
    }

    // archive <days>：只归档已处理记录，open 不动（人工保留策略）
    if (sub === 'archive') {
      return commandArchive({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, tokens)
    }

    // purge <days>：只清 records-archive 里的旧记录，不动 live records
    if (sub === 'purge') {
      return commandPurge({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, tokens)
    }

    // check：只报告孤儿（不自动删/改）
    if (sub === 'check') {
      return commandCheck({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel })
    }

    // revoke <slug>
    if (sub === 'revoke') {
      return commandRevoke({ face, root: scope.root, recordsDir, config, storage, ctx, roleLabel, resultLabel }, tokens)
    }

    return {
      kind: 'error' as const,
      text: '子命令只认：correct / suggest / adopt / reject / verify / revoke / archive / purge / check（培养页有各命令的一句话用法）。',
    }
  }
}

/**
 * 命令边界统一收口存储 typed error（BUG-127/130/141）：坏形状/写 gate 变可读回执，不抛到命令面。
 */
function cultivationCommandHandler(config: CultivationHostConfig, storage: CultivationStorage, ctx: Context, companyHome?: string, dataBlocked = false, blockedReason?: string, roleLabel: (role: string) => string = defaultRoleLabel, resultLabel: (result: string) => string = result => result) {
  const inner = cultivationCommandHandlerInner(config, storage, ctx, companyHome, dataBlocked, blockedReason, roleLabel, resultLabel)
  return async (input: { readonly agent?: AgentLike, readonly rawInput: string }): Promise<CultivationCommandResult> => {
    try {
      return await inner(input)
    } catch (error) {
      if (error instanceof UnsafeCultivationPathError) {
        return { kind: 'error', text: `培养记录目录不是安全目录（文件/symlink）：${error.message}；请修复后重试。` }
      }
      if (error instanceof CompanyWriteBlockedError) {
        return { kind: 'error', text: error.message }
      }
      throw error
    }
  }
}

/** `correct` / `suggest`：写一条培养记录（含可选背景与工作事实 token）。 */
async function commandCorrectOrSuggest(
  command: CultivationCommandContext,
  sub: 'correct' | 'suggest',
  tokens: readonly string[],
  body: string,
): Promise<CultivationCommandResult> {
  const { face, root, recordsDir, storage, ctx } = command
  const isSuggest = sub === 'suggest'
  const targetRole = isSuggest ? tokens[1] : face.role
  if (isSuggest && !ROSTER.has(targetRole ?? '')) {
    return { kind: 'error', text: '用法：suggest <角色> [--context=…] [--work=…] <期望行为一句话> :: <建议与证据>；角色须在名册。' }
  }
  let from = isSuggest ? 2 : 1
  let contextToken: string | undefined
  let workToken: string | undefined
  while (tokens[from] !== undefined && tokens[from]!.startsWith('--')) {
    const flag = tokens[from]!
    if (flag.startsWith('--context=')) {
      contextToken = flag.slice('--context='.length)
      from += 1
      continue
    }
    if (flag.startsWith('--work=')) {
      workToken = flag.slice('--work='.length)
      from += 1
      continue
    }
    break
  }
  const expectation = tokens.slice(from).join(' ').trim()
  if (expectation === '') return { kind: 'error', text: '期望行为不能为空（:: 之前的一句话）。' }
  if (isSuggest && targetRole === face.role) {
    return { kind: 'error', text: '给自己的角色用 correct；suggest 指向别的角色。' }
  }
  let contexts: readonly CultivationContext[] | undefined
  if (contextToken !== undefined) {
    const decoded = decodeContextToken(contextToken)
    if (!decoded.ok) return { kind: 'error', text: decoded.problem }
    const item = decoded.command.items[0]
    if (item === undefined) return { kind: 'error', text: '背景只能带一段（v1）。' }
    const read = await readContext(ctx, root, item, command.roleLabel, command.resultLabel)
    if ('problem' in read) return { kind: 'error', text: read.problem }
    contexts = [read.context]
  }
  let work: string | undefined
  if (workToken !== undefined) {
    if (workToken === '') return { kind: 'error', text: '工作事实不能为空（--work= 后面写这次什么工作）。' }
    let decoded: string
    try {
      decoded = decodeURIComponent(workToken)
    } catch {
      return { kind: 'error', text: '工作事实编码坏：不是合法的 URI 编码。' }
    }
    work = decoded.trim()
    if (work === '') return { kind: 'error', text: '工作事实不能为空（--work= 后面写这次什么工作）。' }
    if (work.length > WORK_TEXT_LIMIT) {
      return { kind: 'error', text: `工作事实最多 ${String(WORK_TEXT_LIMIT)} 个字符，请保留最相关的一段。` }
    }
  }
  if (body === '' && contexts === undefined && work === undefined) {
    return { kind: 'error', text: '正文不能为空（:: 之后写做法与证据；或至少写清这次工作）。' }
  }
  const source = contexts === undefined ? '（会话内提交）' : contextSummary(contexts[0]!)
  const id = storage.writeRecord(recordsDir, {
    kind: isSuggest ? 'suggestion' : 'correction',
    targetRole: targetRole!,
    proposerRole: face.role,
    proposerKind: 'human',
    source,
    ...(work === undefined ? {} : { work }),
    expectation,
    body,
    ...(contexts === undefined ? {} : { contexts }),
  })
  const action = isSuggest
    ? `建议 → ${command.roleLabel(targetRole!)}，待其本人在 ${command.roleLabel(targetRole!)} 会话里处理`
    : '纠正，待你采纳'
  const contextNote = contexts === undefined
    ? ''
    : `；背景「${contexts[0]!.title}」，以提交时服务端读到的版本为准`
  return {
    kind: 'success',
    text: `已提交培养记录 ${id}（${action}${contextNote}）。培养页可查收件箱。`,
  }
}

/** `revoke <slug>`：先写恢复日志、再改记录、最后删方法；失败可回滚。 */
async function commandRevoke(command: CultivationCommandContext, tokens: readonly string[]): Promise<CultivationCommandResult> {
  const { face, root, recordsDir, config, storage } = command
  const slug = tokens[1]
  const orphanConfirmed = tokens.includes('--orphan')
  if (slug === undefined) return { kind: 'error', text: '用法：revoke <方法slug> [--orphan]。' }
  if (config.cultivationRoot === undefined) {
    return { kind: 'error', text: '方法层根未配置（config.cultivationRoot 缺席）。' }
  }
  if (!SLUG_RE.test(slug)) return { kind: 'error', text: `方法 slug 不安全：${slug}。` }
  const recovered = recoverPendingRevoke(root, config.cultivationRoot, storage)
  if (recovered.status === 'conflict' || recovered.status === 'error') {
    return { kind: 'error', text: `有一笔未完成的 revoke 需要先处理（${recovered.problem}）；日志在 cultivation/.pending-revoke.json。` }
  }
  let records: readonly CultivationRecord[]
  try {
    if (storage.readMethod(config.cultivationRoot, face.role, slug) === null) {
      return { kind: 'error', text: `${command.roleLabel(face.role)} 方法层里没有方法 ${slug}。` }
    }
    const loaded = storage.loadRecords(recordsDir)
    // 「当前 records 不可达」不是「0 条记录」：不能据此删掉仍被其它视图引用的方法（BUG-090）。
    if (!loaded.reachable) {
      return { kind: 'error', text: `记录目录不可达：${recordsDir}；为保护仍被记录引用的方法，拒绝撤回 ${slug}。` }
    }
    records = loaded.records
  } catch (error) {
    if (error instanceof UnsafeCultivationPathError) return { kind: 'error', text: error.message }
    throw error
  }
  const revokedAt = new Date().toISOString()
  const pendingRecords: { readonly id: string, readonly text: string }[] = []
  for (const record of records) {
    if (record.status !== 'adopted' || record.methodSlug !== slug || record.targetRole !== face.role) continue
    const current = storage.readRecord(recordsDir, record.id)
    if (current !== null) pendingRecords.push({ id: record.id, text: current.text })
  }
  if (pendingRecords.length === 0 && !orphanConfirmed) {
    return {
      kind: 'error',
      text: `本 workspace 的 records 里没有引用方法 ${slug} 的采纳记录；它可能被其它 workspace 采纳（方法层是 home 级、records 是 workspace 级）。`
        + `确认它是孤儿后再执行 /cultivation revoke ${slug} --orphan。`,
    }
  }
  if (pendingRecords.length > 0) {
    try {
      writePendingRevoke(root, {
        schema: 1,
        role: face.role,
        slug,
        revokedAt,
        createdAt: revokedAt,
        records: pendingRecords,
      })
    } catch (error) {
      return { kind: 'error', text: `无法写 revoke 恢复日志，撤回未开始：${(error as Error).message}` }
    }
  }
  const updated: { readonly id: string, readonly text: string }[] = []
  const rollback = (): number => {
    let failed = 0
    for (const item of updated) {
      try { if (!storage.restoreRecord(recordsDir, item.id, item.text)) failed += 1 } catch { failed += 1 }
    }
    if (failed === 0) clearPendingRevoke(root)
    return failed
  }
  // 先写 journal、再改记录、最后删方法：崩溃后由 recoverPendingRevoke 判定回滚/补完。
  for (const record of records) {
    if (record.status !== 'adopted' || record.methodSlug !== slug || record.targetRole !== face.role) continue
    const current = storage.readRecord(recordsDir, record.id)
    if (current === null) continue
    if (!storage.updateRecord(recordsDir, record.id, { revokedAt }, current.text)) {
      const failed = rollback()
      return {
        kind: 'error',
        text: `撤回 ${slug} 已取消：记录 ${record.id} 在读取后被改过；${failed > 0 ? `另有 ${String(failed)} 条回滚失败（日志保留）` : '已回滚已改记录'}，请重试。`,
      }
    }
    updated.push({ id: record.id, text: current.text })
  }
  let methodDir: string | null
  try {
    methodDir = storage.removeMethod(config.cultivationRoot, face.role, slug)
  } catch (error) {
    const failed = rollback()
    if (error instanceof UnsafeCultivationPathError) return { kind: 'error', text: error.message }
    return {
      kind: 'error',
      text: `撤回 ${slug} 失败（${(error as Error).message}）；${failed > 0 ? `有 ${String(failed)} 条记录回滚失败（日志保留）` : '记录已回滚'}。`,
    }
  }
  if (methodDir === null) {
    const failed = rollback()
    return {
      kind: 'error',
      text: `撤回 ${slug} 时方法已不在；${failed > 0 ? `有 ${String(failed)} 条记录回滚失败（日志保留）` : '记录已回滚'}。`,
    }
  }
  clearPendingRevoke(root)
  return {
    kind: 'success',
    text: `已撤回方法 ${slug}（删除 ${methodDir}；标记 ${String(updated.length)} 条记录${pendingRecords.length === 0 ? '；--orphan 显式确认：本 workspace 无采纳记录' : ''}）。新开的 ${command.roleLabel(face.role)} 会话不再加载它。`,
  }
}


function commandAdopt(command: CultivationCommandContext, tokens: readonly string[]): CultivationCommandResult {
  const { face, recordsDir, config, storage } = command
        const id = tokens[1]
      if (id === undefined) return { kind: 'error' as const, text: '用法：adopt <记录id> [as <方法slug>]。' }
      const found = storage.readRecord(recordsDir, id)
      if (found === null) return { kind: 'error' as const, text: `记录 ${id} 不存在（cultivation/records/ 里没有 ${id}.md）。` }
      const { text } = found
      const record = parseRecord(id, text)
      if (record === null) return { kind: 'error' as const, text: `记录 ${id} 形状坏，无法采纳。` }
      if (record.status !== 'open') return { kind: 'error' as const, text: `记录 ${id} 已是 ${record.status === 'adopted' ? '已采纳' : '已拒绝'}，不重复处理。` }
      if (record.targetRole !== face.role) {
        return { kind: 'error' as const, text: `仅建议权：${record.id} 的培养对象是 ${command.roleLabel(record.targetRole)}，请在 ${command.roleLabel(record.targetRole)} 的会话里采纳。` }
      }
      if (config.cultivationRoot === undefined) {
        return { kind: 'error' as const, text: '方法层根未配置（bundle patch 行 config.cultivationRoot 缺席）——无法部署方法。' }
      }
      const rest = tokens.slice(2)
      let slug: string
      if (rest.length === 0) slug = `method-${id}`
      else if (rest.length === 2 && rest[0] === 'as' && (rest[1] ?? '') !== '') slug = rest[1] as string
      else return { kind: 'error' as const, text: '用法：adopt <记录id> [as <方法slug>]（as 后必须恰好一个 slug）。' }
      if (!SLUG_RE.test(slug)) {
        return { kind: 'error' as const, text: `方法 slug 只认小写字母/数字/连字符（≤64 位）：${slug}。` }
      }
      const proposalBody = recordBody(text)
      if (proposalBody === null) return { kind: 'error' as const, text: `记录 ${id} 形状坏，无法采纳。` }
      let installed: boolean
      try {
        installed = storage.installMethod(config.cultivationRoot, record.targetRole, slug, methodSkillText({ slug, expectation: record.expectation, body: proposalBody }))
      } catch (error) {
        if (error instanceof UnsafeCultivationPathError) return { kind: 'error' as const, text: error.message }
        throw error
      }
      if (!installed) return { kind: 'error' as const, text: `方法 ${slug} 已存在，未覆盖任何文件或记录。` }
      try {
        if (!storage.updateRecord(recordsDir, id, { status: 'adopted', methodSlug: slug, decidedAt: new Date().toISOString() }, text)) {
          try { storage.removeMethod(config.cultivationRoot, record.targetRole, slug) } catch { /* Preserve the conflict note. */ }
          return { kind: 'error' as const, text: `记录 ${id} 在读取后被改过，采纳已取消并撤回方法 ${slug}；请重试。` }
        }
      } catch (error) {
        try { storage.removeMethod(config.cultivationRoot, record.targetRole, slug) } catch { /* Preserve the original record-update failure. */ }
        throw error
      }
      return {
        kind: 'success' as const,
        text: `已采纳 ${id}：方法 ${slug} 部署到 ${command.roleLabel(record.targetRole)} 方法层。新开的 ${command.roleLabel(record.targetRole)} 会话会带着它开工；已经在跑的会话也会随技能目录刷新看到它（下一步就可能用上）。见效后在培养面板点「这条有用」回填，不灵了点「撤回…」（命令行：/cultivation verify ${id} pass|fail、/cultivation revoke ${slug}）。`,
      }
    
}

function commandReject(command: CultivationCommandContext, tokens: readonly string[], body: string): CultivationCommandResult {
  const { face, recordsDir, storage } = command
        const id = tokens[1]
      if (id === undefined || body === '') return { kind: 'error' as const, text: '用法：reject <记录id> :: <一句话理由>。' }
      const found = storage.readRecord(recordsDir, id)
      if (found === null) return { kind: 'error' as const, text: `记录 ${id} 不存在。` }
      const record = parseRecord(id, found.text)
      if (record === null) return { kind: 'error' as const, text: `记录 ${id} 形状坏。` }
      if (record.status !== 'open') return { kind: 'error' as const, text: `记录 ${id} 已处理过（${record.status}）。` }
      if (record.targetRole !== face.role) {
        return { kind: 'error' as const, text: `${record.id} 的培养对象是 ${command.roleLabel(record.targetRole)}，请在该角色会话里处理。` }
      }
      if (!storage.updateRecord(recordsDir, id, { status: 'rejected', reason: body.split('\n')[0]!, decidedAt: new Date().toISOString() }, found.text)) {
        return { kind: 'error' as const, text: `记录 ${id} 在读取后被改过，拒绝未写；请重试。` }
      }
      return { kind: 'success' as const, text: `已拒绝 ${id}（理由已留档，提出者可在培养页查回执）。` }
    
}

function commandVerify(command: CultivationCommandContext, tokens: readonly string[], evidence: string): CultivationCommandResult {
  const { face, recordsDir, storage } = command
  const id = tokens[1]
  const outcome = tokens[2]
  if (id === undefined || (outcome !== 'pass' && outcome !== 'fail')) {
    return { kind: 'error', text: '用法：verify <记录id> <pass|fail> :: <后续相似工作的具体依据>。' }
  }
  const normalizedEvidence = evidence.trim()
  if (normalizedEvidence === '') {
    return { kind: 'error', text: '验证需要后续相似工作的具体依据；请在 :: 之后写明发生了什么。' }
  }
  if (normalizedEvidence.length > VERIFICATION_EVIDENCE_LIMIT) {
    return { kind: 'error', text: `验证依据最多 ${String(VERIFICATION_EVIDENCE_LIMIT)} 个字符，请保留最相关的工作事实。` }
  }
  const found = storage.readRecord(recordsDir, id)
  if (found === null) return { kind: 'error', text: `记录 ${id} 不存在。` }
  const record = parseRecord(id, found.text)
  if (record === null) return { kind: 'error', text: `记录 ${id} 形状坏。` }
  if (record.status !== 'adopted') return { kind: 'error', text: `只有已采纳的方法才能回填验证（${id} 现为 ${record.status}）。` }
  if (record.revokedAt !== undefined) {
    return { kind: 'error', text: `方法 ${record.methodSlug ?? id} 已撤回（${record.revokedAt}），不能再回填验证；如需保留历史观察请另开记录。` }
  }
  if (record.targetRole !== face.role) {
    return { kind: 'error', text: `${record.id} 归 ${command.roleLabel(record.targetRole)}，请在该角色会话里回填。` }
  }
  const entry: CultivationVerification = { outcome, evidence: normalizedEvidence, at: new Date().toISOString() }
  const verificationHistory = [...(record.verificationHistory ?? []), entry].slice(-VERIFICATION_HISTORY_LIMIT)
  const updates = {
    verification: outcome,
    verificationHistory: encodeVerificationHistory(verificationHistory),
  }
  if (!storage.updateRecord(recordsDir, id, updates, found.text)) {
    return { kind: 'error', text: `记录 ${id} 在读取后被改过，验证未写；请重试。` }
  }
  return {
    kind: 'success',
    text: `已记录后续工作依据并回填验证：${id} → ${outcome === 'pass' ? '有用' : '没起作用'}。失败观察不会自动撤回方法。`,
  }
}

function commandArchive(command: CultivationCommandContext, tokens: readonly string[]): CultivationCommandResult {
  const { root, recordsDir, storage } = command
        const days = Number(tokens[1])
      if (!Number.isSafeInteger(days) || days < 1 || days > 3650) {
        return { kind: 'error' as const, text: '用法：archive <天数 1..3650>——只归档已处理（非 open）且早于该天数的记录。' }
      }
      const archiveDir = join(root, RUN_BUNDLE_PATHS.cultivation, 'records-archive')
      const loaded = storage.loadRecords(recordsDir)
      if (!loaded.reachable) return { kind: 'error' as const, text: `记录目录不可达：${recordsDir}` }
      const cutoff = Date.now() - days * 86_400_000
      let archived = 0
      let failed = 0
      for (const record of loaded.records) {
        if (record.status === 'open') continue
        const stamp = recordStampOf(record.id)
        if (stamp === null || stamp >= cutoff) continue
        try {
          if (storage.archiveRecord(recordsDir, archiveDir, record.id)) archived += 1
          else failed += 1
        } catch {
          failed += 1
        }
      }
      return {
        kind: 'success' as const,
        text: `已归档 ${String(archived)} 条记录到 cultivation/records-archive/${failed > 0 ? `；${String(failed)} 条未动（碰撞/读取失败）` : ''}`
          + `${loaded.broken > 0 ? `；另有 ${String(loaded.broken)} 条坏记录未动` : ''}。open 记录与时间戳不识别的记录保持原样。`,
      }
    
}

function commandPurge(command: CultivationCommandContext, tokens: readonly string[]): CultivationCommandResult {
  const { root, storage } = command
        const days = Number(tokens[1])
      if (!Number.isSafeInteger(days) || days < 1 || days > 3650) {
        return { kind: 'error' as const, text: '用法：purge <天数 1..3650>——只删除 cultivation/records-archive/ 里早于该天数的归档记录。' }
      }
      const archiveDir = join(root, RUN_BUNDLE_PATHS.cultivation, 'records-archive')
      let result: { removed: number, failed: number }
      try {
        result = storage.purgeArchive(archiveDir, Date.now() - days * 86_400_000)
      } catch (error) {
        if (error instanceof UnsafeCultivationPathError) return { kind: 'error' as const, text: error.message }
        throw error
      }
      return {
        kind: 'success' as const,
        text: `已清理归档 ${String(result.removed)} 条${result.failed > 0 ? `；${String(result.failed)} 条未动（非普通文件/删除失败）` : ''}。live records 未动。`,
      }
    
}

function commandCheck(command: CultivationCommandContext): CultivationCommandResult {
  const { face, recordsDir, config, storage } = command
        if (config.cultivationRoot === undefined) {
        return { kind: 'error' as const, text: '方法层根未配置（config.cultivationRoot 缺席）。' }
      }
      const loaded = storage.loadRecords(recordsDir)
      if (!loaded.reachable) return { kind: 'error' as const, text: `记录目录不可达：${recordsDir}` }
      const revoked = loaded.records.filter(record => record.revokedAt !== undefined).length
      const adopted = loaded.records.filter(record => record.status === 'adopted' && record.targetRole === face.role && record.revokedAt === undefined)
      const adoptedSlugs = new Set<string>()
      const missing: string[] = []
      const invalid: string[] = []
      for (const record of adopted) {
        const slug = record.methodSlug
        if (slug === undefined || slug === '') { missing.push(`${record.id}（缺 methodSlug）`); continue }
        // 非法 methodSlug 是「记录坏」，不是「方法缺失」；先按目标域校验，别把普通 Error 抛到命令面（BUG-091）。
        if (!SLUG_RE.test(slug)) { invalid.push(`${record.id}（methodSlug ${JSON.stringify(slug)} 不合法）`); continue }
        adoptedSlugs.add(slug)
        try {
          if (storage.readMethod(config.cultivationRoot, face.role, slug) === null) missing.push(`${record.id}（缺方法 ${slug}）`)
        } catch (error) {
          if (error instanceof UnsafeCultivationPathError) return { kind: 'error' as const, text: error.message }
          missing.push(`${record.id}（读方法 ${slug} 失败：${(error as Error).message}）`)
        }
      }
      let orphans: string[] = []
      try {
        orphans = storage.listMethods(config.cultivationRoot, face.role).filter(slug => !adoptedSlugs.has(slug))
      } catch (error) {
        if (error instanceof UnsafeCultivationPathError) return { kind: 'error' as const, text: error.message }
        throw error
      }
      const brokenNote = loaded.broken > 0 ? `；另有 ${String(loaded.broken)} 条坏记录未计入` : ''
      const revokedNote = revoked > 0 ? `；另有 ${String(revoked)} 条已撤回记录` : ''
      if (missing.length === 0 && orphans.length === 0 && invalid.length === 0) {
        return { kind: 'success' as const, text: `${command.roleLabel(face.role)} 方法层与已采纳记录一致（${String(adopted.length)} 条）${brokenNote}${revokedNote}。` }
      }
      return {
        kind: 'success' as const,
        text: `对账结果：${missing.length > 0 ? `记录缺方法 ${missing.join('、')}` : '记录与方法一一对应'}`
          + `${invalid.length > 0 ? `；非法记录 ${invalid.join('、')}` : ''}`
          + `${orphans.length > 0 ? `；方法无本 workspace 记录 ${orphans.join('、')}（可能属于其它 workspace；确认孤儿后再 revoke --orphan）` : ''}。`
          + `只报告，不自动删改${brokenNote}${revokedNote}。`,
      }
    
}

/** 「/cultivation」命令族与提案工具的注册面。 */
export function registerCultivation(ctx: Context, config: CultivationHostConfig, companyHome?: string, dataBlocked = false, blockedReason?: string, roleLabel: (role: string) => string = defaultRoleLabel, resultLabel: (result: string) => string = result => result): void {
  const storage = nodeCultivationStorage
  if (!dataBlocked && companyHome !== undefined && config.cultivationRoot !== undefined) {
    try {
      const recovered = recoverPendingRevoke(companyHome, config.cultivationRoot, storage)
      if (recovered.status === 'rolled-back' || recovered.status === 'completed') {
        ctx.logger?.info?.(`company-pack：已恢复未完成的 revoke（${recovered.status}，${String(recovered.count)} 条记录）`)
      } else if (recovered.status === 'conflict' || recovered.status === 'error') {
        ctx.logger?.warn?.(`company-pack：revoke 恢复未完成（${recovered.problem}）；日志保留在 cultivation/.pending-revoke.json`)
      }
    } catch (error) {
      ctx.logger?.warn?.(`company-pack：revoke 恢复跳过（不影响运行）：${(error as Error).message}`)
    }
  }
  // ── 分身提案工具（V3）：只开提案，不开采纳 ──────────────────────────────────
  ctx.tools.register(defineTool({
    name: 'cultivation_propose',
    description: 'Propose a cultivation record for your own role (correction) or another role (suggestion). '
      + 'A correction targets YOUR role and describes a working practice to adopt; a suggestion goes to a DIFFERENT '
      + 'role with evidence. Proposals are recorded in the company workspace and await the target role driver\'s '
      + 'decision (/cultivation adopt or reject, human-only). You cannot adopt your own or anyone\'s proposal.',
    parameters: {
      kind: {
        type: 'string',
        required: true,
        description: '"correction" (for your own role) or "suggestion" (to another role).',
      },
      targetRole: {
        type: 'string',
        required: true,
        description: `Role id the cultivation targets: ${CULTIVATION_ROLES.join(' / ')}.`,
      },
      expectation: {
        type: 'string',
        required: true,
        description: 'One sentence of the expected behavior, e.g. "收口前逐项列出未决项".',
      },
      body: {
        type: 'string',
        required: true,
        description: 'The proposed practice and its evidence (methodology first; keep company facts cited, not embedded).',
      },
      source: {
        type: 'string',
        description: 'Optional coordinate of the original material, e.g. "deliverables/x/final.md" or a session reference.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          recorded: { type: 'boolean', required: true },
          note: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const face = sessionFaceOf(exec.agent)
      if (face === null) {
        return { id: '', recorded: false, note: '提案需要公司角色会话上下文（agent preset + cwd）。' }
      }
      if (dataBlocked) {
        return { id: '', recorded: false, note: blockedCompanyText(blockedReason, '记录提案') }
      }
      const scope = companyScopeOf(face, companyHome)
      if (scope.problem !== undefined) {
        return { id: '', recorded: false, note: scope.problem }
      }
      if (!ROSTER.has(args.targetRole)) {
        return { id: '', recorded: false, note: `目标角色 ${args.targetRole} 不在名册（${CULTIVATION_ROLES.join('/')}）。` }
      }
      if (args.kind === 'correction' && args.targetRole !== face.role) {
        return { id: '', recorded: false, note: `纠正只指向自己的角色（当前会话 = ${face.role}）；给别的角色用 suggestion。` }
      }
      if (args.kind === 'suggestion' && args.targetRole === face.role) {
        return { id: '', recorded: false, note: '给自己的角色用 correction；suggestion 指向别的角色。' }
      }
      if (args.kind !== 'correction' && args.kind !== 'suggestion') {
        return { id: '', recorded: false, note: 'kind 只认 correction / suggestion。' }
      }
      // 模型入口与人类入口共用同一份目标域校验：空/空白不写盘，回执说真话（BUG-092）。
      const expectation = args.expectation.trim()
      const body = args.body.trim()
      if (expectation === '') return { id: '', recorded: false, note: '期望行为不能为空（一句话，写清想要的行为）。' }
      if (expectation.length > 500) return { id: '', recorded: false, note: '期望行为最多 500 个字符，请压成一句话。' }
      if (body === '') return { id: '', recorded: false, note: '正文不能为空（写清做法与证据）。' }
      if (body.length > 16_000) return { id: '', recorded: false, note: '正文最多 16000 个字符，请保留最相关的一段。' }
      const source = args.source?.trim()
      const draft = {
        kind: args.kind === 'suggestion' ? 'suggestion' as const : 'correction' as const,
        targetRole: args.targetRole,
        proposerRole: face.role,
        proposerKind: 'agent' as const,
        source: source !== undefined && source !== '' ? source : '（会话内提交）',
        expectation,
        body,
      }
      // 写入前做一次序列化→解析往返：目标域读不回来的形状不落盘，避免 recorded:true 的坏记录。
      if (parseRecord('proposal-preview', recordText(draft)) === null) {
        return { id: '', recorded: false, note: '记录形状不合法（序列化后无法解析），未写盘。' }
      }
      const recordsDir = join(scope.root, RECORDS_REL)
      const fs = fsOf(ctx)
      let id: string
      try {
        id = fs === undefined
          ? storage.writeRecord(recordsDir, draft)
          : await writeRecordViaFs(fs, recordsDir, draft, exec.signal, sandboxPolicyOf(ctx, exec.agent))
      } catch (error) {
        if (error instanceof UnsafeCultivationPathError) {
          return { id: '', recorded: false, note: `培养记录目录不是安全目录（文件/symlink）：${error.message}；请修复后重试。` }
        }
        if (error instanceof CompanyWriteBlockedError) return { id: '', recorded: false, note: error.message }
        throw error
      }
      return {
        id,
        recorded: true,
        note: `已记录培养提案 ${id}（${args.kind === 'correction' ? '纠正' : `建议 → ${roleLabel(args.targetRole)}`}），待目标角色本人用 /cultivation adopt 采纳或 reject 拒绝。`,
      }
    },
  }))

  // ── /cultivation 命令族（V4/V8：人专用直控面，不经模型）─────────────────────
  ctx.commands.register({
    name: 'cultivation',
    description: '培养回路：给自己的角色提交纠正、给别的角色提建议、采纳/拒绝/验证/撤回方法（采纳仅目标角色本人）',
    input: { hint: 'correct <期望行为> :: <做法与证据> | suggest <角色> <期望行为> :: <建议> | adopt <id> [as <slug>] | reject <id> :: <理由> | verify <id> <pass|fail> :: <后续相似工作的具体依据> | revoke <slug>' },
    handler: cultivationCommandHandler(config, storage, ctx, companyHome, dataBlocked, blockedReason, roleLabel, resultLabel),
  })
}
