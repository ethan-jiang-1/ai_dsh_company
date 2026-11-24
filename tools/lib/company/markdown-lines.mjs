/**
 * 结构行扫描的 tools 孪生（BUG-381）：跳过 frontmatter / 代码围栏 / HTML 注释，
 * 只让真正的字段行参与 `meta.md` 解析。语义与 `packages/company-pack/src/lib/docs/markdown-shape-core.js`
 * 对齐（围栏/块注释/行内注释/孤立 `---`），由 `tests/tools/markdown-lines-parity.spec.ts` 对拍防漂。
 * 为什么不直接用 `tools/lib/core/repo-markdown.mjs` 的 AST 版：它对块注释内联开启/行内注释文本的
 * 结构与 core 不同（盲审实测），会再次制造 host/tools 判据分叉。
 * @param {string} text 全文
 * @returns {{ text: string, structural: boolean }[]} 逐行
 */
export function structuralLines(text) {
  const raw = String(text).replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let fence = null
  let inComment = false
  // 只有存在闭合 `---` 才算 frontmatter；孤立首行 `---` 不算（与 core 一致）。
  let inFrontmatter = (raw[0] ?? '').trim() === '---' && raw.slice(1).some(line => line.trim() === '---')
  for (let index = 0; index < raw.length; index += 1) {
    const line = raw[index] ?? ''
    if (index === 0 && inFrontmatter) { out.push({ text: line, structural: false }); continue }
    if (inFrontmatter) {
      out.push({ text: line, structural: false })
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
      // 收尾那一行本身不算结构（与 core 一致）。
      out.push({ text: '', structural: false })
      continue
    }
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMatch !== null) {
      const marker = fenceMatch[1] ?? '```'
      fence = { char: marker[0] ?? '`', length: marker.length }
      out.push({ text: line, structural: false })
      continue
    }
    const withoutPairs = line.replace(/<!--[^]*?-->/g, '')
    const open = withoutPairs.indexOf('<!--')
    if (open !== -1) {
      inComment = true
      // 整行以注释开头 = 非结构；行中开启 = 注释前的内容仍是结构（与 core 一致）。
      out.push(open === 0 ? { text: '', structural: false } : { text: withoutPairs.slice(0, open), structural: true })
      continue
    }
    out.push({ text: withoutPairs, structural: true })
  }
  return out
}
