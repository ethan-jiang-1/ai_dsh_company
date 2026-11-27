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

  it('缺失文件时走 workspaceFiles.list 探测存在性，commands.execute 抛错时安全折为 SaveResult 失败', async () => {
    const store = createStartupStore()
    const list = vi.fn(async () => ({ ok: true as const, value: { entries: [] } }))
    const execute = vi.fn(async () => { throw new Error('ipc disconnected') })
    const readWorkspaceText = vi.fn(() => async () => ({ ok: false as const, reason: 'ENOENT' }))
    const handlers = createStartupHandlers({
      remote: {
        commands: { execute },
        workspaceFiles: { list },
      } as never,
      leadOf: id => id,
      readWorkspaceText,
      startupStore: store,
    })

    await handlers.loadStartup('s-missing' as SessionId, new AbortController().signal)
    expect(list).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().loaded).toBe(true)

    await expect(handlers.saveStartup('s-missing' as SessionId, 'productType', 'b2b')).resolves.toEqual({
      ok: false,
      message: 'ipc disconnected',
    })

    // 预中止 signal 与 commands.execute 多种返回形态（error / missing result / result.text 缺省）
    const aborted = new AbortController()
    aborted.abort()
    list.mockClear()
    await handlers.loadStartup('s-aborted' as SessionId, aborted.signal)
    expect(list).not.toHaveBeenCalled()

    const execVariants = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { message: 'rpc err' } })
      .mockResolvedValueOnce({ ok: true as const, value: {} })
      .mockResolvedValueOnce({ ok: true as const, value: { result: { kind: 'denied' } } })
    const h2 = createStartupHandlers({
      remote: { commands: { execute: execVariants }, workspaceFiles: { list } } as never,
      leadOf: id => id,
      readWorkspaceText,
      startupStore: store,
    })
    await expect(h2.saveStartup('s-1' as SessionId, 'productType', 'b2b')).resolves.toEqual({ ok: false, message: 'rpc err' })
    await expect(h2.saveStartup('s-1' as SessionId, 'productType', 'b2b')).resolves.toEqual({ ok: false, message: 'command unavailable' })
    await expect(h2.resetStartup('s-1' as SessionId)).resolves.toEqual({ ok: false, message: 'denied' })
  })
})
