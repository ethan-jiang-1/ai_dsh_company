/**
 * 部署身份（客户端缓存，2026-11-09 三层分离）。
 *
 * 为什么：品牌/显示名不能写死在组件里；部署换公司只改 `.dsh-company/kb/company.md`。
 * 客户端通过 `remote.workspaceFiles` 读一次身份文件，解析 frontmatter 后广播给订阅者。
 * 失败（无 workspace/会话/文件）保持出厂词标，不阻塞渲染。
 */
export interface CompanyIdentity {
  readonly company: string
  readonly productName: string
  readonly productType: string
  readonly timeZone: string
}

export const FALLBACK_IDENTITY: CompanyIdentity = {
  company: '',
  // 出厂词标由 `company` 字典按语言给（Brand 的 `t('brand.name')`），这里留空避免把中文写死。
  productName: '',
  productType: '',
  timeZone: '',
}

let current: CompanyIdentity = FALLBACK_IDENTITY
const listeners = new Set<() => void>()

/** 当前身份快照（稳定引用，供 useSyncExternalStore）。 */
export function companyIdentity(): CompanyIdentity {
  return current
}

/** 订阅身份变化；返回退订。 */
export function subscribeCompanyIdentity(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** 覆盖当前身份（加载成功或测试注入）。 */
export function setCompanyIdentity(next: CompanyIdentity): void {
  current = next
  for (const listener of listeners) listener()
}

/** 恢复出厂身份（测试清理用）。 */
export function resetCompanyIdentity(): void {
  setCompanyIdentity(FALLBACK_IDENTITY)
}

/**
 * 解析 `identity.md` 的 frontmatter（company / productName / productType / timeZone）。
 * 没有头或缺 company 视为无效（不拿半个身份覆盖出厂词标）。
 */
export function parseCompanyIdentity(text: string | null): CompanyIdentity | null {
  if (text === null) return null
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (match === null) return null
  const fields: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line.trim())
    if (field !== null) fields[field[1] ?? ''] = (field[2] ?? '').trim()
  }
  const company = fields.company ?? ''
  if (company === '') return null
  return {
    company,
    productName: fields.productName ?? '',
    productType: fields.productType ?? '',
    timeZone: fields.timeZone ?? '',
  }
}
