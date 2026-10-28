/**
 * 有界追加日志（2026-10-28 数据设计硬化二轮）：client-errors 与 upgrade log 共用。
 * 超过上限把当前文件轮转为 `.1`（只留一份备份），再追加；轮转失败不挡本次写入。
 */
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname } from 'node:path'

/** 默认单文件上限 256 KiB。 */
export const DEFAULT_LOG_MAX_BYTES = 256 * 1024

/**
 * 追加一行；超过上限先轮转 `.1`。
 * @param path - 日志绝对路径。
 * @param line - 一行文本（调用方自己带换行）。
 * @param maxBytes - 上限（测试可注入）。
 */
export function appendRotatingLine(path: string, line: string, maxBytes: number = DEFAULT_LOG_MAX_BYTES): void {
  mkdirSync(dirname(path), { recursive: true })
  if (existsSync(path) && statSync(path).size >= maxBytes) {
    try {
      renameSync(path, `${path}.1`)
    } catch {
      // 轮转失败不挡本次写入；下一轮再试。
    }
  }
  appendFileSync(path, line, 'utf8')
}
