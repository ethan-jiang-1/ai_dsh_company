import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

vi.mock('node:os', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:os')>(),
  homedir: vi.fn(),
}))

const fixture = mkdtempSync(join(tmpdir(), 'company-home-guard-'))
const daily = join(fixture, '.dsh')
mkdirSync(daily)
vi.mocked(homedir).mockReturnValue(fixture)
afterEach(() => vi.unstubAllEnvs())
afterAll(() => rmSync(fixture, { recursive: true, force: true }))

/** 排练/录制镜像的 kb 清单（v3：旁路只从 seed.json 派生，BUG-054）。 */
const MIRROR_ROLES = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']
const MIRROR_SEEDS = [
  ...['company.md', 'org.md', 'owners.md', 'motion-ledger.md']
    .map(name => ({ source: `state/${name}`, target: `.dsh-company/kb/${name}` })),
  ...MIRROR_ROLES.map(role => ({ source: `charters/${role}.md`, target: `.dsh-company/kb/${role}/CHARTER.md` })),
]

function writeSeedManifest(repo: string, seeds: Array<{ source: string, target: string }>): void {
  const dir = join(repo, 'packages/company-pack/content/kb-setup')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'seed.json'), JSON.stringify({ seeds }))
}

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
  it.each(['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo', 'cmo'])('%s 的输入和输出路径可直接使用', (role) => {
    // 2026-11-01：默认章程住 pack content/charters；运行态路径一律 .dsh-company/。
    const content = join(ROOT, 'packages/company-pack/content')
    const text = readFileSync(join(content, 'charters', `${role}.md`), 'utf8')
    expect(text).toContain(`.dsh-company/kb/${role}/journal/`)
    const draftRel = role === 'ceo'
      ? '.dsh-company/deliverables/<slug>/final.md'
      : `.dsh-company/deliverables/<slug>/drafts/${role === 'cmo' ? 'mrd' : role}.md`
    expect(text).toContain(draftRel)
    if (role !== 'ceo') expect(text).toContain('<company-content>/templates/')
    expect(existsSync(join(content, 'charters', `${role}.md`))).toBe(true)
  })
})

describe('排练场镜像：v3 run bundle 状态', () => {
  it('ensureRehearsalWorkspace 建 .dsh-company/kb 状态/章程/journal；不写根手册/模板', async () => {
    const { ensureRehearsalWorkspace } = await import('../../tools/lib/rehearsal.mjs')
    const repo = mkdtempSync(join(tmpdir(), 'company-rehearsal-mirror-'))
    try {
      mkdirSync(join(repo, 'packages/company-pack/content/state'), { recursive: true })
      mkdirSync(join(repo, 'packages/company-pack/content/charters'), { recursive: true })
      writeFileSync(join(repo, 'packages/company-pack/content/AGENTS.md'), '# 手册\n')
      for (const name of ['company.md', 'org.md', 'owners.md', 'motion-ledger.md']) {
        writeFileSync(join(repo, 'packages/company-pack/content/state', name), `# ${name}\n`)
      }
      mkdirSync(join(repo, 'company-workspace'), { recursive: true })
      for (const role of ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']) {
        writeFileSync(join(repo, 'packages/company-pack/content/charters', `${role}.md`), `# ${role}\n`)
      }
      writeSeedManifest(repo, MIRROR_SEEDS)
      const rehearsal = ensureRehearsalWorkspace(repo)
      for (const name of ['company.md', 'org.md', 'owners.md', 'motion-ledger.md']) {
        expect(existsSync(join(rehearsal, '.dsh-company/kb', name)), `缺 ${name}`).toBe(true)
      }
      expect(existsSync(join(rehearsal, '.dsh-company/kb/ceo/CHARTER.md'))).toBe(true)
      expect(existsSync(join(rehearsal, '.dsh-company/kb/ceo/journal'))).toBe(true)
      expect(existsSync(join(rehearsal, 'AGENTS.md'))).toBe(false)
      expect(existsSync(join(rehearsal, 'templates'))).toBe(false)
      expect(() => ensureRehearsalWorkspace(repo)).not.toThrow()
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })
})

describe('录制工作区参考镜像（v3）', () => {
  it('mirrorCompanyReference 镜像 .dsh-company/kb 状态/章程，不混 journal/deliverables', async () => {
    const { mirrorCompanyReference } = await import('../../tools/lib/rehearsal.mjs')
    const repo = mkdtempSync(join(tmpdir(), 'company-ref-src-'))
    const company = join(repo, 'company-workspace')
    const workspace = mkdtempSync(join(tmpdir(), 'company-ref-ws-'))
    try {
      mkdirSync(join(repo, 'packages/company-pack/content/state'), { recursive: true })
      mkdirSync(join(repo, 'packages/company-pack/content/charters'), { recursive: true })
      writeFileSync(join(repo, 'packages/company-pack/content/AGENTS.md'), '# 手册\n')
      for (const name of ['company.md', 'org.md', 'owners.md', 'motion-ledger.md']) {
        writeFileSync(join(repo, 'packages/company-pack/content/state', name), `# ${name}\n`)
      }
      for (const role of ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']) {
        writeFileSync(join(repo, 'packages/company-pack/content/charters', `${role}.md`), `# ${role}\n`)
      }
      writeSeedManifest(repo, MIRROR_SEEDS)
      mkdirSync(company, { recursive: true })
      mkdirSync(join(workspace, '.dsh-company/deliverables'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/deliverables/keep.md'), '# 不触碰\n')
      mirrorCompanyReference(workspace, company)
      expect(existsSync(join(workspace, '.dsh-company/kb/org.md'))).toBe(true)
      expect(existsSync(join(workspace, '.dsh-company/kb/ceo/CHARTER.md'))).toBe(true)
      expect(existsSync(join(workspace, '.dsh-company/kb/ceo/journal'))).toBe(true)
      expect(existsSync(join(workspace, 'AGENTS.md'))).toBe(false)
      expect(existsSync(join(workspace, 'templates'))).toBe(false)
      expect(existsSync(join(workspace, '.dsh-company/deliverables/keep.md')), '既有产物不触碰').toBe(true)
    } finally {
      rmSync(repo, { recursive: true, force: true })
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})

describe('converge 的标签→角色映射', () => {
  it('含 CMO（宪章补登 --charter-backfill 用）', () => {
    const src = readFileSync(join(ROOT, 'tools/converge.mjs'), 'utf8')
    expect(src).toContain("CMO: 'cmo'")
    expect(src).toMatch(/CEO\|VP-Eng\|VP-Sales\|COO\|CFO\|CMO/)
  })
})
