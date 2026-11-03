/**
 * 窗口标题 / 角色色条的纯计算（2026-11-03 D2/D5 从 client/index 的 registerTitle 抽出）。
 *
 * 原实现把「找 retainedBy.mainView 的当前会话 → preset → 短名 → 标题」折在订阅闭包里；
 * 抽成纯函数后，四个分支（无当前会话 / 有 preset / 未知 preset / 空标题）可直接单测。
 * 证明边界：不证 DOM 写入与订阅生命周期（→ registerTitle 的 effect）。
 */
export interface TitleRow {
  readonly id: string
  readonly retainedBy?: { readonly mainView?: number }
  readonly title?: string
  readonly displayTitle?: string
}

export interface TitleUpdateInput {
  readonly current: TitleRow | undefined
  readonly preset: string | null
  readonly roleShort: Readonly<Record<string, string>>
  readonly titleOf: (row: TitleRow) => string | undefined
}

/** 返回要写入的 title / role；字段缺席 = 调用方不写/删除。 */
export function titleUpdateFor(input: TitleUpdateInput): { readonly title?: string; readonly role?: string } {
  const short = input.preset === null ? undefined : input.roleShort[input.preset]
  const rawTitle = input.current === undefined ? undefined : input.titleOf(input.current)
  const title = rawTitle !== undefined && rawTitle !== ''
    ? (short === undefined ? rawTitle : `【${short}】${rawTitle}`)
    : undefined
  return {
    ...(title === undefined ? {} : { title }),
    ...(short === undefined ? {} : { role: input.preset ?? '' }),
  }
}
