/**
 * 工具卡的共享纯逻辑（委派卡 R3 / 团队工具卡 S2 共用）。
 *
 * 卡片 = **call/result 切片的纯函数**：同一份会话日志永远渲染出同一张卡，keyless 单测直接断言
 * （不需要 DOM、不需要模型）。状态只从持久的 call/result 推导，不读活状态（可回放）。
 */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

/** 卡片生命周期。 */
export type CardState = 'running' | 'ok' | 'error' | 'stopped'

/**
 * 从 call/result 切片推导卡片状态。
 * @param block - 冻结的 running call 或 settled result 节点。
 * @returns 状态。
 */
export function cardStateOf(block: ToolCallViewProps['block']): CardState {
  if (!('kind' in block)) return 'running'
  if (block.error?.code === 'interrupted') return 'stopped'
  return block.isError ? 'error' : 'ok'
}

/**
 * 结果正文（settled 才有）。与 ui-tool 通用行的 resultText 同构。
 * @param block - 冻结的 call/result 节点。
 * @returns 正文或 null。
 */
export function resultTextOf(block: ToolCallViewProps['block']): string | null {
  if (!('kind' in block)) return null
  const parts: string[] = []
  for (const item of block.content) {
    parts.push(item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  }
  if (parts.length === 0 && block.error !== undefined) parts.push(`${block.error.name}: ${block.error.code}`)
  return parts.join('\n') || null
}

/**
 * 解析入参 JSON；流式期间可能是截断的前缀 ⇒ null（调用方自行回退原文）。
 * @param argsRaw - wire 上的入参原文。
 * @returns 对象或 null。
 */
export function parseArgsObject(argsRaw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(argsRaw) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // 截断的 JSON：交给调用方回退。
  }
  return null
}

/**
 * 取字符串字段（缺失 / 非字符串 → 空串）。
 * @param record - 入参对象（可为 null）。
 * @param key - 字段名。
 * @returns 字段值或空串。
 */
export function textOf(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key]
  return typeof value === 'string' ? value : ''
}

/**
 * 取字符串数组字段（缺失 → 空数组）。
 * @param record - 入参对象（可为 null）。
 * @param key - 字段名。
 * @returns 字符串数组。
 */
export function stringListOf(record: Record<string, unknown> | null, key: string): string[] {
  const value = record?.[key]
  return Array.isArray(value) ? value.map(item => String(item)) : []
}
