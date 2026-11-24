/**
 * 审批闸门纯函数（驾驶舱②切片二）：签字线触线 → 审批请求的映射。
 *
 * 工具面（`src/index.ts` 的 `request_signoff`）消费；keyless 单测 = `tests/lib/accounting/signoff.spec.ts`。
 * 机制语义（vendor `user-approval`）：一次性审批、轮内有效、无应答者 fail-closed；
 * 事件对 `approval/asked` + `approval/decided` 进会话日志（审计），浏览器侧官方 `ui-approval`
 * 面板应答，注意力中心观察者跨会话显示。
 */

/** `request_signoff` 工具的入参（模型侧 schema 同形）。 */
export interface SignoffRequest {
  /** 触的哪条签字线（如「毛利线双签」「折扣线双签」；具体数值见部署 policy）。 */
  readonly line: string
  /** 一句话：具体要人拍什么（带数字）。 */
  readonly summary: string
  /** 可选补充：考虑过的选项与其数字。 */
  readonly detail?: string
}

/** 语言选择（与 `CompanyLanguageState.text` 同签名；缺省 zh 保持旧调用方行为）。 */
type SignoffText = (zh: string, en: string) => string

/** 审批请求的 reason（给应答人看的）：`<签字线>：<摘要>（<补充>）`；空补充忽略。 */
export function signoffReason(request: SignoffRequest, text: SignoffText = zh => zh): string {
  const base = text(`${request.line}：${request.summary}`, `${request.line}: ${request.summary}`)
  return request.detail === undefined || request.detail.trim() === ''
    ? base
    : text(`${base}（${request.detail.trim()}）`, `${base} (${request.detail.trim()})`)
}

/** 审批结果 → 模型侧提示语（工具结果带一句人话，模型据此决定落稿 / 调整 / veto）。 */
export function signoffDecisionNote(decision: string, text: SignoffText = zh => zh): string {
  switch (decision) {
    case 'allowed-once': return text('已批准本次（一次性）——可按结论落稿。', 'Allowed once — you may finalize the conclusion.')
    case 'rejected': return text('被拒绝——按拒绝意见调整结论，或行使 veto。', 'Rejected — adjust the conclusion per the rejection note, or exercise your veto.')
    case 'cancelled': return text('请求被撤回——不要按原结论落稿，等待新指令。', 'The request was withdrawn — do not finalize the original conclusion; wait for new instructions.')
    default: return text('无人应答（fail-closed）——不要按原结论落稿；把该事项写进稿件未决项并告知 CEO。', 'No decision (fail-closed) — do not finalize the original conclusion; record the item as an open question in the deliverable and tell the CEO.')
  }
}
