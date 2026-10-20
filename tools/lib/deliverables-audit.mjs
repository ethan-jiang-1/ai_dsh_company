// 交付物**声明对账**的纯逻辑实现（R4「成品流程」轮；2026-10-16 第三轮结构收敛自
// deliverables.mjs 按「形状与身份 / 声明对账」拆出——本文件只做会话声明与盘上比对）。
//
// 判据的合同家 = `company-workspace/AGENTS.md`「交付物三态」一节；动机与依据 =
// `notes/proposed/2026-09-22-workspace-hygiene.md`（验收判据 1）。
//
// 三态：
//   成品    `deliverables/<slug>/final.md`          —— 必须来自一次 Lead 会话的 `present`
//   过程稿  `deliverables/<slug>/drafts/<role>.md`  —— 角色自己的稿子，不是对外文本
//   排练    `snapshots/<round>-*/` 或删除            —— 不进 `deliverables/`
//
// 为什么"成品"限定 **Lead 会话**：`company-workspace/AGENTS.md` 的承诺权已写明"只有 CEO 能
// 对外发布结论……任何对外文本在 CEO `present` 之前都只是草稿"。实测（R2 归档）CFO 调用过 3 次
// `present`、VP-Sales 1 次——若不限归属，过程稿会与 CEO 定稿平级，"哪些是成品"仍答不上来。
//
// 判据按**交付物身份**（`slug` + 角色）比对，不按字面路径——这是为"三态迁移"留的口子：
// CEO 在 R1 声明的 `deliverables/kb-rag-assessment.md` 搬家成
// `deliverables/kb-rag-assessment/final.md` 之后，**那次声明依然成立**（同一份交付物、同一个
// 作者、同一个声明），否则迁移一次就把历史证据全判成 dangling——那是假阳性，不是违规。
// 身份解析（`deliverableId`）与盘上形状合法性（`classifyDeliverable`）住 ./deliverables.mjs。
//
// 本模块**不做 I/O**：调用方把"工作区文件清单"与"会话日志文本"喂进来。于是同一份逻辑
// 既能在回归层（`tests/`，秒级、无 key）被直接断言，也能被运行场脚本（`checks/`，可起进程）
// 复用——分层纪律见 `docs/guides/dev-loop.md` §9.1。
import {
  ARCHIVE_ROOT,
  ACTIVE_ROOT,
  DRAFTS_DIRNAME,
  FINAL_BASENAME,
  META_RESULTS,
  WARNING,
  validateMeta,
  classifyDeliverable,
  deliverableId,
  normalizeRel,
} from './deliverables.mjs'

/** 判据违规代码（测试与脚本都按这些码断言，别用自由文本）。 */
/**
 * 终态词表（反向门禁用，布局卡评审修正 6）：present 是收口动作 ⇒ 收口后「结果」必须是终态词。
 * 「进行中」合法但非终态——present 在而结果=进行中 = P6 病（收口了还挂着进行中）⇒ 红。
 */
export const META_FINAL_RESULTS = META_RESULTS.filter(word => word !== '进行中')


/**
 * 反向门禁（布局卡评审修正 6：present 在而结果≠终态 → 红；2026-10-04 code-review 补落）。
 * 射程：**Lead present 过的成品** × 其 meta 的「结果」字段——留空或「进行中」判红
 * （收口动作已发生，状态必须落终态）；无 meta 的成品不在射程（final-without-meta 观察项
 * T-9 盯守，避免同一条双报）。纯逻辑，IO 接线在 deliverables-check。
 * @param leadFinalSlugs - Lead present 过的成品 slug（`auditDeliverables().leadFinalSlugs`）。
 * @param metaResultBySlug - slug → meta「结果」字段值（缺行按留空）。
 * @returns 违规行数组：`{ slug, result }`。
 */
export function presentResultRows(leadFinalSlugs, metaResultBySlug) {
  const rows = []
  for (const slug of leadFinalSlugs) {
    const result = metaResultBySlug.get(slug)
    if (result === undefined) continue
    if (!META_FINAL_RESULTS.includes(result)) rows.push({ slug, result })
  }
  return rows
}

export const VIOLATION = {
  /** 盘上有成品，但没有任何 Lead 会话的 `present` 提及它。 */
  FINAL_NOT_PRESENTED: 'final-not-presented',
  /** Lead 的 `present` 提及某成品，但盘上没有该交付物的成品。 */
  PRESENTED_FINAL_MISSING: 'presented-final-missing',
  /** 非 Lead 会话 `present` 了成品——越权（承诺权在 CEO）。 */
  FINAL_PRESENTED_BY_NON_LEAD: 'final-presented-by-non-lead',
  /** `deliverables/` 下的 `.md` 既不是成品也不是过程稿形状。 */
  UNSHAPED_FILE: 'unshaped-file',
  /** meta.md 形状不合法（缺必填行 / 枚举外取值 / 日期格式不对——validateMeta 的判红面）。 */
  META_SHAPE_BAD: 'meta-shape-bad',
  /** `present` 提及的过程稿在盘上找不到（反向检查）。 */
  DANGLING_PRESENT: 'dangling-present',
  /** 「待补料」派活行无 schedule 任务为证（闸门④：行动幻觉 = 口头已立提醒而 schedule.json 无锚）。 */
  PENDING_MATERIAL_WITHOUT_SCHEDULE: 'pending-material-without-schedule',
  /** 反向门禁：Lead present 过的成品，meta「结果」仍非终态（留空/进行中——布局卡评审修正 6）。 */
  PRESENT_RESULT_NOT_FINAL: 'present-result-not-final',
}

/** 身份比较用的键（`kind` 参与比较：成品与过程稿不能互相顶替）。 */
function idKey(id) {
  return id.kind === 'final' ? `${id.slug}\u0000final` : `${id.slug}\u0000draft\u0000${id.role}`
}

/** Lead 会话的判据：`delegationDepth === 0` 且挂了公司入口角色的 preset。 */
export function isLeadSession(identity, leadPreset = 'ceo') {
  return identity.delegationDepth === 0 && identity.agentPreset === leadPreset
}

/**
 * 事实阻塞闸门④审计纯逻辑（2026-10-10）：「待补料」派活行必须有 schedule 任务为证——
 * 缺锚 = 行动幻觉（卡兹克案实证：口头"已立提醒"而 schedule.json 为空）。
 *
 * **锚的粒度（BUG-028，2026-10-19）**：纪律要的是"缺料有真跟进任务为证"，不是"每个 T 号各立一条"。
 * 所以某个 T 号满足**任一**条件即算已锚：
 *   ① 某条 `待补料·<slug>·…` 任务的 title/prompt 里**点名**了它；或
 *   ② 锚**写明**它（⇒ 该锚是总锚，覆盖全部缺料）。
 * 点名 = 整 T 号边界匹配（`T4` 不吃 `T40`），title 与 prompt 都算——总锚的省法正是"title 挂复查、
 * prompt 里逐项写到位后派哪个 T 号复算"，lingang-recon 现场即此形状。
 *
 * ③ **依赖链传递**：某待补料任务的依赖（`｜依赖：T4`）已被锚覆盖 ⇒ 它自己也已覆盖——它的卡点是
 * 那条前序任务，不是客户补料；前序任务到点复算后它自然解锁。只认**同样在待补料集合里**的依赖
 * （已完成的依赖不构成"谁盯着它"的问题），链路带环安全。
 *
 * slug 严格匹配（防串场），该 slug 一条锚都没有时照旧全判红。
 *
 * schedule 任务形状兼容 `{ record: { title, prompt } }`（storages/schedule.json 现形状）与平铺。
 * @param {string[]} pendingTaskIds
 * @param {Array<object>} scheduleTasks
 * @param {string} slug
 * @param {Record<string, string[]>} [depsById] 待补料任务 → 它依赖的 T 号（缺省 = 不看链路）
 * @returns 未锚的 T 号清单（空 = 全部已锚）。
 */
export function uncoveredPendingMaterial(pendingTaskIds, scheduleTasks, slug, depsById = {}) {
  const anchors = (scheduleTasks ?? [])
    .map(t => {
      const rec = t?.record ?? t ?? {}
      return { title: String(rec.title ?? ''), text: `${rec.title ?? ''}\n${rec.prompt ?? ''}` }
    })
    .filter(anchor => anchor.title.includes(`待补料·${slug}·`))
  // T 号边界：前面不许接字母数字/连字符（`T-1` 是合法号），后面不许接数字（T1 ≠ T10）。
  const names = (id, text) => new RegExp(`(?<![A-Za-z0-9-])${id}(?!\\d)`).test(text)
  const ids = pendingTaskIds ?? []
  const covered = new Set(ids.filter(id => anchors.some(anchor => anchor.text.includes('全部缺料') || names(id, anchor.text))))
  // 依赖链闭包：pending 内的前序任务已覆盖 ⇒ 后继也覆盖（只沿 pending 集合走，防把已完成任务当锚）。
  const pending = new Set(ids)
  let grew = true
  while (grew) {
    grew = false
    for (const id of ids) {
      if (covered.has(id)) continue
      const deps = (depsById?.[id] ?? []).filter(dep => pending.has(dep))
      if (deps.length > 0 && deps.some(dep => covered.has(dep))) {
        covered.add(id)
        grew = true
      }
    }
  }
  return ids.filter(id => !covered.has(id))
}

/**
 * 归档件违规降观察项（BUG-008 存量豁免口径，2026-10-10 用户拍板：注记豁免）：
 * `deliverables-archive/` 是只读历史——落在它上面的违规（如前审计时代的 final 无 present、
 * meta 词表漂移）转为 `legacy-archive:<原码>` 观察项并注记存量豁免；**active `deliverables/`
 * 照旧严判**。审计主战场是活盘，不是改写历史。
 */
export function partitionArchiveViolations(violations) {
  const active = []
  const legacy = []
  for (const v of violations) {
    (typeof v.path === 'string' && v.path.startsWith(ARCHIVE_ROOT) ? legacy : active).push(v)
  }
  return {
    violations: active,
    warnings: legacy.map(v => ({
      code: `legacy-archive:${v.code}`,
      detail: `${v.path}｜${v.detail}——存量豁免（BUG-008 口径：归档件历史就历史，审计主战场 = active deliverables/）`,
    })),
  }
}

/**
 * meta.md **户口面**的纯判据（2026-10-03 布局卡 B1；2026-10-16 自 deliverables-check 抽出成
 * lib 纯逻辑，使这条判据能被 keyless 单测直接断言而不是只能靠真入口档）。
 *
 * 射程与两档分开报的原则：
 *   - **形状红**（`META_SHAPE_BAD`）：meta 在盘上但 `validateMeta` 不过 ⇒ 违规；
 *   - **户口缺失观察**（`FINAL_WITHOUT_META`）：成品在盘上但**根本没有** meta ⇒ 观察项；
 *   - 结果留空（`META_RESULT_PENDING`）与 kickoff ≠ 台账（`META_LEDGER_MISMATCH`）⇒ 观察项。
 *
 * ⚠ **「有没有户口」与「户口填得对不对」是两件事**（2026-10-16 真盘实测的二次报）：
 * `all-in-ai-2026` 的 meta 用 Markdown 列表符写（核心字段行全解析不出），旧实现形状坏就
 * `continue`、不登记该 slug，于是同一条因由**又报**一条「盘上没有 meta.md」——meta 明明在盘上。
 * 本函数把两者分开：形状坏**也**登记户口，只报形状红。
 * @param input - `{ finalSlugs, metas, ledgerDateBySlug?, readMeta }`
 *   - `finalSlugs`：盘上成品 slug（`auditDeliverables().finals` 去重）；
 *   - `metas`：`auditDeliverables().metas`（`{ path, slug }[]`）；
 *   - `ledgerDateBySlug`：`slug → 台账日期列`（可选；缺省不查两笔账一致性）；
 *   - `readMeta`：`(relPath) => string | undefined`（读不到给 undefined ⇒ 跳过，不算缺户口）。
 * @returns `{ metas: Map<slug, {path, fields}>, results: {kind:'violation'|'warning', code, path?, detail}[] }`
 */
export function metaLedgerFindings(input) {
  const ledgerDateBySlug = input.ledgerDateBySlug ?? new Map()
  const metas = new Map()
  const results = []
  for (const row of input.metas) {
    const body = input.readMeta(row.path)
    if (body === undefined) continue
    const verdict = validateMeta(body)
    metas.set(row.slug, { path: row.path, fields: verdict.fields })
    if (!verdict.ok) {
      results.push({
        kind: 'violation',
        code: VIOLATION.META_SHAPE_BAD,
        path: row.path,
        detail: `meta.md 形状不合法：${verdict.problems.join('；')}`,
      })
    }
  }
  for (const slug of input.finalSlugs) {
    if (!metas.has(slug)) {
      results.push({
        kind: 'warning',
        code: WARNING.FINAL_WITHOUT_META,
        detail: `成品 \`${slug}/final.md\` 在盘上但没有 meta.md（T-9：没有户口的成品绕过一切新检查）——补 \`meta.md\`（形状 = lib validateMeta）`,
      })
    }
  }
  for (const [slug, meta] of metas) {
    if (meta.fields.get('结果') === '') {
      results.push({
        kind: 'warning',
        code: WARNING.META_RESULT_PENDING,
        detail: `\`${slug}/meta.md\` 的「结果」留空（存量迁移回填态）——收敛时维护者回填（词表 = lib META_RESULTS）`,
      })
    }
    const ledgerDate = ledgerDateBySlug.get(slug)
    if (ledgerDate !== undefined && ledgerDate !== '日期待核' && meta.fields.get('kickoff') !== ledgerDate) {
      results.push({
        kind: 'warning',
        code: WARNING.META_LEDGER_MISMATCH,
        detail: `\`${slug}/meta.md\` kickoff = ${meta.fields.get('kickoff')} ≠ 台账日期列 ${ledgerDate}——两笔账对不上，以会话日志 createdAt 复核后对齐一处`,
      })
    }
  }
  return { metas, results }
}

/**
 * 解析一份会话日志文本，取出判据要用的两件事：会话身份 + 全部 `deliverables/presented` 事件。
 * 纯函数（不读文件），未识别/损坏的行直接跳过——判据只认结构化事件，不猜。
 * @param text - 会话 JSONL 全文（可含多行）。
 * @returns `{ id, agentPreset, delegationDepth, cwd, presented: { path, description }[] }`。
 */
export function parseSessionLog(text) {
  const identity = { id: undefined, agentPreset: undefined, delegationDepth: undefined, cwd: undefined }
  const presented = []
  for (const line of text.split('\n')) {
    if (line === '') continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type === 'session' && identity.id === undefined) {
      identity.id = event.id
      identity.agentPreset = event.agentPreset
      identity.delegationDepth = event.delegationDepth
      identity.cwd = event.cwd
      continue
    }
    if (event.type !== 'deliverables/presented') continue
    for (const file of event.data?.files ?? []) {
      if (typeof file?.path !== 'string') continue
      // `present` 工具在新版本把路径解析成**绝对路径**（如 `/…/company-workspace/deliverables/x/final.md`）；
      // 判据只认工作区相对路径。用会话 cwd 归一，否则新 present 会被误判成不存在（2026-10-20 真现场）。
      const normalized = normalizeRel(file.path)
      const cwd = identity.cwd?.replace(/\\/g, '/').replace(/\/$/, '')
      const path = cwd !== undefined && normalized.startsWith(`${cwd}/`)
        ? normalized.slice(cwd.length + 1)
        : normalized
      presented.push({ path, description: file.description })
    }
  }
  return { ...identity, presented }
}

/**
 * 审计一个工作区的交付物三态。
 * @param input - `{ workspaceFiles, sessions, legacyFlat?, leadPreset?, onlySlug? }`
 *   - `workspaceFiles`：工作区相对路径清单（调用方列目录得到，本模块不碰文件系统）；
 *   - `sessions`：`parseSessionLog` 的产物数组；
 *   - `legacyFlat`：把平铺旧形状也算合法（只给已归档快照用）；
 *   - `leadPreset`：入口角色 preset id，默认 `ceo`；
 *   - `evidenceMissingBefore`：声明「该日期之前的会话日志不可得」——落在该期内的「无 present 背书」
 *     降为观察项 `present-evidence-missing`（证据不可考 ≠ 声明缺失，BUG-019）。不声明 = 严格判红；
 *   - `onlySlug`：只审这一个交付物。**审归档快照时必须给**——快照的 `workspace.expected/`
 *     是整盘拷贝，而 `sessions/` 只装本轮的日志；不给作用域就会把历史成品误报成
 *     "无 Lead 背书"（那是输入不成对，不是违规）。
 * @returns `{ finals, drafts, violations }`——`finals`/`drafts` 是形状分类结果，
 *   `violations` 每条 `{ code, path, detail }`。
 */
export function auditDeliverables(input) {
  const { workspaceFiles, sessions } = input
  const legacyFlat = input.legacyFlat === true
  const leadPreset = input.leadPreset ?? 'ceo'
  // 只审一个 slug：按**归一后的 slug** 匹配（T-7——A1 日期前缀目录名 ≠ slug，字面前缀匹配会静默零匹配）。
  const onlySlug = input.onlySlug === undefined ? undefined : String(input.onlySlug)
  // 证据可得性（BUG-019，2026-10-16）：调用方声明「该日期之前的会话日志不可得」⇒ 落在该期内的
  // 「无 present 背书」从违规降为观察档（证据不可考 ≠ 声明缺失）。不声明 = 维持严格判红。
  const evidenceMissingBefore = input.evidenceMissingBefore === undefined ? undefined : String(input.evidenceMissingBefore)
  // 成品的「日期」按两类真实形状取：① **归档件**在目录名前缀里（`deliverables-archive/<日期>-<slug>/…`）；
  // ② 活跃件**没有**日期在路径里，回落到 slug 内嵌的日期（`<...>-<YYYY>-<MM>` 这类命名）。
  // 取不到日期 ⇒ 视为**未覆盖**（有待判证据地判红，不静默放过）。
  const motionDateOf = relPath => {
    const pathMatch = /(\d{4}-\d{2}-\d{2})-/.exec(relPath)
    if (pathMatch !== null) return pathMatch[1]
    const slug = deliverableId(relPath)?.slug
    if (slug === undefined) return undefined
    const parts = slug.split('-')
    for (let i = 0; i + 1 < parts.length; i++) {
      if (/^\d{4}$/.test(parts[i]) && /^\d{2}$/.test(parts[i + 1])) return `${parts[i]}-${parts[i + 1]}`
    }
    return undefined
  }
  const evidenceUncovered = relPath => {
    if (evidenceMissingBefore === undefined) return false
    const date = motionDateOf(relPath)
    if (date === undefined) return false
    // 前缀比较：日期同为 `YYYY-MM-DD` 形状时字典序即时间序（缺日的 `YYYY-MM` 视为该月首日，早于任何同日之后）。
    return date < evidenceMissingBefore
  }
  const inScope = path => onlySlug === undefined || deliverableId(path)?.slug === onlySlug

  const onDisk = new Set(workspaceFiles.map(normalizeRel).filter(inScope))
  const onDiskIds = new Set()
  const finals = []
  const drafts = []
  const metas = []
  const sources = []
  const materials = {}
  const unshaped = []
  for (const file of onDisk) {
    const id = deliverableId(file)
    if (id !== undefined) onDiskIds.add(idKey(id))
    const verdict = classifyDeliverable(file, { legacyFlat })
    if (verdict.state === 'final') finals.push({ path: file, slug: verdict.slug })
    else if (verdict.state === 'draft') drafts.push({ path: file, slug: verdict.slug, role: verdict.role })
    else if (verdict.state === 'meta') metas.push({ path: file, slug: verdict.slug })
    else if (verdict.state === 'source') sources.push({ path: file, slug: verdict.slug })
    else if (verdict.state === 'material') {
      (materials[verdict.dir] ??= []).push(file)
    }
    else if ((file.startsWith(ACTIVE_ROOT) || file.startsWith(ARCHIVE_ROOT)) && file.endsWith('.md')) unshaped.push(file)
  }

  // 声明面：判据只追 **Lead 声明**——`company-workspace/AGENTS.md` 的承诺权写明只有 CEO 的
  // `present` 才算交付物声明，其他会话的 `present` 只是过程稿的可见化，不构成交付物。
  // ⚠ 多人形态修正（BUG-003，2026-10-06）：非 Lead 的 present 在单操作者语境下是「过程稿
  // 可见化」（当时的有意容忍——每个门后是同一个人）；多人形态下每扇门后是**不同的人** ⇒
  // 非 Lead 直呈过程稿升为**观察项**（DRAFT_PRESENTED_BY_NON_LEAD，不判违规、每次提醒），
  // 成品侧越权照旧判违规。
  // 非 Lead 声明的成品只在**它此刻真的躺在盘上**时判越权（历史行为不追着报，否则一次越权
  // 会永久污染此后每一轮审计）。
  const leadFinalIds = new Set()
  const leadDraftIds = new Set()
  /** slug → 声明过它成品的 Lead 会话 id 集合（撞车检测用）。 */
  const leadFinalSessions = new Map()
  const onDiskFinalIds = new Set()
  for (const file of onDisk) {
    const id = deliverableId(file)
    if (id?.kind === 'final') onDiskFinalIds.add(idKey(id))
  }
  const nonLeadFinalIds = new Set()
  /** presenter preset + 过程稿 id → 观察行（去重：同一会话反复 present 同稿只提醒一次）。 */
  const nonLeadDraftPresents = new Map()
  for (const session of sessions) {
    const lead = isLeadSession(session, leadPreset)
    for (const { path } of session.presented) {
      if (!path.startsWith('deliverables/')) continue // kb/** 等不在判据射程内
      if (!inScope(path)) continue
      const id = deliverableId(path)
      if (id === undefined) continue
      if (id.kind === 'final') {
        if (lead) {
          leadFinalIds.add(idKey(id))
          const who = leadFinalSessions.get(id.slug) ?? new Set()
          who.add(session.id ?? '(会话无 id)')
          leadFinalSessions.set(id.slug, who)
        } else if (onDiskFinalIds.has(idKey(id))) nonLeadFinalIds.add(idKey(id))
      } else if (lead) {
        leadDraftIds.add(idKey(id))
      } else if (id.kind === 'draft') {
        nonLeadDraftPresents.set(`${String(session.agentPreset ?? '?')}\u0000${idKey(id)}`, {
          slug: id.slug, role: id.role, preset: session.agentPreset ?? '?', path,
        })
      }
    }
  }

  const violations = []
  /** 证据不可考而降档的件（观察项，不判红）——见基座 `WARNING.PRESENT_EVIDENCE_MISSING`。 */
  const evidenceMissing = []
  for (const final of finals) {
    if (leadFinalIds.has(idKey({ slug: final.slug, kind: 'final' }))) continue
    if (evidenceUncovered(final.path)) {
      evidenceMissing.push({
        code: WARNING.PRESENT_EVIDENCE_MISSING,
        slug: final.slug,
        detail: `成品 \`${final.path}\` 没有 present 背书，但审计源声明 \`${String(evidenceMissingBefore)}\` 之前的会话日志不可得 ⇒ **证据不可考，不判红**（要判红就把可得日志喂全：\`--sessions <dir>\`）`,
      })
      continue
    }
    violations.push({
      code: VIOLATION.FINAL_NOT_PRESENTED,
      path: final.path,
      detail: '成品在盘上，但没有任何 Lead 会话的 deliverables/presented 事件声明过这份交付物',
    })
  }
  for (const key of leadFinalIds) {
    if (!onDiskIds.has(key)) {
      const [slug] = key.split('\u0000')
      violations.push({
        code: VIOLATION.PRESENTED_FINAL_MISSING,
        path: `deliverables/${slug}/${FINAL_BASENAME}`,
        detail: 'Lead 声明过这份交付物的成品，但盘上找不到它的成品（迁移漏了？还是被删了？）',
      })
    }
  }
  // legacy 模式下不判越权：平铺形状里"成品 vs 过程稿"是名字启发式，把 VP 自己声明的草稿
  // 也当成成品路径，据此判越权是**假阳性**。越权只在新形状下判（过程稿有自己的家 `drafts/`）。
  if (!legacyFlat) {
    for (const key of nonLeadFinalIds) {
      const [slug] = key.split('\u0000')
      violations.push({
        code: VIOLATION.FINAL_PRESENTED_BY_NON_LEAD,
        path: `deliverables/${slug}/${FINAL_BASENAME}`,
        detail: '非 Lead 会话把这份东西声明成了成品——承诺权在 CEO（company-workspace/AGENTS.md）',
      })
    }
  }
  for (const path of unshaped) {
    violations.push({
      code: VIOLATION.UNSHAPED_FILE,
      path,
      detail: `deliverables(-archive)/ 下的 .md 必须是 <slug>/${FINAL_BASENAME}、<slug>/meta.md 或 <slug>/${DRAFTS_DIRNAME}/<role>.md`,
    })
  }
  // 反向检查：Lead 声明过的过程稿必须还在盘上（过程稿是 CEO 引用的证据，丢了要报）。
  for (const key of leadDraftIds) {
    if (onDiskIds.has(key)) continue
    const [slug, , role] = key.split('\u0000')
    violations.push({
      code: VIOLATION.DANGLING_PRESENT,
      path: `deliverables/${slug}/${DRAFTS_DIRNAME}/${role}.md`,
      detail: 'Lead 的 present 声明过这份过程稿，但盘上找不到',
    })
  }

  // 观察项（不判违规）：同一 slug 的成品被多个 Lead 会话声明过 ⇒ 产物互相覆盖。
  const warnings = []
  for (const [slug, who] of leadFinalSessions) {
    if (who.size > 1) {
      warnings.push({
        code: WARNING.SLUG_COLLISION,
        slug,
        detail: `slug \`${slug}\` 的成品被 ${who.size} 个不同的 Lead 会话声明过（产物会互相覆盖，而三态判据看不出撞车）——开新动议前先看 deliverables/ 有没有同名`,
      })
    }
  }
  // 观察项（BUG-003）：非 Lead 会话 present 过程稿——多人形态下直呈其门上的人即绕过成品
  // 专属性（vendor 工具语义 = final deliverables 声明）；历史容忍不追溯红，每次提醒。
  for (const entry of nonLeadDraftPresents.values()) {
    warnings.push({
      code: WARNING.DRAFT_PRESENTED_BY_NON_LEAD,
      slug: entry.slug,
      detail: `非 Lead 会话（${entry.preset}）present 了过程稿 \`${entry.path}\`——多人形态下这会把它当 final deliverable 直呈该门上的人（BUG-003）；present 应留在 CEO 收口步`,
    })
  }
  const archived = partitionArchiveViolations(violations)
  return { finals, drafts, metas, sources, materials, violations: archived.violations, warnings: [...warnings, ...evidenceMissing, ...archived.warnings], leadFinalSlugs: [...leadFinalSessions.keys()] }
}
