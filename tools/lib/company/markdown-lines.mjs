/**
 * 结构行扫描的 tools 孪生（BUG-381）：跳过 frontmatter / 代码围栏 / HTML 注释，
 * 只让真正的字段行参与 `meta.md` 解析。算法与 `packages/company-pack/src/lib/docs/markdown-shape-core.js`
 * 同源（围栏/块注释/行内注释），由 `tests/tools/markdown-lines-parity.spec.ts` 对拍防漂。
 * @param {string} text 全文
 * @returns {{ text: string, structural: boolean }[]} 逐行（引用/列表符不在此层处理）
 */
export function structuralLines(text) {
  const raw = String(text).replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let fence = null
  let inComment = false
  let inFrontmatter = (raw[0] ?? '').trim() === '---'
  for (let index = 0; index < raw.length; index += 1) {
    const line = raw[index] ?? ''
    if (index === 0 && inFrontmatter) { out.push({ text: line, structural: false }); continue }
    if (inFrontmatter) {
      out.push({ text: line, structural: false })
      // frontmatter 的结束沿：第二行起遇到单独 `---` 关闭（首行已在上面跳过）。
      if (line.trim() === '---') inFrontmatter = false
      continue
    }
    if (fence !== null) {
      out.push({ text: line, structural: false })
      const close = new RegExp(`^\\s*${fence.char}{${String(fence.length)},}\\s*$`)
      if (close.test(line)) fence = null
      continue
    }
    if (inComment) {
      const end = line.indexOf('-->')
      if (end === -1) { out.push({ text: '', structural: false }); continue }
      inComment = false
      const rest = line.slice(end + 3).replace(/<!--[^]*?-->/g, '')
      out.push({ text: rest, structural: true })
      continue
    }
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMatch !== null) {
      const marker = fenceMatch[1] ?? '```'
      fence = { char: marker[0] ?? '`', length: marker.length }
      out.push({ text: line, structural: false })
      continue
    }
    if (/^\s*<!--/.test(line) && !line.includes('-->')) {
      inComment = true
      out.push({ text: '', structural: false })
      continue
    }
    out.push({ text: line.replace(/<!--[^]*?-->/g, ''), structural: true })
  }
  return out
}
