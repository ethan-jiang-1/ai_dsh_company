/**
 * 培养人侧动作面（2026-10-17 培养 GUI 卡 S1）：面板按钮与创作表单**唯一**的发命令出口。
 *
 * 三件事：
 * ① 命令线构造——与人手敲逐字一致的 `/cultivation …`（采纳/拒绝/验证/撤回/纠正/建议）；
 * ② host 结果折算——host 的回执与错误**原话上行**，不吞成"点了没反应"（UX 卡第一号风险）；
 * ③ **文案表**——面向人的句子集中一处，迭代改文案不动逻辑。
 *
 * 通道 = 平台原生 `remote.commands.execute`（机制核证见推敲卡：host 一律记 `source: { kind: 'user' }`，
 * 角色闸在 host；客户端隐藏按钮只是 UX，不当授权）。命令面缺席 / 远程报错 / 抛错一律折成
 * 「改用命令行」的**明说**——不装作成功（不可达 ≠ 0 的老口径）。
 *
 * 校验分工：host 发下来的记录 id 与方法 slug 视为可信（它们经读模型解析、形状已验），
 * 只有**人写的自由文本**（期望行为 / 正文 / 拒绝理由）在这里校验——期望句不得含 `::`，
 * 因为 host 按**第一个** `::` 切期望与正文。
 *
 * keyless 判据 = `tests/client/cultivation-actions.spec.ts`；真机制（真命令、真落盘）= browser-visual 探针。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { CULTIVATION_ROLES } from '../lib/cultivation.ts'

/**
 * 面向人的文案（面板按钮、表单、校验提示、通道降级）。**迭代里改得最多的就是这里**——
 * 组件不得另写产品文案，一律引用本表。
 */
export const CULTIVATION_COPY = {
  // ── 治理动作 ─────────────────────────────────────────────────────────────
  adopt: '采纳',
  reject: '拒绝',
  rejectPlaceholder: '一句话理由（会留档给提出者）',
  rejectConfirm: '确认拒绝',
  verifyPass: '这条有用',
  verifyFail: '没起作用',
  revoke: '撤回…',
  revokeConfirm: '确认撤回',
  cancel: '取消',
  running: '处理中…',
  // ── 创作入口与表单 ───────────────────────────────────────────────────────
  composeCorrect: '给你的角色留一条方法',
  composeSuggest: '给别的角色提建议',
  submit: '记下来',
  expectationLabel: '期望它怎么做（一句话）',
  bodyLabel: '做法与证据',
  targetRoleLabel: '给哪个角色',
  // ── 校验提示 ─────────────────────────────────────────────────────────────
  problemExpectationEmpty: '先写一句「期望它怎么做」。',
  problemExpectationSeparator: '期望行为里不能出现 `::`（它是与正文的分隔符）。',
  problemBodyEmpty: '正文不能为空：写清做法与证据。',
  problemReason: '拒绝要留一句理由（会留档给提出者）。',
  problemRoleUnknown: `目标角色须在名册（${CULTIVATION_ROLES.join(' / ')}）。`,
  problemRoleSelf: '给自己的角色用「留一条方法」；建议指向别的角色。',
  // ── 通道降级（缺席/报错/抛错都不装作成功）─────────────────────────────────
  unavailable: '命令面不可用（这个界面没挂 /cultivation）——请改用命令行。',
  unmatched: '/cultivation 不在这个会话的命令面里——请改用命令行。',
  remoteFailed: (code: string, message: string): string => `命令面报错（${code}）：${message}`,
  unreachable: (reason: string): string => `命令面不可达：${reason}`,
  done: '已完成。',
} as const

/** 人写文本的校验问题（字段 + 给用户看的一句话）。 */
export interface DraftProblem {
  readonly field: 'expectation' | 'body' | 'reason' | 'role'
  readonly message: string
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

/** 校验期望行为一句话（非空、不含 `::`）。 */
function expectationProblem(expectation: string): DraftProblem | null {
  const one = expectation.trim()
  if (one === '') return { field: 'expectation', message: CULTIVATION_COPY.problemExpectationEmpty }
  if (one.includes('::')) return { field: 'expectation', message: CULTIVATION_COPY.problemExpectationSeparator }
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
  if (one === '') return { ok: false, problem: { field: 'reason', message: CULTIVATION_COPY.problemReason } }
  return { ok: true, line: `/cultivation reject ${id} :: ${one}` }
}

/** `verify <记录id> pass|fail`。 */
export function verifyLine(id: string, outcome: 'pass' | 'fail'): string {
  return `/cultivation verify ${id} ${outcome}`
}

/** `revoke <方法slug>`：slug 由采纳回执发下，可信。 */
export function revokeLine(slug: string): string {
  return `/cultivation revoke ${slug}`
}

/** `correct <期望行为> :: <正文>`（正文保真多行；期望句不得含 `::`）。 */
export function correctLine(expectation: string, body: string): DraftResult {
  const problem = expectationProblem(expectation)
  if (problem !== null) return { ok: false, problem }
  if (body.trim() === '') return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemBodyEmpty } }
  return { ok: true, line: `/cultivation correct ${expectation.trim()} :: ${body.trim()}` }
}

/**
 * `suggest <角色> <期望行为> :: <正文>`。
 * @param targetRole - 建议指向的角色（须在名册）。
 * @param expectation - 期望行为一句话。
 * @param body - 建议与证据正文。
 * @param ownRole - 当前会话角色；给了就挡住"建议指向自己"（host 也会拒，这里先给人话）。
 */
export function suggestLine(targetRole: string, expectation: string, body: string, ownRole?: string): DraftResult {
  if (!(CULTIVATION_ROLES as readonly string[]).includes(targetRole)) {
    return { ok: false, problem: { field: 'role', message: CULTIVATION_COPY.problemRoleUnknown } }
  }
  if (ownRole !== undefined && ownRole === targetRole) {
    return { ok: false, problem: { field: 'role', message: CULTIVATION_COPY.problemRoleSelf } }
  }
  const draft = correctLine(expectation, body)
  if (!draft.ok) return draft
  return { ok: true, line: `/cultivation suggest ${targetRole}${draft.line.slice('/cultivation correct'.length)}` }
}

/** 抛出来的东西折成一句可读原因（不信任 toString：照 vendor `renderThrown` 的手法）。 */
function renderThrown(value: unknown): string {
  try {
    return String(value)
  } catch {
    return '<无法显示的原因>'
  }
}

/**
 * 造一个会话的动作面。
 * @param face - 命令远程面（`remote.commands`）；缺席 = 命令面不可用（面板只读降级）。
 * @param sessionId - 命令作用会话（= 面板所在会话；角色闸在 host）。
 * @returns 动作面（`run` 永不抛）。
 */
export function makeCultivationActions(face: CommandsRemoteFace | undefined, sessionId: SessionId): CultivationActions {
  return {
    async run(line: string): Promise<ActionOutcome> {
      if (face === undefined) return { ok: false, text: CULTIVATION_COPY.unavailable }
      let result: Awaited<ReturnType<CommandsRemoteFace['execute']>>
      try {
        result = await face.execute(sessionId, line, [])
      } catch (error) {
        return { ok: false, text: CULTIVATION_COPY.unreachable(renderThrown(error)) }
      }
      if (!result.ok) return { ok: false, text: CULTIVATION_COPY.remoteFailed(result.error.code, result.error.message) }
      if (result.value === undefined) return { ok: false, text: CULTIVATION_COPY.unmatched }
      const { kind, text } = result.value.result
      const readable = text === undefined || text === '' ? CULTIVATION_COPY.done : text
      return { ok: kind === 'success', text: readable }
    },
  }
}
