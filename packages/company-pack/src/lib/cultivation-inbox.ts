/**
 * 培养面板 · journal 待审收件箱读模型（2026-10-21 自 cultivation.ts 拆出——该文件曾五合一）。
 *
 * 数据面 = `remote.workspaceFiles`（list + read，浏览器经会话身份读自己工作区）——纯函数只消费
 * 调用方喂进来的清单与文本。**待审语义**：journal/ 里的条目即待审素材——手册「轮末收敛」规则
 *（人审后压进 CHARTER「历史纪要」、journal 只留当前轮）成立后天然准确；收敛未做时面板如实显示
 * 全部存量（46 篇 = 46 篇待审，不撒谎）。
 */

import { PRESET_KEYS, roleLabel } from './presence-status.ts'
import { clip } from './text.ts'

/** 一条 journal 待审条目。 */
export interface JournalEntry {
  readonly role: string
  /** 文件名（相对 journal/ 目录）。 */
  readonly name: string
  /** 一句话标题（文件首个标题或首行）。 */
  readonly title: string
}

/** 面板一行：一个角色的待审收件箱。 */
export interface CultivationRow {
  readonly role: string
  readonly label: string
  /** 待审条目总数。 */
  readonly count: number
  /** 该角色 journal 目录是否可达（2026-10-13 培养卡 V2：不可达 ≠ 0 条）。 */
  readonly reach: 'ok' | 'unreachable'
  /** 预览条目（文件名倒序前 3 条；排序依据见 {@link inboxRows} 注）。 */
  readonly entries: readonly JournalEntry[]
}

/** 预览条数上限。 */
export const PREVIEW_LIMIT = 3

/** 标题截断上限。 */
const TITLE_CLIP = 60

/**
 * 从 journal 文本提取一句话标题：优先首个 `#`/`##` 标题行，退回首段首个非空行；截断到
 * {@link TITLE_CLIP} 字。空文本给「（空）」。
 */
export function journalTitle(text: string): string {
  const lines = text.split('\n')
  for (const line of lines) {
    const heading = /^#{1,3}\s+(.+)$/.exec(line.trim())
    if (heading !== null) {
      const title = heading[1]!.trim()
      if (title !== '') return clip(title, TITLE_CLIP)
    }
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed !== '') return clip(trimmed, TITLE_CLIP)
  }
  return '（空）'
}

/**
 * 折面板行。
 * @param listings - 每角色的 journal 文件名清单（只喂 `.md` 文件，目录由调用方过滤）；
 *   **null = 该角色目录不可达**（目录缺失/断流——行显示「不可达」，不是 0 条）。
 * @param firstText - 已读取文件的首段文本（未读的条目标题降级为文件名）。
 * @returns 每角色一行；清单缺角色给 0 条（面板如实显示"无待审"）。
 *
 * 排序注：listing 无 mtime，按**文件名倒序**近似"最新在前"——历史 journal 命名不定长，此排序
 * 在「记忆收敛」条目把命名钉成日期前缀后即精确（衔接留痕，见 RFC §切片四）。
 */
export function inboxRows(
  listings: Readonly<Record<string, readonly string[] | null>>,
  firstText: Readonly<Record<string, string>>,
): readonly CultivationRow[] {
  return PRESET_KEYS.map(role => {
    const listing = listings[role]
    if (listing === null || listing === undefined) {
      return { role, label: roleLabel(role), count: 0, reach: 'unreachable' as const, entries: [] }
    }
    const names = [...listing].sort().reverse()
    const entries = names.slice(0, PREVIEW_LIMIT).map(name => ({
      role,
      name,
      title: firstText[`${role}/${name}`] !== undefined
        ? journalTitle(firstText[`${role}/${name}`]!)
        : name.replace(/\.md$/, ''),
    }))
    return {
      role,
      label: roleLabel(role),
      count: names.length,
      reach: 'ok' as const,
      entries,
    }
  })
}
