/**
 * `company:startup-settings` 注入文本的 keyless 判据（2026-11-12）。
 *
 * 判据：
 * ① 全自动 → 空串（不占上下文、也不给模型任何约束暗示）；
 * ② 有设值 → 只列已设项，并显式压住手册的「问一句 / 按特征猜」语义；
 * ③ `wiki` 带「先读 index 再钻页」的用法提示，且按指针位置分三档（A4：内可写 / 外只读 / 失效警示）；
 * ④ 文本不是静态快照：同一设置对象重复取词结果一致（活读由注册处 thunk 保证）。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  registerStartupSettings,
  STARTUP_SETTINGS_ORDER,
  STARTUP_SETTINGS_SECTION,
  startupSettingsText,
} from '../../../packages/company-pack/src/host/startup/startup-prompt.ts'
import { writeStartupSettings } from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { EMPTY_STARTUP_SETTINGS, EMPTY_WIKI_CHECK } from '../../../packages/company-pack/src/lib/startup-settings.ts'

describe('startupSettingsText', () => {
  it('全自动 → 空串', () => {
    expect(startupSettingsText(EMPTY_STARTUP_SETTINGS, EMPTY_WIKI_CHECK)).toBe('')
  })

  it('单字段：只列该项并压住问/猜', () => {
    const text = startupSettingsText({ ...EMPTY_STARTUP_SETTINGS, productType: 'business-software' }, EMPTY_WIKI_CHECK)
    expect(text).toContain('产品类型：business-software')
    expect(text).toContain('不要再问用户')
    expect(text).not.toContain('交付模式')
    expect(text).not.toContain('参考资料')
  })

  it('三字段齐全时逐项出现（含 wiki 的 index 用法）', () => {
    const text = startupSettingsText({
      ...EMPTY_STARTUP_SETTINGS,
      productType: 'hardware-software',
      deliveryMode: 'project-services',
      wiki: '../team-wiki',
    }, { value: '../team-wiki', ok: true, problem: null, location: 'inside', checkedAt: '2026-11-12T00:00:00.000Z' })
    expect(text).toContain('产品类型：hardware-software')
    expect(text).toContain('交付模式：project-services')
    expect(text).toContain('参考资料 wiki：../team-wiki')
    expect(text).toContain('index.md')
  })

  it('A4 三档：workspace 内可写 / workspace 外只读 / 失效警示（不含正常查页指引）', () => {
    const base = { ...EMPTY_STARTUP_SETTINGS, wiki: '/w' }
    const inside = startupSettingsText(base, { value: '/w', ok: true, problem: null, location: 'inside', checkedAt: '2026-11-12T00:00:00.000Z' })
    expect(inside).toContain('可以按 wiki 的维护协议新增/修改页面')
    expect(inside).not.toContain('只读')

    const outside = startupSettingsText(base, { value: '/w', ok: true, problem: null, location: 'outside', checkedAt: '2026-11-12T00:00:00.000Z' })
    expect(outside).toContain('只读')
    expect(outside).toContain('不要尝试写入')

    const broken = startupSettingsText(base, { value: '/w', ok: false, problem: 'no-index', location: 'outside', checkedAt: '2026-11-12T00:00:00.000Z' })
    expect(broken).toContain('已失效')
    expect(broken).toContain('目录里没有 index.md')
    expect(broken).toContain('不要')
    expect(broken).not.toContain('先读它下面的 index.md 再钻页')
  })

  it('A4 失效三因各说清楚（缺目录 / 非目录 / 缺 index）', () => {
    const base = { ...EMPTY_STARTUP_SETTINGS, wiki: '/w' }
    const of = (problem: 'missing' | 'not-directory' | 'no-index') =>
      startupSettingsText(base, { value: '/w', ok: false, problem, location: 'outside', checkedAt: '2026-11-12T00:00:00.000Z' })
    expect(of('missing')).toContain('目录不存在')
    expect(of('not-directory')).toContain('不是目录')
    expect(of('no-index')).toContain('没有 index.md')
  })

  it('section 名与顺序和手册错开（手册 500 → 本段 501）', () => {
    expect(STARTUP_SETTINGS_SECTION).toBe('company:startup-settings')
    expect(STARTUP_SETTINGS_ORDER).toBe(501)
  })
})

/** 造一个只实现注册面的假 host + agent；返回 section 与 watcher 收到的 workspace。 */
function mount(bootWorkspace: string, cwd: string | undefined, preset?: string) {
  const sections: Array<{ name: string, text: () => string }> = []
  const synced: string[] = []
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const ctx = {
    logger: { warn: () => {} },
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  }
  const agent = {
    ...(cwd === undefined ? {} : { session: { header: { cwd } } }),
    ctx: {
      get: (name: string) => name === 'agentPresets' && preset !== undefined
        ? { composedPreset: () => preset }
        : undefined,
      inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
        callback({
          systemPrompt: {
            section: (section: { name: string, text: () => string }) => {
              sections.push(section)
              return () => {}
            },
          },
        })
        return { dispose: async () => {} }
      },
    },
  }
  registerStartupSettings(ctx as never, bootWorkspace, {
    watch: { sync: (workspace: string) => { synced.push(workspace) } },
  })
  const fire = (): void => {
    for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  }
  return { sections, synced, agent, fire }
}

/** 造一个带 `.dsh-company/startup.json` 的临时 workspace。 */
function workspaceWithSettings(): string {
  const root = mkdtempSync(join(tmpdir(), 'startup-prompt-ws-'))
  writeStartupSettings(root, {
    ...EMPTY_STARTUP_SETTINGS,
    productType: 'hardware-software',
    updatedAt: '2026-11-12T00:00:00.000Z',
  })
  return root
}

describe('registerStartupSettings', () => {
  it('boot 无 workspace 也注册：section 读 agent 会话 cwd 的那份 startup.json', () => {
    const ws = workspaceWithSettings()
    try {
      const { sections, synced, fire } = mount('', ws)
      fire()
      expect(synced).toEqual([ws])
      expect(sections).toHaveLength(1)
      const text = sections[0]?.text() ?? ''
      expect(text).toContain('本项目的启动策略')
      expect(text).toContain('产品类型：hardware-software')
    } finally { rmSync(ws, { recursive: true, force: true }) }
  })

  it('会话 cwd 优先于 boot workspace：section 读 cwd 那份，不读 boot 盘', () => {
    const boot = workspaceWithSettings()
    const cwd = mkdtempSync(join(tmpdir(), 'startup-prompt-cwd-'))
    try {
      const { sections, synced, fire } = mount(boot, cwd)
      fire()
      expect(synced).toEqual([cwd])
      expect(sections[0]?.text()).toBe('')
    } finally {
      rmSync(boot, { recursive: true, force: true })
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it('重复 agent/created 不重复装 section（WeakSet 保留）', () => {
    const ws = workspaceWithSettings()
    try {
      const { sections, fire } = mount(ws, ws)
      fire()
      fire()
      expect(sections).toHaveLength(1)
    } finally { rmSync(ws, { recursive: true, force: true }) }
  })

  it('support preset 仍跳过（不注册、不派生）', () => {
    const ws = workspaceWithSettings()
    try {
      const { sections, synced, fire } = mount(ws, ws, 'worker')
      fire()
      expect(sections).toHaveLength(0)
      expect(synced).toEqual([])
    } finally { rmSync(ws, { recursive: true, force: true }) }
  })

  it('无 cwd 且无 boot workspace：不装空 section', () => {
    const { sections, fire } = mount('', undefined)
    fire()
    expect(sections).toHaveLength(0)
  })
})
