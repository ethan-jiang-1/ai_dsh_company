/**
 * 右栏 3 合一集成页签共享子视图状态仓。
 * 供 OpsHub / TeamHub / ArchiveHub 顶部分段切换与外部快捷打开定位到特定子面板。
 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'

export type HubId = 'ops' | 'team' | 'archive'
export type OpsSection = 'board' | 'dag' | 'tasks' | 'strategy'
export type TeamSection = 'attention' | 'presence' | 'budget'
export type ArchiveSection = 'deliverables' | 'ledger' | 'cultivation'

export interface HubSubViewState {
  readonly ops: OpsSection
  readonly team: TeamSection
  readonly archive: ArchiveSection
}

export interface HubSubViewStore {
  readonly store: SnapshotStore<HubSubViewState>
  select<K extends HubId>(hub: K, section: HubSubViewState[K]): void
}

const INITIAL_HUB_STATE: HubSubViewState = {
  ops: 'board',
  team: 'attention',
  archive: 'deliverables',
}

/** 创建三合一右栏集成页签子视图仓。 */
export function createHubSubViewStore(): HubSubViewStore {
  const store = createSnapshotStore<HubSubViewState>(INITIAL_HUB_STATE)
  return {
    store,
    select(hub, section) {
      const current = store.getSnapshot()
      if (current[hub] === section) return
      store.set({ ...current, [hub]: section })
    },
  }
}
