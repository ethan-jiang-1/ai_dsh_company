/**
 * 内容包 id（productTypes / deliveryModes）的信任边界（2026-11-13，BUG-102）。
 *
 * 这两个 id 来自**模型可写**的 `meta.md` / `company.md`，随后被 `join(contentDir, group, id, file)`
 * 拼进随包 content 路径。只做 yaml 清洗、只判文件存在，会让 `../../workspace/evil` 读到 workspace
 * 里自造的「零要求」规则，从而让 `/delivery` `/req` 给模型自证的交付/需求背书。
 *
 * 判据两层：① id 是单段小写 slug；② 拼完仍在 `content/<group>/` 下。成员校验（是否在盘上可用
 * 目录里）由调用方用 `available*` 再做一次，给出可操作错误。
 */
import { isAbsolute, join, relative } from 'node:path'

/** content id 的允许形状（与目录名/skill slug 同族的单段小写）。 */
export function isSafeContentId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value)
}

/**
 * 在 `content/<group>/<id>/<file>` 下调一个成员文件。
 * @returns 安全且不越出 group 根时给绝对路径；否则 null。
 */
export function contentMemberFile(
  contentDir: string,
  group: 'product-types' | 'delivery-modes',
  id: string,
  file: string,
): string | null {
  if (!isSafeContentId(id)) return null
  const root = join(contentDir, group)
  const target = join(root, id, file)
  const rel = relative(root, target)
  if (rel.startsWith('..') || rel === '' || isAbsolute(rel)) return null
  return target
}
