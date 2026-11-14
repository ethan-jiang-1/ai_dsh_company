/**
 * Markdown 文档形状的公开类型面（2026-11-14，P0 收口）。
 *
 * 实现唯一家 = `markdown-shape-core.js`（门禁与 TS 共用）；本文件只导出类型与带类型的函数，
 * 不再复制扫描状态机。改判据时改 core，TS/门禁同时生效。
 */
import {
  normalizeDocument as normalizeCore,
  scanDocument as scanCore,
  scanDocumentDetailed as scanDetailedCore,
  splitTableRow as splitCore,
} from './markdown-shape-core.js'

export interface DocumentLine {
  /** 去掉 HTML 注释片段后的可见文本；围栏内的行保留原文。 */
  readonly text: string
  /** 能否用于结构解析：围栏内的行为 false；注释片段已从 `text` 移除。 */
  readonly structural: boolean
}

/** 一个顶层围栏块（围栏本身不算结构，但它的内容是有名字的载荷）。 */
export interface DocumentFence {
  readonly info: string
  readonly content: string
  readonly startLine: number
}

/** 结构扫描结果；`unclosedCommentLine` = 未闭合 HTML 注释的起始行（1-based）。 */
export interface DocumentScan {
  readonly lines: readonly DocumentLine[]
  readonly unclosedCommentLine?: number
  readonly fences: readonly DocumentFence[]
}

/** 平台差异归一：去 UTF-8 BOM、CRLF 与孤立 CR → LF。 */
export const normalizeDocument: (text: string) => string = normalizeCore

/** 按 CommonMark 反斜杠转义切表格行。 */
export const splitTableRow: (line: string) => string[] = splitCore

/** 结构扫描短视图：只要行。 */
export const scanDocument: (text: string) => readonly DocumentLine[] = scanCore

/** 结构扫描完整视图：行 + 未闭合注释行号 + 顶层围栏块。 */
export const scanDocumentDetailed: (text: string) => DocumentScan = scanDetailedCore
