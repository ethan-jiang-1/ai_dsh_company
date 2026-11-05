/**
 * run bundle 初始化 v3 的 keyless 完成定义（2026-11-01）。
 *
 * 判据：
 * ① 只建 `<workspace>/.dsh-company/`，不写根目录 `AGENTS.md`/`COMPANY.md`/`kb/`/`templates/`；
 * ② 状态实例（company/org/owners/ledger/charter）只补缺；
 * ③ 手册/模板不进 run bundle（只读内容住 pack `content/`）；
 * ④ 可重入：第二次全 skip，已有文件字节不变；
 * ⑤ content 缺失/落点不安全时不抛，返回可诊断错误。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyBootstrap,
  bootstrapCompanyWorkspace,
  listRunBundleFiles,
  planBootstrap,
  resolveContentDir,
  validateCompanyHome,
} from '../../packages/company-pack/src/host/bootstrap.ts'

/** 最小 pack content：手册 + 模板 + 默认章程 + 状态默认值。 */
function content(): string {
  const dir = mkdtempSync(join(tmpdir(), 'company-content-'))
  mkdirSync(join(dir, 'templates'), { recursive: true })
  mkdirSync(join(dir, 'charters'), { recursive: true })
  mkdirSync(join(dir, 'state'), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 公司手册\n')
  writeFileSync(join(dir, 'templates/meta.md'), '# meta 模板\n')
  writeFileSync(join(dir, 'charters/ceo.md'), '# ceo 默认章程\n')
  writeFileSync(join(dir, 'charters/cmo.md'), '# cmo 默认章程\n')
  writeFileSync(join(dir, 'state/company.md'), '# 公司身份\n')
  writeFileSync(join(dir, 'state/org.md'), '# 组织\n')
  writeFileSync(join(dir, 'state/owners.md'), '# owners\n')
  writeFileSync(join(dir, 'state/motion-ledger.md'), '# 台账\n')
  return dir
}

describe('run bundle v3：planBootstrap', () => {
  it('只计划 .dsh-company/ 内的目录与状态；不计划根 AGENTS.md/kb/templates', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      const plan = planBootstrap(pack, workspace)
      expect(plan.error).toBeUndefined()
      const rels = plan.entries.map(entry => entry.rel)
      expect(rels).toContain('.dsh-company')
      expect(rels).toContain('.dsh-company/kb/company.md')
      expect(rels).toContain('.dsh-company/kb/ceo/CHARTER.md')
      expect(rels).toContain('.dsh-company/kb/cmo/CHARTER.md')
      expect(rels).toContain('.dsh-company/deliverables')
      expect(rels).toContain('.dsh-company/cultivation/records')
      expect(rels).toContain('.dsh-company/README.md')
      expect(rels).not.toContain('AGENTS.md')
      expect(rels).not.toContain('kb/company.md')
      expect(rels).not.toContain('templates/meta.md')
      expect(rels.some(rel => rel.startsWith('templates/'))).toBe(false)
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('content 缺失 ⇒ 带 error 的空计划（不抛）', () => {
    const plan = planBootstrap('/nonexistent/content', '/tmp/whatever-workspace')
    expect(plan.entries).toEqual([])
    expect(plan.error).toContain('content 目录不存在')
  })
})

describe('run bundle v3：applyBootstrap（只补缺 / 绝不覆盖 / 可重入）', () => {
  it('第一次落盘、第二次全 skip；已有状态内容一个字节不改；手册/模板不落盘', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      const first = bootstrapCompanyWorkspace(pack, workspace)
      expect(first.plan.error).toBeUndefined()
      expect(first.result.created).toContain('.dsh-company/kb/company.md')
      expect(first.result.created).toContain('.dsh-company/kb/cmo/CHARTER.md')
      expect(readFileSync(join(workspace, '.dsh-company/kb/cmo/CHARTER.md'), 'utf8')).toBe('# cmo 默认章程\n')
      expect(readFileSync(join(workspace, '.dsh-company/kb/org.md'), 'utf8')).toBe('# 组织\n')
      expect(existsSync(join(workspace, '.dsh-company/deliverables'))).toBe(true)
      expect(existsSync(join(workspace, 'AGENTS.md'))).toBe(false)
      expect(existsSync(join(workspace, 'templates'))).toBe(false)

      writeFileSync(join(workspace, '.dsh-company/kb/owners.md'), '# 我们的人\n')
      const second = bootstrapCompanyWorkspace(pack, workspace)
      expect(second.result.created).toEqual([])
      expect(readFileSync(join(workspace, '.dsh-company/kb/owners.md'), 'utf8')).toBe('# 我们的人\n')
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('部分缺件 ⇒ 只补缺的', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/org.md'), '# 我们的 org\n')
      const { result } = bootstrapCompanyWorkspace(pack, workspace)
      expect(result.created).toContain('.dsh-company/kb/company.md')
      expect(result.skipped).toContain('.dsh-company/kb/org.md')
      expect(readFileSync(join(workspace, '.dsh-company/kb/org.md'), 'utf8')).toBe('# 我们的 org\n')
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('计划带 error 时 apply 是纯 no-op（不建 workspace）', () => {
    const workspace = join(mkdtempSync(join(tmpdir(), 'company-ws-')), 'nested')
    try {
      const plan = planBootstrap('/nonexistent/content', workspace)
      const result = applyBootstrap(plan)
      expect(result.created).toEqual([])
      expect(existsSync(workspace)).toBe(false)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})

describe('content 目录路径算术', () => {
  it('`<pack>/lib/index.js` ⇒ `<pack>/content`（只一层）', () => {
    const strip = (value: string): string => value.replace(/\/+$/, '')
    expect(strip(resolveContentDir('file:///pack/lib/index.js'))).toBe('/pack/content')
    expect(resolveContentDir('file:///pack/lib/index.js')).not.toContain('/content/content')
  })
})

describe('workspace 落点校验', () => {
  it('普通子目录合法；等于/包含 DSH_HOME 或 OS home、普通文件、symlink 到文件都拒绝', () => {
    const root = mkdtempSync(join(tmpdir(), 'company-home-check-'))
    const home = join(root, 'dsh-home')
    const file = join(root, 'not-a-dir')
    try {
      mkdirSync(home, { recursive: true })
      writeFileSync(file, 'x')
      expect(validateCompanyHome(home, join(home, 'company-workspace'))).toEqual({ ok: true })
      expect(validateCompanyHome(home, home).ok).toBe(false)
      expect(validateCompanyHome(home, root).ok).toBe(false)
      expect(validateCompanyHome(home, homedir()).ok).toBe(false)
      expect(validateCompanyHome(home, file).ok).toBe(false)
      const link = join(root, 'file-link')
      symlinkSync(file, link)
      expect(validateCompanyHome(home, link).ok).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('listRunBundleFiles', () => {
  it('只列 run bundle 内文件', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      bootstrapCompanyWorkspace(pack, workspace)
      const files = listRunBundleFiles(workspace)
      expect(files).toContain('.dsh-company/kb/company.md')
      expect(files.every(file => file.startsWith('.dsh-company/'))).toBe(true)
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })
})
