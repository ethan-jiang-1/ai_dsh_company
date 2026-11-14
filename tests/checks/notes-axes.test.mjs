// 状态：常驻
// 何时跑：改 notes-axes 门禁后；`pnpm test:checks`（pre-push 也跑）。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { axisProblems, run as runNotesAxes } from '../../checks/gates/notes-axes.mjs'

const note = (body) => `状态：implemented\n\n## 决定\n做。\n\n## 未覆盖轴\n${body}\n`

test('四分类前缀 + 真实仓库反引号路径或有效相对链接 → 绿', () => {
  const okBody = [
    '- [covered] 跨行 span 已对齐 → `packages/company-pack/src/lib/markdown-shape-core.js`',
    '- [environment-gap] Windows 真机待触发 → [triggers](../../_backlog/triggers.md)',
    '- [policy] 存量不回填 → `checks/gates/notes-axes.mjs:18`',
    '- [unprovable] 静态门不证历史执行 → `.agents/skills/close-out-definition/SKILL.md#L1`',
  ].join('\n')
  assert.deepEqual(axisProblems(note(okBody), 'notes/implemented/2026-11-14-ok.md'), [])
})

test('缺四分类前缀或写了非法分类名 → 红', () => {
  assert.match(axisProblems(note('- 跨行 span 残余 → `docs/testing.md`'), 'x.md').join(), /四分类前缀/)
  assert.match(axisProblems(note('- [later] 跨行 span 残余 → `docs/testing.md`'), 'x.md').join(), /四分类前缀/)
})

test('写空头支票「决定：留后续卡」或指向不存在的文件 → 红', () => {
  assert.match(axisProblems(note('- [policy] 4 消费者差分 → 决定：留后续卡'), 'x.md').join(), /右侧缺盘上真实文件锚点/)
  assert.match(axisProblems(note('- [covered] 假文件 → `tests/does-not-exist-ever.spec.ts`'), 'x.md').join(), /右侧缺盘上真实文件锚点/)
  assert.match(axisProblems(note('- [covered] 假链接 → [missing](./no-such-note.md)'), 'x.md').join(), /右侧缺盘上真实文件锚点/)
})

test('条目没有 → 去向 / → 后为空 / 空节 / 缺节 / 围栏假节 → 红', () => {
  assert.match(axisProblems(note('- [policy] 以后再说'), 'x.md').join(), /没有 → 去向/)
  assert.match(axisProblems(note('- [policy] 无 →'), 'x.md').join(), /→ 后没有去向/)
  assert.match(axisProblems(note(''), 'x.md').join(), /没有顶层条目/)
  assert.match(axisProblems('状态：implemented\n\n## 决定\n做。', 'x.md').join(), /缺「## 未覆盖轴」/)
  assert.match(axisProblems('```md\n## 未覆盖轴\n- [covered] x → `docs/testing.md`\n```\n', 'x.md').join(), /缺「## 未覆盖轴」/)
})

test('run 同时扫描 notes/implemented 与前向 notes/archived（迁入归档不逃逸）', () => {
  const root = mkdtempSync(join(tmpdir(), 'notes-axes-'))
  try {
    mkdirSync(join(root, 'notes/implemented'), { recursive: true })
    mkdirSync(join(root, 'notes/archived/receipts'), { recursive: true })
    mkdirSync(join(root, 'docs'), { recursive: true })
    writeFileSync(join(root, 'docs/policy.md'), '# policy\n')
    writeFileSync(join(root, 'notes/implemented/2026-11-14-good.md'), note('- [policy] 边界 → `docs/policy.md`'))
    writeFileSync(join(root, 'notes/archived/2026-11-13-old-exempt.md'), '状态：implemented\n')
    writeFileSync(join(root, 'notes/archived/receipts/2026-11-14-receipt.md'), 'receipt\n')
    writeFileSync(join(root, 'notes/archived/2026-11-14-escaped.md'), note('- [policy] 迁入归档逃逸 → 决定：留后续卡'))

    const problems = []
    runNotesAxes({ root, ok: () => {}, fail: (_name, detail) => problems.push(detail) })
    assert.match(problems.join(), /notes\/archived\/2026-11-14-escaped\.md.*右侧缺盘上真实文件锚点/)

    writeFileSync(join(root, 'notes/archived/2026-11-14-escaped.md'), note('- [policy] 已锚定 → [policy](../../docs/policy.md)'))
    const problemsAfter = []
    let okMsg = ''
    runNotesAxes({ root, ok: msg => { okMsg = msg }, fail: (_name, detail) => problemsAfter.push(detail) })
    assert.deepEqual(problemsAfter, [])
    assert.match(okMsg, /新 Note 2 篇/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
