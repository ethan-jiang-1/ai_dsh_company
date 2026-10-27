/** 纯逻辑小守卫（2026-10-27 R3-22 收家：`isRecord` 此前在 cultivation-context / revoke-journal /
 *  cultivation-context-read 三处各一份）。可被 host 与 client 双面编译——只用语言内建。 */

/** 非 null、非数组的对象（JSON 形状判别的常用第一刀）。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
