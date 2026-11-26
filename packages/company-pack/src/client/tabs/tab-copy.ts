/**
 * 页签身份文案的 key 表与纯取用函数（Phase A2 第一片）。
 *
 * 身份键（label / tooltip / description）在这里定义；具体 zh/en 值住
 * `../locales.ts` 的 `company` 字典。`tabCopyFor(face, t)` 是组件/注册处共用的纯函数，
 * keyless spec 直接断言 zh/en 两态，不需要浏览器。
 */
import type { CompanyKey, CompanyT } from '../locales.ts'

/** 页签身份键（含 3 个聚合页签 + 原有细粒度面板分段键）。 */
export type FaceKey =
  | 'ops'
  | 'team'
  | 'archive'
  | 'attention'
  | 'board'
  | 'dag'
  | 'presence'
  | 'budget'
  | 'tasks'
  | 'cultivation'
  | 'ledger'
  | 'catalog'
  | 'strategy'

/** 一行的三处文案 key。 */
export interface TabCopyKeys {
  readonly label: CompanyKey
  readonly tooltip: CompanyKey
  readonly description: CompanyKey
}

/** face → 三处 key；新增页签 = 加一行 + 在 locales.ts 加三对 key。 */
export const TAB_COPY_KEYS: Readonly<Record<FaceKey, TabCopyKeys>> = {
  ops: { label: 'tabs.ops.label', tooltip: 'tabs.ops.tooltip', description: 'tabs.ops.description' },
  team: { label: 'tabs.team.label', tooltip: 'tabs.team.tooltip', description: 'tabs.team.description' },
  archive: { label: 'tabs.archive.label', tooltip: 'tabs.archive.tooltip', description: 'tabs.archive.description' },
  attention: { label: 'tabs.attention.label', tooltip: 'tabs.attention.tooltip', description: 'tabs.attention.description' },
  board: { label: 'tabs.board.label', tooltip: 'tabs.board.tooltip', description: 'tabs.board.description' },
  dag: { label: 'tabs.dag.label', tooltip: 'tabs.dag.tooltip', description: 'tabs.dag.description' },
  presence: { label: 'tabs.presence.label', tooltip: 'tabs.presence.tooltip', description: 'tabs.presence.description' },
  budget: { label: 'tabs.budget.label', tooltip: 'tabs.budget.tooltip', description: 'tabs.budget.description' },
  tasks: { label: 'tabs.tasks.label', tooltip: 'tabs.tasks.tooltip', description: 'tabs.tasks.description' },
  cultivation: { label: 'tabs.cultivation.label', tooltip: 'tabs.cultivation.tooltip', description: 'tabs.cultivation.description' },
  ledger: { label: 'tabs.ledger.label', tooltip: 'tabs.ledger.tooltip', description: 'tabs.ledger.description' },
  catalog: { label: 'tabs.catalog.label', tooltip: 'tabs.catalog.tooltip', description: 'tabs.catalog.description' },
  strategy: { label: 'tabs.strategy.label', tooltip: 'tabs.strategy.tooltip', description: 'tabs.strategy.description' },
}

/** 一行的当前语言文案。 */
export interface TabCopy {
  readonly label: string
  readonly tooltip: string
  readonly description: string
}

/**
 * 取一行的当前语言文案。
 * @param face - 页签身份键。
 * @param t - 当前语言 translator。
 * @returns label / tooltip / description。
 */
export function tabCopyFor(face: FaceKey, t: CompanyT): TabCopy {
  const keys = TAB_COPY_KEYS[face]
  return {
    label: t(keys.label),
    tooltip: t(keys.tooltip),
    description: t(keys.description),
  }
}
