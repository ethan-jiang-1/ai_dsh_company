/**
 * 角色表达层的取用缝：role id → typed `company` 字典，未知角色回退原值。
 *
 * 数据/日志/API 不走这里；它们用 `ROLE_CANONICAL` / role id。这里只服务 UI 与
 * host 的人可见回执。
 */
import type { CompanyKey, CompanyT } from './locales.ts'
import { DELEGATION_TOOL_ROLES, isRoleId, ROLE_CANONICAL, type RoleId } from '../lib/role-copy.ts'

export type RoleField = 'label' | 'full' | 'short' | 'delegation'

/** role id + 字段 → 字典 key。 */
export function roleKey(role: RoleId, field: RoleField): CompanyKey {
  return `roles.${role}.${field}` as CompanyKey
}

/**
 * 取角色字段的当前语言文案；未知角色返回 fallback（再退原值）。
 * @param role - role id 或任意字符串。
 * @param field - 可见名/全称/短标签/委派描述。
 * @param t - company translator。
 * @param fallback - 未知角色时优先用的原值。
 * @returns 文案。
 */
export function roleText(role: string, field: RoleField, t: CompanyT, fallback?: string): string {
  if (!isRoleId(role)) return fallback ?? role
  return t(roleKey(role, field))
}

/** 委派工具名 → 表达层委派描述（未知工具回退工具名）。 */
export function delegationRoleText(toolName: string, t: CompanyT): string {
  const role = DELEGATION_TOOL_ROLES[toolName]
  return role === undefined ? toolName : roleText(role, 'delegation', t)
}

/** 在场行/成员：lead 恒为 CEO；命中 role id 用 label；否则原显示名。 */
export function presenceRoleText(row: { readonly name: string; readonly role: 'lead' | 'teammate'; readonly displayName: string }, t: CompanyT): string {
  if (row.role === 'lead') return roleText('ceo', 'label', t)
  return roleText(row.name, 'label', t, row.displayName)
}

/** canonical 名（数据/测试用；不随语言变）。 */
export function canonicalRoleName(role: string): string {
  return isRoleId(role) ? ROLE_CANONICAL[role] : role
}
