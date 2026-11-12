/**
 * MRD/PRD 结构校验（纯逻辑，keyless 可直测；`/prd check` 的判据唯一家）。
 *
 * 为什么需要它：PRD 不是文章，是**需求账本**——研发按 slice 一批一批吃、一 REQ 一任务。
 * 编号、来源追溯、验收可判、依赖无环这些是机械不变量；靠人眼看会漂，所以进命令。
 * 边界：只挡结构性错误（缺字段/重号/断链/环），不判断需求好坏或市场真伪。
 */

export type PrdDocStatus = 'draft' | 'ready' | 'in-dev' | 'accepted'
export type ReqType = 'functional' | 'non-functional' | 'constraint'
export type ReqPriority = 'P0' | 'P1' | 'P2'
export type ReqStatus = 'draft' | 'ready' | 'in-dev' | 'accepted' | 'deferred' | 'withdrawn'
export type Verification = 'test' | 'demo' | 'review'

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

/** 从 Markdown 中取第一个 ```json 代码块（MRD/PRD 的机器可读头）。 */
export function extractJsonBlock(text: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: string } {
  const match = /```json\s*\n([\s\S]*?)\n```/.exec(text)
  if (match === null) return { ok: false, error: '缺 ```json 需求账本块（模板见 content/templates/prd.md）' }
  try {
    return { ok: true, value: JSON.parse(match[1] ?? '') as unknown }
  } catch (error) {
    return { ok: false, error: `json 需求账本不可解析：${(error as Error).message}` }
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

function coercePrd(root: unknown): { readonly doc?: PrdDoc; readonly errors: string[] } {
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

/** 校验 MRD + PRD 一对文档；返回所有结构性问题（空 = 通过）。 */
export function validateProductDocs(mrdText: string, prdText: string): ProductDocsCheck {
  const errors: string[] = []
  const mrdBlock = extractJsonBlock(mrdText)
  if (!mrdBlock.ok) errors.push(`MRD：${mrdBlock.error}`)
  const prdBlock = extractJsonBlock(prdText)
  if (!prdBlock.ok) errors.push(`PRD：${prdBlock.error}`)
  if (!mrdBlock.ok || !prdBlock.ok) return { ok: false, errors, mrdCount: 0, reqCount: 0, acCount: 0 }
  const mrd = coerceMrd(mrdBlock.value)
  const prd = coercePrd(prdBlock.value)
  errors.push(...mrd.errors, ...prd.errors)
  const opportunityIds = new Set(mrd.doc?.opportunities.map(opportunity => opportunity.id) ?? [])
  const recommendationById = new Map<string, 'go' | 'no-go' | 'defer'>(
    (mrd.doc?.opportunities ?? []).map(opportunity => [opportunity.id, opportunity.recommendation] as const),
  )
  const reqIds = new Set(prd.doc?.requirements.map(requirement => requirement.id) ?? [])
  for (const requirement of prd.doc?.requirements ?? []) {
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
    const slice = prd.doc?.slices.find(candidate => candidate.id === requirement.slice)
    if (slice === undefined) errors.push(`${requirement.id}.slice 指向不存在的 slice：${requirement.slice}`)
    else if (!slice.requirements.includes(requirement.id)) errors.push(`slice ${slice.id} 的 requirements 未列出 ${requirement.id}`)
    for (const dep of requirement.dependsOn) {
      if (!reqIds.has(dep)) errors.push(`${requirement.id}.dependsOn 指向不存在的 REQ：${dep}`)
    }
  }
  for (const slice of prd.doc?.slices ?? []) {
    for (const reqId of slice.requirements) {
      if (!reqIds.has(reqId)) errors.push(`slice ${slice.id} 列出不存在的 REQ：${reqId}`)
    }
  }
  // 依赖环（DFS）
  const byId = new Map((prd.doc?.requirements ?? []).map(requirement => [requirement.id, requirement]))
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
  const acCount = prd.doc?.requirements.reduce((sum, requirement) => sum + requirement.acceptance.length, 0) ?? 0
  const uniqueErrors = [...new Set(errors)]
  return {
    ok: uniqueErrors.length === 0,
    errors: uniqueErrors,
    mrdCount: mrd.doc?.opportunities.length ?? 0,
    reqCount: prd.doc?.requirements.length ?? 0,
    acCount,
  }
}
