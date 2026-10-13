/** 工作区门投影读模型（BUG-002：同 cwd × preset 双开检测，keyless 完成定义）。 */
import { describe, expect, it } from 'vitest'

/**
 * 只测 doorsFromSessions 纯函数投影（host 面 = src/index.ts 的事件监听接线 + workspace_doors
 * 工具注册，真链路归认证档 dual-ceo-probe）。2026-10-14 自 deliverables.spec.ts 尾块迁入独立
 * 文件（该文件主体守 tools/lib/deliverables.mjs，本块是唯一跨模块寄居——迁出后恢复
 * tests/company 的 <模块>.spec.ts 一一对应）。
 */

// 负例留证 2026-10-09：把 doors.ts 的 `duplicateWarning: entry.ids.length >= 2` 改成 `false`
//（= 双 CEO 静默易主，BUG-002 要防的失效）→ 本条红（2 failed）；还原 → 绿。
describe('工作区门投影——双 CEO 检测面（BUG-002 修复轮，2026-10-06）', () => {
  it('两 CEO 根会话同 cwd ⇒ duplicateWarning 行 + hasDuplicate = true', async () => {
    const { doorsFromSessions } = await import('../../packages/company-pack/src/lib/doors.ts')
    const model = doorsFromSessions([
      { sessionId: 'session-a', cwd: '/ws', agentPreset: 'ceo', running: false },
      { sessionId: 'session-b', cwd: '/ws', agentPreset: 'ceo', running: true },
    ])
    expect(model.hasDuplicate).toBe(true)
    expect(model.rows).toEqual([
      { preset: 'ceo', sessionCount: 2, sessionIds: ['session-a', 'session-b'], running: true, duplicateWarning: true },
    ])
  })

  it('每角色一门 ⇒ 无警告（multi-human 正常态）', async () => {
    const { doorsFromSessions } = await import('../../packages/company-pack/src/lib/doors.ts')
    const model = doorsFromSessions([
      { sessionId: 's1', cwd: '/ws', agentPreset: 'ceo', running: true },
      { sessionId: 's2', cwd: '/ws', agentPreset: 'cfo', running: false },
      { sessionId: 's3', cwd: '/ws', agentPreset: 'coo', running: false },
    ])
    expect(model.hasDuplicate).toBe(false)
    expect(model.rows.map(r => `${r.preset}:${r.sessionCount}:${r.duplicateWarning}`)).toEqual([
      'ceo:1:false', 'cfo:1:false', 'coo:1:false',
    ])
  })

  it('未选 preset（undefined）归入「(未选 preset)」行 ⇒ 双未选也是双门警告', async () => {
    const { doorsFromSessions } = await import('../../packages/company-pack/src/lib/doors.ts')
    const model = doorsFromSessions([
      { sessionId: 's1', cwd: '/ws', running: false },
      { sessionId: 's2', cwd: '/ws', running: false },
    ])
    expect(model.rows).toEqual([
      { preset: '(未选 preset)', sessionCount: 2, sessionIds: ['s1', 's2'], running: false, duplicateWarning: true },
    ])
  })
})
