/**
 * 启动策略的 client 读写动作工厂（tabs 与 Wave S3 全局总部共用，零重复）。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  STARTUP_OPTIONS_READ_LIMIT,
  STARTUP_SETTINGS_READ_LIMIT,
  type StartupField,
} from '../../lib/startup/startup-settings.ts'
import { workspaceFileExists, type WorkspaceTextRead } from '../cultivation/cultivation-data.ts'
import { WORKSPACE_TEXT_PATHS } from '../data/company-data-plane.ts'
import type { SaveResult } from './StrategyPanel.tsx'
import { startupFaceFromReads } from './startup-load.ts'
import type { StartupStore } from './startup-store.ts'

type StartupFilesRemote = Parameters<typeof workspaceFileExists>[0] & {
  readonly commands: {
    execute(
      sessionId: SessionId,
      line: string,
      attachments: readonly unknown[],
    ): Promise<
      | {
        readonly ok: true
        readonly value?: {
          readonly result?: { readonly kind: string; readonly text?: string | undefined } | undefined
        } | undefined
      }
      | { readonly ok: false; readonly error: { readonly message: string } }
    >
  }
}

export interface StartupHandlers {
  readonly loadStartup: (sessionId: SessionId, signal: AbortSignal) => Promise<void>
  readonly saveStartup: (sessionId: SessionId, field: StartupField, value: string | null) => Promise<SaveResult>
  readonly resetStartup: (sessionId: SessionId) => Promise<SaveResult>
}

/** 构造共享一份 `StartupStore` 的读写动作闭包包。 */
export function createStartupHandlers(deps: {
  readonly remote: StartupFilesRemote
  readonly leadOf: (sessionId: SessionId) => SessionId
  readonly readWorkspaceText: (path: string, limit: number) => (sessionId: SessionId, signal: AbortSignal) => Promise<WorkspaceTextRead>
  readonly startupStore: StartupStore
}): StartupHandlers {
  const { remote, leadOf, readWorkspaceText, startupStore } = deps
  const readStartupText = readWorkspaceText(WORKSPACE_TEXT_PATHS.startup, STARTUP_SETTINGS_READ_LIMIT)
  const readStartupOptionsText = readWorkspaceText(WORKSPACE_TEXT_PATHS.startupOptions, STARTUP_OPTIONS_READ_LIMIT)

  const loadStartup = async (sessionId: SessionId, signal: AbortSignal): Promise<void> => {
    if (signal.aborted) return
    const [settingsRead, optionsRead] = await Promise.all([
      readStartupText(sessionId, signal),
      readStartupOptionsText(sessionId, signal),
    ])
    if (signal.aborted) return
    const nextFace = await startupFaceFromReads(
      { settings: settingsRead, options: optionsRead },
      () => workspaceFileExists(remote, leadOf, sessionId, WORKSPACE_TEXT_PATHS.startup, signal),
    )
    if (signal.aborted) return
    startupStore.set(nextFace)
  }

  const runSettingsCommand = async (sessionId: SessionId, line: string): Promise<SaveResult> => {
    try {
      const settled = await remote.commands.execute(sessionId, line, [])
      if (!settled.ok) return { ok: false, message: settled.error.message }
      const result = settled.value?.result
      if (result === undefined) return { ok: false, message: 'command unavailable' }
      return result.kind === 'success' ? { ok: true } : { ok: false, message: result.text ?? result.kind }
    } catch (cause) {
      return { ok: false, message: (cause as Error).message }
    }
  }

  const saveStartup = (sessionId: SessionId, field: StartupField, value: string | null): Promise<SaveResult> =>
    runSettingsCommand(sessionId, `/company-settings set ${field} ${value ?? 'auto'}`)

  const resetStartup = (sessionId: SessionId): Promise<SaveResult> =>
    runSettingsCommand(sessionId, '/company-settings reset')

  return { loadStartup, saveStartup, resetStartup }
}
