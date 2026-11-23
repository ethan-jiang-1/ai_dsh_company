/**
 * `/prd check <slug>` 人命令：读 workspace 里的 MRD/PRD，跑结构校验（判据 = lib/prd-check.ts）。
 *
 * 为什么是命令而不是 skill 清单：编号/追溯/验收/依赖是机械不变量，靠模型自查会漂；
 * 命令随 pack 发布，用户部署里也能用（与 `/deliverables audit` 同一载体）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { readTextInside } from '../fs/safe-file.ts'
import { join } from 'node:path'
import { blockedCompanyTextPair } from './blocked-text.ts'
import { registerLocalizedCommand } from './localized-command.ts'
import type { CompanyLanguageState } from '../language/company-language.ts'
import { commandWorkspace, type CommandAgent } from './command-workspace.ts'
import { resolveDeliverablePath } from './deliverable-path.ts'
import { validateProductDocs } from '../../lib/docs/prd-check.ts'

export const PRD_USAGE = '用法：/prd check <deliverables 目录名>（读 .dsh-company/deliverables/<name>/drafts/{mrd,prd}.md）'
const PRD_USAGE_EN = 'Usage: /prd check <deliverables-directory> (reads .dsh-company/deliverables/<name>/drafts/{mrd,prd}.md)'

export type ParsedPrdCheck =
  | { readonly ok: true; readonly slug: string }
  | { readonly ok: false; readonly text: string }

/** 解析 `check <slug>`；slug 只认一个 token（目录名）。 */
export function parsePrdCheck(
  rawInput: string,
  text: (zh: string, en: string) => string = zh => zh,
): ParsedPrdCheck {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens[0] !== 'check' || tokens.length !== 2) return { ok: false, text: text(PRD_USAGE, PRD_USAGE_EN) }
  return { ok: true, slug: tokens[1] as string }
}

export interface PrdCommandOptions {
  readonly dataBlocked: boolean
  /** dataBlocked 的人可读原因（BUG-058）；缺省回退到通用措辞。 */
  readonly blockedReason?: string
  readonly workspace: string
  /** 当前公司语言（可选）：命令面描述/提示/回执随语言（BUG-338）。 */
  readonly language?: CompanyLanguageState
  /** 测试注入；缺省 = 真实校验器。 */
  readonly check?: typeof validateProductDocs
}

/** 注册 `/prd` 命令。 */
export function registerPrdCommand(ctx: Context, options: PrdCommandOptions): void {
  const check = options.check ?? validateProductDocs
  const text = (zh: string, en: string): string => options.language?.text(zh, en) ?? zh
  const paused = blockedCompanyTextPair(options.blockedReason, '校验', 'validating')
  const definition = () => ({
    name: 'prd',
    description: text(
      '产品需求校验：检查 MRD/PRD 的编号、来源追溯、验收标准、依赖与状态（人命令）',
      'Product requirement check: validate numbering, source traceability, acceptance criteria, dependencies and status of MRD/PRD (human command)',
    ),
    input: { hint: text('check <deliverables 目录名>', 'check <deliverables-directory>') },
    handler: async ({ rawInput, agent }: { readonly rawInput: string, readonly agent?: CommandAgent }) => {
      const workspace = commandWorkspace(options.workspace, agent)
      if (workspace === '') {
        return {
          kind: 'error' as const,
          text: options.dataBlocked
            ? text(paused.zh, paused.en)
            : text('未指定 workspace；先选 workspace 再校验。', 'No workspace is selected; select a workspace before validating.'),
        }
      }
      const parsed = parsePrdCheck(rawInput, text)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      const resolved = resolveDeliverablePath(workspace, parsed.slug, text)
      if (!resolved.ok) return { kind: 'error' as const, text: resolved.text }
      const { dir } = resolved
      const companyRoot = join(workspace, '.dsh-company')
      const mrdPath = join(dir, 'mrd.md')
      const prdPath = join(dir, 'prd.md')
      const mrd = readTextInside(companyRoot, mrdPath)
      if (mrd === undefined) {
        return { kind: 'error' as const, text: text(`缺 MRD（或不是 company root 内普通文件）：${mrdPath}`, `Missing MRD (or it is not a regular file inside the company root): ${mrdPath}`) }
      }
      const prd = readTextInside(companyRoot, prdPath)
      if (prd === undefined) {
        return { kind: 'error' as const, text: text(`缺 PRD（或不是 company root 内普通文件）：${prdPath}`, `Missing PRD (or it is not a regular file inside the company root): ${prdPath}`) }
      }
      const result = check(mrd, prd)
      if (!result.ok) {
        return {
          kind: 'error' as const,
          text: text(
            `PRD 校验失败（${parsed.slug}）：\n- ${result.errors.join('\n- ')}`,
            `PRD check failed (${parsed.slug}):\n- ${result.errors.join('\n- ')}`,
          ),
        }
      }
      return {
        kind: 'success' as const,
        text: text(
          `PRD 校验通过（${parsed.slug}）：${String(result.mrdCount)} 个机会 / ${String(result.reqCount)} 条需求 / ${String(result.acCount)} 条验收。`,
          `PRD check passed (${parsed.slug}): ${String(result.mrdCount)} opportunities / ${String(result.reqCount)} requirements / ${String(result.acCount)} acceptance items.`,
        ),
      }
    },
  })
  registerLocalizedCommand(ctx, definition, options.language)
}
