// 运行时数据清扫的**纯判据**（2026-10-23 P7）。IO 留给 tools/prune-runtime.mjs。
//
// 用户口径（2026-10-23）：「7 天前的数据都不需要了」——插件内容（packages/company-pack）除外，
// 其余「过分老的数据」可以清；但先证明没人引用：被 markdown 指着的东西删了会断链/失真，
// 那条判据 2026-10-23 已经用 verify 的 md-links 红过一次（删 runtime 证据目录打断 archived research 链接）。
/** 受保护的名字（README 是分类 owner，永不删）。 */
const PROTECTED = /(^|\/)README(\.md)?$/

/**
 * 从候选里挑出可删的运行时条目。
 * @param {ReadonlyArray<{ path: string, mtimeMs: number, referenced?: boolean, tracked?: boolean }>} entries
 * @param {{ now: number, days: number }} options
 * @returns {{ drop: Array<{path: string}>, keep: Array<{path: string, reason: string}> }}
 */
export function selectPrunable(entries, { now, days }) {
  const cutoff = now - days * 86_400_000
  const drop = []
  const keep = []
  for (const entry of entries ?? []) {
    if (PROTECTED.test(entry.path)) { keep.push({ path: entry.path, reason: 'protected' }); continue }
    if (entry.tracked === true) { keep.push({ path: entry.path, reason: 'tracked' }); continue }
    if (entry.referenced === true) { keep.push({ path: entry.path, reason: 'referenced' }); continue }
    if (!(entry.mtimeMs < cutoff)) { keep.push({ path: entry.path, reason: 'fresh' }); continue }
    drop.push({ path: entry.path })
  }
  return { drop, keep }
}
