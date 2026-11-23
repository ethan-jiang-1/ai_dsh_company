// 负例留证 2026-11-24：把 language 从四条命令注册里去掉 ⇒ 本 spec 红（en 实例的描述/停写回执回到中文）。BUG-338
/**
 * host 命令面的语言合同（BUG-338）：`en` 实例的命令描述/提示/停写回执随 locale，
 * zh 仍是缺省。证明边界 = 注册面与停写分支；真 locale 切换由 `company-language` spec 守。
 */
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { createCompanyLanguageState } from '../../../packages/company-pack/src/host/language/company-language.ts'
import { registerDeliverablesCommand } from '../../../packages/company-pack/src/host/commands/deliverables-command.ts'
import { registerPrdCommand } from '../../../packages/company-pack/src/host/commands/prd-command.ts'
import { registerReqCommand } from '../../../packages/company-pack/src/host/commands/req-command.ts'
import { registerDeliveryCommand } from '../../../packages/company-pack/src/host/commands/delivery-command.ts'
import { registerSettingsCommand } from '../../../packages/company-pack/src/host/commands/settings-command.ts'
import { assertEnglishUiClean } from '../../support/i18n-assertions.ts'

interface Definition {
  readonly name: string
  readonly description: string
  readonly input: { readonly hint: string }
  readonly handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: string, readonly text: string }>
}

const register = (fn: (ctx: Context, options: never) => void, options: Record<string, unknown>): Definition => {
  let definition: Definition | undefined
  const ctx = { commands: { register: (def: Definition) => { definition = def } } }
  fn(ctx as unknown as Context, options as never)
  return definition as Definition
}

// 卡未归档前标题不写事故号（guard-red-record 要求已归档卡），归档 BUG-338 时补回。
describe('host 命令面语言合同', () => {
  it('en：四条操作员命令的描述/提示/停写回执零中文', async () => {
    const language = createCompanyLanguageState('en')
    const definitions = [
      register(registerDeliverablesCommand as never, { dataBlocked: true, workspace: '', language }),
      register(registerPrdCommand as never, { dataBlocked: true, workspace: '', language }),
      register(registerReqCommand as never, { dataBlocked: true, workspace: '', language }),
      register(registerDeliveryCommand as never, { dataBlocked: true, workspace: '', language }),
    ]
    for (const definition of definitions) {
      assertEnglishUiClean(definition.description, `${definition.name} en description`)
      assertEnglishUiClean(definition.input.hint, `${definition.name} en hint`)
      const result = await definition.handler({ rawInput: 'check demo' })
      expect(result.kind).toBe('error')
      assertEnglishUiClean(result.text, `${definition.name} en blocked receipt`)
    }
  })

  it('en：/company-settings 的停写回执与缺 workspace 回执零中文', async () => {
    const language = createCompanyLanguageState('en')
    const definition = register(registerSettingsCommand as never, {
      dataBlocked: true,
      workspace: '',
      contentDir: '/tmp/content',
      language,
      text: (zh: string, en: string) => language.text(zh, en),
    })
    const result = await definition.handler({ rawInput: 'show' })
    expect(result.kind).toBe('error')
    assertEnglishUiClean(result.text, '/company-settings en blocked receipt')
  })
})
