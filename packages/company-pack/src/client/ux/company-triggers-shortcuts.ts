/**
 * Wave S2 交互接线：
 * 1) `@` 角色提及补全源（InputTriggerSource）；
 * 2) 右栏成员对话侧窗深链与分栏快捷布局预设（split ops/review）；
 * 3) `shortcuts` 固定只读快捷键（Alt+Shift+1/2/3）。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  InputTriggerCandidate,
  InputTriggerPick,
  InputTriggerSource,
  PickOutcome,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { ISidebarRight } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {
  ShortcutCommandId,
  ShortcutFixedInput,
  Shortcuts,
} from '@deepseek-ai/dsh-client-shortcuts/client'
import { ROLE_CANONICAL, ROLE_IDS } from '../../lib/shared/role-copy.ts'
import type { CompanyT } from '../locales.ts'
import { roleText } from '../roles.ts'
import type { HubSubViewStore } from '../tabs/hub-subview-store.ts'
import { openOnSessionSurface, type SidebarRightSurfaceLike } from '../wiring/sidebar-right-guard.ts'

export type SplitPresetId = 'ops' | 'review' | 'quiet'

export const COMPANY_SHORTCUT_IDS = {
  ops: 'company.openOps' as ShortcutCommandId,
  team: 'company.openTeam' as ShortcutCommandId,
  archive: 'company.openArchive' as ShortcutCommandId,
} as const

/** 按上游 `ui-subagent` 契约构造嵌入式成员对话资源地址。 */
export function buildSubagentChatAddress(
  parentSessionId: SessionId,
  childSessionId: SessionId,
  mode: 'continuable' | 'one-shot' | 'unknown' = 'continuable',
): string {
  const query = new URLSearchParams({
    parent: parentSessionId,
    mode,
  })
  return `dsh-resource://subagentchat/session/${encodeURIComponent(childSessionId)}?${query.toString()}`
}

/** 在右栏新窗格打开成员/子代理对话而不切走主列当前对话；若在全局 HQ 面板则先切回主会话。 */
export function openSubagentAside(
  sidebarRight: Pick<ISidebarRight, 'openResource'> & SidebarRightSurfaceLike,
  parentSessionId: SessionId,
  childSessionId: SessionId,
  layout?: { readonly selectPanel: (panel: null) => void },
): void {
  openOnSessionSurface(
    sidebarRight,
    layout === undefined ? undefined : () => { layout.selectPanel(null) },
    () => {
      sidebarRight.openResource(
        buildSubagentChatAddress(parentSessionId, childSessionId),
        { preferNewPane: true },
      )
    },
  )
}

/** 一键打开双分栏工作区预设或收起右栏进入清净专注。 */
export function openSplitPreset(
  sidebarRight: Pick<ISidebarRight, 'openTab'> & Partial<Pick<ISidebarRight, 'isExpanded' | 'toggleExpanded'>> & SidebarRightSurfaceLike,
  hubStore: HubSubViewStore,
  preset: SplitPresetId,
  viewportWidth: number | undefined = typeof window === 'undefined' ? undefined : window.innerWidth,
): void {
  if (preset === 'quiet') {
    if (sidebarRight.isExpanded?.() === true) {
      sidebarRight.toggleExpanded?.()
    }
    return
  }
  const isNarrow = viewportWidth !== undefined && viewportWidth < 768
  const safeTry = (fn: () => void): void => {
    try { fn() } catch { /* 右栏未挂会话面或窗格不足时安全退避，不抛裸异常（BUG-393）。 */ }
  }
  if (preset === 'ops') {
    hubStore.select('ops', 'board')
    safeTry(() => { sidebarRight.openTab('company-ops') })
    if (isNarrow) return
    hubStore.select('team', 'presence')
    safeTry(() => { sidebarRight.openTab('company-team', { preferNewPane: true }) })
    return
  }
  hubStore.select('archive', 'deliverables')
  safeTry(() => { sidebarRight.openTab('company-archive') })
  if (isNarrow) return
  try {
    sidebarRight.openTab('files', { preferNewPane: true })
  } catch {
    hubStore.select('ops', 'board')
    safeTry(() => { sidebarRight.openTab('company-ops', { preferNewPane: true }) })
  }
}

/** 创建 `@` 触发器（公司角色提及，不改动 `@file` 源码）。 */
export function createCompanyRoleTriggerSource(t: CompanyT): InputTriggerSource {
  return {
    trigger: '@',
    name: 'company-roles',
    order: 20,
    showGroupTitle: true,
    async candidates(_session, req): Promise<readonly InputTriggerCandidate[]> {
      const needle = req.query.trim().toLowerCase()
      const matches = ROLE_IDS.filter((roleId) => {
        if (needle === '') return true
        const canonical = ROLE_CANONICAL[roleId].toLowerCase()
        const label = roleText(roleId, 'label', t).toLowerCase()
        return roleId.toLowerCase().includes(needle)
          || canonical.includes(needle)
          || label.includes(needle)
      })
      return matches.map((roleId) => ({
        name: roleId,
        label: roleText(roleId, 'label', t),
        description: roleText(roleId, 'full', t),
        section: t('trigger.companyRoles'),
        value: roleId,
        icon: 'session',
      }))
    },
    onPick(pick: InputTriggerPick): PickOutcome {
      const roleId = pick.candidate.value ?? pick.candidate.name
      return { text: `@${roleId} ` }
    },
  }
}

function safeOpenHubFromShortcut(
  sidebarRight: Pick<ISidebarRight, 'mounted' | 'openTab'>,
  hubStore: HubSubViewStore,
  kind: 'company-ops' | 'company-team' | 'company-archive',
): void {
  if (sidebarRight.mounted.getSnapshot() === undefined) return
  if (kind === 'company-ops') hubStore.select('ops', 'board')
  if (kind === 'company-team') hubStore.select('team', 'attention')
  if (kind === 'company-archive') hubStore.select('archive', 'deliverables')
  try {
    sidebarRight.openTab(kind)
  } catch {
    // 会话尚未挂载完右栏时静默忽略，避免键盘全局报错。
  }
}

/** 注册三组只读全局快捷键（Alt+Shift+1 / 2 / 3）。 */
export function registerCompanyShortcuts(
  shortcuts: Pick<Shortcuts, 'registerFixed' | 'observeFixedInput'>,
  deps: {
    readonly sidebarRight: Pick<ISidebarRight, 'mounted' | 'openTab'>
    readonly hubStore: HubSubViewStore
    readonly t: CompanyT
  },
): () => void {
  const disposers: Array<() => void> = [
    shortcuts.registerFixed({
      id: COMPANY_SHORTCUT_IDS.ops,
      label: () => deps.t('shortcut.openOps'),
      keys: ['Alt', 'Shift', '1'],
      bindings: [{ code: 'Digit1', modifiers: ['alt', 'shift'] }],
      group: 'application',
    }),
    shortcuts.registerFixed({
      id: COMPANY_SHORTCUT_IDS.team,
      label: () => deps.t('shortcut.openTeam'),
      keys: ['Alt', 'Shift', '2'],
      bindings: [{ code: 'Digit2', modifiers: ['alt', 'shift'] }],
      group: 'application',
    }),
    shortcuts.registerFixed({
      id: COMPANY_SHORTCUT_IDS.archive,
      label: () => deps.t('shortcut.openArchive'),
      keys: ['Alt', 'Shift', '3'],
      bindings: [{ code: 'Digit3', modifiers: ['alt', 'shift'] }],
      group: 'application',
    }),
    shortcuts.observeFixedInput((input: ShortcutFixedInput) => {
      if (input.type !== 'keydown') return
      const { gesture } = input
      if (gesture.composing || gesture.defaultPrevented || gesture.repeat) return
      if (!gesture.alt || !gesture.shift || gesture.control || gesture.meta) return
      if (gesture.code === 'Digit1') {
        input.consume()
        safeOpenHubFromShortcut(deps.sidebarRight, deps.hubStore, 'company-ops')
      } else if (gesture.code === 'Digit2') {
        input.consume()
        safeOpenHubFromShortcut(deps.sidebarRight, deps.hubStore, 'company-team')
      } else if (gesture.code === 'Digit3') {
        input.consume()
        safeOpenHubFromShortcut(deps.sidebarRight, deps.hubStore, 'company-archive')
      }
    }),
  ]

  return () => {
    for (const dispose of disposers) dispose()
  }
}
