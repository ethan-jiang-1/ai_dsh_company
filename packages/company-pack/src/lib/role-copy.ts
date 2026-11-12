/**
 * 角色显示名单一事实家（表达层数据，允许 zh/en 混排）。
 *
 * 内部分 canonical：role id（`ceo` / `vp-eng` / …）+ 英文名（`CEO` / `VP-Eng` / …）。
 * 表达层按语言取 label/full/short/delegation；混排统一用 ` · ` 分隔，视觉一致。
 * 数据/日志/API/preset id 继续用 canonical，不随表达层变。
 */
export type RoleId = 'ceo' | 'vp-eng' | 'vp-sales' | 'coo' | 'cfo' | 'cmo'

export const ROLE_IDS = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo'] as const

/** 角色的一语言表达。 */
export interface RoleCopy {
  /** 可见全名：zh 混排（`CEO · 首席执行官`），en 用缩写（`CEO`）。 */
  readonly label: string
  /** 纯本地语言全称（tooltip/aria 用）。 */
  readonly full: string
  /** 座位/窗口标题的短标签（两语言一致）。 */
  readonly short: string
  /** 委派卡/职能语境：`VP-Eng · 研发` / `VP-Eng · Engineering`。 */
  readonly delegation: string
}

/** canonical 英文名（数据/API/日志/preset 名用）。 */
export const ROLE_CANONICAL: Readonly<Record<RoleId, string>> = {
  ceo: 'CEO',
  'vp-eng': 'VP-Eng',
  'vp-sales': 'VP-Sales',
  coo: 'COO',
  cfo: 'CFO',
  cmo: 'CMO',
}

/** 表达层 zh/en。 */
export const ROLE_COPY: Readonly<Record<RoleId, { readonly zh: RoleCopy; readonly en: RoleCopy }>> = {
  ceo: {
    zh: { label: 'CEO · 首席执行官', full: '首席执行官', short: 'CEO', delegation: 'CEO · 全局' },
    en: { label: 'CEO', full: 'Chief Executive Officer', short: 'CEO', delegation: 'CEO' },
  },
  'vp-eng': {
    zh: { label: 'VP-Eng · 工程副总裁', full: '工程副总裁', short: 'VPE', delegation: 'VP-Eng · 研发' },
    en: { label: 'VP-Eng', full: 'VP of Engineering', short: 'VPE', delegation: 'VP-Eng · Engineering' },
  },
  'vp-sales': {
    zh: { label: 'VP-Sales · 销售副总裁', full: '销售副总裁', short: 'VPS', delegation: 'VP-Sales · 销售' },
    en: { label: 'VP-Sales', full: 'VP of Sales', short: 'VPS', delegation: 'VP-Sales · Sales' },
  },
  coo: {
    zh: { label: 'COO · 首席运营官', full: '首席运营官', short: 'COO', delegation: 'COO · 运营与交付' },
    en: { label: 'COO', full: 'Chief Operating Officer', short: 'COO', delegation: 'COO · Operations' },
  },
  cfo: {
    zh: { label: 'CFO · 首席财务官', full: '首席财务官', short: 'CFO', delegation: 'CFO · 财务与合规' },
    en: { label: 'CFO', full: 'Chief Financial Officer', short: 'CFO', delegation: 'CFO · Finance' },
  },
  cmo: {
    zh: { label: 'CMO · 首席营销官', full: '首席营销官', short: 'CMO', delegation: 'CMO · 市场与产品' },
    en: { label: 'CMO', full: 'Chief Marketing Officer', short: 'CMO', delegation: 'CMO · Marketing' },
  },
}

/** 命名委托工具名 → role id（CEO preset 的 ⑤ 行）。 */
export const DELEGATION_TOOL_ROLES: Readonly<Record<string, RoleId>> = {
  vp_eng: 'vp-eng',
  vp_sales: 'vp-sales',
  vp_cmo: 'cmo',
  coo: 'coo',
  cfo: 'cfo',
}

/** 字符串是否公司角色 id。 */
export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value)
}

/**
 * 取某角色某语言的表达；未知角色返回 undefined（调用方回退原值）。
 * @param role - role id 或任意字符串。
 * @param language - 表达语言。
 * @returns 该语言的 RoleCopy，或 undefined。
 */
export function roleCopyOf(role: string, language: 'zh' | 'en'): RoleCopy | undefined {
  return isRoleId(role) ? ROLE_COPY[role][language] : undefined
}
