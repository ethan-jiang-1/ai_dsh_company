/**
 * 「这个工作区文件在不在」探针（BUG-297 的缺失/不可读之分）。
 *
 * 读面失败时没有错误码，只能补一次目录列：列得出来且其中有该文件 = 存在（读得到失败 ⇒ 权限/是目录）；
 * 列不出来/抛错 = 当作不存在（不把探针失败说成存在，否则新工作区会冒出假错误行）。
 */
import { describe, expect, it } from 'vitest'
import { workspaceFileExists, type RemoteNamespaceFace } from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'

const face = (behaviour: 'list' | 'absent' | 'fail' | 'throw', entries: readonly string[] = []): RemoteNamespaceFace => ({
  workspaceFiles: {
    list: async () => {
      if (behaviour === 'throw') throw new Error('boom')
      if (behaviour === 'fail') return { ok: false }
      return { ok: true, value: { entries: entries.map(name => ({ type: 'file', name })) } }
    },
    read: async () => ({ ok: false }),
  },
})

const signal = (): AbortSignal => new AbortController().signal

describe('workspaceFileExists', () => {
  it('目录里确有该文件 ⇒ true', async () => {
    expect(await workspaceFileExists(face('list', ['startup.json', 'other.md']), id => id, 's1' as never, '.dsh-company/startup.json', signal())).toBe(true)
  })

  it('目录里没有 ⇒ false（缺失 = 合法 auto）', async () => {
    expect(await workspaceFileExists(face('list', ['other.md']), id => id, 's1' as never, '.dsh-company/startup.json', signal())).toBe(false)
  })

  it('列目录被拒 / 抛错 ⇒ false（不把探针失败说成存在）', async () => {
    expect(await workspaceFileExists(face('fail'), id => id, 's1' as never, '.dsh-company/startup.json', signal())).toBe(false)
    expect(await workspaceFileExists(face('throw'), id => id, 's1' as never, '.dsh-company/startup.json', signal())).toBe(false)
  })

  it('无目录段的路径 ⇒ 在根上列', async () => {
    expect(await workspaceFileExists(face('list', ['board.json']), id => id, 's1' as never, 'board.json', signal())).toBe(true)
  })
})
