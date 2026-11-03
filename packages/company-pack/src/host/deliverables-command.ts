/**
 * `/deliverables audit …` 人命令（2026-11-03 从 src/index.ts 的 apply 闭包抽出，D2）。
 *
 * 纯解析 = `parseDeliverablesAudit`（keyless 直测）；注册只做 dataBlocked/账本/写账本/重生成索引。
 * 证明边界：不证 presented-domain 的账本实现（→ presented-domain-real.spec）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { auditLedger, type PresentedLedgerStore } from './presented-domain.ts'
import { regenerateCatalog } from './catalog.ts'
import type { ExportLedgerSource } from './governance-export.ts'

export const DELIVERABLES_USAGE = '用法：/deliverables audit .dsh-company/deliverables/<dir>/final.md true|false'

export type ParsedDeliverablesAudit =
  | { readonly ok: true; readonly path: string; readonly value: boolean }
  | { readonly ok: false; readonly text: string }

/** 解析 `audit <path> true|false`；path 允许空格（最终按 token 重新 join）。 */
export function parseDeliverablesAudit(rawInput: string): ParsedDeliverablesAudit {
  const tokens = rawInput.trim().split(/\s+/).filter(token => token !== '')
  if (tokens[0] !== 'audit' || tokens.length < 3) return { ok: false, text: DELIVERABLES_USAGE }
  const valueToken = tokens[tokens.length - 1]
  if (valueToken !== 'true' && valueToken !== 'false') {
    return { ok: false, text: `审计结论只认 true/false：${valueToken ?? ''}` }
  }
  return { ok: true, path: tokens.slice(1, -1).join(' '), value: valueToken === 'true' }
}

export interface DeliverablesCommandOptions {
  readonly dataBlocked: boolean
  readonly workspace: string
  readonly ledgerStorePromise: Promise<PresentedLedgerStore> | undefined
  readonly exportNow: (ledger?: ExportLedgerSource) => void
  /** 测试注入；缺省 = 真实账本/索引实现。 */
  readonly audit?: typeof auditLedger
  readonly regenerate?: typeof regenerateCatalog
}

/** 注册 `/deliverables` 命令；行为与抽取前逐字一致。 */
export function registerDeliverablesCommand(ctx: Context, options: DeliverablesCommandOptions): void {
  const audit = options.audit ?? auditLedger
  const regenerate = options.regenerate ?? regenerateCatalog
  ctx.commands.register({
    name: 'deliverables',
    description: '交付审计：把一条 final.md 的 presented 结论写入审计账本并重生成索引（人命令）',
    input: { hint: 'audit .dsh-company/deliverables/<dir>/final.md true|false' },
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      if (options.dataBlocked) {
        return { kind: 'error' as const, text: '公司数据已停写（无 workspace/身份/lease 问题）；先选 workspace 再审计。' }
      }
      const parsed = parseDeliverablesAudit(rawInput)
      if (!parsed.ok) return { kind: 'error' as const, text: parsed.text }
      if (options.ledgerStorePromise === undefined) {
        return { kind: 'error' as const, text: 'presented 账本未初始化（无 workspace）。' }
      }
      const store = await options.ledgerStorePromise
      const result = await audit(options.workspace, store, parsed.path, parsed.value)
      if (result.ledger === undefined) {
        return { kind: 'error' as const, text: result.warning ?? '审计写入失败' }
      }
      regenerate(options.workspace, result.ledger)
      options.exportNow(store)
      return {
        kind: 'success' as const,
        text: `已审计 ${result.path ?? parsed.path} = ${String(parsed.value)}（presented 账本 = ${store.kind}；索引已重生成）。`,
      }
    },
  })
}
