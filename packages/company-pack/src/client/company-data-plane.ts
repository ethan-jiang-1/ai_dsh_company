// 公司页签 / 公司视图共用的数据面工厂（2026-10-20 审计：client/index.ts 两处重复构造同一组闭包）。
//
// 接口只暴露四个闭包；session/remote 的命名空间细节留在实现里。两个注入块拿同一个工厂，
// 避免「页签看到的 follow 流」与「公司视图看到的 follow 流」各接一次、各自漂。
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createCompanySessionAdapters } from './company-session-adapters.ts'
import {
  makeCultivationActions,
  type CultivationActionsFactory,
} from './cultivation-actions.ts'
import { makeCultivationFiles, makeWorkspaceTextReader, type CultivationFiles } from './cultivation-data.ts'

type CompanyRemote = Parameters<typeof makeCultivationFiles>[0]
type SessionRemote = Parameters<typeof createCompanySessionAdapters>[1]
type CommandRemote = Parameters<typeof makeCultivationActions>[0]

/** 数据面只要求这两个服务 + 三个 remote 命名空间。 */
export interface CompanyDataPlaneContext {
  readonly sessions: ClientContext['sessions']
  readonly remote: CompanyRemote & {
    readonly session: SessionRemote
    readonly commands: CommandRemote
  }
}

/** 两个静态页签的数据面路径（唯一家；面板只读这两份，不自己扫盘——BUG-025 的连线判据）。 */
export const WORKSPACE_TEXT_PATHS = {
  ledger: 'kb/motion-ledger.md',
  catalog: 'kb/deliverables-index.json',
} as const

/** 数据面输出（页签与公司视图共用同一实现）。 */
export interface CompanyDataPlane {
  readonly leadOf: ReturnType<typeof createCompanySessionAdapters>['leadOf']
  readonly follow: ReturnType<typeof createCompanySessionAdapters>['follow']
  readonly cultivationFiles: CultivationFiles
  readonly cultivationActions: CultivationActionsFactory
  /** 读工作区文本（失败 null）；`(path, limit) => (sessionId, signal) => text`。 */
  readonly readWorkspaceText: ReturnType<typeof makeWorkspaceTextReader>
}

/**
 * 从已注入的 client context 造公司数据面。
 * @param scoped - 已注入 sessions / remote.session / remote.commands 的 scoped context。
 * @returns 四个闭包（Lead 寻址、follow 流、培养文件、人侧动作工厂）。
 */
export function createCompanyDataPlane(scoped: CompanyDataPlaneContext): CompanyDataPlane {
  const { leadOf, follow } = createCompanySessionAdapters(scoped.sessions, scoped.remote.session)
  return {
    leadOf,
    follow,
    cultivationFiles: makeCultivationFiles(scoped.remote, leadOf),
    cultivationActions: (sessionId) => makeCultivationActions(scoped.remote.commands, sessionId),
    readWorkspaceText: makeWorkspaceTextReader(scoped.remote, leadOf),
  }
}
