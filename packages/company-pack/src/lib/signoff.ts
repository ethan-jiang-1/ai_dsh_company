/**
 * 审批闸门纯函数（驾驶舱②切片二）：签字线触线 → 审批请求的映射。
 *
 * 工具面（`src/index.ts` 的 `request_signoff`）消费；keyless 单测 = `tests/company/signoff.spec.ts`。
 * 机制语义（vendor `user-approval`）：一次性审批、轮内有效、无应答者 fail-closed；
 * 事件对 `approval/asked` + `approval/decided` 进会话日志（审计），浏览器侧官方 `ui-approval`
 * 面板应答，注意力中心观察者跨会话显示。
 */

/** `request_signoff` 工具的入参（模型侧 schema 同形）。 */
export interface SignoffRequest {
  /** 触的哪条签字线（如「毛利<30% 双签」「折扣<9折 双签」）。 */
  readonly line: string
  /** 一句话：具体要人拍什么（带数字）。 */
  readonly summary: string
  /** 可选补充：考虑过的选项与其数字。 */
  readonly detail?: string
}

/** 审批请求的 reason（给应答人看的）：`<签字线>：<摘要>（<补充>）`；空补充忽略。 */
export function signoffReason(request: SignoffRequest): string {
  const base = `${request.line}：${request.summary}`
  return request.detail === undefined || request.detail.trim() === ''
    ? base
    : `${base}（${request.detail.trim()}）`
}

/** 审批结果 → 模型侧提示语（工具结果带一句人话，模型据此决定落稿 / 调整 / veto）。 */
export function signoffDecisionNote(decision: string): string {
  switch (decision) {
    case 'allowed-once': return '已批准本次（一次性）——可按结论落稿。'
    case 'rejected': return '被拒绝——按拒绝意见调整结论，或行使 veto。'
    case 'cancelled': return '请求被撤回——不要按原结论落稿，等待新指令。'
    default: return '无人应答（fail-closed）——不要按原结论落稿；把该事项写进稿件未决项并告知 CEO。'
  }
}
