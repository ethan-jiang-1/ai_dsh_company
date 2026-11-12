/**
 * 项目启动策略的纯模型（host 与 client 共用；不含 node 内建）。
 *
 * 语义：**只存选择，不存规则正文**（内容宪章铁律 3）。三个字段各自是「选哪个」：
 * - `productType`：今回按哪份产品类型包跑；
 * - `deliveryMode`：怎么交付；
 * - `wiki`：依赖哪份外部知识地图（指针，内容形状归 wiki 研究）。
 * `null` = 自动 = 不约束（模型按公司默认与自身判断走）。
 *
 * 浏览器面读 `startup.json` 原样渲染；可选值由 host 枚举后写 `startup-options.json`（派生文件）。
 */

/** 三个可设字段（顺序即面板行序）。 */
export const STARTUP_FIELDS = ['productType', 'deliveryMode', 'wiki'] as const

/** 一个可设字段。 */
export type StartupField = (typeof STARTUP_FIELDS)[number]

/** `startup.json` 的现行形状。 */
export interface StartupSettings {
  readonly v: 1
  readonly productType: string | null
  readonly deliveryMode: string | null
  readonly wiki: string | null
  /** 最后一次人类改动时间（诊断用；不参与解析）。 */
  readonly updatedAt: string | null
}

/** 全自动（什么都没设）。 */
export const EMPTY_STARTUP_SETTINGS: StartupSettings = Object.freeze({
  v: 1,
  productType: null,
  deliveryMode: null,
  wiki: null,
  updatedAt: null,
})

/** 可选项集合（host 枚举；client 只读）。 */
export interface StartupOptions {
  readonly productTypes: readonly string[]
  readonly deliveryModes: readonly string[]
}

/** 还没有派生文件时的空集合。 */
export const EMPTY_STARTUP_OPTIONS: StartupOptions = Object.freeze({
  productTypes: [],
  deliveryModes: [],
}) as StartupOptions

/** 面板一行（纯数据；文案由组件按 `t` 取）。 */
export interface StartupRow {
  readonly field: StartupField
  readonly value: string | null
  readonly isAuto: boolean
  readonly options: readonly string[]
  /** 已设但当前内容包里没有这个值（内容缺失/改名）——面板要标失效，不静默沿用。 */
  readonly invalid: boolean
}

/** 判断一个字符串是不是可设字段。 */
export function isStartupField(value: string): value is StartupField {
  return (STARTUP_FIELDS as readonly string[]).includes(value)
}

/** 把任意值收成「非空字符串或 null」；占位符与空白视为未设。 */
function cleanScalar(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return null
  return trimmed
}

/** 标量数组清洗：去空、去重、保序。 */
function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    const clean = cleanScalar(item)
    if (clean === null || seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
  }
  return out
}

/**
 * 解析 `startup.json` 文本；坏 JSON / 错版本 / 缺字段一律折成「全自动」，不让面板炸。
 * @param text - 文件原文（缺失给 undefined/null）。
 * @returns 归一后的设置。
 */
export function parseStartupSettings(text: string | null | undefined): StartupSettings {
  if (typeof text !== 'string' || text.trim() === '') return EMPTY_STARTUP_SETTINGS
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return EMPTY_STARTUP_SETTINGS
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_STARTUP_SETTINGS
  const record = raw as Record<string, unknown>
  if (record.v !== 1) return EMPTY_STARTUP_SETTINGS
  return {
    v: 1,
    productType: cleanScalar(record.productType),
    deliveryMode: cleanScalar(record.deliveryMode),
    wiki: cleanScalar(record.wiki),
    updatedAt: cleanScalar(record.updatedAt),
  }
}

/** 解析派生选项文件；缺失/坏值 → 空集合（面板只剩「自动」）。 */
export function parseStartupOptions(text: string | null | undefined): StartupOptions {
  if (typeof text !== 'string' || text.trim() === '') return EMPTY_STARTUP_OPTIONS
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return EMPTY_STARTUP_OPTIONS
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_STARTUP_OPTIONS
  const record = raw as Record<string, unknown>
  return {
    productTypes: cleanList(record.productTypes),
    deliveryModes: cleanList(record.deliveryModes),
  }
}

/** 稳定序列化（键序固定、末尾换行）——写盘与测试比对同一口径。 */
export function serializeStartupSettings(settings: StartupSettings): string {
  const body = {
    v: 1,
    productType: settings.productType,
    deliveryMode: settings.deliveryMode,
    wiki: settings.wiki,
    ...(settings.updatedAt === null ? {} : { updatedAt: settings.updatedAt }),
  }
  return `${JSON.stringify(body, null, 2)}\n`
}

/** 稳定序列化派生选项。 */
export function serializeStartupOptions(options: StartupOptions): string {
  return `${JSON.stringify({ v: 1, productTypes: [...options.productTypes], deliveryModes: [...options.deliveryModes] }, null, 2)}\n`
}

/**
 * 改一个字段（`value === null` = 恢复自动）。
 * @param settings - 当前设置。
 * @param field - 要改的字段。
 * @param value - 新值或 `null`。
 * @param updatedAt - 记录时间（ISO 字符串；测试可注入）。
 * @returns 新设置（不改原对象）。
 */
export function patchStartupSettings(
  settings: StartupSettings,
  field: StartupField,
  value: string | null,
  updatedAt: string,
): StartupSettings {
  const next = cleanScalar(value)
  return {
    v: 1,
    productType: field === 'productType' ? next : settings.productType,
    deliveryMode: field === 'deliveryMode' ? next : settings.deliveryMode,
    wiki: field === 'wiki' ? next : settings.wiki,
    updatedAt,
  }
}

/** 全部恢复自动。 */
export function clearStartupSettings(updatedAt: string): StartupSettings {
  return { ...EMPTY_STARTUP_SETTINGS, updatedAt }
}

/** 有没有任何非自动字段。 */
export function overrideCount(settings: StartupSettings): number {
  return STARTUP_FIELDS.filter(field => settings[field] !== null).length
}

/**
 * 面板行视图（顺序 = `STARTUP_FIELDS`）。
 * `wiki` 没有枚举集（自由指针），永远不算失效。
 * @param settings - 当前设置。
 * @param options - host 枚举出来的可选项。
 * @returns 三行。
 */
export function startupRows(settings: StartupSettings, options: StartupOptions): readonly StartupRow[] {
  return STARTUP_FIELDS.map((field) => {
    const value = settings[field]
    const allowed = field === 'productType' ? options.productTypes : field === 'deliveryMode' ? options.deliveryModes : null
    return {
      field,
      value,
      isAuto: value === null,
      options: allowed ?? [],
      invalid: value !== null && allowed !== null && !allowed.includes(value),
    }
  })
}

/**
 * 给模型看的「本次已给定」清单（空数组 = 全自动）。
 * @param settings - 当前设置。
 * @returns 形如 `[['productType','business-software']]` 的已设项。
 */
export function overriddenEntries(settings: StartupSettings): readonly (readonly [StartupField, string])[] {
  return STARTUP_FIELDS.flatMap(field => {
    const value = settings[field]
    return value === null ? [] : [[field, value] as const]
  })
}
