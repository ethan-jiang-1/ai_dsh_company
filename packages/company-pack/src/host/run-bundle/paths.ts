/**
 * 路径规范化（2026-10-27 R3-22 收家：此前 `canonicalPath` 在 index/bundle-manifest/cultivation/
 * catalog/runtime-guard 五处各一份、逐字相同）。
 *
 * 语义：存在的路径走 `realpath`（解符号链接），不存在的退 `resolve`（只做绝对化）。
 * 为什么住 host/：用了 `node:fs`，不能进 lib/（lib 会被编进浏览器叶，TS2591 已实证）。
 */
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'

/** 规范路径：能 realpath 就 realpath，否则 resolve。 */
export function canonicalPath(path: string): string {
  try { return realpathSync(path) } catch { return resolve(path) }
}
