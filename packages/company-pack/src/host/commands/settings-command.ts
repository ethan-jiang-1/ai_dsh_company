/**
 * `/company-settings` 人命令：读写项目启动策略（`.dsh-company/startup.json`）。
 *
 * 为什么要有命令：面板是主入口，但人和 agent 都需要一个无 UI 的出口（排障、脚本、模型自检）；
 * 它同时是 client → host 的**写通道**（浏览器面板经 `remote.commands.execute` 发它）。
 * 读不走命令：每次读都往会话里写 `command/run`，面板一打开就多一个命令条；读走 `workspaceFiles`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { blockedCompanyText } from './blocked-text.ts'
import { resolveStartupWorkspace } from '../startup/startup-workspace.ts'
import {
  clearStartupSettings,
  isStartupField,
  parseStartupSettings,
  STARTUP_FIELDS,
  type StartupAgentLike,
  type StartupField,
  type StartupSettings,
} from '../../lib/startup-settings.ts'
import {
  checkWikiPointer,
  enumerateStartupOptions,
  readStartupSettingsState,
  refreshStartupOptions,
  writeStartupSettings,
} from '../startup/startup-store.ts'
import { STARTUP_COMMAND_COPY } from '../../lib/startup-command-copy.ts'
import type { WikiProblem } from '../../lib/startup-settings.ts'

export type ParsedSettingsCommand =
  | { readonly kind: 'show' }
  | { readonly kind: 'reset' }
  | { readonly kind: 'set'; readonly field: StartupField; readonly value: string | null }
  // 解析器只给**结构化错误码**；文案在 handler 里按当前语言取（zh/en 都可变）。
  | { readonly kind: 'error'; readonly code: 'usage' | 'unknown-field'; readonly field?: string }

/**
 * 解析子命令。
 * @param rawInput - 斜杠后的原始输入。
 * @returns 归一化动作；非法输入给用法错误。
 */
export function parseSettingsCommand(rawInput: string): ParsedSettingsCommand {
  const trimmed = rawInput.trim()
  if (trimmed === '') return { kind: 'show' }
  const head = trimmed.split(/\s+/, 1)[0] ?? ''
  if (head === 'show') return trimmed === 'show' ? { kind: 'show' } : { kind: 'error', code: 'usage' }
  if (head === 'reset') return trimmed === 'reset' ? { kind: 'reset' } : { kind: 'error', code: 'usage' }
  if (head !== 'set') return { kind: 'error', code: 'usage' }
  // `set wiki` 的值是**原始剩余字符串**（wiki 可以带连续空格）；不要 split 后再 join 折叠（BUG-084）。
  const rest = trimmed.slice(head.length).trim()
  const matched = /^(\S+)\s+([\s\S]+)$/.exec(rest)
  if (matched === null) return { kind: 'error', code: 'usage' }
  const field = matched[1] as string
  if (!isStartupField(field)) {
    return { kind: 'error', code: 'unknown-field', field }
  }
  const raw = (matched[2] ?? '').trim()
  if (raw === '') return { kind: 'error', code: 'usage' }
  const value = raw === 'auto' ? null : raw
  return { kind: 'set', field, value }
}

export interface SettingsCommandOptions {
  /** host 启动时解析的 workspace（空串 = 没有；只作会话无 cwd 的回退）。 */
  readonly workspace: string
  readonly dataBlocked: boolean
  readonly blockedReason?: string
  /** pack 的 `content/`（枚举可选项用）。 */
  readonly contentDir?: string
  /** 人可见文案按当前公司语言取（zh 缺省）。 */
  readonly text: (zh: string, en: string) => string
  /**
   * 当前公司语言（可选）。description/hint 在注册时是字符串，vendor 不支持 per-locale provider；
   * 所以语言切换时用 subscribe 重注册（BUG-083）。
   */
  readonly language?: {
    current(): 'zh' | 'en'
    subscribe(listener: () => void): () => void
  }
  /**
   * 写设置后重派生选项文件；生产传 watcher（顺带按新指针布哨），缺省直接写派生文件。
   * 用回调而不是直接 import：spec 不需要真 watcher，host 又能在这里多接一步。
   */
  readonly refreshOptions?: (workspace: string) => void
}

/** 一行「字段 = 值」。 */
function describe(settings: StartupSettings): string {
  return STARTUP_FIELDS
    .map(field => `${field}=${settings[field] ?? 'auto'}`)
    .join(', ')
}

/** 失效原因的人话（zh/en 各一条；A3 要求回执点名具体问题，不能只说「失效」）。 */
function wikiProblemText(problem: WikiProblem, text: (zh: string, en: string) => string): string {
  switch (problem) {
    case 'missing':
      return text('目录不存在', 'directory does not exist')
    case 'not-directory':
      return text('这个路径不是目录', 'path is not a directory')
    case 'no-index':
      return text('目录里没有 index.md', 'directory has no index.md')
  }
}

/** 注册 `/company-settings`。 */
export function registerSettingsCommand(ctx: Context, options: SettingsCommandOptions): void {
  const text = options.text
  // 写后重派生：生产传 watcher（顺带布新鲜度哨），spec 缺省直接落派生文件。
  const refresh = options.refreshOptions
    ?? ((workspace: string): void => { refreshStartupOptions(workspace, options.contentDir) })
  const definition = () => ({
    name: 'company-settings',
    description: text(STARTUP_COMMAND_COPY.description.zh, STARTUP_COMMAND_COPY.description.en),
    input: { hint: text(STARTUP_COMMAND_COPY.hint.zh, STARTUP_COMMAND_COPY.hint.en) },
    handler: async ({ rawInput, agent }: { readonly rawInput: string, readonly agent?: StartupAgentLike }) => {
      // 会话 cwd 优先：面板按 Lead 会话读，写必须落在同一份（BUG-081）。
      const workspace = resolveStartupWorkspace(options.workspace, agent)
      if (workspace === '') {
        return {
          kind: 'error' as const,
          text: options.dataBlocked
            ? blockedCompanyText(options.blockedReason, '设置')
            : text(STARTUP_COMMAND_COPY.noWorkspace.zh, STARTUP_COMMAND_COPY.noWorkspace.en),
        }
      }
      const parsed = parseSettingsCommand(rawInput)
      if (options.dataBlocked && parsed.kind !== 'show') {
        return { kind: 'error' as const, text: blockedCompanyText(options.blockedReason, '设置') }
      }
      if (parsed.kind === 'error') {
        const copy = parsed.code === 'unknown-field'
          ? STARTUP_COMMAND_COPY.unknownField(parsed.field ?? '', STARTUP_FIELDS.join(' / '))
          : STARTUP_COMMAND_COPY.usage
        return { kind: 'error' as const, text: text(copy.zh, copy.en) }
      }

      const currentState = readStartupSettingsState(workspace)
      const current = currentState.settings
      if (parsed.kind === 'show') {
        const available = enumerateStartupOptions(options.contentDir)
        const wikiCheck = checkWikiPointer(workspace, current.wiki)
        const problemNote = currentState.problem === null ? '' : `⚠ startup.json ${currentState.problem === 'unsupported' ? 'schema 高于本包支持' : '损坏'}；当前按 auto 显示，重新 set 会覆盖。\n`
        const wikiLine = current.wiki === null
          ? text('wiki=auto', 'wiki=auto')
          : wikiCheck.ok
            ? text(`wiki=${current.wiki}（可用；${wikiCheck.location === 'inside' ? '可写' : '只读'}）`,
              `wiki=${current.wiki} (ok; ${wikiCheck.location === 'inside' ? 'writable' : 'read-only'})`)
            : text(`wiki=${current.wiki}（⚠ 失效：${wikiCheck.problem === null ? '未知原因' : wikiProblemText(wikiCheck.problem, text)}）`,
              `wiki=${current.wiki} (invalid: ${wikiCheck.problem === null ? 'unknown' : wikiProblemText(wikiCheck.problem, text)})`)
        return {
          kind: 'success' as const,
          text: text(
            `${problemNote}当前：${describe(current)}\n${wikiLine}\n可选 产品类型：${available.productTypes.join(' / ') || '（无）'}\n可选 交付模式：${available.deliveryModes.join(' / ') || '（无）'}`,
            `Current: ${describe(current)}\n${wikiLine}\nProduct types: ${available.productTypes.join(' / ') || '(none)'}\nDelivery modes: ${available.deliveryModes.join(' / ') || '(none)'}`,
          ),
        }
      }

      if (parsed.kind === 'reset') {
        const next = clearStartupSettings(new Date().toISOString())
        try {
          writeStartupSettings(workspace, next)
        } catch (error) {
          return { kind: 'error' as const, text: `恢复自动失败：${(error as Error).message}` }
        }
        try { refresh(workspace) } catch { /* 派生失败不回滚设置 */ }
        return {
          kind: 'success' as const,
          text: text('已恢复自动（三项全部不约束）；下一轮生效。', 'Reset to auto (no constraints); effective next turn.'),
        }
      }

      // set：先按内容包校验值，未知值 fail-closed 并列出可用项。
      if (parsed.value !== null) {
        const allowed = enumerateStartupOptions(options.contentDir)
        const pool = parsed.field === 'productType'
          ? allowed.productTypes
          : parsed.field === 'deliveryMode' ? allowed.deliveryModes : null
        if (pool !== null && !pool.includes(parsed.value)) {
          return {
            kind: 'error' as const,
            text: text(
              `未知值「${parsed.value}」；可用：${pool.join(' / ') || '（无）'}（用 auto 表示不约束）`,
              `Unknown value "${parsed.value}"; available: ${pool.join(' / ') || '(none)'} (use auto for no constraint)`,
            ),
          }
        }
      }
      const next = {
        ...current,
        [parsed.field]: parsed.value,
        v: 1 as const,
        updatedAt: new Date().toISOString(),
      }
      try {
        writeStartupSettings(workspace, parseStartupSettings(JSON.stringify(next)))
      } catch (error) {
        return { kind: 'error' as const, text: `写入 startup.json 失败：${(error as Error).message}` }
      }
      try { refresh(workspace) } catch { /* 派生失败不回滚设置 */ }
      // A3：wiki 指针写进去就查一次——失效要说出来，不能等模型去 read 一个空气目录。
      const wikiWarning = parsed.field === 'wiki' && parsed.value !== null
        ? (() => {
            const check = checkWikiPointer(workspace, parsed.value)
            if (check.ok) return ''
            const why = check.problem === null ? '' : `：${wikiProblemText(check.problem, text)}`
            return text(`\n⚠ 这个 wiki 指针暂时不可用${why}；修好目录或 index.md 前，角色会被告知「指针失效」。`,
              `\nWarning: this wiki pointer is not usable${check.problem === null ? '' : `: ${wikiProblemText(check.problem, text)}`}; until the directory and index.md exist, roles are told the pointer is invalid.`)
          })()
        : ''
      return {
        kind: 'success' as const,
        text: text(
          `已设置 ${parsed.field} = ${parsed.value ?? 'auto'}；下一轮生效。${wikiWarning}`,
          `Set ${parsed.field} = ${parsed.value ?? 'auto'}; effective next turn.${wikiWarning}`,
        ),
      }
    },
  })
  let dispose = ctx.commands.register(definition())
  if (options.language !== undefined) {
    const unsubscribe = options.language.subscribe(() => {
      dispose()
      dispose = ctx.commands.register(definition())
    })
    const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
    if (typeof effect === 'function') effect.call(ctx, () => () => { unsubscribe(); dispose() })
  }
}
