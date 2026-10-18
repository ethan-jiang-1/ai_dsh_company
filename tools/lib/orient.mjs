// Orient 的 keyless 纯核心（RFC driver-surface-package 条目 B）：一条命令看到运行态全景——
// home 判定（devHomeStatus 同款、只警告不抛）/ profiles / 会话清单 / 公司盘概览 / 便宜检查 /
// run bundle 视图。CLI 面 = tools/orient.mjs（git 计数等真实进程效果只住在那一侧）。
//
// ⚠ run bundle 字段读取是有界的行扫描（顶层标量 + session/workspace 一层嵌套）——它只服务
// 「视图」，不解析完整 YAML；场景元数据的权威 = snapshots/README「Run bundle 引用合同」
// 与各 snapshot.yml 自身。引用不复制：本模块不落盘任何 manifest。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { devHomeStatus } from './runtime-home.mjs'
import { scanR3Dual } from './candidate-scan.mjs'
import { repositoryRoot, snapshotScenes } from './repository-layout.mjs'

/** 双 home 判定的观测包装：只分类与警告，不拒绝执行。 */
export function homeStatus(env = process.env, { dailyHome } = {}) {
  return devHomeStatus(env.DSH_HOME, { dailyHome })
}

/** 在场 profiles；home 未初始化/未生效时如实为空。node_modules 是 pnpm 装插件留下的产物目录，不是 profile。 */
export function listProfiles(home) {
  const dir = join(home, 'profiles')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .map(entry => entry.name).sort()
}

/** 会话按 slug（会话 cwd 归宿）汇总：总数 + 按「最新会话时间」近序的最近几个。 */
export function listSessions(home, limit = 5) {
  const dir = join(home, 'sessions')
  if (!existsSync(dir)) return { total: 0, recent: [] }
  const slugs = readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => {
      const slugDir = join(dir, entry.name)
      const ids = readdirSync(slugDir, { withFileTypes: true })
        .filter(id => id.isDirectory() && !id.name.startsWith('.'))
      const latest = ids.length === 0
        ? statSync(slugDir).mtime
        : ids.map(id => statSync(join(slugDir, id.name)).mtime).sort((a, b) => b - a)[0]
      return { slug: entry.name, sessions: ids.length, latest: latest.toISOString() }
    })
    .sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime())
  return { total: slugs.length, recent: slugs.slice(0, limit) }
}

/** 公司盘概览：deliverables 按 mtime 近序（git 改动数由 CLI 注入，lib 不起进程）。 */
export function workspaceOverview(workspaceRoot) {
  const dir = join(workspaceRoot, 'deliverables')
  if (!existsSync(dir)) return { deliverables: [] }
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => ({ name: entry.name, mtime: statSync(join(dir, entry.name)).mtime }))
    .sort((a, b) => b.mtime - a.mtime)
  return { deliverables: entries.map(entry => entry.name) }
}

/**
 * 待核工作候选扫描（RFC orient-scan-view）：对每个 deliverables/<slug> 跑已采用的 R3′
 * （scanR3Dual，语义冻结于 candidate-scan.mjs——本函数只做 IO 形状适配：任务书 = drafts/ceo.md、
 * draftFiles = drafts/ 清单、final.md 在场与否）。规则语义与命名纪律（「待核工作候选」、
 * needsVerify 恒真、未达零容忍门槛只显示不进待办）唯一家 = candidate-scan.mjs 头注，此处不复述。
 */
export function scanDeliverables(workspaceRoot) {
  const dir = join(workspaceRoot, 'deliverables')
  if (!existsSync(dir)) return {}
  const scan = {}
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const slugDir = join(dir, entry.name)
    const draftsDir = join(slugDir, 'drafts')
    const draftFiles = existsSync(draftsDir) ? readdirSync(draftsDir) : []
    const briefFile = join(draftsDir, 'ceo.md')
    const briefText = existsSync(briefFile) ? readFileSync(briefFile, 'utf8') : ''
    scan[entry.name] = scanR3Dual(briefText, draftFiles, existsSync(join(slugDir, 'final.md')))
  }
  return scan
}

/** 现在就能跑的便宜检查（静态清单：全部 keyless/秒级；逐脚本触发条件唯一源 = 脚本头注）。 */
export const CHECKS = [
  { cmd: 'pnpm verify', what: '结构门禁（清单唯一源 = checks/gates/ 目录）' },
  { cmd: 'pnpm test', what: 'keyless 回归（vitest，秒级）' },
  { cmd: 'pnpm orient --scenario <kind>/<场景>', what: 'run bundle 视图（引用合同 = snapshots/README）' },
]

/** 列某 slug 下全部会话（id/mtime 近序）；slug 不存在 fail-loud（调用方决定显示条数与解码成本）。 */
export function listSlugSessions(home, slug) {
  const slugDir = join(home, 'sessions', slug)
  if (!existsSync(slugDir)) throw new Error(`session slug 不存在: ${slug}`)
  return readdirSync(slugDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('session-'))
    .map(entry => ({ id: entry.name, mtime: statSync(join(slugDir, entry.name)).mtime.toISOString() }))
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
}

/** 会话头部三字段（preset 三态 = string|null|undefined；createdAt/cwd = 数值/字符串或 null）。 */
export function parseSessionHead(text) {
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let event
    try { event = JSON.parse(line) } catch { continue }   // 截断的尾部行按非法跳过（头行总在日志开头）
    if (event?.type === 'session') {
      return {
        preset: typeof event.agentPreset === 'string' ? event.agentPreset : null,
        createdAt: typeof event.createdAt === 'number' ? event.createdAt : null,
        cwd: typeof event.cwd === 'string' ? event.cwd : null,
      }
    }
  }
  return undefined
}

/** 从会话日志明文解析 agentPreset：parseSessionHead 的 preset 投影（三态语义不变）。 */
export function parseSessionPreset(text) {
  return parseSessionHead(text)?.preset
}

/**
 * run bundle 四件套（RFC driver-purpose-top-level S4）：把「一次运行 = 哪四件状态」默认显性化。
 * 只导航不复制——逐轴权威唯一家 = run/README 与 docs/runtime-map §二；引用不复制（不落盘 manifest）。
 */
export function fourPieceState({ home, profiles, workspaceRoot, root = repositoryRoot }) {
  const scenes = snapshotScenes(root)
  const byKind = {}
  for (const scene of scenes) byKind[scene.kind] = (byKind[scene.kind] ?? 0) + 1
  const kinds = Object.entries(byKind).map(([kind, count]) => `${kind} ${count}`).join(' · ')
  return {
    code: 'vendor/dsh（钉 SHA 只读）+ packages/company-pack（bundle 行 + 五角色组合）',
    runState: `DSH_HOME ${home.kind === 'ok' ? home.home : `（${home.kind}）`}${profiles.length > 0 ? ` · profiles: ${profiles.join(', ')}` : ''}`,
    sessionCwd: `${workspaceRoot}（排练 = runtime/rehearsal-workspace/，gitignored）`,
    evidence: `snapshots/ 共 ${scenes.length} 场景${kinds ? `（${kinds}）` : ''}`,
  }
}

/** 组装观测态。gitStatus / sessionPresets 由调用方注入（lib 不起进程）：前者=数字或 null，
 *  后者 = slug→preset 映射或 null（null = 不渲染 preset 列；映射内 undefined = 「不可用」）。 */
/** 凭据库文件名（字面量的单一事实：spec 引它，不在回归层写死）。 */
export const CREDENTIALS_FILE = '.credentials.yaml'
/** 真模型要的那把钥匙的键名（渲染 ✓/✗ 用；同样是字面量的单一事实）。 */
export const DEEPSEEK_CREDENTIAL = 'DEEPSEEK_API_KEY'

/**
 * 解析凭据库文本里的键名（纯函数；值一律不取）。键**嵌在顶层 `refs:` 块里**。
 * @param text - 凭据库文件内容。
 * @returns `refs:` 块里的键名（字典序、去重）。
 */
export function parseCredentialKeys(text) {
  const lines = text.split('\n')
  const refsAt = lines.findIndex(line => /^refs:\s*$/.test(line))
  const keys = []
  for (let i = refsAt + 1; refsAt !== -1 && i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    if (!/^\s/.test(line)) break   // 回到顶层缩进 = refs 块结束
    const name = /^\s+([A-Z][A-Z0-9_]+):/.exec(line)?.[1]
    if (name !== undefined) keys.push(name)
  }
  return [...new Set(keys)].sort()
}

/**
 * 读 DSH 凭据库的**键名**（`<home>/.credentials.yaml`）。值一律不读、不外泄。
 *
 * 为什么要有这一行：密钥住凭据库、**不是环境变量**——`env | grep DEEPSEEK` 为空不代表没配
 * （2026-10-18 实证：真模型探针被误判成"本机无 key"而搁置）。键名扫描不引 YAML 解析器（本模块零依赖）；
 * ⚠ 键**嵌在顶层 `refs:` 块里**（缩进 2），照顶层键扫会得到 0 个（实测踩过）——所以按块读。
 * @param home - 生效的 DSH home（缺失/未初始化给 present:false）。
 * @returns 凭据库是否存在，以及 `refs:` 块里的键名（字典序）。
 */
export function credentialsState(home) {
  if (home === null || home === undefined) return { present: false, keys: [] }
  const path = join(home, CREDENTIALS_FILE)
  if (!existsSync(path)) return { present: false, keys: [] }
  return { present: true, keys: parseCredentialKeys(readFileSync(path, 'utf8')) }
}

export function orientState({ env = process.env, dailyHome, workspaceRoot, gitStatus = null, gitIgnored = null, sessionPresets = null, sessionLimit = 5, root } = {}) {
  const home = homeStatus(env, { dailyHome })
  const effective = home.kind === 'ok' ? home.home : null
  const profiles = effective ? listProfiles(effective) : []
  return {
    home,
    profiles,
    credentials: credentialsState(effective),
    sessions: effective ? listSessions(effective, sessionLimit) : { total: 0, recent: [] },
    workspace: { root: workspaceRoot, ...workspaceOverview(workspaceRoot), gitStatus, gitIgnored },
    scan: scanDeliverables(workspaceRoot),
    sessionPresets,
    fourPiece: fourPieceState({ home, profiles, workspaceRoot, root }),
    checks: CHECKS,
  }
}

/** 渲染观测态为可读报告。 */
export function renderOrient(state) {
  const lines = []
  if (state.home.warning) lines.push(state.home.warning, '')
  lines.push('== 开发环境 ==')
  lines.push(`DSH_HOME   ${state.home.kind === 'ok' ? state.home.home : state.home.kind === 'daily' ? '（与日用 home 重叠——见上方警告）' : '（未设置）'}`)
  lines.push(`profiles   ${state.profiles.length > 0 ? state.profiles.join(', ') : '（无——home 未初始化或未生效）'}`)
  lines.push(state.credentials.present
    ? `凭据       ${state.credentials.keys.includes(DEEPSEEK_CREDENTIAL) ? `${DEEPSEEK_CREDENTIAL} ✓` : `${DEEPSEEK_CREDENTIAL} ✗`}（共 ${String(state.credentials.keys.length)} 个键；住 .credentials.yaml，不是环境变量）`
    : '凭据       （无 .credentials.yaml——真模型跑不了；配法见 dev-loop §6）')
  lines.push('', '== 会话（按工作区 slug 汇总）==')
  if (state.sessions.total === 0) {
    lines.push('（无会话记录——home 未生效或尚未起过会话）')
  } else {
    lines.push(`共 ${state.sessions.total} 个 slug；最近：`)
    for (const { slug, sessions, latest } of state.sessions.recent) {
      let preset = ''
      if (state.sessionPresets !== null) {
        const value = state.sessionPresets[slug]
        preset = ` · preset ${value === undefined ? '（不可用）' : value === null ? '（无——非 preset 会话）' : value}`
      }
      lines.push(`  ${slug} · ${sessions} 会话 · 最新 ${latest}${preset}`)
    }
  }
  lines.push('', '== 公司盘 ==')
  lines.push(`deliverables   ${state.workspace.deliverables.length > 0
    ? `（共 ${state.workspace.deliverables.length}）: ${state.workspace.deliverables.join(', ')}`
    : '（空）'}`)
  lines.push(`git 改动       ${state.workspace.gitStatus === null ? '（不可用——git 未起或不在仓库内）' : `${state.workspace.gitStatus} 处（company-workspace 面）`}`)
  lines.push(`本地过程稿     ${state.workspace.gitIgnored === null ? '（不可用）' : `${state.workspace.gitIgnored} 项（ignored：drafts/sources，2026-10-13 起不进 git）`}`)
  lines.push('', '== 待核工作候选（R3′ 口径；零容忍未达门槛——只显示，不进个人待办、不自动通知）==')
  const slugs = Object.entries(state.scan ?? {})
  if (slugs.length === 0) {
    lines.push('无动议在盘（deliverables/ 无动议目录）')
  } else {
    for (const [slug, result] of slugs) {
      if (result.closed) {
        lines.push(`  ${slug} · 已关闭（final 在场，不报）`)
        continue
      }
      const cand = result.candidates.map(c => `${c.task}${c.depByDisk ? 'ᵈ' : ''}${c.stale ? '*' : ''}`)
      const block = result.blocked.map(b => b.task)
      const counts = [`候选 ${cand.length}`, `阻塞 ${block.length}`].join(' · ')
      lines.push(`  ${slug} · ${counts}`)
      if (cand.length > 0) lines.push(`    候选 ${cand.join(', ')}（${result.candidates.map(c => c.role).join(', ')}）`)
      if (block.length > 0) lines.push(`    阻塞 ${block.join(', ')}（${result.blocked.map(b => `${b.role}，${b.why}`).join('；')}）`)
    }
    lines.push('  （ᵈ = 依赖由盘上稿推断满足，* = 稿与状态行矛盾待核实；全部 needsVerify 恒真——真伪人核）')
  }
  lines.push('', '== run bundle 四件套（一次运行 = 这四件状态；权威家 = run/README + docs/runtime-map §二）==')
  lines.push(`代码与组合   ${state.fourPiece.code}`)
  lines.push(`运行状态     ${state.fourPiece.runState}`)
  lines.push(`会话 cwd     ${state.fourPiece.sessionCwd}`)
  lines.push(`证据         ${state.fourPiece.evidence}`)
  lines.push('深看某次运行 pnpm orient --scenario <kind>/<场景>')
  lines.push('', '== 便宜检查（keyless，现在就能跑）==')
  for (const check of state.checks) lines.push(`  ${check.cmd} — ${check.what}`)
  return lines.join('\n')
}

/** 有界字段读取：snapshot.yml 的顶层标量 + session/workspace 一层嵌套（视图用，非完整 YAML 解析）。 */
export function readSnapshotFields(scenePath) {
  const file = join(scenePath, 'snapshot.yml')
  const fields = {}
  if (!existsSync(file)) return fields
  const clean = value => value.replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '')
  let nested = null
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    if (rawLine.trim() === '' || rawLine.trimStart().startsWith('#')) continue
    const nestedMatch = /^  ([A-Za-z][\w-]*):\s*(.*)$/.exec(rawLine)
    if (nested && nestedMatch) {
      if (nestedMatch[2].trim() !== '') fields[`${nested}.${nestedMatch[1]}`] = clean(nestedMatch[2])
      continue
    }
    const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(rawLine)
    if (!top) continue
    nested = top[2].trim() === '' && ['session', 'workspace'].includes(top[1]) ? top[1] : null
    if (nested === null && top[2].trim() !== '') fields[top[1]] = clean(top[2])
  }
  return fields
}

/** 场景解析：name 或 kind/name → {kind, name, path}；缺失/歧义 fail-loud（同 snapshotScene 语义）。 */
function resolveScene(root, selection) {
  const matches = snapshotScenes(root).filter(scene =>
    scene.name === selection || `${scene.kind}/${scene.name}` === selection)
  if (matches.length !== 1) throw new Error(`Snapshot scene ${selection}: ${matches.length ? 'ambiguous; use kind/name' : 'not found'}`)
  return matches[0]
}

/**
 * Run bundle 视图（引用合同 = snapshots/README）：按合同字段反查场景声明与引用存在性。
 * 引用不复制——不落盘 manifest、不改场景；live 权威永远是 DSH session + workspace。
 */
export function runBundleView(root, selection) {
  const scene = resolveScene(root, selection)
  const canonical = `${scene.kind}/${scene.name}`
  const fields = readSnapshotFields(scene.path)
  const ref = value => (value === undefined ? null : join(scene.path, value))
  const childrenDir = ref(fields['session.children'])
  const childrenCount = childrenDir && existsSync(childrenDir)
    ? readdirSync(childrenDir).filter(name => name.endsWith('.jsonl')).length
    : 0
  return {
    selection: canonical,
    path: scene.path,
    fields,
    refs: {
      sessionLeadExists: ref(fields['session.lead']) !== null && existsSync(ref(fields['session.lead'])),
      sessionChildrenCount: childrenCount,
      workspaceExpectedExists: ref(fields['workspace.expected']) !== null && existsSync(ref(fields['workspace.expected'])),
    },
    verification: `node checks/smoke/replay-smoke.mjs --scenario ${canonical}`,
  }
}

/** 渲染 --session 视图。rows = [{id, mtime, head}]——head 由 CLI 解码注入（undefined = 解码失败）。 */
export function renderSessionView(slug, rows, { total } = {}) {
  const scope = total === undefined ? `显示 ${rows.length}` : `显示 ${rows.length} / 共 ${total}`
  const lines = [`== 会话明细：${slug}（${scope}）==`]
  for (const { id, mtime, head } of rows) {
    const preset = head === undefined ? undefined : head.preset
    const presetText = preset === undefined ? '（不可用）' : preset === null ? '（无——非 preset 会话）' : preset
    const created = head?.createdAt ? new Date(head.createdAt).toISOString() : '（不可用）'
    const cwd = head?.cwd ?? '（不可用）'
    lines.push(`  ${id} · ${mtime} · preset ${presetText} · cwd ${cwd} · created ${created}`)
  }
  return lines.join('\n')
}

/** 渲染 run bundle 视图（字段缺失/引用断链如实呈现，不伪造）。 */
export function renderRunBundle(view) {
  const or = value => value === undefined ? '（未记）' : value
  const lines = [
    `== run bundle 视图：${view.selection} ==`,
    `场景       ${or(view.fields.scenario)}（目录 = ${view.path}）`,
    `录制时点   ${or(view.fields.recordedAt)}`,
    `代码锚     ${or(view.fields.codeAnchor)}（新场景应记；历史场景不回填）`,
    `profile    ${or(view.fields.profile)}    preset: ${or(view.fields.agentPreset)}`,
    `session cwd ${or(view.fields.cwd)}`,
    `session    lead=${or(view.fields['session.lead'])}（${view.refs.sessionLeadExists ? '在场' : '缺失'}） · children=${or(view.fields['session.children'])}（${view.refs.sessionChildrenCount} 个 jsonl）`,
    `workspace  expected=${or(view.fields['workspace.expected'])}（${view.refs.workspaceExpectedExists ? '在场' : '缺失'}）`,
    `验证命令   ${view.verification}`,
    '（引用不复制：live 权威 = DSH session + workspace；合同 = snapshots/README「Run bundle 引用合同」）',
  ]
  return lines.join('\n')
}
