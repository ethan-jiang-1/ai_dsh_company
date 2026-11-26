/**
 * 全局公司 Toast 通知（`shell.overlay` list 槽，L0 增量）。
 * 通过 `@deepseek-ai/dsh-client-store` 的 `createSnapshotStore` 驱动，切出主对话至全局面板不丢失。
 */
import type { ReactNode } from 'react'
import { createSnapshotStore, type ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import { Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { COMPANY_NS } from '../locales.ts'

export interface CompanyToastState {
  readonly seq: number
  readonly text: string
  readonly tone?: 'success'
}

export interface CompanyToastSource {
  readonly store: ObservableSnapshot<CompanyToastState | null>
  readonly notify: (text: string, tone?: 'success') => void
  readonly dismiss: () => void
}

/** 创建公司全局通知仓；使用 `.set()` 更新状态（DSH SnapshotStore 契约）。 */
export function createCompanyToastSource(): CompanyToastSource {
  const store = createSnapshotStore<CompanyToastState | null>(null)
  let seq = 0
  return {
    store,
    notify(text, tone) {
      seq += 1
      store.set(tone === undefined ? { seq, text } : { seq, text, tone })
    },
    dismiss() {
      store.set(null)
    },
  }
}

export interface CompanyToastInjected {
  readonly hooks: { readonly toastState: ObservableSnapshot<CompanyToastState | null> }
  readonly dismiss: () => void
}

export type CompanyToastOverlayProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<CompanyToastInjected>

/** 在 `shell.overlay` 上挂载 DSH 原生 Toast（Portal 至 document.body）。 */
export function CompanyToastOverlay({ useToastState, dismiss }: CompanyToastOverlayProps): ReactNode {
  const current = useToastState((state: CompanyToastState | null) => state)
  if (current === null) return null
  return (
    <div data-company-toast-host="">
      <Toast
        key={`company-toast-${String(current.seq)}`}
        text={current.text}
        {...(current.tone === undefined ? {} : { tone: current.tone })}
        onDone={dismiss}
      />
    </div>
  )
}
