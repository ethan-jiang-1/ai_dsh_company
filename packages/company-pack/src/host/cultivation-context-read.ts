/**
 * 培养背景读取（2026-10-27 R3-21 自 `cultivation.ts` 拆出）：会话/成品两种背景的 host 只读面。
 *
 * 为什么单开：这三段（sessionQuery 懒取、会话背景折算、成品背景折算）此前住在一个 340 行的
 * 命令闭包里，读背景的判据与命令分发混在一起；拆出后命令处理器只留「命令语义 + 分发」，
 * 背景读取的错误文案与证据口径在这里一处维护。
 *
 * 边界：只读（sessionQuery 观测 / `kb/deliverables-index.json`），不写任何文件、不碰方法层。
 */
import { isRecord } from '../lib/guards.ts'
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  clipExcerpt,
  pickSessionTurn,
  type CultivationContext,
  type CultivationContextRef,
  type SessionEventLike,
} from '../lib/cultivation-context.ts'
import { roleLabel } from '../lib/cultivation.ts'
import { ROSTER } from './cultivation-storage.ts'

/** 背景读取的 host 最小读面（sessionQuery 懒取；缺席 = 明确报错，不静默降级）。 */
interface SessionObservationLike {
  readonly header: {
    readonly id?: string
    readonly parentSession?: string
    readonly origin?: string
    readonly agentPreset?: string
  }
  readonly events: readonly SessionEventLike[]
}

interface SessionQueryLike {
  observeSession(
    sessionId: string,
    options?: { readonly projectionMode?: 'all' | 'none', readonly signal?: AbortSignal },
  ): Promise<SessionObservationLike>
  readTitleSnapshots?(ids: readonly string[], signal?: AbortSignal): Promise<readonly unknown[]>
}

type ContextRead = { readonly context: CultivationContext } | { readonly problem: string }

function errorMessage(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error)
  } catch {
    return '未知原因'
  }
}

function sessionQueryOf(ctx: Context): SessionQueryLike | undefined {
  const getter = (ctx as unknown as { get?: (name: string) => unknown }).get
  if (typeof getter !== 'function') return undefined
  const value = getter.call(ctx, 'sessionQuery')
  return value as SessionQueryLike | undefined
}

/** 会话背景：host 非激活读一轮文字，填自包含 `contexts`。 */
async function readSessionContext(query: SessionQueryLike, ref: CultivationContextRef): Promise<ContextRead> {
  const observation = await query.observeSession(ref.ref, {
    projectionMode: 'none',
    signal: AbortSignal.timeout(5_000),
  })
  if (ref.parentSessionId !== undefined) {
    if (observation.header.parentSession !== ref.parentSessionId) return { problem: '背景会话不是这个 parent 的子会话。' }
    if (observation.header.origin !== 'subagent') return { problem: '背景会话不是子会话（origin 不是 subagent）。' }
  }
  const picked = pickSessionTurn(observation.events, ref.turn)
  if (picked === null) {
    return {
      problem: ref.turn === undefined
        ? '这段会话没有可用的文字背景（可能只有工具调用）。'
        : `第 ${String(ref.turn)} 轮没有可用的文字背景。`,
    }
  }
  let title = ref.label?.trim() ?? ''
  if (title === '' && typeof query.readTitleSnapshots === 'function') {
    try {
      const results = await query.readTitleSnapshots([ref.ref], AbortSignal.timeout(2_000))
      const first = results[0]
      if (isRecord(first) && first.status === 'fulfilled' && isRecord(first.value) && typeof first.value.title === 'string') {
        title = first.value.title.trim()
      }
    } catch {
      // Title is presentation-only; the turn text is the evidence.
    }
  }
  if (title === '') title = `第 ${String(picked.turn)} 轮`
  const preset = observation.header.agentPreset
  const role = ref.role?.trim() !== undefined && ref.role?.trim() !== ''
    ? ref.role.trim()
    : preset !== undefined && ROSTER.has(preset) ? preset : undefined
  const subtitle = [role === undefined ? '' : roleLabel(role), `第 ${String(picked.turn)} 轮`]
    .filter(part => part !== '').join(' · ')
  const clipped = clipExcerpt(picked.text, 1_200)
  const context: CultivationContext = {
    kind: 'session',
    ref: ref.ref,
    title,
    subtitle,
    excerpt: clipped.text,
    truncated: clipped.truncated,
    turn: picked.turn,
    ...(ref.parentSessionId === undefined ? {} : { parentSessionId: ref.parentSessionId }),
    ...(ref.mode === undefined ? {} : { mode: ref.mode }),
    ...(role === undefined ? {} : { role }),
    ...(picked.at === undefined ? {} : { at: picked.at }),
  }
  return { context }
}

/** 成品背景：只认 `kb/deliverables-index.json` 里的条目（不做任意文件读）。 */
function readDeliverableContext(companyRoot: string, ref: CultivationContextRef): ContextRead {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(companyRoot, 'kb', 'deliverables-index.json'), 'utf8'))
  } catch {
    return { problem: '读不到成品目录（生成器未跑或索引缺失）——仍可选会话，或直接手写。' }
  }
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return { problem: '成品目录形状不符（schema/entries 缺失）。' }
  const entry = raw.entries.find(value => isRecord(value) && value.path === ref.ref)
  if (entry === undefined || !isRecord(entry)) return { problem: '成品目录里没有这个成品（可能已归档/移动）。' }
  const slug = typeof entry.slug === 'string' && entry.slug !== '' ? entry.slug : ref.label?.trim() ?? '成品'
  const result = typeof entry.result === 'string' && entry.result !== '' ? entry.result : undefined
  const summary = typeof entry.summary === 'string' && entry.summary.trim() !== ''
    ? entry.summary.trim()
    : `成品 ${slug}`
  const clipped = clipExcerpt(summary, 600)
  const role = ref.role?.trim() === undefined || ref.role?.trim() === '' ? undefined : ref.role.trim()
  const context: CultivationContext = {
    kind: 'deliverable',
    ref: ref.ref,
    title: slug,
    excerpt: clipped.text,
    ...(result === undefined ? {} : { subtitle: result }),
    ...(typeof entry.kickoff === 'string' && entry.kickoff !== '' ? { at: entry.kickoff } : {}),
    ...(role === undefined ? {} : { role }),
    ...(clipped.truncated ? { truncated: true } : {}),
  }
  return { context }
}

export async function readContext(ctx: Context, companyRoot: string, ref: CultivationContextRef): Promise<ContextRead> {
  if (ref.kind === 'session') {
    const query = sessionQueryOf(ctx)
    if (query === undefined) return { problem: '这个界面读不了会话历史（sessionQuery 未挂）。' }
    try {
      return await readSessionContext(query, ref)
    } catch (error) {
      return { problem: `这段背景读不到：${errorMessage(error)}。` }
    }
  }
  if (ref.kind === 'deliverable') {
    try {
      return readDeliverableContext(companyRoot, ref)
    } catch (error) {
      return { problem: `这段背景读不到：${errorMessage(error)}。` }
    }
  }
  return { problem: '背景格式坏：不支持的 kind。' }
}

/** 把 `head :: body` 切开（分隔符两侧留白皆可；无分隔符 = body 空）。 */
