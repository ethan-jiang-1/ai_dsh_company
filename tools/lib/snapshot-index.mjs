// 纯逻辑：快照目录 ↔ snapshots/README 场景表覆盖检查。
//
// 为什么需要：2026-10-20 fresh-agent 审计发现 README 写 43 行、盘上 47 个场景，
// 4 个新场景（3 个 convergence + cultivation-gui）没有登记。手维护清单没有覆盖门禁就会漂。
// 只检查「目录 → 索引」，不检查「索引 → 目录」（历史行允许指向已迁走的场景，由 md-links 管链接）。

/** 五桶的目录名（与 snapshots/README §分类一致）。 */
export const SNAPSHOT_KINDS = ['replay', 'archive', 'visual', 'probes', 'corpora']

/**
 * 找出未出现在 README 场景表里的场景目录。
 * @param {ReadonlyArray<{ kind: string, name: string }>} scenes 盘上场景目录。
 * @param {string} readme `snapshots/README.md` 全文。
 * @returns {ReadonlyArray<string>} 缺失项的 `kind/name`，按输入顺序。
 */
export function missingSnapshotIndexRows(scenes, readme) {
  return scenes
    .filter(({ kind, name }) => !readme.includes(`(${kind}/${name}/)`))
    .map(({ kind, name }) => `${kind}/${name}`)
}
