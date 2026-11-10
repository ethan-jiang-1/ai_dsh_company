/**
 * YAML 标量解析：去成对引号、去行尾 ` #` 注释。
 *
 * 产品类型字段允许 `productType: "business-software" # 默认` 这类合法 YAML 写法；`/req check` 与
 * bootstrap 必须同口径解析（2026-11-11 BUG-062/063 的共用落点；red-team E16 的 C2/C3）。
 */
export function yamlScalar(raw: string): string {
  const value = raw.trim()
  if (value === '') return ''
  const quote = value[0]
  if (quote === '"' || quote === "'") {
    const end = value.indexOf(quote, 1)
    if (end !== -1) return value.slice(1, end)
  }
  const comment = value.indexOf(' #')
  return (comment === -1 ? value : value.slice(0, comment)).trim()
}
