/**
 * `/company-diagnostics`：会话内运行态健康自检（`status`/无参）+ 浏览器错误环诊断落盘（`client-error`）。
 *
 * 为什么：
 * 1. `status`（或无参）：把 `workspace`、数据闸门（`dataBlocked` + 原因）、`presetHealth.report()`
 *    （点名 broken preset）、`<DSH_HOME>/cache/company` 派生索引体积与最近客户端错误环摘要合并成
 *    一条只读双语命令，运维/用户在会话里敲一下即可自检，不必切终端跑探针。
 * 2. `client-error <uri-encoded JSON>`：client 没有往 session 追加事件的合法通道，经
 *    `remote.commands.execute` 调本命令追加一行到 `logs/company-client-errors.log`（字段白名单、
 *    长度有界、token URL 脱敏）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { registerLocalizedCommand } from './localized-command.ts'
import type { CompanyLanguageState } from '../language/company-language.ts'
import type { PresetHealth } from '../startup/preset-health.ts'
import { appendRotatingLine } from '../logging/rotating-log.ts'

/** 诊断日志落点（相对 DSH_HOME；宿主日志，不是公司数据）。 */
export const CLIENT_ERRORS_REL = 'logs/company-client-errors.log'

/** 派生检索缓存目录（相对 DSH_HOME）。 */
export const CACHE_COMPANY_REL = 'cache/company'

/** 单文件上限；超过则把当前文件轮转为 `.1`（只留一份备份）。 */
export const CLIENT_ERRORS_MAX_BYTES = 256 * 1024

const MAX_INPUT_CHARS = 8_000

export interface ClientDiagnosticsOptions {
  readonly language?: CompanyLanguageState
  readonly presetHealth?: Pick<PresetHealth, 'report'>
  readonly workspace?: string
  readonly dataBlocked?: boolean
  readonly blockedReason?: string
  readonly blockedReasonEn?: string
}

function redact(text: string): string {
  return text.replace(/([?&]token=)[^\s&"'<>]+/g, '$1<redacted>')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

function readCacheSummary(dshHome: string): { readonly files: number, readonly bytes: number } {
  const dir = join(dshHome, CACHE_COMPANY_REL)
  if (!existsSync(dir)) return { files: 0, bytes: 0 }
  try {
    let files = 0
    let bytes = 0
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      files += 1
      bytes += statSync(join(dir, entry.name)).size
    }
    return { files, bytes }
  } catch {
    // intentional-fallback: 诊断自检在目录权限异常时不崩，按 0 报
    return { files: 0, bytes: 0 }
  }
}

function readRecentErrorSummary(dshHome: string): { readonly count: number, readonly latest: string | null } {
  const logPath = join(dshHome, CLIENT_ERRORS_REL)
  if (!existsSync(logPath)) return { count: 0, latest: null }
  try {
    const lines = readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim() !== '')
    if (lines.length === 0) return { count: 0, latest: null }
    const lastRaw = lines[lines.length - 1] ?? ''
    const parsed = JSON.parse(lastRaw) as { readonly at?: unknown, readonly entry?: { readonly kind?: unknown, readonly message?: unknown } }
    const at = typeof parsed.at === 'string' ? parsed.at : '?'
    const kind = typeof parsed.entry?.kind === 'string' ? parsed.entry.kind : 'error'
    const msg = typeof parsed.entry?.message === 'string' ? parsed.entry.message.slice(0, 120) : ''
    return { count: lines.length, latest: `[${at}] ${kind}: ${msg}` }
  } catch {
    // intentional-fallback: 日志损坏时不阻断状态输出
    return { count: 0, latest: null }
  }
}

/** 注册 `/company-diagnostics [status | client-error <encoded>]`（命令面随语言；BUG-367 / dim10）。 */
export function registerClientDiagnostics(
  ctx: Context,
  dshHome: string,
  options: ClientDiagnosticsOptions = {},
): void {
  const text = (zh: string, en: string): string => options.language?.text(zh, en) ?? zh
  const usage = (): string => text(
    '用法：/company-diagnostics [status] | /company-diagnostics client-error <URI-encoded JSON>',
    'Usage: /company-diagnostics [status] | /company-diagnostics client-error <URI-encoded JSON>',
  )
  const renderStatus = async (): Promise<string> => {
    const ws = options.workspace !== undefined && options.workspace !== '' ? options.workspace : null
    const health = options.presetHealth !== undefined
      ? await options.presetHealth.report()
      : { ready: false, broken: [] as readonly string[] }
    const cache = readCacheSummary(dshHome)
    const errors = readRecentErrorSummary(dshHome)
    const lang = options.language?.current() ?? 'zh'
    if (lang === 'en') {
      const gateLine = options.dataBlocked === true
        ? `blocked (${options.blockedReasonEn ?? options.blockedReason ?? 'unknown reason'})`
        : 'writable'
      const presetLine = !health.ready
        ? 'not ready (no agentPresets service in current composition)'
        : health.broken.length === 0
          ? 'healthy (0 broken)'
          : `BROKEN (${String(health.broken.length)}): ${health.broken.join('; ')}`
      const cacheLine = `${formatBytes(cache.bytes)} (${String(cache.files)} file(s) in ${CACHE_COMPANY_REL})`
      const errorLine = errors.count === 0
        ? `0 entries (${CLIENT_ERRORS_REL})`
        : `${String(errors.count)} entry/entries; latest ${errors.latest ?? '-'}`
      return [
        'Company runtime diagnostics:',
        `- workspace: ${ws ?? '(unset)'}`,
        `- data gate: ${gateLine}`,
        `- presets: ${presetLine}`,
        `- search cache: ${cacheLine}`,
        `- client errors: ${errorLine}`,
      ].join('\n')
    }
    const gateZh = options.dataBlocked === true
      ? `停写（${options.blockedReason ?? '未知原因'}）`
      : '正常可写'
    const presetZh = !health.ready
      ? '未就绪（当前组合无 agentPresets 服务）'
      : health.broken.length === 0
        ? '全部正常（0 broken）'
        : `挂载失败（${String(health.broken.length)}）：${health.broken.join('；')}`
    const cacheZh = `${formatBytes(cache.bytes)}（${CACHE_COMPANY_REL} 共 ${String(cache.files)} 个文件）`
    const errorZh = errors.count === 0
      ? `0 条（${CLIENT_ERRORS_REL}）`
      : `共 ${String(errors.count)} 条；最近 ${errors.latest ?? '-'}`
    return [
      `公司运行态自检：\n- workspace：${ws ?? '(unset)'}\n- 数据闸门：${gateZh}\n- 预设挂载：${presetZh}\n- 派生索引：${cacheZh}\n- 客户端错误环：${errorZh}`,
    ].join('\n')
  }
  const definition = () => ({
    name: 'company-diagnostics',
    description: text(
      '查看公司运行态自检摘要（status/无参），或写入一条浏览器错误环诊断（client-error）',
      'Inspect company runtime diagnostics (status / no args) or record one browser error-ring entry (client-error)',
    ),
    input: { hint: '[status] | client-error <URI-encoded JSON>' },
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      // 诊断日志住 DSH_HOME（不是公司数据）：公司盘 dataBlocked 时，“用户那一页”的错误仍必须留痕。
      // vendor `parseCommand` 的 rawInput 保留命令名后的分隔空白（commands/src/index.ts:125）。
      const input = rawInput.trim()
      if (input === '' || input === 'status') {
        return { kind: 'success' as const, text: await renderStatus() }
      }
      const prefix = 'client-error '
      if (!input.startsWith(prefix)) {
        return { kind: 'error' as const, text: usage() }
      }
      const encoded = input.slice(prefix.length).trim()
      if (encoded === '' || encoded.length > MAX_INPUT_CHARS) {
        return { kind: 'error' as const, text: text(`诊断载荷为空或超过 ${String(MAX_INPUT_CHARS)} 字符。`, `The diagnostic payload is empty or longer than ${String(MAX_INPUT_CHARS)} characters.`) }
      }
      let raw: unknown
      try {
        raw = JSON.parse(decodeURIComponent(encoded))
      } catch {
        return { kind: 'error' as const, text: text('诊断载荷不是合法的 URI-encoded JSON。', 'The diagnostic payload is not valid URI-encoded JSON.') }
      }
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { kind: 'error' as const, text: text('诊断载荷必须是对象。', 'The diagnostic payload must be an object.') }
      }
      const source = raw as Record<string, unknown>
      const kind = source.kind === 'error' || source.kind === 'rejection' || source.kind === 'console'
        ? source.kind
        : 'error'
      const message = typeof source.message === 'string' ? redact(source.message).slice(0, 1_000) : ''
      if (message === '') return { kind: 'error' as const, text: text('诊断载荷缺 message。', 'The diagnostic payload has no message.') }
      const entry = {
        kind,
        message,
        ...(typeof source.stack === 'string' ? { stack: redact(source.stack).slice(0, 2_000) } : {}),
        at: typeof source.at === 'number' ? source.at : Date.now(),
        ...(typeof source.href === 'string' ? { href: redact(source.href).slice(0, 500) } : {}),
      }
      const path = join(dshHome, CLIENT_ERRORS_REL)
      try {
        appendRotatingLine(path, `${JSON.stringify({ at: new Date().toISOString(), entry })}\n`, CLIENT_ERRORS_MAX_BYTES)
      } catch (error) {
        return { kind: 'error' as const, text: text(`诊断写入失败：${(error as Error).message}`, `Writing the diagnostic failed: ${(error as Error).message}`) }
      }
      return { kind: 'success' as const, text: text(`已记录客户端错误（${CLIENT_ERRORS_REL}）。`, `Client error recorded (${CLIENT_ERRORS_REL}).`) }
    },
  })
  registerLocalizedCommand(ctx, definition, options.language)
}
