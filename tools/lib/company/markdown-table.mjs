/**
 * 表格行切列（`tools/lib` 的纯 JS 孪生，BUG-356）。
 *
 * 为什么不是从 pack 引：`tools/lib` 是 keyless 隔离面，local dependency 不许离开 tools/lib
 * （layering 守卫）。算法与 `packages/company-pack/src/lib/docs/markdown-shape-core.js` 同款，
 * 由 `tests/tools/markdown-table-parity.spec.ts` 对拍防漂。
 * @param {string} line 一行表格文本（可带首尾竖线）。
 * @returns {string[]} 单元格（已 trim，`\|` 转义已还原）。
 */
export function splitTableRow(line) {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|')) {
    let backslashes = 0
    let cursor = body.length - 2
    while (cursor >= 0 && body[cursor] === '\\') {
      backslashes += 1
      cursor -= 1
    }
    if (backslashes % 2 === 0) body = body.slice(0, -1)
  }
  const cells = []
  let cell = ''
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] ?? ''
    if (char === '\\' && body[index + 1] === '\\') { cell += '\\'; index += 1; continue }
    if (char === '\\' && body[index + 1] === '|') { cell += '|'; index += 1; continue }
    if (char === '|') { cells.push(cell.trim()); cell = ''; continue }
    cell += char
  }
  cells.push(cell.trim())
  return cells
}
