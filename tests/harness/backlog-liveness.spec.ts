import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { backlogLivenessProblems } from '../../tools/lib/backlog-liveness.mjs'
import { markdownLinkTargets } from '../../tools/lib/markdown-links.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

// Exercise the owning gate's read-only function without running the repository-wide gate runner.
// 2026-10-10：改为直接 import（原先是切 checks/run-gates.mjs 源码 + vm 求值，改一处注释就假红）。
const check = backlogLivenessProblems as (root: string) => string[]

const scratch = join(ROOT, 'node_modules/.cache/company-backlog-liveness')
const pools = ['issues', 'bugs', 'research', 'methods', '_archive/settled_issues',
  '_archive/suspended_issues', '_archive/fixed_bugs', '_archive/suspended_bugs',
  '_archive/research', '_archive/legacy']
let root: string
const put = (path: string, text: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}
const index = (pool: string, path: string) => {
  if (pool.startsWith('_archive/')) {
    const owner = '_archive/README.md'
    put(owner, readFileSync(join(root, owner), 'utf8') + `\n[material](<${pool.slice('_archive/'.length)}/${path}>)\n`)
  } else put(`${pool}/README.md`, `# Index\n\n[material](<${path}>)\n`)
}
const issue = (extra = '') => `---\nstatus: 推敲中\nopened: 2026-10-09\n---\n\n# Issue\n\n${extra}\n`
beforeEach(() => {
  mkdirSync(scratch, { recursive: true })
  root = mkdtempSync(join(scratch, 'fixture-'))
  for (const pool of ['', '_archive', ...pools]) put(`${pool ? `${pool}/` : ''}README.md`, '# Index\n')
})
afterEach(() => {
  if (!resolve(root).startsWith(`${resolve(scratch)}/fixture-`)) throw new Error('unexpected fixture path')
  rmSync(root, { recursive: true, force: true })
})

describe('backlog institution, migrated headers and recursive membership', () => {
  it('accepts valid active cards, research, methods and untouched historical archive', () => {
    put('issues/261009-demo.md', issue())
    index('issues', '261009-demo.md')
    put('bugs/BUG-007-demo.md', '---\nstatus: 活跃\nseverity: P1\nopened: 2026-10-09\n---\n# Bug\n')
    index('bugs', 'BUG-007-demo.md')
    put('research/tech-exploration/2026-10-09-demo.md', '---\ntopic: 技术\nintent: Test the actual route.\n---\n# Research\n')
    index('research', 'tech-exploration/2026-10-09-demo.md')
    put('methods/demo.md', '---\nname: demo\ndescription: A method.\nwhenToUse: Deliberation.\n---\n# Method\n')
    index('methods', 'demo.md')
    for (const pool of pools.filter(pool => pool.startsWith('_archive/'))) {
      put(`${pool}/BUG-001-old.md`, '# Original historical discussion\n')
      index(pool, 'BUG-001-old.md')
    }
    expect(check(root)).toEqual([])
  })

  it('reports a missing README, directory or wrongly shaped path without throwing', () => {
    const target = resolve(root, 'issues/README.md')
    expect(target).toBe(join(root, 'issues/README.md'))
    rmSync(target)
    expect(check(root)).toContain('_backlog/issues/README.md 必需索引缺失或不是文件')
    const pool = resolve(root, '_archive/suspended_bugs')
    expect(pool).toBe(join(root, '_archive/suspended_bugs'))
    rmSync(pool, { recursive: true })
    put('_archive/suspended_bugs', 'wrong shape\n')
    expect(check(root)).toContain('_backlog/_archive/suspended_bugs 制度目录缺失或不是目录')
  })

  it.each([
    ['# no head\n', '缺 frontmatter'],
    ['---\nopened: 2026-10-09\nstatus: 推敲中\n---\n', '首字段须为 status'],
    ['---\nstatus: 已结\nopened: 2026-10-09\n---\n', '不属于此桶'],
    ['---\nstatus: 推敲中\n---\n', '缺 opened'],
    ['---\nstatus: [\n---\n', 'YAML 不可解析'],
    ['---\n- status\n---\n', '须为字段映射'],
  ])('rejects invalid active issue heads: %s', (text, message) => {
    put('issues/demo.md', text)
    index('issues', 'demo.md')
    expect(check(root).some(problem => problem.includes(message))).toBe(true)
  })

  it('requires bug severity and the borrowed method field shape', () => {
    put('bugs/BUG-007-demo.md', '---\nstatus: 活跃\nopened: 2026-10-09\n---\n')
    index('bugs', 'BUG-007-demo.md')
    put('methods/demo.md', '---\nname: wrong\ndescription: ""\n---\n')
    index('methods', 'demo.md')
    const problems = check(root).join('\n')
    for (const message of ['severity', 'name 须匹配文件名', 'description', 'whenToUse']) expect(problems).toContain(message)
  })

  it('does not satisfy two nested materials by basename prose or another bucket link', () => {
    for (const path of ['research/tech-exploration/2026-10-08-same.md', '_archive/research/tech-exploration/2026-10-08-same.md']) put(path, '# Old research\n')
    index('research', '../_archive/research/tech-exploration/2026-10-08-same.md')
    put('_archive/README.md', '# Index\n\n2026-10-08-same.md\n')
    put('_archive/research/README.md', '# Navigation\n\n[material](tech-exploration/2026-10-08-same.md)\n')
    expect(check(root).filter(problem => problem.includes('未被'))).toHaveLength(2)
    index('research', './tech-exploration/2026-10-08-same.md#old-research')
    index('_archive/research', 'tech-exploration/2026-10-08-same.md')
    expect(check(root)).toEqual([])
  })

  it('requires the owner index and enforces research metadata from the effective date', () => {
    put('research/upstream/2026-10-09-demo.md', '# Missing new head\n')
    put('research/upstream/README.md', '# Index\n\n[demo](2026-10-09-demo.md)\n')
    expect(check(root).join('\n')).toContain('缺 frontmatter')
    expect(check(root).join('\n')).toContain('未被 research/README.md')
    index('research', 'upstream/2026-10-09-demo.md')
    put('research/upstream/2026-10-09-demo.md', '---\ntopic: 技术\nintent: |\n  Line one\n  Line two\n---\n')
    expect(check(root).join('\n')).toContain('topic 应与子目录匹配')
    expect(check(root).join('\n')).toContain('单行非空 intent')
    put('research/upstream/2026-10-09-demo.md', '---\ntopic: 上游\nintent: Investigate ownership.\n---\n')
    expect(check(root)).toEqual([])
  })

  it.each(['可关闭：是', '**可关闭：** 是', '关闭条件 = 已满足', '关闭条件判断 = 已通过', '毕业门判断 = 已过'])('rejects an active closure verdict: %s', verdict => {
    put('issues/demo.md', issue(verdict))
    index('issues', 'demo.md')
    expect(check(root).join('\n')).toContain('声明可关闭/关闭条件已满足却仍在活跃区')
  })

  it.each(['可关闭：否', '可关闭：是非未定', '可关闭：是否取决于用户', '关闭条件 = 待确认', '状态：S1 已交付，S2 进行中'])('keeps partial or pending active work: %s', verdict => {
    put('issues/demo.md', issue(verdict))
    index('issues', 'demo.md')
    expect(check(root)).toEqual([])
  })

  it('ignores closure wording quoted in historical body after the header', () => {
    put('issues/demo.md', issue('可关闭：否') + '\n'.repeat(12) + '## 历史讨论\n旧记录写可关闭：是\n')
    index('issues', 'demo.md')
    expect(check(root)).toEqual([])
  })
})
