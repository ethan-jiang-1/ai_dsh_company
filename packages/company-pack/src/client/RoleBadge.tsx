/**
 * 侧栏会话行首的角色标记（角色身份 UX · B 段，2026-09-26 立；2026-10-13 收进座位）。
 * 提案：notes/archived/2026-09-26-role-identity-ux.md §五 B。
 *
 * 挂载点 = 官方 ambient 行装饰位 `sidebar.session.row.leading`（vendor
 * `ui-workspace/contract/slots.ts:117`；仅 idle 行渲染，archived/blank 行留空）。
 *
 * ⚠ **座位是 16px 格**（合同原话 "the 16px cell before the title that the row's own state
 * dot otherwise occupies"；vendor `ui-workspace/src/client/rows/Rows.module.css` 的
 * `.slot{flex:none;width:16px;justify-content:center}`），且是 **list 座位**——同格还住着
 * 计划任务时钟图标（`data-session-schedule-mark`，12px）。B 段首版的 3 字药丸（`CEO`）实测
 * 宽 32.45px = 座位的 2.03 倍：居中后左溢 8.22px（把标记推出行框，窄窗里被容器边界切掉字母）、
 * 右溢 8.23px（吃掉整条 4px 标题间隙、压到标题首字盒上）——现场与真 DOM 实测见
 * `probes/browser-visual/sidebar-role-mark-probe.mjs`。故座位标记改按 **12px** 设计
 * （= 同格既有 occupant 的尺寸，与时钟图标同居一格仍不越界）。
 *
 * 数据 = **上游现成的 `agentPreset` 投影**（vendor `agent-preset-registry/src/session.ts`：
 * "Current Session preset, initialized from its header and advanced by selection events"——
 * A 段已实测 7/7 会话带值且跟随中途切换；本包零 host 代码）。
 *
 * ⚠ root 作用域的占领者**只拿 owner props（sessionId）**——槽合同原话："Both take the row's
 * Session identity and nothing else"。所以数据经注册处的 `inject` 面注入会话列表快照
 * （`ObservableSnapshot`：getSnapshot/subscribe，标准 useSyncExternalStore 形状）。
 *
 * 优雅降级：无投影值 / 空 / 未知 preset（非公司盘）⇒ **不渲染任何角色痕迹**。
 * 颜色纪律：只用平台令牌（品牌底 + 反色字）；每角色不同色需上游分类色板（提案开放问题 2）。
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/**
 * 会话列表快照的最小结构面（本地声明，照 `use-company-data.ts` 的 `SessionsStoreLike`
 * 惯例——只取徽标要读的一格，不为此引一个包）。
 * 结构上即 vendor `dsh-client-store` 的 `ObservableSnapshot`（getSnapshot/subscribe，
 * 标准 useSyncExternalStore 形状），`sessions.list` 天然满足。
 */
interface SnapshotLike<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}

/** 徽标要读的最小结构面：按会话寻址的投影值块（`agentPreset` 在其中）。 */
export interface RoleBadgeSourceFace {
  readonly projectionsBySession: Readonly<
    Record<string, { readonly values: Readonly<Record<string, unknown>> } | undefined>
  >
}

/** 注册处注入的数据面：会话列表快照（订阅投影更新，无需轮询）。 */
export interface RoleBadgeInjected {
  readonly roleSource: SnapshotLike<RoleBadgeSourceFace>
}

/** 行槽的 owner props（vendor `SessionRowScheduleOwnerProps`）+ 本占位注入的数据面。 */
export interface RoleBadgeProps extends RoleBadgeInjected {
  readonly sessionId: SessionId
}

/** 角色 → 全称缩写（窗口标题【角色】前缀、标记 title、会话头 preset 标签用）。 */
export const ROLE_SHORT: Readonly<Record<string, string>> = {
  ceo: 'CEO',
  cfo: 'CFO',
  coo: 'COO',
  'vp-eng': 'VPE',
  'vp-sales': 'VPS',
}

/**
 * 角色 → **座位标记字母**（16px 格子里放得下的那一格；不在表内的 preset 不渲染）。
 * 取**可区分**的单个字母：C/F/O 来自 CEO/CFO/COO 的区分位，E/S 来自 VPE/VPS——
 * 三字缩写（21.6px 文本 + 10.24px 内边距 = 32.45px）塞不进 16px 座位（见文件头实测）。
 * 全称不丢：窗口标题【角色】前缀、外界面的 preset 标签、以及标记自身的 `title`（= `ROLE_SHORT`）。
 */
export const ROLE_MARK: Readonly<Record<string, string>> = {
  ceo: 'C',
  cfo: 'F',
  coo: 'O',
  'vp-eng': 'E',
  'vp-sales': 'S',
}

/**
 * 侧栏一行的角色标记：座位尺度的单字母标记（`title` 带全称缩写）。
 * @param props - 行 sessionId + 注入的会话列表快照。
 * @returns 标记；无角色痕迹时 null。
 */
/**
 * 读一个会话的当前角色（上游 agentPreset 投影；无/空/非字符串 ⇒ null）。
 * 标记与 C 段窗口标题共用。
 */
export function readPresetOf(source: SnapshotLike<RoleBadgeSourceFace>, sessionId: SessionId): string | null {
  const value = source.getSnapshot().projectionsBySession[sessionId]?.values.agentPreset
  return typeof value === 'string' && value !== '' ? value : null
}

/** 会话行的显示标题（客户端列表行带 title/displayTitle；防御性双读）。 */
export function sessionTitleOf(session: unknown): string | undefined {
  const s = session as { title?: unknown, displayTitle?: unknown }
  for (const value of [s.displayTitle, s.title]) {
    if (typeof value === 'string' && value !== '') return value
  }
  return undefined
}

export function RoleBadge({ sessionId, roleSource }: RoleBadgeProps) {
  // subscribe 必须跨渲染稳定（每次 bind 会生成新引用 ⇒ 每渲染重订阅）。
  const subscribe = useMemo(() => roleSource.subscribe.bind(roleSource), [roleSource])
  // getServerSnapshot 同 getSnapshot：本组件只跑在浏览器（SPA 无 SSR），传它只为
  // useSyncExternalStore 的完整性（缺了在静态渲染/测试里直接抛错）。
  const getPreset = useCallback(() => readPresetOf(roleSource, sessionId), [roleSource, sessionId])
  const preset = useSyncExternalStore(subscribe, getPreset, getPreset)
  const mark = preset === null ? undefined : ROLE_MARK[preset]
  if (mark === undefined) return null
  return (
    <span className="wk-role-badge" data-wk-role={preset} title={preset === null ? undefined : ROLE_SHORT[preset]}>
      {mark}
    </span>
  )
}
