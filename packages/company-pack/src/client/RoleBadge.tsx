/**
 * 侧栏会话行首的角色徽标（角色身份 UX · B 段，2026-09-26 立）。
 * 提案：notes/proposed/2026-09-26-role-identity-ux.md §五 B。
 *
 * 挂载点 = 官方 ambient 行装饰位 `sidebar.session.row.leading`（vendor
 * `ui-workspace/contract/slots.ts:129`；仅 idle 行渲染，archived/blank 行留空）。
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

/** 角色 → 徽标缩写；不在表内的 preset 不渲染（非公司盘优雅降级）。 */
export const ROLE_SHORT: Readonly<Record<string, string>> = {
  ceo: 'CEO',
  cfo: 'CFO',
  coo: 'COO',
  'vp-eng': 'VPE',
  'vp-sales': 'VPS',
}

/**
 * 侧栏一行的角色徽标：小品牌色徽标 + 角色缩写。
 * @param props - 行 sessionId + 注入的会话列表快照。
 * @returns 徽标；无角色痕迹时 null。
 */
/**
 * 读一个会话的当前角色（上游 agentPreset 投影；无/空/非字符串 ⇒ null）。
 * 徽标与 C 段窗口标题共用。
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
  const short = preset === null ? undefined : ROLE_SHORT[preset]
  if (short === undefined) return null
  return <span className="wk-role-badge" data-wk-role={preset}>{short}</span>
}
