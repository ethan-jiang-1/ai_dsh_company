/**
 * run bundle 初始化 v3 的 keyless 完成定义（2026-11-01）。
 *
 * 判据：
 * ① 只建 `<workspace>/.dsh-company/`，不写根目录 `AGENTS.md`/`COMPANY.md`/`kb/`/`templates/`；
 * ② 状态实例（company/org/owners/ledger/charter）只补缺；
 * ③ 手册/模板不进 run bundle（只读内容住 pack `content/`）；
 * ④ 可重入：第二次全 skip，已有文件字节不变；
 * ⑤ content 缺失/落点不安全时不抛，返回可诊断错误；
 * ⑥ 类型相关 seed（`{productType}`）按运行盘 company.md 的 productType 解析；缺/未知不猜
 *    （跳过该条 + warning，其余 seed 照常）。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCompanyFixture } from '../../support/company-fixture.ts'
import {
  applyBootstrap,
  bootstrapCompanyWorkspace,
  listRunBundleFiles,
  planBootstrap,
  resolveContentDir,
  validateCompanyHome,
} from '../../../packages/company-pack/src/host/run-bundle/bootstrap.ts'

/** 最小 pack content：手册 + 模板 + 默认章程 + 状态默认值。 */
function content(): string {
  const dir = mkdtempSync(join(tmpdir(), 'company-content-'))
  mkdirSync(join(dir, 'templates'), { recursive: true })
  mkdirSync(join(dir, 'charters'), { recursive: true })
  mkdirSync(join(dir, 'state'), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 公司手册\n')
  writeFileSync(join(dir, 'templates/meta.md'), '# meta 模板\n')
  const roles = ['ceo', 'cfo', 'coo', 'cmo', 'vp-eng', 'vp-sales']
  for (const role of roles) writeFileSync(join(dir, `charters/${role}.md`), `# ${role} 默认章程\n`)
  writeFileSync(join(dir, 'state/company.md'), '---\nproductType: business-software\n---\n# 公司身份\n')
  writeFileSync(join(dir, 'state/org.md'), '# 组织\n')
  writeFileSync(join(dir, 'state/owners.md'), '# owners\n')
  writeFileSync(join(dir, 'state/motion-ledger.md'), '# 台账\n')
  mkdirSync(join(dir, 'company'), { recursive: true })
  const margin = loadCompanyFixture('acme-hardware-software').policy['毛利底线'] ?? '样例'
  writeFileSync(join(dir, 'company/policy-lines.md'), `# 政策线\n\n- 毛利底线: ${margin}\n`)
  writeFileSync(join(dir, 'company/review-protocol.md'), '# 复核协议\n')
  for (const [id, text] of Object.entries({ 'hardware-software': '# 五层合同\n', 'business-software': '# 三层合同\n' })) {
    mkdirSync(join(dir, 'product-types', id), { recursive: true })
    writeFileSync(join(dir, 'product-types', id, 'requirements-model.md'), text)
  }
  mkdirSync(join(dir, 'kb-setup'), { recursive: true })
  writeFileSync(join(dir, 'kb-setup/guide.md'), '# kb 地图\n')
  writeFileSync(join(dir, 'kb-setup/run-bundle.md'), '# run bundle\n')
  const seeds = [
    ...roles.map(role => ({ source: `charters/${role}.md`, target: `.dsh-company/kb/${role}/CHARTER.md` })),
    { source: 'state/company.md', target: '.dsh-company/kb/company.md' },
    { source: 'state/org.md', target: '.dsh-company/kb/org.md' },
    { source: 'state/owners.md', target: '.dsh-company/kb/owners.md' },
    { source: 'state/motion-ledger.md', target: '.dsh-company/kb/motion-ledger.md' },
    { source: 'company/policy-lines.md', target: '.dsh-company/kb/policy-lines.md' },
    { source: 'company/review-protocol.md', target: '.dsh-company/kb/review-protocol.md' },
    { source: 'product-types/{productType}/requirements-model.md', target: '.dsh-company/kb/process-docs.md' },
    { source: 'kb-setup/guide.md', target: '.dsh-company/kb/AGENTS.md' },
    { source: 'kb-setup/run-bundle.md', target: '.dsh-company/README.md' },
  ]
  writeFileSync(join(dir, 'kb-setup/seed.json'), JSON.stringify({ seeds }))
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
      expect(rels, 'fresh 盘要 seed 编号合同（A7）').toContain('.dsh-company/kb/process-docs.md')
      expect(rels, 'fresh 盘要 seed 政策线（唯一事实家）').toContain('.dsh-company/kb/policy-lines.md')
      expect(rels, 'fresh 盘要 seed 复核协议').toContain('.dsh-company/kb/review-protocol.md')
      expect(rels, 'kb 地图要 seed 成 AGENTS.md（碰 kb 后自动加载）').toContain('.dsh-company/kb/AGENTS.md')
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

  it('seed 清单缺源 ⇒ 带 error 的空计划（fail-loud，不静默跳过）', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      rmSync(join(pack, 'state/owners.md'))
      const plan = planBootstrap(pack, workspace)
      expect(plan.entries).toEqual([])
      expect(plan.error).toContain('kb 装配缺源')
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
      expect(first.result.created, 'fresh 盘 seed 编号合同').toContain('.dsh-company/kb/process-docs.md')
      expect(readFileSync(join(workspace, '.dsh-company/kb/process-docs.md'), 'utf8')).toBe('# 三层合同\n')
      expect(first.result.created).toContain('.dsh-company/kb/cmo/CHARTER.md')
      expect(readFileSync(join(workspace, '.dsh-company/kb/cmo/CHARTER.md'), 'utf8')).toBe('# cmo 默认章程\n')
      expect(readFileSync(join(workspace, '.dsh-company/kb/org.md'), 'utf8')).toBe('# 组织\n')
      expect(existsSync(join(workspace, '.dsh-company/deliverables'))).toBe(true)
      expect(existsSync(join(workspace, 'AGENTS.md'))).toBe(false)
      expect(existsSync(join(workspace, 'templates'))).toBe(false)

      writeFileSync(join(workspace, '.dsh-company/kb/owners.md'), '# 我们的人\n')
      writeFileSync(join(workspace, '.dsh-company/kb/process-docs.md'), '# 我们迁移过的合同\n')
      const second = bootstrapCompanyWorkspace(pack, workspace)
      expect(second.result.created).toEqual([])
      expect(readFileSync(join(workspace, '.dsh-company/kb/owners.md'), 'utf8')).toBe('# 我们的人\n')
      expect(readFileSync(join(workspace, '.dsh-company/kb/process-docs.md'), 'utf8'), '既有合同不得被覆盖').toBe('# 我们迁移过的合同\n')
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
      expect(result.created, '既有盘升级：缺的新角色章程要补种').toContain('.dsh-company/kb/cmo/CHARTER.md')
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

describe('类型相关播种：按 company.md 的 productType 选合同', () => {
  it('workspace 的 company.md 指定 hardware-software ⇒ 五层合同', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: "hardware-software" # 默认\n---\n')
      const { plan, result } = bootstrapCompanyWorkspace(pack, workspace)
      expect(plan.error).toBeUndefined()
      const entry = plan.entries.find(item => item.rel === '.dsh-company/kb/process-docs.md')
      expect(entry?.sourceRel, '播种源要随类型解析').toBe('product-types/hardware-software/requirements-model.md')
      expect(result.created).toContain('.dsh-company/kb/process-docs.md')
      expect(readFileSync(join(workspace, '.dsh-company/kb/process-docs.md'), 'utf8')).toBe('# 五层合同\n')
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('company.md 缺 productType ⇒ 不播 process-docs，warning 点名缺什么，其余照常', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '# 公司身份（没写类型）\n')
      const { plan, result } = bootstrapCompanyWorkspace(pack, workspace)
      expect(plan.entries.some(entry => entry.rel === '.dsh-company/kb/process-docs.md')).toBe(false)
      expect(plan.warnings.join('\n')).toContain('productType')
      expect(existsSync(join(workspace, '.dsh-company/kb/process-docs.md'))).toBe(false)
      expect(result.skipped).toContain('.dsh-company/kb/company.md')
      expect(result.created, '其余 seed 不能被一个坏类型连坐').toContain('.dsh-company/kb/org.md')
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('未知 productType ⇒ 不播 process-docs，warning 点名类型', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: mystery\n---\n')
      const { plan } = bootstrapCompanyWorkspace(pack, workspace)
      expect(plan.entries.some(entry => entry.rel === '.dsh-company/kb/process-docs.md')).toBe(false)
      expect(plan.warnings.join('\n')).toContain('mystery')
      expect(existsSync(join(workspace, '.dsh-company/kb/process-docs.md'))).toBe(false)
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
    }
  })

  it('既有 process-docs 不被覆盖（only-fill）', () => {
    const pack = content()
    const workspace = mkdtempSync(join(tmpdir(), 'company-ws-'))
    try {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb/company.md'), '---\nproductType: hardware-software\n---\n')
      writeFileSync(join(workspace, '.dsh-company/kb/process-docs.md'), '# 用户迁移过的三层合同\n')
      const { result } = bootstrapCompanyWorkspace(pack, workspace)
      expect(result.skipped).toContain('.dsh-company/kb/process-docs.md')
      expect(readFileSync(join(workspace, '.dsh-company/kb/process-docs.md'), 'utf8')).toBe('# 用户迁移过的三层合同\n')
    } finally {
      rmSync(pack, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true })
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
