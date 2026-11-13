/**
 * 覆盖率基线与棘轮判据（纯逻辑，唯一家）。
 *
 * 为什么：本仓覆盖率此前是「10 个手选模块的百分比阈值 + 手动跑」——低于阈值不挡任何提交，
 * 188 个插桩文件里 3 个 0%、30 个 <80%（2026-11-13 实测）。DSH 的 per-file 100% 是闸门，
 * 我们借的是**棘轮**：从今天的实测值起步，只许变好；新文件有下限；已知空洞必须显式声明。
 *
 * 判据四条（全部机械可判）：
 * 1. 回归 —— 任何文件低于基线 → 红。
 * 2. 新文件 —— 基线里没有的文件，statements < 80 或 branches < 70 → 红（除非在 exemptions 里）。
 * 3. 已知空洞 —— 任何文件 statements < 50，必须在 exemptions 里（写 reason + removeWhen）。
 * 4. 过期豁免 —— 豁免指向的文件不存在，或已到 50% → 红（要求删掉豁免）。
 *
 * `--update` 只在没有红项时重写基线；基线只升不降（每个文件取 max(旧, 新)）。
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
 * @returns {{violations:{kind:string,path:string,detail:string}[], notes:string[]}}
 */
export function compareCoverage(current, baseline = {}) {
  const baseFiles = baseline.files ?? {}
  const exemptions = baseline.exemptions ?? []
  const exemptPaths = new Set(exemptions.map(entry => entry.path))
  const violations = []
  const notes = []

  for (const [path, value] of Object.entries(current)) {
    const base = baseFiles[path]
    if (base) {
      if (value.statements < base.statements) {
        violations.push({ kind: 'regressed', path, detail: `statements ${value.statements}% < 基线 ${base.statements}%` })
      }
      if (value.branches < base.branches) {
        violations.push({ kind: 'regressed', path, detail: `branches ${value.branches}% < 基线 ${base.branches}%` })
      }
      continue
    }
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
    if (!value) notes.push(`基线里的 ${path} 已不在本次统计（文件删除/改名？基线更新时会移除）`)
    else if (value.statements > base.statements || value.branches > base.branches) notes.push(`${path} 变好：${base.statements}/${base.branches} → ${value.statements}/${value.branches}`)
  }

  return { violations, notes }
}

/** 重写基线：只升不降；保留仍然有效的豁免（调用方保证没有 violations）。 */
/**
 * @param {Record<string,{statements:number,branches:number}>} current
 * @param {{files?:Record<string,{statements:number,branches:number}>,exemptions?:{path:string,reason:string,removeWhen:string}[]}} baseline
 * @param {string} [today]
 * @returns {{generatedAt:string,files:Record<string,{statements:number,branches:number}>,exemptions:{path:string,reason:string,removeWhen:string}[]}}
 */
export function nextBaseline(current, baseline = {}, today = new Date().toISOString().slice(0, 10)) {
  /** @type {Record<string,{statements:number,branches:number}>} */
  const merged = {}
  for (const [path, value] of Object.entries(current)) {
    const previous = baseline.files?.[path]
    merged[path] = {
      statements: Math.max(previous?.statements ?? 0, value.statements),
      branches: Math.max(previous?.branches ?? 0, value.branches),
    }
  }
  const exemptions = (baseline.exemptions ?? []).filter(entry => current[entry.path] && current[entry.path].statements < HOLE_FLOOR)
  return { generatedAt: today, files: merged, exemptions }
}
