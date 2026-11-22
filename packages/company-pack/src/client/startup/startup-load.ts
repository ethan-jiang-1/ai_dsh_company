/**
 * 启动策略一次读盘的**折算**（纯函数）：把两个读取结果态折成 `StartupFace`。
 *
 * 为什么单独成函数：这段折算原本内联在 `client/index.ts` 的注入闭包里，那条闭包在单测中不执行，
 * 于是「读坏了会不会说」从来没被判据覆盖过——BUG-297 正是坏 JSON 被折成「合法 auto」。
 * 搬到纯函数后：每种读取结果都有断言，composition 只留一行 `startupStore.set(...)`。
 */
import type { WorkspaceTextRead } from '../cultivation/cultivation-data.ts'
import { parseStartupOptionsState, parseStartupSettingsState } from '../../lib/startup/startup-settings.ts'
import type { StartupFace } from './startup-store.ts'

/**
 * 由两份读取结果构造一次 `StartupFace`。
 *
 * 状态语义（BUG-297 的判据）：
 * - **文件缺失/空**（`ok:true` 且正文空）= 合法的「全自动」，`problem` 为 null，不报错；
 * - **读不到**（`ok:false`）= `'unreadable'`，面板必须说读不到，不冒充 auto；
 * - **坏 JSON / 未来 schema** = `'corrupt' | 'unsupported'`，由诊断解析器给出。
 * @param settings - `startup.json` 的读取结果。
 * @param options - `startup-options.json` 的读取结果。
 * @returns 可直接写入共享仓的面。
 */
export function startupFaceFrom(settings: WorkspaceTextRead, options: WorkspaceTextRead): StartupFace {
  const settingsState = settings.ok ? parseStartupSettingsState(settings.text) : { settings: undefined, problem: 'unreadable' as const }
  // 选项文件：读不到与「解析失败/被截断」同样是不可用——不能折成「没有可选项」（BUG-085）。
  const optionsState = options.ok
    ? parseStartupOptionsState(options.text)
    : { options: parseStartupOptionsState(null).options, problem: 'unreadable' as const }
  const settingsProblem = settingsState.problem
  const face: StartupFace = {
    loaded: true,
    settings: settingsState.settings ?? parseStartupSettingsState(null).settings,
    options: optionsState.options,
    // 选项文件坏/被截断必须说出来（BUG-085 的既有语义，保持）。
    optionsProblem: optionsState.problem,
  }
  return settingsProblem === null ? face : { ...face, settingsProblem }
}
