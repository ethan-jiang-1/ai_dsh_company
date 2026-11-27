/**
 * 培养人侧动作面（2026-10-17 培养 GUI 卡 S1）：面板按钮与创作表单**唯一**的发命令出口。
 *
 * 三件事：
 * ① 命令线构造——与人手敲逐字一致的 `/cultivation …`（采纳/拒绝/验证/撤回/纠正/建议）；
 * ② host 结果折算——host 的回执与错误**原话上行**，不吞成"点了没反应"（UX 卡第一号风险）；
 * ③ 文案表见 `./cultivation-copy.ts`（字典单独成件，审计 R2 可查逻辑区）。
 *
 * 通道 = 平台原生 `remote.commands.execute`（机制核证见推敲卡：host 一律记 `source: { kind: 'user' }`，
 * 角色闸在 host；客户端隐藏按钮只是 UX，不当授权）。命令面缺席 / 远程报错 / 抛错一律折成
 * 「改用命令行」的**明说**——不装作成功（不可达 ≠ 0 的老口径）。
 *
 * 校验分工：host 发下来的记录 id 与方法 slug 视为可信（它们经读模型解析、形状已验），
 * 只有**人写的自由文本**（期望行为 / 正文 / 拒绝理由）在这里校验——期望句不得含 `::`，
 * 因为 host 按**第一个** `::` 切期望与正文。
 *
 * keyless 判据 = `tests/client/cultivation/cultivation-actions.spec.ts`；真机制（真命令、真落盘）= browser-visual 探针。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { CULTIVATION_ROLES, WORK_TEXT_LIMIT } from '../../lib/cultivation/cultivation.ts'
import { CULTIVATION_COPY } from './cultivation-copy.ts'

export {
  CULTIVATION_COPY,
  cultivationClauseSeparator,
  cultivationListSeparator,
  cultivationTimeLabel,
  formatCultivationReadReason,
  setCultivationLanguage,
} from './cultivation-copy.ts'

export type DraftProblemCode =
  | 'expectationEmpty'
  | 'expectationSeparator'
  | 'workEmpty'
  | 'workTooLong'
  | 'bodyEmpty'
  | 'roleUnknown'
  | 'roleSelf'
  | 'reason'

export interface DraftProblem {
  readonly field: 'expectation' | 'body' | 'reason' | 'role'
  readonly message: string
  readonly code?: DraftProblemCode
}

const DRAFT_PROBLEM_KEYS: Readonly<Record<DraftProblemCode, keyof typeof CULTIVATION_COPY>> = {
  expectationEmpty: 'problemExpectationEmpty',
  expectationSeparator: 'problemExpectationSeparator',
  workEmpty: 'problemWorkEmpty',
  workTooLong: 'problemWorkTooLong',
  bodyEmpty: 'problemBodyEmpty',
  roleUnknown: 'problemRoleUnknown',
  roleSelf: 'problemRoleSelf',
  reason: 'problemReason',
}

/** 渲染期按当前培养语言解析校验错误，避免热切语言后滞留旧语文案（BUG-397）。 */
export function resolveDraftProblem(problem: DraftProblem): string {
  if (problem.code === undefined) return problem.message
  const key = DRAFT_PROBLEM_KEYS[problem.code]
  return String(CULTIVATION_COPY[key])
}

/** 线构造结果：可发或不可发（不可发必须带一句可读的原因）。 */
export type DraftResult =
  | { readonly ok: true, readonly line: string }
  | { readonly ok: false, readonly problem: DraftProblem }

/** 命令返回面里的结果最小结构（vendor `CommandResult`）。 */
export interface CommandOutcomeLike {
  readonly kind: 'success' | 'error'
  readonly text?: string
}

/**
 * 命令远程面的最小结构（本包惯例：局部声明，不为一个字段引整包类型图）。
 * 第三参数用 `never[]`：调用方一律传空附件，同时让真实生成面可赋给它。
 */
export interface CommandsRemoteFace {
  execute(
    sessionId: SessionId,
    line: string,
    submittedAttachments: readonly never[],
    signal?: AbortSignal,
  ): Promise<
    | { readonly ok: true, readonly value: { readonly result: CommandOutcomeLike } | undefined }
    | { readonly ok: false, readonly error: { readonly code: string, readonly message: string } }
  >
}

/**
 * 动作成功后广播的窗口事件名（常量单一事实）：同页可能同时开着**多个培养面板实例**
 * （侧栏页签 + 公司页第四子页 + 浮窗），各自 30s 轮询 ⇒ 一端改完另一端最多 30s 才同步（S13 实测）。
 * 广播让兄弟实例**秒级**重读；名字带包前缀，避免与平台事件撞。
 */
export const CULTIVATION_CHANGED_EVENT = 'dsh-company-pack/cultivation-changed'

/** 面板等命令面的上限（超过即取消并告人；断连时不设上限 = 按钮永久「处理中…」）。 */
export const DEFAULT_ACTION_TIMEOUT_MS = 20_000

/** 一次动作的结果：`ok` 只表示 host 判成功；`text` 一律给可读句子（成功回执或失败原因）。 */
export interface ActionOutcome {
  readonly ok: boolean
  readonly text: string
}

/** 面板动作面（一个会话一份）。 */
export interface CultivationActions {
  /** 发一条培养命令；永不抛——失败折成 `ok: false` + 原因。 */
  readonly run: (line: string) => Promise<ActionOutcome>
}

/** 按会话取动作面（容器渲染时以 `props.sessionId` 取；注册处给的是这个工厂）。 */
export type CultivationActionsFactory = (sessionId: SessionId) => CultivationActions

/** 校验期望行为一句话（非空、不含 `::`）。 */
function expectationProblem(expectation: string): DraftProblem | null {
  const one = expectation.trim()
  if (one === '') return { field: 'expectation', message: CULTIVATION_COPY.problemExpectationEmpty, code: 'expectationEmpty' }
  if (one.includes('::')) return { field: 'expectation', message: CULTIVATION_COPY.problemExpectationSeparator, code: 'expectationSeparator' }
  return null
}

/** 拒绝理由压成一行（host 只取首行，多行理由会被截断——这里替它压平）。 */
function flattenReason(reason: string): string {
  return reason.split('\n').map(line => line.trim()).filter(line => line !== '').join(' ')
}

/** `adopt <记录id>`：id 由读模型发下，可信。 */
export function adoptLine(id: string): string {
  return `/cultivation adopt ${id}`
}

/** `reject <记录id> :: <理由>`：理由非空且压成一行。 */
export function rejectLine(id: string, reason: string): DraftResult {
  const one = flattenReason(reason)
  if (one === '') return { ok: false, problem: { field: 'reason', message: CULTIVATION_COPY.problemReason, code: 'reason' } }
  return { ok: true, line: `/cultivation reject ${id} :: ${one}` }
}

/** `verify <记录id> pass|fail`。 */
export function verifyLine(id: string, outcome: 'pass' | 'fail', evidence?: string): string {
  const normalizedEvidence = evidence?.trim()
  return normalizedEvidence === undefined || normalizedEvidence === ''
    ? `/cultivation verify ${id} ${outcome}`
    : `/cultivation verify ${id} ${outcome} :: ${normalizedEvidence}`
}

/** `revoke <方法slug>`：slug 由采纳回执发下，可信。 */
export function revokeLine(slug: string): string {
  return `/cultivation revoke ${slug}`
}

/** `correct [--context=…] [--work=…] <期望行为> :: <正文>`（正文保真多行；期望句不得含 `::`）。 */
export function correctLine(expectation: string, body: string, contextToken?: string, work?: string): DraftResult {
  const problem = expectationProblem(expectation)
  if (problem !== null) return { ok: false, problem }
  const workText = work?.trim() ?? ''
  if (work !== undefined && workText === '') {
    return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemWorkEmpty, code: 'workEmpty' } }
  }
  if (workText.length > WORK_TEXT_LIMIT) {
    return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemWorkTooLong, code: 'workTooLong' } }
  }
  if (body.trim() === '' && contextToken === undefined && workText === '') {
    return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemBodyEmpty, code: 'bodyEmpty' } }
  }
  const flags = [
    contextToken === undefined ? '' : `--context=${contextToken}`,
    workText === '' ? '' : `--work=${encodeURIComponent(workText)}`,
  ].filter(flag => flag !== '').join(' ')
  const prefix = flags === '' ? '' : ` ${flags}`
  return { ok: true, line: `/cultivation correct${prefix} ${expectation.trim()} :: ${body.trim()}` }
}

/**
 * `suggest <角色> [--context=…] [--work=…] <期望行为> :: <正文>`。
 * @param targetRole - 建议指向的角色（须在名册）。
 * @param expectation - 期望行为一句话。
 * @param body - 建议与证据正文。
 * @param ownRole - 当前会话角色；给了就挡住"建议指向自己"（host 也会拒，这里先给人话）。
 */
export function suggestLine(targetRole: string, expectation: string, body: string, ownRole?: string, contextToken?: string, work?: string): DraftResult {
  if (!(CULTIVATION_ROLES as readonly string[]).includes(targetRole)) {
    return { ok: false, problem: { field: 'role', message: CULTIVATION_COPY.problemRoleUnknown, code: 'roleUnknown' } }
  }
  if (ownRole !== undefined && ownRole === targetRole) {
    return { ok: false, problem: { field: 'role', message: CULTIVATION_COPY.problemRoleSelf, code: 'roleSelf' } }
  }
  const draft = correctLine(expectation, body, contextToken, work)
  if (!draft.ok) return draft
  return { ok: true, line: `/cultivation suggest ${targetRole}${draft.line.slice('/cultivation correct'.length)}` }
}

/** 抛出来的东西折成一句可读原因（不信任 toString：照 vendor `renderThrown` 的手法）。 */
export function renderThrown(value: unknown): string {
  try {
    return String(value)
  } catch {
    // intentional-fallback: String(value) 抛错（Poisoned toString）时退回安全占位。
    return CULTIVATION_COPY.unreadableThrown
  }
}

/**
 * 造一个会话的动作面。
 * @param face - 命令远程面（`remote.commands`）；缺席 = 命令面不可用（面板只读降级）。
 * @param sessionId - 命令作用会话（= 面板所在会话；角色闸在 host）。
 * @returns 动作面（`run` 永不抛）。
 */
export function makeCultivationActions(
  face: CommandsRemoteFace | undefined,
  sessionId: SessionId,
  options: { readonly timeoutMs?: number } = {},
): CultivationActions {
  const timeoutMs = options.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS
  return {
    async run(line: string): Promise<ActionOutcome> {
      if (face === undefined) return { ok: false, text: CULTIVATION_COPY.unavailable }
      let result: Awaited<ReturnType<CommandsRemoteFace['execute']>>
      // 断连时命令面可能**既不 resolve 也不 reject**（实测）⇒ 超时即取消：面板永远能自己收口。
      const controller = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      // ⚠ 不能只 abort 就指望对方 reject：实测**命令面可以既不 settle 也不理 signal**。
      //   所以自己抢一个 race 的拒绝边（abort 只是尽力而为的取消）。
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error('command face did not answer before the panel deadline'))
        }, timeoutMs)
      })
      try {
        result = await Promise.race([face.execute(sessionId, line, [], controller.signal), deadline])
      } catch (error) {
        return {
          ok: false,
          text: controller.signal.aborted
            ? CULTIVATION_COPY.timedOut(Math.round(timeoutMs / 1000))
            : CULTIVATION_COPY.unreachable(renderThrown(error)),
        }
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
      if (!result.ok) return { ok: false, text: CULTIVATION_COPY.remoteFailed(result.error.code, result.error.message) }
      if (result.value === undefined) return { ok: false, text: CULTIVATION_COPY.unmatched }
      const { kind, text } = result.value.result
      const readable = text === undefined || text === '' ? CULTIVATION_COPY.done : text
      const outcome = { ok: kind === 'success', text: readable }
      // 成功才广播（失败没有状态变化可同步；广播本身也只在浏览器里——SSR/测试环境没有 window 就跳过）
      if (outcome.ok && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(CULTIVATION_CHANGED_EVENT))
      }
      return outcome
    },
  }
}
