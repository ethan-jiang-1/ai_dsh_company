// 负例留证 2026-11-10：把 sessionHeader 的缺失分支改成默认 `worker`/`0` ⇒
// 「缺首帧显式 unavailable」用例红；还原即绿。为什么：BUG-046/OBS-1 的默认值会把
// 「读不到」伪装成「读到了」，父代理与审计都会据此判错。
import { describe, expect, it } from 'vitest'
import {
  buildSessionEvidence,
  buildSessionTree,
  childLinks,
  explicitWrites,
  finalAssistantText,
  parseSessionRecords,
  promptMarkers,
  renderSessionTreeMarkdown,
  sessionHeader,
  skillCatalog,
  systemText,
  toolCatalog,
  toolCalls,
  turns,
} from '../../../tools/lib/session-evidence.mjs'

const FIXTURE = [
  '{"type":"session","version":4,"id":"child-1","createdAt":1,"cwd":"/tmp","parentSession":"root-1","origin":"subagent","delegationDepth":1,"agentPreset":"worker"}',
  '{"type":"agent-preset/selected","seq":0,"time":1,"data":{"agentPreset":"worker"}}',
  '{"type":"system/message","seq":1,"time":2,"data":{"turn":1,"step":1,"message":{"role":"system","content":[{"type":"text","text":"Company content (read-only): /x\\nWorkflow engine contract（随 pin 更新）"}]}}}',
  '{"type":"request/header","seq":2,"time":3,"data":{"header":{"tools":[{"name":"bash"},{"name":"read"},{"name":"write"},{"name":"skill"}]}}}',
  '{"type":"user/message","seq":3,"time":4,"data":{"source":{"kind":"skill-catalog","form":"catalog","entries":[{"name":"alpha"},{"name":"beta"}]}}}',
  '{"type":"tool/call","seq":4,"time":5,"data":{"turn":1,"step":1,"callId":"c1","name":"write","arguments":"{\\"file_path\\":\\"drafts/a.md\\"}"}}',
  '{"type":"tool/result","seq":5,"time":6,"data":{"turn":1,"step":1,"message":{"toolCallId":"c1","isError":false,"content":[{"type":"text","text":"ok"}]}}}',
  '{"type":"subagent/catalog","seq":6,"time":7,"data":{"childId":"grand-1","mode":"one-shot","label":"盘点"}}',
  '{"type":"turn/end","seq":7,"time":8,"data":{"turn":1,"reason":{"kind":"completed"}}}',
  '{"type":"assistant/message","seq":8,"time":9,"data":{"turn":1,"step":1,"message":{"role":"assistant","content":[{"type":"text","text":"done"}]}}}',
].join('\n')

describe('session-evidence：日志 → 可复判证据', () => {
  it('解析 JSONL 并折叠 header/tools/catalog/markers/turns/calls/writes/children', () => {
    const records = parseSessionRecords(FIXTURE)
    expect(records).toHaveLength(10)

    const evidence = buildSessionEvidence(records)
    expect(evidence.header).toMatchObject({ preset: 'worker', depth: '1', parentSession: 'root-1', missing: false })
    expect(evidence.surface.tools).toEqual(['bash', 'read', 'write', 'skill'])
    expect(evidence.surface.catalog).toEqual(['alpha', 'beta'])
    expect(evidence.surface.markers).toEqual({ handbook: true, workflowContract: true, bytes: expect.any(Number) })
    expect(evidence.turns).toEqual([{ turn: 1, reason: 'completed', at: 8 }])
    expect(evidence.calls).toEqual([expect.objectContaining({ id: 'c1', name: 'write', resultText: 'ok', isError: false, completed: true })])
    expect(evidence.writes).toEqual([{ turn: 1, tool: 'write', path: 'drafts/a.md', isError: false }])
    expect(evidence.children).toEqual([{ id: 'grand-1', kind: 'named', mode: 'one-shot', label: '盘点' }])
    expect(evidence.finalText).toBe('done')
  })

  it('缺首帧显式 unavailable，不默认 worker/0', () => {
    const evidence = buildSessionEvidence([], { id: 'known-id' })
    expect(evidence.header).toMatchObject({ preset: 'unavailable', depth: 'unavailable', missing: true })
    expect(evidence.id).toBe('known-id')
    expect(evidence.surface.tools).toEqual([])
  })

  it('session/page 的 event 包装与盘上扁平记录同形', () => {
    const wrapped = [{ seq: 1, event: { type: 'session', id: 'root', agentPreset: 'ceo', delegationDepth: 0 } }]
    expect(sessionHeader(wrapped)).toMatchObject({ preset: 'ceo', depth: '0', missing: false })
  })

  it('team member / workflow branch 的子代类型取更具体的一类', () => {
    const records = parseSessionRecords([
      '{"type":"subagent/catalog","seq":1,"data":{"childId":"c1","mode":"continuable"}}',
      '{"type":"team/member","seq":2,"data":{"member":{"id":"c1","name":"coo"}}}',
      '{"type":"tool-workflow/agent-start","seq":3,"data":{"info":{"childId":"c2"}}}',
    ].join('\n'))
    expect(childLinks(records)).toEqual([
      { id: 'c1', kind: 'member', mode: 'continuable', name: 'coo' },
      { id: 'c2', kind: 'workflow' },
    ])
  })

  it('工具辅助函数只读类型化字段；坏行不拖垮整份日志', () => {
    const records = parseSessionRecords([
      'not json',
      '{"type":"request/header","data":{"header":{"tools":[{"name":"coo"},{"name":42}]}}}',
      '{"type":"system/message","data":{"message":{"content":[{"type":"text","text":"A"}]}}}',
      '{"type":"user/message","data":{"source":{"kind":"skill-catalog","entries":[{"name":"s1"}]}}}',
      '{"type":"turn/end","data":{"reason":{"kind":"interrupted"}}}',
      '{"type":"tool/call","data":{"callId":"x","name":"edit","arguments":"{\\"file_path\\":\\"b.md\\"}"}}',
      '{"type":"assistant/message","data":{"message":{"content":[{"type":"text","text":"B"}]}}}',
    ].join('\n'))
    expect(toolCatalog(records)).toEqual(['coo'])
    expect(systemText(records)).toBe('A')
    expect(promptMarkers('A')).toEqual({ handbook: false, workflowContract: false, bytes: 1 })
    expect(skillCatalog(records)).toEqual(['s1'])
    expect(turns(records)).toEqual([{ turn: undefined, reason: 'interrupted', at: undefined }])
    const calls = toolCalls(records)
    expect(explicitWrites(calls)).toEqual([{ turn: undefined, tool: 'edit', path: 'b.md', isError: false }])
    expect(finalAssistantText(records)).toBe('B')
  })

  it('树摘要输出每行一个会话（含缺失值时不伪造）', () => {
    const root = buildSessionEvidence(parseSessionRecords(FIXTURE))
    const tree = buildSessionTree(root, [])
    const markdown = renderSessionTreeMarkdown(tree)
    expect(markdown).toContain('| session | preset | depth | tools | terminal | markers | skills |')
    expect(markdown).toContain('worker')
    expect(markdown).toContain('completed')
  })
})
