// 纯逻辑：checks/README 是否覆盖公开入口脚本。
//
// 2026-10-20 审计：checks/README 手维护，漏了 5 个公开入口（board-drift / sidebar-role-mark /
// archive-move / ask-latency / deliverables-index）。本模块只做「公开入口 → 索引链接」覆盖；
// gates/lib/drivers/archive 是内部实现，不在射程。

/** 索引链接目标（从 checks/README.md 所在目录算）。 */
export function indexTargetFor(rel) {
  if (rel.startsWith('checks/')) return rel.slice('checks/'.length)
  return `../${rel}`
}

/**
 * 找未出现在 README 的公开脚本。
 * @param {ReadonlyArray<string>} scripts 仓库相对路径（如 checks/smoke/x.mjs）。
 * @param {string} readme checks/README.md 全文。
 * @returns {ReadonlyArray<string>} 缺失脚本（仓库相对路径）。
 */
export function missingIndexedScripts(scripts, readme) {
  return scripts.filter(rel => !readme.includes(`](${indexTargetFor(rel)})`))
}
