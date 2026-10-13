/**
 * 首启自举的 keyless 完成定义（2026-10-13 立）。
 *
 * 判据三条（对应 lib/bootstrap.ts 头注的纪律）：①缺什么建什么（含嵌套目录）；
 * ②已有的一律不动（内容与字节都不改——本仓的运行盘尤其不能被覆盖）；③可重入（第二次全 skip）。
 * 反证：把 `applyBootstrap` 里的 `flag: 'wx'` 换成默认 flag（或删 `action === 'skip'` 分支）
 * ⇒ 「已有文件不被覆盖」那条红。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyBootstrap,
  bootstrapCompanyWorkspace,
  bootstrapEnabled,
  planBootstrap,
  resolveCompanyHome,
  resolveSkeletonDir,
} from '../../packages/company-pack/src/host/bootstrap.ts'

/** 造一个最小出厂骨架（形状照 pack 的 workspace/：手册 + kb + templates + 空目录）。 */
function skeleton(): string {
  const dir = mkdtempSync(join(tmpdir(), 'company-skeleton-'))
  mkdirSync(join(dir, 'kb/ceo/journal'), { recursive: true })
  mkdirSync(join(dir, 'templates'), { recursive: true })
  mkdirSync(join(dir, 'deliverables'), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 手册\n')
  writeFileSync(join(dir, 'kb/org.md'), '# org\n')
  writeFileSync(join(dir, 'kb/ceo/CHARTER.md'), '# ceo 章程\n')
  writeFileSync(join(dir, 'templates/meta.md'), '# meta 模板\n')
  writeFileSync(join(dir, '.gitkeep'), '') // dotfile 不进目标盘
  return dir
}

describe('首启自举：planBootstrap', () => {
  it('目标盘不存在 ⇒ 全部 create（含嵌套目录）；dotfile 不进计划', () => {
    const skel = skeleton()
    const home = join(mkdtempSync(join(tmpdir(), 'company-home-')), 'company-workspace')
    try {
      const plan = planBootstrap(skel, home)
      expect(plan.error).toBeUndefined()
      expect(plan.creates).toBe(plan.entries.length)
      expect(plan.entries.map(entry => entry.rel)).toContain('kb/ceo/journal')
      expect(plan.entries.map(entry => entry.rel)).not.toContain('.gitkeep')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(home, { recursive: true, force: true })
    }
  })

  it('骨架缺失 ⇒ 带 error 的空计划（不抛——apply 期抛错会连累应用）', () => {
    const plan = planBootstrap('/nonexistent/skeleton', '/tmp/whatever-company-home')
    expect(plan.entries).toEqual([])
    expect(plan.error).toContain('骨架目录不存在')
  })
})

describe('首启自举：applyBootstrap（只补缺 / 绝不覆盖 / 可重入）', () => {
  it('第一次落盘、第二次全 skip；已有文件内容一个字节不改', () => {
    const skel = skeleton()
    const home = join(mkdtempSync(join(tmpdir(), 'company-home-')), 'company-workspace')
    try {
      const first = bootstrapCompanyWorkspace(skel, home)
      expect(first.plan.error).toBeUndefined()
      expect(first.result.created).toContain('AGENTS.md')
      expect(readFileSync(join(home, 'kb/org.md'), 'utf8')).toBe('# org\n')
      expect(existsSync(join(home, 'deliverables'))).toBe(true)

      // 用户填了自己的东西（owners）与改了手册——第二次自举不许碰
      writeFileSync(join(home, 'kb/owners.md'), '# 我们的人\n')
      writeFileSync(join(home, 'AGENTS.md'), '# 我们改过的手册\n')
      const second = bootstrapCompanyWorkspace(skel, home)
      expect(second.result.created).toEqual([])
      expect(second.result.skipped.length).toBe(first.result.created.length)
      expect(readFileSync(join(home, 'kb/owners.md'), 'utf8')).toBe('# 我们的人\n')
      expect(readFileSync(join(home, 'AGENTS.md'), 'utf8')).toBe('# 我们改过的手册\n')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(home, { recursive: true, force: true })
    }
  })

  it('部分缺件 ⇒ 只补缺的（additive migration 语义）', () => {
    const skel = skeleton()
    const home = join(mkdtempSync(join(tmpdir(), 'company-home-')), 'company-workspace')
    try {
      mkdirSync(join(home, 'kb'), { recursive: true })
      writeFileSync(join(home, 'kb/org.md'), '# 我们的 org\n')
      const { result } = bootstrapCompanyWorkspace(skel, home)
      expect(result.created).toContain('kb/ceo/CHARTER.md')
      expect(result.skipped).toContain('kb/org.md')
      expect(readFileSync(join(home, 'kb/org.md'), 'utf8')).toBe('# 我们的 org\n')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(home, { recursive: true, force: true })
    }
  })

  it('计划带 error 时 apply 是纯 no-op（不建目录）', () => {
    const home = join(mkdtempSync(join(tmpdir(), 'company-home-')), 'company-workspace')
    try {
      const plan = planBootstrap('/nonexistent/skeleton', home)
      const result = applyBootstrap(plan)
      expect(result.created).toEqual([])
      expect(existsSync(home)).toBe(false)
      expect(lstatSync(join(home, '..')).isDirectory()).toBe(true)
    } finally {
      rmSync(join(home, '..'), { recursive: true, force: true })
    }
  })
})

describe('首启自举：骨架目录的路径算术（防"多套一层 workspace"）', () => {
  // 现场（2026-10-13）：接线把已解出的 `<pack>/workspace` 又喂给会再拼 `workspace` 的助手
  // ⇒ `<pack>/workspace/workspace`，真实例里只留一行 warn、静默不落盘；release-smoke ⑥ 抓出。
  // 反证：把 resolveSkeletonDir 改成 `join(fileURLToPath(new URL('../', moduleUrl)), 'workspace', 'workspace')` ⇒ 本条红。
  it('`<pack>/lib/index.js` ⇒ `<pack>/workspace`（不是 `<pack>/workspace/workspace`）', () => {
    // ⚠ fileURLToPath **保留 URL 的尾斜杠**，而 Node 的 path.normalize 也保留（实测；POSIX 语义）
    // ⇒ 断言自己剥尾斜杠（关键是"只一层 workspace"）
    const strip = (value: string): string => value.replace(/\/+$/, '')
    expect(strip(resolveSkeletonDir('file:///pack/lib/index.js'))).toBe('/pack/workspace')
    expect(resolveSkeletonDir('file:///pack/lib/index.js')).not.toContain('/workspace/workspace')
  })
})

describe('首启自举：落点与开关', () => {
  it('落点优先级：显式 > DSH_COMPANY_HOME > <DSH_HOME>/company-workspace', () => {
    const before = process.env.DSH_COMPANY_HOME
    try {
      delete process.env.DSH_COMPANY_HOME
      expect(resolveCompanyHome('/h')).toBe('/h/company-workspace')
      expect(resolveCompanyHome('/h', '/x/y')).toBe('/x/y')
      process.env.DSH_COMPANY_HOME = '/env/company'
      expect(resolveCompanyHome('/h')).toBe('/env/company')
    } finally {
      if (before === undefined) delete process.env.DSH_COMPANY_HOME
      else process.env.DSH_COMPANY_HOME = before
    }
  })

  it('开关：DSH_COMPANY_BOOTSTRAP=off 关闭（自管盘的部署用）', () => {
    const before = process.env.DSH_COMPANY_BOOTSTRAP
    try {
      delete process.env.DSH_COMPANY_BOOTSTRAP
      expect(bootstrapEnabled()).toBe(true)
      process.env.DSH_COMPANY_BOOTSTRAP = 'off'
      expect(bootstrapEnabled()).toBe(false)
    } finally {
      if (before === undefined) delete process.env.DSH_COMPANY_BOOTSTRAP
      else process.env.DSH_COMPANY_BOOTSTRAP = before
    }
  })
})
