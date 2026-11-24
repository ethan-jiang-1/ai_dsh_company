/**
 * YAML 标量解析：去成对引号、去行尾 ` #` 注释。
 *
 * 产品类型字段允许 `productType: "business-software" # 默认` 这类合法 YAML 写法；`/req check` 与
 * bootstrap 必须同口径解析（2026-11-11 BUG-062/063 的共用落点；red-team E16 的 C2/C3）。
 * 坏引号（未闭合 / 闭合后仍有尾巴）不静默折成好值（BUG-368）：结构化版本报 `problem`，
 * 旧的 `yamlScalar` 按「未声明」返回空串，调用方再决定拒绝还是回退。
 */
export type YamlScalarProblem = 'unbalanced-quote' | 'trailing-after-quote'

export interface YamlScalarRead {
  readonly value: string
  readonly problem: YamlScalarProblem | null
}

/** 找闭合引号（双引号支持 `\"`；单引号支持 `''` 成对转义）；找不到返回 -1。 */
function closingQuoteIndex(value: string, quote: '"' | "'"): number {
  for (let index = 1; index < value.length; index += 1) {
    const char = value[index]
    if (quote === '"' && char === '\\' && value[index + 1] === '"') { index += 1; continue }
    if (quote === "'" && char === "'" && value[index + 1] === "'") { index += 1; continue }
    if (char === quote) return index
  }
  return -1
}

/**
 * 解析标量并保留问题（BUG-368）：未闭合引号 / 闭合后带非注释尾巴都算坏形状。
 * @param raw - `key:` 后的原始值。
 * @returns 解析值与问题代号（合法时 null）。
 */
export function yamlScalarOrProblem(raw: string): YamlScalarRead {
  const value = raw.trim()
  if (value === '') return { value: '', problem: null }
  const quote = value[0]
  if (quote === '"' || quote === "'") {
    const end = closingQuoteIndex(value, quote)
    if (end === -1) return { value, problem: 'unbalanced-quote' }
    const rest = value.slice(end + 1).trim()
    if (rest !== '' && !rest.startsWith('#')) return { value: value.slice(1, end), problem: 'trailing-after-quote' }
    return { value: value.slice(1, end), problem: null }
  }
  const comment = value.indexOf(' #')
  return { value: (comment === -1 ? value : value.slice(0, comment)).trim(), problem: null }
}

/**
 * 解析 YAML 标量（宽松版，坏引号按「未声明」返回空串）。
 * @param raw - `key:` 后的原始值。
 * @returns 解析值。
 */
export function yamlScalar(raw: string): string {
  const read = yamlScalarOrProblem(raw)
  return read.problem === null ? read.value : ''
}
