/**
 * 成品目录定位/高亮意图槽位（BUG-398）。
 *
 * 由右栏终稿头部的「核对草稿」动作传入 `filePath` 并提炼动议标识，`DeliverablesView` 消费后
 * 切换到可展示视图并高亮对应动议条目；同时提供工作区相对路径归一（供培养 `--context` ref 使用）。
 */
import { isSafeContextRef } from '../../lib/cultivation/cultivation-context.ts'

export interface DeliverablesFocus {
  readonly id: number
  readonly target: string
}

export interface DeliverablesFocusStore {
  publish(filePath?: string): DeliverablesFocus | null
  get(): DeliverablesFocus | null
  consume(id: number): void
  subscribe(listener: () => void): () => void
}

const DELIVERABLE_TARGET_RE = /(?:^|[\\/])(?:\.dsh-company[\\/])?(?:deliverables|archive)[\\/]([^\\/]+)(?:[\\/]|$)/i
const DELIVERABLE_REL_RE = /(?:^|\/)((?:\.dsh-company\/)?(?:deliverables|archive)\/.+)$/i

/** 从交付终稿或目录路径提取动议目录/slug；非交付路径回落去首尾空白原串。 */
export function extractDeliverableTarget(filePath?: string): string | null {
  if (filePath === undefined) return null
  const trimmed = filePath.trim()
  if (trimmed === '') return null
  const matched = DELIVERABLE_TARGET_RE.exec(trimmed)
  return matched?.[1] ?? trimmed
}

/** 从绝对或工作区路径提取安全的相对交付路径；非工作区安全路径返回 null。 */
export function extractDeliverableRelativePath(filePath?: string): string | null {
  if (filePath === undefined) return null
  const normalized = filePath.trim().replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
  if (normalized === '') return null
  const matched = DELIVERABLE_REL_RE.exec(normalized)
  const candidate = matched?.[1] ?? normalized
  return isSafeContextRef('deliverable', candidate) ? candidate : null
}

export function createDeliverablesFocusStore(): DeliverablesFocusStore {
  let seq = 0
  let current: DeliverablesFocus | null = null
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of listeners) listener()
  }
  return {
    publish(filePath) {
      const target = extractDeliverableTarget(filePath)
      if (target === null) return null
      const next: DeliverablesFocus = { id: ++seq, target }
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

export const deliverablesFocusStore: DeliverablesFocusStore = createDeliverablesFocusStore()
