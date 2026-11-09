import { describe, expect, it } from 'vitest'
import {
  buildDelegationTree,
  type DelegationSessionStoreLike,
  type DelegationSessionSummaryLike,
} from '../../../packages/company-pack/src/lib/delegation-tree.ts'

const store = (entries: Record<string, DelegationSessionSummaryLike>): DelegationSessionStoreLike => ({ byId: entries })

describe('delegation-tree：客户端 sessions → 只读委派树', () => {
  it('root + 两个 child + 一个 grandchild：深度 / preset / 状态 / 排序', () => {
    const tree = buildDelegationTree(store({
      root: { displayTitle: 'CEO', running: true, projectionValues: { agentPreset: 'ceo', subagentCatalog: [
        { id: 'a', label: 'worker A', mode: 'subagent', createdAt: 2 },
        { id: 'b', label: 'worker B', mode: 'subagent', createdAt: 1 },
      ] } },
      a: { parentId: 'root', origin: 'subagent', running: true, projectionValues: { agentPreset: 'worker', subagentCatalog: [
        { id: 'a1', label: 'grandchild', mode: 'subagent' },
      ] } },
      b: { parentId: 'root', origin: 'subagent', running: false, projectionValues: { agentPreset: 'worker' } },
      a1: { parentId: 'a', origin: 'subagent', running: true, projectionValues: { agentPreset: 'worker' } },
    }), 'root')

    expect(tree.root?.label).toBe('CEO')
    expect(tree.nodes.map(node => node.id)).toEqual(['root', 'b', 'a', 'a1'])
    expect(tree.nodes.map(node => node.depth)).toEqual([0, 1, 1, 2])
    expect(tree.maxDepth).toBe(2)
    expect(tree.nodes.find(node => node.id === 'a')?.preset).toBe('worker')
    expect(tree.nodes.find(node => node.id === 'a1')?.status).toBe('running')
    expect(tree.nodes.find(node => node.id === 'b')?.status).toBe('inactive')
    expect(tree.nodes.every(node => node.terminal === 'unavailable')).toBe(true)
  })

  it('catalog 里有、byId 里没有的 child：仍进树，标 missing/unknown，不静默丢', () => {
    const tree = buildDelegationTree(store({
      root: { displayTitle: 'Lead', projectionValues: { subagentCatalog: [{ id: 'gone', label: '回收的 worker', mode: 'subagent' }] } },
    }), 'root')
    const child = tree.root?.children[0]
    expect(child?.id).toBe('gone')
    expect(child?.missing).toBe(true)
    expect(child?.status).toBe('unknown')
    expect(child?.label).toBe('回收的 worker')
  })

  it('byId 有 parentId、catalog 缺条目：也进树（catalog 迟到/缺条目的兜底）', () => {
    const tree = buildDelegationTree(store({
      root: { displayTitle: 'Lead' },
      orphan: { parentId: 'root', origin: 'subagent', running: false },
    }), 'root')
    expect(tree.root?.children.map(node => node.id)).toEqual(['orphan'])
    expect(tree.root?.children[0]?.mode).toBe('subagent')
  })

  it('环路不重复/不递归：两节点互为父子时只各出现一次', () => {
    const tree = buildDelegationTree(store({
      root: { displayTitle: 'Lead', projectionValues: { subagentCatalog: [{ id: 'a', mode: 'subagent' }] } },
      a: { parentId: 'root', origin: 'subagent', projectionValues: { subagentCatalog: [{ id: 'root', mode: 'subagent' }] } },
    }), 'root')
    expect(tree.nodes.map(node => node.id)).toEqual(['root', 'a'])
    expect(tree.maxDepth).toBe(1)
  })

  it('subagentTiming：completed/failed 进 terminal，缺时 unavailable', () => {
    const tree = buildDelegationTree(store({
      root: { displayTitle: 'Lead', projectionValues: { subagentCatalog: [
        { id: 'done', mode: 'continuable' },
        { id: 'failed', mode: 'continuable' },
        { id: 'unknown', mode: 'one-shot' },
      ] } },
      done: { parentId: 'root', origin: 'subagent', projectionValues: { subagentTiming: { lastTurnCompleted: true } } },
      failed: { parentId: 'root', origin: 'subagent', projectionValues: { subagentTiming: { lastTurnCompleted: false } } },
      unknown: { parentId: 'root', origin: 'subagent' },
    }), 'root')
    expect(tree.nodes.find(node => node.id === 'done')?.terminal).toBe('completed')
    expect(tree.nodes.find(node => node.id === 'failed')?.terminal).toBe('failed')
    expect(tree.nodes.find(node => node.id === 'unknown')?.terminal).toBe('unavailable')
  })

  it('host companyDelegationTerminal 投影：精确 interrupted/aborted 进 terminal', () => {
    const tree = buildDelegationTree(store({
      root: { displayTitle: 'Lead', projectionValues: { subagentCatalog: [{ id: 'int', mode: 'continuable' }, { id: 'abort', mode: 'continuable' }] } },
      int: { parentId: 'root', origin: 'subagent', projectionValues: { companyDelegationTerminal: { lastTurnEnd: 'interrupted' } } },
      abort: { parentId: 'root', origin: 'subagent', projectionValues: { companyDelegationTerminal: { lastTurnEnd: 'aborted' } } },
    }), 'root')
    expect(tree.nodes.find(node => node.id === 'int')?.terminal).toBe('interrupted')
    expect(tree.nodes.find(node => node.id === 'abort')?.terminal).toBe('aborted')
  })

  it('root 不在快照：root=null、nodes 空', () => {
    expect(buildDelegationTree({ byId: {} }, 'root')).toEqual({ root: null, nodes: [], maxDepth: 0 })
  })

  it('CEO 长链：CEO(0)→VP-Eng(1)→workflow 分支(2)→worker(3)，depth 3 可达', () => {
    const tree = buildDelegationTree(store({
      ceo: { displayTitle: 'CEO', projectionValues: { agentPreset: 'ceo', subagentCatalog: [{ id: 'vp', label: 'VP-Eng', mode: 'subagent' }] } },
      vp: { parentId: 'ceo', origin: 'subagent', projectionValues: { agentPreset: 'vp-eng', subagentCatalog: [{ id: 'branch', label: 'workflow 分支', mode: 'subagent' }] } },
      branch: { parentId: 'vp', origin: 'subagent', projectionValues: { agentPreset: 'vp-eng', subagentCatalog: [{ id: 'worker', label: 'worker', mode: 'subagent' }] } },
      worker: { parentId: 'branch', origin: 'subagent', projectionValues: { agentPreset: 'worker' } },
    }), 'ceo')
    expect(tree.nodes.map(node => node.id)).toEqual(['ceo', 'vp', 'branch', 'worker'])
    expect(tree.nodes.map(node => node.depth)).toEqual([0, 1, 2, 3])
    expect(tree.nodes.map(node => node.preset)).toEqual(['ceo', 'vp-eng', 'vp-eng', 'worker'])
    expect(tree.maxDepth).toBe(3)
  })

  it('VP-Eng 长链：VP-Eng(0)→workflow 分支(1)→worker(2)', () => {
    const tree = buildDelegationTree(store({
      vp: { displayTitle: 'VP-Eng', projectionValues: { agentPreset: 'vp-eng', subagentCatalog: [{ id: 'branch', label: 'workflow 分支', mode: 'subagent' }] } },
      branch: { parentId: 'vp', origin: 'subagent', projectionValues: { agentPreset: 'vp-eng', subagentCatalog: [{ id: 'worker', label: 'worker', mode: 'subagent' }] } },
      worker: { parentId: 'branch', origin: 'subagent', projectionValues: { agentPreset: 'worker' } },
    }), 'vp')
    expect(tree.nodes.map(node => node.depth)).toEqual([0, 1, 2])
    expect(tree.maxDepth).toBe(2)
  })
})
