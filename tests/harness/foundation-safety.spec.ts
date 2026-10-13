import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, relative } from 'node:path'
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
  // 纯夹具（不碰真仓、不写 runtime/rehearsal-workspace）：造一个最小 repo 根，只看镜像面。
  it('ensureRehearsalWorkspace 镜像 kb/{org,owners,motion-ledger}.md', async () => {
    const { ensureRehearsalWorkspace } = await import('../../tools/lib/rehearsal.mjs')
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

  // 2026-10-13 立（出厂骨架单源轮）：真盘的制度件本身是**符号链接**（住 packages/company-pack/workspace）。
  // 镜像必须解引用成实文件——否则排练场里躺着指回 pack 的链接，二次刷新还会 EEXIST 崩（preset-smoke 首跑现场）。
  // 反证：把 tools/lib/rehearsal.mjs 的 REF 去掉 `dereference: true` ⇒ 本条红（拿到的仍是链接）。
  it('真盘制度件是符号链接时，镜像落的是实文件（不是指回 pack 的链接）', async () => {
    const { ensureRehearsalWorkspace } = await import('../../tools/lib/rehearsal.mjs')
    const repo = mkdtempSync(join(tmpdir(), 'company-rehearsal-link-'))
    try {
      const pack = join(repo, 'packages/company-pack/workspace/kb')
      mkdirSync(join(pack, 'ceo'), { recursive: true })
      mkdirSync(join(repo, 'company-workspace/kb/ceo'), { recursive: true })
      writeFileSync(join(repo, 'company-workspace/AGENTS.md'), '# 手册\n')
      // pack 家 = 真实文件；运行盘 = 符号链接（就是本仓现在的形状）
      writeFileSync(join(pack, 'org.md'), '# org\n')
      symlinkSync(relative(join(repo, 'company-workspace/kb'), join(pack, 'org.md')), join(repo, 'company-workspace/kb/org.md'))
      writeFileSync(join(pack, 'ceo/CHARTER.md'), '# ceo 章程\n')
      symlinkSync(relative(join(repo, 'company-workspace/kb/ceo'), join(pack, 'ceo/CHARTER.md')), join(repo, 'company-workspace/kb/ceo/CHARTER.md'))
      for (const name of ['owners.md', 'motion-ledger.md']) writeFileSync(join(repo, 'company-workspace/kb', name), `# ${name}\n`)

      const first = ensureRehearsalWorkspace(repo)
      expect(lstatSync(join(first, 'kb/org.md')).isSymbolicLink(), 'org.md 落成了链接（应解引用成实文件）').toBe(false)
      expect(lstatSync(join(first, 'kb/ceo/CHARTER.md')).isSymbolicLink(), 'CHARTER 落成了链接').toBe(false)
      expect(readFileSync(join(first, 'kb/org.md'), 'utf8')).toBe('# org\n')
      // 幂等：第二次刷新不许崩（EEXIST 现场）
      expect(() => ensureRehearsalWorkspace(repo)).not.toThrow()
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })
})

// 负例留证 2026-10-09：把 rehearsal.mjs 的 templates/ 镜像两行删掉
//（= 录制工作区看不到 templates/meta.md，正是 BUG-006 的真缺口）→ 本文件红（2 failed）；还原 → 绿。
describe('录制工作区参考镜像（BUG-006：模板缺料 ⇒ meta 词表自由发挥）', () => {
  // 判据（RFC r7-motion-final BUG-006 修复）：录制/临时工作区与排练场吃**同一份参考镜像**——
  // AGENTS.md（相对符号链接）+ kb 事实三件 + 各角色 CHARTER + templates/（meta.md 词表模板在列）；
  // journal 不镜像（记忆不混）、deliverables 不触碰。镜像是幂等纯 fs，红 = 函数不存在。
  it('mirrorCompanyReference 镜像 templates/ 与 kb 事实家，不混 journal', async () => {
    const { mirrorCompanyReference } = await import('../../tools/lib/rehearsal.mjs')
    const company = mkdtempSync(join(tmpdir(), 'company-ref-src-'))
    const workspace = mkdtempSync(join(tmpdir(), 'company-ref-ws-'))
    try {
      writeFileSync(join(company, 'AGENTS.md'), '# 手册\n')
      mkdirSync(join(company, 'kb/ceo/journal'), { recursive: true })
      writeFileSync(join(company, 'kb/org.md'), '# org\n')
      writeFileSync(join(company, 'kb/ceo/CHARTER.md'), '# ceo\n')
      writeFileSync(join(company, 'kb/ceo/journal/private.md'), '# 真记忆\n')
      mkdirSync(join(company, 'templates'), { recursive: true })
      writeFileSync(join(company, 'templates/meta.md'), '类型: <决策｜生产｜诊断｜口径问答>\n')
      mkdirSync(join(workspace, 'deliverables'), { recursive: true })
      writeFileSync(join(workspace, 'deliverables/keep.md'), '# 不触碰\n')
      mirrorCompanyReference(workspace, company)
      expect(existsSync(join(workspace, 'templates/meta.md')), '缺 meta.md 词表模板').toBe(true)
      expect(existsSync(join(workspace, 'kb/org.md'))).toBe(true)
      expect(existsSync(join(workspace, 'kb/ceo/CHARTER.md'))).toBe(true)
      expect(existsSync(join(workspace, 'AGENTS.md'))).toBe(true)
      expect(existsSync(join(workspace, 'kb/ceo/journal/private.md')), 'journal 不得混入').toBe(false)
      expect(existsSync(join(workspace, 'deliverables/keep.md')), '既有产物不触碰').toBe(true)
    } finally {
      rmSync(company, { recursive: true, force: true })
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})
