/**
 * 项目启动策略的注入段（host）。
 *
 * 为什么是 `systemPrompt.section` 而不是 skill：策略必须**每轮可见**，不能等模型按需加载；
 * 且 section 的 `text` 是每次 assembly 求值的 provider（vendor `core/system-prompt` 约定），
 * 所以人改完 `.dsh-company/startup.json` 后，**下一轮**就生效，不必重启。
 *
 * 与手册的关系：手册 order 500 讲「没说就问一句 / 按特征猜」；本段 order 501 紧跟其后，
 * 对**已设**字段显式覆盖那句语义，未设字段保持沉默（= 自动 = 不约束）。
 * 跳过集合与手册一致（support preset 不注入）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { NON_ROLE_PRESETS } from '../../lib/delegation-surface.ts'
import { overriddenEntries, type StartupSettings } from '../../lib/startup-settings.ts'
import { composedPresetOf } from '../prompt/handbook.ts'
import { readStartupSettings } from './startup-store.ts'

/** section 名（测试与诊断用）。 */
export const STARTUP_SETTINGS_SECTION = 'company:startup-settings'

/** section 顺序：紧跟手册（500）之后。 */
export const STARTUP_SETTINGS_ORDER = 501

/** 字段 → 给模型的人话标签。 */
const FIELD_LABEL = {
  productType: '产品类型',
  deliveryMode: '交付模式',
  wiki: '参考资料 wiki',
} as const

/** 字段 → 该字段被给定后要压住的「问/猜」行为。 */
const FIELD_RULE = {
  productType: '本次一律按这份产品类型包执行；动议 meta.md 没写就以它为准——不要再问用户，也不要按习惯猜。',
  deliveryMode: '本次一律按这个交付模式交付；不要再按 SOW/SLA/驻场特征去猜。',
  wiki: '本次先读它下面的 index.md 再钻页，不确定就 grep；目录可能是 workspace 外的只读知识（读得到、写不进），不要尝试写入，也不要凭记忆编/wiki 之外的内容。',
} as const

/**
 * 生成注入正文；全自动（一项未设）返回空串——不占上下文、也不给模型任何约束暗示。
 * @param settings - 当前项目策略。
 * @returns 注入文本（可能为空）。
 */
export function startupSettingsText(settings: StartupSettings): string {
  const entries = overriddenEntries(settings)
  if (entries.length === 0) return ''
  const lines = [
    '本项目的启动策略（已由人指定，整场沿用；不要重新问、不要按习惯猜）：',
  ]
  for (const [field, value] of entries) {
    lines.push(`- ${FIELD_LABEL[field]}：${value}。${FIELD_RULE[field]}`)
  }
  lines.push('以上是启动绑定；只有用户明确改口，才按新说法。')
  return lines.join('\n')
}

interface AgentLike {
  readonly ctx: Context
}

/**
 * 给公司角色的每个 agent 注册活读 section。
 * @param ctx - Host 上下文。
 * @param workspace - 公司 workspace 根（读 `.dsh-company/startup.json`）。
 */
export function registerStartupSettings(ctx: Context, workspace: string): void {
  const installed = new WeakSet<object>()
  ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => {
    if (installed.has(agent)) return
    installed.add(agent)
    agent.ctx.inject(['systemPrompt'], (scope) => {
      const preset = composedPresetOf(scope) ?? composedPresetOf(agent.ctx)
      if (preset !== undefined && (NON_ROLE_PRESETS as readonly string[]).includes(preset)) return
      scope.systemPrompt.section({
        name: STARTUP_SETTINGS_SECTION,
        order: STARTUP_SETTINGS_ORDER,
        // 每次 assembly 重读盘：改完下一轮生效（与 company:language 同款活读）。
        text: () => startupSettingsText(readStartupSettings(workspace)),
        interpolate: false,
      })
    })
  })
}
