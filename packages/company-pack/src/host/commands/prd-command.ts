/**
 * `/prd check <slug>` 人命令：读 workspace 里的 MRD/PRD，跑结构校验（判据 = lib/prd-check.ts）。
 *
 * 为什么是命令而不是 skill 清单：编号/追溯/验收/依赖是机械不变量，靠模型自查会漂；
 * 命令随 pack 发布，用户部署里也能用（与 `/deliverables audit` 同一载体）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { blockedCompanyText } from './blocked-text.ts'
import { resolveDeliverablePath } from './deliverable-path.ts'
import { validateProductDocs } from '../../lib/prd-check.ts'

export const PRD_USAGE = '用法：/prd check <deliverables 目录名>（读 .dsh-company/deliverables/<name>/drafts/{mrd,prd}.md）'

export type ParsedPrdCheck =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly text: string }

/** 解析 `check <slug>`；slug 只认一个 token（目录名）。 */
export function parsePrdCheck(rawInput: string): ParsedPrdCheck {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens[0] !== 'check' || tokens.length !== 2) return { ok: false, text: PRD_USAGE }
  return { ok: true, slug: tokens[1] as string }
}

export interface PrdCommandOptions {
  readonly dataBlocked: boolean
  /** dataBlocked 的人可读原因（BUG-058）；缺省回退到通用措辞。 */
  readonly blockedReason?: string
  readonly workspace: string
  /** 测试注入；缺省 = 真实校验器。 */
  readonly check?: typeof validateProductDocs
}

/** 注册 `/prd` 命令。 */
export function registerPrdCommand(ctx: Context, options: PrdCommandOptions): void {
  const check = options.check ?? validateProductDocs
  ctx.commands.register({
    name: 'prd',
    description: '产品需求校验：检查 MRD/PRD 的编号、来源追溯、验收标准、依赖与状态（人命令）',
    input: { hint: 'check <deliverables 目录名>' },
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      if (options.dataBlocked) {
        return { kind: 'error' as const, text: blockedCompanyText(options.blockedReason, '校验') }
      }
      const parsed = parsePrdCheck(rawInput)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const resolved = resolveDeliverablePath(options.workspace, parsed.slug)
      if (!resolved.ok) return { kind: 'error' as const, text: resolved.text }
      const { dir } = resolved
      const mrdPath = join(dir, 'mrd.md')
      const prdPath = join(dir, 'prd.md')
      let mrd: string
      let prd: string
      try {
        mrd = readFileSync(mrdPath, 'utf8')
      } catch {
        return { kind: 'error' as const, text: `缺 MRD：${mrdPath}` }
      }
      try {
        prd = readFileSync(prdPath, 'utf8')
      } catch {
        return { kind: 'error' as const, text: `缺 PRD：${prdPath}` }
      }
      const result = check(mrd, prd)
      if (!result.ok) {
        return { kind: 'error' as const, text: `PRD 校验失败（${parsed.slug}）：\n- ${result.errors.join('\n- ')}` }
      }
      return {
        kind: 'success' as const,
        text: `PRD 校验通过（${parsed.slug}）：${String(result.mrdCount)} 个机会 / ${String(result.reqCount)} 条需求 / ${String(result.acCount)} 条验收。`,
      }
    },
  })
}
