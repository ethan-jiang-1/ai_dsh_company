// 负例留证 2026-11-13：去掉 dataBlocked 写前判断 ⇒「set 被拒」用例 success（BUG-121）；还原即绿。
// 负例留证 2026-11-13：writeStartupSettings 直接 writeFileSync ⇒「startup.json 是目录」用例抛 EISDIR（BUG-133）；改 safe 写即绿。
/**
 * `/company-settings` 命令（2026-11-12）：读写项目启动策略。
 *
 * 判据：
 * ① `show` 回当前三项与内容包可选项；
 * ② `set <field> <value>` 只改目标字段并落盘；未知值 fail-closed 且列可用项；
 * ③ `set <field> auto` 恢复该项自动；`reset` 三项全清；
 * ④ 非法子命令给用法；未知字段给可用字段；
 * ⑤ `wiki` 允许带空格（指针是路径）。
 *
 * 红配方：把 `parseSettingsCommand` 的 `auto` 分支删掉 → 「恢复自动」用例红；
 * 把未知值校验去掉 → 「未知值 fail-closed」用例红。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseSettingsCommand,
  registerSettingsCommand,
} from '../../../packages/company-pack/src/host/commands/settings-command.ts'
import { STARTUP_COMMAND_COPY } from '../../../packages/company-pack/src/lib/startup-command-copy.ts'
import { readStartupSettings } from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CONTENT_DIR = join(ROOT, 'packages/company-pack/content')

type Result = { readonly kind: string, readonly text: string }
type Definition = {
  name: string
  description?: string
  input?: { hint: string }
  handler: (input: { readonly rawInput: string }) => Promise<Result>
}

const roots: string[] = []

function mount(): Definition {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  registerSettingsCommand(ctx as never, {
    workspace: '',
    dataBlocked: false,
    contentDir: CONTENT_DIR,
    text: (zh) => zh,
  })
  return definition as Definition
}

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'settings-command-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('parseSettingsCommand', () => {
  it('空输入 = show', () => {
    expect(parseSettingsCommand('')).toEqual({ kind: 'show' })
    expect(parseSettingsCommand('show')).toEqual({ kind: 'show' })
  })

  it('set 解析字段与值；auto → null', () => {
    expect(parseSettingsCommand('set productType business-software'))
      .toEqual({ kind: 'set', field: 'productType', value: 'business-software' })
    expect(parseSettingsCommand('set deliveryMode auto'))
      .toEqual({ kind: 'set', field: 'deliveryMode', value: null })
  })

  it('wiki 允许空格路径，且连续空格不被折叠（值取原始剩余串）', () => {
    expect(parseSettingsCommand('set wiki /data/my wiki/index'))
      .toEqual({ kind: 'set', field: 'wiki', value: '/data/my wiki/index' })
    expect(parseSettingsCommand('set wiki /data/my  wiki/index'))
      .toEqual({ kind: 'set', field: 'wiki', value: '/data/my  wiki/index' })
    expect(parseSettingsCommand('set wiki   /a  b')).toEqual({ kind: 'set', field: 'wiki', value: '/a  b' })
  })

  it('未知字段 / 缺值 / 未知子命令 → 用法或字段提示', () => {
    expect(parseSettingsCommand('set nope x').kind).toBe('error')
    expect(parseSettingsCommand('set productType').kind).toBe('error')
    expect(parseSettingsCommand('frobnicate')).toEqual({ kind: 'error', code: 'usage' })
  })
})

describe('/company-settings handler', () => {
  it('show 回当前与可选项', async () => {
    const def = mount()
    const result = await def.handler({ rawInput: 'show', agent: { session: { header: { cwd: workspace() } } } } as never)
    expect(result.kind).toBe('success')
    expect(result.text).toContain('productType=auto')
    expect(result.text).toContain('business-software')
    expect(result.text).toContain('productized')
  })

  it('set 落盘 + auto 清回', async () => {
    const def = mount()
    const root = workspace()
    // workspace 为空时命令退回会话 cwd；这里给 agent.cwd。
    const agent = { session: { header: { cwd: root } } }
    const set = await def.handler({ rawInput: 'set productType hardware-software', agent } as never)
    expect(set.kind).toBe('success')
    expect(readStartupSettings(root).productType).toBe('hardware-software')

    const cleared = await def.handler({ rawInput: 'set productType auto', agent } as never)
    expect(cleared.kind).toBe('success')
    expect(readStartupSettings(root).productType).toBeNull()
  })

  it('未知值 fail-closed 并列可用项', async () => {
    const def = mount()
    const root = workspace()
    const agent = { session: { header: { cwd: root } } }
    const result = await def.handler({ rawInput: 'set productType retired-type', agent } as never)
    expect(result.kind).toBe('error')
    expect(result.text).toContain('retired-type')
    expect(result.text).toContain('business-software')
    expect(readStartupSettings(root).productType).toBeNull()
  })

  it('reset 三项全清', async () => {
    const def = mount()
    const root = workspace()
    const agent = { session: { header: { cwd: root } } }
    await def.handler({ rawInput: 'set deliveryMode project-services', agent } as never)
    await def.handler({ rawInput: 'set wiki /x/wiki', agent } as never)
    const result = await def.handler({ rawInput: 'reset', agent } as never)
    expect(result.kind).toBe('success')
    const settings = readStartupSettings(root)
    expect([settings.productType, settings.deliveryMode, settings.wiki]).toEqual([null, null, null])
  })
})

describe('workspace 权威：会话 cwd ≠ boot workspace', () => {
  function mountWith(boot: string, refreshed: string[] = []) {
    let definition: Definition | undefined
    const ctx = { commands: { register: (def: Definition) => { definition = def } } }
    registerSettingsCommand(ctx as never, {
      workspace: boot,
      dataBlocked: false,
      contentDir: CONTENT_DIR,
      text: (zh) => zh,
      refreshOptions: (target) => { refreshed.push(target) },
    })
    return definition as Definition
  }

  it('set 写会话 cwd 那份；show 读回同一份；boot 盘不动', async () => {
    const boot = workspace()
    const cwd = workspace()
    const refreshed: string[] = []
    const def = mountWith(boot, refreshed)
    const agent = { session: { header: { cwd } } }

    const set = await def.handler({ rawInput: 'set deliveryMode project-services', agent } as never)
    expect(set.kind).toBe('success')
    expect(readStartupSettings(cwd).deliveryMode).toBe('project-services')
    expect(readStartupSettings(boot).deliveryMode).toBeNull()
    expect(refreshed).toEqual([cwd])

    const show = await def.handler({ rawInput: 'show', agent } as never)
    expect(show.text).toContain('deliveryMode=project-services')
  })

  it('会话没有 cwd 才回退 boot workspace', async () => {
    const boot = workspace()
    const refreshed: string[] = []
    const def = mountWith(boot, refreshed)
    const result = await def.handler({ rawInput: 'set productType hardware-software', agent: {} } as never)
    expect(result.kind).toBe('success')
    expect(readStartupSettings(boot).productType).toBe('hardware-software')
    expect(refreshed).toEqual([boot])
  })
})

describe('en 命令面（双语单一源）', () => {
  const CJK = /[\u4e00-\u9fff]/

  function mountEn(): { definition: Definition } {
    let definition: Definition | undefined
    const ctx = { commands: { register: (def: Definition) => { definition = def; return () => {} } } }
    registerSettingsCommand(ctx as never, {
      workspace: '',
      dataBlocked: false,
      contentDir: CONTENT_DIR,
      text: (_zh, en) => en,
      language: { current: () => 'en', subscribe: () => () => {} },
    })
    return { definition: definition as Definition }
  }

  it('description / hint / usage / 未知字段 / 回执全都不含中文', async () => {
    const { definition } = mountEn()
    expect(definition.description).toBe(STARTUP_COMMAND_COPY.description.en)
    expect(definition.description).not.toMatch(CJK)
    expect(definition.input?.hint).not.toMatch(CJK)
    const agent = { session: { header: { cwd: workspace() } } }
    const usage = await definition.handler({ rawInput: 'frobnicate', agent } as never)
    expect(usage.kind).toBe('error')
    expect(usage.text).not.toMatch(CJK)
    const unknown = await definition.handler({ rawInput: 'set nope x', agent } as never)
    expect(unknown.text).not.toMatch(CJK)
    const show = await definition.handler({ rawInput: 'show', agent } as never)
    expect(show.kind).toBe('success')
    expect(show.text).not.toMatch(CJK)
  })

  it('语言切换时重注册 description（注册面没有 per-locale provider）', () => {
    let definition: Definition | undefined
    let listener: (() => void) | undefined
    let active: 'zh' | 'en' = 'zh'
    const disposed: number[] = []
    const ctx = { commands: { register: (def: Definition) => { definition = def; const id = disposed.length; disposed.push(id); return () => {} } } }
    registerSettingsCommand(ctx as never, {
      workspace: '',
      dataBlocked: false,
      contentDir: CONTENT_DIR,
      text: (_zh, en) => active === 'en' ? en : _zh,
      language: { current: () => active, subscribe: (fn) => { listener = fn; return () => {} } },
    })
    expect(definition?.description).toBe(STARTUP_COMMAND_COPY.description.zh)
    active = 'en'
    listener?.()
    expect(definition?.description).toBe(STARTUP_COMMAND_COPY.description.en)
    expect(disposed.length).toBe(2)
  })

  it('dataBlocked：set/reset 拒绝，show 仍可读（BUG-121）', async () => {
    const root = workspace()
    let definition: Definition | undefined
    const ctx = { commands: { register: (def: Definition) => { definition = def } } }
    registerSettingsCommand(ctx as never, {
      workspace: root, dataBlocked: true, contentDir: CONTENT_DIR, text: (zh) => zh,
    })
    const agent = { session: { header: { cwd: root } } }
    const set = await (definition as Definition).handler({ rawInput: 'set productType business-software', agent } as never)
    expect(set.kind).toBe('error')
    expect(set.text).toContain('公司数据已停写')
    const show = await (definition as Definition).handler({ rawInput: 'show', agent } as never)
    expect(show.kind).toBe('success')
    expect(readStartupSettings(root).productType).toBeNull()
  })

  it('startup.json 被目录占用 → 可读 error，不抛（BUG-133）', async () => {
    const root = workspace()
    mkdirSync(join(root, '.dsh-company', 'startup.json'), { recursive: true })
    const def = mount()
    const agent = { session: { header: { cwd: root } } }
    const result = await def.handler({ rawInput: 'set productType business-software', agent } as never)
    expect(result.kind).toBe('error')
    expect(result.text).toContain('目录占用')
  })
})
