/**
 * release docs-only 判据（纯逻辑；**唯一家**，2026-11-19 BUG-280/281）。
 *
 * docs-only 快速路径的语义：manifest 记录的提交之后只多了文档/备忘录，**发布字节没变**，所以
 * `--stamp` 可以把 manifest 钉到新 HEAD 而不重打。此前判据是 `git diff --name-only` + 手写路径正则：
 *   - rename 只看到新路径（`--name-only` 对 rename 只出一条），code→docs 改名会被当 docs-only（BUG-281）；
 *   - `_dist/安装手册.md` 在集合里，于是**生成的**发布字节被当成文档（BUG-280）。
 * 判据要点：`--name-status -z` 解析，rename/copy **两侧路径都要 safe**；生成物不在 docs 集合内。
 */

/** docs-only 面（源树路径，相对仓库根）。生成物**不在**这里。 */
export const DOCS_ONLY_PATTERNS = [
  /^docs\//,
  /^notes\//,
  /^_backlog\//,
  /^README\.md$/,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
]

/**
 * 解析 `git diff --name-status -z` 的输出。
 * 形状：`STATUS\0path\0`；rename/copy = `R100\0old\0new\0`。
 * @param {string} text
 * @returns {{status: string, paths: string[]}[]}
 */
export function parseNameStatusZ(text) {
  if (typeof text !== 'string' || text === '') return []
  const parts = text.split('\0')
  const entries = []
  for (let index = 0; index < parts.length; index += 1) {
    const status = parts[index]
    if (!/^[A-Z][0-9]*$/.test(status)) continue
    const first = parts[index + 1]
    if (first === undefined || first === '') break
    if (/^[RC]/.test(status)) {
      const second = parts[index + 2] ?? ''
      entries.push({ status, paths: [first, second].filter(path => path !== '') })
      index += 2
      continue
    }
    entries.push({ status, paths: [first] })
    index += 1
  }
  return entries
}

/**
 * 变更集是否 docs-only。
 * @param {{status:string, paths:string[]}[]} entries `parseNameStatusZ` 的产物
 * @param {{patterns?: RegExp[]}} [options]
 * @returns {string|undefined} 问题描述（含第一个非 docs 路径）；docs-only = undefined
 */
export function docsOnlyChangeProblem(entries, { patterns = DOCS_ONLY_PATTERNS } = {}) {
  const paths = entries.flatMap(entry => entry.paths).filter(path => path !== '')
  if (paths.length === 0) return '没有文件变化（空 diff 不是 docs-only 的证据）'
  for (const path of paths) {
    if (patterns.some(pattern => pattern.test(path))) continue
    return `含非 docs 路径：${path}`
  }
  return undefined
}

/** 便捷入口：直接吃 `git diff --name-status -z` 的原文。 */
export function docsOnlyOutputProblem(output, options) {
  return docsOnlyChangeProblem(parseNameStatusZ(output), options)
}
