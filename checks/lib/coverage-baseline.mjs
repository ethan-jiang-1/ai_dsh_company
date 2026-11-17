/**
 * 覆盖率基线与棘轮判据（纯逻辑，唯一家）。
 *
 * 为什么：本仓覆盖率此前是「10 个手选模块的百分比阈值 + 手动跑」——低于阈值不挡任何提交，
 * 188 个插桩文件里 3 个 0%、30 个 <80%（2026-11-13 实测）。DSH 的 per-file 100% 是闸门，
 * 我们借的是**棘轮**：从今天的实测值起步，只许变好；新文件有下限；已知空洞必须显式声明。
 *
 * 判据五条（全部机械可判）：
 * 1. 回归 —— 任何文件低于基线 → 红。
 * 2. 新文件 —— 基线里没有的文件，statements < 80 或 branches < 70 → 红（除非在 exemptions 里）。
 * 3. 已知空洞 —— 任何文件 statements < 50，必须在 exemptions 里（写 reason + removeWhen）。
 * 4. 过期豁免 —— 豁免指向的文件不存在，或已到 50% → 红（要求删掉豁免）。
 * 5. 基线键消失 —— 不在本次统计、又不是显式改名/删除 → 红。2026-11-17 BUG-203：
 *    此前只发 note，一次 `git mv` 就能把 100/100 重置成「新文件」下限；现在改名必须给
 *    `--rename old=new`（地板随键迁移），确认删除必须给 `--drop old`，否则地板不会静默消失。
 *    `--drop` 对「当前统计里有同名新键」也判红（盲审 S1：否则 `git mv + --drop` 仍能把地板重置）。
 *
 * `--update` 只在没有红项时重写基线；基线只升不降（每个文件取 max(旧, 新)，改名键取旧地板）。
 */

export const NEW_FILE_FLOOR = { statements: 80, branches: 70 }
export const HOLE_FLOOR = 50

/** coverage-summary.json 的绝对路径键 → 仓库相对路径；跳过 total。 */
export function indexCoverage(summary, root) {
  const files = {}
  for (const [key, value] of Object.entries(summary)) {
    if (key === 'total' || key.endsWith('/total')) continue
    const rel = key.replace(`${root}/`, '')
    files[rel] = {
      statements: value.statements?.pct ?? 0,
      branches: value.branches?.pct ?? 0,
    }
  }
  return files
}

/**
 * @param {Record<string,{statements:number,branches:number}>} current
 * @param {{files?:Record<string,{statements:number,branches:number}>,exemptions?:{path:string,reason:string,removeWhen:string}[]}} baseline
 * @param {{renames?:{from:string,to:string}[],drops?:string[]}} [options] 显式改名/删除（唯一允许基线键消失的方式）
 * @returns {{violations:{kind:string,path:string,detail:string}[], notes:string[]}}
 */
export function compareCoverage(current, baseline = {}, options = {}) {
  const baseFiles = baseline.files ?? {}
  const exemptions = baseline.exemptions ?? []
  const exemptPaths = new Set(exemptions.map(entry => entry.path))
  const violations = []
  const notes = []
  const renames = options.renames ?? []
  const drops = new Set(options.drops ?? [])
  const renamedFrom = new Map()
  const renamedTo = new Map()

  for (const { from, to } of renames) {
    if (renamedFrom.has(from)) {
      violations.push({ kind: 'invalid-rename', path: from, detail: `--rename ${from}=… 重复：同一条基线键只能迁移一次` })
      continue
    }
    if (renamedTo.has(to)) {
      violations.push({ kind: 'invalid-rename', path: to, detail: `--rename …=${to} 重复：同一个新键只能接收一次地板` })
      continue
    }
    renamedFrom.set(from, to)
    renamedTo.set(to, from)
    if (!baseFiles[from]) violations.push({ kind: 'invalid-rename', path: from, detail: `--rename ${from}=${to}：基线里没有 ${from}` })
    if (!current[to]) violations.push({ kind: 'invalid-rename', path: to, detail: `--rename ${from}=${to}：当前统计里没有 ${to}` })
    if (current[from]) violations.push({ kind: 'invalid-rename', path: from, detail: `--rename ${from}=${to}：旧键仍在当前统计里（改名未完成？）——确认只是新增请删掉这条映射` })
  }
  for (const path of drops) {
    if (!baseFiles[path]) violations.push({ kind: 'invalid-drop', path, detail: `--drop ${path}：基线里没有这个键` })
    if (current[path]) violations.push({ kind: 'invalid-drop', path, detail: `--drop ${path}：文件仍在本次统计里——不能删除活文件的地板` })
    // 2026-11-17 盲审 S1：`git mv old new` + `--drop old` 会让新键按 80/70 重新起算。
    // 同名新键出现时，删除不再被接受——改名必须走 --rename（地板随键迁移）。
    const baseName = path.slice(path.lastIndexOf('/') + 1)
    const sameName = Object.keys(current).find(candidate => candidate !== path && candidate.slice(candidate.lastIndexOf('/') + 1) === baseName)
    if (sameName !== undefined) {
      violations.push({ kind: 'invalid-drop', path, detail: `--drop ${path}：当前统计里有同名新键 ${sameName}——疑似改名，请用 --rename ${path}=${sameName}（地板迁移，不许按新文件重新起算）` })
    }
  }

  for (const [path, value] of Object.entries(current)) {
    const renameFromPath = renamedTo.get(path)
    const base = renameFromPath === undefined ? baseFiles[path] : baseFiles[renameFromPath]
    if (base) {
      if (value.statements < base.statements) {
        violations.push({ kind: 'regressed', path, detail: `statements ${value.statements}% < 基线 ${base.statements}%${renameFromPath === undefined ? '' : `（继承自 ${renameFromPath}）`}` })
      }
      if (value.branches < base.branches) {
        violations.push({ kind: 'regressed', path, detail: `branches ${value.branches}% < 基线 ${base.branches}%${renameFromPath === undefined ? '' : `（继承自 ${renameFromPath}）`}` })
      }
      continue
    }
    if (renameFromPath !== undefined) continue // 已在上面报 invalid-rename（基线缺旧键）
    if (exemptPaths.has(path)) continue
    if (value.statements < NEW_FILE_FLOOR.statements || value.branches < NEW_FILE_FLOOR.branches) {
      violations.push({
        kind: 'new-below-floor',
        path,
        detail: `新文件 statements ${value.statements}% / branches ${value.branches}%（下限 ${NEW_FILE_FLOOR.statements}/${NEW_FILE_FLOOR.branches}）`,
      })
    }
  }

  for (const [path, value] of Object.entries(current)) {
    if (value.statements >= HOLE_FLOOR) continue
    if (exemptPaths.has(path)) continue
    violations.push({
      kind: 'hole',
      path,
      detail: `statements ${value.statements}% < ${HOLE_FLOOR}%：已知空洞要显式豁免（写 reason + removeWhen），不许静默留着`,
    })
  }

  for (const exemption of exemptions) {
    const value = current[exemption.path]
    if (!value) {
      violations.push({ kind: 'stale-exemption', path: exemption.path, detail: '豁免指向的文件已不存在——删掉这条豁免' })
      continue
    }
    if (value.statements >= HOLE_FLOOR) {
      violations.push({ kind: 'stale-exemption', path: exemption.path, detail: `已到 ${value.statements}%（≥${HOLE_FLOOR}%）——删掉这条豁免` })
    }
    if (!exemption.reason || !exemption.removeWhen) {
      violations.push({ kind: 'stale-exemption', path: exemption.path, detail: '豁免缺 reason 或 removeWhen' })
    }
  }

  for (const [path, base] of Object.entries(baseFiles)) {
    const value = current[path]
    if (!value) {
      if (renamedFrom.has(path) || drops.has(path)) continue
      violations.push({
        kind: 'missing-baseline',
        path,
        detail: `基线里的 ${path} 不在本次统计：确认删除请给 --drop ${path}；改名请给 --rename ${path}=<新路径>（地板随键迁移，不许按新文件重新起算）`,
      })
      continue
    }
    if (value.statements > base.statements || value.branches > base.branches) notes.push(`${path} 变好：${base.statements}/${base.branches} → ${value.statements}/${value.branches}`)
  }
  for (const { from, to } of renames) {
    const base = baseFiles[from]
    if (base && current[to]) notes.push(`基线键 ${from} → ${to}（地板迁移 ${base.statements}/${base.branches}；实测 ${current[to].statements}/${current[to].branches}）`)
  }
  for (const path of drops) {
    if (baseFiles[path] && !current[path]) notes.push(`基线键 ${path} 已显式删除（--drop）`)
  }

  return { violations, notes }
}

/** 重写基线：只升不降；保留仍然有效的豁免（调用方保证没有 violations）。 */
/**
 * @param {Record<string,{statements:number,branches:number}>} current
 * @param {{files?:Record<string,{statements:number,branches:number}>,exemptions?:{path:string,reason:string,removeWhen:string}[]}} baseline
 * @param {string} [today]
 * @param {{renames?:{from:string,to:string}[],drops?:string[]}} [options]
 * @returns {{generatedAt:string,files:Record<string,{statements:number,branches:number}>,exemptions:{path:string,reason:string,removeWhen:string}[]}}
 */
export function nextBaseline(current, baseline = {}, today = new Date().toISOString().slice(0, 10), options = {}) {
  /** @type {Record<string,{statements:number,branches:number}>} */
  const merged = {}
  const renamedTo = new Map((options.renames ?? []).map(({ from, to }) => [to, from]))
  const dropped = new Set(options.drops ?? [])
  const consumedBase = new Set()
  for (const [path, value] of Object.entries(current)) {
    const from = renamedTo.get(path)
    if (from !== undefined) consumedBase.add(from)
    const previous = baseline.files?.[from] ?? baseline.files?.[path]
    merged[path] = {
      statements: Math.max(previous?.statements ?? 0, value.statements),
      branches: Math.max(previous?.branches ?? 0, value.branches),
    }
  }
  // 未消费的基线键保留地板：删除/改名必须先显式 --drop / --rename，否则下一次仍是红，
  // 不许靠一次 --update 把旧地板静默抹掉（BUG-203）。
  for (const [path, value] of Object.entries(baseline.files ?? {})) {
    if (current[path] || consumedBase.has(path) || dropped.has(path)) continue
    merged[path] = { statements: value.statements, branches: value.branches }
  }
  const exemptions = (baseline.exemptions ?? []).filter(entry => current[entry.path] && current[entry.path].statements < HOLE_FLOOR)
  return { generatedAt: today, files: merged, exemptions }
}
