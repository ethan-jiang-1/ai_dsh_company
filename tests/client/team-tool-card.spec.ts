/** 团队工具卡（S2 keyless：纯函数视图模型 + 与官方工具名的防漂移守卫）。 */
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TEAM_TOOL_KEYS, TeamToolCard, teamCardModel } from '../../packages/company-pack/src/client/TeamToolCard.tsx'

type Block = Parameters<typeof teamCardModel>[1]

const running = (name: string, argsRaw: string): Block => ({
  callId: 'call-1', name, argsRaw, turn: 1, step: 1, time: 0, subCalls: [],
} as unknown as Block)

const settled = (name: string, argsRaw: string, text: string): Block => ({
  kind: 'tool-result',
  seq: 1,
  time: 0,
  callId: 'call-1',
  call: { name, argsRaw },
  callTime: 0,
  content: [{ type: 'text', text }],
  isError: false,
  subCalls: [],
} as unknown as Block)

describe('团队工具卡（S2 keyless：纯函数视图模型）', () => {
  it('spawn_teammate：抬头「派活 · <成员名>」，细节取 description', () => {
    const args = JSON.stringify({ name: 'vp-eng', description: '技术可行性', prompt: '完整任务正文' })
    const model = teamCardModel('spawn_teammate', running('spawn_teammate', args))
    expect(model.title).toBe('派活 · vp-eng')
    expect(model.detail).toBe('技术可行性')
    expect(model.state).toBe('running')
    expect(model.output).toBeNull()
  })

  it('send_message：抬头「发消息 · → <目标>」，细节是消息正文', () => {
    const args = JSON.stringify({ target: 'coo', message: '请核承接' })
    const model = teamCardModel('send_message', running('send_message', args))
    expect(model.title).toBe('发消息 · → coo')
    expect(model.detail).toBe('请核承接')
  })

  it('team_task_create：抬头带任务标题，细节列依赖', () => {
    const args = JSON.stringify({ subject: '定价结论', description: '全文', blocked_by: ['task-1', 'task-2'] })
    const model = teamCardModel('team_task_create', running('team_task_create', args))
    expect(model.title).toBe('建任务 · 定价结论')
    expect(model.detail).toBe('依赖 task-1、task-2')
  })

  it('team_task_update：抬头带 task_id 与 action，细节是改派目标', () => {
    const args = JSON.stringify({ task_id: 'task-3', expected_revision: 2, action: 'reassign', owner: 'coo' })
    const model = teamCardModel('team_task_update', running('team_task_update', args))
    expect(model.title).toBe('改任务 · task-3 reassign')
    expect(model.detail).toBe('指派 coo')
  })

  it('无参工具（list_agents / wait_agent）也有可读抬头', () => {
    expect(teamCardModel('list_agents', running('list_agents', '{}')).title).toBe('看名册')
    expect(teamCardModel('wait_agent', running('wait_agent', '{}')).title).toBe('等成员收工')
  })

  it('截断的入参 JSON 不炸：抬头退回工具名、不抛', () => {
    const model = teamCardModel('send_message', running('send_message', '{"target":"co'))
    expect(model.title).toBe('发消息 · → 成员')
    expect(model.detail).toBeNull()
  })

  it('settled：状态 ok 且结果正文可读', () => {
    const model = teamCardModel('team_task_list', settled('team_task_list', '{}', 'task-1 待办 / task-2 进行中'))
    expect(model.state).toBe('ok')
    expect(model.output).toBe('task-1 待办 / task-2 进行中')
  })

  it('组件能静态渲染出抬头文案（不需要浏览器）', () => {
    const html = renderToStaticMarkup(createElement(TeamToolCard, {
      toolName: 'spawn_teammate',
      block: running('spawn_teammate', JSON.stringify({ name: 'vp-sales', description: '市场与定价' })),
    } as Parameters<typeof TeamToolCard>[0]))
    expect(html).toContain('派活 · vp-sales')
    expect(html).toContain('市场与定价')
    expect(html).toContain('data-tool="spawn_teammate"')
  })
})

describe('TEAM_TOOL_KEYS 与 vendor 工具注册名同源（防漂移）', () => {
  it('每个 key 都在 tool-agent-team 的注册表里逐字出现', () => {
    const source = readFileSync(
      join(ROOT, 'vendor', 'dsh', 'packages', 'experimental', 'tool-agent-team', 'src', 'index.ts'),
      'utf8',
    )
    for (const key of TEAM_TOOL_KEYS) {
      expect(source.includes(`name: '${key}'`), `vendor 里没有工具 ${key}（keyed key 拼错不会报错、只是永不渲染）`).toBe(true)
    }
  })
})
