import { describe, expect, it } from 'vitest'
import { firstText, shortSessionId } from '../../../packages/company-pack/src/lib/shared/text.ts'
import { memberDot } from '../../../packages/company-pack/src/lib/presence/presence-status.ts'

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

// 负例留证 2026-11-24：firstText 不归一换行 ⇒ CRLF/孤立 CR 首行带 \r，本用例红。BUG-361
describe('firstText 换行归一（BUG-361）', () => {
  it('CRLF 与孤立 CR 都只留首行文本', () => {
    expect(firstText([{ type: 'text', text: 'a\r\nb' }])).toBe('a')
    expect(firstText([{ type: 'text', text: 'a\rb' }])).toBe('a')
    expect(firstText([{ type: 'text', text: '  a\r\n  b  ' }])).toBe('a')
  })

  // 负例留证 2026-11-27：shortSessionId 改回裸 slice(0,8) 不去 session- 前缀 ⇒ 本用例红（返回 'session-'）。BUG-390
  it('shortSessionId 剥离 session- 前缀并在剥空时兜底原串（BUG-390）', () => {
    expect(shortSessionId('session-abcdef1234')).toBe('abcdef12')
    expect(shortSessionId('session-')).toBe('session-')
    expect(shortSessionId('plain123456')).toBe('plain123')
  })
})
