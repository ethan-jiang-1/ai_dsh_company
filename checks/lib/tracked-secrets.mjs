// 纯逻辑：从一段文本里找「硬编码的凭据赋值」——补 tracked-token 只认 URL 查询串的形状缺口。
//
// 为什么：BUG-013 的真实形状是 `const TOKEN = '...'`（不是 `?token=`），tracked-token 抓不到；
// BUG-029 的 URL 形状抓到了。两类都该被看见。本模块只认**带引号的字面量赋值**：
//   secret/token/password/passwd/api_key/access_key/private_key/credential = '<16+ 字符>'
// 动态取值（`token: url.searchParams.get('token')`）不命中；模板字面量不命中（可能含插值）。
// 高熵阈值 3.5 与 a2 对齐；已知测试占位串显式放行（值不回传，只给行号/键名/长度/熵）。
const ASSIGN_RE = /(?:^|[^A-Za-z0-9_])(secret|token|password|passwd|api[_-]?key|access[_-]?key|private[_-]?key|credential)\s*[:=]\s*(['"])([^'"\n]{16,})\2/gi

/** 仓库里合法的测试占位串（不是凭据）。新增占位串必须同时加到这里并在测试里说明。 */
const ALLOWED_VALUES = new Set([
  'never-render-this-placeholder',
  '0123456789abcdefghijABCDEFGHIJ',
  '0123456789abcdefghij',
])

function entropy(value) {
  const counts = new Map()
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1)
  let result = 0
  for (const count of counts.values()) {
    const p = count / value.length
    result -= p * Math.log2(p)
  }
  return result
}

/**
 * 找文本中的硬编码凭据赋值。
 * @param {string} text - 文件全文。
 * @returns {ReadonlyArray<{ line: number, key: string, valueLength: number, entropy: number }>}
 */
export function findSecretAssignments(text) {
  const hits = []
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    ASSIGN_RE.lastIndex = 0
    let match
    while ((match = ASSIGN_RE.exec(line)) !== null) {
      const value = match[3]
      if (value.length < 16) continue
      if (ALLOWED_VALUES.has(value)) continue
      const score = entropy(value)
      if (score < 3.5) continue
      hits.push({ line: index + 1, key: match[1], valueLength: value.length, entropy: score })
      break // 每行首个足够强的赋值足够定位；避免同一行重复报
    }
  }
  return hits
}
