/**
 * 交付闸门：`present` 之前跑 `/prd check` 的同一套判据（2026-11-13 用户批准的方案 A）。
 *
 * 为什么放在 host：`/prd check` 是操作员命令，但**没人保证它真的跑过**——2026-11-13 一场真实
 * 硬件动议交付了一张 33 条红的 PRD（52KB JSON 账本 + 21KB 正文副本），用户是第一个验收员。
 * `tools/pre-execute` 能在调用落地前拒绝，所以把校验放在 present 的前置面上：红 → deny，
 * 把错误原样交给模型；不是"提醒一下"的软约束。
 *
 * 边界：只拦 `present`；只对**声明了 `numbering: identity` 的动议**生效（旧动议只读豁免，
 * 与 `/req check` 同口径）；文件缺失/读失败一律放行（闸门不能把正常交付卡死）。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision } from '@deepseek-ai/dsh-tools'
import { isAbsolute, join, sep } from 'node:path'
import { readTextInside } from '../fs/safe-file.ts'
import { validateProductDocs } from '../../lib/prd-check.ts'

/** 闸门只读这次调用的三件事（结构最小面，测试可直接构造）。 */
export interface GateToolCall {
  readonly name: string
  readonly arguments: unknown
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
  readonly readText: (root: string, path: string) => string | undefined
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

/** 从呈现路径里解出 `<workspace>/.dsh-company/deliverables/<slug>`；不是公司的成品路径 → undefined。 */
export function deliverableOf(path: string, cwd: string | undefined): { readonly slug: string; readonly dir: string; readonly companyRoot: string } | undefined {
  const absolute = isAbsolute(path) ? path : cwd === undefined ? undefined : join(cwd, path)
  if (absolute === undefined) return undefined
  const parts = absolute.split(sep)
  const companyIndex = parts.indexOf('.dsh-company')
  if (companyIndex === -1) return undefined
  if (parts[companyIndex + 1] !== 'deliverables') return undefined
  const slug = parts[companyIndex + 2]
  if (slug === undefined || slug === '') return undefined
  return {
    slug,
    dir: join(parts.slice(0, companyIndex + 3).join(sep)),
    companyRoot: parts.slice(0, companyIndex + 1).join(sep),
  }
}

/** 读 meta.md 的 `numbering:` 标记；缺失 = 旧动议（只读豁免）。 */
function numberingDeclared(meta: string | undefined): boolean {
  return meta !== undefined && /^numbering:\s*\S/m.test(meta)
}

/**
 * 对一次工具调用做闸门判断（纯函数，便于 keyless 直测）。
 * @returns deny 决定；undefined = 放行。
 */
export function gateToolCall(exec: GateToolCall, deps: PrdGateDeps): PreToolDecision | undefined {
  if (exec.name !== 'present') return undefined
  const cwd = exec.agent?.session?.header?.cwd
  const seen = new Set<string>()
  for (const path of presentedPaths(exec.arguments)) {
    const target = deliverableOf(path, cwd)
    if (target === undefined || seen.has(target.slug)) continue
    seen.add(target.slug)
    const meta = deps.readText(target.companyRoot, join(target.dir, 'meta.md'))
    if (!numberingDeclared(meta)) continue
    const mrd = deps.readText(target.companyRoot, join(target.dir, 'drafts/mrd.md'))
    const prd = deps.readText(target.companyRoot, join(target.dir, 'drafts/prd.md'))
    if (mrd === undefined || prd === undefined) continue
    const result = deps.check(mrd, prd)
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

/** 注册交付闸门；任何内部错误都放行（不能把正常交付卡死）。 */
export function registerPrdGate(ctx: Context, overrides: Partial<PrdGateDeps> = {}): void {
  const deps: PrdGateDeps = { check: validateProductDocs, readText: readTextInside, ...overrides }
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    try {
      const verdict = gateToolCall(exec as unknown as GateToolCall, deps)
      if (verdict !== undefined) return verdict
    } catch {
      // 闸门是旁路：读取/解析失败放行，由 /prd check 的人类命令给出可操作错误。
    }
    return next()
  })
}
