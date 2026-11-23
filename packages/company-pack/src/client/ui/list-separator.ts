/**
 * 列表分隔符（BUG-329）：中文用顿号「、」，英文用逗号 + 空格。
 *
 * 为什么单独成件：`join('、')` 曾散在四处（任务成员 / 依赖 / 看板等待与分叉 / 培养坏记录），
 * 每种语言各写一遍必然漂。这里取字典里的**唯一**一格。
 */
import type { CompanyT } from '../locales.ts'

/**
 * 当前语言下的列表分隔符。
 * @param t - 当前语言的 translator（`ui.listSeparator`：zh「、」/ en ", "）。
 * @returns 分隔符。
 */
export function listSeparator(t: CompanyT): string {
  return t('ui.listSeparator')
}

/**
 * 当前语言下的从句分隔符（zh「；」/ en "; "）。
 * @param t - 当前语言的 translator（`ui.clauseSeparator`）。
 * @returns 分隔符。
 */
export function clauseSeparator(t: CompanyT): string {
  return t('ui.clauseSeparator')
}

/**
 * 把若干项按给定分隔符拼成一句话里的列表（空串项被过滤）。
 * @param items - 待拼接的项。
 * @param separator - `listSeparator(t)` 或培养面板自己的分隔符。
 * @returns 拼接结果；没有项时为空串。
 */
export function joinList(items: readonly string[], separator: string): string {
  return items.filter(item => item !== '').join(separator)
}
