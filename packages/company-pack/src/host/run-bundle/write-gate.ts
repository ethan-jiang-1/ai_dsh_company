/**
 * 公司盘写 gate（2026-11-13，BUG-115/119/121）。
 *
 * lease 只在 boot 取一次；之后是否还能写，需要进程级事实。这里给所有 `.dsh-company/` 写路径
 * 一个统一开关：runtime-guard 在 lease 被占时 block；持有者 heartbeat 发现 token 被换时 block。
 * 读路径不受影响；写入口调用 `assertCompanyWritesAllowed()`，把拒绝变成可读回执。
 */
let blockedReason: string | null = null

/** 公司盘写被拒绝的 typed error。 */
export class CompanyWriteBlockedError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'CompanyWriteBlockedError'
  }
}

/** 关闭公司盘写（重复调用保留第一条原因）。 */
export function blockCompanyWrites(reason: string): void {
  if (blockedReason === null) blockedReason = reason
}

/** 恢复公司盘写（拿到 lease 时）。 */
export function unblockCompanyWrites(): void {
  blockedReason = null
}

/** 当前被 block 的原因；null = 可写。 */
export function companyWriteBlockReason(): string | null {
  return blockedReason
}

/** 写前守卫；被 block 时抛 `CompanyWriteBlockedError`。 */
export function assertCompanyWritesAllowed(): void {
  if (blockedReason !== null) throw new CompanyWriteBlockedError(`公司数据已停写：${blockedReason}`)
}
