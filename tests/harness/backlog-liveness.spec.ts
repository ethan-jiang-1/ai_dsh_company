import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
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
// 研究题自 2026-10-30 起由自己的 shelf 索引（一题一行）持有；其余归档池共用 _archive/README.md。
const index = (pool: string, path: string) => {
  if (pool.endsWith('research')) return put(`${pool}/README.md`, `# Index\n\n[topic](<${path}>)\n`)
  if (pool.startsWith('_archive/')) {
    const owner = '_archive/README.md'
    put(owner, readFileSync(join(root, owner), 'utf8') + `\n[material](<${pool.slice('_archive/'.length)}/${path}>)\n`)
  } else put(`${pool}/README.md`, `# Index\n\n[material](<${path}>)\n`)
}
// 题名页正例：三行名头 + 材料表；归档题名页另带 `> 归档：` 行。
const banner = ({ archive, lines = [] }: { archive?: string; lines?: string[] } = {}) => [
  '# Topic', '',
  '> 问题：这轮研究回答什么',
  '> 消费者：—',
  '> 产出的卡：—',
  ...(archive ? [`> 归档：${archive}`] : []),
  '', '## 材料', '', ...lines, '',
].join('\n')
// 2026-10-12（借鉴卡落地）：夹具带上 > 状态行（立卡/状态/类型/毕业/可关闭）——镜像互查与
// 「毕业：」封闭头是活状态门禁的一部分，正例夹具必须长成现行模板的样子。
const issue = (extra = '', status = '推敲中', graduation = '未定') =>
  `---\nstatus: ${status}\nopened: 2026-10-09\n---\n\n# Issue\n\n> 立卡：2026-10-09 ｜ 状态：${status} ｜ 类型：Task ｜ 毕业：${graduation} ｜ 可关闭：否\n\n${extra}\n`
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
    put('bugs/BUG-007-demo.md', '---\nstatus: 调查中\nseverity: P1\nopened: 2026-10-09\n---\n\n# Bug\n\n> 严重级别：P1（重要）｜发现：2026-10-09｜状态：调查中\n')
    index('bugs', 'BUG-007-demo.md')
    put('research/tech-exploration/2026-10-09-demo.md', '---\ntopic: 技术\nintent: Test the actual route.\n---\n# Research\n')
    put('research/tech-exploration/README.md', banner({ lines: ['- [demo](2026-10-09-demo.md)'] }))
    index('research', 'tech-exploration/README.md')
    put('methods/demo.md', '---\nname: demo\ndescription: A method.\nwhenToUse: Deliberation.\n---\n# Method\n')
    index('methods', 'demo.md')
    for (const pool of pools.filter(pool => pool.startsWith('_archive/') && !pool.endsWith('research'))) {
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
    put('bugs/BUG-007-demo.md', '---\nstatus: 调查中\nopened: 2026-10-09\n---\n\n# Bug\n\n> 严重级别：P1（重要）｜发现：2026-10-09｜状态：调查中\n')
    index('bugs', 'BUG-007-demo.md')
    put('methods/demo.md', '---\nname: wrong\ndescription: ""\n---\n')
    index('methods', 'demo.md')
    const problems = check(root).join('\n')
    for (const message of ['severity', 'name 须匹配文件名', 'description', 'whenToUse']) expect(problems).toContain(message)
  })

  // 2026-10-30（研究题模型）：材料由题名页按解析后路径逐份点名；散文提及不算，跨桶链接也不算。
  it('does not satisfy nested materials by basename prose or another bucket link', () => {
    for (const path of ['research/tech-exploration/2026-10-08-same.md', '_archive/research/tech-exploration/2026-10-08-same.md']) put(path, '# Old research\n')
    put('research/tech-exploration/README.md', banner({ lines: ['- 2026-10-08-same.md（散文点名，不算链接）'] }))
    put('_archive/research/tech-exploration/README.md', banner({ archive: '2026-10-09', lines: ['- 2026-10-08-same.md'] }))
    put('research/README.md', '# Index\n\n[topic](<tech-exploration/README.md>)\n')
    put('_archive/research/README.md', '# Index\n\n')
    put('_archive/README.md', '# Index\n\n[same](research/tech-exploration/2026-10-08-same.md)\n')
    const problems = check(root)
    expect(problems.filter(problem => problem.includes('未被'))).toHaveLength(1)
    expect(problems.filter(problem => problem.includes('未在题名页'))).toHaveLength(2)
    // 修好两级链接（题名页点名材料 + 归档 shelf 索引点名题名页）后才绿。
    put('research/tech-exploration/README.md', banner({ lines: ['- [same](2026-10-08-same.md)'] }))
    put('_archive/research/tech-exploration/README.md', banner({ archive: '2026-10-09', lines: ['- [same](2026-10-08-same.md)'] }))
    put('_archive/research/README.md', '# Index\n\n[topic](<tech-exploration/README.md>)\n')
    expect(check(root)).toEqual([])
  })

  // 2026-10-30（研究题模型）：题名页是形状锚——三行名头必须在；归档题名页另须归档日。
  it('requires a research banner with its three header lines and the archive date', () => {
    put('research/no-banner/2026-10-09-a.md', '---\ntopic: 技术\nintent: A.\n---\n')
    put('research/missing-line/2026-10-09-b.md', '---\ntopic: 技术\nintent: B.\n---\n')
    put('research/missing-line/README.md', '# Topic\n\n> 问题：q\n> 消费者：—\n\n## 材料\n\n- [b](2026-10-09-b.md)\n')
    put('_archive/research/no-archive-date/2026-10-09-c.md', '---\ntopic: 技术\nintent: C.\n---\n')
    put('_archive/research/no-archive-date/README.md', banner({ lines: ['- [c](2026-10-09-c.md)'] }))
    put('_archive/research/README.md', '# Index\n\n[no-archive-date](<no-archive-date/README.md>)\n')
    const problems = check(root).join('\n')
    expect(problems).toContain('_backlog/research/no-banner/README.md 缺题名页')
    expect(problems).toContain('_backlog/research/missing-line/README.md:1 缺「> 产出的卡：」行')
    expect(problems).toContain('_backlog/_archive/research/no-archive-date/README.md:1 缺「> 归档：YYYY-MM-DD」行')
  })

  // 2026-10-30：shelf 根只放索引；散件会让"研究题"这个概念失效。
  it('keeps the research shelf root free of flat material and links the banner', () => {
    put('research/2026-10-09-loose.md', '---\ntopic: 技术\nintent: Loose.\n---\n')
    put('research/topic/2026-10-09-inside.md', '---\ntopic: 技术\nintent: Inside.\n---\n')
    put('research/topic/README.md', banner({ lines: ['- [inside](2026-10-09-inside.md)'] }))
    index('research', 'topic/2026-10-09-inside.md')
    const problems = check(root).join('\n')
    expect(problems).toContain('平铺在 shelf 根')
    expect(problems).toContain('_backlog/research/topic/README.md 未被 research/README.md 索引链接点名')
  })

  // 2026-10-30（复核补强）：题目录按目录枚举——只有资产、没有任何 .md 的目录同样要求题名页。
  it('requires a banner for every topic directory, including asset-only ones', () => {
    put('research/asset-only/pic.png', 'png')
    put('_archive/research/asset-only-2/pic.png', 'png')
    const problems = check(root).join('\n')
    expect(problems).toContain('_backlog/research/asset-only/README.md 缺题名页')
    expect(problems).toContain('_backlog/_archive/research/asset-only-2/README.md 缺题名页')
  })

  // 2026-10-30（复核补强）：符号链接 .md 与 markdown-links 的源文件 walker 同口径纳入校验。
  it('follows symlinked material files instead of silently skipping them', () => {
    put('outside/2026-10-09-target.md', '# no head\n')
    mkdirSync(join(root, 'research/linked'), { recursive: true })
    symlinkSync(join(root, 'outside/2026-10-09-target.md'), join(root, 'research/linked/2026-10-09-link.md'))
    put('research/linked/README.md', banner({ lines: ['- [link](2026-10-09-link.md)'] }))
    index('research', 'linked/README.md')
    expect(check(root).join('\n')).toContain('_backlog/research/linked/2026-10-09-link.md:1 缺 frontmatter')
  })

  it('requires the owner index and enforces research metadata from the effective date', () => {
    put('research/upstream/2026-10-09-demo.md', '# Missing new head\n')
    put('research/upstream/README.md', banner({ lines: ['- [demo](2026-10-09-demo.md)'] }))
    index('research', 'upstream/README.md')
    expect(check(root).join('\n')).toContain('缺 frontmatter')
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

  // 2026-10-12（借鉴卡落地）：状态行↔frontmatter 镜像互查 + 「毕业：」封闭头——负例控制。
  it('enforces the line↔frontmatter mirror and the graduation closed head on active issues', () => {
    put('issues/mirror.md', '---\nstatus: 推敲中\nopened: 2026-10-09\n---\n\n# Issue\n\n> 立卡：2026-10-09 ｜ 状态：等人拍板 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否\n')
    put('issues/noline.md', '---\nstatus: 推敲中\nopened: 2026-10-09\n---\n\n# Issue\n\n正文没有状态行。\n')
    put('issues/nograd.md', '---\nstatus: 推敲中\nopened: 2026-10-09\n---\n\n# Issue\n\n> 立卡：2026-10-09 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否\n')
    put('issues/badgrad.md', '---\nstatus: 推敲中\nopened: 2026-10-09\n---\n\n# Issue\n\n> 立卡：2026-10-09 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：马上做 ｜ 可关闭：否\n')
    put('issues/README.md', '# Index\n\n' + ['mirror.md', 'noline.md', 'nograd.md', 'badgrad.md'].map(name => `[material](<${name}>)`).join('\n') + '\n')
    const problems = check(root).join('\n')
    expect(problems).toContain('状态行「等人拍板」与 frontmatter「推敲中」不一致（镜像互查）')
    expect(problems).toContain('缺状态行')
    expect(problems).toContain('状态行缺「毕业：」字段')
    expect(problems).toContain('「毕业：马上做」头不在封闭集')
  })

  // 2026-10-12：缺陷轨「活跃」→「调查中」改名 + 三新值；修复就绪缺 ## 已修判定如实不查（验收在场族按用户裁定延后）。
  // 注：index() 对活跃池是覆写不是追加——多卡时一次写全索引。
  it('renames the bug active value, accepts the new bug enums with mirrored lines, defers acceptance presence', () => {
    put('bugs/BUG-013-old.md', '---\nstatus: 活跃\nseverity: P2\nopened: 2026-10-09\n---\n\n# Bug\n\n> 严重级别：P2（次要）｜发现：2026-10-09｜状态：活跃\n')
    index('bugs', 'BUG-013-old.md')
    expect(check(root).join('\n')).toContain('status "活跃" 不属于此桶')
    for (const [id, value] of [['014', '调查中'], ['015', '修复就绪'], ['016', '修复已落地'], ['017', '等人拍板']]) {
      put(`bugs/BUG-${id}-demo.md`, `---\nstatus: ${value}\nseverity: P2\nopened: 2026-10-09\n---\n\n# Bug\n\n> 严重级别：P2（次要）｜发现：2026-10-09｜状态：${value}\n`)
    }
    put('bugs/README.md', '# Index\n\n' + ['BUG-013-old.md', 'BUG-014-demo.md', 'BUG-015-demo.md', 'BUG-016-demo.md', 'BUG-017-demo.md'].map(name => `[material](<${name}>)`).join('\n') + '\n')
    expect(check(root).filter(problem => problem.includes('BUG-0'))).toEqual(['_backlog/bugs/BUG-013-old.md:2 status "活跃" 不属于此桶'])
  })

  // 2026-10-25（交接契约）：归档「毕业：做」卡必须留下 durable 去向；老卡祖父豁免。
  // 反证：no-destination → 红；with-destination → 绿；2026-10-24 old → 不红。
  it('requires a destination on freshly archived do-cards and grandfathers older cards', () => {
    const archived = (date, graduation, extra = '') =>
      `---\nstatus: 已结\nopened: ${date}\n---\n\n# Issue\n\n> 立卡：${date} ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：${graduation} ｜ 可关闭：是\n${extra}\n`
    put('_archive/settled_issues/2026-10-25-no-destination.md', archived('2026-10-25', '做'))
    put('_archive/settled_issues/2026-10-25-with-destination.md', archived('2026-10-25', '做', '\n> **结论/去向**：Note -> notes/implemented/2026-10-25-demo.md'))
    put('_archive/settled_issues/2026-10-24-old.md', archived('2026-10-24', '做'))
    for (const name of ['2026-10-25-no-destination.md', '2026-10-25-with-destination.md', '2026-10-24-old.md']) index('_archive/settled_issues', name)
    const problems = check(root).join('\n')
    expect(problems).toContain('_backlog/_archive/settled_issues/2026-10-25-no-destination.md:1 归档「毕业：做」卡缺去向')
    expect(problems).not.toContain('2026-10-25-with-destination')
    expect(problems).not.toContain('2026-10-24-old')
  })
})
