/**
 * `/deliverables audit` 解析与注册（2026-11-03 从 src/index 抽出）。
 * 解析分支 + dataBlocked/无账本/成功路径；账本实现本身归 presented-domain-real.spec。
 */
import { describe, expect, it, vi } from 'vitest'
import { parseDeliverablesAudit, registerDeliverablesCommand } from '../../packages/company-pack/src/host/deliverables-command.ts'

function mount(options = {}) {
  let definition
  const ctx = { commands: { register: (def) => { definition = def } } }
  const audit = vi.fn(async () => ({ ledger: { schema: 1, updatedAt: '', paths: {}, slugs: {} }, path: 'p' }))
  const regenerate = vi.fn()
  const exportNow = vi.fn()
  registerDeliverablesCommand(ctx, {
    dataBlocked: false,
    workspace: '/w',
    ledgerStorePromise: Promise.resolve({ kind: 'domain' }),
    exportNow,
    audit,
    regenerate,
    ...options,
  })
  return { definition, audit, regenerate, exportNow }
}

describe('parseDeliverablesAudit', () => {
  it('audit <path> true/false；path 可含空格', () => {
    expect(parseDeliverablesAudit('audit .dsh-company/deliverables/a/final.md true'))
      .toEqual({ ok: true, path: '.dsh-company/deliverables/a/final.md', value: true })
    expect(parseDeliverablesAudit('audit .dsh-company/deliverables/a b/final.md false'))
      .toEqual({ ok: true, path: '.dsh-company/deliverables/a b/final.md', value: false })
  })

  it('缺 audit / 缺 path / 结论非 true|false → 用法错误', () => {
    expect(parseDeliverablesAudit('audit only-path').ok).toBe(false)
    expect(parseDeliverablesAudit('nope path true').ok).toBe(false)
    const bad = parseDeliverablesAudit('audit path maybe')
    expect(bad).toMatchObject({ ok: false })
    if (!bad.ok) expect(bad.text).toContain('只认 true/false')
  })
})

describe('registerDeliverablesCommand', () => {
  it('dataBlocked → 错误，不碰账本', async () => {
    const { definition, audit } = mount({ dataBlocked: true })
    const result = await definition.handler({ rawInput: 'audit x true' })
    expect(result.kind).toBe('error')
    expect(result.text).toContain('公司数据已停写')
    expect(audit).not.toHaveBeenCalled()
  })

  it('无账本 → 错误', async () => {
    const { definition } = mount({ ledgerStorePromise: undefined })
    const result = await definition.handler({ rawInput: 'audit x true' })
    expect(result).toEqual({ kind: 'error', text: 'presented 账本未初始化（无 workspace）。' })
  })

  it('成功 → audit → regenerate → export，回执带账本 kind', async () => {
    const { definition, audit, regenerate, exportNow } = mount()
    const result = await definition.handler({ rawInput: 'audit x true' })
    expect(result.kind).toBe('success')
    expect(result.text).toContain('presented 账本 = domain')
    expect(audit).toHaveBeenCalledWith('/w', { kind: 'domain' }, 'x', true)
    expect(regenerate).toHaveBeenCalled()
    expect(exportNow).toHaveBeenCalled()
  })
})
