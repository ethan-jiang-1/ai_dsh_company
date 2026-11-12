/**
 * `/delivery check <slug>` 人命令：按动议 `交付模式` 读 `content/delivery-modes/<id>/delivery-rules.json`，
 * 检查 required documents 与 requiredSections 是否在场。
 *
 * 为什么是命令而不是 skill：交付文档是否齐是可机械判定的；`productized` 无交付文档要求，
 * `project-services` / `managed-service` 缺 SOW/UAT/SLA/Runbook 等应在操作员收口时红，而不是靠角色自证。
 */
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { blockedCompanyText } from './blocked-text.ts'
import { commandWorkspace, type CommandAgent } from './command-workspace.ts'
import { resolveDeliverablePath } from './deliverable-path.ts'
import { yamlScalar } from '../../lib/yaml-scalar.ts'

export const DELIVERY_USAGE = '用法：/delivery check <deliverables 目录名>（读 meta.md 的 交付模式 + content/delivery-modes/<id>/delivery-rules.json）'

export type ParsedDeliveryCheck =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly text: string }

/** 解析 `check <slug>`；slug 只认一个 token（目录名）。 */
export function parseDeliveryCheck(rawInput: string): ParsedDeliveryCheck {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens[0] !== 'check' || tokens.length !== 2) return { ok: false, text: DELIVERY_USAGE }
  return { ok: true, slug: tokens[1] as string }
}

export interface DeliveryCommandOptions {
  readonly dataBlocked: boolean
  /** dataBlocked 的人可读原因（BUG-058）；缺省回退到通用措辞。 */
  readonly blockedReason?: string
  readonly workspace: string
  /** pack 的 content 目录；给了才读交付模式规则（缺省 = 只支持 productized）。 */
  readonly contentDir?: string
}

interface DeliveryDocument {
  readonly file?: string
  readonly owner?: string
  readonly template?: string
}

interface DeliveryRules {
  readonly deliveryMode?: string
  readonly documents?: Record<string, DeliveryDocument>
  readonly requiredSections?: Record<string, string[]>
}

/** 读 `deliveryMode:` 行；缺省/占位符 = productized。 */
function parseDeliveryMode(text: string | undefined): string {
  if (text === undefined) return 'productized'
  const match = /^deliveryMode\s*[:：]\s*(.+)$/m.exec(text)
  const value = yamlScalar(match?.[1] ?? '')
  if (value === '' || (value.startsWith('<') && value.endsWith('>'))) return 'productized'
  return value
}

/** 盘上可用的交付模式 id（只用于错误提示）。 */
function availableModes(contentDir: string): string[] {
  try {
    return readdirSync(join(contentDir, 'delivery-modes'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    return []
  }
}

const readIfExists = (path: string): string | undefined => {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : undefined
  } catch {
    return undefined
  }
}

/** 注册 `/delivery` 命令。 */
export function registerDeliveryCommand(ctx: Context, options: DeliveryCommandOptions): void {
  ctx.commands.register({
    name: 'delivery',
    description: '交付模式文档检查：productized 无要求；project-services / managed-service 按 rules 查文档与 section（操作员命令）',
    input: { hint: 'check <deliverables 目录名>' },
    handler: async ({ rawInput, agent }: { readonly rawInput: string, readonly agent?: CommandAgent }) => {
      const workspace = commandWorkspace(options.workspace, agent)
      if (workspace === '') {
        return {
          kind: 'error' as const,
          text: options.dataBlocked
            ? blockedCompanyText(options.blockedReason, '交付检查')
            : '未指定 workspace；先选 workspace 再检查。',
        }
      }
      const parsed = parseDeliveryCheck(rawInput)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const resolved = resolveDeliverablePath(workspace, parsed.slug)
      if (!resolved.ok) return { kind: 'error' as const, text: resolved.text }
      const { root } = resolved
      const metaText = readIfExists(join(root, 'meta.md'))
      if (metaText === undefined) {
        return { kind: 'error' as const, text: `缺 meta.md：${root}（交付模式写在动议户口）` }
      }
      const mode = parseDeliveryMode(metaText)
      if (mode === 'productized') {
        const extras = ['sow.md', 'sla.md'].filter(name => existsSync(join(root, 'drafts', name)))
        return {
          kind: 'success' as const,
          text: extras.length === 0
            ? `交付检查跳过（${parsed.slug}）：productized 无交付文档要求。`
            : `交付检查通过（${parsed.slug}）：productized；提醒：出现 ${extras.join(' / ')}，确认交付模式是否选错。`,
        }
      }
      if (options.contentDir === undefined) {
        return { kind: 'error' as const, text: `无法读取交付模式「${mode}」的规则（contentDir 未配置）。` }
      }
      const rulesPath = join(options.contentDir, 'delivery-modes', mode, 'delivery-rules.json')
      const rulesText = readIfExists(rulesPath)
      if (rulesText === undefined) {
        const available = ['productized', ...availableModes(options.contentDir)]
        return { kind: 'error' as const, text: `未知交付模式「${mode}」；可用：${available.join(' / ')}` }
      }
      let rules: DeliveryRules
      try {
        rules = JSON.parse(rulesText) as DeliveryRules
      } catch {
        return { kind: 'error' as const, text: `交付规则不可解析：${rulesPath}` }
      }
      const errors: string[] = []
      let docs = 0
      let sections = 0
      for (const [key, doc] of Object.entries(rules.documents ?? {})) {
        const file = doc.file
        if (typeof file !== 'string' || !file.startsWith('drafts/')) {
          errors.push(`${key}.file 不是 drafts/<name>.md：${String(file)}`)
          continue
        }
        const path = join(root, file)
        const text = readIfExists(path)
        if (text === undefined) {
          errors.push(`缺 ${key}（${file}）`)
          continue
        }
        docs += 1
        for (const needle of rules.requiredSections?.[key] ?? []) {
          sections += 1
          if (!text.includes(needle)) errors.push(`${key} 缺 section「${needle}」`)
        }
      }
      if (errors.length > 0) {
        return {
          kind: 'error' as const,
          text: `交付检查失败（${parsed.slug}，${mode}）：\n${errors.map(error => `- ${error}`).join('\n')}`,
        }
      }
      return {
        kind: 'success' as const,
        text: `交付检查通过（${parsed.slug}）：交付模式 = ${mode}；文档 ${String(docs)} 份；section ${String(sections)} 条。`,
      }
    },
  })
}
