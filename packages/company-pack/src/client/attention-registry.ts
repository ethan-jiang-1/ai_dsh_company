/**
 * 「需要你」挂起项登记处（驾驶舱①）：client 入口的远端事件观察者写入，页签注入面读取。
 *
 * 在 `apply()` 闭包内创建（client 纪律：模块级句柄被禁——避免 de-facto 单例）；
 * 观察者登记 / 销账都走它，面板每 2s 读一次快照（本地内存，零成本轮询）。
 */
import type { LivePending } from '../lib/attention.ts'

/** 登记处实例（`begin` 返回销账函数；list 返回当前挂起快照）。 */
export interface AttentionRegistry {
  readonly begin: (entry: LivePending) => () => void
  readonly list: () => readonly LivePending[]
}

/** 造一个登记处（apply 世界专用；测试也用它做生命周期断言）。 */
export function createAttentionRegistry(): AttentionRegistry {
  const pending = new Map<number, LivePending>()
  let nextId = 1
  return {
    begin(entry) {
      const id = nextId++
      pending.set(id, entry)
      return () => { pending.delete(id) }
    },
    list: () => [...pending.values()],
  }
}
