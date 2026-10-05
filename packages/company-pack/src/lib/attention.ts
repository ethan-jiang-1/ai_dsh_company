/**
 * 「需要你」注意力读模型（驾驶舱①切片一）。
 *
 * 两类数据源折成同一种注意力条目：
 * - **远端事件**（跨会话、实时）：`user-questions/request`（待答问询）与 `approval/request`
 *   （待批审批）——由 client 入口的**观察者监听器**登记 / 销账（waterfall 委托、不拦截应答；
 *   机制同款 vendor `ui-approval` / `ui-user-questions` 的 `ctx.remote.$on`）。切片二落地前
 *   审批源不会触发（无工具请求审批），管线先行。
 * - **lead 会话事件流**（`session/follow`）：`tool/call`(present)（完成通知）与含【待澄清】
 *   前缀的 `team/message/queued`（升级待处理 = 问询切片三甲的中继链显性化）。
 *
 * 纯函数、零依赖；wire 形状 → 领域形状，UI 只消费 {@link AttentionItem}。
 * keyless 单测 = `tests/client/attention.spec.ts`。
 */

/** 注意力条目类别。 */
export type AttentionKind = 'question' | 'approval' | 'escalation' | 'completion'

/** 一条注意力条目（面板行）。 */
export interface AttentionItem {
  readonly kind: AttentionKind
  /** 发起方（升级 = senderName；完成 = lead 名；问询/审批 = 占位，面板按 displayTitle 解析）。 */
  readonly who: string
  /** 一句话摘要。 */
  readonly what: string
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
  readonly since: number
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
export const ESCALATION_MARK = '【待澄清】'

/** present 工具的 wire 名（vendor `packages/fs/tool-present/src/index.ts` `name: 'present'`）。 */
export const PRESENT_TOOL_NAME = 'present'

/** 流折条目各类保留上限（防历史淹没面板）。 */
export const STREAM_ITEM_CAP = 5

const isToolCall = (event: AttentionEventLike):
  event is Extract<AttentionEventLike, { type: 'tool/call' }> => event.type === 'tool/call'
const isMessage = (event: AttentionEventLike):
  event is Extract<AttentionEventLike, { type: 'team/message/queued' }> => event.type === 'team/message/queued'

/** 消息首段文本（与 presence.ts 的 firstText 同义；独立成文避免跨文件私有依赖）。 */
function firstText(content: readonly { type: string; text?: string }[]): string {
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
      return block.text.trim().split('\n')[0]!
    }
  }
  return ''
}

/** present 调用参数里取可读摘要（title / slug / path 字段；取不到给「交付物」）。 */
function presentLabel(argumentsJson: string | undefined): string {
  if (argumentsJson === undefined) return '交付物'
  try {
    const parsed: unknown = JSON.parse(argumentsJson)
    if (parsed !== null && typeof parsed === 'object') {
      for (const key of ['title', 'slug', 'path']) {
        const value = (parsed as Record<string, unknown>)[key]
        if (typeof value === 'string' && value.trim() !== '') return value.trim()
      }
    }
  } catch {
    // 解析失败按无摘要处理；present 的参数形状不是本读模型的契约。
  }
  return '交付物'
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
        escalations.push({
          kind: 'escalation',
          who: event.data.message.senderName,
          what: text.slice(ESCALATION_MARK.length).trim() || '（空）',
          time: event.time,
          jumpTo: leadSessionId,
        })
      }
    } else if (isToolCall(event) && event.data.name === PRESENT_TOOL_NAME) {
      completions.push({
        kind: 'completion',
        who: leadName,
        what: `交付完成：${presentLabel(event.data.arguments)}`,
        time: event.time,
        jumpTo: leadSessionId,
      })
    }
  }
  return [...escalations.slice(-STREAM_ITEM_CAP), ...completions.slice(-STREAM_ITEM_CAP)]
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
    time: entry.since,
    jumpTo: entry.sessionId,
  }))
  return [...waiting.sort(byTimeDesc), ...streamItems.slice().sort(byTimeDesc)]
}

/** 类别 → 中文标签（面板行首 Tag）。 */
export function attentionLabel(kind: AttentionKind): string {
  switch (kind) {
    case 'question': return '待答问询'
    case 'approval': return '待批审批'
    case 'escalation': return '升级待处理'
    case 'completion': return '完成通知'
  }
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
