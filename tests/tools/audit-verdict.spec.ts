import { describe, expect, it } from 'vitest'
import { parseAuditVerdict } from '../../tools/lib/audit-verdict.mjs'

// 2026-10-23（架构评审候选 4）：审计档的机器判词此前是「人类报告 + 一行 JSON」，而两个消费者
// 各用各的方式刮：converge 用正则扫人读行、index 找 `JSON:` 前缀。判词结构化后只有一份解析器。
describe('audit verdict parser', () => {
  it('取最后一行 `JSON:` 前缀之后的对象', () => {
    const out = [
      'deliverables-check: company-workspace',
      '  违规 1 条：',
      'JSON:{"assessed":true,"violations":[{"code":"missing-present","path":"deliverables/x/final.md","detail":"缺 present"}],"warnings":[]}',
    ].join('\n')
    expect(parseAuditVerdict(out)).toEqual({
      assessed: true,
      violations: [{ code: 'missing-present', path: 'deliverables/x/final.md', detail: '缺 present' }],
      warnings: [],
    })
  })

  it('没有该行 / 坏 JSON ⇒ null（调用方 fail-closed，不猜）', () => {
    expect(parseAuditVerdict('只有人读报告\n没有机器行')).toBeNull()
    expect(parseAuditVerdict('JSON:{oops')).toBeNull()
  })

  it('无法判定（assessed:false）也能解析出来，由调用方按 exit code 处理', () => {
    expect(parseAuditVerdict('JSON:{"assessed":false,"reason":"workspace-missing"}')).toEqual({ assessed: false, reason: 'workspace-missing' })
  })
})
