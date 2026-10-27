import { describe, expect, it } from 'vitest'
import { assertAttachPort } from '../../tools/lib/cdp-attach.mjs'

// 2026-10-28 R4-P3：--attach 的入口判据。真附着证据 = 一次 about:blank 传输 +
// 一次真实 GUI 只读快照（exit 0）；这里只钉端口/目标选择前的守卫，避免把 0/NaN 当端口。
describe('CDP attach 入口', () => {
  it('非法端口在连网前就拒绝（不静默连 0 或 NaN）', async () => {
    expect(() => assertAttachPort(0)).toThrow('invalid CDP port')
    expect(() => assertAttachPort(Number.NaN)).toThrow('invalid CDP port')
    expect(() => assertAttachPort(70_000)).toThrow('invalid CDP port')
    expect(assertAttachPort(9222)).toBe(9222)
  })
})
