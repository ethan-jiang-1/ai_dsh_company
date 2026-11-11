/**
 * 缺省中文的 bundle 层守卫（Phase A1）。
 *
 * 为什么：默认语言不是代码里的 fallback，而是组合层的 `locale.config.preference`。
 * 这里钉住「web-app 真有 locale 行（替换不是拼错）」+「本包确实把它写成 zh」；
 * 真合成结果另由 `--dump-config` 命令验收。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const PACK_PATCH = readFileSync(join(ROOT, 'packages/company-pack/cordis.patch.yml'), 'utf8')
const WEB_APP_PATCH = readFileSync(join(ROOT, 'vendor/dsh/packages/bundle/web-app/cordis.patch.yml'), 'utf8')

/** 取一个顶层替换行（`- id: <id>` 到下一个顶层 `- ` 行）；找不到返回空串。 */
function topLevelRow(text: string, id: string): string {
  const lines = text.split('\n')
  const start = lines.findIndex(line => line === `- id: ${id}`)
  if (start === -1) return ''
  const out = [lines[start] as string]
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] as string
    if (line.startsWith('- ')) break
    out.push(line)
  }
  return out.join('\n')
}

describe('缺省中文：locale.config.preference', () => {
  it('web-app 确有 locale 行（本包替换的是真行）', () => {
    expect(WEB_APP_PATCH).toMatch(/^\s+- id: locale$/m)
  })

  it('本包把 locale 行的 preference 写成 zh', () => {
    const row = topLevelRow(PACK_PATCH, 'locale')
    expect(row, '缺顶层 locale 替换行').not.toBe('')
    expect(row).toContain("name: '@deepseek-ai/dsh-client-locale'")
    expect(row).toMatch(/^\s+preference: zh$/m)
  })
})
