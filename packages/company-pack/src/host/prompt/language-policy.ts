/**
 * 公司工作语言 policy（Phase A3）。
 *
 * 为什么不是 persona：`dsh-persona` 的 prefix 在 mount 时静态，不能 live 切；`systemPrompt.section`
 * 的 text 每次 assembly 求值，适合放“这一轮用什么语言工作”。persona 的英文版是 Phase B。
 *
 * 为什么不是 skill：policy 必须每轮可见，不能等模型按需加载；它很短，常驻成本可控。
 * 只给公司 preset（6 角色 + 5 support）注入；standard/其他组合不受影响。
 */
import type { Context } from '@deepseek-ai/cordis'
import { NON_ROLE_PRESETS } from '../../lib/delegation-surface.ts'
import { PRESET_KEYS } from '../../lib/presence-status.ts'
import { composedPresetOf } from './handbook.ts'
import type { CompanyLanguage, CompanyLanguageState } from '../language/company-language.ts'

/** prompt section 名；测试与诊断用。 */
export const LANGUAGE_POLICY_SECTION = 'company:language'

/** 接受公司语言 policy 的 preset：6 角色 + 5 support（worker/quality-loop）。 */
export const COMPANY_POLICY_PRESETS: ReadonlySet<string> = new Set([...PRESET_KEYS, ...NON_ROLE_PRESETS])

/** 当前语言的 policy 文本；纯函数，测试直接断言。 */
export function languagePolicyText(language: CompanyLanguage): string {
  if (language === 'en') {
    return [
      'Company working language: English.',
      '- Default to English for replies, task boards, deliverables, and meeting notes; keep proper nouns, field names, IDs, and code unchanged.',
      '- If the user writes or explicitly asks for another language, follow the user\'s language.',
      '- Handbooks, contracts, templates, and skills may be written in Chinese; execute them as written, and translate human-readable headings and labels into the working language in your output.',
      '- Do not translate machine-readable field names (for example meta.md 产品类型 / 交付模式 / 编号); keep them canonical.',
    ].join('\n')
  }
  return [
    '公司工作语言：简体中文。',
    '- 默认用简体中文回复、写任务板、交付物与会议纪要；专有名词、字段名、ID、代码保持原样。',
    '- 用户明确用另一种语言提问或要求时，跟随用户的语言。',
    '- 手册、合同、模板与 skill 可能是中文；照常执行，产出时把人类可读的标题与标签译成工作语言。',
    '- 机器可读字段名（例如 meta.md 的产品类型 / 交付模式 / 编号）不要翻译，保持 canonical。',
  ].join('\n')
}

interface AgentLike {
  readonly ctx: Context
}

/**
 * 给公司 preset 的每个 agent 注册动态 `company:language` section。
 * @param ctx - Host 上下文。
 * @param language - 语言状态。
 */
export function registerLanguagePolicy(ctx: Context, language: CompanyLanguageState): void {
  const installed = new WeakSet<object>()
  ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => {
    if (installed.has(agent)) return
    installed.add(agent)
    agent.ctx.inject(['systemPrompt'], (scope) => {
      const preset = composedPresetOf(scope) ?? composedPresetOf(agent.ctx)
      if (preset === undefined || !COMPANY_POLICY_PRESETS.has(preset)) return
      scope.systemPrompt.section({
        name: LANGUAGE_POLICY_SECTION,
        order: 1,
        text: () => languagePolicyText(language.current()),
        interpolate: false,
      })
    })
  })
}
