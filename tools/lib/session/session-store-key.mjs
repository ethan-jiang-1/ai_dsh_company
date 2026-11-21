// session-store 目录键的**唯一家**（BUG-286 / F3 「根与键各自派生」的同族）。
//
// 为什么单独立一条：DSH 把每个会话按工作区绝对路径分组到 `$DSH_HOME/sessions/<键>/`，键 = 把路径里的
// `/` 换成 `-`、两端再各补一个 `-`。这个形状在三个脚本里各写了一遍（审计入口、两条 snapshot-motion），
// 于是「换个根就换个键」的漂移有 N 个入口——BUG-286 正是同一族（文件根 / 会话根被当成同一个）。
// 键派生只能从这里出；`company-root-carriers` 门禁扫 `checks/**` 与 `tools/**` 禁止手写。

/**
 * 会话目录键：`-<绝对路径，/ → ->--`。
 * @param cwd - 工作区绝对路径（POSIX 或已归一的正斜杠路径）。
 * @returns `sessions/` 下的目录名。
 */
export function sessionStoreKey(cwd) {
  return `-${String(cwd).replaceAll('/', '-')}--`
}
