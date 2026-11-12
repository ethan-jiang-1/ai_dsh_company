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
  enumerateStartupOptions,
  readStartupSettings,
  refreshStartupOptions,
  writeStartupSettings,
} from '../startup/startup-store.ts'

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
        return {
          kind: 'success' as const,
          text: text(
            `当前：${describe(current)}\n可选 产品类型：${available.productTypes.join(' / ') || '（无）'}\n可选 交付模式：${available.deliveryModes.join(' / ') || '（无）'}`,
            `Current: ${describe(current)}\nProduct types: ${available.productTypes.join(' / ') || '(none)'}\nDelivery modes: ${available.deliveryModes.join(' / ') || '(none)'}`,
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
      return {
        kind: 'success' as const,
        text: text(
          `已设置 ${parsed.field} = ${parsed.value ?? 'auto'}；下一轮生效。`,
          `Set ${parsed.field} = ${parsed.value ?? 'auto'}; effective next turn.`,
        ),
      }
    },
  })
}
