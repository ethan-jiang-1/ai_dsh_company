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
import { CULTIVATION_ROLES, WORK_TEXT_LIMIT } from '../lib/cultivation.ts'

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
  verifyPassConfirm: '记录有用观察',
  verifyFailConfirm: '记录失败观察',
  verificationEvidenceLabel: '后续相似工作的具体情况',
  verificationEvidencePlaceholder: '例如：新的预算复盘仍未列出关键假设及其影响。',
  verificationEvidenceHint: '依据会和本次有用/没起作用的判断一起留在培养记录里。失败观察不会自动撤回方法。',
  verificationEvidenceRequired: '请写明一项采纳后的相似工作；没有新案例时可以先取消，不必造测试。',
  revoke: '撤回…',
  revokeConfirm: '确认撤回',
  /** 撤回是四个动作里唯一的破坏性动作：后果说全再让人点确认（比"再点一次"更有安全价值）。 */
  // ⚠ 2026-10-19 实测修正：**已经在跑的会话会随技能目录刷新看到变化**（方法层档 ⑧ 判据），
  //   所以不再写"运行中的会话不受影响"（那是未经证实的承诺）。撤回方向的目录刷新尚未验 ⇒ 不写。
  // ⑨ 实测（2026-10-19）：撤回后**运行中会话的目录也会被 watcher 摘除** ⇒ 可以把"已经在跑的"说进来。
  revokeConsequence: '撤回 = 删掉这个方法（该角色会话不再加载它，已经在跑的也会随目录刷新去掉），并且这条记录不能再被采纳。',
  /** 创作提交成功、刷新后给新记录打的标记（G4：让"刚记下"的那条看得见）。 */
  justSaved: '刚记下',
  cancel: '取消',
  running: '处理中…',
  // ── 创作入口与表单 ───────────────────────────────────────────────────────
  composeOpen: '开始记录一项工作',
  composeClose: '收起',
  composeCorrect: '给你的角色留一条方法',
  composeSuggest: '给别的角色提建议',
  workLabel: '这次什么工作 / 想改善什么',
  workPlaceholder: '例如：Q4 预算评审的结论用了预测数字，但没有列关键假设。',
  previewLabel: '提交前预览',
  previewTarget: '目标角色',
  previewWork: '这次工作',
  previewExpectation: '下次希望',
  previewBody: '补充做法与证据',
  previewBackground: '背景',
  previewEmptyWork: '未记录',
  selfNote: (role: string): string => `记录自己的纠正；提交后在「需要我处理」里由你（${role} 角色语境）决定。`,
  suggestNote: (role: string): string => `这是给 ${role} 的建议，由对方角色语境下的人决定；你这边只留回执。`,
  submit: '记下来',
  expectationLabel: '期望它怎么做（一句话）',
  expectationPlaceholder: '例如：收口前逐项列出未决项',
  bodyLabel: '做法与证据',
  bodyOptionalLabel: '做法（可选）',
  bodyHint: '写清做法与证据；也可以先加一段参考背景，审批人能看到现场。',
  bodyOptionalHint: '背景已带上；不写做法也能记下，审批人会看上面的背景。',
  contextLabel: '参考背景（可选）',
  contextAdd: '＋ 添加背景',
  contextHint: '选一段会话或一份成品，审批人能看到现场，你不用把来龙去脉写一遍。',
  contextPrivacy: '背景会写进公司盘的培养记录，相关角色可见；只选愿意共享的材料。',
  contextSecretWarning: '背景里可能有密钥/令牌样式内容；确认这是愿意写进公司盘的材料（不会自动脱敏）。',
  contextUseCurrent: '本次会话',
  contextPickTitle: '选择参考背景',
  contextSearchPlaceholder: '搜会话标题 / 角色 / 成品名…',
  contextSessions: '最近会话',
  contextDeliverables: '最近成品',
  contextEmpty: '还没有可引用的会话或成品。',
  contextLoading: '正在读取这段背景…',
  contextNoText: '这段会话没有可用的文字背景（可能只有工具调用）；换一段，或不带背景提交。',
  contextReadFailed: (reason: string): string => `这段背景读不到：${reason}。可以换一段，或不带背景提交。`,
  contextTimeout: '这段背景读得太慢——已停止。可以不带走背景继续，或重试。',
  contextRemove: '移除',
  contextChange: '更换',
  contextExpand: '展开',
  contextCollapse: '收起',
  contextClipped: '摘要较长，已截取；审批人看服务端版本。',
  bodyEmptyWithContext: '（未写做法；依据背景）',
  contextChangeTurn: '换一轮',
  contextOpenSession: '打开会话',
  contextOpenFile: '打开原文',
  contextTruncated: (turn: number, chars: number): string => `已截取最近 ${String(turn)} 轮，约 ${String(chars)} 字；原文可打开。`,
  contextBadPayload: (reason: string): string => `背景格式坏：${reason}`,
  contextTooLarge: (bytes: number): string => `背景太大（超过 ${String(bytes)} 字节），请选短一点的材料。`,
  teammateBanner: '这是 CEO 团队成员的会话：这里的纠正/建议按 CEO（Lead）身份记账；成员继承 CEO 的方法层。',
  memberBadge: (name: string): string => `成员 ${name}（CEO 团队）`,
  /** 长正文折叠（2026-10-18 场景轮：60 行正文撑出 1156px 的行高，把别的待办全顶到看不见的地方）。 */
  bodyExpand: (lines: number): string => `展开全文（共 ${String(lines)} 行）`,
  /** 列表折叠（2026-10-19：300 条待办一屏滚 = 能用但不好用）——默认只显示最近若干条。 */
  listShowAll: (count: number): string => `显示全部（共 ${String(count)} 条）`,
  listShowLess: '只看最近的',
  bodyCollapse: '收起',
  targetRoleLabel: '给哪个角色',
  // ── 校验提示 ─────────────────────────────────────────────────────────────
  problemExpectationEmpty: '先写一句「期望它怎么做」。',
  problemExpectationSeparator: '期望行为里不能出现 `::`（它是与正文的分隔符）。',
  problemBodyEmpty: '正文不能为空：写清做法与证据，或写清这次工作/带一段背景。',
  problemWorkEmpty: '先写这次什么工作或想改善什么。',
  problemWorkTooLong: `工作事实最多 ${String(WORK_TEXT_LIMIT)} 个字符，请保留最相关的一段。`,
  problemReason: '拒绝要留一句理由（会留档给提出者）。',
  problemRoleUnknown: `目标角色须在名册（${CULTIVATION_ROLES.join(' / ')}）。`,
  problemRoleSelf: '给自己的角色用「留一条方法」；建议指向别的角色。',
  // ── 通道降级（缺席/报错/抛错都不装作成功）─────────────────────────────────
  unavailable: '命令面不可用（这个界面没挂 /cultivation）——请改用命令行。',
  unmatched: '/cultivation 不在这个会话的命令面里——请改用命令行。',
  remoteFailed: (code: string, message: string): string => `命令面报错（${code}）：${message}`,
  unreachable: (reason: string): string => `命令面不可达：${reason}`,
  done: '已完成。',
  /** 动作面契约上永不抛；真抛了也得说清楚（BUG-024：抛错曾让按钮永久停在「处理中…」）。 */
  unexpected: (reason: string): string => `面板内部出错（已收回按钮，可重试）：${reason}`,
  /** 命令面**不回话**（断连时可能既不 resolve 也不 reject——实测过一次）：不能无限等，必须能自己收口。 */
  timedOut: (seconds: number): string => `命令面 ${String(seconds)} 秒没回话（可能断连）——已收回按钮，可重试。`,
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
    return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemWorkEmpty } }
  }
  if (workText.length > WORK_TEXT_LIMIT) {
    return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemWorkTooLong } }
  }
  if (body.trim() === '' && contextToken === undefined && workText === '') {
    return { ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemBodyEmpty } }
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
    return { ok: false, problem: { field: 'role', message: CULTIVATION_COPY.problemRoleUnknown } }
  }
  if (ownRole !== undefined && ownRole === targetRole) {
    return { ok: false, problem: { field: 'role', message: CULTIVATION_COPY.problemRoleSelf } }
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
    return '<无法显示的原因>'
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
