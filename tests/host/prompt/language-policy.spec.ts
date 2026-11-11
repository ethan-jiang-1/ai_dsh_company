/**
 * 公司工作语言 policy（Phase A3）：公司 preset 才注入；文本随语言状态切换。
 */
import { describe, expect, it } from 'vitest'
import {
  createCompanyLanguageState,
} from '../../../packages/company-pack/src/host/language/company-language.ts'
import {
  LANGUAGE_POLICY_SECTION, languagePolicyText, registerLanguagePolicy,
} from '../../../packages/company-pack/src/host/prompt/language-policy.ts'

function sectionsFor(preset: string, state = createCompanyLanguageState('zh')) {
  const sections: Array<{ name: string; text: () => string }> = []
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const ctx = {
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  }
  const agentCtx = {
    get: (name: string) => name === 'agentPresets' ? { composedPreset: () => preset } : undefined,
    inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
      callback({
        get: (name: string) => name === 'agentPresets' ? { composedPreset: () => preset } : undefined,
        systemPrompt: {
          section: (section: { name: string; text: () => string }) => {
            sections.push(section)
            return () => {}
          },
        },
      })
      return { dispose: async () => {} }
    },
  }
  const agent = { ctx: agentCtx }
  registerLanguagePolicy(ctx as never, state)
  for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  return sections
}

describe('languagePolicyText', () => {
  it('zh/en 都说清「默认 + 跟随用户 + 字段名不译」', () => {
    expect(languagePolicyText('zh')).toContain('简体中文')
    expect(languagePolicyText('zh')).toContain('跟随用户')
    expect(languagePolicyText('zh')).toContain('产品类型')
    expect(languagePolicyText('en')).toContain('English')
    expect(languagePolicyText('en')).toContain('follow the user')
    expect(languagePolicyText('en')).toContain('产品类型')
  })
})

describe('registerLanguagePolicy', () => {
  it('公司角色与 support preset 注入；standard 不注入', () => {
    for (const preset of ['ceo', 'vp-eng', 'worker', 'quality-loop-verifier']) {
      expect(sectionsFor(preset), preset).toHaveLength(1)
    }
    expect(sectionsFor('standard')).toHaveLength(0)
  })

  it('section 文本随语言状态 live 切换', () => {
    const state = createCompanyLanguageState('zh')
    const sections = sectionsFor('ceo', state)
    expect(sections[0]?.name).toBe(LANGUAGE_POLICY_SECTION)
    expect(sections[0]?.text()).toContain('简体中文')
    state.set('en')
    expect(sections[0]?.text()).toContain('Company working language: English')
  })
})
