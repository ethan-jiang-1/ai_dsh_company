// 纯文本小工具（2026-10-20 审计：presence.ts / attention.ts 各有一份同义 firstText）。
// 零 import、零副作用；只做「首段非空文本的首行」。

/** 消息内容块的最小形状（只取 text 块）。 */
export interface TextBlock {
  readonly type: string
  readonly text?: string
}

/**
 * 取第一个非空 text 块的首行；取不到给空串（由调用方落「（空）」）。
 * @param content - 消息 content 块。
 * @returns 首行文本或空串。
 */
export function firstText(content: readonly TextBlock[]): string {
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
      return block.text.trim().split('\n')[0]!
    }
  }
  return ''
}

/** 截断长文本到 `max` 个字符；超出补省略号（动态流/标题共用）。 */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

/** 头 70% + 尾 30% 的摘录（保留结论与结尾；由调用方决定是否展示 truncated）。 */
export function clipExcerpt(text: string, max = 1_200): { readonly text: string; readonly truncated: boolean } {
  const chars = [...text]
  if (chars.length <= max) return { text, truncated: false }
  const head = Math.max(1, Math.floor(max * 0.7))
  const tail = Math.max(1, max - head)
  return { text: `${chars.slice(0, head).join('')}\n…\n${chars.slice(-tail).join('')}`, truncated: true }
}
