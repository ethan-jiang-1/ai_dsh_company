/**
 * 命令注册的「语言切换即重注册」薄封装（BUG-338）。
 *
 * vendor 的命令 description/hint 是注册时字符串、不支持 per-locale provider；切语言只能
 * dispose + 重新 register（BUG-083 起的既有手法）。四处命令同款 ⇒ 收成一份，避免复制。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { CompanyLanguageState } from '../language/company-language.ts'

/** vendor `commands.register` 的入参类型（避免为一个签名引整个包）。 */
export type CommandDefinition = Parameters<Context['commands']['register']>[0]

/**
 * 注册命令；给了语言状态时订阅切换并重注册，卸载时退订并释放最后一次注册。
 * @param ctx - host 上下文。
 * @param definition - 按当前语言构造定义。
 * @param language - 公司语言状态（可选；缺省只注册一次）。
 */
export function registerLocalizedCommand(
  ctx: Context,
  definition: () => CommandDefinition,
  language: Pick<CompanyLanguageState, 'subscribe'> | undefined,
): void {
  let dispose = ctx.commands.register(definition())
  if (language === undefined) return
  const unsubscribe = language.subscribe(() => { dispose(); dispose = ctx.commands.register(definition()) })
  const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
  if (typeof effect === 'function') effect.call(ctx, () => () => { unsubscribe(); dispose() })
}
