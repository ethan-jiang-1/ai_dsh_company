/**
 * 培养域 facade（2026-10-21 拆分：本文件曾五合一——journal 收件箱 / 赞踩 / 记录折算 / 方法层 /
 * 角色词汇各住一处，同 presence.ts 的 facade 先例）。实现家：
 * - `cultivation-inbox.ts` —— journal 待审收件箱（inboxRows / journalTitle）
 * - `cultivation-feedback.ts` —— 人的赞/踩（feedbackItems）
 * - `cultivation-record.ts` —— 培养记录（parseRecord / recordText / recordInbox / timeLabel / methodSkillText）
 * - `presence-status.ts` —— 角色名册与短标签（CULTIVATION_ROLES 的唯一事实家）
 * 消费面（host 工具、client 面板、keyless spec）一律从本 facade import——内部搬家不再波及消费方。
 */

export * from './cultivation-inbox.ts'
export * from './cultivation-feedback.ts'
export * from './cultivation-record.ts'

import { PRESET_KEYS } from './presence-status.ts'

/**
 * 五角色名册 = presence-status 的 pack 内唯一事实家（2026-10-21 收拢：此前同形字面量在
 * presence-status / cultivation / host 工具串三处各一份，加角色要动 ≥4 处——pack/tools 边界的
 * 自包含理由不覆盖 pack 内部）。此处再导出仅为保持既有 import 面。
 */
export const CULTIVATION_ROLES = PRESET_KEYS

export { roleLabel } from './presence-status.ts'
