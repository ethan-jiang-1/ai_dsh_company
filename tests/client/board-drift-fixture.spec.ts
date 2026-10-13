/**
 * 看板"声明 vs 板面"分叉的**视觉夹具发射器**（2026-10-13 立）：
 * 视觉认证档 `probes/browser-visual/board-drift-probe.mjs` 要"真组件 + 真 CSS"渲染出的看板，
 * 而它们只能在本仓转换链里拿到（组件 import vendor 的 UI primitives）⇒ 本测试默认只断言
 * 夹具能渲染（`pnpm test` 零副作用），设了 `BOARD_DRIFT_EMIT=<路径>` 时发射 `{ css, html }`
 * 供认证档注入真 web app（借真主题令牌）截图。
 *
 * 夹具数据 = **真事故原文**（会话 session-663ff4b6 / turn1 step9）：task-3 的依赖只写在
 * description 里，板面 blockedBy 为空；task-4 声明了依赖且已落板（假阳性对照）。
 */
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BoardPanel } from '../../packages/company-pack/src/client/company-panels.tsx'
import { boardColumns, tasksFromTeamView } from '../../packages/company-pack/src/lib/board.ts'
import type { TeamViewLike } from '../../packages/company-pack/src/lib/presence.ts'

/** 真事故板面 + 一个健康对照（task-4：声明了依赖且板面有边）。 */
export const FIXTURE_VIEW: TeamViewLike = {
  members: [
    { id: 'session-lead', name: 'lead', role: 'lead', phase: 'running' },
    { id: 'session-vp-eng', name: 'vp-eng', role: 'teammate', phase: 'running' },
  ],
  tasks: [
    { id: 'task-1', subject: 'T1 · VP-Sales：中美 token 工厂差异外化', status: 'in_progress', ownerName: 'vp-sales' },
    { id: 'task-2', subject: 'T2 · CFO：单位经济可判性', status: 'in_progress', ownerName: 'cfo' },
    {
      id: 'task-3',
      subject: 'T3 · VP-Eng：差异的技术解释与技术实现要求',
      description: '依赖 T1,T2（等它们出稿后动笔，可先做不依赖它们的部分）。',
      status: 'in_progress',
      ownerName: 'vp-eng',
    },
    {
      id: 'task-4',
      subject: 'T4 · VP-Eng：技术-事实互审',
      description: '依赖 T1,T2（已落板）。',
      status: 'pending',
      ownerName: 'vp-eng',
      blockedBy: ['task-1', 'task-2'],
    },
    { id: 'task-5', subject: 'T5 · COO：交付承接核查', status: 'completed', ownerName: 'coo' },
  ],
}

/** 从 styles.ts 源文取发布 CSS（唯一真源；与 role-mark 夹具同款读法）。 */
export function shippedCss(): string {
  const source = readFileSync(join(ROOT, 'packages', 'company-pack', 'src', 'client', 'styles.ts'), 'utf8')
  const start = source.indexOf('const CSS = `') + 'const CSS = `'.length
  return source.slice(start, source.indexOf('`', start))
}

describe('看板分叉视觉夹具', () => {
  it('渲染出事故板面（含分叉卡与对照卡），并可按 BOARD_DRIFT_EMIT 发射', () => {
    const html = renderToStaticMarkup(createElement(BoardPanel, { columns: boardColumns(tasksFromTeamView(FIXTURE_VIEW)) }))
    expect(html).toContain('声明依赖未落板：T1、T2')
    expect(html).toContain('等 task-1、task-2')
    expect(html).toContain('task-3@')
    const css = shippedCss()
    expect(css).toContain('.wk-card-subject')

    const emit = process.env.BOARD_DRIFT_EMIT
    if (emit !== undefined && emit !== '') {
      writeFileSync(emit, JSON.stringify({ css, html, note: '事故板面：task-3 声明依赖未落板 / task-4 健康对照' }), 'utf8')
    }
  })
})
