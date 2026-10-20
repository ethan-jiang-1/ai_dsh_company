import { describe, expect, it, vi } from 'vitest'
import { makeCheck, makeFailingCheck, sleep } from '../../tools/lib/probe-kit.mjs'

/**
 * 探针公共件的 keyless 直测（2026-10-14 重构轮立：33 探针的 sleep/check 从各自内联收敛到
 * lib 后，输出格式与收集语义在此钉住——改格式会让所有探针的判读面漂移，先红这里）。
 */

describe('probe-kit：sleep / check 收集器', () => {
  it('makeCheck：push {label, ok} 且输出行格式与原内联版逐字一致', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const results: { label: string; ok: boolean }[] = []
    const check = makeCheck(results)
    check('C1 通过', true)
    check('C2 失败', false, '诊断文本')
    check('C3 detail 为空串时不带括号', false, '')
    expect(log.mock.calls.map(call => call[0])).toEqual([
      '  PASS C1 通过',
      '  FAIL C2 失败（诊断文本）',
      '  FAIL C3 detail 为空串时不带括号',
    ])
    expect(results).toEqual([
      { label: 'C1 通过', ok: true },
      { label: 'C2 失败', ok: false },
      { label: 'C3 detail 为空串时不带括号', ok: false },
    ])
    log.mockRestore()
  })

  it('makeFailingCheck：只收集失败 label，输出行同格式', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const failures: string[] = []
    const check = makeFailingCheck(failures)
    check('V1', true)
    check('V2', false, '视觉漂移 3px')
    check.skip('V3 跳过', '无输入面')
    expect(log.mock.calls.map(call => call[0])).toEqual(['  PASS V1', '  FAIL V2（视觉漂移 3px）', '  SKIP V3 跳过（无输入面）'])
    expect(failures).toEqual(['V2'])
    log.mockRestore()
  })

  it('sleep(ms) 在约 ms 毫秒后 resolve', async () => {
    const started = Date.now()
    await sleep(25)
    expect(Date.now() - started).toBeGreaterThanOrEqual(20)
  })
})
