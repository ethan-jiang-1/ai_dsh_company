/**
 * 委派树的只读折法（2026-11-15，src↔tests 目录对齐卡：src/lib/delegation/ 的测试家）。
 *
 * 判据：catalog 与 `byId.parentId` 两条来源都能进树（catalog 迟到/缺条目也不丢 child）；
 * 终态优先取 host 投影 `companyDelegationTerminal.lastTurnEnd`，缺时看 `subagentTiming`，
 * 都没有 = unavailable（不把「不知道」当「已完成」）；标签回落 `displayTitle → catalog.label → id 前 8 位`；
 * child 按 `createdAt` 再按 id 稳定排序。
 * 不证明：真会话日志的投影时序（那在 host/delegation 与真入口冒烟）。
 */
import { describe, expect, it } from 'vitest'
import { buildDelegationTree } from '../../../packages/company-pack/src/lib/delegation/delegation-tree.ts'

describe('委派树折算', () => {
  it('root 不在快照里返回空树', () => {
    expect(buildDelegationTree({ byId: {} }, 'root')).toEqual({ root: null, nodes: [], maxDepth: 0 })
  })

  it('catalog 与 parentId 两条来源都进树，深度与先序稳定', () => {
    const tree = buildDelegationTree({
      byId: {
        root: {
          projectionValues: {
            subagentCatalog: [
              { id: 'kid-b', label: 'B', createdAt: 2 },
              { id: 'kid-a', label: 'A', createdAt: 1 },
              { id: 'ghost', label: 'G', createdAt: 3 },
              { id: 'kid-w', label: 'W', mode: 'workflow', createdAt: 4 },
            ],
          },
        },
        'kid-a': { parentId: 'root', running: true },
        'kid-b': { parentId: 'root' },
        // catalog 里没有、只靠 parentId 发现的孙节点
        grand: { parentId: 'kid-a' },
      },
    }, 'root')
    expect(tree.maxDepth).toBe(2)
    expect(tree.nodes.map(node => node.id)).toEqual(['root', 'kid-a', 'grand', 'kid-b', 'ghost', 'kid-w'])
    expect(tree.nodes.find(node => node.id === 'kid-a')?.status).toBe('running')
    expect(tree.nodes.find(node => node.id === 'kid-b')?.status).toBe('inactive')
    expect(tree.nodes.find(node => node.id === 'grand')?.missing).toBe(false)
    expect(tree.nodes.find(node => node.id === 'ghost')?.missing).toBe(true)
    expect(tree.nodes.find(node => node.id === 'kid-a')?.label).toBe('A')
    expect(tree.nodes.find(node => node.id === 'kid-w')?.mode).toBe('workflow')
  })

  it('终态映射：host 投影优先，timing 兜底，缺证据 = unavailable', () => {
    const cases = [
      ['completed', 'completed'],
      ['error', 'failed'],
      ['interrupted', 'interrupted'],
      ['aborted', 'aborted'],
      ['max-tokens', 'max-tokens'],
      ['refusal', 'refusal'],
      ['lost', 'lost'],
    ] as const
    for (const [lastTurnEnd, expected] of cases) {
      const tree = buildDelegationTree({ byId: { root: {}, kid: { parentId: 'root', projectionValues: { companyDelegationTerminal: { lastTurnEnd } } } } }, 'root')
      expect(tree.nodes.find(node => node.id === 'kid')?.terminal).toBe(expected)
    }
    const timingTrue = buildDelegationTree({ byId: { root: {}, kid: { parentId: 'root', projectionValues: { subagentTiming: { lastTurnCompleted: true } } } } }, 'root')
    expect(timingTrue.nodes.find(node => node.id === 'kid')?.terminal).toBe('completed')
    const timingFalse = buildDelegationTree({ byId: { root: {}, kid: { parentId: 'root', projectionValues: { subagentTiming: { lastTurnCompleted: false } } } } }, 'root')
    expect(timingFalse.nodes.find(node => node.id === 'kid')?.terminal).toBe('failed')
    const none = buildDelegationTree({ byId: { root: {}, kid: { parentId: 'root' } } }, 'root')
    expect(none.nodes.find(node => node.id === 'kid')?.terminal).toBe('unavailable')
  })

  it('标签回落与 preset/mode 取值', () => {
    const tree = buildDelegationTree({
      byId: {
        root: {},
        titled: { parentId: 'root', displayTitle: '标题优先', projectionValues: { agentPreset: 'worker' } },
        catalogued: { parentId: 'root' },
        bare: { parentId: 'root', origin: 'subagent' },
      },
    }, 'root')
    // catalog 条目只对 root 的投影生效；这里没有投影，故 catalogued 用 id 前缀。
    expect(tree.nodes.find(node => node.id === 'titled')?.label).toBe('标题优先')
    expect(tree.nodes.find(node => node.id === 'titled')?.preset).toBe('worker')
    expect(tree.nodes.find(node => node.id === 'catalogued')?.label).toBe('catalogue'.slice(0, 8))
    expect(tree.nodes.find(node => node.id === 'bare')?.mode).toBe('subagent')
  })
})
