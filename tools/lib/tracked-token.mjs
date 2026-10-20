// 纯逻辑：从一段文本里找「带 token 的 URL」。
//
// 为什么只认 URL 形状：BUG-029（2026-10-20）是观察窗启动横幅
// `http://127.0.0.1:<port>/?token=<43 字符>` 随 runtime 日志入库；BUG-013（2026-10-12）
// 是同类 token 随 e2e driver 入库。class-level 守卫若直接复用 a2 的高熵赋值扫描，会把
// `token: url.searchParams.get('token')` 与 `secret = 'never-render-this-placeholder'`
// 两处测试替身判红；这里只匹配真实 URL 查询串，避免假红。
//
// 返回值只给行号与 token 长度，**不回传 token 值**（防二次扩散）。

const TOKEN_URL = /https?:\/\/[^\s"'<>]*[?&]token=([A-Za-z0-9_-]{20,})/g

/**
 * 找文本中的 token URL。
 * @param {string} text - 文件全文。
 * @returns {ReadonlyArray<{ line: number, tokenLength: number }>} 命中行（1 基）与 token 长度。
 */
export function findTokenUrls(text) {
  const hits = []
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index++) {
    for (const match of lines[index].matchAll(TOKEN_URL)) {
      hits.push({ line: index + 1, tokenLength: match[1].length })
    }
  }
  return hits
}
