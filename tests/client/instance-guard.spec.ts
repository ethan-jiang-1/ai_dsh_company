import { describe, expect, it } from 'vitest'
import { shouldWarn } from '../../packages/company-pack/src/client/instance-guard.ts'

// 负例留证 2026-10-10：卡② UX 依据 = 现场实测 3 个 web 实例并存 + E2 实证（多实例同文件
// ×20 = 20/20 静默互踩）——用户拍板「警告横幅」：第二实例照常启动但被明确告知。

const NOW = 1_000_000

describe('多实例探活（instance-guard）', () => {
  it('无心跳/空串/坏 JSON ⇒ 不警告', () => {
    expect(shouldWarn(null, NOW, 'self')).toBeNull()
    expect(shouldWarn('', NOW, 'self')).toBeNull()
    expect(shouldWarn('not-json{{', NOW, 'self')).toBeNull()
  })

  it('别人的新鲜心跳 ⇒ 警告（横幅文案含互踩提示与实例数）', () => {
    const raw = JSON.stringify({ 'tab-a': NOW - 5_000, 'tab-b': NOW - 8_000 })
    const msg = shouldWarn(raw, NOW, 'self')
    expect(msg).toContain('2')
    expect(msg).toContain('静默互踩')
  })

  it('自己与过期心跳（>20s）不算并存 ⇒ 不警告', () => {
    const raw = JSON.stringify({ self: NOW - 1_000, 'tab-stale': NOW - 60_000 })
    expect(shouldWarn(raw, NOW, 'self')).toBeNull()
  })
})
