/**
 * 上下文发起培养的轻量一次性意图槽位（BUG-398）。
 *
 * `AssistantCultivateAction` / `DeliverableFinalDocActions` 跳转至 HQ 或培养板时写入上下文
 * （`messageId` / `filePath`），由 `CultivationCompose` 消费后自动展开表单并预填参考背景。
 */
export interface ComposeIntent {
  readonly id: number
  readonly messageId?: string
  readonly filePath?: string
}

export interface ComposeIntentStore {
  publish(context?: { readonly messageId?: string; readonly filePath?: string }): ComposeIntent
  get(): ComposeIntent | null
  consume(id: number): void
  subscribe(listener: () => void): () => void
}

export function createComposeIntentStore(): ComposeIntentStore {
  let seq = 0
  let current: ComposeIntent | null = null
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of listeners) listener()
  }
  return {
    publish(context) {
      const messageId = context?.messageId?.trim()
      const filePath = context?.filePath?.trim()
      const next: ComposeIntent = {
        id: ++seq,
        ...(messageId === undefined || messageId === '' ? {} : { messageId }),
        ...(filePath === undefined || filePath === '' ? {} : { filePath }),
      }
      current = next
      emit()
      return next
    },
    get: () => current,
    consume(id) {
      if (current?.id !== id) return
      current = null
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export const composeIntentStore: ComposeIntentStore = createComposeIntentStore()
