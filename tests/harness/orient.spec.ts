import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../scripts/lib/repository-layout.mjs'
import { homeStatus, listProfiles, listSessions, orientState, renderOrient, runBundleView, workspaceOverview } from '../../scripts/lib/orient.mjs'

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

describe('home status（日用 home 判定，只警告不抛）', () => {
  it('未设置 / 正常 / 双向重叠 三态', () => {
    expect(homeStatus({}, { dailyHome: daily }).kind).toBe('unset')
    expect(homeStatus({ DSH_HOME: home }, { dailyHome: daily }).kind).toBe('ok')
    expect(homeStatus({ DSH_HOME: join(daily, 'nested') }, { dailyHome: daily }).kind).toBe('daily')
    expect(homeStatus({ DSH_HOME: daily }, { dailyHome: join(daily, 'nested') }).kind).toBe('daily')
  })

  it('unset 与 daily 都带 source dev/env.sh 提示，ok 不带', () => {
    expect(homeStatus({}, { dailyHome: daily }).warning).toContain('source dev/env.sh')
    expect(homeStatus({ DSH_HOME: join(daily, 'x') }, { dailyHome: daily }).warning).toContain('source dev/env.sh')
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
  it('ok 态渲染含 home / profiles / 会话 / 公司盘 / 便宜检查五节', () => {
    const state = orientState({ env: { DSH_HOME: home }, dailyHome: daily, workspaceRoot: workspace, gitStatus: 3 })
    const text = renderOrient(state)
    expect(text).toContain(home)
    expect(text).toContain('headless, web')
    expect(text).toContain('slug-company')
    expect(text).toContain('new-motion')
    expect(text).toContain('3')
    expect(text).toContain('pnpm verify')
    expect(text).toContain('pnpm test')
    expect(text).not.toContain('source dev/env.sh')
  })

  it('unset 态渲染带警告且不误报 profiles（日用 home 的内容不算）', () => {
    const state = orientState({ env: {}, dailyHome: daily, workspaceRoot: workspace })
    const text = renderOrient(state)
    expect(text).toContain('source dev/env.sh')
    expect(text).not.toContain(daily)
    expect(state.home.kind).toBe('unset')
    expect(state.profiles).toEqual([])
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
