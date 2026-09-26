/**
 * 收件人路由（人机合一 B1 · 退化形状）keyless 单测。
 * 验收（RFC B1）：路由表形状可扩——多 owner fixture 下两个角色的请求分别路由到不同 owner；
 * 单人现实下 = v1 表全路由到唯一操作者；vendor 证伪 ⇒ 本层只做形状，不做平台分发。
 */
import { describe, expect, it } from 'vitest'
import { OWNERS_TABLE, roleOfWho, routeByRole, type OwnersTable } from '../packages/company-pack/src/lib/routing.ts'

describe('roleOfWho（who 显示名 → 角色 id）', () => {
  it('角色显示名（带 wochen 前缀）解析为 id', () => {
    expect(roleOfWho('wochen CFO')).toBe('cfo')
    expect(roleOfWho('wochen VP-Eng')).toBe('vp-eng')
  })
  it('裸角色 id / 大小写不敏感', () => {
    expect(roleOfWho('cfo')).toBe('cfo')
    expect(roleOfWho('CEO')).toBe('ceo')
  })
  it('非角色发起 = undefined（不猜）', () => {
    expect(roleOfWho('contractor-a')).toBeUndefined()
    expect(roleOfWho('')).toBeUndefined()
  })
})

describe('routeByRole（v2 多物理人表：与 owners.md 一致）', () => {
  it('五个角色全部路由到操作者（单人现实的如实形状）', () => {
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      expect(routeByRole(role)).toBe(OWNERS_TABLE.operators.find(row => row.roles.includes(role))?.person)
    }
  })
})

describe('routeByRole（多 owner fixture：形状可扩，两个角色路由到不同 owner）', () => {
  // 未来形态的 fixture（A1 预留的多对多行形状；真实表由 kb/owners.md 拥有，测试自带 fixture）。
  const twoOwners: OwnersTable = {
    operators: [
      { person: '张三（财务线）', roles: ['cfo'] },
      { person: '李四（其余线）', roles: ['ceo', 'vp-eng', 'vp-sales', 'coo'] },
    ],
  }

  it('CFO 的条目路由到张三，CEO 的路由到李四（B1 验收主断言）', () => {
    expect(routeByRole('cfo', twoOwners)).toBe('张三（财务线）')
    expect(routeByRole('ceo', twoOwners)).toBe('李四（其余线）')
  })
  it('一人背多角色（多对多）', () => {
    expect(routeByRole('coo', twoOwners)).toBe('李四（其余线）')
    expect(routeByRole('vp-sales', twoOwners)).toBe('李四（其余线）')
  })
  it('表里没有的角色 = undefined（fail-loud，不冒充路由成功）', () => {
    expect(routeByRole('contractor', twoOwners)).toBeUndefined()
  })
  it('端到端：who 显示名 → 角色 → 收件人', () => {
    const who = 'wochen CFO'
    expect(routeByRole(roleOfWho(who) ?? '', twoOwners)).toBe('张三（财务线）')
  })
})
