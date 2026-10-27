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

// 名册与短标签只做**再导出**（定义住在 presence-status.ts；本文件是纯 barrel——2026-10-27 R3-22
// 修环：原先这里既 export * 又定义 CULTIVATION_ROLES，与 cultivation-context 构成三元环）。
export { CULTIVATION_ROLES, roleLabel } from './presence-status.ts'
