import { describe, expect, it } from 'vitest'
import { firstText } from '../../packages/company-pack/src/lib/text.ts'
import { memberDot } from '../../packages/company-pack/src/lib/presence-status.ts'

// 2026-10-20 审计：presence.ts / attention.ts 各有一份 firstText；tabs/panels 各有一份 memberDot。
// 收进词汇层后在这里钉住语义，防止两份实现再次分叉。
describe('firstText / memberDot（共享词汇层）', () => {
  it('firstText 取第一个非空 text 块的首行', () => {
    expect(firstText([{ type: 'text', text: ' 第一行\n第二行 ' }, { type: 'text', text: 'x' }])).toBe('第一行')
    expect(firstText([{ type: 'tool', text: 'ignored' }, { type: 'text', text: 'ok' }])).toBe('ok')
    expect(firstText([])).toBe('')
  })

  it('memberDot 映射六种在场状态（未知落 idle，不抛）', () => {
    expect(memberDot('running')).toBe('ongoing')
    expect(memberDot('provisioning')).toBe('warning')
    expect(memberDot('failed')).toBe('error')
    expect(memberDot('idle')).toBe('done')
    expect(memberDot('inactive')).toBe('idle')
    expect(memberDot('unknown')).toBe('idle')
  })
})
