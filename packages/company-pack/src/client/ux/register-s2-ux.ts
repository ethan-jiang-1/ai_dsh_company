/**
 * Wave S2 总装配：
 * 1) `sidebar.right.tab.guide` chain 替换（聚焦 3 公司入口 + 分栏快捷 + 上游工具透传）；
 * 2) `inputTriggers` 注册 `@` 公司角色提及补全源；
 * 3) `shortcuts` 注册 Alt+Shift+1/2/3 全局快捷键。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SidebarRightGuideBox } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-shortcuts/client'
import { COMPANY_NS } from '../locales.ts'
import type { HubSubViewStore } from '../tabs/hub-subview-store.ts'
import { CompanyGuideHub } from './company-guide.tsx'
import {
  createCompanyRoleTriggerSource,
  openSplitPreset,
  registerCompanyShortcuts,
} from './company-triggers-shortcuts.ts'

import type { SplitPresetId } from './company-triggers-shortcuts.ts'

export interface WaveS2Deps {
  readonly hubStore: HubSubViewStore
}

export const S2_GUIDE_SLOT_ID = 'company-guide-hub'

/** 挂载 Wave S2 全套导航聚焦、角色提及触发器与固定快捷键。 */
export function registerWaveS2Ux(ctx: ClientContext, deps: WaveS2Deps): void {
  const t = ctx.locale.bind(COMPANY_NS)

  ctx.inject(['slots', 'sidebarRight', 'sidebarRightTabs'], (scoped) => {
    const guideEntries: ObservableSnapshot<readonly SidebarRightGuideBox[]> = {
      getSnapshot: () => scoped.sidebarRightTabs.guide(),
      subscribe: listener => scoped.sidebarRightTabs.subscribe(listener),
    }

    scoped.slots.inject('sidebar.right.tab.guide', () =>
      scoped.slots.register({
        name: 'sidebar.right.tab.guide',
        registrant: S2_GUIDE_SLOT_ID,
        priority: 0,
        locale: COMPANY_NS,
        select: () => ({ active: true }),
        inject: () => ({
          hooks: { guideEntries },
          openSplit: (preset: SplitPresetId) => {
            openSplitPreset(scoped.sidebarRight, deps.hubStore, preset)
          },
        }),
      }, CompanyGuideHub),
    )
  })

  ctx.inject(['inputTriggers'], (scoped) => {
    scoped.effect(
      () => scoped.inputTriggers.registerSource(createCompanyRoleTriggerSource(t)),
      'company-pack: @ role trigger',
    )
  })

  ctx.inject(['shortcuts', 'sidebarRight'], (scoped) => {
    scoped.effect(
      () => registerCompanyShortcuts(scoped.shortcuts, {
        sidebarRight: scoped.sidebarRight,
        hubStore: deps.hubStore,
        t,
      }),
      'company-pack: fixed shortcuts',
    )
  })
}
