/**
 * host 治理状态的可携带只读导出（2026-11-01 产品化 P4）。
 *
 * 为什么：方法层（D25 自改否决）与 presented 账本（M2 防篡改）必须留 home，不能让模型在
 * workspace 里改权威；但用户需要一个可备份/可读的 workspace 内快照。这里只写**派生导出**：
 * - `<workspace>/.dsh-company/exports/methods/`：`<home>/company/methods` 的快照；
 * - `<workspace>/.dsh-company/exports/ledger.json`：presented 账本的快照。
 * 导出不是第二权威；下次导出覆盖；恢复先恢复 home 权威，再由 host 重新导出。
 * 失败只 warn（不能连累 boot / present）。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PresentedLedger, PresentedLedgerState } from './catalog.ts'

const EXPORT_README = `# 治理导出（derived）

这里是 host 治理状态的可读快照，不是权威：

- \`methods/\` = \`<DSH_HOME>/company/methods\` 的快照；
- \`ledger.json\` = presented 审计账本（domain）的快照。

权威永远在 home。不要在这里编辑后期待生效；恢复时先恢复 home，再由 host 重新导出。
`

/** 导出可接受的最小账本读取面（domain store / 测试桩）。 */
export interface ExportLedgerSource {
  readonly kind: 'domain' | 'file' | 'legacy'
  read(): PresentedLedgerState
}

export interface GovernanceExportResult {
  readonly methods: boolean
  readonly ledger: boolean
  readonly warnings: readonly string[]
}

function atomicReplaceDir(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true })
  const staging = `${target}.tmp-${String(process.pid)}-${randomUUID()}`
  rmSync(staging, { recursive: true, force: true })
  cpSync(source, staging, { recursive: true, dereference: false })
  rmSync(target, { recursive: true, force: true })
  renameSync(staging, target)
}

/**
 * 导出治理快照。
 * @param options.dshHome - 权威 home。
 * @param options.workspace - 目标 workspace（**非空**；调用方保证）。
 * @param options.ledger - 账本读取面；缺席时只导方法层。
 * @param options.now - 时钟（测试）。
 */
export function exportGovernance(options: {
  readonly dshHome: string
  readonly workspace: string
  readonly ledger?: ExportLedgerSource
  readonly now?: Date
}): GovernanceExportResult {
  const warnings: string[] = []
  const exportRoot = join(options.workspace, '.dsh-company/exports')
  let methods = false
  let ledger = false
  try {
    mkdirSync(exportRoot, { recursive: true })
    writeFileSync(join(exportRoot, 'README.md'), EXPORT_README)
  } catch (error) {
    warnings.push(`exports 目录写不动：${(error as Error).message}`)
    return { methods, ledger, warnings }
  }
  const methodsSource = join(options.dshHome, 'company/methods')
  if (existsSync(methodsSource)) {
    try {
      atomicReplaceDir(methodsSource, join(exportRoot, 'methods'))
      methods = true
    } catch (error) {
      warnings.push(`方法层导出失败：${(error as Error).message}`)
    }
  }
  if (options.ledger !== undefined) {
    try {
      const state = options.ledger.read()
      if (state.status === 'ok') {
        const target = join(exportRoot, 'ledger.json')
        // 幂等：内容没变就不写，避免每次 boot 的 exportedAt 把“二启零变更”打红。
        let unchanged = false
        try {
          const existing = JSON.parse(readFileSync(target, 'utf8')) as { ledger?: unknown; source?: unknown }
          unchanged = existing.source === options.ledger.kind
            && JSON.stringify(existing.ledger) === JSON.stringify(state.ledger)
        } catch { /* 不存在/坏文件则重写 */ }
        if (!unchanged) {
          const payload = {
            schema: 1,
            exportedAt: (options.now ?? new Date()).toISOString(),
            source: options.ledger.kind,
            ledger: state.ledger satisfies PresentedLedger,
          }
          writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`)
        }
        ledger = true
      } else if (state.status === 'corrupt' || state.status === 'unsupported') {
        warnings.push(`账本不可导出（${state.status}），保留上次快照`)
      }
    } catch (error) {
      warnings.push(`账本导出失败：${(error as Error).message}`)
    }
  }
  return { methods, ledger, warnings }
}

/** 读导出（测试/诊断用）；不存在返回 undefined。 */
export function readLedgerExport(workspace: string): unknown {
  try { return JSON.parse(readFileSync(join(workspace, '.dsh-company/exports/ledger.json'), 'utf8')) } catch { return undefined }
}
