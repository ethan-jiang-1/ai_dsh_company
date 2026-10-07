import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

// 条目 A 布局守卫（RFC driver-surface-package，2026-10-06；2026-10-07 S1 起 run/）：run/ 只收 tracked 启动配置，
// 运行残留家 = 顶层 runtime/。断言全部落在 tracked 文件上——fresh clone 与开发机同判。
const LAUNCH_CONFIG = ['README.md', 'company.overlay.yml', 'entry-probe.patch.yml', 'env.sh']
const RESIDUE_HOMES = ['harness-home', 'harness-home-b', 'pw-browsers', 'rehearsal-workspace']

describe('launch config and runtime residue separation (item A)', () => {
  it('run/ holds only tracked launch config — residue reappearing there is a regression', () => {
    const entries = readdirSync(join(repositoryRoot, 'run')).sort()
    expect(entries).toEqual([...LAUNCH_CONFIG].sort())
  })

  it('runtime/README.md exists and names every residue home', () => {
    const readme = join(repositoryRoot, 'runtime/README.md')
    expect(existsSync(readme)).toBe(true)
    const text = readFileSync(readme, 'utf8')
    for (const home of RESIDUE_HOMES) expect(text).toContain(home)
  })

  it('runtime/harness-home keeps its tracked README (gitignore exception travels with the move)', () => {
    expect(existsSync(join(repositoryRoot, 'runtime/harness-home/README.md'))).toBe(true)
  })

  it('run/env.sh pairs with runtime/harness-home — the two homes stay disjoint', () => {
    const env = readFileSync(join(repositoryRoot, 'run/env.sh'), 'utf8')
    expect(env).toContain('../runtime/harness-home')
    expect(env).not.toContain("'harness-home'")
  })
})

describe('rehearsal seam adoption (observation-hardening item A)', () => {
  const consumeScriptLines = (rel: string) =>
    readdirSync(join(repositoryRoot, rel), { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.mjs'))
      .flatMap(entry =>
        readFileSync(join(repositoryRoot, rel, entry.name), 'utf8').split('\n')
          .map((text, i) => ({ file: `${rel}/${entry.name}`, no: i + 1, text })))

  it('smoke/probes 不硬编码排练盘路径——一律走 lib/rehearsal.mjs 的 REHEARSAL_REL seam', () => {
    const offenders = [...consumeScriptLines('checks/smoke'), ...consumeScriptLines('probes')]
      .filter(({ text }) => !text.trimStart().startsWith('//') && text.includes('runtime/rehearsal-workspace'))
      .map(({ file, no }) => `${file}:${no}`)
    expect(offenders, '排练盘路径集中在 REHEARSAL_REL seam——再搬家时只改一处，不做全量 grep').toEqual([])
  })
})
