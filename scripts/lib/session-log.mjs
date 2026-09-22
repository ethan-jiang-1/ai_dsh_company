// 会话日志读取的共享工具（`session/page` 两步读法的唯一实现）。
//
// 为什么单独抽出来：这个读法有个**静默失败**的坑，踩一次就会浪费一轮门禁——
//   `session/page` 的 `throughSeq` 必须是**有效 seq**，传 `-1` 实测返回 0 条记录
//   （不是报错，是空数组）；而"当前游标"没有独立 RPC，越界调用才会在错误里吐出它
//   （`… is past cursor N`）。所以正确读法 = 先用 `MAX_SAFE_INTEGER` 探一次拿游标
//   （或从错误里解析），再用该游标读全量。
// 出处：probe-smoke.mjs:139-154（R2 实证）；handbook-smoke 首跑就是踩了 `-1` 而
//   误判成"基线没注入"（实际基线一直在，见 2026-09-22 R3 S0 诊断）。
//
// `page(request)` 由调用方注入（各脚本的 RPC 封套不同，本模块不认识它们的 base/cookie）。

/** 从事件 data 里深提取全部 text 片段（`{ type: 'text', text }` 递归收集）。 */
export function collectText(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, out)
    return out
  }
  if (value !== null && typeof value === 'object') {
    if (value.type === 'text' && typeof value.text === 'string') out.push(value.text)
    for (const item of Object.values(value)) collectText(item, out)
  }
  return out
}

/**
 * 读某会话当前可见的全部事件记录（两步读法，见文件头）。
 * @param page - `(request) => Promise<{records?: {event?: {seq?: number}}[]}>`，调用方的 `session/page` 封套。
 * @param address - 会话地址 `{ kind: 'session', sessionId }`。
 * @param maxMessages - 第二次读取的上限（默认 500，与既有脚本一致）。
 * @returns 事件记录数组；会话还没有任何事件时返回空数组。
 */
export async function readRecords(page, address, maxMessages = 500) {
  let cursor = -1
  try {
    const probe = await page({ address, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 })
    cursor = probe.records?.at(-1)?.event?.seq ?? -1
  } catch (error) {
    const match = /past cursor (\d+)/.exec(error.message)
    if (match === null) throw error
    cursor = Number(match[1])
  }
  if (cursor < 0) return []
  const result = await page({ address, throughSeq: cursor, maxMessages })
  return result.records ?? []
}
