// 负例留证 2026-11-27：去掉 loadStartup 的 signal.aborted 守卫 ⇒ 会话切换取消读取时直接覆写 startupStore 为 optionsProblem: unreadable（BUG-394）；还原后绿。BUG-394
/** 启动策略 client 读写动作闭包包 (`createStartupHandlers`) 单测。 */
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createStartupHandlers } from '../../../packages/company-pack/src/client/startup/startup-handlers.ts'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { makeWorkspaceTextReader } from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'
import {
  EMPTY_STARTUP_OPTIONS,
  EMPTY_STARTUP_SETTINGS,
} from '../../../packages/company-pack/src/lib/startup/startup-settings.ts'

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

  it('BUG-394：loadStartup 在读取中途被 abort 时不覆写共享 startupStore', async () => {
    const store = createStartupStore({
      loaded: true,
      settings: { ...EMPTY_STARTUP_SETTINGS, productType: 'business-software' },
      options: { ...EMPTY_STARTUP_OPTIONS, productTypes: ['business-software'], deliveryModes: ['productized'] },
      optionsProblem: null,
      settingsProblem: null,
    })
    const controller = new AbortController()
    const read = vi.fn(async (_sid: SessionId, _path: string, _opts: unknown, signal: AbortSignal) => {
      await new Promise((_resolve, reject) => {
        if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
        signal.addEventListener('abort', () => { reject(new DOMException('Aborted', 'AbortError')) })
      })
      return { ok: false as const }
    })
    const readWorkspaceText = makeWorkspaceTextReader({ remote: { workspaceFiles: { read } } } as never, id => id)
    const handlers = createStartupHandlers({
      remote: {
        workspaceFiles: { stat: vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')) },
        commands: { execute: vi.fn() },
      } as never,
      leadOf: id => id,
      readWorkspaceText,
      startupStore: store,
    })

    const promise = handlers.loadStartup('sess-abort' as SessionId, controller.signal)
    controller.abort()
    await promise

    expect(store.getSnapshot().optionsProblem).toBeNull()
    expect(store.getSnapshot().settings.productType).toBe('business-software')
  })
})
