/**
 * 启动策略折算的**状态判据**（BUG-297）：坏 JSON / 未来 schema / 读不到 必须各自成一态，
 * 不许折成「合法 auto」；而文件缺失/空才是合法的 auto（不制造噪声）。
 *
 * 为什么这条 spec 重要：这段折算原本内联在 `client/index.ts` 的注入闭包里，单测根本不执行它——
 * 于是「读坏了会不会说」从来没有判据。
 */
import { describe, expect, it } from 'vitest'
import { startupFaceFrom, startupFaceFromReads } from '../../../packages/company-pack/src/client/startup/startup-load.ts'

const read = (text: string) => ({ ok: true as const, eof: true, text })
const missing = () => ({ ok: false as const, reason: 'ENOENT' })

// 负例留证 2026-11-22：把坏 JSON 的 problem 吞成 null 后 `vitest run tests/client/startup/startup-load.spec.ts` 2 failed（corrupt/unsupported）；还原后 6/6 绿。BUG-297
describe('startupFaceFrom：设置文件的状态（BUG-297）', () => {
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
    // 第三个参数 = 「文件确实存在」：读失败 + 存在 = 不可读；不存在 = 合法 auto（下一条用例）。
    const face = startupFaceFrom(missing(), read(''), true)
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

// 缺失 ≠ 读不到（BUG-297 的收窄）：读面失败时，先探「文件在不在」——
// 不在 = 合法 auto（新工作区不该冒错误行），在但读不到 = unreadable。
describe('startupFaceFrom · 缺失与不可读的区分', () => {
  it('读失败 + 文件不存在 ⇒ 不报问题（合法 auto）', () => {
    const face = startupFaceFrom({ ok: false, reason: 'ENOENT' }, read(''), false)
    expect(face.settingsProblem ?? null).toBeNull()
  })

  it('读失败 + 文件确实存在 ⇒ unreadable', () => {
    const face = startupFaceFrom({ ok: false, reason: 'EISDIR' }, read(''), true)
    expect(face.settingsProblem).toBe('unreadable')
  })
})

// 折算的异步壳（composition 只调这一行）：探针只在读失败时调一次——
// 读成功不探（省一次列目录），读失败才决定「缺失」还是「不可读」。
describe('startupFaceFromReads：探针的调用时机', () => {
  it('读成功 ⇒ 不调探针', async () => {
    let probed = 0
    const face = await startupFaceFromReads(
      { settings: read(JSON.stringify({ v: 1 })), options: read('') },
      async () => { probed += 1; return false },
    )
    expect(probed).toBe(0)
    expect(face.settingsProblem ?? null).toBeNull()
  })

  it('读失败 ⇒ 调一次；探到存在 = unreadable，探不到 = 合法 auto', async () => {
    let probed = 0
    const present = await startupFaceFromReads({ settings: missing(), options: read('') }, async () => { probed += 1; return true })
    expect(probed).toBe(1)
    expect(present.settingsProblem).toBe('unreadable')
    const absent = await startupFaceFromReads({ settings: missing(), options: read('') }, async () => false)
    expect(absent.settingsProblem ?? null).toBeNull()
  })
})

// 字段级诊断（BUG-314）：v 正确但字段类型坏（数组/对象/数字）过去被折成「自动」。
// 负例留证 2026-11-22：去掉字段检查（只查 v）后 `vitest run tests/client/startup/startup-load.spec.ts` 2 failed（字段名丢失）。BUG-314
describe('startupFaceFrom · 字段类型坏（BUG-314）', () => {
  it('productType 是数组 ⇒ corrupt + 点名字段', async () => {
    const face = await startupFaceFromReads({ settings: read(JSON.stringify({ v: 1, productType: [] })), options: read('') }, async () => false)
    expect(face.settingsProblem).toBe('corrupt')
    expect(face.settingsField).toBe('productType')
  })

  it('wiki 是对象 / deliveryMode 是数字 ⇒ 也报 corrupt（数字是合法标量，不报）', async () => {
    const wiki = await startupFaceFromReads({ settings: read(JSON.stringify({ v: 1, wiki: {} })), options: read('') }, async () => false)
    expect(wiki.settingsField).toBe('wiki')
    const num = await startupFaceFromReads({ settings: read(JSON.stringify({ v: 1, deliveryMode: 42 })), options: read('') }, async () => false)
    expect(num.settingsProblem ?? null).toBeNull()
  })
})
