/**
 * 团队工具卡（S2）：把 `spawn_teammate` / `send_message` / `team_task_*` 这类**团队动作**在对话流里
 * 渲染成公司语义的卡——"不讲解也能看懂"最便宜的一招（研究 §5 决策速览）。
 *
 * ⚠ keyed slot 的 key 域是开放的：拼错**不报错**，卡只是永远不出现。所以
 * `tests/client/ui/team-tool-card.spec.ts` 有一条守卫把 `TEAM_TOOL_KEYS` 与 vendor 的工具注册名钉在一起。
 */
import { joinList, listSeparator } from '../ui/list-separator.ts'
import { useState, type KeyboardEvent } from 'react'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import {
  cardStateOf,
  parseArgsObject,
  resultTextOf,
  stringListOf,
  textOf,
  type CardState,
} from '../../lib/presence/tool-card.ts'

/**
 * 官方团队工具名（`vendor/dsh/packages/experimental/tool-agent-team/src/index.ts`）——
 * `tool.call.toolview` 的 keyed key，必须与 wire 工具名逐字一致。
 */
export const TEAM_TOOL_KEYS = [
  'spawn_teammate',
  'send_message',
  'list_agents',
  'wait_agent',
  'interrupt_agent',
  'team_task_create',
  'team_task_list',
  'team_task_get',
  'team_task_update',
] as const

const STATE_KEYS: Record<CardState, CompanyKey> = {
  running: 'teamCard.running',
  ok: 'teamCard.ok',
  error: 'teamCard.error',
  stopped: 'teamCard.stopped',
}

const defaultT = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = zh[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

interface CardToken { key: CompanyKey; params?: Record<string, string> }

/** 一张团队工具卡的展示事实（纯函数产物，keyless 可测）。 */
export interface TeamCardModel {
  /** 公司语义抬头（如「派活 · vp-eng」「发消息 · → coo」）。 */
  readonly title: string
  readonly titleToken?: CardToken | undefined
  /** 次要细节（任务说明 / 消息正文 / 依赖列表）。 */
  readonly detail: string | null
  readonly detailToken?: CardToken | undefined
  /** 任务依赖 id（渲染处按语言拼分隔符）。 */
  readonly blockIds?: readonly string[]
  readonly state: CardState
  readonly output: string | null
}

/**
 * 从 wire 事实推导一张团队工具卡的展示内容（纯函数）。
 * @param toolName - wire 工具名（`TEAM_TOOL_KEYS` 之一）。
 * @param block - 冻结的 running call 或 settled result 节点。
 * @returns 展示模型。
 */
export function teamCardModel(toolName: string, block: ToolCallViewProps['block'], t: CompanyT = defaultT): TeamCardModel {
  const settled = 'kind' in block
  // rc.2：`PreparingToolCall`（参数未到）没有 `argsRaw`，只有 `StartedToolCall` 有 ⇒ 收窄后读；未到按空串。
  const source = settled ? block.call : block
  const argsRaw = (source !== undefined && source !== null && 'argsRaw' in source ? source.argsRaw : undefined) ?? ''
  const args = parseArgsObject(argsRaw)
  const name = textOf(args, 'name')
  const target = textOf(args, 'target')
  const subject = textOf(args, 'subject')
  const taskId = textOf(args, 'task_id')
  const action = textOf(args, 'action')
  const blockers = stringListOf(args, 'blocked_by')
  const owner = textOf(args, 'owner')

  let title = toolName
  let detail: string | null = null
  let titleToken: CardToken | undefined
  let detailToken: CardToken | undefined
  /** 任务依赖的 id 清单：分隔符到渲染处才按语言拼（模型是语言无关的）。 */
  let blockIds: readonly string[] = []
  switch (toolName) {
    case 'spawn_teammate':
      titleToken = name === '' ? { key: 'teamCard.spawnNew' } : { key: 'teamCard.spawn', params: { name } }
      detail = textOf(args, 'description') || textOf(args, 'prompt') || null
      break
    case 'send_message':
      titleToken = target === '' ? { key: 'teamCard.sendMember' } : { key: 'teamCard.send', params: { target } }
      detail = textOf(args, 'message') || null
      break
    case 'list_agents':
      titleToken = { key: 'teamCard.list' }
      break
    case 'wait_agent':
      titleToken = { key: 'teamCard.wait' }
      break
    case 'interrupt_agent':
      titleToken = name === '' ? { key: 'teamCard.interruptMember' } : { key: 'teamCard.interrupt', params: { name } }
      break
    case 'team_task_create':
      titleToken = subject === '' ? { key: 'teamCard.taskCreateNew' } : { key: 'teamCard.taskCreate', params: { subject } }
      // 分隔符在**渲染处**按语言取（模型层不带语言；BUG-329）。
      if (blockers.length > 0) blockIds = blockers
      break
    case 'team_task_list':
      titleToken = { key: 'teamCard.taskList' }
      break
    case 'team_task_get':
      titleToken = { key: 'teamCard.taskGet', params: { id: taskId } }
      break
    case 'team_task_update':
      titleToken = { key: 'teamCard.taskUpdate', params: { id: taskId, action: action === '' ? '' : ` ${action}` } }
      if (owner !== '') detailToken = { key: 'teamCard.taskAssign', params: { owner } }
      break
    default:
      break
  }

  if (titleToken !== undefined) title = t(titleToken.key, titleToken.params)
  if (detailToken !== undefined) detail = t(detailToken.key, detailToken.params)
  else if (blockers.length > 0) detail = t('teamCard.taskDeps', { ids: joinList(blockers, listSeparator(t)) })

  return { title, titleToken, detail, detailToken, blockIds, state: cardStateOf(block), output: resultTextOf(block) }
}

/**
 * 渲染一张团队工具卡：抬头是公司语义动作、中间是细节、下面是结果。
 * @param props - keyed toolview 载荷（`toolName` 决定抬头，`block` 是 call/result 节点）。
 * @returns 团队动作卡。
 */
export function TeamToolCard({ toolName, block, inspect, t = defaultT }: ToolCallViewProps & { readonly t?: CompanyT }) {
  const { title, titleToken, detail, detailToken, blockIds, state, output } = teamCardModel(toolName, block)
  const [expanded, setExpanded] = useState(false)
  const expandable = output !== null || (detail !== null && detail.length > 60)
  const open = expanded && expandable
  const toggle = (): void => { setExpanded(value => !value) }
  const toggleFromKeyboard = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!expandable || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    toggle()
  }

  return (
    <div className="wk-delegation" data-tool={toolName} data-state={state}>
      <div
        className="wk-delegation-head"
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={expandable ? toggle : undefined}
        onKeyDown={expandable ? toggleFromKeyboard : undefined}
      >
        <span className="wk-delegation-role">{titleToken === undefined ? title : t(titleToken.key, titleToken.params)}</span>
        <span className="wk-delegation-state">{t(STATE_KEYS[state])}</span>
        <span style={{ flex: 1 }} />
        {expandable && <span className="wk-delegation-state">{open ? t('teamCard.collapse') : t('teamCard.expand')}</span>}
      </div>
      {detail !== null && (open || detail.length <= 60)
        ? <div className="wk-delegation-title">{detailToken === undefined ? detail : t(detailToken.key, { ...detailToken.params, ids: joinList(blockIds ?? [], listSeparator(t)) })}</div>
        : null}
      {open && output !== null ? (
        <div className="wk-mt-sm">
          <div className="wk-delegation-state">{t('teamCard.result')}</div>
          <pre className="wk-delegation-result" data-role="team-tool-result">{output}</pre>
        </div>
      ) : null}
      {open && inspect !== undefined ? (
        <div className="wk-delegation-actions">
          <Button size="sm" variant="outline" onClick={inspect}>{t('teamCard.inspect')}</Button>
        </div>
      ) : null}
    </div>
  )
}
