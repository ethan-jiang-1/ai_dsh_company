// 状态：常驻
// 何时跑：改 `checks/gates/ledger-routing.mjs` 判据或 `docs/reference/decisions.md` 结构后；`pnpm test:checks`（秒级、keyless）。
// 跑法：`node tests/checks/ledger-routing.test.mjs`
//
// 为什么：把双表分离（现行决定 / 已退役）、`<a id="dN"></a>DN` 行锚点、单格 ≤100 字、表外散文 ≤10 行、
// 现行表禁删除线与退役残留、跨表 D1..Dmax 唯一连续及家链接可解析逐条钉成独立回归用例。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ledgerRoutingProblems } from '../../checks/gates/ledger-routing.mjs'

function buildLedger({
  introLines = ['> 什么时候读：查 D 号路由。', '本表只做路由，决定正文住 Note。'],
  activeRows,
  retiredRows,
  sections = ['现行决定', '已退役'],
} = {}) {
  const defaultActive = []
  for (let n = 1; n <= 20; n += 1) {
    defaultActive.push(`| <a id="d${String(n)}"></a>D${String(n)} | 现行决定第 ${String(n)} 条 | [Note](../../notes/implemented/note.md) |`)
  }
  const defaultRetired = [
    '| <a id="d21"></a><a id="d22"></a>D21+D22 | 合并退役决定（由 D10 取代） | [旧 Note](../../notes/archived/old.md) · [D10](#d10) |',
    '| <a id="d23"></a>D23 | 退役决定二十三 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d24"></a>D24 | 退役决定二十四 | [旧 Note](../../notes/archived/old.md) |',
  ]
  const act = activeRows ?? defaultActive
  const ret = retiredRows ?? defaultRetired
  const parts = ['# 决策台账（路由表）', '', ...introLines, '']
  if (sections[0]) {
    parts.push(`## ${sections[0]}`, '', '| # | 一句话 | 决定的家 |', '|---|---|---|', ...act, '')
  }
  if (sections[1]) {
    parts.push(`## ${sections[1]}`, '', '| # | 一句话 | 决定的家 |', '|---|---|---|', ...ret, '')
  }
  return `${parts.join('\n')}\n`
}

function makeTree(ledgerContent) {
  const root = mkdtempSync(join(tmpdir(), 'ledger-routing-'))
  const write = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  write('notes/implemented/note.md', '# note\n')
  write('notes/archived/old.md', '# old\n')
  if (ledgerContent !== null) {
    write('docs/reference/decisions.md', ledgerContent)
  }
  return root
}

test('基线：合法双表台账（含合并行锚点与 #dN 内部跳转）→ 零问题，且追加新 D 号无需改常量', () => {
  const root = makeTree(buildLedger())
  try {
    const res = ledgerRoutingProblems(root)
    assert.deepEqual(res.problems, [])
    assert.equal(res.activeCount, 20)
    assert.equal(res.retiredCount, 3)
    assert.equal(res.totalIds, 24)
  } finally { rmSync(root, { recursive: true, force: true }) }

  const appendedActive = []
  for (let n = 1; n <= 20; n += 1) {
    appendedActive.push(`| <a id="d${String(n)}"></a>D${String(n)} | 现行决定 ${String(n)} | [Note](../../notes/implemented/note.md) |`)
  }
  appendedActive.push('| <a id="d25"></a>D25 | 新增第 25 号决定无需改任何门禁常量 | [Note](../../notes/implemented/note.md) |')
  const root2 = makeTree(buildLedger({ activeRows: appendedActive }))
  try {
    assert.deepEqual(ledgerRoutingProblems(root2).problems, [])
  } finally { rmSync(root2, { recursive: true, force: true }) }
})

test('文件缺失：报「不在盘上」且不抛异常', () => {
  const root = makeTree(null)
  try {
    const res = ledgerRoutingProblems(root)
    assert.equal(res.problems.length, 1)
    assert.match(res.problems[0], /不在盘上/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('表外散文超过 10 行、混入代码块/frontmatter/HTML 块或出现 H3+ 标题 → 红', () => {
  const introLines = Array.from({ length: 11 }, (_, idx) => `第 ${String(idx + 1)} 行表外散文。`)
  const rootProse = makeTree(buildLedger({ introLines }))
  const rootCode = makeTree(buildLedger({ introLines: ['```md', '膨胀代码块', '```'] }))
  const rootH3 = makeTree(buildLedger({ introLines: ['### 非法三级标题'] }))
  try {
    assert.match(ledgerRoutingProblems(rootProse).problems.join('；'), /表外散文 11 行超上限 10 行/)
    assert.match(ledgerRoutingProblems(rootCode).problems.join('；'), /不许出现代码块、块级 HTML 或 frontmatter/)
    assert.match(ledgerRoutingProblems(rootH3).problems.join('；'), /不许出现三级及以下标题/)
  } finally {
    rmSync(rootProse, { recursive: true, force: true })
    rmSync(rootCode, { recursive: true, force: true })
    rmSync(rootH3, { recursive: true, force: true })
  }
})

test('四列行（含闭合与漏行尾竖线四列）或三列缺行尾闭合竖线 → 红', () => {
  const fourColClosed = []
  const fourColUnclosed = []
  const threeColUnclosed = []
  for (let n = 1; n <= 20; n += 1) {
    const base = `| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | [Note](../../notes/implemented/note.md) |`
    fourColClosed.push(n === 2 ? `${base} 第四列 |` : base)
    fourColUnclosed.push(n === 2 ? `${base} 第四列塞入超长正文与 ~~删除线~~` : base)
    threeColUnclosed.push(n === 2 ? `| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | [Note](../../notes/implemented/note.md)` : base)
  }
  const r1 = makeTree(buildLedger({ activeRows: fourColClosed }))
  const r2 = makeTree(buildLedger({ activeRows: fourColUnclosed }))
  const r3 = makeTree(buildLedger({ activeRows: threeColUnclosed }))
  try {
    assert.match(ledgerRoutingProblems(r1).problems.join('；'), /行必须是闭合三列.*（4 列）/)
    assert.match(ledgerRoutingProblems(r2).problems.join('；'), /行必须是闭合三列.*（4 列，缺行尾闭合竖线）/)
    assert.match(ledgerRoutingProblems(r3).problems.join('；'), /行必须是闭合三列.*（3 列，缺行尾闭合竖线）/)
  } finally {
    rmSync(r1, { recursive: true, force: true })
    rmSync(r2, { recursive: true, force: true })
    rmSync(r3, { recursive: true, force: true })
  }
})

test('二级标题缺失或顺序颠倒 → 红', () => {
  const root = makeTree(buildLedger({ sections: ['已退役', '现行决定'] }))
  try {
    assert.match(ledgerRoutingProblems(root).problems.join('；'), /二级标题须依次为「## 现行决定」「## 已退役」/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('表内空行切裂表格 → 红', () => {
  const rows = []
  for (let n = 1; n <= 20; n += 1) {
    rows.push(`| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | [Note](../../notes/implemented/note.md) |`)
    if (n === 10) rows.push('')
  }
  const root = makeTree(buildLedger({ activeRows: rows }))
  try {
    assert.match(ledgerRoutingProblems(root).problems.join('；'), /表内出现空行或表尾有游离管道行/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('首列缺锚点、锚点与 D 号不一致或带前导零 → 红', () => {
  const rows = []
  const zeroRows = []
  for (let n = 1; n <= 20; n += 1) {
    rows.push(n === 5
      ? '| D5 | 缺锚点行 | [Note](../../notes/implemented/note.md) |'
      : `| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | [Note](../../notes/implemented/note.md) |`)
    zeroRows.push(n === 5
      ? '| <a id="d05"></a>D5 | 前导零锚点 | [Note](../../notes/implemented/note.md) |'
      : `| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | [Note](../../notes/implemented/note.md) |`)
  }
  const root = makeTree(buildLedger({ activeRows: rows }))
  const rootZero = makeTree(buildLedger({ activeRows: zeroRows }))
  try {
    assert.match(ledgerRoutingProblems(root).problems.join('；'), /首列须带匹配的行锚点/)
    assert.match(ledgerRoutingProblems(rootZero).problems.join('；'), /首列须带匹配的行锚点/)
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(rootZero, { recursive: true, force: true })
  }
})

test('单格超 100 字或现行表残留删除线/已退役标记 → 红', () => {
  const longRows = []
  const dirtyRows = []
  for (let n = 1; n <= 20; n += 1) {
    longRows.push(`| <a id="d${String(n)}"></a>D${String(n)} | ${n === 3 ? '字'.repeat(105) : `现行 ${String(n)}`} | [Note](../../notes/implemented/note.md) |`)
    dirtyRows.push(`| <a id="d${String(n)}"></a>D${String(n)} | ${n === 4 ? '~~旧机制~~ 改新机制' : `现行 ${String(n)}`} | [Note](../../notes/implemented/note.md) |`)
  }
  const rootLong = makeTree(buildLedger({ activeRows: longRows }))
  const rootDirty = makeTree(buildLedger({ activeRows: dirtyRows }))
  try {
    assert.match(ledgerRoutingProblems(rootLong).problems.join('；'), /105 字符/)
    assert.match(ledgerRoutingProblems(rootDirty).problems.join('；'), /含删除线或已退役\/历史残留/)
  } finally {
    rmSync(rootLong, { recursive: true, force: true })
    rmSync(rootDirty, { recursive: true, force: true })
  }
})

test('决定的家无真实文件链接、断链或 #fragment 内部锚点悬空/非法 → 红', () => {
  const noLinkRows = []
  const brokenFragRows = []
  const weirdFragRows = []
  for (let n = 1; n <= 20; n += 1) {
    noLinkRows.push(`| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | ${n === 2 ? '纯文字无链接' : '[Note](../../notes/implemented/note.md)'} |`)
    brokenFragRows.push(`| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | ${n === 2 ? '[Note](../../notes/implemented/note.md) · [D99](#d99)' : '[Note](../../notes/implemented/note.md)'} |`)
    weirdFragRows.push(`| <a id="d${String(n)}"></a>D${String(n)} | 现行 ${String(n)} | ${n === 2 ? '[Note](../../notes/implemented/note.md) · [鬼锚点](#nonexistent)' : '[Note](../../notes/implemented/note.md)'} |`)
  }
  const rootNoLink = makeTree(buildLedger({ activeRows: noLinkRows }))
  const rootBrokenFrag = makeTree(buildLedger({ activeRows: brokenFragRows }))
  const rootWeirdFrag = makeTree(buildLedger({ activeRows: weirdFragRows }))
  try {
    assert.match(ledgerRoutingProblems(rootNoLink).problems.join('；'), /缺可解析文件链接或目标不存在/)
    assert.match(ledgerRoutingProblems(rootBrokenFrag).problems.join('；'), /台账内部锚点引用不存在或格式非法.*#d99/)
    assert.match(ledgerRoutingProblems(rootWeirdFrag).problems.join('；'), /台账内部锚点引用不存在或格式非法.*#nonexistent/)
  } finally {
    rmSync(rootNoLink, { recursive: true, force: true })
    rmSync(rootBrokenFrag, { recursive: true, force: true })
    rmSync(rootWeirdFrag, { recursive: true, force: true })
  }
})

test('跨表重号、断档跳号或表内逆序 → 各自报红', () => {
  const dupRetired = [
    '| <a id="d20"></a>D20 | 与现行表重号 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d21"></a><a id="d22"></a>D21+D22 | 合并退役 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d23"></a>D23 | 退役二十三 | [旧 Note](../../notes/archived/old.md) |',
  ]
  const gapRetired = [
    '| <a id="d21"></a><a id="d22"></a>D21+D22 | 合并退役 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d23"></a>D23 | 退役二十三 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d25"></a>D25 | 跳过 D24 | [旧 Note](../../notes/archived/old.md) |',
  ]
  const disorderRetired = [
    '| <a id="d23"></a>D23 | 先写 23 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d21"></a><a id="d22"></a>D21+D22 | 后写 21 | [旧 Note](../../notes/archived/old.md) |',
    '| <a id="d24"></a>D24 | 退役二十四 | [旧 Note](../../notes/archived/old.md) |',
  ]
  const rootDup = makeTree(buildLedger({ retiredRows: dupRetired }))
  const rootGap = makeTree(buildLedger({ retiredRows: gapRetired }))
  const rootDisorder = makeTree(buildLedger({ retiredRows: disorderRetired }))
  try {
    assert.match(ledgerRoutingProblems(rootDup).problems.join('；'), /D 号跨表必须全局唯一.*D20/)
    assert.match(ledgerRoutingProblems(rootGap).problems.join('；'), /编号断档.*缺 D24/)
    assert.match(ledgerRoutingProblems(rootDisorder).problems.join('；'), /各表内部编号必须严格递增/)
  } finally {
    rmSync(rootDup, { recursive: true, force: true })
    rmSync(rootGap, { recursive: true, force: true })
    rmSync(rootDisorder, { recursive: true, force: true })
  }
})
