/** 委派工具卡（R3，S2 令牌化）：把 `vp_eng` / `vp_sales` 的调用渲染成"给 VP 的 brief 卡"——任务进、稿子出。 */
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { cardStateOf, parseArgsObject, resultTextOf, textOf, type CardState } from '../lib/tool-card.ts'

/**
 * 工具名 → 汇报对象显示名。这两个 key 是 CEO preset 的**命名委托工具**
 * （`presets/ceo/agent.cordis.yml` ④，语义见 docs/delegation.md）。
 */
const ROLE_LABEL: Record<string, string> = {
  vp_eng: 'VP-Eng（研发）',
  vp_sales: 'VP-Sales（销售）',
}

/** 卡片生命周期（S2 起与团队工具卡共用同一实现，见 `lib/tool-card.ts`）。 */
export type { CardState }

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
  const parsed = parseArgsObject(argsRaw)
  if (parsed !== null) {
    const title = textOf(parsed, 'description')
    const prompt = textOf(parsed, 'prompt')
    if (title !== '' || prompt !== '') return { title, prompt }
  }
  // 截断的 JSON：原文比"（空）"有用。
  return { title: '', prompt: argsRaw }
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
  return {
    role: ROLE_LABEL[toolName] ?? toolName,
    state: cardStateOf(block),
    brief: parseBrief(argsRaw),
    output: resultTextOf(block),
  }
}

/**
 * 渲染一次命名委托：抬头是"委派 · VP-Eng"、中间是 brief、下面是 VP 交回的稿子。
 * 组件是 call/result 切片的纯函数——同一份会话日志永远渲染出同一张卡。
 *
 * S2：状态色带改由 CSS（`.wk-delegation[data-state]` + `--dsw-alias-state-*` 令牌），
 * 「查看轨迹」从原生 `<button>` 换成官方 `Button`；**可访问名不变**（replay 金样与断言依赖它）。
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
      className="wk-delegation-head"
      role={expandable ? 'button' : undefined}
      tabIndex={expandable ? 0 : undefined}
      aria-expanded={expandable ? open : undefined}
      onClick={expandable ? toggle : undefined}
      onKeyDown={expandable ? toggleFromKeyboard : undefined}
    >
      <span className="wk-delegation-role">委派 {role}</span>
      <span className="wk-delegation-state">{STATE_LABEL[state]}</span>
      <span style={{ flex: 1 }} />
      {expandable && <span className="wk-delegation-state">{open ? '收起' : '展开'}</span>}
    </div>
  )

  return (
    <div className="wk-delegation" data-tool={toolName} data-state={state}>
      {header}
      <div className="wk-mt-xs">
        {brief.title !== '' ? <div className="wk-delegation-title">{brief.title}</div> : null}
        {open ? <pre className="wk-delegation-pre">{brief.prompt}</pre> : null}
      </div>
      {open && output !== null ? (
        <div className="wk-mt-sm">
          <div className="wk-delegation-state">VP 交回的稿子</div>
          <pre className="wk-delegation-result" data-role="delegation-result">{output}</pre>
        </div>
      ) : null}
      {open && inspect !== undefined ? (
        <div className="wk-delegation-actions">
          <Button size="sm" variant="outline" onClick={inspect}>查看轨迹</Button>
        </div>
      ) : null}
    </div>
  )
}
