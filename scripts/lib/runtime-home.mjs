import { realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

// Resolve existing ancestors too, so an as-yet uncreated child of a symlink is checked.
function physicalPath(path) {
  try {
    return realpathSync(path)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = dirname(path)
    if (parent === path) throw error
    return join(physicalPath(parent), basename(path))
  }
}

function contains(parent, child) {
  const rel = relative(parent, child)
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))
}

/**
 * Require an explicit DSH home disjoint from the daily ~/.dsh tree, including symlinks.
 * @param {string} name - Script name used in diagnostics.
 * @returns {string} The isolated DSH home.
 */
export function requireDevHome(name) {
  const home = process.env.DSH_HOME
  if (home === undefined || home.trim() === '') {
    throw new Error(`${name}: 需要 DSH_HOME（先 source dev/env.sh）`)
  }
  const dailyHome = physicalPath(resolve(homedir(), '.dsh'))
  const target = physicalPath(resolve(home))
  if (contains(dailyHome, target) || contains(target, dailyHome)) {
    throw new Error(`${name}: DSH_HOME 与日用 home（${dailyHome}）重叠——拒绝执行；先 source dev/env.sh`)
  }
  return target
}

/**
 * Orient-facing probe（RFC driver-surface-package 条目 B）：与 requireDevHome 同款的双向
 * 重叠判定，但**只分类不抛**——观测命令要的是警告与呈现，不是拒绝执行。
 */
export function devHomeStatus(home, { dailyHome } = {}) {
  const daily = physicalPath(resolve(dailyHome ?? join(homedir(), '.dsh')))
  if (home === undefined || home.trim() === '') {
    return { kind: 'unset', dailyHome: daily, warning: '⚠ DSH_HOME 未设置——先 source dev/env.sh（否则会话与凭据落日用 home，profile 组合不可预期）' }
  }
  const target = physicalPath(resolve(home))
  if (contains(daily, target) || contains(target, daily)) {
    return { kind: 'daily', home: target, dailyHome: daily, warning: '⚠ DSH_HOME 与日用 home 重叠——先 source dev/env.sh（双 home 纪律 = guides/dev-loop §6）' }
  }
  return { kind: 'ok', home: target, dailyHome: daily }
}
