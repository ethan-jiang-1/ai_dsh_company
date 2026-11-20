// 负例留证 2026-11-20：这五条都是「修法被回退」的静态反证；每条的原始红都已在真入口上见过，
// 这里只需要把修法删回去即可复现：
// 负例留证 2026-11-20：删掉 company.mjs 里 `mkdirSync(home, { recursive: true })` 一行 ⇒ BUG-283 用例红（真实现象：home 不存在时 exit null、空 stderr）。
// 负例留证 2026-11-20：删掉 `for (const signal of ['SIGINT','SIGTERM','SIGHUP'])` 块 ⇒ BUG-284 用例红（真实现象：kill wrapper 后子进程存活并持 writer lease，下一次启动报「公司数据已停写」）。
// 负例留证 2026-11-20：把升级守卫改回 `bundle 身份保留创建版本` ⇒ BUG-285 用例红（真实现象：lane 报 1 FAILURE「身份保留创建版本 0.11.9（0.11.10）」）。
// 负例留证 2026-11-20：把任一可访问名改回 `name: 'Search sessions'` 等英文单语 ⇒ BUG-287 用例红（真实现象：默认 zh 档 attention-e2e 15s 超时）。
// 负例留证 2026-11-20：把 JOURNAL_GAP 改回 `join(REHEARSAL, 'journal', 'gift-rule-gap.md')` ⇒ BUG-289 用例红（真实现象：连续两样本 2 FAILURE，而产品其实写对了 `.dsh-company/kb/ceo/journal/`）。
/**
 * dev 入口与真入口车道的回归守卫（2026-11-20 端到端验收轮）。
 *
 * 为什么是静态守卫而不是行为测试：这些缺陷都住在「只有真进程/真浏览器才跑得到」的入口脚本里，
 * 而 tests/** 被 layering 守卫禁止 import `node:child_process`、也禁止驱动 checks/probes 的入口脚本。
 * 所以这里钉的是**修法本身还在**：删掉 mkdir、删掉信号转发、把可访问名改回英文、把 journal 路径
 * 退回 workspace 根——任何一条回退，对应用例就红。行为面证据仍归各自的真入口车道（注释里点名）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8')

describe('dev 入口与车道：修法不回退（行为证据归真入口车道）', () => {
  it('BUG-283：--home 缺失时先建目录，并点名 spawn 失败（行为证据 = 真起一个不存在的 home）', () => {
    const source = read('tools/dev/company.mjs')
    const init = source.indexOf("console.log('company(dev): 缺 company profile")
    const mkdir = source.indexOf('mkdirSync(home, { recursive: true })')
    const spawnCall = source.indexOf("[cli, '--profile', 'company', '--from-default-profile', 'web'")
    expect(init, '初始化分支还在').toBeGreaterThan(-1)
    expect(mkdir, '先建 home，否则子进程 cwd 不存在 ⇒ exit null 无诊断').toBeGreaterThan(init)
    expect(spawnCall).toBeGreaterThan(mkdir)
    expect(source).toContain('子进程未能启动')
  })

  it('BUG-284：包装进程把 SIGINT/SIGTERM/SIGHUP 转给 dsh 子进程（行为证据 = kill wrapper 后子进程随之退出）', () => {
    const source = read('tools/dev/company.mjs')
    const handler = source.slice(source.indexOf("for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])"), source.indexOf('const tee ='))
    expect(handler, '信号转发块还在').not.toBe('')
    expect(handler).toContain('child.kill(signal)')
    expect(source, '注释必须说明孤儿会持 writer lease').toContain('writer lease')
  })

  it('BUG-285：升级守卫断言现行身份语义（id/createdAt 保留 + pack.version 跟随 + v3 备份）', () => {
    const lane = read('checks/lanes/upgrade-while-running.entry.mjs')
    expect(lane).toContain('bundle 身份保留 id/createdAt')
    expect(lane).toContain('bundle pack.version 跟到')
    expect(lane).toContain('bundle.json.v3-')
    expect(lane, '旧的「保留创建版本」断言已废止（BUG-256 起版本跟随升级）').not.toContain('bundle 身份保留创建版本')
  })

  it('BUG-287：探针/车道不得再写死英文可访问名（默认 zh 产品档会整批超时）', () => {
    const offenders: string[] = []
    for (const rel of ['probes/lib/probe-window.mjs', 'checks/lanes/attention-e2e.entry.mjs', 'checks/lanes/human-loop-e2e.entry.mjs', 'probes/browser-visual/tasks-panel-probe.mjs']) {
      const text = read(rel)
      for (const literal of ["'Search sessions'", "'Chat'", "'Open right sidebar'", "'Allow once'"]) {
        if (text.includes(`name: ${literal}`)) offenders.push(`${rel}: ${literal}`)
      }
    }
    expect(offenders, '可访问名必须双语正则').toEqual([])
    expect(read('probes/lib/probe-window.mjs')).toContain('Search sessions|搜索会话')
  })

  it('BUG-289：human-loop 的 journal 判据指向 v3 公司盘（产品写对、判据看对地方）', () => {
    const lane = read('checks/lanes/human-loop-e2e.entry.mjs')
    const line = lane.split('\n').find(text => text.includes('const JOURNAL_GAP')) ?? ''
    expect(line, 'journal 判据行还在').not.toBe('')
    expect(line).toContain("'.dsh-company'")
    expect(line).toContain("'journal'")
    expect(line, '退回 workspace 根的旧路径 = 假红').not.toBe("const JOURNAL_GAP = join(REHEARSAL, 'journal', 'gift-rule-gap.md')")
  })
})
