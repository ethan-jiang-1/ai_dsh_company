/**
 * 只读命令的 workspace 解析（2026-11-10 BUG-060）。
 *
 * `/req`、`/prd` 是**只读**操作员命令；它们不需要 writer lease，也不该被启动时的 `dataBlocked`
 * 永久挡住。启动时没有 workspace、后来在侧栏选了 workspace 的会话，命令应能用**会话 cwd**
 * 找到 `.dsh-company/deliverables`。写命令（`/deliverables`、`/cultivation`）仍走停写守卫。
 *
 * 只读：不校验 cwd 是否为 bundle 根；路径解析失败由命令自己的 `resolveDeliverablePath`
 * 给出可操作错误，不在这里猜。
 */
export interface CommandAgent {
  readonly session?: {
    readonly header?: {
      readonly cwd?: string
    }
  }
}

/** 启动 workspace 优先；没有时退回命令所在会话的 cwd；都没有返回空串。 */
export function commandWorkspace(workspace: string, agent: CommandAgent | undefined): string {
  if (workspace !== '') return workspace
  const cwd = agent?.session?.header?.cwd
  return typeof cwd === 'string' ? cwd : ''
}
