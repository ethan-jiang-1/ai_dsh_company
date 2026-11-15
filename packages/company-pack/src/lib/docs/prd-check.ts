/**
 * MRD/PRD 结构校验（纯逻辑，keyless 可直测；`/prd check` 的判据唯一家）。
 *
 * 为什么需要它：PRD 不是文章，是**需求集**——研发按 slice 一批一批吃、一 REQ 一任务。
 * 编号、来源追溯、验收可判、依赖无环这些是机械不变量；靠人眼看会漂，所以进命令。
 * 边界：只挡结构性错误（缺字段/重号/断链/环），不判断需求好坏或市场真伪。
 *
 * 2026-11-13（用户批准方案 A）：PRD 的定义形态从 `json-ledger` 改为 `headings`。
 * 旧形状把 32 条需求写成 52KB JSON、再在正文复制一遍，且账本的软件枚举与工程惯例
 * 冲突（一场真实硬件 PRD 33 条红）。现在 `### REQ-###` 小节是唯一定义点，字段行
 * 直接可读；旧 `json-ledger` 文档保留只读兼容（`definition` 头分派），不回写。
 *
 * 2026-11-14：文档结构行判据（平台归一化 + 围栏 + HTML 注释）移到 `markdown-shape.ts`，
 * 与 `/req check` 共用同一份——两个消费者对同一份文档不允许有两种结论（BUG-160/162）。
 */
import { normalizeDocument, scanDocument, scanDocumentDetailed, splitTableRow } from './markdown-shape.ts'

export type PrdDocStatus = 'draft' | 'ready' | 'in-dev' | 'accepted'
export type PrdForm = 'headings' | 'json-ledger'
export type ReqType = 'functional' | 'non-functional' | 'constraint'
export type ReqPriority = 'P0' | 'P1' | 'P2'
export type ReqStatus = 'draft' | 'ready' | 'in-dev' | 'accepted' | 'deferred' | 'withdrawn'
/** `test|demonstration|analysis|inspection` = ISO 29148 方法（新 headings PRD）；`demo|review` = 旧 json-ledger 兼容值。 */
export type Verification = 'test' | 'demonstration' | 'analysis' | 'inspection' | 'demo' | 'review'

export interface MrdEvidence {
  readonly kind: 'fact' | 'assumption'
  readonly source: string
}

export interface MrdOpportunity {
  readonly id: string
  readonly title: string
  readonly segment: string
  readonly pain: string
  readonly evidence: readonly MrdEvidence[]
  readonly recommendation: 'go' | 'no-go' | 'defer'
  readonly confidence?: 'high' | 'medium' | 'low'
}

export interface MrdDoc {
  readonly version: string
  readonly status: string
  readonly opportunities: readonly MrdOpportunity[]
}

export interface AcceptanceCriterion {
  readonly id: string
  readonly given: string
  readonly when: string
  readonly then: string
}

export interface PrdRequirement {
  readonly id: string
  readonly title: string
  readonly type: ReqType
  readonly priority: ReqPriority
  readonly status: ReqStatus
  readonly source: readonly string[]
  readonly slice: string
  readonly userStory: string
  readonly acceptance: readonly AcceptanceCriterion[]
  readonly dependsOn: readonly string[]
  readonly verification: Verification
  readonly openQuestions?: readonly string[]
  readonly changeLog?: readonly { readonly at: string; readonly by: string; readonly change: string }[]
}

export interface PrdSlice {
  readonly id: string
  readonly goal: string
  readonly requirements: readonly string[]
}

export interface PrdDoc {
  readonly version: string
  readonly status: PrdDocStatus
  readonly slices: readonly PrdSlice[]
  readonly requirements: readonly PrdRequirement[]
}

export interface ProductDocsCheck {
  readonly ok: boolean
  readonly errors: readonly string[]
  readonly mrdCount: number
  readonly reqCount: number
  readonly acCount: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const asString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** 取 YAML 头（`---` 包起来的字段行）；缺失返回 null。只认 `key: value` 行，够本文件用。入口先归一化平台差异。 */
export function parsePrdHeader(text: string): { readonly layer?: string; readonly definition?: string } | null {
  const normalized = normalizeDocument(text)
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized)
  if (match === null) return null
  const fields: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([a-z-]+):\s*(.*)$/.exec(line.trim())
    if (field !== null) fields[field[1] ?? ''] = (field[2] ?? '').trim()
  }
  return { ...(fields['layer'] !== undefined ? { layer: fields['layer'] } : {}), ...(fields['definition'] !== undefined ? { definition: fields['definition'] } : {}) }
}

/**
 * 从 Markdown 中取第一个 ```json 代码块（MRD 的机器可读头；旧 PRD 也走这里）。
 * 先屏蔽 HTML 注释：注释里的账本是「停用」的，不能被当成定义（BUG-173）。
 */
export function extractJsonBlock(text: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: string } {
  // 只认**顶层**围栏块：示例围栏（markdown 块里嵌 json 块）不会被当成账本（BUG-176）；
  // 注释里的围栏在结构扫描里已经不算围栏，天然被排除。
  const block = scanDocumentDetailed(text).fences.find(fence => /^json\b/i.test(fence.info.trim()))
  if (block === undefined) return { ok: false, error: '缺 ```json 需求块（模板见 content/templates/mrd.md；PRD 新形状见 prd.md）' }
  try {
    return { ok: true, value: JSON.parse(block.content) as unknown }
  } catch (error) {
    return { ok: false, error: `json 需求块不可解析：${(error as Error).message}` }
  }
}

function requireArray(value: unknown, where: string, name: string, errors: string[]): void {
  if (value !== undefined && !Array.isArray(value)) errors.push(`${where}.${name} 必须是数组`)
}

function readEvidence(raw: unknown, where: string, errors: string[]): MrdEvidence[] {
  requireArray(raw, where, 'evidence', errors)
  const out: MrdEvidence[] = []
  for (const [index, item] of asArray(raw).entries()) {
    if (!isRecord(item)) { errors.push(`${where}.evidence[${index}] 不是对象`); continue }
    const kind = asString(item.kind)
    const source = asString(item.source)
    if (kind !== 'fact' && kind !== 'assumption') errors.push(`${where}.evidence[${index}].kind 必须是 fact|assumption`)
    if (source === undefined) errors.push(`${where}.evidence[${index}].source 缺失（每条证据必须带出处或待验证说明）`)
    if ((kind === 'fact' || kind === 'assumption') && source !== undefined) out.push({ kind, source })
  }
  if (out.length === 0 && errors.every(error => !error.startsWith(`${where}.evidence`))) {
    errors.push(`${where}.evidence 不能为空（至少一条证据）`)
  }
  return out
}

function coerceMrd(root: unknown): { readonly doc?: MrdDoc; readonly errors: string[] } {
  const errors: string[] = []
  if (!isRecord(root) || !isRecord(root.mrd)) return { errors: ['MRD 缺顶层 mrd 对象'] }
  const mrd = root.mrd
  const version = asString(mrd.version) ?? '0.1'
  const status = asString(mrd.status) ?? 'draft'
  requireArray(mrd.opportunities, 'mrd', 'opportunities', errors)
  const opportunities: MrdOpportunity[] = []
  const seen = new Set<string>()
  const raw = asArray(mrd.opportunities)
  if (raw.length === 0) errors.push('MRD opportunities 不能为空')
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) { errors.push(`opportunities[${index}] 不是对象`); continue }
    const where = `opportunities[${index}]`
    const id = asString(item.id)
    if (id === undefined || !/^MR-\d{3}$/.test(id)) errors.push(`${where}.id 必须是 MR-###（如 MR-001）`)
    else if (seen.has(id)) errors.push(`${where}.id 重号：${id}`)
    else seen.add(id)
    const title = asString(item.title)
    const segment = asString(item.segment)
    const pain = asString(item.pain)
    if (title === undefined) errors.push(`${where}.title 缺失`)
    if (segment === undefined) errors.push(`${where}.segment 缺失`)
    if (pain === undefined) errors.push(`${where}.pain 缺失`)
    const evidence = readEvidence(item.evidence, where, errors)
    const recommendation = asString(item.recommendation)
    if (recommendation !== 'go' && recommendation !== 'no-go' && recommendation !== 'defer') {
      errors.push(`${where}.recommendation 必须是 go|no-go|defer`)
    }
    const confidence = asString(item.confidence)
    if (confidence !== undefined && confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') {
      errors.push(`${where}.confidence 必须是 high|medium|low`)
    }
    if (id !== undefined && title !== undefined && segment !== undefined && pain !== undefined
      && (recommendation === 'go' || recommendation === 'no-go' || recommendation === 'defer')) {
      opportunities.push({ id, title, segment, pain, evidence, recommendation, ...(confidence === 'high' || confidence === 'medium' || confidence === 'low' ? { confidence } : {}) })
    }
  }
  return { doc: { version, status, opportunities }, errors }
}

// ── 旧形状：json-ledger（只读兼容，2026-11-07 起；新 PRD 不再写）────────────────

function coerceLegacyPrd(root: unknown): { readonly doc?: PrdDoc; readonly errors: string[] } {
  const errors: string[] = []
  if (!isRecord(root) || !isRecord(root.prd)) return { errors: ['PRD 缺顶层 prd 对象'] }
  const prd = root.prd
  const version = asString(prd.version) ?? '0.1'
  const status = asString(prd.status) ?? 'draft'
  if (!['draft', 'ready', 'in-dev', 'accepted'].includes(status)) errors.push(`prd.status 必须是 draft|ready|in-dev|accepted（实际 ${status}）`)
  const slices: PrdSlice[] = []
  requireArray(prd.slices, 'prd', 'slices', errors)
  requireArray(prd.requirements, 'prd', 'requirements', errors)
  const sliceSeen = new Set<string>()
  for (const [index, item] of asArray(prd.slices).entries()) {
    if (!isRecord(item)) { errors.push(`slices[${index}] 不是对象`); continue }
    const id = asString(item.id)
    const goal = asString(item.goal)
    if (id === undefined) errors.push(`slices[${index}].id 缺失`)
    else if (sliceSeen.has(id)) errors.push(`slices[${index}].id 重号：${id}`)
    else sliceSeen.add(id)
    if (goal === undefined) errors.push(`slices[${index}].goal 缺失`)
    requireArray(item.requirements, `slices[${index}]`, 'requirements', errors)
    const requirements = asArray(item.requirements).map(value => asString(value)).filter((value): value is string => value !== undefined)
    if (requirements.length === 0) errors.push(`slices[${index}].requirements 不能为空`)
    if (id !== undefined && goal !== undefined && requirements.length > 0) slices.push({ id, goal, requirements })
  }
  if (slices.length === 0) errors.push('PRD 至少要有 1 个 slice（先给最小端到端 S1）')
  const requirements: PrdRequirement[] = []
  const reqSeen = new Set<string>()
  for (const [index, item] of asArray(prd.requirements).entries()) {
    if (!isRecord(item)) { errors.push(`requirements[${index}] 不是对象`); continue }
    const where = `requirements[${index}]`
    const id = asString(item.id)
    if (id === undefined || !/^REQ-\d{3}$/.test(id)) errors.push(`${where}.id 必须是 REQ-###（如 REQ-001）`)
    else if (reqSeen.has(id)) errors.push(`${where}.id 重号：${id}`)
    else reqSeen.add(id)
    const title = asString(item.title)
    const userStory = asString(item.userStory)
    const slice = asString(item.slice)
    const type = asString(item.type)
    const priority = asString(item.priority)
    const statusValue = asString(item.status)
    const verification = asString(item.verification)
    if (title === undefined) errors.push(`${where}.title 缺失`)
    if (userStory === undefined) errors.push(`${where}.userStory 缺失`)
    if (slice === undefined) errors.push(`${where}.slice 缺失`)
    if (type !== 'functional' && type !== 'non-functional' && type !== 'constraint') errors.push(`${where}.type 必须是 functional|non-functional|constraint`)
    if (priority !== 'P0' && priority !== 'P1' && priority !== 'P2') errors.push(`${where}.priority 必须是 P0|P1|P2`)
    if (statusValue !== 'draft' && statusValue !== 'ready' && statusValue !== 'in-dev' && statusValue !== 'accepted' && statusValue !== 'deferred' && statusValue !== 'withdrawn') {
      errors.push(`${where}.status 必须是 draft|ready|in-dev|accepted|deferred|withdrawn`)
    }
    if (verification !== 'test' && verification !== 'demo' && verification !== 'review') errors.push(`${where}.verification 必须是 test|demo|review`)
    requireArray(item.source, where, 'source', errors)
    const source = asArray(item.source).map(value => asString(value)).filter((value): value is string => value !== undefined)
    if (source.length === 0) errors.push(`${where}.source 不能为空（每条 REQ 至少指回一个 MR id）`)
    for (const sourceId of source) {
      if (!/^MR-\d{3}$/.test(sourceId)) errors.push(`${where}.source 含非法 MR id：${sourceId}`)
    }
    requireArray(item.dependsOn, where, 'dependsOn', errors)
    const dependsOn = asArray(item.dependsOn).map(value => asString(value)).filter((value): value is string => value !== undefined)
    for (const dep of dependsOn) {
      if (!/^REQ-\d{3}$/.test(dep)) errors.push(`${where}.dependsOn 含非法 REQ id：${dep}`)
      if (dep === id) errors.push(`${where}.dependsOn 不能依赖自己`)
    }
    requireArray(item.acceptance, where, 'acceptance', errors)
    const acceptance: AcceptanceCriterion[] = []
    const acSeen = new Set<string>()
    for (const [acIndex, acRaw] of asArray(item.acceptance).entries()) {
      if (!isRecord(acRaw)) { errors.push(`${where}.acceptance[${acIndex}] 不是对象`); continue }
      const acWhere = `${where}.acceptance[${acIndex}]`
      const acId = asString(acRaw.id)
      const given = asString(acRaw.given)
      const when = asString(acRaw.when)
      const then = asString(acRaw.then)
      if (acId === undefined || !/^AC-\d{3}-\d+$/.test(acId)) errors.push(`${acWhere}.id 必须是 AC-<REQ编号>-<n>（如 AC-001-1）`)
      else if (acSeen.has(acId)) errors.push(`${acWhere}.id 重号：${acId}`)
      else acSeen.add(acId)
      if (given === undefined) errors.push(`${acWhere}.given 缺失`)
      if (when === undefined) errors.push(`${acWhere}.when 缺失`)
      if (then === undefined) errors.push(`${acWhere}.then 缺失`)
      if (acId !== undefined && id !== undefined && /^AC-(\d{3})-\d+$/.exec(acId)?.[1] !== id.slice(4, 7)) {
        errors.push(`${acWhere}.id 与父 REQ 编号不一致（${acId} vs ${id}）`)
      }
      if (acId !== undefined && given !== undefined && when !== undefined && then !== undefined) {
        // oxlint-disable-next-line unicorn/no-thenable -- `then` 是 AC 的给定字段名（Given/When/Then 与模板、/prd check 同源），不是 thenable
        acceptance.push({ id: acId, given, when, then })
      }
    }
    if (asArray(item.acceptance).length === 0) errors.push(`${where}.acceptance 不能为空（每条 REQ 至少一条可判真假的 AC）`)
    requireArray(item.changeLog, where, 'changeLog', errors)
    const changeLog = asArray(item.changeLog).map(entry => {
      if (!isRecord(entry)) return undefined
      const at = asString(entry.at)
      const by = asString(entry.by)
      const change = asString(entry.change)
      return at !== undefined && by !== undefined && change !== undefined ? { at, by, change } : undefined
    }).filter((entry): entry is { at: string; by: string; change: string } => entry !== undefined)
    requireArray(item.openQuestions, where, 'openQuestions', errors)
    const openQuestions = asArray(item.openQuestions).map(value => asString(value)).filter((value): value is string => value !== undefined)
    if (statusValue !== undefined && statusValue !== 'draft' && changeLog.length === 0) {
      errors.push(`${where}.changeLog 不能为空（状态离开 draft 必须留痕）`)
    }
    if (id !== undefined && title !== undefined && userStory !== undefined && slice !== undefined
      && (type === 'functional' || type === 'non-functional' || type === 'constraint')
      && (priority === 'P0' || priority === 'P1' || priority === 'P2')
      && (statusValue === 'draft' || statusValue === 'ready' || statusValue === 'in-dev' || statusValue === 'accepted' || statusValue === 'deferred' || statusValue === 'withdrawn')
      && (verification === 'test' || verification === 'demo' || verification === 'review')) {
      requirements.push({ id, title, type, priority, status: statusValue, source, slice, userStory, acceptance, dependsOn, verification, openQuestions, changeLog })
    }
  }
  if (requirements.length === 0) errors.push('PRD 至少要有一条需求（无需求 = 没定义产品）')
  return { doc: { version, status: status as PrdDocStatus, slices, requirements }, errors }
}

// ── 新形状：headings（定义点 = `### REQ-###` 小节；正文/表格只引用）────────────────

const PRD_SECTION_HEADING = /^[ ]{0,3}###\s+(REQ-\d{3})\b\s*(.*)$/
const TYPES: readonly ReqType[] = ['functional', 'non-functional', 'constraint']
const PRIORITIES: readonly ReqPriority[] = ['P0', 'P1', 'P2']
const STATUSES: readonly ReqStatus[] = ['draft', 'ready', 'in-dev', 'accepted', 'deferred', 'withdrawn']
const VERIFICATIONS: readonly Verification[] = ['test', 'demonstration', 'analysis', 'inspection', 'demo', 'review']

/** 枚举容错：`nonFunctional` / `Non-Functional` → `non-functional`（大小写与驼峰都不判红）。 */
function normalizeToken(value: string): string {
  return value.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * `YYYY-MM-DD` 且是真实日历日期（BUG-166）。
 *
 * 形状正则不够：`2026-13-99`、`2026-02-29`（非闰年）都能过 `\d{4}-\d{2}-\d{2}`；
 * Date 往返会把越界月/日规范化成另一个日期，往返串不相等即判非法。
 */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function parseBracketList(raw: string): string[] {
  const value = raw.trim()
  if (value === '' || value === '[]') return []
  const inner = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
  return inner.split(',').map(item => item.trim()).filter(item => item !== '')
}


/** 解析 `## Slices` 表；每个 slice 必须列出显式 REQ id（R8 禁区间断言）。围栏/注释里的表不算定义（BUG-153/162）。 */
export function parsePrdSlices(text: string, errors: string[]): PrdSlice[] {
  const lines = scanDocument(text)
  const start = lines.findIndex(scanned => scanned.structural && /^[ ]{0,3}##\s+Slices\b/i.test(scanned.text))
  if (start === -1) {
    errors.push('PRD 缺「## Slices」表（slice 与 REQ 的归属没有声明面）')
    return []
  }
  const slices: PrdSlice[] = []
  const seen = new Set<string>()
  /** REQ → 它已归属的 slice；同一 REQ 只能属于一个 slice（BUG-164）。 */
  const reqOwner = new Map<string, string>()
  for (let index = start + 1; index < lines.length; index += 1) {
    const scanned = lines[index]
    if (scanned === undefined) break
    if (!scanned.structural) continue
    const line = scanned.text
    if (/^[ ]{0,3}##\s+/.test(line)) break
    if (!line.trim().startsWith('|')) continue
    const cells = splitTableRow(line)
    const id = cells[0] ?? ''
    if (id === '' || /^slice$/i.test(id) || /^-+$/.test(id)) continue
    if (!/^S\d+$/.test(id)) {
      errors.push(`Slices 表首列必须是 slice id（S1…），实际：${id}`)
      continue
    }
    if (seen.has(id)) {
      errors.push(`slice ${id} 重号（一个 slice 号只能有一行；同一个 REQ 只能属于一个 slice）`)
      continue
    }
    seen.add(id)
    const goal = cells[1] ?? ''
    const requirementCell = cells[2] ?? ''
    if (/…|\.\.\.|~/.test(requirementCell)) errors.push(`slice ${id} 的 requirements 必须是显式 REQ id（不用区间）`)
    const requirements = requirementCell.split(',').map(item => item.trim()).filter(item => item !== '')
    for (const reqId of requirements) {
      if (!/^REQ-\d{3}$/.test(reqId)) {
        errors.push(`slice ${id} 含非法 REQ id：${reqId}`)
        continue
      }
      const owner = reqOwner.get(reqId)
      if (owner === undefined) reqOwner.set(reqId, id)
      else if (owner === id) errors.push(`slice ${id} 重复列出 ${reqId}（同一 slice 里一个 REQ 只能列一次）`)
      else errors.push(`${reqId} 同时列在 slice ${owner} 与 ${id}（一个 REQ 只能属于一个 slice）`)
    }
    if (goal === '') errors.push(`slice ${id} 缺 goal`)
    if (requirements.length === 0) errors.push(`slice ${id} 的 requirements 不能为空`)
    slices.push({ id, goal, requirements })
  }
  if (slices.length === 0) errors.push('Slices 表没有数据行（至少 1 个 slice：先给最小端到端 S1）')
  return slices
}

interface RequirementBlock {
  readonly id: string
  readonly title: string
  readonly line: number
  readonly body: readonly string[]
}

/** 取 `### REQ-###` 定义小节；块在下一个 `##`/`###` 标题处结束。围栏/注释里的内容不是定义（BUG-153/162）。 */
export function prdRequirementBlocks(text: string): RequirementBlock[] {
  const lines = scanDocument(text)
  const blocks: RequirementBlock[] = []
  let current: { id: string; title: string; line: number; body: string[] } | undefined
  const flush = (): void => {
    if (current !== undefined) blocks.push({ id: current.id, title: current.title, line: current.line, body: current.body })
    current = undefined
  }
  for (const [index, scanned] of lines.entries()) {
    if (!scanned.structural) continue
    const line = scanned.text
    const heading = PRD_SECTION_HEADING.exec(line)
    if (heading !== null) {
      flush()
      current = { id: heading[1] ?? '', title: (heading[2] ?? '').trim(), line: index + 1, body: [] }
      continue
    }
    if (current !== undefined && /^[ ]{0,3}#{2,3}\s+/.test(line)) { flush(); continue }
    if (current !== undefined) current.body.push(line)
  }
  flush()
  return blocks
}

interface RequirementFields {
  readonly scalars: Map<string, string>
  readonly lists: Map<string, readonly string[]>
  readonly acceptance: readonly AcceptanceCriterion[]
  readonly openQuestions: readonly string[]
  readonly changeLog: readonly { readonly at: string; readonly by: string; readonly change: string }[]
}

/** 读一个小节的行首字段；`acceptance` / `openQuestions` / `changeLog` 用缩进子项。 */
function readRequirementFields(id: string, body: readonly string[], errors: string[]): RequirementFields {
  const scalars = new Map<string, string>()
  const lists = new Map<string, string[]>()
  const acceptance: AcceptanceCriterion[] = []
  const openQuestions: string[] = []
  const changeLog: { at: string; by: string; change: string }[] = []
  const seen = new Set<string>()
  const acSeen = new Set<string>()
  for (let index = 0; index < body.length; index += 1) {
    const field = /^-\s+([A-Za-z][\w]*):\s*(.*)$/.exec(body[index] ?? '')
    if (field === null) continue
    const name = (field[1] ?? '').toLowerCase()
    const value = (field[2] ?? '').trim()
    if (seen.has(name)) errors.push(`${id} 字段 ${name} 重复`)
    seen.add(name)
    if (name === 'acceptance') {
      if (value !== '') { errors.push(`${id}.acceptance 必须用「  - AC-…」子项书写（不在字段行内联）`); continue }
      let cursor = index + 1
      while (cursor < body.length) {
        const acHead = /^\s{2}-\s+(AC-\d{3}-\d+)\s*$/.exec(body[cursor] ?? '')
        if (acHead === null) break
        // oxlint-disable-next-line unicorn/no-thenable -- `then` 是 AC 的给定字段名（Given/When/Then），不是 thenable
        const ac = { id: acHead[1] ?? '', given: '', when: '', then: '' }
        let inner = cursor + 1
        while (inner < body.length) {
          const part = /^\s{4}-\s+(given|when|then):\s*(.*)$/.exec(body[inner] ?? '')
          if (part === null) break
          const key = part[1] as 'given' | 'when' | 'then'
          ac[key] = (part[2] ?? '').trim()
          inner += 1
        }
        acceptance.push(ac)
        if (acSeen.has(ac.id)) errors.push(`${id}.acceptance 的 ${ac.id} 重号（一个判据号只能有一个定义）`)
        else acSeen.add(ac.id)
        cursor = inner
      }
      index = cursor - 1
    } else if (name === 'openquestions' || name === 'changelog') {
      const items: string[] = []
      if (value !== '' && value !== '[]') items.push(...parseBracketList(value))
      let cursor = index + 1
      while (cursor < body.length) {
        const item = /^\s{2}-\s+(.*)$/.exec(body[cursor] ?? '')
        if (item === null) break
        items.push((item[1] ?? '').trim())
        cursor += 1
      }
      if (name === 'openquestions') openQuestions.push(...items)
      else {
        for (const entry of items) {
          const parts = entry.split('·').map(part => part.trim())
          if (parts.length !== 3) { errors.push(`${id}.changeLog 条目必须是「日期 · 作者 · 变更」：${entry}`); continue }
          const [at, by, change] = parts as [string, string, string]
          if (!isCalendarDate(at)) errors.push(`${id}.changeLog 日期必须是真实日历日期 YYYY-MM-DD：${entry}`)
          if (by === '') errors.push(`${id}.changeLog 作者不能为空：${entry}`)
          if (change === '') errors.push(`${id}.changeLog 变更说明不能为空：${entry}`)
          changeLog.push({ at, by, change })
        }
      }
      index = cursor - 1
    } else if (name === 'source' || name === 'traces' || name === 'dependson') {
      lists.set(name, parseBracketList(value))
    } else {
      scalars.set(name, value)
    }
  }
  return { scalars, lists, acceptance, openQuestions, changeLog }
}

/** 解析 headings PRD：slices + `### REQ-###` 定义小节。 */
export function parsePrdHeadings(text: string): { readonly doc?: PrdDoc; readonly errors: string[] } {
  const errors: string[] = []
  const slices = parsePrdSlices(text, errors)
  const blocks = prdRequirementBlocks(text)
  if (blocks.length === 0) errors.push('PRD 没有 `### REQ-###` 定义小节（没有需求 = 没定义产品）')
  const requirements: PrdRequirement[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    const where = block.id
    if (seen.has(where)) errors.push(`${where} 重号（一个号只能有一个定义点）`)
    seen.add(where)
    const fields = readRequirementFields(where, block.body, errors)
    const scalar = (name: string): string => fields.scalars.get(name) ?? ''
    const list = (name: string): readonly string[] => fields.lists.get(name) ?? []
    const title = block.title
    if (title === '') errors.push(`${where}.title 缺失（标题写在 ### REQ-### 后）`)
    const userStory = scalar('userstory')
    if (userStory === '') errors.push(`${where}.userStory 缺失`)
    const source = list('source')
    if (source.length === 0) errors.push(`${where}.source 不能为空（每条 REQ 至少指回一个 MR id）`)
    for (const sourceId of source) if (!/^MR-\d{3}$/.test(sourceId)) errors.push(`${where}.source 含非法 MR id：${sourceId}`)
    for (const trace of list('traces')) if (!/^REQ-\d{3}$/.test(trace)) errors.push(`${where}.traces 含非法 REQ id：${trace}`)
    const slice = scalar('slice')
    if (slice === '') errors.push(`${where}.slice 缺失`)
    const typeValue = normalizeToken(scalar('type'))
    const type = TYPES.find(candidate => candidate === typeValue)
    if (type === undefined) errors.push(`${where}.type 必须是 functional|non-functional|constraint（实际 ${scalar('type') === '' ? '缺失' : scalar('type')}）`)
    const priorityValue = scalar('priority')
    const priority = PRIORITIES.find(candidate => candidate === priorityValue.toUpperCase())
    if (priority === undefined) errors.push(`${where}.priority 必须是 P0|P1|P2（实际 ${priorityValue === '' ? '缺失' : priorityValue}）`)
    const statusValue = scalar('status')
    const status = STATUSES.find(candidate => candidate === statusValue)
    if (status === undefined) errors.push(`${where}.status 必须是 draft|ready|in-dev|accepted|deferred|withdrawn（实际 ${statusValue === '' ? '缺失' : statusValue}）`)
    const verificationValue = scalar('verification').toLowerCase()
    const verification = VERIFICATIONS.find(candidate => candidate === verificationValue)
    if (verification === undefined) errors.push(`${where}.verification 必须是 test|demonstration|analysis|inspection（实际 ${scalar('verification') === '' ? '缺失' : scalar('verification')}）`)
    if (fields.acceptance.length === 0) errors.push(`${where}.acceptance 不能为空（每条 REQ 至少一条可判真假的 AC）`)
    for (const ac of fields.acceptance) {
      if (!/^AC-\d{3}-\d+$/.test(ac.id)) errors.push(`${where}.acceptance 的 id 必须是 AC-<REQ编号>-<n>：${ac.id}`)
      else if (/^AC-(\d{3})-\d+$/.exec(ac.id)?.[1] !== where.slice(4, 7)) errors.push(`${where}.acceptance 的 id 与父 REQ 编号不一致：${ac.id}`)
      if (ac.given === '') errors.push(`${ac.id}.given 缺失`)
      if (ac.when === '') errors.push(`${ac.id}.when 缺失`)
      if (ac.then === '') errors.push(`${ac.id}.then 缺失`)
    }
    const dependsOn = list('dependson')
    for (const dep of dependsOn) {
      if (!/^REQ-\d{3}$/.test(dep)) errors.push(`${where}.dependsOn 含非法 REQ id：${dep}`)
      if (dep === where) errors.push(`${where}.dependsOn 不能依赖自己`)
    }
    if (status !== undefined && status !== 'draft' && fields.changeLog.length === 0) {
      errors.push(`${where}.changeLog 不能为空（状态离开 draft 必须留痕）`)
    }
    // 有定义（id 合法且唯一）就进集合：字段错误已单独报，跨文档检查不应再产生级联假红。
    requirements.push({
      id: where,
      title: title === '' ? '（缺标题）' : title,
      type: type ?? 'functional',
      priority: priority ?? 'P0',
      status: status ?? 'draft',
      source,
      slice,
      userStory,
      acceptance: fields.acceptance,
      dependsOn,
      verification: verification ?? 'test',
      openQuestions: fields.openQuestions,
      changeLog: fields.changeLog,
    })
  }
  return { doc: { version: '1.0', status: 'draft', slices, requirements }, errors }
}

/** 按 `definition` 头分派：headings（新）/ json-ledger（旧，只读兼容）。入口归一化平台差异（BUG-152）。 */
export function parsePrdDocument(text: string): { readonly doc?: PrdDoc; readonly errors: string[]; readonly form?: PrdForm } {
  const normalized = normalizeDocument(text)
  const scan = scanDocumentDetailed(normalized)
  if (scan.unclosedCommentLine !== undefined) {
    return { errors: [`PRD：HTML 注释未闭合（第 ${scan.unclosedCommentLine} 行起）——后文会被当成注释内容；补上 \`-->\` 后重跑 /prd check（BUG-169）`] }
  }
  const header = parsePrdHeader(normalized)
  const form = header?.definition ?? ''
  if (form === 'headings') return { ...parsePrdHeadings(normalized), form }
  if (form === 'json-ledger') {
    const block = extractJsonBlock(normalized)
    if (!block.ok) return { errors: [`PRD：${block.error}`], form }
    return { ...coerceLegacyPrd(block.value), form }
  }
  return { errors: [`PRD：缺 definition 头或非法（新 PRD 应为 headings；旧动议可保持 json-ledger；实际 ${form === '' ? '（缺失）' : form}）`] }
}

/** 校验 MRD + PRD 一对文档；返回所有结构性问题（空 = 通过）。 */
export function validateProductDocs(mrdText: string, prdText: string): ProductDocsCheck {
  const errors: string[] = []
  const mrdBlock = extractJsonBlock(mrdText)
  if (!mrdBlock.ok) {
    errors.push(`MRD：${mrdBlock.error}`)
    return { ok: false, errors, mrdCount: 0, reqCount: 0, acCount: 0 }
  }
  const mrd = coerceMrd(mrdBlock.value)
  const prd = parsePrdDocument(prdText)
  errors.push(...mrd.errors, ...prd.errors)
  if (mrd.doc === undefined || prd.doc === undefined) {
    return { ok: false, errors: [...new Set(errors)], mrdCount: mrd.doc?.opportunities.length ?? 0, reqCount: 0, acCount: 0 }
  }
  const opportunityIds = new Set(mrd.doc.opportunities.map(opportunity => opportunity.id))
  const recommendationById = new Map<string, 'go' | 'no-go' | 'defer'>(
    mrd.doc.opportunities.map(opportunity => [opportunity.id, opportunity.recommendation] as const),
  )
  const reqIds = new Set(prd.doc.requirements.map(requirement => requirement.id))
  for (const requirement of prd.doc.requirements) {
    for (const sourceId of requirement.source) {
      if (!opportunityIds.has(sourceId)) errors.push(`${requirement.id}.source 指向不存在的 MR：${sourceId}`)
      else {
        const recommendation = recommendationById.get(sourceId)
        if (recommendation === 'no-go') errors.push(`${requirement.id}.source 指向 no-go 机会 ${sourceId}（no-go 不得进 PRD）`)
        if (recommendation === 'defer' && requirement.priority === 'P0') {
          errors.push(`${requirement.id}.source 指向 defer 机会 ${sourceId}（defer 不得进 P0，应落 P2/deferred）`)
        }
      }
    }
    const slice = prd.doc.slices.find(candidate => candidate.id === requirement.slice)
    if (slice === undefined) errors.push(`${requirement.id}.slice 指向不存在的 slice：${requirement.slice}`)
    else if (!slice.requirements.includes(requirement.id)) errors.push(`slice ${slice.id} 的 requirements 未列出 ${requirement.id}`)
    for (const dep of requirement.dependsOn) {
      if (!reqIds.has(dep)) errors.push(`${requirement.id}.dependsOn 指向不存在的 REQ：${dep}`)
    }
  }
  for (const slice of prd.doc.slices) {
    for (const reqId of slice.requirements) {
      if (!reqIds.has(reqId)) errors.push(`slice ${slice.id} 列出不存在的 REQ：${reqId}`)
    }
  }
  // 依赖环（DFS）
  const byId = new Map(prd.doc.requirements.map(requirement => [requirement.id, requirement]))
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (id: string, trail: string[]): void => {
    const status = state.get(id)
    if (status === 'done') return
    if (status === 'visiting') { errors.push(`依赖环：${[...trail, id].join(' → ')}`); return }
    state.set(id, 'visiting')
    for (const dep of byId.get(id)?.dependsOn ?? []) visit(dep, [...trail, id])
    state.set(id, 'done')
  }
  for (const id of reqIds) visit(id, [])
  const acCount = prd.doc.requirements.reduce((sum, requirement) => sum + requirement.acceptance.length, 0)
  const uniqueErrors = [...new Set(errors)]
  return {
    ok: uniqueErrors.length === 0,
    errors: uniqueErrors,
    mrdCount: mrd.doc.opportunities.length,
    reqCount: prd.doc.requirements.length,
    acCount,
  }
}
