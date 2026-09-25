/**
 * 人机接口收件人路由（人机合一 B1 · 退化形状，2026-09-25）。
 *
 * 机制核实结论（vendor 证伪，证据 = research/human-agent-ux-patterns §〇）：ask_user_question 与
 * approval 均为**单 agent 作用域 waterfall**，请求 schema 无 recipients/role 字段 ⇒ 平台层不能按
 * 收件人分发。本层因此是**纯形状层**：消费 `kb/owners.md` 的授权面形状（角色 → 物理人，多对多行），
 * 把一条人机接口条目映射到它的收件人物理人；v1 表 = 单操作者（全角色同一人，如实形状）。
 *
 * 多物理人进场时只改 owners 表、不改本层（A1 已预留行形状）；角色查不到时返回 undefined
 * （fail-loud：不静默猜人，调用方如实显示"未路由"而不是冒充路由成功）。
 */

/** owners 表的一行：一个人背书的角色集合（多对多的一边）。 */
export interface OwnerRow {
  readonly person: string
  readonly roles: readonly string[]
}

/** `kb/owners.md` 的最小消费形状（授权面的归属面；批什么/答什么仍归 owners.md 正文）。 */
export interface OwnersTable {
  readonly operators: readonly OwnerRow[]
}

/** v1 现实的如实表：单操作者养全部五角色（owners.md 2026-09-25）。 */
export const SINGLE_OPERATOR_TABLE: OwnersTable = {
  operators: [{ person: '操作者', roles: ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'] }],
}

/** 五角色 id（与 `kb/<role>/` 目录名同轴）。 */
const ROLE_IDS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'] as const

/**
 * 从条目的 `who` 字段解析角色 id（'wochen CFO' / 'CFO' / 'cfo' → 'cfo'；解析不出 = undefined）。
 * @param who - 注意力条目的发起方显示名。
 * @returns 角色 id，或 undefined（非角色发起）。
 */
export function roleOfWho(who: string): string | undefined {
  const normalized = who.trim().toLowerCase().replace(/^wochen\s+/u, '')
  return ROLE_IDS.find(role => role === normalized)
}

/**
 * 按角色查 owners 表路由到收件人物理人。
 * @param role - 角色 id（`roleOfWho` 的产出或调用方已知的 id）。
 * @param table - owners 表；缺省 = v1 单操作者表。
 * @returns 收件人物理人；表里查不到该角色 = undefined（如实未路由）。
 */
export function routeByRole(role: string, table: OwnersTable = SINGLE_OPERATOR_TABLE): string | undefined {
  return table.operators.find(row => row.roles.includes(role))?.person
}
