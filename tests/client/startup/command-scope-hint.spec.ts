/**
 * composer 提示「斜杠命令要等会话开始后才回话」的 keyless 判据（BUG-290）。
 *
 * 为什么单独立一条：这条提示的全部价值就在**触发条件**——会话还没开始时出现、已有轮次时消失。
 * 触发错了要么是噪声（每个会话都挂一句废话），要么等于没做（该出现时不在）。判据面 = 纯渲染；
 * 真页面复核 = 隔离 home 起实例看 composer 行。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CommandScopeHint } from '../../../packages/company-pack/src/client/startup/CommandScopeHint.tsx'
import { zh } from '../../../packages/company-pack/src/client/locales.ts'

/** 假会话列表快照面：`blank` 由用例指定。 */
const listFace = (blank: boolean | undefined) => ({
  subscribe: () => () => {},
  getSnapshot: () => ({ byId: { 'session-1': blank === undefined ? undefined : { blank } } }),
})

const t = ((key: keyof typeof zh) => String(zh[key])) as never

const render = (blank: boolean | undefined): string => renderToStaticMarkup(createElement(CommandScopeHint, {
  sessionId: 'session-1' as never,
  list: listFace(blank),
  t,
}))

// 负例留证 2026-11-21：撤掉 CommandScopeHint 与槽注册后 `vitest run tests/client/startup/command-scope-hint.spec.ts` 无法导入（组件不存在），真页面同期无该提示文本；接回后 3/3 绿、两态复核通过。BUG-290
describe('composer 命令作用域提示（BUG-290）', () => {
  it('会话还没开始（blank=true）⇒ 提示出现，并说清「命令是会话级的」', () => {
    const markup = render(true)
    expect(markup).toContain('斜杠命令要等会话开始后才回话')
    expect(markup).toContain('会话级')
  })

  it('会话已有轮次（blank=false）⇒ 不渲染（不在正常会话里挂废话）', () => {
    expect(render(false)).toBe('')
  })

  it('会话行还没加载（undefined）⇒ 不渲染，不猜', () => {
    expect(render(undefined)).toBe('')
  })
})
