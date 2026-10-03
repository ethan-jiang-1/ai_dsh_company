// 交付物三态判据的**纯逻辑**实现（R4「成品流程」轮）。
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
// 身份解析同时认新形状与平铺旧形状（见 `deliverableId`）；**盘上文件的形状合法性**另由
// `classifyDeliverable` 判，两者分开，互不污染。
//
// 本模块**不做 I/O**：调用方把"工作区文件清单"与"会话日志文本"喂进来。于是同一份逻辑
// 既能在回归层（`tests/`，秒级、无 key）被直接断言，也能被运行场脚本（`scripts/`，可起进程）
// 复用——分层纪律见 `docs/guides/dev-loop.md` §9.1。

/** 公司五个角色 id，与 `packages/company-pack/presets/` 一致。 */
export const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

/** 成品文件名与过程稿目录名（三态的字面约定）。 */
export const FINAL_BASENAME = 'final.md'
export const DRAFTS_DIRNAME = 'drafts'

/** 活跃根与归档根（C1，2026-10-03 拍板：收敛件整目录 git mv 进归档家，判据跟随扩根——T-11 处置 = 跟随扩根）。 */
export const ACTIVE_ROOT = 'deliverables/'
export const ARCHIVE_ROOT = 'deliverables-archive/'

/** 话题目录名的日期前缀（A1 命名：`<kickoff 日期>-<slug>`）；slug = 剥前缀。 */
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/

/** 话题目录名 → slug（剥日期前缀；无前缀原样返回）。 */
export function slugFromDirName(dirName) {
  return dirName.replace(DATE_PREFIX, '')
}

/** 平铺旧形状里表达"这份就是定稿"的后缀（R2 用过 `reconcile-package-final.md`）。 */
const LEGACY_FINAL_SUFFIX = '-final'

/**
 * **观察项**（不是违规，不影响退出码）：值得每次提醒、但不该判红的信号。
 * 为什么要有这一档（2026-09-26）：slug 撞车在本仓**已经发生过**（renewal-y-2026 两场动议共用），
 * 判红会让门禁永久带伤；但它的真实代价（产物互相覆盖、判据看不出）值得每次都摆到人眼前。
 */
export const WARNING = {
  /** 同一 slug 的成品被**多个 Lead 会话**声明过 ⇒ 产物互相覆盖。 */
  SLUG_COLLISION: 'slug-collision',
  /** 盘上有 `deliverables/<slug>/` 但动议台账没有该行（跑完到轮末收敛之间的正常态，也含真漏登）。 */
  SLUG_UNLEDGERED: 'slug-unledgered',
  /** 开场占位抢注登记（R0-2）：`drafts/<role>.md` 首行「占位=认领，非出稿」= 机器可查的认领面。 */
  PLACEHOLDER_CLAIMS: 'placeholder-claims',
  /** 成品在盘上但同 slug 没有 meta.md（T-9：绕过一切新检查、从生成台账消失的入口）。 */
  FINAL_WITHOUT_META: 'final-without-meta',
  /** meta 的「结果」留空（存量迁移回填态；收敛时维护者回填）。 */
  META_RESULT_PENDING: 'meta-result-pending',
  /** meta.kickoff 与台账日期列不一致（两笔账对不上——B4 一致性门禁的观察半边）。 */
  META_LEDGER_MISMATCH: 'meta-ledger-mismatch',
}

/** 占位抢注的首行形状（R0-2，2026-10-03；「一字不差」是机器可查的前提，合同家 = multi-human.md §3 纪律 5）。 */
export const PLACEHOLDER_CLAIM_LINE = '占位=认领，非出稿'

/** 判一份稿是不是占位抢注稿：首个非空行（去首尾空白）恰好是占位首行。 */
export function isPlaceholderClaim(body) {
  const first = body.split('\n').find(line => line.trim() !== '')
  return first !== undefined && first.trim() === PLACEHOLDER_CLAIM_LINE
}

// ── meta.md（B1 事实家，2026-10-03 拍板；机器可读行风格照「派活行」先例）──

/** 动议分型（决策点③：先分型再定词——试金 22 话题全覆盖的四型）。 */
export const META_TYPES = ['决策', '生产', '诊断', '口径问答']
/** 决议结果枚举（跨型共用；单值装不下的历史由「落地事件」多行字段承载）。 */
export const META_RESULTS = ['进行中', '已采纳', '已否决', '已搁置', '已废弃', '判不了', '已完成']
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

/**
 * 解析 meta.md 全文：`字段: 值` 行进 fields（取首现），`落地事件:` 行逐条进 events（多值）。
 * 不认形状的行忽略——校验交给 {@link validateMeta}，解析不抛。
 */
export function parseMeta(body) {
  const fields = new Map()
  const events = []
  for (const line of body.split('\n')) {
    const m = /^([\w一-鿿]+)\s*[:：]\s*(.*)$/.exec(line.trim())
    if (m === null) continue
    if (m[1] === '落地事件') { if (m[2].trim() !== '') events.push(m[2].trim()); continue }
    if (!fields.has(m[1])) fields.set(m[1], m[2].trim())
  }
  return { fields, events }
}

/**
 * 校验 meta.md 形状（机器可查的字段面；缺行/枚举外/日期格式不对 = 红，走 `META_SHAPE_BAD`）。
 * 「结果」行允许**留空**（存量迁移的回填态）——留空归观察（`META_RESULT_PENDING`），不判红。
 */
export function validateMeta(body) {
  const { fields } = parseMeta(body)
  const problems = []
  for (const key of ['slug', 'kickoff', '类型', '结果']) {
    if (!fields.has(key)) problems.push(`缺行「${key}:」`)
  }
  if (fields.has('kickoff') && !/^\d{4}-\d{2}-\d{2}$/.test(fields.get('kickoff'))) {
    problems.push(`kickoff 不是 YYYY-MM-DD：「${fields.get('kickoff')}」`)
  }
  if (fields.has('类型') && fields.get('类型') !== '' && !META_TYPES.includes(fields.get('类型'))) {
    problems.push(`类型不在词表 ${JSON.stringify(META_TYPES)}：「${fields.get('类型')}」`)
  }
  if (fields.has('结果') && fields.get('结果') !== '' && !META_RESULTS.includes(fields.get('结果'))) {
    problems.push(`结果不在词表 ${JSON.stringify(META_RESULTS)}：「${fields.get('结果')}」`)
  }
  if (fields.has('slug') && /\d{4}-\d{2}-\d{2}-/.test(fields.get('slug'))) {
    problems.push('slug 字段写剥前缀形式（不带日期前缀——日期住 kickoff 字段）')
  }
  return { ok: problems.length === 0, problems, fields }
}

/** 判据违规代码（测试与脚本都按这些码断言，别用自由文本）。 */
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
  /** 反向门禁：Lead present 过的成品，meta「结果」仍非终态（留空/进行中——布局卡评审修正 6）。 */
  PRESENT_RESULT_NOT_FINAL: 'present-result-not-final',
}

/** 把路径归一成工作区相对的正斜杠形式，便于两侧比较。 */
export function normalizeRel(path) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/')
}

/** 身份比较用的键（`kind` 参与比较：成品与过程稿不能互相顶替）。 */
function idKey(id) {
  return id.kind === 'final' ? `${id.slug}\u0000final` : `${id.slug}\u0000draft\u0000${id.role}`
}

/**
 * 解析一份交付物的身份：`{ slug, kind, role? }`，`kind` ∈ `final` / `draft`。
 * 同时认新形状与平铺旧形状——因为 **`present` 事件里的路径永远是历史形状的**，
 * 而盘上文件可能是迁移后的新形状，两侧要能对上同一个身份。
 * @param relPath - 工作区相对路径（正斜杠）。
 * @returns 身份对象；不在 `deliverables/` 下、不是 `.md`、或形状无法解释时返回 `undefined`。
 *
 * 平铺旧形状的两条约定（只为读懂历史，不鼓励新用）：
 *   1. `-<role>` 可以出现在名字中间带限定词，如 `reconcile-package-cfo-review.md`
 *      ⇒ 身份 = slug `reconcile-package` + 角色 `cfo-review`；
 *   2. 尾部 `-final` 表示定稿，如 `reconcile-package-final.md` ⇒ slug `reconcile-package` + 成品。
 */
export function deliverableId(relPath) {
  const path = normalizeRel(relPath)
  const root = path.startsWith(ACTIVE_ROOT) ? ACTIVE_ROOT : path.startsWith(ARCHIVE_ROOT) ? ARCHIVE_ROOT : undefined
  if (root === undefined || !path.endsWith('.md')) return undefined
  const parts = path.slice(root.length).split('/')

  // 新形状（三态的字面形状 + meta 户口；目录名可带 A1 日期前缀，slug 按剥前缀归一）
  if (parts.length === 2 && parts[1] === FINAL_BASENAME) return { slug: slugFromDirName(parts[0]), kind: 'final' }
  if (parts.length === 2 && parts[1] === 'meta.md') return { slug: slugFromDirName(parts[0]), kind: 'meta' }
  if (parts.length === 3 && parts[1] === DRAFTS_DIRNAME) {
    return { slug: slugFromDirName(parts[0]), kind: 'draft', role: parts[2].replace(/\.md$/, '') }
  }
  if (parts.length !== 1 || root === ARCHIVE_ROOT) return undefined

  // 平铺旧形状
  let base = parts[0].replace(/\.md$/, '')
  if (base.endsWith(LEGACY_FINAL_SUFFIX)) {
    base = base.slice(0, -LEGACY_FINAL_SUFFIX.length)
    return { slug: base, kind: 'final' }
  }
  const segments = base.split('-')
  // 角色记号至少出现在第 2 段起（`coo-...` 这类前缀不许被吃掉，否则 slug 会变空）。
  for (let i = 1; i < segments.length; i++) {
    const tail = segments.slice(i).join('-')
    const role = ROLES.find(candidate => tail === candidate || tail.startsWith(`${candidate}-`))
    if (role === undefined) continue
    return { slug: segments.slice(0, i).join('-'), kind: 'draft', role: tail }
  }
  return { slug: base, kind: 'final' }
}

/**
 * 判一个**盘上文件**的形状合法性（与 `deliverableId` 分开：这里才管"允不允许平铺"）。
 * @param relPath - 工作区相对路径（正斜杠）。
 * @param options - `legacyFlat: true` 时把平铺旧形状也算合法（只给已归档快照用）。
 * @returns `{ state, slug, role? }`；`state` ∈ `final` / `draft` / `other`。
 */
export function classifyDeliverable(relPath, options = {}) {
  const path = normalizeRel(relPath)
  const root = path.startsWith(ACTIVE_ROOT) ? ACTIVE_ROOT : path.startsWith(ARCHIVE_ROOT) ? ARCHIVE_ROOT : undefined
  if (root === undefined || !path.endsWith('.md')) return { state: 'other' }
  const flat = !path.slice(root.length).includes('/')
  if (flat && (root === ARCHIVE_ROOT || options.legacyFlat !== true)) return { state: 'other' }
  const id = deliverableId(path)
  if (id === undefined) return { state: 'other' }
  if (id.kind === 'meta') return { state: 'meta', slug: id.slug }
  return id.kind === 'final'
    ? { state: 'final', slug: id.slug }
    : { state: 'draft', slug: id.slug, role: id.role }
}

/** Lead 会话的判据：`delegationDepth === 0` 且挂了公司入口角色的 preset。 */
export function isLeadSession(identity, leadPreset = 'ceo') {
  return identity.delegationDepth === 0 && identity.agentPreset === leadPreset
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
      presented.push({ path: normalizeRel(file.path), description: file.description })
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
  const inScope = path => onlySlug === undefined || deliverableId(path)?.slug === onlySlug

  const onDisk = new Set(workspaceFiles.map(normalizeRel).filter(inScope))
  const onDiskIds = new Set()
  const finals = []
  const drafts = []
  const metas = []
  const unshaped = []
  for (const file of onDisk) {
    const id = deliverableId(file)
    if (id !== undefined) onDiskIds.add(idKey(id))
    const verdict = classifyDeliverable(file, { legacyFlat })
    if (verdict.state === 'final') finals.push({ path: file, slug: verdict.slug })
    else if (verdict.state === 'draft') drafts.push({ path: file, slug: verdict.slug, role: verdict.role })
    else if (verdict.state === 'meta') metas.push({ path: file, slug: verdict.slug })
    else if ((file.startsWith(ACTIVE_ROOT) || file.startsWith(ARCHIVE_ROOT)) && file.endsWith('.md')) unshaped.push(file)
  }

  // 声明面：判据只追 **Lead 声明**——`company-workspace/AGENTS.md` 的承诺权写明只有 CEO 的
  // `present` 才算交付物声明，其他会话的 `present` 只是过程稿的可见化，不构成交付物。
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
      }
    }
  }

  const violations = []
  for (const final of finals) {
    if (!leadFinalIds.has(idKey({ slug: final.slug, kind: 'final' }))) {
      violations.push({
        code: VIOLATION.FINAL_NOT_PRESENTED,
        path: final.path,
        detail: '成品在盘上，但没有任何 Lead 会话的 deliverables/presented 事件声明过这份交付物',
      })
    }
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
  return { finals, drafts, metas, violations, warnings, leadFinalSlugs: [...leadFinalSessions.keys()] }
}
