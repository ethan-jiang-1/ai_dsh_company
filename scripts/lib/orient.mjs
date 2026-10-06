// Orient 的 keyless 纯核心（RFC driver-surface-package 条目 B）：一条命令看到运行态全景——
// home 判定（devHomeStatus 同款、只警告不抛）/ profiles / 会话清单 / 公司盘概览 / 便宜检查 /
// run bundle 视图。CLI 面 = scripts/tools/orient.mjs（git 计数等真实进程效果只住在那一侧）。
//
// ⚠ run bundle 字段读取是有界的行扫描（顶层标量 + session/workspace 一层嵌套）——它只服务
// 「视图」，不解析完整 YAML；场景元数据的权威 = snapshots/README「Run bundle 引用合同」
// 与各 snapshot.yml 自身。引用不复制：本模块不落盘任何 manifest。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { devHomeStatus } from './runtime-home.mjs'
import { snapshotScenes } from './repository-layout.mjs'

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

/** 现在就能跑的便宜检查（静态清单：全部 keyless/秒级；逐脚本触发条件唯一源 = 脚本头注）。 */
export const CHECKS = [
  { cmd: 'pnpm verify', what: '结构门禁（清单唯一源 = scripts/run-gates.mjs）' },
  { cmd: 'pnpm test', what: 'keyless 回归（vitest，秒级）' },
  { cmd: 'pnpm orient --scenario <kind>/<场景>', what: 'run bundle 视图（引用合同 = snapshots/README）' },
]

/** 组装观测态。gitStatus 由调用方注入（数字或 null=不可用），保持 lib 无进程效果。 */
export function orientState({ env = process.env, dailyHome, workspaceRoot, gitStatus = null, sessionLimit = 5 } = {}) {
  const home = homeStatus(env, { dailyHome })
  const effective = home.kind === 'ok' ? home.home : null
  return {
    home,
    profiles: effective ? listProfiles(effective) : [],
    sessions: effective ? listSessions(effective, sessionLimit) : { total: 0, recent: [] },
    workspace: { root: workspaceRoot, ...workspaceOverview(workspaceRoot), gitStatus },
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
  lines.push('', '== 会话（按工作区 slug 汇总）==')
  if (state.sessions.total === 0) {
    lines.push('（无会话记录——home 未生效或尚未起过会话）')
  } else {
    lines.push(`共 ${state.sessions.total} 个 slug；最近：`)
    for (const { slug, sessions, latest } of state.sessions.recent) {
      lines.push(`  ${slug} · ${sessions} 会话 · 最新 ${latest}`)
    }
  }
  lines.push('', '== 公司盘 ==')
  lines.push(`deliverables   ${state.workspace.deliverables.length > 0
    ? `（共 ${state.workspace.deliverables.length}）: ${state.workspace.deliverables.join(', ')}`
    : '（空）'}`)
  lines.push(`git 改动       ${state.workspace.gitStatus === null ? '（不可用——git 未起或不在仓库内）' : `${state.workspace.gitStatus} 处（company-workspace 面）`}`)
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
    verification: `node scripts/smoke/replay-smoke.mjs --scenario ${canonical}`,
  }
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
