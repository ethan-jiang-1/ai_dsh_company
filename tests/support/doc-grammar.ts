/**
 * 文档形状生成器（P1，2026-11-14）。
 *
 * 只生成字符串，不 import pack；seed 固定 → 文档固定。property 与 structure-agreement
 * 共用同一批种子，避免“两套手写夹具各测各的”。
 */
export function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HEADINGS = ['## 修复证据', '## 验收', '## 决定', '## 其它']
const FENCES = ['```', '````', '~~~', '~~~~']

/** 生成一份带容器/代码 span/注释/标题/表格的文档。 */
export function makeDoc(seed: number): string {
  const random = rng(seed)
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(random() * values.length)] as T
  const lines: string[] = []
  if (random() < 0.3) lines.push('---', 'status: 已修', '---')
  if (random() < 0.5) lines.push(`${pick(FENCES)}${pick(['js', 'markdown', ''])}`)
  lines.push(`${pick(HEADINGS)} 示例`)
  if (random() < 0.5) lines.push('```json', '{"x":1}', '```')
  if (random() < 0.5) lines.push(`${pick(FENCES)}`)
  lines.push('正文 `inline` 与 `<!--` 字面。')
  lines.push('', pick(HEADINGS), '')
  lines.push(`- 改动面：\`packages/demo/a${String(seed % 7)}.ts\``)
  lines.push('- 红：拆守卫 → `pnpm test` 红')
  lines.push('- 表格：| a | b\\|c |')
  if (random() < 0.3) lines.push('<!-- 未闭合注释')
  return lines.join(random() < 0.5 ? '\n' : '\r\n')
}
