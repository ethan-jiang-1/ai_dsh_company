/**
 * Shared i18n rendering assertion helpers for `tests/client/i18n/*`.
 */
import { expect } from 'vitest'
import type { CompanyKey, CompanyT } from '../../packages/company-pack/src/client/locales.ts'

export const CJK_IDEOGRAPH_RE = /[\u3400-\u9fff]/u
export const CHINESE_PUNCT_RE = /[、；：（）「」【】，。？！《》“”]/u
export const RAW_ISO_TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:/

export function translateWith(dict: Readonly<Record<CompanyKey, string>>): CompanyT {
  return ((key: CompanyKey, params?: Record<string, string | number>) => {
    const template = dict[key]
    return params === undefined
      ? template
      : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  }) as CompanyT
}

/**
 * Assert an English-mode rendered HTML/text fragment has zero Chinese characters,
 * zero full-width Chinese punctuation, and zero leaked raw ISO timestamps.
 */
export function assertEnglishUiClean(rendered: string, context = 'rendered en output'): void {
  expect(rendered.trim(), `${context}: expected non-empty output`).not.toBe('')
  expect(rendered, `${context}: leaked CJK characters`).not.toMatch(CJK_IDEOGRAPH_RE)
  expect(rendered, `${context}: leaked Chinese punctuation`).not.toMatch(CHINESE_PUNCT_RE)
  expect(rendered, `${context}: leaked raw ISO timestamp`).not.toMatch(RAW_ISO_TIMESTAMP_RE)
}
