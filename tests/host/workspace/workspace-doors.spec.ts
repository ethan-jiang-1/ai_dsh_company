/**
 * `workspace_doors` 工具与门投影接线（2026-11-03 第六轮 F 批）。
 *
 * 为什么补：`src/host/workspace/workspace-doors.ts`（87 行，BUG-002 的双 CEO 检测面）此前只在
 * `host-composition.spec.ts` 里被**点名**（工具名在场），行为没有直接判据；`tests/lib/doors.spec.ts`
 * 只测纯函数 `doorsFromSessions`。本 spec 把「会话事件 → 进程内事实表 → 工具按当前 cwd 过滤 → 输出
 * preset 行与 duplicateWarning」整条接线钉住。
 *
 * 证明不了：真实 DSH 会话事件（类型由 vendor 声明，这里注入最小形状）；跨进程（DSH_HOME 维度不在本层）。
 *
 * 负例留证 2026-11-03：删掉 `workspace-doors.ts` 的 `if (summary.origin === 'subagent') return`（只追根会话）
 *   → `× subagent 会话不进门投影（只追根会话）` 红（委派 child 被当成第二扇 CEO 门）；还原 → 4 passed。
 */
import { describe, expect, it } from 'vitest'
import { registerWorkspaceDoors } from '../../../packages/company-pack/src/host/workspace/workspace-doors.ts'

// 负例留证 2026-11-03：删掉 workspace-doors.ts 的 `if (summary.origin === 'subagent') return`（BUG-002 只追根会话）
// → 「subagent 会话不进门投影」用例红（委派 child 被当成第二扇 CEO 门）；还原 → 4 passed。

type Listener = (...args: unknown[]) => void

/** 最小 ctx：收集事件监听与注册的工具；工具定义原样交回给测试调用。 */
function fakeCtx() {
  const listeners = new Map<string, Listener[]>()
  const tools: { name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }[] = []
  const ctx = {
    on: (event: string, listener: Listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    },
    tools: {
      register: (tool: { name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }) => {
        tools.push(tool)
        return () => {}
      },
    },
  }
  const emit = (event: string, ...args: unknown[]) => {
    for (const listener of listeners.get(event) ?? []) listener(...args)
  }
  return { ctx, emit, tools }
}

/** 根会话事实的最小 SessionSummary 形状（只填 workspace-doors 读的字段）。 */
const added = (sessionId: string, cwd: string, preset?: string, options: { origin?: string; running?: boolean } = {}) => ({
  sessionId,
  cwd,
  origin: options.origin ?? 'user',
  running: options.running ?? true,
  projections: { values: preset === undefined ? {} : { agentPreset: preset } },
})

/** 工具执行时的 agent 上下文（只读 session.header.cwd）。 */
const execFor = (cwd: string) => ({ agent: { session: { header: { cwd } } } })

describe('workspace_doors 接线（BUG-002 双 CEO 检测面）', () => {
  it('同 cwd 同 preset 两个根会话 → duplicateWarning；另一 preset 单独一行；其它 cwd 被过滤', async () => {
    const { ctx, emit, tools } = fakeCtx()
    registerWorkspaceDoors(ctx as never)
    emit('api-session/added', added('s1', '/ws/a', 'ceo'))
    emit('api-session/added', added('s2', '/ws/a', 'ceo'))
    emit('api-session/added', added('s3', '/ws/a', 'vp-eng'))
    emit('api-session/added', added('s4', '/ws/other', 'cfo'))

    const value = await tools[0]!.execute({}, execFor('/ws/a')) as {
      hasDuplicate: boolean
      rows: { preset: string; sessionCount: number; duplicateWarning: boolean }[]
    }
    expect(value.hasDuplicate).toBe(true)
    expect(value.rows).toEqual([
      { preset: 'ceo', sessionCount: 2, duplicateWarning: true },
      { preset: 'vp-eng', sessionCount: 1, duplicateWarning: false },
    ])
    expect(value.rows.map(row => row.preset), '其它 cwd 的 cfo 门不得混进来').not.toContain('cfo')
  })

  it('subagent 会话不进门投影（只追根会话）', async () => {
    const { ctx, emit, tools } = fakeCtx()
    registerWorkspaceDoors(ctx as never)
    emit('api-session/added', added('s1', '/ws/a', 'ceo'))
    emit('api-session/added', added('child-1', '/ws/a', 'ceo', { origin: 'subagent' }))
    const value = await tools[0]!.execute({}, execFor('/ws/a')) as { hasDuplicate: boolean; rows: { sessionCount: number }[] }
    expect(value.hasDuplicate, '委派 child 不计入双门').toBe(false)
    expect(value.rows[0]?.sessionCount).toBe(1)
  })

  it('会话移除后不再计入；未选 preset 的根会话归到显式占位行', async () => {
    const { ctx, emit, tools } = fakeCtx()
    registerWorkspaceDoors(ctx as never)
    emit('api-session/added', added('s1', '/ws/a', 'ceo'))
    emit('api-session/added', added('s2', '/ws/a'))
    emit('api-session/removed', 's1')
    const value = await tools[0]!.execute({}, execFor('/ws/a')) as { rows: { preset: string; sessionCount: number }[] }
    expect(value.rows).toEqual([{ preset: '(未选 preset)', sessionCount: 1, duplicateWarning: false }])
  })

  it('没有当前 agent（无 cwd 语境）→ 空投影，不猜', async () => {
    const { ctx, emit, tools } = fakeCtx()
    registerWorkspaceDoors(ctx as never)
    emit('api-session/added', added('s1', '/ws/a', 'ceo'))
    const value = await tools[0]!.execute({}, {}) as { hasDuplicate: boolean; rows: unknown[] }
    expect(value).toEqual({ hasDuplicate: false, rows: [] })
  })
})
