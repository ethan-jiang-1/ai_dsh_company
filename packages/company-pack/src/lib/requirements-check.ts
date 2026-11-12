/**
 * 需求编号/层/追溯校验（A5 纯逻辑；`/req check` 的判据唯一家）。
 *
 * 为什么需要它：共识把「ID 只承载身份」当承重规则——层靠文档头、状态靠条目、追溯靠作者写边；
 * 机械可判的部分（重复定义 / 悬空 / 退役词 / 孤儿 / 覆盖 / 计数）必须由代码判红，否则
 * 「每个号都要解到一行」只能靠人记得。边界：只管编号与追溯，不判断需求好坏。
 *
 * 判据口径（合同 = 产品类型包 `content/product-types/<id>/requirements-model.md`）：
 * - 文档头 `layer` ∈ MRD/StRS/PRD/SyRS/IRS/V&V；`definition` ∈ json-ledger/headings/table-rows/none；
 *   层与定义形态必须匹配（MRD/PRD = json-ledger；StRS/SyRS/IRS = headings；V&V = table-rows；附录 = none）。
 * - 号形 `KIND-NNN`（KIND ∈ MR/REQ/IF/TC），`AC-<REQ号>-<n>` 从属父 REQ。
 * - 字段按行首标签解析（`- traces:`），不子串匹配（V11 实测：散文里的「可追溯性」会误判孤儿）。
 * - 追溯只认作者写的边；`:` 跨动议引用 v1 未支持，不解析、不判红。
 * - 范围：meta 没写 `numbering:` 的旧动议 = skipped（只读豁免）；`layers:` 声明本轮层，缺层 = 红。
 */

export type Layer = 'MRD' | 'StRS' | 'PRD' | 'SyRS' | 'IRS' | 'V&V'
export type DefinitionForm = 'json-ledger' | 'headings' | 'table-rows' | 'none'
export type RequirementKind = 'MR' | 'REQ' | 'IF' | 'TC'
export type IdKind = RequirementKind | 'AC'
export type EdgeType = 'source' | 'traces' | 'covers' | 'parent'

export const LAYERS: readonly Layer[] = ['MRD', 'StRS', 'PRD', 'SyRS', 'IRS', 'V&V']
export const DEFINITION_FORMS: readonly DefinitionForm[] = ['json-ledger', 'headings', 'table-rows', 'none']
export const LAYER_FORMS: Readonly<Record<Layer, DefinitionForm>> = {
  MRD: 'json-ledger',
  StRS: 'headings',
  PRD: 'json-ledger',
  SyRS: 'headings',
  IRS: 'headings',
  'V&V': 'table-rows',
}
/** 默认范围 = 到 PRD 为止（模板口径）；meta `layers:` 可扩到 SyRS/IRS/V&V。 */
export const DEFAULT_LAYERS: readonly Layer[] = ['MRD', 'StRS', 'PRD']
/** 下游写上游：本层条目的 traces/source 必须指向哪一层。 */
const UPSTREAM_LAYER: Readonly<Record<Layer, readonly Layer[]>> = {
  MRD: [],
  StRS: ['MRD'],
  PRD: ['StRS', 'MRD'],
  SyRS: ['PRD'],
  IRS: ['SyRS'],
  'V&V': ['MRD', 'StRS', 'PRD', 'SyRS', 'IRS'],
}

export interface MotionDoc {
  readonly rel: string
  readonly text: string
}

export interface MotionSnapshot {
  readonly meta?: MotionDoc
  readonly docs: readonly MotionDoc[]
}

export interface CheckOptions {
  /** 期望在场的层（覆盖 meta 声明与默认值）；缺层 = 红。 */
  readonly layers?: readonly Layer[]
  /** meta 没有声明 `layers:` 时的默认范围（产品类型包给；缺省 = 本仓默认到 PRD）。 */
  readonly defaultLayers?: readonly Layer[]
  /** 退役号前缀（产品类型包给；缺省 = 本仓默认）。空数组 = 该产品类型没有退役号概念。 */
  readonly retiredPrefixes?: readonly string[]
}

export interface Definition {
  readonly id: string
  readonly kind: IdKind
  readonly layer: Layer | null
  readonly rel: string
  readonly line: number
  readonly status: string
  readonly source: readonly string[]
  readonly traces: readonly string[]
  readonly covers: readonly string[]
}

export interface TraceEdge {
  readonly from: string
  readonly to: string
  readonly type: EdgeType
  readonly rel: string
  readonly line: number
}

export interface RequirementIndex {
  readonly definitions: readonly Definition[]
  readonly edges: readonly TraceEdge[]
  readonly counts: Readonly<Record<IdKind, number>>
  /** 上游 → 直接下游（派生矩阵，不手写）。 */
  readonly matrix: Readonly<Record<string, readonly string[]>>
  /** 应被覆盖但没有任何下游引用的号。 */
  readonly uncovered: readonly string[]
}

export interface RequirementsCheckResult {
  readonly ok: boolean
  readonly skipped: boolean
  readonly reason: string
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
  readonly layers: readonly Layer[]
  readonly index: RequirementIndex
}

const ID_PATTERN = /^(MR|REQ|IF|TC)-\d{3}$/
const AC_PATTERN = /^AC-(\d{3})-(\d+)$/
/** 退役号形（不是角色名：`VP-Eng` 不匹配）。 */
const DEFAULT_RETIRED_PREFIXES: readonly string[] = ['STR', 'SYR', 'IFR', 'VR', 'VP', 'V']
/** 退役号形（不是角色名：`VP-Eng` 不匹配）；前缀可由产品类型包覆盖。 */
function retiredPattern(prefixes: readonly string[]): RegExp {
  if (prefixes.length === 0) return /(?!x)x/g
  const escaped = prefixes.map(prefix => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(`\\b(?:${escaped})-(?:#+|\\d+)`, 'g')
}
const RANGE_CLAIM = /\b(?:MR|REQ|IF|TC)-\d{3}\s*[~～]\s*(?:MR|REQ|IF|TC)-\d{3}/g
const CANONICAL: Readonly<Record<Layer, string>> = {
  MRD: 'mrd.md',
  StRS: 'strs.md',
  PRD: 'prd.md',
  SyRS: 'syrs.md',
  IRS: 'irs.md',
  'V&V': 'vv-plan.md',
}

const emptyIndex = (): RequirementIndex => ({
  definitions: [],
  edges: [],
  counts: { MR: 0, REQ: 0, IF: 0, TC: 0, AC: 0 },
  matrix: {},
  uncovered: [],
})

export const isLayer = (value: string): value is Layer => (LAYERS as readonly string[]).includes(value)
export const isDefinitionForm = (value: string): value is DefinitionForm => (DEFINITION_FORMS as readonly string[]).includes(value)

/** 取 YAML 头字段（`---` 包起来）；没有头返回 null（= 不是需求文档，或漏写头）。 */
export function parseHeader(text: string): { layer?: string; definition?: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (match === null) return null
  const fields: { layer?: string; definition?: string } = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^(layer|definition):\s*(.*)$/.exec(line.trim())
    if (field === null) continue
    const value = (field[2] ?? '').trim()
    if (value === '') continue
    if (field[1] === 'layer') fields.layer = value
    else fields.definition = value
  }
  return fields
}

const parseList = (value: string): string[] => {
  const cleaned = value.trim().replace(/^\[/, '').replace(/\]$/, '')
  if (cleaned === '') return []
  return cleaned
    .split(/[,，、]/)
    .map(item => item.trim().replace(/^["']/, '').replace(/["']$/, ''))
    .filter(item => item !== '')
}

const idKind = (id: string): IdKind => {
  const match = /^([A-Z]+)-/.exec(id)
  const prefix = match?.[1] ?? ''
  return prefix === 'AC' ? 'AC' : (prefix as RequirementKind)
}

/** 从定义行块里取行首字段（`- traces: [MR-001]`）；不子串匹配。 */
function parseBlockFields(lines: readonly string[]): { status: string; source: string[]; traces: string[]; covers: string[] } {
  const out = { status: '', source: [] as string[], traces: [] as string[], covers: [] as string[] }
  for (const line of lines) {
    const field = /^\s*-\s+(source|traces|covers|status):\s*(.*)$/.exec(line)
    if (field === null) continue
    const key = field[1] ?? ''
    const value = (field[2] ?? '').trim()
    if (key === 'status') out.status = value
    else if (key === 'source') out.source = parseList(value)
    else if (key === 'traces') out.traces = parseList(value)
    else if (key === 'covers') out.covers = parseList(value)
  }
  return out
}

function headingDefinitions(rel: string, text: string, layer: Layer): Definition[] {
  const lines = text.split('\n')
  const headings: { index: number; id: string }[] = []
  for (const [index, line] of lines.entries()) {
    const match = /^(#{2,4})\s+((?:MR|REQ|IF|TC)-\d{3})\b/.exec(line.trim())
    if (match === null) continue
    headings.push({ index, id: match[2] ?? '' })
  }
  const definitions: Definition[] = []
  for (const [position, heading] of headings.entries()) {
    const end = headings[position + 1]?.index ?? lines.length
    const fields = parseBlockFields(lines.slice(heading.index + 1, end))
    definitions.push({
      id: heading.id,
      kind: idKind(heading.id),
      layer,
      rel,
      line: heading.index + 1,
      status: fields.status,
      source: fields.source,
      traces: fields.traces,
      covers: fields.covers,
    })
  }
  return definitions
}

interface JsonRequirement {
  readonly id?: unknown
  readonly status?: unknown
  readonly source?: unknown
  readonly traces?: unknown
  readonly acceptance?: unknown
}

function jsonLedgerDefinitions(rel: string, text: string, layer: Layer, errors: string[]): Definition[] {
  const block = /```json\r?\n([\s\S]*?)\r?\n```/.exec(text)
  if (block === null) {
    errors.push(`${rel} 声明 definition: json-ledger 但没有 json 账本代码块`)
    return []
  }
  const lines = text.split('\n')
  const lineOf = (id: string): number => {
    const index = lines.findIndex(line => line.includes(`"${id}"`))
    return index === -1 ? 1 : index + 1
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(block[1] ?? '')
  } catch {
    errors.push(`${rel} 的 json 账本不可解析`)
    return []
  }
  const definitions: Definition[] = []
  if (layer === 'MRD') {
    const root = (parsed as { mrd?: { opportunities?: unknown } }).mrd
    const opportunities = Array.isArray(root?.opportunities) ? root.opportunities : []
    for (const item of opportunities) {
      const record = item as { id?: unknown; status?: unknown }
      const id = typeof record.id === 'string' ? record.id : ''
      if (!ID_PATTERN.test(id) || idKind(id) !== 'MR') {
        errors.push(`${rel} 的机会条目 id 非法：${String(record.id)}`)
        continue
      }
      definitions.push({
        id,
        kind: 'MR',
        layer,
        rel,
        line: lineOf(id),
        status: typeof record.status === 'string' ? record.status : '',
        source: [],
        traces: [],
        covers: [],
      })
    }
  } else {
    const root = (parsed as { prd?: { requirements?: unknown } }).prd
    const requirements = Array.isArray(root?.requirements) ? (root.requirements as readonly JsonRequirement[]) : []
    for (const item of requirements) {
      const id = typeof item.id === 'string' ? item.id : ''
      if (!ID_PATTERN.test(id) || idKind(id) !== 'REQ') {
        errors.push(`${rel} 的需求条目 id 非法：${String(item.id)}`)
        continue
      }
      const source = Array.isArray(item.source) ? item.source.filter((value): value is string => typeof value === 'string') : []
      const traces = Array.isArray(item.traces) ? item.traces.filter((value): value is string => typeof value === 'string') : []
      definitions.push({
        id,
        kind: 'REQ',
        layer,
        rel,
        line: lineOf(id),
        status: typeof item.status === 'string' ? item.status : '',
        source,
        traces,
        covers: [],
      })
      const acceptance = Array.isArray(item.acceptance) ? item.acceptance : []
      for (const criterion of acceptance) {
        const entry = criterion as { id?: unknown }
        const acId = typeof entry.id === 'string' ? entry.id : ''
        if (!AC_PATTERN.test(acId)) {
          errors.push(`${rel} 的验收条目 id 非法：${String(entry.id)}`)
          continue
        }
        definitions.push({
          id: acId,
          kind: 'AC',
          layer,
          rel,
          line: lineOf(acId),
          status: typeof item.status === 'string' ? item.status : '',
          source: [],
          traces: [],
          covers: [],
        })
      }
    }
  }
  return definitions
}

function tableRowDefinitions(rel: string, text: string, layer: Layer): Definition[] {
  const lines = text.split('\n')
  const definitions: Definition[] = []
  for (let index = 0; index + 1 < lines.length; index += 1) {
    const headerLine = lines[index] ?? ''
    const separator = lines[index + 1] ?? ''
    if (!headerLine.trim().startsWith('|') || !/^\s*\|[\s:|-]+\|\s*$/.test(separator)) continue
    const cells = (line: string): string[] => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
    const headers = cells(headerLine).map(cell => cell.toLowerCase())
    const coversColumn = headers.findIndex(header => /covers|覆盖/.test(header))
    let cursor = index + 2
    let lineNo = cursor + 1
    for (; cursor < lines.length; cursor += 1, lineNo += 1) {
      const row = lines[cursor] ?? ''
      if (!row.trim().startsWith('|')) break
      const values = cells(row)
      const id = values.find(value => ID_PATTERN.test(value.replace(/\*/g, '')))?.replace(/\*/g, '') ?? ''
      if (id === '') continue
      const covers = coversColumn === -1 ? [] : parseList(values[coversColumn] ?? '')
      definitions.push({
        id,
        kind: idKind(id),
        layer,
        rel,
        line: lineNo,
        status: '',
        source: [],
        traces: [],
        covers,
      })
    }
    index = cursor
  }
  return definitions
}

function metaLayers(meta: string | undefined, errors: string[]): { layers: readonly Layer[] | undefined; skipped: boolean; reason: string } {
  if (meta === undefined) return { layers: undefined, skipped: false, reason: '' }
  const marker = /^numbering:\s*(.*)$/m.exec(meta)
  if (marker === null) return { layers: undefined, skipped: true, reason: 'meta 无 `numbering:` 标记——旧动议只读豁免' }
  const value = (marker[1] ?? '').trim()
  if (value !== 'identity') {
    errors.push(`meta 的 \`numbering: ${value}\` 不在词表（只认 identity）`)
    return { layers: undefined, skipped: false, reason: '' }
  }
  const declared = /^layers:\s*(.*)$/m.exec(meta)
  if (declared === null) return { layers: undefined, skipped: false, reason: '' }
  const layers: Layer[] = []
  for (const item of parseList(declared[1] ?? '')) {
    if (!isLayer(item)) {
      errors.push(`meta 的 \`需求层\` 含未知层：${item}`)
      continue
    }
    if (!layers.includes(item)) layers.push(item)
  }
  return { layers: layers.length === 0 ? undefined : layers, skipped: false, reason: '' }
}

/** 纯逻辑入口：给一组文档（+ 可选 meta），返回判红/索引/计数。 */
export function checkRequirements(snapshot: MotionSnapshot, options: CheckOptions = {}): RequirementsCheckResult {
  const errors: string[] = []
  const warnings: string[] = []
  const scope = metaLayers(snapshot.meta?.text, errors)
  if (scope.skipped) {
    return { ok: true, skipped: true, reason: scope.reason, errors: [], warnings: [], layers: [], index: emptyIndex() }
  }
  const declared = options.layers ?? scope.layers ?? options.defaultLayers ?? DEFAULT_LAYERS
  const retired = retiredPattern(options.retiredPrefixes ?? DEFAULT_RETIRED_PREFIXES)
  const layers = LAYERS.filter(layer => declared.includes(layer))

  const definitions: Definition[] = []
  const presentLayers = new Set<Layer>()
  for (const doc of snapshot.docs) {
    const header = parseHeader(doc.text)
    const canonicalLayer = (Object.entries(CANONICAL) as [Layer, string][]).find(([, name]) => doc.rel.endsWith(`/${name}`) || doc.rel === name)?.[0]
    if (header === null) {
      if (canonicalLayer !== undefined) errors.push(`${doc.rel} 缺 layer/definition 头——机器读不到层与定义形态`)
      continue
    }
    const layerValue = header.layer ?? ''
    const formValue = header.definition ?? ''
    if (layerValue === '' && formValue === 'none') continue // 附录（allocation）：不立号
    if (layerValue === '') {
      errors.push(`${doc.rel} 缺 layer（只有 definition: none 的附录可以不声明层）`)
      continue
    }
    if (!isLayer(layerValue)) {
      errors.push(`${doc.rel} 的 layer 非法：${layerValue}`)
      continue
    }
    const layer = layerValue
    if (!isDefinitionForm(formValue)) {
      errors.push(`${doc.rel} 的 definition 非法：${formValue === '' ? '（缺失）' : formValue}`)
      continue
    }
    if (formValue !== LAYER_FORMS[layer]) {
      errors.push(`${doc.rel} 的 definition 与层不匹配：${layer} 应为 ${LAYER_FORMS[layer]}，实际 ${formValue}`)
      continue
    }
    presentLayers.add(layer)
    if (formValue === 'json-ledger') definitions.push(...jsonLedgerDefinitions(doc.rel, doc.text, layer, errors))
    else if (formValue === 'headings') definitions.push(...headingDefinitions(doc.rel, doc.text, layer))
    else if (formValue === 'table-rows') definitions.push(...tableRowDefinitions(doc.rel, doc.text, layer))
    // 退役词 / 区间断言：只扫声明了层的需求文档（评审稿与 final 是引用面）。
    for (const [index, line] of doc.text.split('\n').entries()) {
      for (const match of line.matchAll(retired)) errors.push(`${doc.rel}:${String(index + 1)} 退役词 ${match[0]}`)
      for (const match of line.matchAll(RANGE_CLAIM)) errors.push(`${doc.rel}:${String(index + 1)} 区间计数断言 ${match[0]}（R8：计数由索引派生）`)
    }
  }

  // 期望层到场（meta 声明 / options / 默认）。
  for (const layer of layers) {
    if (!presentLayers.has(layer)) errors.push(`缺层 ${layer}：没有声明 layer: ${layer} 的文档（layers 声明要求它到场）`)
  }

  // 重复定义。
  const byId = new Map<string, Definition[]>()
  for (const definition of definitions) {
    const list = byId.get(definition.id) ?? []
    list.push(definition)
    byId.set(definition.id, list)
  }
  for (const [id, list] of byId) {
    if (list.length < 2) continue
    errors.push(`重复定义 ${id}：${list.map(item => `${item.rel}:${String(item.line)}`).join(' / ')}（一个号只能有一个定义点）`)
  }

  // 边的派生：source / traces / covers / AC 父号。
  const edges: TraceEdge[] = []
  for (const definition of definitions) {
    for (const target of definition.source) edges.push({ from: definition.id, to: target, type: 'source', rel: definition.rel, line: definition.line })
    for (const target of definition.traces) edges.push({ from: definition.id, to: target, type: 'traces', rel: definition.rel, line: definition.line })
    for (const target of definition.covers) edges.push({ from: definition.id, to: target, type: 'covers', rel: definition.rel, line: definition.line })
    const ac = AC_PATTERN.exec(definition.id)
    if (ac !== null) edges.push({ from: definition.id, to: `REQ-${ac[1] ?? ''}`, type: 'parent', rel: definition.rel, line: definition.line })
  }

  // 悬空 + 类型/层不符。
  for (const edge of edges) {
    const targets = byId.get(edge.to)
    if (targets === undefined) {
      errors.push(`悬空 ${edge.type} ${edge.from} → ${edge.to}（${edge.rel}:${String(edge.line)}）`)
      continue
    }
    const source = byId.get(edge.from)?.[0]
    if (source === undefined) continue
    if (edge.type === 'parent') {
      if (targets[0]?.kind !== 'REQ') errors.push(`AC 父号类型不符 ${edge.from} → ${edge.to}（父号必须是 REQ）`)
      continue
    }
    const allowed = source.layer === null ? [] : (UPSTREAM_LAYER[source.layer] ?? [])
    if (allowed.length > 0) {
      const targetLayer = targets[0]?.layer ?? null
      if (targetLayer !== null && !allowed.includes(targetLayer)) {
        errors.push(`追溯指向了不该指的层 ${edge.from} → ${edge.to}（${source.layer} 的上游只能是 ${allowed.join('/')}）`)
      }
    }
  }

  // 孤儿：本层条目必须写上游边（缺上游 = 红）。
  for (const definition of definitions) {
    const upstreamEdges = definition.source.length + definition.traces.length + definition.covers.length
    const needsUpstream = definition.kind !== 'MR' && definition.kind !== 'AC'
    if (needsUpstream && upstreamEdges === 0) {
      errors.push(`孤儿 ${definition.id}（${definition.rel}:${String(definition.line)}）：没有 source/traces/covers 上游边`)
    }
  }

  // 覆盖：上游被下游引用（只查声明链上的相邻层）。
  const referencedBy = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (edge.type === 'parent') continue
    const set = referencedBy.get(edge.to) ?? new Set<string>()
    set.add(edge.from)
    referencedBy.set(edge.to, set)
  }
  const downstreamLayer: Readonly<Record<string, Layer | null>> = {
    MRD: 'StRS',
    StRS: 'PRD',
    PRD: 'SyRS',
    SyRS: null, // SyRS 不强制被 IRS 覆盖：接口不是每条系统需求都有
    IRS: null,
    'V&V': null,
  }
  // TC 覆盖：V&V 在范围内时，每条 REQ/IF 至少一条 TC（A8 断言 5）。
  const tcScope = layers.includes('V&V')
  const tcCovered = new Set<string>()
  for (const edge of edges) {
    if (edge.type !== 'covers') continue
    if (byId.get(edge.from)?.[0]?.kind === 'TC') tcCovered.add(edge.to)
  }
  const uncovered: string[] = []
  for (const definition of definitions) {
    if (definition.kind === 'AC' || definition.layer === 'V&V') continue
    if (tcScope && (definition.kind === 'REQ' || definition.kind === 'IF')) {
      if (!tcCovered.has(definition.id)) uncovered.push(definition.id)
      continue
    }
    const next = definition.layer === null ? null : downstreamLayer[definition.layer] ?? null
    if (next === null || !layers.includes(next)) continue
    const downstream = referencedBy.get(definition.id)
    if (downstream === undefined || downstream.size === 0) uncovered.push(definition.id)
  }
  for (const id of uncovered) errors.push(`未覆盖 ${id}：没有下游条目引用它（覆盖缺口）`)

  const counts: Record<IdKind, number> = { MR: 0, REQ: 0, IF: 0, TC: 0, AC: 0 }
  const matrix: Record<string, string[]> = {}
  for (const definition of definitions) counts[definition.kind] += 1
  for (const edge of edges) {
    if (edge.type === 'parent') continue
    const list = matrix[edge.to] ?? []
    if (!list.includes(edge.from)) list.push(edge.from)
    matrix[edge.to] = list
  }

  return {
    ok: errors.length === 0,
    skipped: false,
    reason: '',
    errors,
    warnings,
    layers,
    index: { definitions, edges, counts, matrix, uncovered },
  }
}
