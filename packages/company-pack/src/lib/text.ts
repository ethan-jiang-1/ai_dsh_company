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
