/**
 * DSH workspace 登记的只读体检（2026-10-26，P1 搬家指针）。
 *
 * DSH 的 `<DSH_HOME>/storages/workspace.json` 存的是**绝对**工作区路径；搬 home / 改目录名后
 * 这些路径不会自动迁移。本模块只做一件事：从登记里挑出**已不存在**的绝对路径，供 host 在启动
 * 输出里点名——不改 DSH 的文件，也不冒充迁移。
 */
import { isAbsolute } from 'node:path'

/** 登记文档里一个工作区的形状（只读我们需要的字段）。 */
interface WorkspaceEntry {
  readonly path?: unknown
}

/**
 * 挑出登记中已不存在的绝对路径。
 * @param document - `storages/workspace.json` 解析后的 JSON（坏形状按空处理）。
 * @param exists - 存在性判定（注入以便单测；host 传 `existsSync`）。
 * @returns 去重后的绝对路径，按字典序。
 */
export function staleWorkspacePaths(document: unknown, exists: (path: string) => boolean): string[] {
  const tables = (document as { tables?: unknown } | null)?.tables
  const workspaces = (tables as { workspaces?: unknown } | null | undefined)?.workspaces
  if (typeof workspaces !== 'object' || workspaces === null || Array.isArray(workspaces)) return []
  const stale = new Set<string>()
  for (const value of Object.values(workspaces as Record<string, WorkspaceEntry>)) {
    const path = value?.path
    if (typeof path !== 'string' || path === '' || !isAbsolute(path)) continue
    if (!exists(path)) stale.add(path)
  }
  return [...stale].sort()
}
