/**
 * `meta.md` 字段读取的 tools 孪生（BUG-381）：结构行 + 首个匹配。
 * 与 host `metaScalarField` 同语义（围栏/注释里的样例不算），供 converge 等维护面消费。
 */
import { structuralLines } from './markdown-lines.mjs'

/**
 * 读一个 meta 字段的原始值。
 * @param {string} text meta.md 全文
 * @param {string} field 字段名
 * @returns {string} 去掉首尾空白的原始值；未声明给空串
 */
export function metaFieldFromText(text, field) {
  const pattern = new RegExp(`^${field}\\s*[:：]\\s*(.*)$`)
  for (const entry of structuralLines(text)) {
    if (!entry.structural) continue
    const match = pattern.exec(entry.text.trim())
    if (match !== null) return (match[1] ?? '').trim()
  }
  return ''
}
