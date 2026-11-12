/**
 * `/req check <slug>` 人命令：读 workspace 里的五层需求文档 + meta，跑编号/追溯校验
 * （判据 = lib/requirements-check.ts）。
 *
 * 为什么是命令而不是 skill 清单：R10 的强制点要求「操作员跑、角色不自证」——编号/层/追溯是
 * 机械不变量，模型自查会漂；命令随 pack 发布，用户部署里也能用（与 `/prd check` 同一载体）。
 * 分工：`/prd check` 管 MRD/PRD 结构（no-go/defer、AC、changeLog），`/req check` 管编号/层/
 * 追溯/退役词/计数（五层全链）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { blockedCompanyText } from './blocked-text.ts'
import { commandWorkspace, type CommandAgent } from './command-workspace.ts'
import { contentMemberFile, isSafeContentId } from './content-id.ts'
import { resolveDeliverablePath } from './deliverable-path.ts'
import { checkRequirements, isLayer, type MotionDoc } from '../../lib/requirements-check.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'
import { yamlScalar } from '../../lib/yaml-scalar.ts'

export const REQ_USAGE = '用法：/req check <deliverables 目录名>（读 .dsh-company/deliverables/<name>/drafts/{mrd,strs,prd,syrs,irs,vv-plan}.md + meta.md）'

/** 需求文档清单（存在即读；缺的不报错——缺层由 checker 的 `需求层` 声明判）。 */
const REQ_DOCS = ['mrd.md', 'strs.md', 'prd.md', 'syrs.md', 'irs.md', 'vv-plan.md', 'allocation.md'] as const

export type ParsedReqCheck =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly text: string }

/** 解析 `check <slug>`；slug 只认一个 token（目录名）。 */
export function parseReqCheck(rawInput: string): ParsedReqCheck {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens[0] !== 'check' || tokens.length !== 2) return { ok: false, text: REQ_USAGE }
  return { ok: true, slug: tokens[1] as string }
}

export interface ReqCommandOptions {
  readonly dataBlocked: boolean
  /** dataBlocked 的人可读原因（BUG-058）；缺省回退到通用措辞。 */
  readonly blockedReason?: string
  readonly workspace: string
  /** pack 的 content 目录；给了才读产品类型包的 check-rules（缺省 = 五层默认）。 */
  readonly contentDir?: string
  /** 测试注入；缺省 = 真实校验器。 */
  readonly check?: typeof checkRequirements
}

/** 产品类型包里的编号规则（与五层默认解耦）。 */
interface ProductTypeRules {
  readonly productType?: string
  readonly layers?: readonly string[]
  readonly defaultLayers?: readonly string[]
  readonly retiredPrefixes?: readonly string[]
}

/** 产品类型解析结果：来源 / 规则 / 错误（未知类型不静默回落）。 */
interface ProductTypeResolution {
  readonly rules: ProductTypeRules | null
  readonly id: string | null
  readonly source: 'motion' | 'company' | null
  readonly error: string | null
}

/** 读 `productType:` 行；模板占位 `<...>` 视为未声明。 */
function parseProductType(text: string | undefined): string | null {
  if (text === undefined) return null
  const match = /^productType\s*[:：]\s*(.+)$/m.exec(text)
  const value = yamlScalar(match?.[1] ?? '')
  if (value === '' || (value.startsWith('<') && value.endsWith('>'))) return null
  return value
}

/** 读 `deliveryMode:` 行；缺省 = productized（不阻塞旧动议）。 */
function parseDeliveryMode(text: string | undefined): string {
  if (text === undefined) return 'productized'
  const match = /^deliveryMode\s*[:：]\s*(.+)$/m.exec(text)
  const value = yamlScalar(match?.[1] ?? '')
  if (value === '' || (value.startsWith('<') && value.endsWith('>'))) return 'productized'
  return value
}

/** 读 meta 的 `layers:` 声明（空 = 未声明）。 */
function parseDeclaredLayers(text: string | undefined): string[] {
  if (text === undefined) return []
  const match = /^layers:\s*(.*)$/m.exec(text)
  if (match === null) return []
  return (match[1] ?? '').split(/[,，、;；\s]+/).map(item => item.trim()).filter(item => item !== '')
}

/** 是否显式声明了真实交付模式（缺省/占位符不算）。 */
function hasDeclaredDeliveryMode(text: string | undefined): boolean {
  if (text === undefined) return false
  const match = /^deliveryMode\s*[:：]\s*(.+)$/m.exec(text)
  const value = yamlScalar(match?.[1] ?? '')
  return value !== '' && !(value.startsWith('<') && value.endsWith('>'))
}

/** v1 交付提醒文档：优先读 delivery-rules 的 `v1Reminder`，缺规则时用内置两条兜底。 */
function deliveryReminderFiles(contentDir: string | undefined, mode: string): string[] {
  const fallback: Record<string, string[]> = {
    'project-services': ['sow.md', 'uat.md'],
    'managed-service': ['sla.md', 'runbook.md'],
  }
  if (contentDir === undefined) return fallback[mode] ?? []
  if (!isSafeContentId(mode) || !availableDeliveryModes(contentDir).includes(mode)) return fallback[mode] ?? []
  const rulesPath = contentMemberFile(contentDir, 'delivery-modes', mode, 'delivery-rules.json')
  if (rulesPath === null) return fallback[mode] ?? []
  try {
    const rules = JSON.parse(readFileSync(rulesPath, 'utf8')) as {
      v1Reminder?: unknown
      documents?: Record<string, { file?: unknown }>
    }
    const docs = rules.documents ?? {}
    const keys = Array.isArray(rules.v1Reminder) ? rules.v1Reminder : Object.keys(docs)
    return keys
      .map(key => docs[String(key)]?.file)
      .filter((file): file is string => typeof file === 'string' && /^drafts\/[a-z0-9-]+\.md$/.test(file))
      .map(file => file.replace(/^drafts\//, ''))
  } catch {
    return fallback[mode] ?? []
  }
}

/** 盘上可用的产品类型 id（只用于错误提示）。 */
function availableProductTypes(contentDir: string): string[] {
  try {
    return readdirSync(join(contentDir, 'product-types'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    return []
  }
}

/** 盘上可用的交付模式 id（只用于错误提示；productized 是默认，不建包）。 */
function availableDeliveryModes(contentDir: string): string[] {
  try {
    return readdirSync(join(contentDir, 'delivery-modes'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
  } catch {
    return []
  }
}

/**
 * 解析当前动议的产品类型规则：动议 `meta.md` 的 `产品类型` 优先，回落 `company.md` 的
 * `productType`；都没有 = 五层默认。声明了类型但 check-rules 不在 = 报错，不静默用错规则。
 */
function resolveProductType(contentDir: string | undefined, workspace: string, root: string): ProductTypeResolution {
  if (contentDir === undefined) return { rules: null, id: null, source: null, error: null }
  const motionType = parseProductType(readIfExists(join(root, 'meta.md')))
  const companyType = parseProductType(readIfExists(join(workspace, RUN_BUNDLE_PATHS.company)))
  const id = motionType ?? companyType
  const source = motionType !== null ? 'motion' : companyType !== null ? 'company' : null
  if (id === null) return { rules: null, id: null, source: null, error: null }
  // 类型 id 来自模型可写文件：必须是盘上可用的单段成员，不拿它拼 content 外路径。
  const available = availableProductTypes(contentDir)
  const where = source === 'motion' ? '动议 meta.md' : 'company.md'
  if (!isSafeContentId(id) || !available.includes(id)) {
    return {
      rules: null,
      id,
      source,
      error: `未知产品类型「${id}」（来自 ${where}）；可用类型：${available.length > 0 ? available.join(' / ') : '（无）'}`,
    }
  }
  const rulesPath = contentMemberFile(contentDir, 'product-types', id, 'check-rules.json')
  const rulesText = rulesPath === null ? undefined : readIfExists(rulesPath)
  if (rulesText === undefined) {
    return { rules: null, id, source, error: `产品类型「${id}」的 check-rules.json 缺失` }
  }
  try {
    return { rules: JSON.parse(rulesText) as ProductTypeRules, id, source, error: null }
  } catch {
    return { rules: null, id, source, error: `产品类型「${id}」的 check-rules.json 不可解析` }
  }
}

const readIfExists = (path: string): string | undefined => {
  try {
    return statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined
  } catch {
    return undefined
  }
}

/** 注册 `/req` 命令。 */
export function registerReqCommand(ctx: Context, options: ReqCommandOptions): void {
  const check = options.check ?? checkRequirements
  ctx.commands.register({
    name: 'req',
    description: '需求编号与追溯校验：层/定义形态、重复/悬空/退役词/孤儿/覆盖/计数（操作员命令，角色不自证）',
    input: { hint: 'check <deliverables 目录名>' },
    handler: async ({ rawInput, agent }: { readonly rawInput: string, readonly agent?: CommandAgent }) => {
      const workspace = commandWorkspace(options.workspace, agent)
      if (workspace === '') {
        return {
          kind: 'error' as const,
          text: options.dataBlocked
            ? blockedCompanyText(options.blockedReason, '校验')
            : '未指定 workspace；先选 workspace 再校验。',
        }
      }
      const parsed = parseReqCheck(rawInput)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const resolved = resolveDeliverablePath(workspace, parsed.slug)
      if (!resolved.ok) return { kind: 'error' as const, text: resolved.text }
      const { root, dir } = resolved
      const docs: MotionDoc[] = []
      for (const name of REQ_DOCS) {
        const text = readIfExists(join(dir, name))
        if (text !== undefined) docs.push({ rel: `drafts/${name}`, text })
      }
      if (docs.length === 0) {
        return { kind: 'error' as const, text: `缺需求文档：${dir}（至少要有 mrd.md / strs.md / prd.md）` }
      }
      const resolution = resolveProductType(options.contentDir, workspace, root)
      if (resolution.error !== null) {
        return { kind: 'error' as const, text: resolution.error }
      }
      const rules = resolution.rules
      // 回落不再静默（BUG-062）：回执点名来源，用户能看见「没在 meta 声明」。
      const typeNote = resolution.id === null
        ? ''
        : resolution.source === 'motion'
          ? `；动议类型 = ${resolution.id}（meta.md）`
          : `；动议类型 = ${resolution.id}（company.md 默认，未在 meta 声明）`
      const metaText = readIfExists(join(root, 'meta.md'))
      const deliveryMode = parseDeliveryMode(metaText)
      if (options.contentDir !== undefined && deliveryMode !== 'productized'
        && !existsSync(join(options.contentDir, 'delivery-modes', deliveryMode))) {
        const available = ['productized', ...availableDeliveryModes(options.contentDir)]
        return {
          kind: 'error' as const,
          text: `未知交付模式「${deliveryMode}」（来自 meta.md）；可用：${available.join(' / ')}`,
        }
      }
      const deliveryDeclared = hasDeclaredDeliveryMode(metaText)
      const deliveryNote = deliveryMode === 'project-services'
        ? '；交付模式 = project-services（SOW/UAT/RACI 归 COO；项目经济性归 CFO；文档见 content/delivery-modes/project-services/）'
        : deliveryMode === 'managed-service'
          ? '；交付模式 = managed-service（SLA/值班/月报归 COO；续费经济性归 CFO；文档见 content/delivery-modes/managed-service/）'
          : `；交付模式 = ${deliveryMode}${deliveryDeclared ? '' : '（默认）'}`
      if (rules !== null && rules.layers !== undefined) {
        const allowed = new Set(rules.layers)
        const unsupported = parseDeclaredLayers(metaText).filter(isLayer).filter(layer => !allowed.has(layer))
        if (unsupported.length > 0) {
          return {
            kind: 'error' as const,
            text: `产品类型「${rules.productType ?? resolution.id ?? '未知'}」不支持需求层 ${unsupported.join('/')}；可用层：${rules.layers.join('/')}`,
          }
        }
      }
      const hasDoc = (name: string): boolean => existsSync(join(dir, name))
      const deliveryWarnings: string[] = []
      if (deliveryMode === 'project-services' || deliveryMode === 'managed-service') {
        const missing = deliveryReminderFiles(options.contentDir, deliveryMode).filter(name => !hasDoc(name))
        if (missing.length > 0) deliveryWarnings.push(`缺 ${missing.join(' / ')}（${deliveryMode} 需要）`)
      } else if (hasDoc('sow.md') || hasDoc('sla.md')) {
        deliveryWarnings.push('productized 动议出现 SOW/SLA 文档，确认交付模式是否选错')
      }
      const deliveryWarningNote = deliveryWarnings.length === 0 ? '' : `；交付提醒：${deliveryWarnings.join('；')}`
      const customLayers = (rules?.layers ?? []).filter(layer => !isLayer(layer))
      if (rules !== null && customLayers.length > 0) {
        return {
          kind: 'success' as const,
          text: `本产品类型（${rules.productType ?? '未知'}）不走五层编号体系（层 = ${(rules.layers ?? []).join('/')}）；按 product-types/${rules.productType ?? ''}/overview.md 的文档链自查。`,
        }
      }
      const checkOptions = rules === null
        ? {}
        : {
            ...(rules.defaultLayers === undefined ? {} : { defaultLayers: rules.defaultLayers.filter(isLayer) }),
            ...(rules.retiredPrefixes === undefined ? {} : { retiredPrefixes: rules.retiredPrefixes }),
          }
      const result = check({ docs, ...(metaText === undefined ? {} : { meta: { rel: 'meta.md', text: metaText } }) }, checkOptions)
      if (result.skipped) {
        return { kind: 'success' as const, text: `编号校验跳过（${parsed.slug}）：旧动议只读豁免（skipped）——${result.reason}。` }
      }
      if (!result.ok) {
        const detail = result.errors.map(error => `- ${error}`).join('\n')
        return { kind: 'error' as const, text: `编号校验失败（${parsed.slug}）：\n${detail}` }
      }
      const { counts, definitions, edges } = result.index
      return {
        kind: 'success' as const,
        text: `编号校验通过（${parsed.slug}）：MR ${String(counts.MR)} / REQ ${String(counts.REQ)} / IF ${String(counts.IF)} / TC ${String(counts.TC)} / AC ${String(counts.AC)}；层 = ${result.layers.join('/')}${typeNote}${deliveryNote}${deliveryWarningNote}；索引 = ${String(definitions.length)} 条定义 / ${String(edges.length)} 条追溯。`,
      }
    },
  })
}
