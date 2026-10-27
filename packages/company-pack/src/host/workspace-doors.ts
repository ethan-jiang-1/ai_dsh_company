/**
 * 工作区门投影 + `workspace_doors` 工具（BUG-002；2026-10-28 R4 自 `src/index.ts` 的 apply 拆出）。
 *
 * 同 cwd 的根会话 × preset 聚合；同 preset ≥2 = duplicateWarning。会话增删/运行态变化只更新
 * 进程内事实表，工具按当前 agent 的 cwd 过滤后读纯函数 `doorsFromSessions`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { doorsFromSessions } from '../lib/doors.ts'

/** 门投影需要的会话事实（api-session/added|removed|status 维护）。 */
interface DoorFact {
  readonly cwd: string
  readonly agentPreset: string | undefined
  running: boolean
}

/** 注册门投影监听与 `workspace_doors` 工具。 */
export function registerWorkspaceDoors(ctx: Context): void {
  const doorFacts = new Map<string, DoorFact>()
  ctx.on('api-session/added', (summary) => {
    if (summary.origin === 'subagent') return // 只追根会话
    doorFacts.set(String(summary.sessionId), {
      cwd: String(summary.cwd ?? ''),
      agentPreset: typeof summary.projections?.values?.agentPreset === 'string'
        ? summary.projections.values.agentPreset
        : undefined,
      running: summary.running,
    })
  })
  ctx.on('api-session/removed', (sessionId) => { doorFacts.delete(String(sessionId)) })
  ctx.on('api-session/status', (sessionId, running) => {
    const fact = doorFacts.get(String(sessionId))
    if (fact !== undefined) fact.running = running
  })

  ctx.tools.register(defineTool({
    name: 'workspace_doors',
    description: 'Show which role presets currently have root sessions (doors) open on this workspace. '
      + 'A duplicate warning means two or more sessions share the same preset — for example two CEO doors '
      + '(the default preset is ceo; forgetting to select your role creates a second CEO). '
      + 'Use this before closing a motion or presenting final.md to detect silent supersession.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          hasDuplicate: { type: 'boolean', required: true },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                preset: { type: 'string', required: true },
                sessionCount: { type: 'number', required: true },
                duplicateWarning: { type: 'boolean', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(_args, exec) {
      if (exec.agent === undefined) {
        return { hasDuplicate: false, rows: [] }
      }
      // 用当前 agent 的 cwd 过滤门投影
      const cwd = exec.agent.session?.header?.cwd ?? ''
      const facts = [...doorFacts.entries()]
        .filter(([, fact]) => fact.cwd === cwd)
        .map(([sessionId, fact]) => ({ sessionId, cwd: fact.cwd, agentPreset: fact.agentPreset, running: fact.running }))
      const model = doorsFromSessions(facts)
      return {
        hasDuplicate: model.hasDuplicate,
        rows: model.rows.map(row => ({
          preset: row.preset,
          sessionCount: row.sessionCount,
          duplicateWarning: row.duplicateWarning,
        })),
      }
    },
  }))
}
