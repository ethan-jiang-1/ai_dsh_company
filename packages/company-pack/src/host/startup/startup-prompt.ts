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
 *
 * wiki 段分三档（A4）：目录在 workspace 内 → 可写（带 ingest 回写纪律）；在 workspace 外 →
 * 只读（沙箱读得到、写不进）；指针失效 → 明说失效并让人先修，**不输出正常查页指引**
 * （否则模型会去 read 一个不存在的目录，再凭记忆编）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { NON_ROLE_PRESETS } from '../../lib/delegation-surface.ts'
import { overriddenEntries, type StartupSettings, type WikiCheck } from '../../lib/startup-settings.ts'
import { composedPresetOf } from '../prompt/handbook.ts'
import { checkWikiPointer, readStartupSettings } from './startup-store.ts'

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

/** 字段 → 该字段被给定后要压住的「问/猜」行为（wiki 另有分档规则，见 `wikiRule`）。 */
const FIELD_RULE = {
  productType: '本次一律按这份产品类型包执行；动议 meta.md 没写就以它为准——不要再问用户，也不要按习惯猜。',
  deliveryMode: '本次一律按这个交付模式交付；不要再按 SOW/SLA/驻场特征去猜。',
} as const

/**
 * wiki 指针的分档规则（A4）。
 *
 * 三档为什么必须分开：同一个路径，写权限取决于它在不在 workspace 里。含糊成一句
 * 「按 wiki 指引查」会让模型在只读目录上反复尝试写入（失败且浪费轮次），或者在外置盘上
 * 以为自己在维护 wiki。
 * @param check - host 刚算出来的指针检查。
 * @returns 该档的规则句。
 */
export function wikiRule(check: WikiCheck): string {
  if (!check.ok) {
    const why = check.problem === 'missing'
      ? '目录不存在'
      : check.problem === 'not-directory'
        ? '这个路径不是目录'
        : '目录里没有 index.md'
    return `⚠ 这个 wiki 指针已失效（${why}）：**不要**把它当知识来源，也不要凭记忆编；先告诉用户指针失效、问要不要重设。`
  }
  if (check.location === 'inside') {
    return '先读它下面的 index.md 再钻页，不确定就 grep。目录在 workspace 内：可以按 wiki 的维护协议新增/修改页面'
      + '（先写页，再更新 index.md 与 log.md），不要动 raw 来源层。'
  }
  return '先读它下面的 index.md 再钻页，不确定就 grep。目录在 workspace 外、是**只读**知识'
    + '（读得到、写不进）：不要尝试写入，也不要凭记忆编/wiki 之外的内容；需要补页就向用户提议，不自己改。'
}

/**
 * 生成注入正文；全自动（一项未设）返回空串——不占上下文、也不给模型任何约束暗示。
 * @param settings - 当前项目策略。
 * @param wikiCheck - 当前 wiki 指针的检查结果（决定 wiki 段落在哪一档）。
 * @returns 注入文本（可能为空）。
 */
export function startupSettingsText(settings: StartupSettings, wikiCheck: WikiCheck): string {
  const entries = overriddenEntries(settings)
  if (entries.length === 0) return ''
  const lines = [
    '本项目的启动策略（已由人指定，整场沿用；不要重新问、不要按习惯猜）：',
  ]
  for (const [field, value] of entries) {
    const rule = field === 'wiki' ? wikiRule(wikiCheck) : FIELD_RULE[field]
    lines.push(`- ${FIELD_LABEL[field]}：${value}。${rule}`)
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
 * @param workspace - 公司 workspace 根（读 `.dsh-company/startup.json`，并查 wiki 指针）。
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
        // 每次 assembly 重读盘 + 重查指针：改完下一轮生效（与 company:language 同款活读）。
        text: () => {
          const settings = readStartupSettings(workspace)
          return startupSettingsText(settings, checkWikiPointer(workspace, settings.wiki))
        },
        interpolate: false,
      })
    })
  })
}
