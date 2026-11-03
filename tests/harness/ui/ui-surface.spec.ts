/**
 * 产品 UI 收口（2026-11-02）：company profile 不再挂 web-app 出厂的轨迹视图与终端入口。
 *
 * 判据：
 * - 禁用的 id 必须真实存在于 web-app bundle（上游改名/删行时本 spec 先红，别让 patch 静默 not-found）；
 * - 用替换语义（顶层 `- id:`）+ `disabled: true` 整行关，不新增第二套 UI、不改 vendor；
 * - `terminal-controller` 不跟着关（D4：无 UI 入口时不分配进程，保留宿主服务）。
 *
 * 为什么不用 developerTools 开关：它连带隐藏代码差异/交互预览与 built-in ptc/minimal，
 * 且是每用户设置，不是产品默认——关它去 Trajectory 会误伤别的面。
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

describe('company profile UI 收口：Trajectory / New terminal', () => {
  it.each(['ui-trajectory', 'ui-sidebar-terminal'])('web-app 确有 %s 行（禁用的是真行，不是拼错）', (id) => {
    expect(WEB_APP_PATCH, `web-app bundle 缺 ${id}；上游改名/删行后本 patch 会静默 not-found`)
      .toMatch(new RegExp(`^\\s+- id: ${id}$`, 'm'))
  })

  it('ui-trajectory 被替换行禁用（只去视图，轨迹数据/会话日志仍在）', () => {
    const row = topLevelRow(PACK_PATCH, 'ui-trajectory')
    expect(row, '缺顶层 ui-trajectory 替换行').not.toBe('')
    expect(row).toContain("name: '@deepseek-ai/dsh-client-ui-trajectory'")
    expect(row).toMatch(/^\s+disabled: true$/m)
  })

  it('ui-sidebar-terminal 被替换行禁用（入口 + tab 类型 + 快捷键一起消失）', () => {
    const row = topLevelRow(PACK_PATCH, 'ui-sidebar-terminal')
    expect(row, '缺顶层 ui-sidebar-terminal 替换行').not.toBe('')
    expect(row).toContain("name: '@deepseek-ai/dsh-client-ui-sidebar-terminal'")
    expect(row).toMatch(/^\s+disabled: true$/m)
  })

  it('terminal-controller 不跟着禁用（D4：保留无 UI 的宿主服务，回滚面小）', () => {
    expect(PACK_PATCH).not.toMatch(/^- id: terminal-controller$/m)
  })
})
