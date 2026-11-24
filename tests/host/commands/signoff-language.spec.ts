// 负例留证 2026-11-24：registerSignoffTool 不接 language ⇒ 本用例红（en 的 note 仍是中文）。BUG-367
/** request_signoff 的语言注入（BUG-367）：描述/参数英文 + execute 回执随语言。 */
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { registerSignoffTool } from '../../../packages/company-pack/src/host/commands/signoff-tool.ts'
import { createCompanyLanguageState } from '../../../packages/company-pack/src/host/language/company-language.ts'

interface ToolDef {
  readonly description: string
  readonly parameters: Record<string, { readonly description?: string }>
  execute(args: unknown, exec: { agent?: unknown; signal: AbortSignal }): Promise<{ decision: string, note: string }>
}

function mount(language: ReturnType<typeof createCompanyLanguageState>): { def: ToolDef, reasons: string[] } {
  let def: ToolDef | undefined
  const reasons: string[] = []
  const ctx = {
    tools: { register: (d: ToolDef) => { def = d; return () => {} } },
    approval: { request: async (req: { reason: string }) => { reasons.push(req.reason); return 'allowed-once' } },
  }
  registerSignoffTool(ctx as unknown as Context, { language })
  return { def: def as ToolDef, reasons }
}

describe('request_signoff 语言注入（BUG-367）', () => {
  it('en：note 与 reason 零中文/全角标点', async () => {
    const { def, reasons } = mount(createCompanyLanguageState('en'))
    const result = await def.execute({ line: 'Margin line', summary: 'discount 22%' }, { agent: {}, signal: new AbortController().signal })
    expect(result.note).not.toMatch(/[\u3400-\u9fff]/u)
    expect(reasons[0]).not.toMatch(/[：（）]/)
    expect(reasons[0]).toContain('Margin line: discount 22%')
  })

  it('zh：回执保持中文', async () => {
    const { def } = mount(createCompanyLanguageState('zh'))
    const result = await def.execute({ line: '毛利线', summary: '折扣 22%' }, { agent: {}, signal: new AbortController().signal })
    expect(result.note).toContain('可按结论落稿')
  })

  it('无 agent：unavailable 回执随语言', async () => {
    const { def } = mount(createCompanyLanguageState('en'))
    const result = await def.execute({ line: 'x', summary: 'y' }, { signal: new AbortController().signal })
    expect(result.decision).toBe('unavailable')
    expect(result.note).not.toMatch(/[\u3400-\u9fff]/u)
  })
})
