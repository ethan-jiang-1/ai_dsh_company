/**
 * 读面的**边界判据**：`limit` 是行数上限，vendor 用 `eof` 告诉我们「这一页读到了末尾」。
 * 此前 `readWorkspaceText` 丢掉 `eof`，三个消费方各自把截断当完整——台账少报 64 场、记录把
 * 截断当全文、大索引被判「形状不符」。这条 spec 钉 limit-1 / limit / limit+1 三档的 `eof` 与失败态。
 */
import { describe, expect, it } from 'vitest'
import {
  asWindowReader,
  makeWorkspaceTextReader,
  type RemoteNamespaceFace,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'

/** 造一个只会「按行数截断」的假 remote：行数 ≤ limit ⇒ eof=true。 */
function remote(lines: readonly string[], over: { fail?: boolean } = {}): RemoteNamespaceFace {
  return {
    workspaceFiles: {
      list: async () => ({ ok: true, value: { entries: [] } }),
      read: async (_sessionId, _path, options) => {
        if (over.fail === true) return { ok: false }
        const taken = lines.slice(0, options.limit)
        return { ok: true, value: { text: taken.join('\n'), eof: taken.length === lines.length } }
      },
    },
  }
}

const lines = Array.from({ length: 10 }, (_, i) => `line-${String(i + 1)}`)

// 负例留证 2026-11-22：把 makeWorkspaceTextReader 改回「只返回 text」后 `vitest run tests/client/data/workspace-read-limits.spec.ts` 失败（eof 无法区分，limit-1 档把截断当完整）；还原后 4/4 绿。BUG-298
describe('makeWorkspaceTextReader：截断与完整可区分（BUG-298）', () => {
  it('limit-1 行 ⇒ eof=false（截断，消费方必须说「只读了前 N 行」）', async () => {
    const read = makeWorkspaceTextReader(remote(lines), id => id)('kb/x.md', 9)
    const result = await read('s1' as never, new AbortController().signal)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.eof).toBe(false)
      expect(result.text.split('\n')).toHaveLength(9)
    }
  })

  it('恰好 limit 行 ⇒ eof=true（读完了，不该报截断）', async () => {
    const read = makeWorkspaceTextReader(remote(lines), id => id)('kb/x.md', 10)
    const result = await read('s1' as never, new AbortController().signal)
    expect(result.ok && result.eof).toBe(true)
  })

  it('limit+1 行 ⇒ eof=true（文件比上限短，完整）', async () => {
    const read = makeWorkspaceTextReader(remote(lines), id => id)('kb/x.md', 11)
    const result = await read('s1' as never, new AbortController().signal)
    expect(result.ok && result.eof).toBe(true)
  })

  it('读取被拒 ⇒ 结果态带原因（不再是裸 null，面板才说得出为什么）', async () => {
    const read = makeWorkspaceTextReader(remote(lines, { fail: true }), id => id)('kb/x.md', 10)
    const result = await read('s1' as never, new AbortController().signal)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('kb/x.md')
  })
})

// 摘要窗（journal 预览/记录头）走 asWindowReader：失败给 null 是**有意**的（窗口不是全文），
// 但这条转换本身要有判据，否则「哪一半允许丢 eof」就只剩口头约定。
describe('asWindowReader：窗口读取的失败折成 null（有意的例外）', () => {
  it('成功取正文；失败 null', async () => {
    expect(await asWindowReader(async () => ({ ok: true, eof: false, text: 'head' }))('s' as never, new AbortController().signal)).toBe('head')
    expect(await asWindowReader(async () => ({ ok: false, reason: 'x' }))('s' as never, new AbortController().signal)).toBeNull()
  })
})
