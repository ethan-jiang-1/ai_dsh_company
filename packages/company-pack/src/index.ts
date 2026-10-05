/** Host half of the company pack: signoff tool (驾驶舱②) + presence read-model re-export.
 * The browser half lives in `./client`. */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
// 纯类型导入：只需要 `ctx.approval` 的 Context 类型增强（服务本体由 web profile 挂载）。
// ⚠ 不做值导入——那会把 host 侧核心包的类型图拉进本程序，遮掉 client 面的 sessions 增强（实测）。
import type {} from '@deepseek-ai/dsh-user-approval'
import { signoffDecisionNote, signoffReason } from './lib/signoff.ts'

/**
 * 在场板读模型（R5b）从 host 入口再导出：`scripts/smoke/replay-smoke.mjs` 用它把重放会话的
 * team 事件折成在场板做判据 4 断言；纯函数、零依赖，不影响 host 挂载面。
 */
export * from './lib/presence.ts'

/** Host half now registers a tool: needs the tool registry and the approval service. */
export const inject = ['tools', 'approval']

/**
 * Host plugin body：注册 `request_signoff` 工具——公司签字线（双签 / 会签）的机制停点。
 *
 * 机制（vendor `user-approval`）：`ctx.approval.request()` 一次性审批、轮内有效、无应答者
 * fail-closed；事件对 `approval/asked` + `approval/decided` 进会话日志。浏览器侧由官方
 * `ui-approval` 面板应答（web bundle 已挂），我们的注意力中心观察者（client 半）跨会话显示。
 * 挂载面 = 既有 `company-client` 行（bundle 级）⇒ 全部会话与 teammate 可见——r2-motion 实证
 * teammate 可见全局工具行（20 工具清单里有 fs / present / ask_user_question）。
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'request_signoff',
    description: 'Request human sign-off for a company sign-line (双签 / 会签线). '
      + 'Call this BEFORE finalizing any conclusion that crosses a sign line — for example a proposal with margin below 30% or a discount below 9折. '
      + 'The turn pauses until the human decides; proceed with the conclusion only when the decision is allowed-once.',
    parameters: {
      line: {
        type: 'string',
        required: true,
        description: 'Which sign line this hits, e.g. "毛利<30% 双签" or "折扣<9折 双签".',
      },
      summary: {
        type: 'string',
        required: true,
        description: 'One sentence of what needs the human decision, numbers included.',
      },
      detail: {
        type: 'string',
        description: 'Optional supporting context: options considered and their numbers.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string', required: true },
          note: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      // approval.request() 读取 agent.session（轮内审计配对），无发起会话时不请求。
      if (exec.agent === undefined) {
        return { decision: 'unavailable', note: '审批请求需要发起会话（agent）上下文。' }
      }
      const decision = await ctx.approval.request({
        agent: exec.agent,
        toolName: 'request_signoff',
        ...(exec.callId !== undefined ? { callId: exec.callId } : {}),
        reason: signoffReason(args),
        signal: exec.signal,
      })
      return { decision, note: signoffDecisionNote(decision) }
    },
  }))
}
