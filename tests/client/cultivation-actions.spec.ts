/**
 * 培养人侧动作面的 keyless 判据（S1）：命令线构造 + host 结果折算 + 文案表。
 *
 * 为什么单独立一条：面板按钮与创作表单**只经由这一个模块发命令**——线构造错了，真机上就是
 * 「点了没反应 / 命令没解析」；host 的错误文本丢掉了，人就得回会话里翻原因（UX 卡第一号风险）。
 * 真机制（命令执行、方法层落盘）在真机档：`probes/browser-visual/cultivation-gui-probe.mjs`。
 * 红证（先红后绿）：本 spec 在模块存在前 import 即红（见毕业 Note 的验证节）。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { describe, expect, it } from 'vitest'
import {
  CULTIVATION_CHANGED_EVENT,
  CULTIVATION_COPY,
  adoptLine,
  correctLine,
  makeCultivationActions,
  rejectLine,
  revokeLine,
  suggestLine,
  verifyLine,
  type CommandsRemoteFace,
} from '../../packages/company-pack/src/client/cultivation-actions.ts'

const SESSION = 'session-1' as SessionId

/** 一个记录 host 网络边界的桩面（默认可控返回）。 */
function stubFace(
  answer: Awaited<ReturnType<CommandsRemoteFace['execute']>> | (() => Promise<never>),
): { readonly face: CommandsRemoteFace, readonly calls: Array<{ sessionId: SessionId, line: string, attachments: readonly unknown[] }> } {
  const calls: Array<{ sessionId: SessionId, line: string, attachments: readonly unknown[] }> = []
  return {
    calls,
    face: {
      execute: async (sessionId, line, submittedAttachments) => {
        calls.push({ sessionId, line, attachments: submittedAttachments })
        if (typeof answer === 'function') return answer()
        return answer
      },
    },
  }
}

const actionsOf = (face: CommandsRemoteFace | undefined) => makeCultivationActions(face, SESSION)

describe('命令线构造：host 发下来的 id/slug 直接用，自由文本才校验', () => {
  it('采纳 / 验证 / 撤回：线与 host 子命令逐字一致', () => {
    expect(adoptLine('20261017-120000-abcd')).toBe('/cultivation adopt 20261017-120000-abcd')
    expect(verifyLine('20261017-120000-abcd', 'pass')).toBe('/cultivation verify 20261017-120000-abcd pass')
    expect(verifyLine('20261017-120000-abcd', 'fail')).toBe('/cultivation verify 20261017-120000-abcd fail')
    expect(revokeLine('method-20261017-120000-abcd')).toBe('/cultivation revoke method-20261017-120000-abcd')
  })

  it('拒绝：理由压成一行（host 只取首行），空理由被拒', () => {
    const line = rejectLine('r-1', '口径不符\n（KB 已有：vp-sales/CHARTER）')
    expect(line).toEqual({ ok: true, line: '/cultivation reject r-1 :: 口径不符 （KB 已有：vp-sales/CHARTER）' })
    expect(rejectLine('r-1', '   \n  ')).toEqual({
      ok: false,
      problem: { field: 'reason', message: CULTIVATION_COPY.problemReason },
    })
  })

  it('纠正：期望句不得含 `::`（host 按第一个 `::` 切分），正文多行与 `::` 原样保真', () => {
    const draft = correctLine('收口前逐项列出未决项', '做法：先列未决清单。\n证据：deliverables/x/final.md（口径 A :: 口径 B）')
    expect(draft).toEqual({
      ok: true,
      line: '/cultivation correct 收口前逐项列出未决项 :: 做法：先列未决清单。\n证据：deliverables/x/final.md（口径 A :: 口径 B）',
    })
    expect(correctLine('含 :: 的期望句', '正文')).toEqual({
      ok: false,
      problem: { field: 'expectation', message: CULTIVATION_COPY.problemExpectationSeparator },
    })
    expect(correctLine('   ', '正文')).toEqual({
      ok: false,
      problem: { field: 'expectation', message: CULTIVATION_COPY.problemExpectationEmpty },
    })
    expect(correctLine('期望句', '  \n ')).toEqual({
      ok: false,
      problem: { field: 'body', message: CULTIVATION_COPY.problemBodyEmpty },
    })
  })

  it('建议：目标角色须在名册，且不得指向自己的角色（给自己的用「留一条方法」）', () => {
    const draft = suggestLine('cfo', '测算结论先列假设口径', '做法：单列固定成本与边际成本。', 'ceo')
    expect(draft).toEqual({
      ok: true,
      line: '/cultivation suggest cfo 测算结论先列假设口径 :: 做法：单列固定成本与边际成本。',
    })
    expect(suggestLine('cto', '期望句', '正文', 'ceo')).toEqual({
      ok: false,
      problem: { field: 'role', message: CULTIVATION_COPY.problemRoleUnknown },
    })
    expect(suggestLine('ceo', '期望句', '正文', 'ceo')).toEqual({
      ok: false,
      problem: { field: 'role', message: CULTIVATION_COPY.problemRoleSelf },
    })
  })
})

describe('结果折算：host 原话必须到人眼前，命令面缺席要明说', () => {
  it('成功：把 host 回执原样交给面板', async () => {
    const { face, calls } = stubFace({
      ok: true,
      value: { result: { kind: 'success', text: '已采纳 r-1：方法 method-r-1 部署到 CFO 方法层。' } },
    })
    await expect(actionsOf(face).run('/cultivation adopt r-1')).resolves.toEqual({
      ok: true,
      text: '已采纳 r-1：方法 method-r-1 部署到 CFO 方法层。',
    })
    expect(calls).toEqual([{ sessionId: SESSION, line: '/cultivation adopt r-1', attachments: [] }])
  })

  it('失败：host 的 error 文本（如仅建议权）原样上行，不吞成"没反应"', async () => {
    const { face } = stubFace({
      ok: true,
      value: { result: { kind: 'error', text: '仅建议权：r-1 的培养对象是 CFO，请在 CFO 的会话里采纳。' } },
    })
    await expect(actionsOf(face).run('/cultivation adopt r-1')).resolves.toEqual({
      ok: false,
      text: '仅建议权：r-1 的培养对象是 CFO，请在 CFO 的会话里采纳。',
    })
  })

  it('命令名不在命令面（value === undefined）：给出改走命令行的明说', async () => {
    const { face } = stubFace({ ok: true, value: undefined })
    await expect(actionsOf(face).run('/cultivation adopt r-1')).resolves.toEqual({
      ok: false,
      text: CULTIVATION_COPY.unmatched,
    })
  })

  it('远程错误分支与抛错：都折成可读文案（含错误码/原因）', async () => {
    const failed = stubFace({ ok: false, error: { code: 'gateway/internal', message: 'socket closed' } })
    await expect(actionsOf(failed.face).run('/cultivation adopt r-1')).resolves.toEqual({
      ok: false,
      text: CULTIVATION_COPY.remoteFailed('gateway/internal', 'socket closed'),
    })
    const thrown = stubFace(async () => { throw new Error('connection reset') })
    await expect(actionsOf(thrown.face).run('/cultivation adopt r-1')).resolves.toEqual({
      ok: false,
      text: CULTIVATION_COPY.unreachable('Error: connection reset'),
    })
  })

  // 负例留证 2026-10-18（事故卡见 _backlog/bugs/「失败后按钮卡处理中」，调查中）：修前动作面没有超时，桩 `execute: () => new Promise(() => {})`（不回话）
  //   会让本用例**挂住直到 vitest 超时**（实测 30s 红）；补 `Promise.race` 截止边后绿。
  //   注意：只 `controller.abort()` 不够——桩无视 signal 照样挂住（这也是真机那条路径的写照）。
  it('期望句含命令分隔符 `::` ⇒ 拦下并说清（host 按第一个 `::` 切，客户端是唯一防线）', () => {
    const draft = correctLine('先查 :: 再改', '正文')
    expect(draft.ok).toBe(false)
    expect(draft.ok ? '' : draft.problem.message).toBe(CULTIVATION_COPY.problemExpectationSeparator)
    // suggest 走同一守卫（它内部复用 correctLine）
    expect(suggestLine('cfo', '先查 :: 再改', '正文', 'ceo').ok).toBe(false)
    // 正文里含 `::` 是合法的（第一刀已在期望句之后）
    expect(correctLine('先查再改', '做法：a :: b').ok).toBe(true)
  })

  it('命令面**不回话**：超时即取消并告人（不许无限「处理中…」——失败后按钮卡「处理中…」 的真根因）', async () => {
    const never = {
      execute: () => new Promise(() => {}),
    } as unknown as CommandsRemoteFace
    const outcome = await makeCultivationActions(never, SESSION, { timeoutMs: 30 }).run('/cultivation adopt r-1')
    expect(outcome.ok).toBe(false)
    expect(outcome.text).toBe(CULTIVATION_COPY.timedOut(0))
  })

  it('动作面缺席（某组合没挂命令远程面）：不装作成功，明说改用命令行', async () => {
    await expect(actionsOf(undefined).run('/cultivation adopt r-1')).resolves.toEqual({
      ok: false,
      text: CULTIVATION_COPY.unavailable,
    })
  })

  it('成功但 host 没给文本：给一句兜底回执，不显示空白', async () => {
    const { face } = stubFace({ ok: true, value: { result: { kind: 'success' } } })
    const outcome = await actionsOf(face).run('/cultivation adopt r-1')
    expect(outcome.ok).toBe(true)
    expect(outcome.text).toBe(CULTIVATION_COPY.done)
  })

  it('文案表是唯一家：动作与撤回确认的用词从表里取（改文案不动逻辑）', () => {
    expect(CULTIVATION_COPY.adopt).toBe('采纳')
    expect(CULTIVATION_COPY.verifyPass).toBe('这条有用')
    expect(CULTIVATION_COPY.revokeConfirm).toBe('确认撤回')
  })
})


describe('可选背景的命令线（D1=A：只带 ref token）', () => {
  it('带 context：flag 在固定位置、正文可空；不带 context 逐字不变', () => {
    expect(correctLine('收口前逐项列出未决项', '做法：先列清单。')).toEqual({
      ok: true, line: '/cultivation correct 收口前逐项列出未决项 :: 做法：先列清单。',
    })
    expect(correctLine('收口前逐项列出未决项', '', 'tok-1')).toEqual({
      ok: true, line: '/cultivation correct --context=tok-1 收口前逐项列出未决项 :: ',
    })
    expect(suggestLine('cfo', '结论先列假设', '', 'ceo', 'tok-2')).toEqual({
      ok: true, line: '/cultivation suggest cfo --context=tok-2 结论先列假设 :: ',
    })
  })

  it('无 context 且正文空 → 提示可带背景；有 context 则允许空正文', () => {
    expect(correctLine('期望句', '  \n ')).toEqual({
      ok: false, problem: { field: 'body', message: CULTIVATION_COPY.problemBodyEmpty },
    })
    expect(CULTIVATION_COPY.problemBodyEmpty).toContain('或带一段背景')
    expect(correctLine('期望句', '', 'tok').ok).toBe(true)
  })

  it('期望句以 --context（无 =）开头仍按旧语法构造，不误判为 flag', () => {
    expect(correctLine('--context is confusing', '正文')).toEqual({
      ok: true, line: '/cultivation correct --context is confusing :: 正文',
    })
  })
})
