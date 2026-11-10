/**
 * `/req check` / `/prd check` 的 deliverables 目录解析（2026-11-10 BUG-057）。
 *
 * 为什么单独成 lib：两条命令都把操作员给的 slug 直接 `join(workspace, '.dsh-company/deliverables', slug, 'drafts')`，
 * `path.join` 会规范化 `..`，于是 `../zz-outside` 能读到 deliverables 根之外。修复只该有一份判据：
 * slug 必须是**单段目录名**，且解析结果必须仍在 deliverables 根内（defense in depth）。
 *
 * 只读路径；不创建目录、不读写文件。
 */
import { isAbsolute, join, relative } from 'node:path'

/** deliverables 目录名：字母/数字开头，允许 `._-`；拒绝 `.`/`..` 与路径分隔符。 */
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export type DeliverablePath =
  | { readonly ok: true; readonly root: string; readonly dir: string }
  | { readonly ok: false; readonly text: string }

/**
 * 把一个操作员 slug 解析成 deliverables 根与 `drafts/` 目录。
 * @param workspace 公司 workspace（绝对/规范路径由调用方保证）。
 * @param slug 操作员输入的单段目录名。
 * @returns `ok: false` 时 text 是可直接回给操作员的错误；`ok: true` 时 root=交付物目录、dir=drafts。
 */
export function resolveDeliverablePath(workspace: string, slug: string): DeliverablePath {
  if (!SLUG.test(slug) || slug === '.' || slug === '..') {
    return {
      ok: false,
      text: `非法 deliverables 目录名「${slug}」：只允许单段目录名（字母/数字/._-；不能含 /、\\、. 或 ..）`,
    }
  }
  const deliverablesRoot = join(workspace, '.dsh-company/deliverables')
  const root = join(deliverablesRoot, slug)
  const dir = join(root, 'drafts')
  const rel = relative(deliverablesRoot, dir)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    return { ok: false, text: `非法 deliverables 目录名「${slug}」：越出 deliverables 根` }
  }
  return { ok: true, root, dir }
}
