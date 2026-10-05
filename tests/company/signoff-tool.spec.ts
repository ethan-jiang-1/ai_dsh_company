/**
 * host 半 request_signoff 行为 spec（测试宪法 §2「pack 导出/注册面」行；插件证据阶梯台阶二）。
 *
 * 台阶分工：导出形态守卫（pack-exports.spec）钉台阶一；本文件钉台阶二——**真插件体**
 * （`apply` 经 `defineTool` 注册的 registry-ready 定义）+ **只 stand-in 审批边界**（ctx.approval）；
 * 真挂载由 preset-smoke 兜（台阶四）；人回路证据在 attention/human-loop 录制（台阶五）。
 * 纯函数映射（signoffReason/Note）已有 signoff.spec——这里测的是 execute 分支与参数透传线。
 *
 * defineTool 包装层先做 schema 校验再进 userExecute（vendor core/tools schema.ts），
 * 所以"缺必填参数"分支也走真校验，不抄 schema 形状。
 */
import { describe, expect, it } from 'vitest'
import { apply } from '../../packages/company-pack/src/index.ts'
import { signoffDecisionNote, signoffReason } from '../../packages/company-pack/src/lib/signoff.ts'

/** 只实现 apply/execute 用到的两个面；其余 cast 掉——stand-in 的是 ctx 壳，不是被测逻辑。 */
function harness(approve: 'allowed-once' | 'denied') {
  let captured: {
    name: string
    execute(args: unknown, exec: { agent?: unknown; callId?: string; signal: AbortSignal }): Promise<{
      decision: string
      note: string
    }>
  } | undefined
  const requests: Array<Record<string, unknown>> = []
  const ctx = {
    tools: { register: (def: never) => { captured = def as NonNullable<typeof captured> } },
    approval: {
      request: async (req: Record<string, unknown>) => {
        requests.push(req)
        return approve
      },
    },
  }
  apply(ctx as unknown as Parameters<typeof apply>[0])
  if (captured === undefined) throw new Error('apply 没有注册任何工具')
  return { captured, requests, signal: new AbortController().signal }
}

const ARGS = { line: '毛利<30% 双签', summary: '报价低于签字线，需要人工决定。' } as const

describe('request_signoff · execute 行为（真 defineTool 包装 + stub 审批边界）', () => {
  it('注册面：工具名与必填参数经真 schema 校验（缺 line 即拒，不进审批）', async () => {
    const { captured } = harness('allowed-once')
    expect(captured.name).toBe('request_signoff')
    await expect(captured.execute({ summary: '缺签字线' }, { agent: {}, signal: new AbortController().signal }))
      .rejects.toThrow()
  })

  it('fail-closed：无发起会话（agent 缺席）→ unavailable，且不触达审批边界', async () => {
    const { captured, requests } = harness('allowed-once')
    const result = await captured.execute(ARGS, { signal: new AbortController().signal })
    expect(result.decision).toBe('unavailable')
    expect(result.note).toContain('会话')
    expect(requests, '无 agent 时不许发审批请求').toEqual([])
  })

  it('透传线：reason 按判据单一来源映射，decision 原样返回、note 走同一映射', async () => {
    const { captured, requests, signal } = harness('allowed-once')
    const result = await captured.execute(ARGS, { agent: {}, callId: 'call-1', signal })
    expect(result).toEqual({
      decision: 'allowed-once',
      note: signoffDecisionNote('allowed-once'),
    })
    expect(requests).toHaveLength(1)
    expect(requests[0]!.toolName).toBe('request_signoff')
    expect(requests[0]!.reason).toBe(signoffReason(ARGS))
    expect(requests[0]!.agent).toEqual({})
    expect(requests[0]!.callId).toBe('call-1')
    expect(requests[0]!.signal).toBe(signal)
  })

  it('callId 缺省时请求里不带 callId 键（可选参数不撒谎）', async () => {
    const { captured, requests } = harness('denied')
    await captured.execute(ARGS, { agent: {}, signal: new AbortController().signal })
    expect('callId' in requests[0]!).toBe(false)
    expect(requests[0]!.toolName).toBe('request_signoff')
  })
})
