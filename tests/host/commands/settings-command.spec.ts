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
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseSettingsCommand,
  registerSettingsCommand,
  SETTINGS_USAGE,
} from '../../../packages/company-pack/src/host/commands/settings-command.ts'
import { readStartupSettings } from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CONTENT_DIR = join(ROOT, 'packages/company-pack/content')

type Result = { readonly kind: string, readonly text: string }
type Definition = {
  name: string
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

  it('wiki 允许空格路径', () => {
    expect(parseSettingsCommand('set wiki /data/my wiki/index'))
      .toEqual({ kind: 'set', field: 'wiki', value: '/data/my wiki/index' })
  })

  it('未知字段 / 缺值 / 未知子命令 → 用法或字段提示', () => {
    expect(parseSettingsCommand('set nope x').kind).toBe('error')
    expect(parseSettingsCommand('set productType').kind).toBe('error')
    expect(parseSettingsCommand('frobnicate')).toEqual({ kind: 'error', text: SETTINGS_USAGE })
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
