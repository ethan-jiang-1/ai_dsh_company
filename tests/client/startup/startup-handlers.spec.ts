/** 启动策略 client 读写动作闭包包 (`createStartupHandlers`) 单测。 */
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createStartupHandlers } from '../../../packages/company-pack/src/client/startup/startup-handlers.ts'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'

describe('createStartupHandlers', () => {
  it('loads startup settings & options into store and saves/resets via commands.execute', async () => {
    const store = createStartupStore()
    const execute = vi.fn(async (_sid: SessionId, line: string) => (
      line.includes('reset')
        ? { ok: true as const, value: { result: { kind: 'error', text: 'forbidden' } } }
        : { ok: true as const, value: { result: { kind: 'success', text: 'ok' } } }
    ))
    const readWorkspaceText = vi.fn(() => async () => ({ ok: true as const, text: '{}', eof: true }))
    const handlers = createStartupHandlers({
      remote: {
        commands: { execute },
        workspaceFiles: { read: vi.fn(async () => ({ ok: false as const, error: { code: 'ENOENT' } })) },
      } as unknown as Parameters<typeof createStartupHandlers>[0]['remote'],
      leadOf: id => id,
      readWorkspaceText,
      startupStore: store,
    })

    await handlers.loadStartup('s-1' as SessionId, new AbortController().signal)
    expect(store.getSnapshot().loaded).toBe(true)

    await expect(handlers.saveStartup('s-1' as SessionId, 'productType', 'b2b')).resolves.toEqual({ ok: true })
    expect(execute).toHaveBeenCalledWith('s-1', '/company-settings set productType b2b', [])

    await expect(handlers.saveStartup('s-1' as SessionId, 'productType', null)).resolves.toEqual({ ok: true })
    expect(execute).toHaveBeenCalledWith('s-1', '/company-settings set productType auto', [])

    await expect(handlers.resetStartup('s-1' as SessionId)).resolves.toEqual({ ok: false, message: 'forbidden' })
  })
})
