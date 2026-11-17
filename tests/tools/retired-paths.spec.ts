import { describe, expect, it } from 'vitest'
import { parseNameStatus, retiredDirectoryPrefixes } from '../../checks/lib/retired-paths.mjs'

// 负例留证 2026-11-17：向脚本注释注入旧 observe 路径，`pnpm verify` 的 retired-path 红（BUG-207）；删除 → 绿。

/**
 * 退役路径的 git 历史推导（BUG-207 的纯逻辑面）。
 *
 * 为什么：gate 的自动面要能说清「哪条旧路径从哪个提交之后就不在了」。把解析与目录推导拆成
 * 纯函数后，负例不再依赖整棵仓库与完整 git 历史；浅克隆里 gate 可以跳过自动面，但这里始终可测。
 *
 * 负例留证 2026-11-17：把旧 observe 目录下的探针路径注入脚本注释，`pnpm verify` 的 retired-path 红（BUG-207）；删除 → 绿。
 */
describe('退役路径的 git 历史推导（BUG-207）', () => {
  it('解析 rename/delete，跳过 M/COMMIT 行；同一旧路径保留最新一条', () => {
    const output = [
      'COMMIT-aaa',
      'R100\ttools/observe/a.mjs\tprobes/analyze/a-probe.mjs',
      'M\tchecks/keep.mjs',
      'D\ttests/support/old.json',
      'COMMIT-bbb',
      'R100\ttools/observe/a.mjs\tprobes/analyze/stale-probe.mjs',
    ].join('\n')
    const map = parseNameStatus(output)
    expect(map.get('tools/observe/a.mjs')).toBe('probes/analyze/a-probe.mjs')
    expect(map.get('tests/support/old.json')).toBe('')
    expect(map.has('checks/keep.mjs')).toBe(false)
    expect(map.size).toBe(2)
  })

  it('只把已消失的两段目录作为退役前缀，单段目录与仍存在的目录不登记', () => {
    const retired = new Map([
      ['tools/observe/a.mjs', 'probes/analyze/a-probe.mjs'],
      ['dev/env.sh', 'run/env.sh'],
      ['tools/lib/x.mjs', 'checks/lib/x.mjs'],
    ])
    const dirs = retiredDirectoryPrefixes(retired, dir => dir === 'tools/lib/')
    expect(dirs.get('tools/observe/')).toBe('probes/analyze/a-probe.mjs')
    expect(dirs.has('dev/')).toBe(false)
    expect(dirs.has('tools/lib/')).toBe(false)
  })
})
