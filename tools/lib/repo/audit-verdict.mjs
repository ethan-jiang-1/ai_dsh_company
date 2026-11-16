// 审计档机器判词的**唯一解析器**（2026-10-23，架构评审候选 4）。
//
// 背景：`checks/audit/deliverables-check.mjs --json` 在人类报告之后追加一行 `JSON:{...}`。
// 此前两个消费者各刮各的：converge 用正则扫人读报告（因为 JSON 丢了 detail），index 找 `JSON:` 前缀。
// 判词结构化后（violations/warnings 都带 detail），解析只该有一份——住这里，两个消费者共用。
const PREFIX = 'JSON:'

/**
 * 解析审计档 stdout 里的机器判词。
 * @param {string} stdout - 审计档完整 stdout（人类报告 + 末行 JSON）。
 * @returns {any | null} 解析出的对象；没有该行或 JSON 损坏 = null（调用方 fail-closed）。
 */
export function parseAuditVerdict(stdout) {
  const line = String(stdout ?? '').split('\n').find(row => row.startsWith(PREFIX))
  if (line === undefined) return null
  try { return JSON.parse(line.slice(PREFIX.length)) } catch { return null }
}
