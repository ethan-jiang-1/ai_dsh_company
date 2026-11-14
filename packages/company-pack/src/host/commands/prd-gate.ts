/**
 * 交付闸门：`present` 之前跑 `/prd check` 的同一套判据（2026-11-13 用户批准的方案 A）。
 *
 * 为什么放在 host：`/prd check` 是操作员命令，但**没人保证它真的跑过**——2026-11-13 一场真实
 * 硬件动议交付了一张 33 条红的 PRD（52KB JSON 账本 + 21KB 正文副本），用户是第一个验收员。
 * `tools/pre-execute` 能在调用落地前拒绝，所以把校验放在 present 的前置面上：红 → deny，
 * 把错误原样交给模型；不是"提醒一下"的软约束。
 *
 * 边界：只拦 `present`；只对**声明了 `numbering:` 的动议**生效（整行缺失 = 旧动议只读豁免）。
 *
 * 2026-11-14（BUG-154/155/156）：闸门不许自带第二套事实源——
 * - cwd 与 `present` 同读 `ctx.workingDirectory.ensure`（会话 `cd` 后 header.cwd 会过期）；
 * - numbering 与 `/req check` 同读 `numberingMarker`（空值/非法值照报，不折成「没有声明」）；
 * - 读取用 `readCompanyFileAt` 的三态（missing 才豁免；symlink/越界/非文件一律 deny）。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision } from '@deepseek-ai/dsh-tools'
import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import { readCompanyFileAt, resolveCompanySegments, verifyCompanySubpathAt } from '../run-bundle/company-root.ts'
import type { CompanyFileRead } from '../run-bundle/company-root.ts'
import { numberingMarker, numberingVocabularyError } from '../../lib/requirements-check.ts'
import { validateProductDocs } from '../../lib/prd-check.ts'

/** 闸门只读这次调用的几件事（结构最小面，测试可直接构造）。 */
export interface GateToolCall {
  readonly name: string
  readonly arguments: unknown
  /** 已解析的当前工作目录（`registerPrdGate` 用 workingDirectory 服务注入；缺省回退 header.cwd）。 */
  readonly cwd?: string
  readonly agent?: {
    readonly session?: {
      readonly header?: {
        readonly cwd?: string
      }
    }
  } | undefined
}

/** 注入面（keyless 可测）。 */
export interface PrdGateDeps {
  readonly check: typeof validateProductDocs
  readonly readFile: (companyHome: string, rel: string) => CompanyFileRead
}

/** 从 present 的参数里取文件路径（schema = `files: [{ path, description? }]`）。 */
function presentedPaths(args: unknown): readonly string[] {
  if (typeof args !== 'object' || args === null) return []
  const files = (args as { files?: unknown }).files
  if (!Array.isArray(files)) return []
  return files
    .map(file => (typeof file === 'object' && file !== null ? (file as { path?: unknown }).path : undefined))
    .filter((path): path is string => typeof path === 'string' && path.trim() !== '')
}

type DeliverablePathInspection =
  | { readonly kind: 'non-deliverable' }
  | { readonly kind: 'missing-cwd' }
  | { readonly kind: 'unsafe'; readonly slug: string; readonly reason: string }
  | {
    readonly kind: 'target'
    readonly slug: string
    readonly dir: string
    readonly companyRoot: string
    readonly relInsideCompany: string
  }

function inspectDeliverablePath(path: string, cwd: string | undefined): DeliverablePathInspection {
  const normPath = path.replaceAll('\\', '/')
  const isAbs = normPath.startsWith('/') || /^[A-Za-z]:\//.test(normPath)
  const rawNonEmpty = normPath.split('/').filter(part => part !== '' && part !== '.')
  const rawCompanyIndex = rawNonEmpty.indexOf('.dsh-company')
  const mentionsDeliverables = rawCompanyIndex !== -1 && rawNonEmpty[rawCompanyIndex + 1] === 'deliverables'
  const rawSlugHint = mentionsDeliverables ? (rawNonEmpty[rawCompanyIndex + 2] ?? 'deliverables') : 'deliverables'

  if (!isAbs && cwd === undefined) {
    return mentionsDeliverables ? { kind: 'missing-cwd' } : { kind: 'non-deliverable' }
  }
  const combined = isAbs ? normPath : `${cwd!.replaceAll('\\', '/').replace(/\/+$/, '')}/${normPath}`
  const rootMatch = /^(\/|[A-Za-z]:\/)/.exec(combined)
  if (rootMatch === null) {
    return mentionsDeliverables ? { kind: 'missing-cwd' } : { kind: 'non-deliverable' }
  }
  const rootPrefix = rootMatch[1] ?? ''
  const rawParts = combined.slice(rootPrefix.length).split('/')
  const companyIndex = rawParts.indexOf('.dsh-company')
  if (companyIndex === -1) return { kind: 'non-deliverable' }

  const afterParts = rawParts.slice(companyIndex + 1)
  const afterNonEmpty = afterParts.filter(part => part !== '' && part !== '.')
  const combinedMentionsDeliverables = mentionsDeliverables || afterNonEmpty[0] === 'deliverables'
  const slugHint = afterNonEmpty[0] === 'deliverables' && afterNonEmpty[1] !== undefined && afterNonEmpty[1] !== '..'
    ? afterNonEmpty[1]
    : rawSlugHint
  const relInsideCompany = afterParts.join('/')

  const preSegments: string[] = []
  for (const part of rawParts.slice(0, companyIndex)) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (preSegments.length > 0) {
        const prefixOnDisk = `${rootPrefix}${preSegments.join('/')}`
        const poppedName = preSegments.pop() as string
        try {
          const stat = lstatSync(prefixOnDisk)
          if (stat.isSymbolicLink() || !stat.isDirectory()) {
            return combinedMentionsDeliverables
              ? {
                kind: 'unsafe',
                slug: slugHint,
                reason: stat.isSymbolicLink()
                  ? `路径前缀段含符号链接目录回退（${poppedName}/..），OS 路径消解与词法路径不一致`
                  : `路径前缀段不是目录（${poppedName}/..）`,
              }
              : { kind: 'non-deliverable' }
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            return combinedMentionsDeliverables
              ? { kind: 'unsafe', slug: slugHint, reason: `无法校验路径前缀段（${poppedName}）` }
              : { kind: 'non-deliverable' }
          }
        }
      }
      continue
    }
    preSegments.push(part)
  }
  const companyRoot = `${rootPrefix}${preSegments.join('/')}${preSegments.length > 0 ? '/' : ''}.dsh-company`

  let segments: readonly string[]
  try {
    segments = resolveCompanySegments(relInsideCompany, { allowRoot: false, stripCompanyPrefix: false }).segments
  } catch (error) {
    return combinedMentionsDeliverables
      ? { kind: 'unsafe', slug: slugHint, reason: (error as Error).message }
      : { kind: 'non-deliverable' }
  }
  if (segments[0] !== 'deliverables') {
    return combinedMentionsDeliverables
      ? { kind: 'unsafe', slug: slugHint, reason: '交付物路径经由 `..` 回退出了 deliverables 目录' }
      : { kind: 'non-deliverable' }
  }
  const slug = segments[1]
  if (slug === undefined || slug === '') {
    return { kind: 'unsafe', slug: 'deliverables', reason: '交付物路径缺少 <slug> 目录或回退到了 deliverables 根' }
  }
  return {
    kind: 'target',
    slug,
    dir: `${companyRoot}/deliverables/${slug}`,
    companyRoot,
    relInsideCompany,
  }
}

/** 从呈现路径里解出 `<workspace>/.dsh-company/deliverables/<slug>`；不是公司的成品路径 → undefined。 */
export function deliverableOf(path: string, cwd: string | undefined): { readonly slug: string; readonly dir: string; readonly companyRoot: string } | undefined {
  const inspected = inspectDeliverablePath(path, cwd)
  if (inspected.kind !== 'target') return undefined
  return { slug: inspected.slug, dir: inspected.dir, companyRoot: inspected.companyRoot }
}

/** 形状挡住校验：不能当旧动议跳过，也不把读者指向内容缺失。 */
function denyShape(slug: string, name: string, detail: string): PreToolDecision {
  return {
    kind: 'deny',
    reason: `交付前 PRD 校验被文件形状挡住（${slug}）：${name} ${detail}。\n`
      + `闸门只读公司盘内的普通文件（不跟随 symlink、不越出 \`.dsh-company\`）；把文件放回公司盘内并换成普通文件后重试。`,
  }
}

/**
 * 对一次工具调用做闸门判断（纯函数，便于 keyless 直测）。
 * @returns deny 决定；undefined = 放行。
 */
export function gateToolCall(exec: GateToolCall, deps: PrdGateDeps): PreToolDecision | undefined {
  if (exec.name !== 'present') return undefined
  const cwd = exec.cwd ?? exec.agent?.session?.header?.cwd
  const seen = new Set<string>()
  for (const path of presentedPaths(exec.arguments)) {
    const inspected = inspectDeliverablePath(path, cwd)
    if (inspected.kind === 'non-deliverable') continue
    if (inspected.kind === 'missing-cwd') {
      // 相对路径 + 公司成品形状但拿不到 cwd：旧行为是静默跳过（BUG-155），现在必须说清楚。
      return {
        kind: 'deny',
        reason: `present 的路径 ${path} 是相对路径，但本次调用解析不到工作目录。\n`
          + `改用绝对路径 present，或先 cd 到项目目录再试。`,
      }
    }
    if (inspected.kind === 'unsafe') return denyShape(inspected.slug, path, inspected.reason)
    try {
      verifyCompanySubpathAt(inspected.companyRoot, inspected.relInsideCompany)
    } catch (error) {
      return denyShape(inspected.slug, path, (error as Error).message)
    }
    const target = inspected
    if (seen.has(target.slug)) continue
    seen.add(target.slug)
    const base = join('deliverables', target.slug)
    const meta = deps.readFile(target.companyRoot, join(base, 'meta.md'))
    if (meta.kind === 'missing') continue
    if (meta.kind === 'unsafe') return denyShape(target.slug, 'meta.md', meta.reason)
    const numbering = numberingMarker(meta.text)
    if (!numbering.declared) continue
    if (!numbering.valid) {
      return {
        kind: 'deny',
        reason: `交付前 PRD 校验无法开始：${target.slug} 的 ${numberingVocabularyError(numbering.value)}。\n`
          + `修 meta.md 的 numbering（新动议写 \`identity\`；旧动议整行删除），再跑 \`/req check ${target.slug}\` 与 \`/prd check ${target.slug}\`。`,
      }
    }
    const mrd = deps.readFile(target.companyRoot, join(base, 'drafts/mrd.md'))
    const prd = deps.readFile(target.companyRoot, join(base, 'drafts/prd.md'))
    for (const [name, read] of [['drafts/mrd.md', mrd], ['drafts/prd.md', prd]] as const) {
      if (read.kind === 'unsafe') return denyShape(target.slug, name, read.reason)
    }
    // 缺草稿：闸门不能把正常交付卡死；内容面由 `/prd check` 的人类命令给可操作错误。
    if (mrd.kind !== 'text' || prd.kind !== 'text') continue
    const result = deps.check(mrd.text, prd.text)
    if (result.ok) continue
    const shown = result.errors.slice(0, 12)
    const more = result.errors.length > shown.length ? `\n- …另有 ${result.errors.length - shown.length} 条，跑 /prd check ${target.slug} 看全量` : ''
    return {
      kind: 'deny',
      reason: `交付前 PRD 校验未过（${target.slug}）：\n- ${shown.join('\n- ')}${more}\n`
        + `先跑 \`/prd check ${target.slug}\` 修完再 present；PRD 定义点 = \`### REQ-###\` 小节（模板 content/templates/prd.md）。`,
    }
  }
  return undefined
}

/** workingDirectory 服务的最小面（缺失时回退 header.cwd）。 */
interface WorkingDirectoryLike {
  readonly ensure?: (agent: unknown, signal?: AbortSignal) => Promise<string>
}

interface PreExecuteLike {
  readonly name: string
  readonly arguments: unknown
  readonly signal?: AbortSignal
  readonly agent?: {
    readonly session?: { readonly header?: { readonly cwd?: string } }
  } | undefined
}

/**
 * 本次调用应使用的 cwd：与 `present` 同读 working directory projection。
 * @param ctx - host context（服务缺席时按 header.cwd 退化）。
 * @param exec - pre-execute 的执行面。
 * @returns 绝对工作目录；解析不到 → undefined。
 */
async function resolveGateCwd(ctx: Context, exec: PreExecuteLike): Promise<string | undefined> {
  const headerCwd = exec.agent?.session?.header?.cwd
  const lookup = (ctx as { get?: (name: string) => unknown }).get
  const service = typeof lookup === 'function' ? lookup.call(ctx, 'workingDirectory') as WorkingDirectoryLike | undefined : undefined
  if (service?.ensure === undefined || exec.agent === undefined) return headerCwd
  try { return await service.ensure(exec.agent, exec.signal) } catch { return headerCwd }
}

/** 注册交付闸门；读取/解析失败放行（不能把正常交付卡死），但形状不安全与坏 numbering 会 deny。 */
export function registerPrdGate(ctx: Context, overrides: Partial<PrdGateDeps> = {}): void {
  const deps: PrdGateDeps = { check: validateProductDocs, readFile: readCompanyFileAt, ...overrides }
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    try {
      // SAFETY: dsh 的 pre-execute 事件载荷没有导出结构化类型；这里一次收窄成「name/arguments/agent.cwd/signal」窄面，
      // 读不到的字段一律当缺席（外层 try/catch 兜底放行，不会把正常交付卡死）。
      const raw = exec as unknown as PreExecuteLike
      const cwd = await resolveGateCwd(ctx, raw)
      const call: GateToolCall = { ...(raw as GateToolCall), ...(cwd === undefined ? {} : { cwd }) }
      const verdict = gateToolCall(call, deps)
      if (verdict !== undefined) return verdict
    } catch {
      // 闸门是旁路：读取/解析失败放行，由 /prd check 的人类命令给出可操作错误。
    }
    return next()
  })
}
