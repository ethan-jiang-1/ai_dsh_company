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

describe('request_signoff 语言切换重注册（BUG-367）', () => {
  it('language.set 触发重新注册，新定义按新语言出回执', async () => {
    const language = createCompanyLanguageState('zh')
    const defs: ToolDef[] = []
    const cleanups: Array<() => void> = []
    const ctx = {
      tools: { register: (d: ToolDef) => { defs.push(d); return () => {} } },
      approval: { request: async () => 'allowed-once' },
      effect: (cb: () => () => void) => { cleanups.push(cb()) },
    }
    registerSignoffTool(ctx as unknown as Context, { language })
    expect(defs).toHaveLength(1)
    language.set('en')
    expect(defs).toHaveLength(2)
    const result = await defs[1]!.execute({ line: 'Margin', summary: '22%' }, { agent: {}, signal: new AbortController().signal })
    expect(result.note).not.toMatch(/[\u3400-\u9fff]/u)
    for (const cleanup of cleanups) cleanup()
  })
})

describe('request_signoff 无语言状态（BUG-367）', () => {
  it('不传 language 时只注册一次，行为沿用 zh 缺省', async () => {
    let def: ToolDef | undefined
    const ctx = { tools: { register: (d: ToolDef) => { def = d; return () => {} } }, approval: { request: async () => 'allowed-once' } }
    registerSignoffTool(ctx as unknown as Context)
    const result = await (def as ToolDef).execute({ line: '毛利线', summary: '折扣 22%' }, { agent: {}, signal: new AbortController().signal })
    expect(result.note).toContain('可按结论落稿')
  })
})

// 负例留证 2026-11-27：registerSignoffTool line 参数 description 恢复中英斜杠混排示例 ⇒ BUG-389 用例红；还原后绿。BUG-389
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

  it('line 参数 schema 不携带中英斜杠混排示例以免模型复读双语拼串（BUG-389）', () => {
    const { def } = mount(createCompanyLanguageState('zh'))
    const props = (def.parameters as { readonly properties?: Record<string, { readonly description?: string }> }).properties
    const lineDesc = props?.line?.description ?? ''
    expect(lineDesc.length).toBeGreaterThan(0)
    expect(lineDesc).not.toMatch(/[\u3400-\u9fff]/u)
    expect(lineDesc).not.toContain(' / ')
  })
})
