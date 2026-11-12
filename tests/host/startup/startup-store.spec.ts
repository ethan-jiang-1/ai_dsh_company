// 负例留证 2026-11-13：坏 JSON 仍 parseStartupSettings ⇒ problem 缺失、显示 auto（BUG-123）；state 解析即绿。
/**
 * 启动策略落盘层的 keyless 判据（2026-11-12）。
 *
 * 判据：
 * ① 写是原子的：目标文件要么旧内容、要么完整新内容（同目录临时文件 + rename）；
 * ② 目录不存在时自动建（`.dsh-company/` 可能还没 bootstrap 完）；
 * ③ 选项枚举来自 `content/`：产品类型 = 目录名排序；交付模式 = 隐式 `productized` 在前；
 * ④ 内容目录缺失 → 空集合 / 只有 productized（不发明选项）；
 * ⑤ 读坏文件不抛（折成全自动 / 空集合）。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  checkWikiPointer,
  enumerateStartupOptions,
  readStartupOptions,
  readStartupSettings,
  readStartupSettingsState,
  refreshStartupOptions,
  resolveWikiDir,
  startupOptionsPath,
  startupSettingsPath,
  writeStartupSettings,
} from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { EMPTY_STARTUP_SETTINGS } from '../../../packages/company-pack/src/lib/startup-settings.ts'

const roots: string[] = []

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'startup-store-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('paths', () => {
  it('settings 与派生选项是两个文件，且都在 .dsh-company 下', () => {
    const root = workspace()
    expect(startupSettingsPath(root)).toBe(join(root, '.dsh-company', 'startup.json'))
    expect(startupOptionsPath(root)).toBe(join(root, '.dsh-company', 'startup-options.json'))
    expect(startupSettingsPath(root)).not.toBe(startupOptionsPath(root))
  })
})

describe('read / write settings', () => {
  it('缺失 → 全自动；写完能读回；目录自动创建', () => {
    const root = workspace()
    expect(readStartupSettings(root)).toEqual(EMPTY_STARTUP_SETTINGS)
    const settings = { v: 1 as const, productType: 'business-software', deliveryMode: null, wiki: null, updatedAt: 'T' }
    writeStartupSettings(root, settings)
    expect(readStartupSettings(root)).toEqual(settings)
  })

  it('覆盖写是原子的：不留临时文件', () => {
    const root = workspace()
    writeStartupSettings(root, { v: 1, productType: 'a', deliveryMode: null, wiki: null, updatedAt: '1' })
    writeStartupSettings(root, { v: 1, productType: 'b', deliveryMode: null, wiki: null, updatedAt: '2' })
    const files = readdirSync(join(root, '.dsh-company'))
    expect(files.filter(name => name.endsWith('.tmp'))).toEqual([])
    expect(readStartupSettings(root).productType).toBe('b')
  })

  it('坏文件折成全自动，不抛', () => {
    const root = workspace()
    mkdirSync(join(root, '.dsh-company'), { recursive: true })
    writeFileSync(startupSettingsPath(root), '{not json', 'utf8')
    expect(readStartupSettings(root)).toEqual(EMPTY_STARTUP_SETTINGS)
  })
})

describe('enumerate / refresh options', () => {
  it('产品类型 = 目录名排序；交付模式 = productized 在前', () => {
    const content = workspace()
    mkdirSync(join(content, 'product-types', 'b-type'), { recursive: true })
    mkdirSync(join(content, 'product-types', 'a-type'), { recursive: true })
    mkdirSync(join(content, 'delivery-modes', 'managed-service'), { recursive: true })
    expect(enumerateStartupOptions(content)).toMatchObject({
      productTypes: ['a-type', 'b-type'],
      deliveryModes: ['productized', 'managed-service'],
    })
  })

  it('内容目录缺失 → 空产品类型 + 只有隐式 productized', () => {
    expect(enumerateStartupOptions(workspace())).toMatchObject({ productTypes: [], deliveryModes: ['productized'] })
    expect(enumerateStartupOptions(undefined).productTypes).toEqual([])
    expect(enumerateStartupOptions(undefined).deliveryModes).toEqual([])
  })

  it('wiki 检查三档：目录不存在 / 不是目录 / 缺 index.md（A3）', () => {
    const root = workspace()
    expect(checkWikiPointer(root, 'no-such')).toMatchObject({ ok: false, problem: 'missing' })
    writeFileSync(join(root, 'a-file'), 'x')
    expect(checkWikiPointer(root, 'a-file')).toMatchObject({ ok: false, problem: 'not-directory' })
    mkdirSync(join(root, 'empty-dir'), { recursive: true })
    expect(checkWikiPointer(root, 'empty-dir')).toMatchObject({ ok: false, problem: 'no-index' })
    mkdirSync(join(root, 'good'), { recursive: true })
    writeFileSync(join(root, 'good', 'index.md'), '# index\n')
    expect(checkWikiPointer(root, 'good')).toMatchObject({ value: 'good', ok: true, problem: null, location: 'inside', checkedAt: expect.any(String) })
  })

  it('wiki 位置：workspace 内 → inside；绝对外路径 → outside；未设 → null', () => {
    const root = workspace()
    mkdirSync(join(root, 'in'), { recursive: true })
    writeFileSync(join(root, 'in', 'index.md'), '# i\n')
    expect(checkWikiPointer(root, 'in').location).toBe('inside')
    const outside = mkdtempSync(join(tmpdir(), 'zz-wiki-out-'))
    writeFileSync(join(outside, 'index.md'), '# o\n')
    expect(checkWikiPointer(root, outside).location).toBe('outside')
    expect(checkWikiPointer(root, null)).toEqual({ value: null, ok: true, problem: null, location: null, checkedAt: null })
  })

  it('refresh 把当前 wiki 检查一起落盘（派生文件带 wikiCheck）', () => {
    const root = workspace()
    const content = workspace()
    mkdirSync(join(root, 'wiki'), { recursive: true })
    writeFileSync(join(root, 'wiki', 'index.md'), '# i\n')
    writeStartupSettings(root, { ...EMPTY_STARTUP_SETTINGS, wiki: 'wiki' })
    const options = refreshStartupOptions(root, content)
    expect(options.wikiCheck).toMatchObject({ value: 'wiki', ok: true, location: 'inside' })
    expect(readStartupOptions(root).wikiCheck).toMatchObject({ value: 'wiki', ok: true })
  })

  it('refresh 落派生文件，读回一致', () => {
    const root = workspace()
    const content = workspace()
    mkdirSync(join(content, 'product-types', 'x'), { recursive: true })
    const options = refreshStartupOptions(root, content)
    expect(existsSync(startupOptionsPath(root))).toBe(true)
    expect(readStartupOptions(root)).toEqual(options)
    expect(JSON.parse(readFileSync(startupOptionsPath(root), 'utf8')).v).toBe(1)
  })
})

describe('wiki 指针的真实路径判据（盘上事实）', () => {
  it('symlink 内→外：按真实目标判 outside（词法前缀会说反）', () => {
    const root = workspace()
    const outside = workspace()
    mkdirSync(join(outside, 'wiki'), { recursive: true })
    writeFileSync(join(outside, 'wiki', 'index.md'), '# i\n')
    symlinkSync(join(outside, 'wiki'), join(root, 'link-out'))
    expect(checkWikiPointer(root, 'link-out')).toMatchObject({ ok: true, location: 'outside' })
  })

  it('symlink 外→内：真实目标在 workspace 内 → inside', () => {
    const root = workspace()
    mkdirSync(join(root, 'real'), { recursive: true })
    writeFileSync(join(root, 'real', 'index.md'), '# i\n')
    const outside = workspace()
    symlinkSync(join(root, 'real'), join(outside, 'back-in'))
    expect(checkWikiPointer(root, join(outside, 'back-in'))).toMatchObject({ ok: true, location: 'inside' })
  })

  it('index.md 是目录 → no-index（必须是文件）', () => {
    const root = workspace()
    mkdirSync(join(root, 'dirindex', 'index.md'), { recursive: true })
    expect(checkWikiPointer(root, 'dirindex')).toMatchObject({ ok: false, problem: 'no-index' })
  })

  it('~ 展开；相对路径仍按 workspace 解释', () => {
    const root = workspace()
    expect(resolveWikiDir(root, '~/wiki')).toBe(join(homedir(), 'wiki'))
    expect(resolveWikiDir(root, 'wiki')).toBe(join(root, 'wiki'))
  })

  it('派生选项带当前部署的模板绝对路径（安装视图可用）', () => {
    const content = workspace()
    expect(enumerateStartupOptions(content).wikiTemplate).toBe(join(content, 'wiki-template'))
    expect(enumerateStartupOptions(undefined).wikiTemplate).toBeNull()
  })
})

describe('startup 坏文件诊断（BUG-123/136）', () => {
  it('坏 JSON → problem=corrupt；symlink → unsafe 且不采用外部值', () => {
    const root = workspace()
    writeStartupSettings(root, { ...EMPTY_STARTUP_SETTINGS, productType: 'business-software' })
    writeFileSync(startupSettingsPath(root), '{"v":1,"productType":')
    expect(readStartupSettingsState(root)).toMatchObject({ problem: 'corrupt' })

    const outside = workspace()
    writeFileSync(join(outside, 's.json'), JSON.stringify({ v: 1, productType: 'hardware-software', deliveryMode: null, wiki: null }))
    rmSync(startupSettingsPath(root), { force: true })
    symlinkSync(join(outside, 's.json'), startupSettingsPath(root))
    expect(readStartupSettingsState(root).problem).toBe('unsafe')
    expect(readStartupSettingsState(root).settings.productType).toBeNull()
  })

  it('输出被目录占用 → 写抛 typed error', () => {
    const root = workspace()
    mkdirSync(startupSettingsPath(root), { recursive: true })
    expect(() => writeStartupSettings(root, EMPTY_STARTUP_SETTINGS)).toThrow(/目录占用/)
  })
})
