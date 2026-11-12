/**
 * 公司工作语言桥（Phase A3）。
 *
 * 唯一源 = DSH 的 `locale.preference`（Settings → General 的语言行）。Host 没有通用
 * locale 服务，但 `settings.describe()` 会列出活跃且有 volatile 字段的 profile entry；
 * `locale` 的 `preference` 正是 volatile，所以能读。`settings/document-updated` 用于
 * 实时跟随切换。
 *
 * 缺省策略：没有 settings / 没有 locale entry / 读失败 → zh；非 zh/en 的外部语言 → en
 * （与 DSH 的 fallback 一致）。这样 headless、测试、慢启动都稳定，不会因为读不到就报错。
 */
import type { Context } from '@deepseek-ai/cordis'

/** 公司工作语言；只有两种内容/策略面。 */
export type CompanyLanguage = 'zh' | 'en'

/** Host settings 的最小结构面（避免为了读一个字段引整个 settings 包）。 */
export interface SettingsLike {
  describe(): readonly { readonly ns: string; readonly value?: unknown }[]
}

/** 一个可订阅的语言状态。 */
export interface CompanyLanguageState {
  /** 当前语言。 */
  current(): CompanyLanguage
  /** 按当前语言选一句；zh 为缺省。 */
  text(zh: string, en: string): string
  /** 订阅变化；返回退订。 */
  subscribe(listener: () => void): () => void
  /** 内部/测试写入入口；相同值不通知。 */
  set(next: CompanyLanguage): void
}

/** `locale.preference` → 公司语言。非 zh/en → en（DSH fallback）；缺失 → zh（公司缺省）。 */
export function languageFromPreference(value: unknown): CompanyLanguage {
  if (typeof value !== 'string') return 'zh'
  const tag = value.trim().toLowerCase()
  if (tag === '') return 'zh'
  // 只有 zh 变体走中文；en 与所有外部语言都落 en（DSH fallback）。
  if (tag === 'zh' || tag.startsWith('zh-')) return 'zh'
  return 'en'
}

/** 读 settings 里 `locale` entry 的 preference；读不到/抛错一律缺失。 */
export function readPreference(settings: SettingsLike): unknown {
  try {
    const descriptor = settings.describe().find(row => row.ns === 'locale')
    const value = descriptor?.value
    return value !== null && typeof value === 'object' ? (value as { preference?: unknown }).preference : undefined
  } catch {
    return undefined
  }
}

/** 创建一个进程内语言状态（默认 zh）。 */
export function createCompanyLanguageState(initial: CompanyLanguage = 'zh'): CompanyLanguageState {
  let active = initial
  const listeners = new Set<() => void>()
  return {
    current: () => active,
    text: (zh, en) => active === 'en' ? en : zh,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(next) {
      if (next === active) return
      active = next
      for (const listener of listeners) listener()
    },
  }
}

/**
 * 把 settings 服务接到语言状态上：服务出现时读一次，之后按 `settings/document-updated`
 * 的 `locale` 事件重读。服务缺席/迟到不阻塞启动；缺失时保持 zh。
 * @param ctx - Host 上下文。
 * @param state - 语言状态。
 */
export function bindSettings(ctx: Context, state: CompanyLanguageState): void {
  ctx.inject(['settings'], (scope) => {
    const settings = scope.get('settings') as SettingsLike | undefined
    if (settings === undefined) return
    const read = (): void => { state.set(languageFromPreference(readPreference(settings))) }
    read()
    // ctx.on 的 disposer 由注入 scope 的 fiber 持有；scope 释放即退订。
    scope.on('settings/document-updated' as never, ((ns: string) => {
      if (ns === 'locale') read()
    }) as never)
  })
}

/**
 * 创建公司语言状态并绑定 settings。默认 zh；settings 到达后接管。
 * @param ctx - Host 上下文。
 * @returns 语言状态。
 */
export function createCompanyLanguage(ctx: Context): CompanyLanguageState {
  const state = createCompanyLanguageState('zh')
  // 组合测试/最小 host 替身可能没有 `inject`；真实 Cordis 有。缺失时保持 zh，不阻塞启动。
  const inject = (ctx as unknown as { inject?: unknown }).inject
  if (typeof inject !== 'function') return state
  bindSettings(ctx, state)
  return state
}


/** 成品结果 → 表达层文案；未知值原样（catalog 的 machine value 不猜）。 */
const RESULT_LABELS: Readonly<Record<string, { readonly zh: string; readonly en: string }>> = {
  'in-progress': { zh: '进行中', en: 'In progress' },
  accepted: { zh: '已采纳', en: 'Accepted' },
  rejected: { zh: '已否决', en: 'Rejected' },
  deferred: { zh: '已搁置', en: 'Deferred' },
  obsolete: { zh: '已废弃', en: 'Obsolete' },
  undecidable: { zh: '判不了', en: 'Undecidable' },
  completed: { zh: '已完成', en: 'Completed' },
}

/** 成品结果标签；未知值原样。 */
export function resultLabelFor(result: string, language: 'zh' | 'en'): string {
  return RESULT_LABELS[result]?.[language] ?? result
}
