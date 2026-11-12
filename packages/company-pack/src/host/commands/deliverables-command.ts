/**
 * `/deliverables audit …` 人命令（2026-11-03 从 src/index.ts 的 apply 闭包抽出，D2）。
 *
 * 纯解析 = `parseDeliverablesAudit`（keyless 直测）；注册只做 dataBlocked/账本/写账本/重生成索引。
 * 证明边界：不证 presented-domain 的账本实现（→ presented-domain-real.spec）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { blockedCompanyText } from './blocked-text.ts'
import { auditLedger, type PresentedLedgerStore } from '../ledger/presented-domain.ts'
import { regenerateCatalog } from '../ledger/catalog.ts'
import type { ExportLedgerSource } from '../ledger/governance-export.ts'

export const DELIVERABLES_USAGE = '用法：/deliverables audit .dsh-company/deliverables/<dir>/final.md true|false'

export type ParsedDeliverablesAudit =
  | { readonly ok: true; readonly path: string; readonly value: boolean }
  | { readonly ok: false; readonly text: string }

/** 解析 `audit <path> true|false`；path 取原始剩余串（保留连续空格），只裁两端。 */
export function parseDeliverablesAudit(rawInput: string): ParsedDeliverablesAudit {
  const trimmed = rawInput.trim()
  const head = /^audit\s+([\s\S]+)$/.exec(trimmed)
  if (head === null) return { ok: false, text: DELIVERABLES_USAGE }
  const rest = head[1] as string
  const last = /\s+(\S+)$/.exec(rest)
  if (last === null) return { ok: false, text: DELIVERABLES_USAGE }
  const valueToken = last[1] as string
  if (valueToken !== 'true' && valueToken !== 'false') {
    return { ok: false, text: `审计结论只认 true/false：${valueToken}` }
  }
  const path = rest.slice(0, last.index).trim()
  if (path === '') return { ok: false, text: DELIVERABLES_USAGE }
  return { ok: true, path, value: valueToken === 'true' }
}

export interface DeliverablesCommandOptions {
  readonly dataBlocked: boolean
  /** dataBlocked 的人可读原因（BUG-058）；缺省回退到通用措辞。 */
  readonly blockedReason?: string
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
        return { kind: 'error' as const, text: blockedCompanyText(options.blockedReason, '审计') }
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
      const regenerated = regenerate(options.workspace, result.ledger)
      const skipped = regenerated?.warnings?.length ?? 0
      options.exportNow(store)
      return {
        kind: 'success' as const,
        text: `已审计 ${result.path ?? parsed.path} = ${String(parsed.value)}（presented 账本 = ${store.kind}；索引已重生成${skipped > 0 ? `；另有 ${String(skipped)} 条坏形状被跳过` : ''}）。`,
      }
    },
  })
}
