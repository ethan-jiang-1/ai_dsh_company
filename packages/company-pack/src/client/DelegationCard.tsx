/** 委派工具卡（R3）：把 `vp_eng` / `vp_sales` 的调用渲染成"给 VP 的 brief 卡"——任务进、稿子出。 */
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

/**
 * 工具名 → 汇报对象显示名。这两个 key 是 CEO preset 的**命名委托工具**
 * （`presets/ceo/agent.cordis.yml` ④，语义见 docs/delegation.md）。
 */
const ROLE_LABEL: Record<string, string> = {
  vp_eng: 'VP-Eng（研发）',
  vp_sales: 'VP-Sales（销售）',
}

/** 卡片生命周期：只从持久的 call/result 切片推导（可回放，不读活状态）。 */
export type CardState = 'running' | 'ok' | 'error' | 'stopped'

const STATE_LABEL: Record<CardState, string> = {
  running: '等 VP 出稿…',
  ok: '已交稿',
  error: '委派失败',
  stopped: '已中止',
}

/** brief 的两段：`description` 是短标题，`prompt` 是完整任务（dsh-tool-subagent 的 schema 字段）。 */
export interface Brief {
  readonly title: string
  readonly prompt: string
}

/** 一张卡的全部展示事实——**纯函数产物**，keyless 单测直接断言它（不需要 DOM、不需要模型）。 */
export interface DelegationCardModel {
  readonly role: string
  readonly state: CardState
  readonly brief: Brief
  readonly output: string | null
}

/** 解析 brief；流式期间 argsRaw 可能是截断的 JSON 前缀，回退成原文（别把卡片变成空）。 */
function parseBrief(argsRaw: string): Brief {
  try {
    const parsed = JSON.parse(argsRaw) as unknown
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>
      const title = typeof record.description === 'string' ? record.description : ''
      const prompt = typeof record.prompt === 'string' ? record.prompt : ''
      if (title !== '' || prompt !== '') return { title, prompt }
    }
  } catch {
    // 截断的 JSON：原文比"（空）"有用。
  }
  return { title: '', prompt: argsRaw }
}

/** 结果正文（settled 才有）。与 ui-tool 通用行的 resultText 同构。 */
function resultText(block: ToolCallViewProps['block']): string | null {
  if (!('kind' in block)) return null
  const parts: string[] = []
  for (const item of block.content) {
    parts.push(item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  }
  if (parts.length === 0 && block.error !== undefined) parts.push(`${block.error.name}: ${block.error.code}`)
  return parts.join('\n') || null
}

/**
 * 从 wire 事实推导一张卡的全部展示内容（纯函数，可回放、可单测）。
 * @param toolName - wire 工具名（`vp_eng` / `vp_sales`）。
 * @param block - 冻结的 running call 或 settled result 节点。
 * @returns 展示模型。
 */
export function delegationCardModel(toolName: string, block: ToolCallViewProps['block']): DelegationCardModel {
  const settled = 'kind' in block
  const argsRaw = (settled ? block.call?.argsRaw : block.argsRaw) ?? ''
  const state: CardState = !settled
    ? 'running'
    : block.error?.code === 'interrupted'
      ? 'stopped'
      : block.isError ? 'error' : 'ok'
  return {
    role: ROLE_LABEL[toolName] ?? toolName,
    state,
    brief: parseBrief(argsRaw),
    output: resultText(block),
  }
}

/** 卡片色带：running 用中性、ok 用绿、error 用红、stopped 用黄。 */
function accent(state: CardState): string {
  switch (state) {
    case 'ok': return '#3fb950'
    case 'error': return '#e5534b'
    case 'stopped': return '#d29922'
    default: return 'rgba(128,128,128,0.6)'
  }
}

/**
 * 渲染一次命名委托：抬头是"委派 · VP-Eng"、中间是 brief、下面是 VP 交回的稿子。
 * 组件是 call/result 切片的纯函数——同一份会话日志永远渲染出同一张卡。
 * @param props - keyed toolview 载荷（`toolName` 决定汇报对象，`block` 是 call/result 节点）。
 * @returns 委派 brief 卡。
 */
export function DelegationCard({ toolName, block, inspect }: ToolCallViewProps) {
  const { role, state, brief, output } = delegationCardModel(toolName, block)
  const [expanded, setExpanded] = useState(false)
  const expandable = output !== null || brief.prompt !== ''
  const open = expanded && expandable
  const toggle = (): void => { setExpanded(value => !value) }
  const toggleFromKeyboard = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!expandable || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    toggle()
  }

  const header: ReactNode = (
    <div
      role={expandable ? 'button' : undefined}
      tabIndex={expandable ? 0 : undefined}
      aria-expanded={expandable ? open : undefined}
      onClick={expandable ? toggle : undefined}
      onKeyDown={expandable ? toggleFromKeyboard : undefined}
      style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', cursor: expandable ? 'pointer' : 'default' }}
    >
      <span style={{ color: accent(state), fontWeight: 600 }}>委派</span>
      <span style={{ fontWeight: 600 }}>{role}</span>
      <span style={{ opacity: 0.65, fontSize: '0.78rem' }}>{STATE_LABEL[state]}</span>
      <span style={{ flex: 1 }} />
      {expandable && <span style={{ opacity: 0.55, fontSize: '0.75rem' }}>{open ? '收起' : '展开'}</span>}
    </div>
  )

  return (
    <div
      data-tool={toolName}
      data-state={state}
      style={{
        borderLeft: `3px solid ${accent(state)}`,
        border: '1px solid rgba(128,128,128,0.35)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.7rem',
        margin: '0.25rem 0',
        background: 'Canvas',
        color: 'CanvasText',
        fontSize: '0.85rem',
        lineHeight: 1.5,
      }}
    >
      {header}
      <div style={{ marginTop: '0.3rem', opacity: 0.85 }}>
        {brief.title !== '' ? <div style={{ fontWeight: 500 }}>{brief.title}</div> : null}
        {open ? (
          <pre style={{ whiteSpace: 'pre-wrap', margin: '0.3rem 0 0', opacity: 0.9 }}>{brief.prompt}</pre>
        ) : null}
      </div>
      {open && output !== null ? (
        <div style={{ marginTop: '0.4rem' }}>
          <div style={{ opacity: 0.6, fontSize: '0.75rem' }}>VP 交回的稿子</div>
          <pre
            data-role="delegation-result"
            style={{ whiteSpace: 'pre-wrap', margin: '0.2rem 0 0', maxHeight: '18rem', overflow: 'auto' }}
          >
            {output}
          </pre>
        </div>
      ) : null}
      {open && inspect !== undefined ? (
        <button type="button" onClick={inspect} style={{ marginTop: '0.35rem' }}>查看轨迹</button>
      ) : null}
    </div>
  )
}
