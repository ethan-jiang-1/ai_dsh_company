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
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { blockedCompanyText } from './blocked-text.ts'
import { resolveDeliverablePath } from './deliverable-path.ts'
import { checkRequirements, isLayer, type MotionDoc } from '../../lib/requirements-check.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'

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

/** 读 `产品类型:` / `productType:` 行；模板占位 `<...>` 视为未声明。 */
function parseProductType(text: string | undefined): string | null {
  if (text === undefined) return null
  const match = /^(?:产品类型|productType)\s*[:：]\s*(\S+)\s*$/m.exec(text)
  const value = match?.[1]?.trim() ?? ''
  if (value === '' || (value.startsWith('<') && value.endsWith('>'))) return null
  return value
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
  const rulesText = readIfExists(join(contentDir, 'product-types', id, 'check-rules.json'))
  if (rulesText === undefined) {
    const available = availableProductTypes(contentDir)
    const where = source === 'motion' ? '动议 meta.md' : 'company.md'
    return {
      rules: null,
      id,
      source,
      error: `未知产品类型「${id}」（来自 ${where}）；可用类型：${available.length > 0 ? available.join(' / ') : '（无）'}`,
    }
  }
  try {
    return { rules: JSON.parse(rulesText) as ProductTypeRules, id, source, error: null }
  } catch {
    return { rules: null, id, source, error: `产品类型「${id}」的 check-rules.json 不可解析` }
  }
}

const readIfExists = (path: string): string | undefined => {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : undefined
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
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      if (options.dataBlocked) {
        return { kind: 'error' as const, text: blockedCompanyText(options.blockedReason, '校验') }
      }
      const parsed = parseReqCheck(rawInput)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const resolved = resolveDeliverablePath(options.workspace, parsed.slug)
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
      const resolution = resolveProductType(options.contentDir, options.workspace, root)
      if (resolution.error !== null) {
        return { kind: 'error' as const, text: resolution.error }
      }
      const rules = resolution.rules
      const typeNote = resolution.source === 'motion' ? `；动议类型 = ${String(resolution.id)}` : ''
      const customLayers = (rules?.layers ?? []).filter(layer => !isLayer(layer))
      if (rules !== null && customLayers.length > 0) {
        return {
          kind: 'success' as const,
          text: `本产品类型（${rules.productType ?? '未知'}）不走五层编号体系（层 = ${(rules.layers ?? []).join('/')}）；按 product-types/${rules.productType ?? ''}/overview.md 的文档链自查。`,
        }
      }
      const metaText = readIfExists(join(root, 'meta.md'))
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
        text: `编号校验通过（${parsed.slug}）：MR ${String(counts.MR)} / REQ ${String(counts.REQ)} / IF ${String(counts.IF)} / TC ${String(counts.TC)} / AC ${String(counts.AC)}；层 = ${result.layers.join('/')}${typeNote}；索引 = ${String(definitions.length)} 条定义 / ${String(edges.length)} 条追溯。`,
      }
    },
  })
}
