/** Host half of the company pack: the browser half lives in `./client`. */

/**
 * 在场板读模型（R5b）从 host 入口再导出：`scripts/replay-smoke.mjs` 用它把重放会话的
 * team 事件折成在场板做判据 4 断言；纯函数、零依赖，不影响 host 挂载面。
 */
export * from './lib/presence.ts'

/**
 * Host plugin body. Brand behavior is browser-only, so the host side registers
 * nothing; the client module is discovered from this package's `dsh.client`.
 */
export function apply(): void {}
