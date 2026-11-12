/**
 * `/company-settings` 人命令：读写项目启动策略（`.dsh-company/startup.json`）。
 *
 * 为什么要有命令：面板是主入口，但人和 agent 都需要一个无 UI 的出口（排障、脚本、模型自检）；
 * 它同时是 client → host 的**写通道**（浏览器面板经 `remote.commands.execute` 发它）。
 * 读不走命令：每次读都往会话里写 `command/run`，面板一打开就多一个命令条；读走 `workspaceFiles`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { blockedCompanyText } from './blocked-text.ts'
import { commandWorkspace, type CommandAgent } from './command-workspace.ts'
import {
  clearStartupSettings,
  isStartupField,
  parseStartupSettings,
  STARTUP_FIELDS,
  type StartupField,
  type StartupSettings,
} from '../../lib/startup-settings.ts'
import {
  checkWikiPointer,
  enumerateStartupOptions,
  readStartupSettings,
  refreshStartupOptions,
  writeStartupSettings,
} from '../startup/startup-store.ts'
import type { WikiProblem } from '../../lib/startup-settings.ts'

/** 用法行。 */
export const SETTINGS_USAGE = '用法：/company-settings [show | set <productType|deliveryMode|wiki> <值|auto> | reset]'

export type ParsedSettingsCommand =
  | { readonly kind: 'show' }
  | { readonly kind: 'reset' }
  | { readonly kind: 'set'; readonly field: StartupField; readonly value: string | null }
  | { readonly kind: 'error'; readonly text: string }

/**
 * 解析子命令。
 * @param rawInput - 斜杠后的原始输入。
 * @returns 归一化动作；非法输入给用法错误。
 */
export function parseSettingsCommand(rawInput: string): ParsedSettingsCommand {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens.length === 0) return { kind: 'show' }
  const [head] = tokens
  if (head === 'show') return tokens.length === 1 ? { kind: 'show' } : { kind: 'error', text: SETTINGS_USAGE }
  if (head === 'reset') return tokens.length === 1 ? { kind: 'reset' } : { kind: 'error', text: SETTINGS_USAGE }
  if (head !== 'set') return { kind: 'error', text: SETTINGS_USAGE }
  // `set wiki` 带空格路径时，值取剩余全体（wiki 是指针，可以是带空格的路径）。
  const field = tokens[1]
  if (field === undefined || tokens.length < 3) return { kind: 'error', text: SETTINGS_USAGE }
  if (!isStartupField(field)) {
    return { kind: 'error', text: `未知字段「${field}」；可用：${STARTUP_FIELDS.join(' / ')}` }
  }
  const raw = tokens.slice(2).join(' ')
  const value = raw === 'auto' ? null : raw
  return { kind: 'set', field, value }
}

export interface SettingsCommandOptions {
  readonly workspace: string
  readonly dataBlocked: boolean
  readonly blockedReason?: string
  /** pack 的 `content/`（枚举可选项用）。 */
  readonly contentDir?: string
  /** 人可见文案按当前公司语言取（zh 缺省）。 */
  readonly text: (zh: string, en: string) => string
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
  ctx.commands.register({
    name: 'company-settings',
    description: '项目启动策略：产品类型 / 交付模式 / 参考资料 wiki（auto = 不约束）',
    input: { hint: 'show | set <field> <value|auto> | reset' },
    handler: async ({ rawInput, agent }: { readonly rawInput: string, readonly agent?: CommandAgent }) => {
      const workspace = commandWorkspace(options.workspace, agent)
      if (workspace === '') {
        return {
          kind: 'error' as const,
          text: options.dataBlocked
            ? blockedCompanyText(options.blockedReason, '设置')
            : text('未指定 workspace；先选 workspace 再设置。', 'No workspace yet; pick a workspace before editing startup settings.'),
        }
      }
      const parsed = parseSettingsCommand(rawInput)
      if (parsed.kind === 'error') return { kind: 'error' as const, text: text(parsed.text, parsed.text) }

      const current = readStartupSettings(workspace)
      if (parsed.kind === 'show') {
        const available = enumerateStartupOptions(options.contentDir)
        const wikiCheck = checkWikiPointer(workspace, current.wiki)
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
            `当前：${describe(current)}\n${wikiLine}\n可选 产品类型：${available.productTypes.join(' / ') || '（无）'}\n可选 交付模式：${available.deliveryModes.join(' / ') || '（无）'}`,
            `Current: ${describe(current)}\n${wikiLine}\nProduct types: ${available.productTypes.join(' / ') || '(none)'}\nDelivery modes: ${available.deliveryModes.join(' / ') || '(none)'}`,
          ),
        }
      }

      if (parsed.kind === 'reset') {
        const next = clearStartupSettings(new Date().toISOString())
        writeStartupSettings(workspace, next)
        refreshStartupOptions(workspace, options.contentDir)
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
      writeStartupSettings(workspace, parseStartupSettings(JSON.stringify(next)))
      refreshStartupOptions(workspace, options.contentDir)
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
}
