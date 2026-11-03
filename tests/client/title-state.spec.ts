/**
 * 窗口标题 / 角色色条的纯计算（2026-11-03 D2/D5 从 registerTitle 抽出）。
 * 四个分支：无当前会话 / 有 preset / 未知 preset / 空标题；DOM 写入与订阅归 registerTitle 的 effect。
 */
import { describe, expect, it } from 'vitest'
import { titleUpdateFor } from '../../packages/company-pack/src/client/title-state.ts'

const roleShort = { ceo: 'CEO', 'vp-eng': 'E' }
const titleOf = (row: { title?: string }) => row.title

const row = (over = {}) => ({ id: 's1', retainedBy: { mainView: 1 }, title: '问候', ...over })

describe('titleUpdateFor', () => {
  it('无当前会话 → 不写 title，不写 role', () => {
    expect(titleUpdateFor({ current: undefined, preset: null, roleShort, titleOf })).toEqual({})
  })

  it('ceo + 标题 → 【CEO】问候 / role=ceo', () => {
    expect(titleUpdateFor({ current: row(), preset: 'ceo', roleShort, titleOf }))
      .toEqual({ title: '【CEO】问候', role: 'ceo' })
  })

  it('未知 preset → 保留原题，不写 role', () => {
    expect(titleUpdateFor({ current: row(), preset: 'mystery', roleShort, titleOf }))
      .toEqual({ title: '问候' })
  })

  it('ceo + 空标题 → 只写 role，不改 title', () => {
    expect(titleUpdateFor({ current: row({ title: '' }), preset: 'ceo', roleShort, titleOf }))
      .toEqual({ role: 'ceo' })
  })

  it('preset=null + 标题 → 原题无 role', () => {
    expect(titleUpdateFor({ current: row(), preset: null, roleShort, titleOf }))
      .toEqual({ title: '问候' })
  })
})
