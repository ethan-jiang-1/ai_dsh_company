/**
 * 人机接口收件人路由（人机合一 B1 · 退化形状，2026-09-25）。
 *
 * 机制核实结论（vendor 证伪，证据 = research/human-agent-ux-patterns §〇）：ask_user_question 与
 * approval 均为**单 agent 作用域 waterfall**，请求 schema 无 recipients/role 字段 ⇒ 平台层不能按
 * 收件人分发。本层因此是**纯形状层**：消费 `kb/owners.md` 的授权面形状（角色 → 物理人，多对多行），
 * 把一条人机接口条目映射到它的收件人物理人。
 *
 * ⚠ **本文件里那份表是 `company-workspace/kb/owners.md` 的代码副本**（事实家是那个 .md）——
 * 两者必须一致；不一致时以 .md 为准，并改这里。**合成一处**需要 client 数据面读文件（红线，未批）
 * ⇒ 已登记 `ROADMAP.md` §磨清单。角色查不到时返回 undefined（fail-loud：不静默猜人，
 * 调用方如实显示"未路由"而不是冒充路由成功）。
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

/** v2 现实的如实表：多物理人（owners.md 2026-09-26，多人协作条目 ①）。 */
export const OWNERS_TABLE: OwnersTable = {
  operators: [
    { person: '人甲（CEO 线）', roles: ['ceo'] },
    { person: '人乙（财务线）', roles: ['cfo'] },
    { person: '人丙（业务与交付线）', roles: ['vp-sales', 'vp-eng', 'coo'] },
  ],
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
 * @param table - owners 表；缺省 = `OWNERS_TABLE`（owners.md 的代码副本）。
 * @returns 收件人物理人；表里查不到该角色 = undefined（如实未路由）。
 */
export function routeByRole(role: string, table: OwnersTable = OWNERS_TABLE): string | undefined {
  return table.operators.find(row => row.roles.includes(role))?.person
}
