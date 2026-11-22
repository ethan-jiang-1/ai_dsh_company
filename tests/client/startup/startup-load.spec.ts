/**
 * 启动策略折算的**状态判据**：坏 JSON / 未来 schema / 读不到 必须各自成一态，
 * 不许折成「合法 auto」；而文件缺失/空才是合法的 auto（不制造噪声）。
 *
 * 为什么这条 spec 重要：这段折算原本内联在 `client/index.ts` 的注入闭包里，单测根本不执行它——
 * 于是「读坏了会不会说」从来没有判据。
 */
import { describe, expect, it } from 'vitest'
import { startupFaceFrom } from '../../../packages/company-pack/src/client/startup/startup-load.ts'

const read = (text: string) => ({ ok: true as const, eof: true, text })
const missing = () => ({ ok: false as const, reason: 'ENOENT' })

describe('startupFaceFrom：设置文件的状态', () => {
  it('合法设置 ⇒ 生效，无问题', () => {
    const face = startupFaceFrom(read(JSON.stringify({ v: 1, productType: 'business-software' })), read(''))
    expect(face.loaded).toBe(true)
    expect(face.settings.productType).toBe('business-software')
    expect(face.settingsProblem ?? null).toBeNull()
  })

  it('坏 JSON ⇒ corrupt（不冒充 auto）', () => {
    const face = startupFaceFrom(read('{ this is not json'), read(''))
    expect(face.settingsProblem).toBe('corrupt')
  })

  it('未来 schema（v>1）⇒ unsupported', () => {
    const face = startupFaceFrom(read(JSON.stringify({ v: 2 })), read(''))
    expect(face.settingsProblem).toBe('unsupported')
  })

  it('读不到（目录/权限）⇒ unreadable，与「缺失」分开', () => {
    const face = startupFaceFrom(missing(), read(''))
    expect(face.settingsProblem).toBe('unreadable')
  })

  it('文件缺失/空 ⇒ 合法 auto，不报问题', () => {
    expect(startupFaceFrom(read(''), read('')).settingsProblem ?? null).toBeNull()
  })

  it('选项文件不可读仍走既有的 optionsProblem', () => {
    const face = startupFaceFrom(read(''), { ok: false, reason: 'x' })
    expect(face.optionsProblem).toBe('unreadable')
  })
})
