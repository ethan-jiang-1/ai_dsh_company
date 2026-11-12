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

/**
 * 浏览器读两份 startup 文件时的行数上限（`workspaceFiles.read` 的 `limit` 是**行**数）。
 *
 * 为什么住这里而不是客户端常量：上限必须 ≥ `serialize*` 产出的行数，否则 JSON 被截断 →
 * 解析折成空集合 → 面板静默显示「没有选项」。这是一条**跨两端**的约束，所以两个数字与
 * `serialize*` 同家，并由 spec 直接断言「最坏形状的行数 ≤ 上限」。
 * 2026-11-12 实修：`wikiCheck` 加进派生文件后 13 行 → 19 行，而客户端仍按 16 行读。
 */
export const STARTUP_SETTINGS_READ_LIMIT = 16

/**
 * 派生选项里允许的最大条目数（产品类型 + 交付模式，跨两端预算）。
 *
 * 选项文件的行数随 `content/` 目录数线性长；固定 64 行在 60 个类型时就会截断。这里把
 * 「内容能有多大」变成显式预算：读上限从它派生，`tests/content/startup-options-budget.spec.ts`
 * 对真实内容目录验一次；超限时读方是「选项文件读坏了」的显式错误，不是静默空下拉。
 */
export const STARTUP_OPTIONS_MAX_ENTRIES = 256

/** 派生选项文件的行数上限（见 `STARTUP_SETTINGS_READ_LIMIT` / `STARTUP_OPTIONS_MAX_ENTRIES`）。 */
export const STARTUP_OPTIONS_READ_LIMIT = 32 + STARTUP_OPTIONS_MAX_ENTRIES

/**
 * 启动策略的 workspace 解析（2026-11-12，BUG-081/089）。
 *
 * 面板按 Lead 会话的 workspace 读（`workspaceFiles` 的会话寻址），命令与注入也必须读同一份：
 * 会话 cwd 优先，会话没有 cwd（或命令来自无会话面）时才回退 boot workspace。
 * 为什么不是 boot 优先：同一 home 可服务多个 workspace，boot 盘只是「宿主启动时所在的项目」；
 * 用户在某个项目会话里改策略，改的必须是那个项目。返回空串 = 无处可写/可读。
 */
export interface StartupAgentLike {
  readonly session?: {
    readonly header?: {
      readonly cwd?: string
    }
  }
}

export function startupWorkspace(bootWorkspace: string, agent: StartupAgentLike | undefined): string {
  const cwd = agent?.session?.header?.cwd
  if (typeof cwd === 'string' && cwd !== '') return cwd
  return bootWorkspace
}

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
  /** wiki 指针的存在性检查（host 每次派生时重算；client 只渲染）。 */
  readonly wikiCheck: WikiCheck
  /**
   * 当前部署里模板的绝对路径（`<pack>/content/wiki-template`；null = 不知道）。
   * 面板的「缺 index.md」提示给可复制的安装路径，不再只写 pack 相对名（BUG-087）。
   */
  readonly wikiTemplate: string | null
}

/**
 * wiki 指针的检查结果（纯数据，浏览器安全）。
 *
 * 为什么 wiki 需要这个而产品类型/交付模式不需要：后两者的可选值来自 `content/` 目录枚举，
 * 「失效」= 值不在枚举里；wiki 是**自由路径**，失效只能靠查盘——目录被改名、搬家、换机器，
 * 指针就成了空气。不查就会把模型指向一个不存在的目录（A3）。
 */
export interface WikiCheck {
  /** 被检查的值（null = 未设）。 */
  readonly value: string | null
  /** 目录存在、是目录、且有 `index.md`。 */
  readonly ok: boolean
  /** 失败原因；`ok` 时为 null。 */
  readonly problem: WikiProblem | null
  /** 目录在 workspace 内（agent 可写）还是外（agent 只读）；未设/失效时 null。 */
  readonly location: 'inside' | 'outside' | null
  /**
   * 这次检查的时间（ISO；null = 没有检查过，例如旧派生文件 / 未设 wiki）。
   *
   * 没有它，面板只能把派生文件里的 ok/location 当成「现在」——目录搬走后会无限期显示旧结论
   * （BUG-082）。有了它，面板必须把结论标成「上次检查于 …」，并只在检查值与当前设置一致时
   * 才给出可用/失效判断。
   */
  readonly checkedAt: string | null
}

/** wiki 指针失效的三种原因（A3 的三档判据）。 */
export type WikiProblem = 'missing' | 'not-directory' | 'no-index'

/** 未设 wiki 时的检查结果（不算失效）。 */
export const EMPTY_WIKI_CHECK: WikiCheck = Object.freeze({
  value: null,
  ok: true,
  problem: null,
  location: null,
  checkedAt: null,
})

/** 还没有派生文件时的空集合。 */
export const EMPTY_STARTUP_OPTIONS: StartupOptions = Object.freeze({
  productTypes: [],
  deliveryModes: [],
  wikiCheck: EMPTY_WIKI_CHECK,
  wikiTemplate: null,
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

/** 一次派生选项读取的结果：坏/截断的文件必须能被面板说出来，而不是静默空集合。 */
export interface StartupOptionsState {
  readonly options: StartupOptions
  /** `'unreadable'` = 文件存在但读不出合法形状（典型：超过读上限被截断）；缺失不算错。 */
  readonly problem: 'unreadable' | null
}

/**
 * 解析派生选项文件；缺失/空 = 空集合（不是错），**坏 JSON / 坏形状 = `unreadable`**。
 *
 * 为什么要区分：读上限截断时 JSON 不完整，旧实现折成空集合 → 面板显示「公司内容里还没有
 * 可选项」，用户以为内容包坏了（BUG-085）。现在面板能说「选项文件读不出来」。
 */
export function parseStartupOptionsState(text: string | null | undefined): StartupOptionsState {
  if (typeof text !== 'string' || text.trim() === '') return { options: EMPTY_STARTUP_OPTIONS, problem: null }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { options: EMPTY_STARTUP_OPTIONS, problem: 'unreadable' }
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { options: EMPTY_STARTUP_OPTIONS, problem: 'unreadable' }
  }
  const record = raw as Record<string, unknown>
  return {
    options: {
      productTypes: cleanList(record.productTypes),
      deliveryModes: cleanList(record.deliveryModes),
      wikiCheck: parseWikiCheck(record.wikiCheck),
      wikiTemplate: cleanScalar(record.wikiTemplate),
    },
    problem: null,
  }
}

/** 解析派生选项文件；坏值折成空集合（需要区分「读坏」时用 `parseStartupOptionsState`）。 */
export function parseStartupOptions(text: string | null | undefined): StartupOptions {
  return parseStartupOptionsState(text).options
}

/** 解析 wiki 检查块；坏值折成「未设」（宁可显示未知，也不谎报失效）。 */
function parseWikiCheck(value: unknown): WikiCheck {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return EMPTY_WIKI_CHECK
  const record = value as Record<string, unknown>
  const problem = record.problem === 'missing' || record.problem === 'not-directory' || record.problem === 'no-index'
    ? record.problem
    : null
  const location = record.location === 'inside' || record.location === 'outside' ? record.location : null
  return {
    value: cleanScalar(record.value),
    ok: record.ok === true,
    problem: record.ok === true ? null : problem,
    location,
    checkedAt: cleanScalar(record.checkedAt),
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
  return `${JSON.stringify({
    v: 1,
    productTypes: [...options.productTypes],
    deliveryModes: [...options.deliveryModes],
    wikiCheck: {
      value: options.wikiCheck.value,
      ok: options.wikiCheck.ok,
      problem: options.wikiCheck.problem,
      location: options.wikiCheck.location,
      checkedAt: options.wikiCheck.checkedAt,
    },
    wikiTemplate: options.wikiTemplate,
  }, null, 2)}\n`
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
 * `wiki` 的失效判据与另两行不同：它不在枚举集里，而是看 host 的盘上检查（`options.wikiCheck`）。
 * 只有「检查的就是这个值」时才判失效——检查结果落后于设置时宁可显示未知，不谎报。
 * @param settings - 当前设置。
 * @param options - host 枚举出来的可选项 + wiki 检查。
 * @returns 三行。
 */
export function startupRows(settings: StartupSettings, options: StartupOptions): readonly StartupRow[] {
  return STARTUP_FIELDS.map((field) => {
    const value = settings[field]
    const allowed = field === 'productType' ? options.productTypes : field === 'deliveryMode' ? options.deliveryModes : null
    const invalid = field === 'wiki'
      ? value !== null && options.wikiCheck.value === value && !options.wikiCheck.ok
      : value !== null && allowed !== null && !allowed.includes(value)
    return {
      field,
      value,
      isAuto: value === null,
      options: allowed ?? [],
      invalid,
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
