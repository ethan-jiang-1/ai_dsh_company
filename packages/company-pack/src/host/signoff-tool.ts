/**
 * `request_signoff` 工具（驾驶舱②签字线；2026-10-28 R4 自 `src/index.ts` 的 apply 拆出）。
 *
 * 机制（vendor `user-approval`）：`ctx.approval.request()` 一次性审批、轮内有效、无应答者
 * fail-closed；事件对 `approval/asked` + `approval/decided` 进会话日志。浏览器侧由官方
 * `ui-approval` 面板应答（web bundle 已挂），注意力中心观察者（client 半）跨会话显示。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { signoffDecisionNote, signoffReason } from '../lib/signoff.ts'

/** 注册签字工具；无 agent 会话时回 unavailable（不抛错、不发审批）。 */
export function registerSignoffTool(ctx: Context): void {
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
