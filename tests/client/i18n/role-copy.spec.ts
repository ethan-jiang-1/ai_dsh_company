/**
 * 角色名表达层回归（E1 第一片）。
 *
 * 证明：6 个公司角色的 zh/en 可见名/全称/短标签/委派描述成对；混排规则统一
 * （英文缩写 + ` · ` + 中文职能）；en 无中文；canonical 仍是英文。
 * 不证明：真页面布局/picker 截图（→ ui-scene-smoke / 后续 A2）。
 */
import { describe, expect, it } from 'vitest'
import {
  DELEGATION_TOOL_ROLES, ROLE_CANONICAL, ROLE_COPY, ROLE_IDS, roleCopyOf, roleLabelFor,
} from '../../../packages/company-pack/src/lib/role-copy.ts'
import {
  delegationRoleText, presenceRoleText, roleText,
} from '../../../packages/company-pack/src/client/roles.ts'
import { PRESET_DISPLAY_NAMES, PRESET_KEYS, PRESET_SHORT_LABELS } from '../../../packages/company-pack/src/lib/presence-status.ts'
import { en, zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

const CJK = /[\u3400-\u9fff]/u
const t = ((key: keyof typeof zh) => zh[key]) as CompanyT
const tEn = ((key: keyof typeof en) => en[key]) as CompanyT

describe('role-copy（canonical + 表达层）', () => {
  it('6 个角色；canonical 英文名不被表达层改掉', () => {
    expect([...ROLE_IDS]).toEqual(['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo'])
    expect([...PRESET_KEYS]).toEqual([...ROLE_IDS])
    for (const id of ROLE_IDS) {
      expect(ROLE_CANONICAL[id]).toMatch(/^[A-Za-z-]+$/)
      expect(PRESET_DISPLAY_NAMES[id]).toBe(ROLE_CANONICAL[id])
      expect(PRESET_SHORT_LABELS[id]).toBe(ROLE_CANONICAL[id])
    }
  })

  it('zh 可见名 = 英文缩写 + 中文全称（混排统一用 · ）；en 无中文', () => {
    for (const id of ROLE_IDS) {
      const copy = ROLE_COPY[id]
      expect(copy.zh.label.startsWith(ROLE_CANONICAL[id])).toBe(true)
      expect(copy.zh.label).toContain(' · ')
      expect(copy.zh.label).toContain(copy.zh.full)
      expect(copy.en.label).toBe(ROLE_CANONICAL[id])
      for (const field of ['label', 'full', 'delegation'] as const) {
        expect(copy.en[field], `${id}.en.${field}`).not.toMatch(CJK)
        expect(copy.zh[field], `${id}.zh.${field}`).toMatch(CJK)
      }
      expect(copy.zh.short).toBe(copy.en.short)
    }
  })

  it('委派工具映射：命名行 → role id；未知工具回退原名', () => {
    expect(DELEGATION_TOOL_ROLES.vp_eng).toBe('vp-eng')
    expect(DELEGATION_TOOL_ROLES.vp_sales).toBe('vp-sales')
    expect(DELEGATION_TOOL_ROLES.coo).toBe('coo')
    expect(DELEGATION_TOOL_ROLES.cfo).toBe('cfo')
    expect(DELEGATION_TOOL_ROLES.vp_cmo).toBe('cmo')
    expect(DELEGATION_TOOL_ROLES.vp_marketing).toBeUndefined()
  })
})

describe('表达层取用', () => {
  it('roleText/presenceRoleText/delegationRoleText 走当前语言', () => {
    expect(roleText('vp-eng', 'label', t)).toBe('VP-Eng · 工程副总裁')
    expect(roleText('vp-eng', 'label', tEn)).toBe('VP-Eng')
    expect(roleText('standard', 'label', t, 'standard')).toBe('standard')
    expect(presenceRoleText({ name: 'vp-sales', role: 'teammate', displayName: 'VP-Sales' }, t)).toBe('VP-Sales · 销售副总裁')
    expect(presenceRoleText({ name: 'lead', role: 'lead', displayName: 'CEO' }, t)).toBe('CEO · 首席执行官')
    expect(presenceRoleText({ name: 'someone', role: 'teammate', displayName: 'Someone' }, t)).toBe('Someone')
    expect(delegationRoleText('vp_eng', t)).toBe('VP-Eng · 研发')
    expect(delegationRoleText('vp_eng', tEn)).toBe('VP-Eng · Engineering')
    expect(delegationRoleText('vp_marketing', t)).toBe('vp_marketing')
  })

  it('roleCopyOf 未知角色返回 undefined（不抛）', () => {
    expect(roleCopyOf('ceo', 'zh')?.label).toBe('CEO · 首席执行官')
    expect(roleCopyOf('standard', 'zh')).toBeUndefined()
    expect(roleLabelFor('cfo', 'zh')).toBe('CFO · 首席财务官')
    expect(roleLabelFor('cfo', 'en')).toBe('CFO')
    expect(roleLabelFor('standard', 'zh')).toBe('standard')
  })
})
