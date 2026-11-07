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
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkRequirements, type MotionDoc } from '../lib/requirements-check.ts'

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
  readonly workspace: string
  /** 测试注入；缺省 = 真实校验器。 */
  readonly check?: typeof checkRequirements
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
        return { kind: 'error' as const, text: '公司数据已停写（无 workspace/身份/lease 问题）；先选 workspace 再校验。' }
      }
      const parsed = parseReqCheck(rawInput)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const root = join(options.workspace, '.dsh-company/deliverables', parsed.slug)
      const dir = join(root, 'drafts')
      const docs: MotionDoc[] = []
      for (const name of REQ_DOCS) {
        const text = readIfExists(join(dir, name))
        if (text !== undefined) docs.push({ rel: `drafts/${name}`, text })
      }
      if (docs.length === 0) {
        return { kind: 'error' as const, text: `缺需求文档：${dir}（至少要有 mrd.md / strs.md / prd.md）` }
      }
      const metaText = readIfExists(join(root, 'meta.md'))
      const result = check({ docs, ...(metaText === undefined ? {} : { meta: { rel: 'meta.md', text: metaText } }) })
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
        text: `编号校验通过（${parsed.slug}）：MR ${String(counts.MR)} / REQ ${String(counts.REQ)} / IF ${String(counts.IF)} / TC ${String(counts.TC)} / AC ${String(counts.AC)}；层 = ${result.layers.join('/')}；索引 = ${String(definitions.length)} 条定义 / ${String(edges.length)} 条追溯。`,
      }
    },
  })
}
