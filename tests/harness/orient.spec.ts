import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { homeStatus, listProfiles, listSessions, listSlugSessions, orientState, parseSessionHead, parseSessionPreset, renderOrient, renderSessionView, runBundleView, scanDeliverables, workspaceOverview } from '../../tools/lib/orient.mjs'

// 条目 B 判据（RFC driver-surface-package）：pnpm orient 的 keyless 只读核心——
// home 判定（requireDevHome 同款但只警告不抛）/ profiles / 会话清单 / 公司盘概览 /
// 便宜检查 / run bundle 视图（引用合同字段，引用不复制）。全部走夹具 + 真实 tracked 场景。

const fixtures: string[] = []
const scratch = (name: string) => {
  const cache = join(ROOT, 'node_modules/.cache/company-orient')
  mkdirSync(cache, { recursive: true })
  const dir = mkdtempSync(join(cache, `${name}-`))
  fixtures.push(dir)
  return dir
}
afterEach(() => { while (fixtures.length) rmSync(fixtures.pop()!, { recursive: true, force: true }) })

let home: string
let daily: string
let workspace: string
const put = (path: string, text = 'x\n', at?: string) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
  if (at) utimesSync(path, new Date(at), new Date(at))
}
const dir = (path: string, at?: string) => {
  mkdirSync(path, { recursive: true })
  if (at) utimesSync(path, new Date(at), new Date(at))
}

beforeEach(() => {
  home = scratch('home')
  daily = scratch('daily')
  workspace = scratch('ws')
  dir(join(home, 'profiles/headless'))
  dir(join(home, 'profiles/web'))
  dir(join(home, 'sessions/slug-company/session-1111'), '2026-10-06T10:00:00Z')
  dir(join(home, 'sessions/slug-company/session-2222'), '2026-10-06T12:00:00Z')
  dir(join(home, 'sessions/slug-rehearsal/session-3333'), '2026-10-05T09:00:00Z')
  dir(join(workspace, 'deliverables/old-motion'), '2026-10-04T08:00:00Z')
  dir(join(workspace, 'deliverables/new-motion'), '2026-10-06T09:00:00Z')
})

/** 会话头行夹具：type:session + 可选 agentPreset（条目 B/A 共用）。 */
const headerLine = (preset?: string) =>
  JSON.stringify({ type: 'session', version: 4, id: 's1', cwd: '/x', ...(preset ? { agentPreset: preset } : {}) })

describe('home status（日用 home 判定，只警告不抛）', () => {
  it('未设置 / 正常 / 双向重叠 三态', () => {
    expect(homeStatus({}, { dailyHome: daily }).kind).toBe('unset')
    expect(homeStatus({ DSH_HOME: home }, { dailyHome: daily }).kind).toBe('ok')
    expect(homeStatus({ DSH_HOME: join(daily, 'nested') }, { dailyHome: daily }).kind).toBe('daily')
    expect(homeStatus({ DSH_HOME: daily }, { dailyHome: join(daily, 'nested') }).kind).toBe('daily')
  })

  it('unset 与 daily 都带 source run/env.sh 提示，ok 不带', () => {
    expect(homeStatus({}, { dailyHome: daily }).warning).toContain('source run/env.sh')
    expect(homeStatus({ DSH_HOME: join(daily, 'x') }, { dailyHome: daily }).warning).toContain('source run/env.sh')
    expect(homeStatus({ DSH_HOME: home }, { dailyHome: daily }).warning).toBeUndefined()
  })
})

describe('profiles 与会话清单', () => {
  it('profiles 列在场目录，home 缺失时为空', () => {
    expect(listProfiles(home)).toEqual(['headless', 'web'])
    expect(listProfiles(join(home, 'missing'))).toEqual([])
  })

  it('profiles 过滤 node_modules 等安装产物目录（它们不是 profile）', () => {
    dir(join(home, 'profiles/node_modules'))
    expect(listProfiles(home)).toEqual(['headless', 'web'])
  })

  it('会话按 slug 汇总：计数、最新时间、近序排列', () => {
    const sessions = listSessions(home, 5)
    expect(sessions.total).toBe(2)
    expect(sessions.recent[0].slug).toBe('slug-company')
    expect(sessions.recent[0].sessions).toBe(2)
    expect(new Date(sessions.recent[0].latest).getTime()).toBe(new Date('2026-10-06T12:00:00Z').getTime())
    expect(sessions.recent[1].slug).toBe('slug-rehearsal')
  })
})

describe('公司盘概览', () => {
  it('deliverables 按 mtime 近序', () => {
    const overview = workspaceOverview(workspace)
    expect(overview.deliverables).toEqual(['new-motion', 'old-motion'])
    expect(workspaceOverview(join(workspace, 'none')).deliverables).toEqual([])
  })
})

describe('orientState + renderOrient', () => {
  it('ok 态渲染含 home / profiles / 会话 / 公司盘 / run bundle 四件套 / 便宜检查节', () => {
    const state = orientState({ env: { DSH_HOME: home }, dailyHome: daily, workspaceRoot: workspace, gitStatus: 3 })
    const text = renderOrient(state)
    expect(text).toContain(home)
    expect(text).toContain('headless, web')
    expect(text).toContain('slug-company')
    expect(text).toContain('new-motion')
    expect(text).toContain('3')
    expect(text).toContain('run bundle 四件套')
    expect(text).toContain('pnpm orient --scenario')
    expect(text).toContain('pnpm verify')
    expect(text).toContain('pnpm test')
    expect(text).not.toContain('source run/env.sh')
  })

  it('unset 态渲染带警告且不误报 profiles（日用 home 的内容不算）', () => {
    const state = orientState({ env: {}, dailyHome: daily, workspaceRoot: workspace })
    const text = renderOrient(state)
    expect(text).toContain('source run/env.sh')
    expect(text).not.toContain(daily)
    expect(state.home.kind).toBe('unset')
    expect(state.profiles).toEqual([])
  })
})

describe('session preset（observation-hardening 条目 B）', () => {

  it('解析 type:session 头行的 agentPreset；无 preset = null、非法/缺席 = undefined（三态不混淆）', () => {
    expect(parseSessionPreset(`${headerLine('ceo')}\n{"type":"permission/preset","data":{"preset":"workspace-write"}}\n{"trunc`)).toBe('ceo')
    expect(parseSessionPreset(`${headerLine()}\n`)).toBeNull()
    expect(parseSessionPreset('not json\n{"type":"session","agentPreset":"ceo"}')).toBe('ceo')
    expect(parseSessionPreset('')).toBeUndefined()
  })

  it('注入 sessionPresets 后渲染 preset 列；无 preset/不可用/未注入三态如实', () => {
    dir(join(home, 'sessions/slug-plain/session-4444'))
    const state = orientState({ env: { DSH_HOME: home }, dailyHome: daily, workspaceRoot: workspace, sessionPresets: { 'slug-company': 'ceo', 'slug-rehearsal': null, 'slug-plain': undefined } })
    const text = renderOrient(state)
    expect(text).toContain('preset ceo')
    expect(text).toContain('（无——非 preset 会话）')
    expect(text).toContain('（不可用）')
    const plain = renderOrient(orientState({ env: { DSH_HOME: home }, dailyHome: daily, workspaceRoot: workspace }))
    expect(plain).not.toContain('preset')
  })
})

describe('session 视图（observation-closeout 条目 A）', () => {
  it('listSlugSessions 近序列出全部会话；slug 不存在 fail-loud', () => {
    const rows = listSlugSessions(home, 'slug-company')
    expect(rows.map(r => r.id)).toEqual(['session-2222', 'session-1111'])
    expect(rows[0].mtime).toBe('2026-10-06T12:00:00.000Z')
    expect(() => listSlugSessions(home, 'no-such-slug')).toThrow('session slug 不存在')
  })

  it('parseSessionHead 抽 preset/createdAt/cwd；parseSessionPreset 三态语义不变', () => {
    const text = `${JSON.stringify({ type: 'session', id: 's1', cwd: '/repo', createdAt: 1790074328381, agentPreset: 'ceo' })}\n{"type":"permission/preset"}\n{"trunc`
    expect(parseSessionHead(text)).toEqual({ preset: 'ceo', createdAt: 1790074328381, cwd: '/repo' })
    expect(parseSessionHead(`${headerLine()}\n`)).toEqual({ preset: null, createdAt: null, cwd: '/x' })
    expect(parseSessionHead('not json')).toBeUndefined()
    expect(parseSessionPreset(`${headerLine('ceo')}\n`)).toBe('ceo')
  })

  it('renderSessionView：preset 三态与 head 缺失（不可用）如实分行呈现', () => {
    const rows = [
      { id: 'session-1', mtime: '2026-10-06T10:00:00.000Z', head: { preset: 'ceo', createdAt: 1790074328381, cwd: '/repo' } },
      { id: 'session-2', mtime: '2026-10-06T09:00:00.000Z', head: { preset: null, createdAt: null, cwd: null } },
      { id: 'session-3', mtime: '2026-10-06T08:00:00.000Z', head: undefined },
    ]
    const text = renderSessionView('slug-company', rows, { total: 3 })
    expect(text).toContain('共 3')
    expect(text).toContain('preset ceo')
    expect(text).toContain('（无——非 preset 会话）')
    expect(text).toContain('（不可用）')
    expect(text).toContain('cwd /repo')
    expect(text).toContain('created 2026-09-22T10:52:08.381Z')   // createdAt 1790074328381 的 ISO
  })
})

describe('待核工作候选扫描（RFC orient-scan-view，R3′ 口径）', () => {
  const brief = (lines: string[]) => `# 任务书\n${lines.join('\n')}\n`
  const assign = (id: string, role: string, deps: string) => `派活｜${id}｜${role}｜事项 ${id}｜依赖：${deps}｜状态：待办`
  const motion = (ws: string, slug: string, opts: { final?: boolean; ceo?: string; drafts?: string[] }) => {
    dir(join(ws, 'deliverables', slug, 'drafts'))
    if (opts.ceo) put(join(ws, 'deliverables', slug, 'drafts/ceo.md'), opts.ceo)
    for (const name of opts.drafts ?? []) put(join(ws, 'deliverables', slug, 'drafts', name))
    if (opts.final) put(join(ws, 'deliverables', slug, 'final.md'))
  }

  it('三形状：已关闭不报 / 进行中候选+阻塞分列 / 盘上稿降档（depByDisk + stale）', () => {
    const ws = scratch('ws-scan')
    motion(ws, 'motion-closed', { final: true, ceo: brief([assign('T1', 'vp-sales', '无')]) })
    motion(ws, 'motion-open', { ceo: brief([assign('T1', 'vp-sales', '无'), assign('T2', 'cfo', 'T9')]) })
    motion(ws, 'motion-drift', { ceo: brief([assign('T1', 'vp-eng', '无'), assign('T2', 'coo', 'T1'), assign('T3', 'vp-sales', 'T5')]), drafts: ['vp-eng.md'] })
    const scan = scanDeliverables(ws)
    expect(scan['motion-closed']).toEqual({ closed: true, candidates: [], blocked: [] })
    const open = scan['motion-open']
    expect(open.closed).toBe(false)
    expect(open.candidates.map(c => c.task)).toEqual(['T1'])
    expect(open.blocked.map(b => b.task)).toEqual(['T2'])
    const drift = scan['motion-drift']
    expect(drift.candidates.map(c => `${c.task}${c.depByDisk ? 'ᵈ' : ''}`)).toEqual(['T1', 'T2ᵈ'])
    expect(drift.candidates.find(c => c.task === 'T1')!.stale).toBe(true)
    expect(drift.blocked.map(b => b.task)).toEqual(['T3'])
  })

  it('渲染：公司盘后带「待核工作候选」节（R3′ 口径 + 零容忍门槛声明）；空盘如实「无动议在盘」', () => {
    const ws = scratch('ws-scan-render')
    motion(ws, 'motion-closed', { final: true, ceo: brief([assign('T1', 'vp-sales', '无')]) })
    motion(ws, 'motion-open', { ceo: brief([assign('T1', 'vp-sales', '无'), assign('T2', 'cfo', 'T9')]) })
    const text = renderOrient(orientState({ env: { DSH_HOME: home }, dailyHome: daily, workspaceRoot: ws }))
    expect(text).toContain('待核工作候选')
    expect(text).toContain('R3′')
    expect(text).toContain('零容忍')
    expect(text).toMatch(/motion-closed.*已关闭/s)
    expect(text).toMatch(/motion-open[\s\S]*候选 1 · 阻塞 1/)
    const empty = renderOrient(orientState({ env: { DSH_HOME: home }, dailyHome: daily, workspaceRoot: scratch('ws-empty') }))
    expect(empty).toContain('无动议在盘')
  })
})

describe('run bundle 视图（引用合同字段，引用不复制）', () => {
  it('真实 tracked 场景 r2-motion：合同字段齐全且引用可解析', () => {
    const view = runBundleView(ROOT, 'replay/r2-motion')
    expect(view.selection).toBe('replay/r2-motion')
    expect(view.fields.scenario).toBe('r2-five-role-motion')
    expect(view.fields.recordedAt).toBe('2026-09-22')
    expect(view.fields.profile).toBe('web')
    expect(view.fields.agentPreset).toBe('ceo')
    expect(view.fields.cwd).toBe('company-workspace')
    expect(view.refs.sessionLeadExists).toBe(true)
    expect(view.refs.sessionChildrenCount).toBeGreaterThan(0)
    expect(view.refs.workspaceExpectedExists).toBe(true)
    expect(view.verification).toContain('replay-smoke')
    expect(view.verification).toContain('replay/r2-motion')
  })

  it('夹具场景：缺 lead 引用时如实报 false，不伪造', () => {
    const root = scratch('scene')
    const scene = join(root, 'snapshots/replay/mini')
    put(join(scene, 'snapshot.yml'), [
      'scenario: mini',
      'recordedAt: 2026-10-06',
      'profile: web',
      'agentPreset: ceo',
      'cwd: company-workspace',
      'session:',
      '  lead: sessions/lead.jsonl',
      '  children: sessions/',
      'workspace:',
      '  expected: workspace.expected/',
    ].join('\n'))
    const view = runBundleView(root, 'mini')
    expect(view.fields.scenario).toBe('mini')
    expect(view.refs.sessionLeadExists).toBe(false)
    expect(view.refs.sessionChildrenCount).toBe(0)
    expect(view.refs.workspaceExpectedExists).toBe(false)
  })

  it('未知场景 fail-loud（复用 snapshotScene 判定）', () => {
    expect(() => runBundleView(ROOT, 'no-such-scene')).toThrow('not found')
  })
})
