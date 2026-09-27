/**
 * 公司页签标题组件（RFC = notes/proposed/2026-09-27-ux-tab-icons）。
 *
 * 注册面 = keyed 槽 `sidebar.right.pane.tab.title`（vendor 契约 slots.ts:73，注册可选、
 * fallback = 注册时捕获的标题文本）。**一处注册两处生效**：页签条 chip（titlesFor → TabSlot）
 * 与浮窗头（FloatLayer 的 FloatHeader 同一 renderer）都渲染这里的输出。
 *
 * 设计口诀：**琥珀喊你（要人/烧量），蓝在干活（总览/工作台），紫管机制（结构/账），绿是人心（在场/成长）。**
 * 色 = 方向（四色族 × 主/次两档），icon = 面板身份（八个独特 glyph）；只给 icon 上色
 * （tone 类挂 span、glyph 吃 currentColor），标题文字保持平台默认前景。
 * 颜色一律平台静态色相族令牌（--dsw-static-*，跨浅/深主题稳定的识别色；alias 墨色层在
 * 暗色下退化为墨/白，不可作识别色——RFC §色令牌）。
 */
import type { ReactNode } from 'react'

/** 平台 icon 组件的标准形状（照 ui-primitives 的 IconProps：size + className）。
 *  显式 `| undefined`：本仓 max-strict（exactOptionalPropertyTypes）下可选 prop 需明示可传 undefined。 */
interface GlyphProps {
  readonly size?: number | undefined
  readonly className?: string | undefined
}

/** 通用线稿骨架：16×16 视窗、1.5px 圆角描边、currentColor。 */
function Glyph({ size = 16, className, children }: GlyphProps & { readonly children: ReactNode }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      {children}
    </svg>
  )
}

/** 需要你：铃铛（注意方向·主档）。 */
export function BellGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <path d="M8 2.75C6.06 2.75 4.4 4.4 4.4 6.35c0 2.75-.9 3.7-1.5 4.4h10.2c-.6-.7-1.5-1.65-1.5-4.4C11.6 4.4 9.94 2.75 8 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.9 12.5a1.1 1.1 0 0 0 2.2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  )
}

/** 用量：半圆仪表 + 指针（注意方向·次档）。 */
export function GaugeGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <path d="M3 11.5a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 11.5 10.7 8.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.85" stroke="currentColor" strokeWidth="1.5" />
    </Glyph>
  )
}

/** 看板：2×2 圆角四格（执行方向·总览主档）。 */
export function GridGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <rect x="2.75" y="2.75" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.75" y="2.75" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.75" y="8.75" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.75" y="8.75" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </Glyph>
  )
}

/** 任务板：三列不等高看板条（执行方向·工作台次档）。 */
export function KanbanGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <rect x="2.75" y="2.75" width="3.2" height="10.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.4" y="2.75" width="3.2" height="7.2" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.05" y="2.75" width="3.2" height="8.8" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </Glyph>
  )
}

/** 依赖图：一源两汇节点连线（机制方向·结构主档）。 */
export function DagGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <circle cx="4.2" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="4.6" r="1.7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="11.4" r="1.7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.75 7.25 10.45 5.3M5.75 8.75l4.7 1.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  )
}

/** 台账：开页账本（中缝 + 行线；机制方向·账本次档）。 */
export function LedgerGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <path d="M8 4.1C6.9 3.15 5.2 2.7 2.9 2.85v8.9c2.3-.15 4 .3 5.1 1.25 1.1-.95 2.8-1.4 5.1-1.25v-8.9C10.8 2.7 9.1 3.15 8 4.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 4.1v8.9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.6 5.4l1.9.25M4.6 7.3l1.9.25M9.5 5.65l1.9-.25M9.5 7.55l1.9-.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </Glyph>
  )
}

/** 在场：双人（前全后半；人方向·在线主档）。 */
export function PeopleGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <circle cx="6.2" cy="5.4" r="1.9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.1 12.9c.45-2.4 1.6-3.6 3.1-3.6s2.65 1.2 3.1 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="6.2" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.6 12.6c-.35-1.7-1.35-2.6-2.9-2.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  )
}

/** 培养：幼苗（茎 + 两叶；人方向·成长次档）。 */
export function SproutGlyph({ size, className }: GlyphProps): ReactNode {
  return (
    <Glyph size={size} className={className}>
      <path d="M8 13.4V7.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 7.8C8 5.3 6.3 3.9 3.9 3.9c0 2.5 1.7 3.9 4.1 3.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 7.8c0-1.9 1.4-3.3 3.6-3.3 0 2.2-1.5 3.3-3.6 3.3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </Glyph>
  )
}

/** 标题组件共用骨架：icon + 文字，inline-flex（不破坏 TabTitle 的裁切量测）。 */
function TabTitle({ tone, glyph: GlyphComponent, label }: {
  readonly tone: string
  readonly glyph: (props: GlyphProps) => ReactNode
  readonly label: string
}): ReactNode {
  return (
    <span className={`wk-tab-title wk-tone-${tone}`}>
      <GlyphComponent size={13} />
      <span>{label}</span>
    </span>
  )
}

/* 八个页签的标题组件：注册在 keyed 槽 sidebar.right.pane.tab.title（key = 页签类型 id）。 */

/** 「需要你」页签标题（注意·amber-500）。 */
export function AttentionTabTitle(): ReactNode {
  return <TabTitle tone="attention" glyph={BellGlyph} label="需要你" />
}

/** 「用量」页签标题（注意·amber-400）。 */
export function BudgetTabTitle(): ReactNode {
  return <TabTitle tone="burn" glyph={GaugeGlyph} label="用量" />
}

/** 「看板」页签标题（执行·blue-600）。 */
export function BoardTabTitle(): ReactNode {
  return <TabTitle tone="overview" glyph={GridGlyph} label="看板" />
}

/** 「任务板」页签标题（执行·blue-500）。 */
export function TasksTabTitle(): ReactNode {
  return <TabTitle tone="work" glyph={KanbanGlyph} label="任务板" />
}

/** 「依赖图」页签标题（机制·deepseek-500）。 */
export function DagTabTitle(): ReactNode {
  return <TabTitle tone="structure" glyph={DagGlyph} label="依赖图" />
}

/** 「台账」页签标题（机制·deepseek-400）。 */
export function LedgerTabTitle(): ReactNode {
  return <TabTitle tone="archive" glyph={LedgerGlyph} label="台账" />
}

/** 「在场」页签标题（人·green-500）。 */
export function PresenceTabTitle(): ReactNode {
  return <TabTitle tone="people" glyph={PeopleGlyph} label="在场" />
}

/** 「培养」页签标题（人·green-400）。 */
export function CultivationTabTitle(): ReactNode {
  return <TabTitle tone="growth" glyph={SproutGlyph} label="培养" />
}
