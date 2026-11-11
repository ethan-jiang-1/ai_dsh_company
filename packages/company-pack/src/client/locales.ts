/**
 * Company Web UI 的 typed 字典（Phase A1 起）。
 *
 * 规则：任何 company 自有 UI 文案都必须住这里，zh/en 成对；组件不写中文字面量。
 * 注意：`packages/company-pack/locale/*.json` 是 DSH 包展示元数据（Plugin Manager/market 的
 * `meta.title`/`meta.description`），不是运行时 UI 字典；运行时文案只住本文件。
 * `zh` 是 key 源；`en` 用 `Record<CompanyKey, string>` 编译期强制完整。
 * 命名空间 `company` 通过 declaration merge 合进 ui-slots 的 LocaleNamespaceMap，
 * 这样 `ctx.locale.register(NS, { zh, en })` 和 slot 的 `locale: NS` 都是 typed 的。
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'

export const COMPANY_NS = 'company'

/** 简体中文（key 源）。 */
export const zh = {
  'brand.name': 'DSH 梦之队',
  'view.cultivation': '培养',

  'tabs.attention.label': '待办',
  'tabs.attention.tooltip': '「分身做不了的事」收件箱——待批审批 / 待答问询 / 升级 / 完成通知',
  'tabs.attention.description': '人的待办收件箱：待批审批 / 待答问询 / 升级 + 完成通知',
  'tabs.board.label': '看板',
  'tabs.board.tooltip': '任务推进全景：每张卡到哪一步（owner / 依赖 / 修订号），投影更新',
  'tabs.board.description': '任务看板：活到哪一步（owner / 依赖 / 修订号）',
  'tabs.dag.label': '依赖图',
  'tabs.dag.tooltip': '任务依赖关系：谁等谁出稿、关键路径在哪',
  'tabs.dag.description': '任务依赖图：谁依赖谁、关键路径',
  'tabs.presence.label': '在场',
  'tabs.presence.tooltip': '谁在忙、忙什么——点行进成员空间；下方是流式协作动态',
  'tabs.presence.description': '组织在场板：谁在忙、忙什么；点行进成员空间',
  'tabs.budget.label': '用量',
  'tabs.budget.tooltip': '令牌用量与占比（只做令牌，不做美元）',
  'tabs.budget.description': '令牌用量与占比（只做令牌，不做美元）',
  'tabs.tasks.label': '任务板',
  'tabs.tasks.tooltip': '共享任务表：状态 / owner / 依赖 / 修订号一屏看全',
  'tabs.tasks.description': '共享任务表：状态 / owner / 依赖 / 修订号',
  'tabs.cultivation.label': '培养',
  'tabs.cultivation.tooltip': '分身成长线：journal 待审收件箱 + 人审提升（只采纳有证据的）',
  'tabs.cultivation.description': '养自己的角色分身：待处理建议 / 已采纳方法 / journal 待审 / 赞踩',
  'tabs.ledger.label': '台账',
  'tabs.ledger.tooltip': '公司大事记：每场动议的日期 / 类型 / 参与 / 成品 / 结论',
  'tabs.ledger.description': '动议台账：公司累计干了什么（日期/类型/参与/成品/结论）',
  'tabs.catalog.label': '成品',
  'tabs.catalog.tooltip': '公司成品目录：按 final.md 列成品（日期 / 类型 / 结果 / 一句话结论）；静态索引，生成后重读',
  'tabs.catalog.description': '公司成品目录：按 final.md 列成品（日期/类型/结果/结论）',
} as const

/** 本命名空间的 key 联合。 */
export type CompanyKey = keyof typeof zh

/** 公司 locale 的 translate 函数类型（`t` seat / bind 同形）。 */
export type CompanyT = TranslateNS<'company'>

/** English，编译期按 zh 的 key 集校验完整。 */
export const en: Record<CompanyKey, string> = {
  'brand.name': 'DSH Dream Team',
  'view.cultivation': 'Cultivation',

  'tabs.attention.label': 'Inbox',
  'tabs.attention.tooltip': 'Inbox for things your agents cannot do: approvals, questions, escalations, completion notices',
  'tabs.attention.description': 'Your pending inbox: approvals / questions / escalations + completion notices',
  'tabs.board.label': 'Board',
  'tabs.board.tooltip': 'Mission progress at a glance: where each card stands (owner / dependencies / revision)',
  'tabs.board.description': 'Task board: where work stands (owner / dependencies / revision)',
  'tabs.dag.label': 'Dependencies',
  'tabs.dag.tooltip': 'Task dependencies: who is waiting on whom, and where the critical path runs',
  'tabs.dag.description': 'Task dependency graph: who depends on whom and the critical path',
  'tabs.presence.label': 'Presence',
  'tabs.presence.tooltip': 'Who is busy and on what — click a row to open that member\'s space; live activity below',
  'tabs.presence.description': 'Organization presence: who is busy with what; click a row to enter a member\'s space',
  'tabs.budget.label': 'Usage',
  'tabs.budget.tooltip': 'Token usage and share (tokens only, no dollars)',
  'tabs.budget.description': 'Token usage and share (tokens only, no dollars)',
  'tabs.tasks.label': 'Tasks',
  'tabs.tasks.tooltip': 'Shared task table: status / owner / dependencies / revision in one view',
  'tabs.tasks.description': 'Shared task table: status / owner / dependencies / revision',
  'tabs.cultivation.label': 'Cultivation',
  'tabs.cultivation.tooltip': 'Your role\'s growth: journal review inbox + human-approved practices (evidence only)',
  'tabs.cultivation.description': 'Grow your role\'s double: pending suggestions / adopted practices / journal review / feedback',
  'tabs.ledger.label': 'Ledger',
  'tabs.ledger.tooltip': 'Company history: date / type / participants / deliverable / conclusion for each motion',
  'tabs.ledger.description': 'Motion ledger: what the company has done (date / type / participants / deliverable / conclusion)',
  'tabs.catalog.label': 'Deliverables',
  'tabs.catalog.tooltip': 'Company deliverable catalog: final.md entries (date / type / result / one-line conclusion); static index, reread after generation',
  'tabs.catalog.description': 'Company deliverable catalog: list by final.md (date / type / result / conclusion)',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Company Web UI copy. */
    company: CompanyKey
  }
}
