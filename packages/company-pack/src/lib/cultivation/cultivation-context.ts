/**
 * 培养背景的纯形状与编解码（2026-10-23 背景卡 D1=A / D2=A；RFC 存档 = notes/archived/2026-10-23-cultivation-context.md）。
 *
 * 两件事：
 * ① **命令**只带最小引用（`CultivationContextRef`）——摘录/标题/时间由 host 读后填，客户端不塞证据；
 * ② **记录**读模型（`CultivationContext`）的 JSON 往返、坏形状降级、人话摘要与地址。
 *
 * 浏览器安全是硬约束：本文件住 `lib/`，会被打进 `lib/client.js`（tsdown client 半，platform=browser）。
 * 因此 base64url 用本文件的字母表实现、UTF-8 用 `TextEncoder`/`TextDecoder`——**不引 `node:`/`Buffer`**。
 * 红证：`tests/client/cultivation/cultivation-context.spec.ts` 在模块存在前 import 即红；「无 Buffer」用例是回归线。
 */
import { isRecord } from '../shared/guards.ts'
import { CULTIVATION_ROLES } from '../presence/presence-status.ts'   // 直接依赖词汇层，绕开 barrel 反向边（R3-22）

export { clipExcerpt } from '../shared/text.ts'

/** 命令 JSON 的 UTF-8 字节上限（ref 级载荷；远小于正文）。 */
export const CONTEXT_COMMAND_MAX_BYTES = 2_000
/** base64url token 的字符上限。 */
export const CONTEXT_TOKEN_MAX_CHARS = 3_000
/** 记录 `contexts` JSON 的 UTF-8 字节上限。 */
export const CONTEXT_RECORD_MAX_BYTES = 8_000
export const CONTEXT_EXCERPT_MAX_CHARS = 2_000
export const CONTEXT_TITLE_MAX_CHARS = 200
export const CONTEXT_SUBTITLE_MAX_CHARS = 200
export const CONTEXT_LABEL_MAX_CHARS = 200
export const CONTEXT_ROLE_MAX_CHARS = 40
export const CONTEXT_REF_MAX_CHARS = 512

export type CultivationContextKind = 'session' | 'deliverable'
export type SubagentMode = 'one-shot' | 'continuable' | 'unknown'

/** 命令里带的最小引用；不含任何摘录。 */
export interface CultivationContextRef {
  readonly kind: CultivationContextKind
  /** session = sessionId（child = 子会话 id）；deliverable = 工作区相对路径。 */
  readonly ref: string
  /** 会话轮次；缺省 = host 取最近一轮。 */
  readonly turn?: number
  /** 子会话的 parent（session 且 origin=subagent 时必填）。 */
  readonly parentSessionId?: string
  readonly mode?: SubagentMode
  /** 展示提示（不是证据）：会话标题 / 成品 slug。 */
  readonly label?: string
  /** 展示提示（不是证据）：角色/成员名。 */
  readonly role?: string
}

export interface CultivationContextCommand {
  readonly v: 1
  readonly mode: 'correct' | 'suggest'
  readonly targetRole?: string
  readonly items: readonly CultivationContextRef[]
}

/** 记录里的自包含背景（host 读后填）；`contexts` 字段 = {v:1, items:[…]}。 */
export interface CultivationContext {
  readonly kind: CultivationContextKind
  readonly ref: string
  readonly parentSessionId?: string
  readonly mode?: SubagentMode
  /** 展示用，不是权限/归属判据。 */
  readonly role?: string
  readonly title: string
  readonly subtitle?: string
  readonly at?: string
  readonly turn?: number
  readonly excerpt: string
  readonly truncated?: boolean
}

export interface CultivationContextPayload {
  readonly v: 1
  readonly items: readonly CultivationContext[]
}

export type CultivationContextAddress =
  | { readonly kind: 'session'; readonly sessionId: string }
  | { readonly kind: 'subagent'; readonly parentSessionId: string; readonly childSessionId: string; readonly mode: SubagentMode }

export type ContextEncodeResult =
  | { readonly ok: true; readonly token: string }
  | { readonly ok: false; readonly problem: string }

export type ContextDecodeResult =
  | { readonly ok: true; readonly command: CultivationContextCommand }
  | { readonly ok: false; readonly problem: string }

export interface ContextPayloadRead {
  readonly contexts: readonly CultivationContext[]
  readonly problem: string | null
}

const SUBAGENT_MODES: readonly SubagentMode[] = ['one-shot', 'continuable', 'unknown']
const COMMAND_KEYS = ['v', 'mode', 'targetRole', 'items'] as const
const REF_KEYS = ['kind', 'ref', 'turn', 'parentSessionId', 'mode', 'label', 'role'] as const
const CONTEXT_KEYS = ['kind', 'ref', 'parentSessionId', 'mode', 'role', 'title', 'subtitle', 'at', 'turn', 'excerpt', 'truncated'] as const
const SESSION_REF_RE = /^[A-Za-z0-9._:-]+$/u
// oxlint-disable-next-line eslint/no-control-regex -- 控制字符是清洗对象：这条正则的用途就是拒绝它们
const CONTROL_RE = /[\u0000-\u001f\u007f]/u
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const BASE64URL_LOOKUP = new Map([...BASE64URL_ALPHABET].map((char, index) => [char, index]))
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export type ContextLang = 'zh' | 'en'
type PickText = (zh: string, en: string) => string

const pickerOf = (lang: ContextLang = 'zh'): PickText => (lang === 'en' ? (_zh, en) => en : zh => zh)

const codePoints = (text: string): number => [...text].length

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key))
}

function textProblem(value: unknown, name: string, min: number, max: number, t: PickText): string | null {
  if (typeof value !== 'string') return t(`${name} 必须是字符串`, `${name} must be a string`)
  const length = codePoints(value)
  if (length < min || length > max) return t(`${name} 长度须在 ${min}–${max} 码点`, `${name} length must be ${min}–${max} code points`)
  return null
}

function optionalTextProblem(value: unknown, name: string, max: number, t: PickText): string | null {
  if (value === undefined) return null
  return textProblem(value, name, 0, max, t)
}

function isSubagentMode(value: unknown): value is SubagentMode {
  return typeof value === 'string' && (SUBAGENT_MODES as readonly string[]).includes(value)
}

function isSafeRelativePath(ref: string): boolean {
  if (ref === '' || codePoints(ref) > CONTEXT_REF_MAX_CHARS) return false
  if (ref.includes('\\') || ref.includes('\u0000')) return false
  if (ref.startsWith('/') || /^[A-Za-z]:/u.test(ref)) return false
  return ref.split('/').every(part => part !== '' && part !== '.' && part !== '..')
}

/** `ref` 的路径/标识安全判据（host 仍要另验：会话能读、成品在目录里）。 */
export function isSafeContextRef(kind: CultivationContextKind, ref: string): boolean {
  if (typeof ref !== 'string' || ref === '' || codePoints(ref) > CONTEXT_REF_MAX_CHARS) return false
  if (kind === 'session') return SESSION_REF_RE.test(ref)
  if (kind === 'deliverable') return isSafeRelativePath(ref)
  return false
}

function refProblem(value: unknown, t: PickText): string | null {
  if (!isRecord(value)) return t('背景引用不是对象', 'context reference is not an object')
  const kind = value.kind
  if (kind !== 'session' && kind !== 'deliverable') return t('kind 必须是 session 或 deliverable', 'kind must be session or deliverable')
  if (typeof value.ref !== 'string' || !isSafeContextRef(kind, value.ref)) {
    return kind === 'session'
      ? t('会话 ref 不合法', 'invalid session ref')
      : t('成品 ref 必须是安全的工作区相对路径', 'deliverable ref must be a safe workspace-relative path')
  }
  if (value.turn !== undefined) {
    if (kind !== 'session') return t('成品背景不接受 turn', 'deliverable context does not accept turn')
    if (!Number.isSafeInteger(value.turn) || Number(value.turn) < 0) return t('turn 必须是非负安全整数', 'turn must be a non-negative safe integer')
  }
  if (value.label !== undefined) {
    const problem = optionalTextProblem(value.label, 'label', CONTEXT_LABEL_MAX_CHARS, t)
    if (problem !== null) return problem
    if (CONTROL_RE.test(String(value.label))) return t('label 不能含控制字符', 'label must not contain control characters')
  }
  if (value.role !== undefined) {
    const problem = optionalTextProblem(value.role, 'role', CONTEXT_ROLE_MAX_CHARS, t)
    if (problem !== null) return problem
    if (CONTROL_RE.test(String(value.role))) return t('role 不能含控制字符', 'role must not contain control characters')
  }
  const hasParent = value.parentSessionId !== undefined
  const hasMode = value.mode !== undefined
  if (hasParent !== hasMode) return t('parentSessionId 与 mode 必须成对出现', 'parentSessionId and mode must appear together')
  if (hasParent) {
    if (kind !== 'session') return t('只有会话背景能带 parentSessionId', 'only session context may include parentSessionId')
    if (typeof value.parentSessionId !== 'string' || !SESSION_REF_RE.test(value.parentSessionId)
      || codePoints(value.parentSessionId) > CONTEXT_REF_MAX_CHARS) {
      return t('parentSessionId 不合法', 'invalid parentSessionId')
    }
    if (!isSubagentMode(value.mode)) return t('mode 必须是 one-shot / continuable / unknown', 'mode must be one-shot / continuable / unknown')
  }
  return null
}

function commandProblem(value: unknown, t: PickText): string | null {
  if (!isRecord(value)) return t('背景不是对象', 'context is not an object')
  if (!onlyKeys(value, COMMAND_KEYS)) return t('含未知字段（客户端只能带引用，不能带摘录）', 'contains unknown fields (client may send references only, not excerpts)')
  if (value.v !== 1) return t('不支持的版本（v1）', 'unsupported version (v1)')
  if (value.mode !== 'correct' && value.mode !== 'suggest') return t('mode 必须是 correct 或 suggest', 'mode must be correct or suggest')
  if (value.mode === 'correct') {
    if (value.targetRole !== undefined) return t('correct 不接受 targetRole', 'correct does not accept targetRole')
  } else if (typeof value.targetRole !== 'string' || !(CULTIVATION_ROLES as readonly string[]).includes(value.targetRole)) {
    return t('suggest 的 targetRole 须在名册', 'suggest targetRole must be on the roster')
  }
  if (!Array.isArray(value.items)) return t('items 必须是数组', 'items must be an array')
  if (value.items.length !== 1) return t('背景只能带一段（v1）', 'only one context block is supported (v1)')
  const item = value.items[0]
  if (!isRecord(item) || !onlyKeys(item, REF_KEYS)) return t('背景引用含未知字段', 'context reference contains unknown fields')
  return refProblem(item, t)
}

function toBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    out += BASE64URL_ALPHABET[first >> 2] ?? ''
    out += BASE64URL_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)] ?? ''
    if (second !== undefined) out += BASE64URL_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)] ?? ''
    if (third !== undefined) out += BASE64URL_ALPHABET[third & 63] ?? ''
  }
  return out
}

function fromBase64Url(token: string, t: PickText): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(token) || token.length % 4 === 1) {
    throw new Error(t('不是合法的 base64url', 'not valid base64url'))
  }
  const bytes: number[] = []
  for (let index = 0; index < token.length; index += 4) {
    const first = BASE64URL_LOOKUP.get(token[index] ?? '')
    const second = BASE64URL_LOOKUP.get(token[index + 1] ?? '')
    if (first === undefined || second === undefined) throw new Error(t('不是合法的 base64url', 'not valid base64url'))
    const third = token[index + 2] === undefined ? undefined : BASE64URL_LOOKUP.get(token[index + 2] ?? '')
    const fourth = token[index + 3] === undefined ? undefined : BASE64URL_LOOKUP.get(token[index + 3] ?? '')
    bytes.push((first << 2) | (second >> 4))
    if (third !== undefined) bytes.push(((second & 15) << 4) | (third >> 2))
    if (fourth !== undefined) bytes.push(((third ?? 0) & 3) << 6 | fourth)
  }
  return Uint8Array.from(bytes)
}

/** 命令 → token；超限明确报错，不截断。 */
export function encodeContextToken(command: unknown, lang: ContextLang = 'zh'): ContextEncodeResult {
  const t = pickerOf(lang)
  const problem = commandProblem(command, t)
  if (problem !== null) return { ok: false, problem }
  const json = JSON.stringify(command)
  const bytes = encoder.encode(json)
  if (bytes.length > CONTEXT_COMMAND_MAX_BYTES) {
    return {
      ok: false,
      problem: t(
        `背景太大（超过 ${String(CONTEXT_COMMAND_MAX_BYTES)} 字节），请选短一点的材料。`,
        `Background context is too large (exceeds ${String(CONTEXT_COMMAND_MAX_BYTES)} bytes); choose a shorter material.`,
      ),
    }
  }
  const token = toBase64Url(bytes)
  if (token.length > CONTEXT_TOKEN_MAX_CHARS) {
    return {
      ok: false,
      problem: t(
        `背景太大（token 超过 ${String(CONTEXT_TOKEN_MAX_CHARS)} 字符），请选短一点的材料。`,
        `Background context is too large (token exceeds ${String(CONTEXT_TOKEN_MAX_CHARS)} characters); choose a shorter material.`,
      ),
    }
  }
  return { ok: true, token }
}

/** token → 命令；坏输入一律给可读原因，不抛未捕获异常。 */
export function decodeContextToken(token: string, lang: ContextLang = 'zh'): ContextDecodeResult {
  const t = pickerOf(lang)
  if (typeof token !== 'string') return { ok: false, problem: t('背景格式坏：不是合法的 base64url。', 'Malformed background context: not valid base64url.') }
  let bytes: Uint8Array
  try {
    bytes = fromBase64Url(token, t)
  } catch {
    return { ok: false, problem: t('背景格式坏：不是合法的 base64url。', 'Malformed background context: not valid base64url.') }
  }
  if (bytes.length > CONTEXT_COMMAND_MAX_BYTES) {
    return {
      ok: false,
      problem: t(
        `背景太大（超过 ${String(CONTEXT_COMMAND_MAX_BYTES)} 字节），请选短一点的材料。`,
        `Background context is too large (exceeds ${String(CONTEXT_COMMAND_MAX_BYTES)} bytes); choose a shorter material.`,
      ),
    }
  }
  let text: string
  try {
    text = decoder.decode(bytes)
  } catch {
    return { ok: false, problem: t('背景格式坏：不是合法的 UTF-8。', 'Malformed background context: not valid UTF-8.') }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { ok: false, problem: t(`背景格式坏：JSON 解析失败（${detail}）。`, `Malformed background context: JSON parse failed (${detail}).`) }
  }
  const problem = commandProblem(parsed, t)
  if (problem !== null) return { ok: false, problem: t(`背景格式坏：${problem}。`, `Malformed background context: ${problem}.`) }
  return { ok: true, command: parsed as CultivationContextCommand }
}

function contextItemProblem(value: unknown, t: PickText): string | null {
  if (!isRecord(value)) return t('背景不是对象', 'context is not an object')
  if (!onlyKeys(value, CONTEXT_KEYS)) return t('背景含未知字段', 'context contains unknown fields')
  const ref = refProblem(value, t)
  if (ref !== null) return ref
  const title = textProblem(value.title, 'title', 1, CONTEXT_TITLE_MAX_CHARS, t)
  if (title !== null) return title
  const subtitle = optionalTextProblem(value.subtitle, 'subtitle', CONTEXT_SUBTITLE_MAX_CHARS, t)
  if (subtitle !== null) return subtitle
  if (value.at !== undefined) {
    if (typeof value.at !== 'string' || codePoints(value.at) > 64 || /[\r\n]/u.test(value.at)) return t('at 不合法', 'invalid at timestamp')
  }
  const excerpt = textProblem(value.excerpt, 'excerpt', 1, CONTEXT_EXCERPT_MAX_CHARS, t)
  if (excerpt !== null) return excerpt
  if (value.truncated !== undefined && typeof value.truncated !== 'boolean') return t('truncated 必须是布尔', 'truncated must be a boolean')
  return null
}

/** 记录 `contexts` 字段（单行 JSON）→ 读模型；缺失/坏形状都降级，记录本身不消失。 */
export function parseContextPayload(text: string | undefined, lang: ContextLang = 'zh'): ContextPayloadRead {
  const t = pickerOf(lang)
  if (text === undefined || text.trim() === '') return { contexts: [], problem: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { contexts: [], problem: t(`背景格式坏：JSON 解析失败（${detail}）。`, `Malformed background context: JSON parse failed (${detail}).`) }
  }
  if (!isRecord(parsed) || !onlyKeys(parsed, ['v', 'items'])) {
    return { contexts: [], problem: t('背景格式坏：不是 {v, items} 形状。', 'Malformed background context: expected {v, items} shape.') }
  }
  if (parsed.v !== 1) return { contexts: [], problem: t('背景格式坏：不支持的版本。', 'Malformed background context: unsupported version.') }
  if (!Array.isArray(parsed.items)) return { contexts: [], problem: t('背景格式坏：items 不是数组。', 'Malformed background context: items must be an array.') }
  for (const item of parsed.items) {
    const problem = contextItemProblem(item, t)
    if (problem !== null) return { contexts: [], problem: t(`背景格式坏：${problem}。`, `Malformed background context: ${problem}.`) }
  }
  return { contexts: parsed.items as readonly CultivationContext[], problem: null }
}

/** 记录 `contexts` 的单行 JSON（`JSON.stringify` 不产生换行；换行变 `\n` 转义）。 */
export function contextPayloadText(items: readonly CultivationContext[]): string {
  const payload: CultivationContextPayload = { v: 1, items }
  return JSON.stringify(payload)
}

/** 背景的 head+tail 有界截取；截断时 `truncated: true`，不把“已截取”写进 excerpt。 */
/** 背景里常见的密钥/令牌样式（只报类别，不回显值）。 */
const SECRET_PATTERNS: readonly { readonly label: string, readonly re: RegExp }[] = [
  { label: '私钥', re: /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----/ },
  { label: '云访问密钥', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: 'sk- token', re: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
  { label: 'Bearer token', re: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i },
  { label: 'password/secret 赋值', re: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*[^\s]{8,}/i },
]

/**
 * 扫描一段背景文字里常见的密钥/令牌样式。
 * 只返回类别（不回显值），供 UI 在“写入公司盘”前提示；不阻断、不自动脱敏。
 * @param text - 背景摘录/正文。
 * @returns 命中的类别（去重、稳定顺序）。
 */
export function secretLikeFindings(text: string): string[] {
  const found: string[] = []
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.re.test(text) && !found.includes(pattern.label)) found.push(pattern.label)
  }
  return found
}

/** `source` 的人话摘要（旧 UI/工具/外部读者仍能读懂）。 */
export function contextSummary(context: Pick<CultivationContext, 'kind' | 'title' | 'subtitle'>): string {
  return contextSummaryPair(context).zh
}

/** 双语摘要（host 命令回执随语言；BUG-338）。 */
export function contextSummaryPair(context: Pick<CultivationContext, 'kind' | 'title' | 'subtitle'>): { readonly zh: string, readonly en: string } {
  if (context.kind === 'session') {
    return { zh: `会话「${context.title}」`, en: `session "${context.title}"` }
  }
  if (context.subtitle === undefined || context.subtitle === '') {
    return { zh: `成品「${context.title}」`, en: `deliverable "${context.title}"` }
  }
  return {
    zh: `成品「${context.title}」（${context.subtitle}）`,
    en: `deliverable "${context.title}" (${context.subtitle})`,
  }
}

/** 打开原文/读会话用的地址；成品返回 null（走文件资源地址）。 */
export function contextAddressOf(
  ref: Pick<CultivationContextRef, 'kind' | 'ref' | 'parentSessionId' | 'mode'>,
): CultivationContextAddress | null {
  if (ref.kind !== 'session') return null
  if (ref.parentSessionId !== undefined && ref.mode !== undefined) {
    return { kind: 'subagent', parentSessionId: ref.parentSessionId, childSessionId: ref.ref, mode: ref.mode }
  }
  return { kind: 'session', sessionId: ref.ref }
}

/** 会话事件的最小结构面（host `observeSession().events` 与客户端 snapshot 的 records 都能喂）。 */
export interface SessionEventLike {
  readonly type: string
  readonly time?: string | number
  readonly data?: unknown
}

export interface SessionTurnPick {
  readonly turn: number
  readonly text: string
  /** 该轮末条文字事件的时间（源时间；取不到省略）。 */
  readonly at?: string
}

function textBlocks(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const block of value) {
    if (isRecord(block) && block.type === 'text' && typeof block.text === 'string') out.push(block.text)
  }
  return out
}

/**
 * 会话事件 → 一轮有界文字（v1 排除 checkpoint/tool/reasoning/图片）。
 * @param events - 时间序事件（host observation.events 或 follow snapshot records 的 event）。
 * @param wanted - 指定轮次；省略 = 最后一轮有文字的 turn。
 * @returns 该轮的 `用户：…` + `分身：…`；没有文字背景给 null。
 */
export function pickSessionTurn(events: readonly SessionEventLike[], wanted?: number): SessionTurnPick | null {
  const turns = new Map<number, { user: string[]; assistant: string[]; at?: string }>()
  let current = 0
  for (const event of events) {
    if (event.type === 'turn/start' && isRecord(event.data) && Number.isSafeInteger(event.data.turn)) {
      current = Number(event.data.turn)
      continue
    }
    if (event.type === 'user/message' && isRecord(event.data)) {
      const source = isRecord(event.data.source) ? event.data.source.kind : undefined
      if (source !== 'user') continue
      const text = textBlocks(event.data.content).join('\n').trim()
      if (text === '') continue
      const turn = Number.isSafeInteger(event.data.turn) ? Number(event.data.turn) : current
      const entry = turns.get(turn) ?? { user: [], assistant: [] }
      entry.user.push(text)
      if (typeof event.time === 'string') entry.at = event.time
      turns.set(turn, entry)
      continue
    }
    if (event.type === 'assistant/message' && isRecord(event.data)) {
      const message = event.data.message
      if (!isRecord(message)) continue
      const text = textBlocks(message.content).join('\n').trim()
      if (text === '') continue
      const turn = Number.isSafeInteger(event.data.turn) ? Number(event.data.turn) : current
      const entry = turns.get(turn) ?? { user: [], assistant: [] }
      entry.assistant.push(text)
      if (typeof event.time === 'string') entry.at = event.time
      turns.set(turn, entry)
    }
  }
  const keys = [...turns.keys()]
  const target = wanted !== undefined ? wanted : keys.sort((a, b) => b - a)[0]
  if (target === undefined) return null
  const entry = turns.get(target)
  if (entry === undefined) return null
  const text = [
    entry.user.length === 0 ? '' : `用户：${entry.user.join('\n')}`,
    entry.assistant.length === 0 ? '' : `分身：${entry.assistant.join('\n')}`,
  ].filter(part => part !== '').join('\n')
  if (text === '') return null
  return entry.at === undefined ? { turn: target, text } : { turn: target, text, at: entry.at }
}
