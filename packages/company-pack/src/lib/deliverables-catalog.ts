/**
 * 成品目录的客户端纯函数（2026-10-19 成品台账卡）：
 * - 文件资源地址：把 `kb/deliverables-index.json` 里的 workspace 相对路径变成右栏可打开的
 *   `dsh-resource://file/session/<sessionId>/<path>` 地址（与 `ui-deliverables` 同一套地址语法，
 *   不引入新依赖）。
 * - 目录类型只从数据面消费；生成器 = `tools/deliverables-index.mjs`。
 */

/**
 * 生成一个文件资源地址；段级 encode（`#`/`?`/空格都能存活），`:` 保留给盘符。
 * @param sessionId - 授权读取的会话。
 * @param path - 会话工作区相对或绝对路径（反斜杠归一为正斜杠）。
 * @returns `dsh-resource://file/session/...` 地址。
 */
export function sessionFileAddress(sessionId: string, path: string): string {
  const encode = (segment: string): string => encodeURIComponent(segment).replace(/%3A/gi, ':')
  const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
  return `dsh-resource://file/session/${encode(sessionId)}/${normalized.split('/').map(encode).join('/')}`
}
