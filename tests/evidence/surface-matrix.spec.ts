// 负例留证 2026-11-10：把 `control` 判据从 one-shot child 放宽到 root ⇒ support root 的团队
// 控制面被误报；把 `sessionHeader` 缺失默认成 worker/0 ⇒ unknown 用例消失。两条各自红、还原即绿。
// 负例留证 2026-11-10：删掉 worker leaf 的 control 判据 ⇒「worker leaf 出现 control」用例红（BUG-052 回归）。
// 为什么：root=Lead 是引擎事实（cordis.patch.yml overlay），不等于 preset 越权；缺 header 必须
// 显式 unknown，不能按默认值判（BUG-046/OBS-1 同型）。
import { describe, expect, it } from 'vitest'
import {
  entryKind,
  matrixRows,
  observationOf,
  observationProblems,
  surfaceProblems,
} from '../../tools/lib/surface-matrix.mjs'

const base = (overrides = {}) => ({
  id: 's-1',
  preset: 'coo',
  depth: '1',
  entry: 'child',
  tools: [],
  markers: { handbook: true, workflowContract: false, bytes: 0 },
  catalog: [],
  expectedSkills: [],
  ...overrides,
})

const teamTools = [
  'spawn_teammate', 'wait_agent',
  'team_task_create', 'team_task_get', 'team_task_list', 'team_task_update',
  'list_agents', 'send_message', 'interrupt_agent',
]

describe('surface-matrix：声明面 ↔ 运行时面', () => {
  it('entryKind：root / member / child 按父证据优先，工具面只作无父证据时的推断', () => {
    expect(entryKind({ header: { depth: '0' }, surface: { tools: [] } })).toBe('root')
    expect(entryKind({ header: { depth: '1' }, surface: { tools: teamTools } }, { linkKind: 'member' })).toBe('team-member')
    expect(entryKind({ header: { depth: '1' }, surface: { tools: [] } }, { linkKind: 'workflow' })).toBe('workflow-branch')
    expect(entryKind({ header: { depth: '1' }, surface: { tools: [] } }, { linkKind: 'named' })).toBe('child')
    expect(entryKind({ header: { missing: true }, surface: { tools: [] } })).toBe('unknown')
  })

  it('CEO root：五命名行 + 团队协作面，无 generic/workflow/retry', () => {
    const observation = base({
      preset: 'ceo',
      depth: '0',
      entry: 'root',
      tools: ['vp_eng', 'vp_sales', 'vp_cmo', 'coo', 'cfo', 'subagent_research', ...teamTools],
    })
    expect(observationProblems(observation)).toEqual([])
  })

  it('coo named child：preset 通道 + control，无团队工具', () => {
    const observation = base({
      preset: 'coo',
      tools: ['subagent', 'subagent_fork', 'subagent_retry', 'list_subagents', 'send_to_subagent', 'bash', 'read'],
    })
    expect(observationProblems(observation)).toEqual([])
  })

  it('worker leaf：无 generic/fork/workflow/control/团队，且不注入手册', () => {
    const observation = base({
      preset: 'worker',
      tools: ['bash', 'read', 'write', 'edit', 'glob', 'grep'],
      markers: { handbook: false, workflowContract: false, bytes: 0 },
    })
    expect(observationProblems(observation)).toEqual([])
  })

  it('support root：root=Lead 的 9 个团队工具不是越权；handbook 按 skip 名单', () => {
    const observation = base({
      preset: 'quality-loop-producer',
      depth: '0',
      entry: 'root',
      tools: ['read', 'glob', ...teamTools],
      markers: { handbook: false, workflowContract: false, bytes: 0 },
    })
    expect(observationProblems(observation)).toEqual([])
  })

  it('team member：继承 Lead 组合，团队工具在场不报', () => {
    const observation = base({
      preset: 'ceo',
      entry: 'team-member',
      tools: ['vp_eng', 'vp_sales', 'vp_cmo', 'coo', 'cfo', 'subagent_research', ...teamTools],
    })
    expect(observationProblems(observation)).toEqual([])
  })

  it('红：worker leaf 出现 control，报 BUG-052 同型', () => {
    const observation = base({ preset: 'worker', tools: ['bash', 'list_subagents'] })
    expect(observationProblems(observation).join('\n')).toContain('control 工具')
  })

  it('红：verifier 出现 write，只读手不成立', () => {
    const observation = base({
      preset: 'quality-loop-verifier',
      tools: ['read', 'write'],
      markers: { handbook: false, workflowContract: false, bytes: 0 },
    })
    expect(observationProblems(observation).join('\n')).toContain('只读 preset 出现写/跑工具')
  })

  it('红：CEO root 缺 coo，五汇报线没挂上', () => {
    const observation = base({
      preset: 'ceo',
      depth: '0',
      entry: 'root',
      tools: ['vp_eng', 'vp_sales', 'vp_cmo', 'cfo', 'subagent_research', ...teamTools],
    })
    expect(observationProblems(observation).join('\n')).toContain('缺命名委托行 coo')
  })

  it('红：worker 被注入 handbook，skip 名单失效', () => {
    const observation = base({ preset: 'worker', tools: ['bash'], markers: { handbook: true, workflowContract: false, bytes: 1 } })
    expect(observationProblems(observation).join('\n')).toContain('handbook=true')
  })

  it('红：one-shot child 出现 spawn_teammate，per-agent 组合被污染', () => {
    const observation = base({ preset: 'coo', tools: ['subagent', 'subagent_fork', 'subagent_retry', 'list_subagents', 'send_to_subagent', 'spawn_teammate'] })
    expect(observationProblems(observation).join('\n')).toContain('团队协作工具')
  })

  it('红：workflow 工具在但合同不在（或反之）', () => {
    const observation = base({
      preset: 'vp-eng',
      tools: ['subagent', 'subagent_fork', 'subagent_retry', 'workflow', 'list_subagents', 'send_to_subagent'],
      markers: { handbook: true, workflowContract: false, bytes: 1 },
    })
    expect(observationProblems(observation).join('\n')).toContain('workflow 合同')
  })

  it('红：catalog 缺声明 skill；多出来的方法不报', () => {
    const observation = base({
      preset: 'coo',
      tools: ['subagent', 'subagent_fork', 'subagent_retry', 'list_subagents', 'send_to_subagent'],
      catalog: ['ops-feasibility', 'adopted-method'],
      expectedSkills: ['ops-feasibility', 'budget-check'],
    })
    const problems = observationProblems(observation).join('\n')
    expect(problems).toContain('skill catalog 缺 budget-check')
    expect(problems).not.toContain('adopted-method')
  })

  it('observationOf / surfaceProblems / matrixRows 形状', () => {
    const evidence = {
      id: 'abc',
      header: { preset: 'worker', depth: '1', missing: false },
      surface: { tools: ['bash'], markers: { handbook: false, workflowContract: false }, catalog: [] },
    }
    const observation = observationOf(evidence, { entry: 'child', expectedSkills: [] })
    expect(observation).toMatchObject({ id: 'abc', preset: 'worker', entry: 'child', depth: '1' })
    expect(surfaceProblems([observation])).toEqual([])
    expect(matrixRows([observation])).toEqual([expect.objectContaining({ preset: 'worker', tools: 1, team: 0, control: 0 })])
  })
})
