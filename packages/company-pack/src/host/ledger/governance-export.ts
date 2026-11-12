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
import { assertCompanyWritesAllowed } from '../run-bundle/write-gate.ts'
import { randomUUID } from 'node:crypto'
import type { PresentedLedger, PresentedLedgerState } from '../ledger/presented-ledger.ts'

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

/**
 * 用 staging 目录替换 target：旧目录先 rename 成 backup，staging rename 成功后才删 backup；
 * 第二步失败把 backup rename 回去。非空目录不能用 rename 直接覆盖，所以「先删后 rename」会丢旧版（BUG-110）。
 * 依赖可注入：spec 用假 rename 模拟第二步失败。
 */
export function swapDirWithBackup(
  staging: string,
  target: string,
  deps: { readonly rename?: (from: string, to: string) => void, readonly rm?: (path: string, options?: { recursive?: boolean, force?: boolean }) => void } = {},
): void {
  const rename = deps.rename ?? renameSync
  const rm = deps.rm ?? rmSync
  const backup = `${target}.bak-${String(process.pid)}-${randomUUID()}`
  let hadTarget = false
  try {
    rename(target, backup)
    hadTarget = true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  try {
    rename(staging, target)
  } catch (error) {
    if (hadTarget) {
      try { rename(backup, target) } catch { /* 回滚失败也要把原错误抛出去 */ }
    }
    try { rm(staging, { recursive: true, force: true }) } catch { /* 清理失败不掩原错误 */ }
    throw error
  }
  if (hadTarget) {
    try { rm(backup, { recursive: true, force: true }) } catch { /* 备份清理失败只留垃圾目录 */ }
  }
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
  assertCompanyWritesAllowed()
  const warnings: string[] = []
  const exportRoot = join(options.workspace, '.dsh-company/exports')
  const staging = `${exportRoot}.tmp-${String(process.pid)}-${randomUUID()}`
  let methods = false
  let ledger = false
  try {
    mkdirSync(dirname(exportRoot), { recursive: true })
    rmSync(staging, { recursive: true, force: true })
    mkdirSync(staging, { recursive: true })
    // 整个 exports/ 在同一 staging 里生成：README / methods / ledger 不会混代。
    writeFileSync(join(staging, 'README.md'), EXPORT_README)

    const methodsSource = join(options.dshHome, 'company/methods')
    if (existsSync(methodsSource)) {
      cpSync(methodsSource, join(staging, 'methods'), { recursive: true, dereference: false })
      methods = true
    } else if (existsSync(join(exportRoot, 'methods'))) {
      // 本次没有权威 methods（home 未建/暂不可读）：整目录替换不能因此删掉上一份可用快照（BUG-114）。
      cpSync(join(exportRoot, 'methods'), join(staging, 'methods'), { recursive: true, dereference: false })
      warnings.push('methods 源不可用，沿用上次导出快照')
    }

    if (options.ledger === undefined) {
      try { cpSync(join(exportRoot, 'ledger.json'), join(staging, 'ledger.json')) } catch { /* 没有旧快照 */ }
    } else {
      const state = options.ledger.read()
      if (state.status === 'ok') {
        // 幂等：与上一份导出内容相同就不重写，避免 exportedAt 把「二启零变更」打红。
        let unchanged = false
        try {
          const existing = JSON.parse(readFileSync(join(exportRoot, 'ledger.json'), 'utf8')) as { ledger?: unknown; source?: unknown }
          unchanged = existing.source === options.ledger.kind
            && JSON.stringify(existing.ledger) === JSON.stringify(state.ledger)
        } catch { /* 不存在/坏文件则重写 */ }
        if (!unchanged) {
          writeFileSync(join(staging, 'ledger.json'), `${JSON.stringify({
            schema: 1,
            exportedAt: (options.now ?? new Date()).toISOString(),
            source: options.ledger.kind,
            ledger: state.ledger satisfies PresentedLedger,
          }, null, 2)}\n`)
        } else {
          // 内容不变：把旧 ledger 复制进新快照，保持字节一致。
          try { cpSync(join(exportRoot, 'ledger.json'), join(staging, 'ledger.json')) } catch { /* 旧件不可读则跳过 */ }
        }
        ledger = true
      } else if (state.status === 'corrupt' || state.status === 'unsupported') {
        warnings.push(`账本不可导出（${state.status}），本次不更新，沿用上次快照`)
        try { cpSync(join(exportRoot, 'ledger.json'), join(staging, 'ledger.json')) } catch { /* 没有旧快照 */ }
      }
    }

    swapDirWithBackup(staging, exportRoot)
  } catch (error) {
    warnings.push(`exports 导出失败（旧快照保留）：${(error as Error).message}`)
    try { rmSync(staging, { recursive: true, force: true }) } catch { /* 清理失败不掩原错误 */ }
    return { methods: false, ledger: false, warnings }
  }
  return { methods, ledger, warnings }
}

/** 读导出（测试/诊断用）；不存在返回 undefined。 */
export function readLedgerExport(workspace: string): unknown {
  try { return JSON.parse(readFileSync(join(workspace, '.dsh-company/exports/ledger.json'), 'utf8')) } catch { return undefined }
}
