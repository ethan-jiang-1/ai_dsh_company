/**
 * 委派流程面板（只读）：把 `delegation-tree` 的节点列表渲染到现有 DagTab 体内。
 *
 * 为什么不是新页签：九页签目录/金样/注册面是硬契约（加第十页签要动五处）；DagTab 体内加区
 * 既免费拿到浮出/split，又不破坏现有目录。为什么不是新 SVG：第一版用现有 `StateDot`/`Tag`
 * + 缩进列表，信息密度够、可访问性好；等需要边/连线再复用 DagPanel 的 SVG 纪律。
 *
 * 边界：客户端只读 `sessions.byId` + `subagentCatalog` + host `companyDelegationTerminal` 投影；
 * 有投影才显示精确终态；缺数据标 missing，不伪造 completed/interrupted/lost。
 */
import { StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DelegationNode, DelegationTree } from '../../lib/delegation-tree.ts'
import { StateNote } from './company-panels.tsx'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'

const defaultT = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = zh[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

function stateOf(node: DelegationNode): 'ongoing' | 'idle' | 'warning' {
  if (node.missing || node.status === 'unknown') return 'warning'
  return node.status === 'running' ? 'ongoing' : 'idle'
}

/**
 * 委派流程面板。
 * @param props.tree - 由 `buildDelegationTree` 折好的只读树。
 * @returns 面板；根缺席时给空态。
 */
export function DelegationFlowPanel({ tree, t = defaultT }: { readonly tree: DelegationTree; readonly t?: CompanyT }) {
  if (tree.root === null) return <StateNote text={t('delegationFlow.empty')} />
  return (
    <section className="wk-delegation-flow" aria-label={t('delegationFlow.aria')} data-company-delegation="flow">
      <div className="wk-delegation-flow-head">
        <strong>{t('delegationFlow.title')}</strong>
        <span className="wk-meta">{t('delegationFlow.meta', { nodes: tree.nodes.length, depth: tree.maxDepth })}</span>
        <span className="wk-meta">{t('delegationFlow.source')}</span>
      </div>
      <ol className="wk-delegation-flow-list">
        {tree.nodes.map(node => (
          <li
            className="wk-delegation-flow-row"
            key={node.id}
            data-depth={node.depth}
            data-status={node.status}
            title={node.id}
          >
            {Array.from({ length: node.depth }, (_, index) => (
              <span
                key={`branch-${String(index)}`}
                className="wk-delegation-flow-branch"
                data-last={index === node.depth - 1 ? 'true' : undefined}
                aria-hidden="true"
              />
            ))}
            <StateDot state={stateOf(node)} />
            <span className="wk-delegation-flow-label">{node.label}</span>
            {node.preset !== null && <Tag tone="info">{node.preset}</Tag>}
            {node.mode !== null && <Tag tone="outline">{node.mode}</Tag>}
            <span className="wk-delegation-flow-depth">d{node.depth}</span>
            {node.terminal === 'completed' && <Tag tone="success">{t('delegationFlow.terminal.completed')}</Tag>}
            {node.terminal === 'failed' && <Tag tone="warning">{t('delegationFlow.terminal.failed')}</Tag>}
            {node.terminal === 'interrupted' && <Tag tone="warning">{t('delegationFlow.terminal.interrupted')}</Tag>}
            {node.terminal === 'aborted' && <Tag tone="warning">{t('delegationFlow.terminal.aborted')}</Tag>}
            {node.terminal === 'max-tokens' && <Tag tone="warning">{t('delegationFlow.terminal.max-tokens')}</Tag>}
            {node.terminal === 'refusal' && <Tag tone="danger">{t('delegationFlow.terminal.refusal')}</Tag>}
            {node.terminal === 'lost' && <Tag tone="danger">{t('delegationFlow.terminal.lost')}</Tag>}
            {node.missing && <Tag tone="warning">missing</Tag>}
          </li>
        ))}
      </ol>
    </section>
  )
}
