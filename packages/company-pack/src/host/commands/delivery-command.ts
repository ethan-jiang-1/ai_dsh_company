/**
 * `/delivery check <slug>` 人命令：按动议 `交付模式` 读 `content/delivery-modes/<id>/delivery-rules.json`，
 * 检查 required documents 与 requiredSections 是否在场。
 *
 * 为什么是命令而不是 skill：交付文档是否齐是可机械判定的；`productized` 无交付文档要求，
 * `project-services` / `managed-service` 缺 SOW/UAT/SLA/Runbook 等应在操作员收口时红，而不是靠角色自证。
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { blockedCompanyTextPair } from './blocked-text.ts'
import { registerLocalizedCommand } from './localized-command.ts'
import type { CompanyLanguageState } from '../language/company-language.ts'
import { commandWorkspace, type CommandAgent } from './command-workspace.ts'
import { contentMemberFile, isSafeContentId } from './content-id.ts'
import { isPlainFileInside, readTextInside } from '../fs/safe-file.ts'
import { resolveDeliverablePath } from './deliverable-path.ts'
import { metaScalarField } from '../../lib/docs/requirements-check.ts'
import { scanDocumentDetailed, sectionStructuralText, splitTableRow } from '../../lib/docs/markdown-shape.ts'

export const DELIVERY_USAGE = '用法：/delivery check <deliverables 目录名>（读 meta.md 的 交付模式 + content/delivery-modes/<id>/delivery-rules.json）'
const DELIVERY_USAGE_EN = 'Usage: /delivery check <deliverables-directory> (reads the delivery mode in meta.md + content/delivery-modes/<id>/delivery-rules.json)'

export type ParsedDeliveryCheck =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly text: string }

/** 解析 `check <slug>`；slug 只认一个 token（目录名）。 */
export function parseDeliveryCheck(
  rawInput: string,
  text: (zh: string, en: string) => string = zh => zh,
): ParsedDeliveryCheck {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens[0] !== 'check' || tokens.length !== 2) return { ok: false, text: text(DELIVERY_USAGE, DELIVERY_USAGE_EN) }
  return { ok: true, slug: tokens[1] as string }
}

export interface DeliveryCommandOptions {
  readonly dataBlocked: boolean
  /** dataBlocked 的人可读原因（BUG-058）；缺省回退到通用措辞。 */
  readonly blockedReason?: string
  readonly workspace: string
  /** pack 的 content 目录；给了才读交付模式规则（缺省 = 只支持 productized）。 */
  readonly contentDir?: string
  /** 当前公司语言（可选）：命令面描述/提示/回执随语言（BUG-338）。 */
  readonly language?: CompanyLanguageState
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

/**
 * 必填小节是否以**结构**出现（BUG-373）：围栏/HTML 注释里的模板样例不算。
 * `## x` → 结构标题；`| a | b |` → 结构表行的前缀匹配；其它 → 结构行包含。
 * @param text - 文档全文。
 * @param needle - 规则里的 requiredSections 原串。
 * @returns 结构上存在即 true。
 */
function hasStructuralSection(text: string, needle: string): boolean {
  const wanted = needle.trim()
  const heading = /^#{1,6}\s+(.*)$/.exec(wanted)
  if (heading !== null) return sectionStructuralText(text, heading[1] ?? '') !== undefined
  const scan = scanDocumentDetailed(text)
  if (wanted.startsWith('|')) {
    const cells = splitTableRow(wanted)
    return scan.lines.some(line => {
      if (!line.structural || !line.text.trim().startsWith('|')) return false
      const row = splitTableRow(line.text)
      return cells.length <= row.length && cells.every((cell, index) => row[index] === cell)
    })
  }
  return scan.lines.some(line => line.structural && line.text.includes(wanted))
}

/** 读 `deliveryMode:` 行；缺省/占位符 = productized。 */
function parseDeliveryMode(text: string | undefined): string {
  // 与 `/req check` 同一结构感知判据（BUG-375）：围栏里的示例行不算。
  const field = metaScalarField(text, 'deliveryMode')
  if (!field.declared || field.problem !== null) return 'productized'
  const value = field.value.trim()
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
    return statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined
  } catch {
    return undefined
  }
}

/** 注册 `/delivery` 命令。 */
export function registerDeliveryCommand(ctx: Context, options: DeliveryCommandOptions): void {
  const tr = (zh: string, en: string): string => options.language?.text(zh, en) ?? zh
  const paused = blockedCompanyTextPair(options.blockedReason, '交付检查', 'checking delivery documents')
  const definition = () => ({
    name: 'delivery',
    description: tr(
      '交付模式文档检查：productized 无要求；project-services / managed-service 按 rules 查文档与 section（操作员命令）',
      'Delivery mode document check: productized has no requirement; project-services / managed-service check documents and sections against their rules (operator command)',
    ),
    input: { hint: tr('check <deliverables 目录名>', 'check <deliverables-directory>') },
    handler: async ({ rawInput, agent }: { readonly rawInput: string, readonly agent?: CommandAgent }) => {
      const workspace = commandWorkspace(options.workspace, agent)
      if (workspace === '') {
        return {
          kind: 'error' as const,
          text: options.dataBlocked
            ? tr(paused.zh, paused.en)
            : tr('未指定 workspace；先选 workspace 再检查。', 'No workspace is selected; select a workspace before checking.'),
        }
      }
      const parsed = parseDeliveryCheck(rawInput, tr)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const resolved = resolveDeliverablePath(workspace, parsed.slug, tr)
      if (!resolved.ok) return { kind: 'error' as const, text: resolved.text }
      const { root } = resolved
      const companyRoot = join(workspace, '.dsh-company')
      const metaText = readTextInside(companyRoot, join(root, 'meta.md'))
      if (metaText === undefined) {
        return { kind: 'error' as const, text: tr(`缺 meta.md：${root}（交付模式写在动议户口）`, `Missing meta.md: ${root} (the delivery mode lives with the motion)`) }
      }
      const mode = parseDeliveryMode(metaText)
      if (mode === 'productized') {
        const extras = ['sow.md', 'sla.md'].filter(name => isPlainFileInside(companyRoot, join(root, 'drafts', name)))
        return {
          kind: 'success' as const,
          text: extras.length === 0
            ? tr(`交付检查跳过（${parsed.slug}）：productized 无交付文档要求。`, `Delivery check skipped (${parsed.slug}): productized has no delivery-document requirement.`)
            : tr(`交付检查通过（${parsed.slug}）：productized；提醒：出现 ${extras.join(' / ')}，确认交付模式是否选错。`, `Delivery check passed (${parsed.slug}): productized; note that ${extras.join(' / ')} is present, so confirm the delivery mode is not wrong.`),
        }
      }
      if (options.contentDir === undefined) {
        return { kind: 'error' as const, text: tr(`无法读取交付模式「${mode}」的规则（contentDir 未配置）。`, `Cannot read rules for delivery mode "${mode}" (contentDir is not configured).`) }
      }
      // 模式来自模型可写 meta：先做成员校验，再拼 content 路径；未知/穿越就报错，不读 workspace 规则。
      const available = availableModes(options.contentDir)
      if (!isSafeContentId(mode) || !available.includes(mode)) {
        const choices = ['productized', ...available]
        return { kind: 'error' as const, text: tr(`未知交付模式「${mode}」；可用：${choices.join(' / ')}`, `Unknown delivery mode "${mode}"; available: ${choices.join(' / ')}`) }
      }
      const rulesPath = contentMemberFile(options.contentDir, 'delivery-modes', mode, 'delivery-rules.json')
      const rulesText = rulesPath === null ? undefined : readIfExists(rulesPath)
      if (rulesText === undefined) {
        return { kind: 'error' as const, text: tr(`交付模式「${mode}」的 delivery-rules.json 缺失`, `delivery-rules.json is missing for delivery mode "${mode}"`) }
      }
      let rules: DeliveryRules
      try {
        rules = JSON.parse(rulesText) as DeliveryRules
      } catch {
        return { kind: 'error' as const, text: tr(`交付规则不可解析：${rulesPath}`, `Delivery rules are unparsable: ${rulesPath}`) }
      }
      const errors: string[] = []
      let docs = 0
      let sections = 0
      for (const [key, doc] of Object.entries(rules.documents ?? {})) {
        const file = doc.file
        if (typeof file !== 'string' || !file.startsWith('drafts/')) {
          errors.push(tr(`${key}.file 不是 drafts/<name>.md：${String(file)}`, `${key}.file is not drafts/<name>.md: ${String(file)}`))
          continue
        }
        const path = join(root, file)
        const text = readTextInside(companyRoot, path)
        if (text === undefined) {
          errors.push(tr(`缺 ${key}（${file}）`, `Missing ${key} (${file})`))
          continue
        }
        docs += 1
        for (const needle of rules.requiredSections?.[key] ?? []) {
          sections += 1
          if (!hasStructuralSection(text, needle)) errors.push(tr(`${key} 缺 section「${needle}」`, `${key} is missing section "${needle}"`))
        }
      }
      if (errors.length > 0) {
        return {
          kind: 'error' as const,
          text: tr(`交付检查失败（${parsed.slug}，${mode}）：\n${errors.map(error => `- ${error}`).join('\n')}`, `Delivery check failed (${parsed.slug}, ${mode}):\n${errors.map(error => `- ${error}`).join('\n')}`),
        }
      }
      return {
        kind: 'success' as const,
        text: tr(`交付检查通过（${parsed.slug}）：交付模式 = ${mode}；文档 ${String(docs)} 份；section ${String(sections)} 条。`, `Delivery check passed (${parsed.slug}): delivery mode = ${mode}; ${String(docs)} document(s); ${String(sections)} section(s).`),
      }
    },
  })
  registerLocalizedCommand(ctx, definition, options.language)
}
