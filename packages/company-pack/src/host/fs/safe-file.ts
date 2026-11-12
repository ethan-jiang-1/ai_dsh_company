/**
 * workspace 可写目录里的「可读普通文件」判据（2026-11-13，BUG-108/113）。
 *
 * 用户/模型可写的目录里，`statSync().isFile()` 会跟随 symlink：一个 workspace 内的
 * `final.md` / `drafts/mrd.md` 指向 workspace 外时，catalog 与命令面都会把外部文件当内部成品读。
 * 这里把「存在 + 是普通文件 + 不是 symlink + realpath 在 root 内」收成一份判据，读面统一消费。
 */
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export type PlainFileProblem = 'missing' | 'symlink' | 'not-file' | 'outside' | null

function realOf(path: string): string {
  try { return realpathSync(path) } catch { return resolve(path) }
}

/** 真实路径是否在 root 内（root 自身算内）。 */
export function isInside(root: string, target: string): boolean {
  const rel = relative(realOf(root), realOf(target))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * 目标相对于 root 的问题；`null` = 可读普通文件。
 * 缺失单独标 `missing`（调用方通常当「没有」而不是坏形状）。
 */
export function plainFileProblem(root: string, path: string): PlainFileProblem {
  let info
  try { info = lstatSync(path) } catch { return 'missing' }
  if (info.isSymbolicLink()) return 'symlink'
  if (!info.isFile()) return 'not-file'
  return isInside(root, path) ? null : 'outside'
}

/** 可读普通文件（非 symlink、realpath 在 root 内）。 */
export function isPlainFileInside(root: string, path: string): boolean {
  return plainFileProblem(root, path) === null
}

/** 读可读普通文件；任何坏形状返回 undefined。 */
export function readTextInside(root: string, path: string): string | undefined {
  if (!isPlainFileInside(root, path)) return undefined
  try { return readFileSync(path, 'utf8') } catch { return undefined }
}
