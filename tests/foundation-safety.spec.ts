import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { requireDevHome } from '../scripts/lib/runtime-home.mjs'

vi.mock('node:os', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:os')>(),
  homedir: vi.fn(),
}))

const ROOT = resolve(import.meta.dirname, '..')
const fixture = mkdtempSync(join(tmpdir(), 'company-home-guard-'))
const daily = join(fixture, '.dsh')
mkdirSync(daily)
vi.mocked(homedir).mockReturnValue(fixture)
afterEach(() => vi.unstubAllEnvs())
afterAll(() => rmSync(fixture, { recursive: true, force: true }))

describe('smoke home 隔离：在启动和排练写入前拒绝错误 home', () => {
  it.each([undefined, '', '   '])('拒绝未明确设置的 home：%s', (value) => {
    vi.stubEnv('DSH_HOME', value)
    expect(() => requireDevHome('probe')).toThrow('需要 DSH_HOME')
  })

  it.each(['.dsh', '.dsh/', '.dsh/profiles/new', '.', '.dsh/../.dsh'])('拒绝日用树及祖先：%s', (value) => {
    vi.stubEnv('DSH_HOME', join(fixture, value))
    expect(() => requireDevHome('probe')).toThrow('与日用 home')
  })

  it('拒绝指向日用目录的符号链接及尚不存在的子目录', () => {
    const alias = join(fixture, 'daily-alias')
    symlinkSync(daily, alias, 'dir')
    for (const home of [alias, join(alias, 'not-created')]) {
      vi.stubEnv('DSH_HOME', home)
      expect(() => requireDevHome('probe')).toThrow('与日用 home')
    }
    expect(existsSync(join(daily, 'not-created'))).toBe(false)
  })

  it('接受独立目录，不创建它，也不误拒绝名称前缀相同的目录', () => {
    for (const name of ['dev-home', '.dsh-dev']) {
      const home = join(fixture, name)
      vi.stubEnv('DSH_HOME', home)
      expect(requireDevHome('probe')).toBe(join(realpathSync(fixture), name))
      expect(existsSync(home)).toBe(false)
    }
  })

  it('接受独立 home 的符号链接并返回绝对真实路径', () => {
    const target = join(fixture, 'isolated')
    mkdirSync(target)
    const alias = join(fixture, 'isolated-alias')
    symlinkSync(target, alias, 'dir')
    vi.stubEnv('DSH_HOME', alias)
    expect(requireDevHome('probe')).toBe(realpathSync(target))
  })
})

describe('当前角色章程的工具路径以会话 cwd 为基准', () => {
  it.each(['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'])('%s 的输入和输出路径可直接使用', (role) => {
    const workspace = join(ROOT, 'company-workspace')
    const text = readFileSync(join(workspace, 'kb', role, 'CHARTER.md'), 'utf8')
    expect(text).not.toMatch(/`(?:\.\.\/(?:templates|deliverables|org\.md)|journal\/)/)
    expect(text).toContain(`\`kb/${role}/journal/\``)
    expect(existsSync(join(workspace, 'kb', role, 'journal'))).toBe(true)
    expect(text).toContain(role === 'ceo'
      ? '`deliverables/<slug>/final.md`'
      : `\`deliverables/<slug>/drafts/${role}.md\``)
    for (const match of text.matchAll(/`((?:templates|kb)\/[^`<>]+)`/g)) {
      expect(existsSync(join(workspace, match[1])), `${role}: ${match[1]}`).toBe(true)
    }
  })
})

describe('排练场镜像：kb 根三件事实家必须在场', () => {
  // 2026-09-26 立（磨清单第 4 项，触发条件 = 动排练场时）：镜像此前只拷 org.md + CHARTER +
  // templates ⇒ 排练场里的角色**看不到 owners.md（授权面）与 motion-ledger.md（经营台账）**，
  // 排练动议要按 owners 路由或要看台账就缺料。这条守"kb 根三件一件都不能少"。
  // 纯夹具（不碰真仓、不写 dev/rehearsal-workspace）：造一个最小 repo 根，只看镜像面。
  it('ensureRehearsalWorkspace 镜像 kb/{org,owners,motion-ledger}.md', async () => {
    const { ensureRehearsalWorkspace } = await import('../scripts/lib/rehearsal.mjs')
    const repo = mkdtempSync(join(tmpdir(), 'company-rehearsal-mirror-'))
    try {
      mkdirSync(join(repo, 'company-workspace/kb/ceo'), { recursive: true })
      writeFileSync(join(repo, 'company-workspace/AGENTS.md'), '# 手册\n')
      for (const name of ['org.md', 'owners.md', 'motion-ledger.md']) {
        writeFileSync(join(repo, 'company-workspace/kb', name), `# ${name}\n`)
      }
      writeFileSync(join(repo, 'company-workspace/kb/ceo/CHARTER.md'), '# ceo\n')
      const rehearsal = ensureRehearsalWorkspace(repo)
      for (const name of ['org.md', 'owners.md', 'motion-ledger.md']) {
        expect(existsSync(join(rehearsal, 'kb', name)), `缺 ${name}`).toBe(true)
      }
      expect(existsSync(join(rehearsal, 'kb/ceo/CHARTER.md'))).toBe(true)
      expect(existsSync(join(rehearsal, 'kb/ceo/journal'))).toBe(true)
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })
})
