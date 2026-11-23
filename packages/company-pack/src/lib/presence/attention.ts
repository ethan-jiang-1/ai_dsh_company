/**
 * 「需要你」注意力读模型（驾驶舱①切片一）。
 *
 * 两类数据源折成同一种注意力条目：
 * - **远端事件**（跨会话、实时）：`user-questions/request`（待答问询）与 `approval/request`
 *   （待批审批）——由 client 入口的**观察者监听器**登记 / 销账（waterfall 委托、不拦截应答；
 *   机制同款 vendor `ui-approval` / `ui-user-questions` 的 `ctx.remote.$on`）。切片二落地前
 *   审批源不会触发（无工具请求审批），管线先行。
 * - **lead 会话事件流**（`session/follow`）：`tool/call`(present)（完成通知）与含[NEEDS-CLARIFICATION]
 *   前缀的 `team/message/queued`（升级待处理 = 问询切片三甲的中继链显性化）。
 *
 * 纯函数、只依赖文本工具；wire 形状 → 领域形状，UI 只消费 {@link AttentionItem}。
 * keyless 单测 = `tests/client/wiring/attention.spec.ts`。
 */
import { takeBounded } from '../shared/bounded.ts'
import { isRecord } from '../shared/guards.ts'
import { firstText } from '../shared/text.ts'

/** 注意力条目类别。 */
export type AttentionKind = 'question' | 'approval' | 'escalation' | 'completion'

/** 语义化的待办摘要 token，供 UI 按当前语言渲染（lib 层不硬编码中文，UI 层调 locales）。 */
export type AttentionWhatToken =
  | { readonly kind: 'escalation-empty' }
  | { readonly kind: 'completion'; readonly label: string | null }
  | { readonly kind: 'approval-missing-tool' }
  | { readonly kind: 'approval'; readonly toolName: string; readonly reason?: string }
  | { readonly kind: 'question-missing' }
  | { readonly kind: 'question-multi'; readonly first: string; readonly count: number }

/** 一条注意力条目（面板行）。 */
export interface AttentionItem {
  readonly kind: AttentionKind
  /** 发起方（升级 = senderName；完成 = lead 名；问询/审批 = 占位，面板按 displayTitle 解析）。 */
  readonly who: string
  /** 一句话摘要（列表行用：已按 {@link ATTENTION_SUMMARY_MAX} 折叠，不随外部文本膨胀）。 */
  readonly what: string
  /** 可选语义 token；在场时面板按 zh/en 字典本地化，否则展示 {@link what}。 */
  readonly whatToken?: AttentionWhatToken
  /** 完整详情（审批理由/问询全文）；列表不渲染它，只给 hover/详情面（BUG-295）。 */
  readonly detail?: string
  /**
   * 稳定身份（审批/问询 id）。**去重必须用它**——按摘要去重会把两条同摘要的不同审批塌成一条
   * （BUG-299）。消息类事件（escalation/completion）没有 id，只能退回内容+时间。
   */
  readonly id?: string
  /** 何时发生（epoch ms）。 */
  readonly time: number
  /** 一键跳转目标会话 id。 */
  readonly jumpTo: string
}

/** 远端观察者登记的挂起项（client 入口维护生命周期，读模型只消费）。 */
export interface LivePending {
  readonly kind: 'question' | 'approval'
  readonly sessionId: string
  readonly what: string
  /** 与 {@link AttentionItem.whatToken} 同义；透传到面板做 zh/en 渲染。 */
  readonly whatToken?: AttentionWhatToken
  /** 完整详情（与 `what` 同源、未折叠）；列表不渲染它。 */
  readonly detail?: string
  /** 稳定身份（审批 id / 问询 id）；去重用，见 {@link attentionItemKey}。 */
  readonly id?: string
  readonly since: number
}

/** 列表摘要的字符上限（模型写的审批理由可达数 KB；列表行必须可扫）。 */
export const ATTENTION_SUMMARY_MAX = 160

/**
 * 把外部文本折叠成列表可扫的一行摘要：换行/连续空白压成单空格，超长截断加省略号。
 * 活体登记与历史重建**必须**共用它——两处拼接不同源会让 `mergeAttention` 的去重键对不上而重复。
 * @param text - 外部文本（模型生成的理由/问询/消息）。
 * @param max - 字符上限。
 * @returns 单行摘要。
 */
export function attentionSummary(text: string, max = ATTENTION_SUMMARY_MAX): string {
  const flat = String(text).replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`
}

/** follow 流可折事件的最小形状（team/* 由 presence.ts 同款兜底臂覆盖）。 */
export type AttentionEventLike =
  | { type: 'tool/call'; time: number; data: { callId?: string; name?: string; arguments?: string } }
  | {
    type: 'team/message/queued'
    time: number
    data: { message: { senderName: string; content: readonly { type: string; text?: string }[] } }
  }
  // 兜底：其他事件类型忽略不折。
  | { type: string; time: number; data: unknown }

/** 升级消息的标记约定（切片三甲；VP skill 侧将配合输出此前缀——内容步随培养节奏落）。 */
export const ESCALATION_MARK = '[NEEDS-CLARIFICATION]'

/** present 工具的 wire 名（vendor `packages/fs/tool-present/src/index.ts` `name: 'present'`）。 */
export const PRESENT_TOOL_NAME = 'present'

/** 流折条目各类保留上限（防历史淹没面板）。 */
export const STREAM_ITEM_CAP = 5

const isToolCall = (event: AttentionEventLike):
  event is Extract<AttentionEventLike, { type: 'tool/call' }> => event.type === 'tool/call'
const isMessage = (event: AttentionEventLike):
  event is Extract<AttentionEventLike, { type: 'team/message/queued' }> => event.type === 'team/message/queued'

/** present 调用参数里取可读摘要（title / slug / path 字段；取不到返回 null 交 UI 本地化）。 */
function presentLabel(argumentsJson: string | undefined): string | null {
  if (argumentsJson === undefined) return null
  try {
    const parsed: unknown = JSON.parse(argumentsJson)
    if (parsed !== null && typeof parsed === 'object') {
      for (const key of ['title', 'slug', 'path']) {
        const value = (parsed as Record<string, unknown>)[key]
        if (typeof value === 'string' && value.trim() !== '') return value.trim()
      }
    }
  } catch {
    // intentional-fallback: 解析失败按无摘要处理；present 的参数形状不是本读模型的契约。
  }
  return null
}

/** 审批条目文案/token 构造（观察者与历史重建共用，保证跨源一致且不硬编码 UI 中文）。 */
export function buildApprovalCopy(
  toolNameRaw: unknown,
  reasonRaw: unknown,
): { readonly what: string, readonly detail?: string, readonly whatToken: AttentionWhatToken } {
  if (typeof toolNameRaw !== 'string' || toolNameRaw === '') {
    return { what: '(tool name missing)', whatToken: { kind: 'approval-missing-tool' } }
  }
  const toolName = toolNameRaw
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : ''
  const full = reason === '' ? toolName : `${toolName}: ${reason}`
  return {
    what: attentionSummary(full),
    ...(reason === '' ? {} : { detail: full }),
    whatToken: reason === '' ? { kind: 'approval', toolName } : { kind: 'approval', toolName, reason },
  }
}

/**
 * lead 会话事件流 → 升级 + 完成 条目。
 * @param events - follow 流累计的事件（快照 + 实时追加）。
 * @param leadSessionId - 事件流所属的 lead 会话（跳转目标）。
 * @param leadName - lead 显示名（完成通知的 who）。
 * @returns 升级与完成条目（各类截最近 {@link STREAM_ITEM_CAP} 条）。
 */
export function streamAttention(
  events: readonly AttentionEventLike[],
  leadSessionId: string,
  leadName: string,
): readonly AttentionItem[] {
  const escalations: AttentionItem[] = []
  const completions: AttentionItem[] = []
  for (const event of events) {
    if (isMessage(event)) {
      const text = firstText(event.data.message.content)
      if (text.startsWith(ESCALATION_MARK)) {
        const body = text.slice(ESCALATION_MARK.length).trim()
        escalations.push({
          kind: 'escalation',
          who: event.data.message.senderName,
          what: body === '' ? '(empty)' : attentionSummary(body),
          ...(body === '' ? { whatToken: { kind: 'escalation-empty' } as const } : {}),
          time: event.time,
          jumpTo: leadSessionId,
        })
      }
    } else if (isToolCall(event) && event.data.name === PRESENT_TOOL_NAME) {
      const label = presentLabel(event.data.arguments)
      completions.push({
        kind: 'completion',
        who: leadName,
        what: attentionSummary(label === null ? 'Deliverable' : `Delivered: ${label}`),
        whatToken: { kind: 'completion', label },
        time: event.time,
        jumpTo: leadSessionId,
      })
    }
  }
  return [...escalations.slice(-STREAM_ITEM_CAP), ...completions.slice(-STREAM_ITEM_CAP)]
}

/**
 * 从审批载体（远端 `approval/request` 或会话事件 `approval/asked` / `approval/decided`）安全提取字段。
 * 非对象返回 null（防止畸形事件或远端 payload 在解引用时抛错中断流水线）。
 */
export function approvalFromPayload(
  payload: unknown,
): { readonly id?: string; readonly toolName: unknown; readonly reason: unknown } | null {
  if (!isRecord(payload)) return null
  const id = typeof payload.id === 'string' && payload.id !== '' ? payload.id : undefined
  return {
    ...(id === undefined ? {} : { id }),
    toolName: payload.toolName,
    reason: payload.reason,
  }
}

/**
 * 从 lead 会话事件流重建**仍挂起**的审批（历史可重建的部分）。
 *
 * 为什么需要（2026-11-21 BUG-288）：`waiting` 原只来自本页活体观察者（waterfall 仅在页面
 * 在场时登记），于是刷新页面 / 后开观察窗时，已挂起的审批在待办里凭空消失，空态还宣称
 * 「没有等你的事」。会话日志本身有 `approval/asked {id,toolName,reason?}` 与
 * `approval/decided {id,outcome}`，配对即可重建"问了但没答"的条目。
 *
 * @param events - lead 会话事件流（`session/follow` 累积）。
 * @param sessionId - 事件所属会话（= 一键跳转目标）。
 * @returns 按时间倒序的审批条目 + 被上限截掉的条数（BUG-320：第 6 条不能静默消失）。
 */
export function pendingApprovals(events: readonly AttentionEventLike[], sessionId: string): PendingApprovals {
  const asked = new Map<string, AttentionItem>()
  for (const event of events) {
    const data = approvalFromPayload(event.data)
    if (data === null || data.id === undefined) continue
    if (event.type === 'approval/asked') {
      const copy = buildApprovalCopy(data.toolName, data.reason)
      asked.set(data.id, {
        kind: 'approval',
        who: sessionId,
        id: data.id,
        what: copy.what,
        whatToken: copy.whatToken,
        ...(copy.detail === undefined ? {} : { detail: copy.detail }),
        time: event.time,
        jumpTo: sessionId,
      })
    } else if (event.type === 'approval/decided') {
      asked.delete(data.id)
    }
  }
  const sorted = [...asked.values()].sort((a, b) => b.time - a.time)
  const bounded = takeBounded(sorted, STREAM_ITEM_CAP)
  return { items: bounded.items, capped: bounded.capped }
}

/** 审批重建结果：条目 + 被 `STREAM_ITEM_CAP` 截掉多少（面板据此说「还有 N 条审批未显示」）。 */
export interface PendingApprovals {
  readonly items: readonly AttentionItem[]
  readonly capped: number
}

/**
 * 合并两源：**等人**（问询/审批挂起）在前、**告知**（升级/完成）在后，各段按时间倒序。
 * @param live - 远端观察者登记的挂起项。
 * @param streamItems - 流折条目。
 * @returns 面板条目序列。
 */
export function mergeAttention(
  live: readonly LivePending[],
  streamItems: readonly AttentionItem[],
): readonly AttentionItem[] {
  const byTimeDesc = (a: AttentionItem, b: AttentionItem): number => b.time - a.time
  const waiting: AttentionItem[] = live.map(entry => ({
    kind: entry.kind,
    who: entry.sessionId,
    what: entry.what,
    ...(entry.whatToken === undefined ? {} : { whatToken: entry.whatToken }),
    ...(entry.detail === undefined ? {} : { detail: entry.detail }),
    ...(entry.id === undefined ? {} : { id: entry.id }),
    time: entry.since,
    jumpTo: entry.sessionId,
  }))
  // 活体登记与「历史重建」可能指向同一条挂起（本页看着它发起、刷新后又能重建）——按**身份**去重，
  // 优先活体（它带真实 since）。按摘要去重会让两条同摘要的不同审批互相吞掉（BUG-299）。
  const seen = new Set(waiting.map(attentionItemKey))
  // 跨源身份（BUG-325）：问询的活体 id 是合成的（312）、历史 id 是 `callId`（319）——两套 id 各自都对，
  // 拼起来会让同一条问询显示两行。这里对 **live ↔ history** 之间的问询按多重集配额去重（1:1 抵消），
  // 既防止同一条被重复渲染，也不吞掉仅有历史或同文多条的问询；源内仍按 id（保 312）。
  const liveQuestionBudget = new Map<string, number>()
  for (const item of waiting) {
    if (item.kind !== 'question') continue
    const qKey = questionContentKey(item)
    liveQuestionBudget.set(qKey, (liveQuestionBudget.get(qKey) ?? 0) + 1)
  }
  const rebuilt = streamItems.filter(item => {
    const key = attentionItemKey(item)
    if (seen.has(key)) return false
    if (item.kind === 'question') {
      const qKey = questionContentKey(item)
      const budget = liveQuestionBudget.get(qKey) ?? 0
      if (budget > 0) {
        liveQuestionBudget.set(qKey, budget - 1)
        return false
      }
    }
    seen.add(key)
    return true
  })
  return [...waiting.sort(byTimeDesc), ...rebuilt.slice().sort(byTimeDesc)]
}


/**
 * 一条注意力条目的去重身份（`mergeAttention` 与列表 React key 共用）。
 *
 * 有 `id` 时 = kind + 跳转会话 + id：**两条同摘要的不同审批是两条**（BUG-299）。
 * 无 `id` 的消息类（escalation/completion/question 的部分来源）退回 kind + 跳转会话 + 内容：
 * 这类事件没有稳定 id，内容就是它们的身份；不回退到时间，否则同一条 live/历史会因时间戳
 * 差几毫秒而重复。
 * @param item - 待办条目。
 * @returns 去重键。
 */
export function attentionItemKey(item: AttentionItem): string {
  // 无 id 的只剩消息类（escalation/completion，来自事件流、本身唯一）：用时间定位。
  // **绝不回落到 `what`**——同文两条会撞 key（BUG-312 就是这么冒出来的）。
  return item.id === undefined
    ? `${item.kind}\u0000${item.jumpTo}\u0000${String(item.time)}`
    : `${item.kind}\u0000${item.jumpTo}\u0000#${item.id}`
}

/** 问询的**跨源**内容键（只在 live↔history 之间用；源内仍按 id）。 */
function questionContentKey(item: AttentionItem): string {
  return `${item.kind}\u0000${item.jumpTo}\u0000${item.what}`
}

/** 类别 → Tag 色调（等人的醒目、告知的低调）。 */
export function attentionTone(kind: AttentionKind): 'info' | 'danger' | 'warning' | 'outline' {
  switch (kind) {
    case 'question': return 'warning'
    case 'approval': return 'danger'
    case 'escalation': return 'info'
    case 'completion': return 'outline'
  }
}

/** 问询工具的 wire 名（vendor `ask_user_question`）。 */
export const ASK_TOOL_NAME = 'ask_user_question'

/**
 * 从结构化问询载体（远端 `user-questions/request` 或已解析的 `ask_user_question` 参数）中安全提取有效问句（BUG-331）。
 * @param payload - 原始对象；非对象或 `questions` 非数组时返回空数组（不抛错）。
 * @returns 去空白后的有效问句列表。
 */
export function questionsFromPayload(payload: unknown): readonly string[] {
  if (!isRecord(payload) || !Array.isArray(payload.questions)) return []
  return payload.questions
    .map(item => (isRecord(item) && typeof item.question === 'string' ? item.question.trim() : ''))
    .filter(text => text !== '')
}

/**
 * 从 `tool/call` 的 arguments（JSON 字符串）里读问题清单（BUG-331：一次请求可以带多个问题）。
 * @param argumentsText - 工具的 arguments（JSON 字符串）。
 * @returns 全部有效问句；读不出给空数组。
 */
export function questionListOf(argumentsText: string | undefined): readonly string[] {
  if (typeof argumentsText !== 'string' || argumentsText.trim() === '') return []
  try {
    return questionsFromPayload(JSON.parse(argumentsText) as unknown)
  } catch {
    return []
  }
}

/**
 * 问询条目的摘要与语义 token（观察者与历史重建共用）。
 * @param questions - 全部问句。
 * @returns `{ what, detail?, whatToken? }`；无问句时给占位 token 且无 detail。
 */
export function buildQuestionCopy(
  questions: readonly string[],
): { readonly what: string, readonly detail?: string, readonly whatToken?: AttentionWhatToken } {
  if (questions.length === 0) return { what: '(question missing)', whatToken: { kind: 'question-missing' } }
  const first = questions[0]!
  if (questions.length === 1) {
    return { what: attentionSummary(first), detail: first }
  }
  const what = attentionSummary(`${first} (${String(questions.length)} questions)`)
  const detail = questions.map((text, i) => `${String(i + 1)}. ${text}`).join('\n')
  return { what, detail, whatToken: { kind: 'question-multi', first, count: questions.length } }
}

/**
 * 从会话历史重建**仍挂着**的问询（BUG-319）：问询在日志里是 `ask_user_question` 的 `tool/call`，
 * 答案以同 `callId` 的 `tool/result` 落回——没有配对结果的就是「问了没答」。
 *
 * 为什么必须有这条：问询的活体登记只覆盖本页在场期，刷新后审批能重建、问询却消失，
 * 于是「等你处理」少了半张清单（官方问询卡还在该会话里，但待办聚合面不再指向它）。
 * @param events - 会话事件流。
 * @param sessionId - 事件所属会话（= 跳转目标）。
 * @returns 挂起问询（按时间倒序）。
 */
export function pendingQuestions(events: readonly AttentionEventLike[], sessionId: string): readonly AttentionItem[] {
  const open = new Map<string, AttentionItem>()
  for (const event of events) {
    const data = event.data as { callId?: unknown; name?: unknown; arguments?: unknown; id?: unknown } | null
    if (typeof data !== 'object' || data === null) continue
    if (event.type === 'tool/call' && data.name === ASK_TOOL_NAME && typeof data.callId === 'string') {
      const copy = buildQuestionCopy(questionListOf(typeof data.arguments === 'string' ? data.arguments : undefined))
      open.set(data.callId, {
        kind: 'question',
        who: sessionId,
        id: data.callId,
        what: copy.what,
        ...(copy.whatToken === undefined ? {} : { whatToken: copy.whatToken }),
        ...(copy.detail === undefined ? {} : { detail: copy.detail }),
        time: event.time,
        jumpTo: sessionId,
      })
      continue
    }
    // 答案的两条落盘口径都认：tool/result（同 callId）与 user-questions/answered（同 id）。
    if (event.type === 'tool/result' && typeof data.callId === 'string') { open.delete(data.callId); continue }
    if (event.type === 'user-questions/answered' && typeof data.id === 'string') { open.delete(data.id); continue }
  }
  return [...open.values()].sort((a, b) => b.time - a.time)
}

/**
 * 「等你处理」的完整重建（BUG-319）：审批 + 问询一起回来，再按同一上限截断并报出被截条数。
 * @param events - 会话事件流。
 * @param sessionId - 事件所属会话。
 * @returns 挂起项（审批在前、问询在后，各自按时间倒序）+ 被截条数。
 */
export function pendingAsks(events: readonly AttentionEventLike[], sessionId: string): PendingApprovals {
  const approvals = pendingApprovals(events, sessionId)
  const questions = pendingQuestions(events, sessionId)
  const merged = [...approvals.items, ...questions].sort((a, b) => b.time - a.time)
  const bounded = takeBounded(merged, STREAM_ITEM_CAP)
  return { items: bounded.items, capped: approvals.capped + bounded.capped }
}

/**
 * 注意力读取的**全部边界**（BUG-327/328/330 的收口点）。
 *
 * 上一轮把边界「沿管线传」却传成三个变量、各自被部分消费：当前会话的 `capped` 没人读、
 * 空态只认三个边界、字段名在 question 并入后仍叫 approvals。这里收成一个对象：
 * **一处计算、一处渲染、一处决定空态**——组合起来就不会漏。
 */
export interface AttentionBoundaries {
  /** 本会话事件流被 `MAX_EVENTS` 截断（窗口外的旧事项可能没被看见）。 */
  readonly eventsTruncated: boolean
  /** 候选会话：`null` = 工作区未就绪（fail-closed，一个都没扫）；否则给出总数与被截掉多少。 */
  readonly candidates: { readonly total: number, readonly capped: number } | null
  /** 本会话 + 跨会话合计的「待你处理」被上限截掉多少条（审批与问询合计）。 */
  readonly asksCapped: number
  /** 跨会话历史是否有会话的窗口被截断。 */
  readonly window: 'none' | 'some'
  /** 跨会话历史读取失败的会话数。 */
  readonly failed: number
}

/**
 * 是否需要告诉用户「这次没看全」。
 *
 * 空态只能用 `!hasBoundary(...)` 当条件——否则「只扫了一部分」会被说成「什么都没有」。
 * @param boundaries - 上文的边界对象。
 * @returns 任一维度异常 = true。
 */
export function hasBoundary(boundaries: AttentionBoundaries): boolean {
  return boundaries.eventsTruncated
    || boundaries.candidates === null
    || (boundaries.candidates !== null && boundaries.candidates.capped > 0)
    || boundaries.asksCapped > 0
    || boundaries.window === 'some'
    || boundaries.failed > 0
}

/** 单会话上限文案里的数字（与 `STREAM_ITEM_CAP` 同源，不在面板里写死）。 */
export const ASKS_CAP = STREAM_ITEM_CAP
