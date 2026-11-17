/**
 * 近期 git 历史 → 退役旧路径的纯逻辑（唯一家；git 读取在 checks/gates/retired-path.mjs）。
 *
 * 为什么拆出来：2026-11-17 BUG-207 的自动面需要可测的「旧路径 → 现家」推导；gate 文件本身是
 * driver，不能进 vitest（layering）。这里只收两份纯函数：解析 `git log --name-status` 输出、
 * 从旧路径推出「已消失的两段目录」。
 */

/**
 * 解析 `git log --diff-filter=RD -M --name-status --format=COMMIT-<sha>` 的输出。
 * 同一条旧路径出现多次时保留**最新**一条（git log 新→旧；旧记录不覆盖新记录）。
 * @param {string} output
 * @returns {Map<string,string>} 旧路径 → 新路径（删除记空串）
 */
export function parseNameStatus(output) {
  const map = new Map()
  for (const line of String(output).split('\n')) {
    if (line === '' || line.startsWith('COMMIT-')) continue
    const parts = line.split('\t')
    if (!parts[1]) continue
    if (!parts[0].startsWith('R') && parts[0] !== 'D') continue
    if (map.has(parts[1])) continue
    map.set(parts[1], parts[0].startsWith('R') ? (parts[2] ?? '') : '')
  }
  return map
}

/**
 * 旧路径所在目录已经消失、且至少两段（`tools/observe/`、`checks/smoke/`）时，作为退役目录前缀。
 * 单段顶层目录（`dev/`、`scripts/`）不作为自动前缀：近期历史里混着历史叙述，且不是本波要治的新家。
 * @param {Map<string,string>} retired 旧路径 → 新路径
 * @param {(dir:string)=>boolean} exists 目录是否仍在盘上
 * @returns {Map<string,string>} 退役目录（带尾斜杠）→ 现家示例
 */
export function retiredDirectoryPrefixes(retired, exists) {
  const dirs = new Map()
  for (const [oldPath, newPath] of retired) {
    const slash = oldPath.lastIndexOf('/')
    if (slash <= 0) continue
    const dir = oldPath.slice(0, slash + 1)
    if (dir.split('/').length < 3) continue
    if (exists(dir)) continue
    if (!dirs.has(dir)) dirs.set(dir, newPath)
  }
  return dirs
}
