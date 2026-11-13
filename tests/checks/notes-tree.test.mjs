// 状态：常驻
// 何时跑：改 `checks/gates/notes-tree.mjs` 的判据后；`pnpm test:checks`（pre-push 也跑）。秒级、keyless。
// 跑法：`node tests/checks/notes-tree.test.mjs`
//
// 为什么：真树红证在门禁头注（2026-11-14 七组植入），但那只证明「今天会红一次」。本文件用临时树
// 把每条判据钉成可回归形状——判据被改动时，这里先红，不靠下一次真树审计发现。
// 为什么在 tests/checks/ 而不是 tests/：门禁读的是根驱动面（checks/gates），门禁自测统一住这里
// （同一发现器 = `tools/run-check-tests.mjs`，文件即清单）。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import * as gate from '../../checks/gates/notes-tree.mjs'

const LIFECYCLES = ['proposed', 'implemented', 'rejected']

/** 建一棵合法的最小 notes 树；返回根。 */
function makeTree() {
  const root = mkdtempSync(join(tmpdir(), 'notes-tree-'))
  mkdirSync(join(root, 'notes/archived/receipts'), { recursive: true })
  for (const lifecycle of LIFECYCLES) mkdirSync(join(root, 'notes', lifecycle), { recursive: true })
  writeFileSync(join(root, 'notes/README.md'), '# notes\n')
  writeFileSync(join(root, 'notes/AGENTS.md'), '# 门牌\n')
  writeFileSync(join(root, 'notes/archived/README.md'), '# archived\n')
  writeFileSync(join(root, 'notes/archived/receipts/README.md'), '# receipts\n')
  return root
}

const write = (root, rel, text = '# note\n') => {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
}

const treeHas = (root, needle) => gate.notesTreeProblems(root).problems.some(problem => problem.includes(needle))
const statusHas = (root, needle) => gate.notesStatusProblems(root).problems.some(problem => problem.includes(needle))

let failures = 0
const check = (label, passed) => {
  if (!passed) failures += 1
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
}

// ── 基线：合法树零问题 ──────────────────────────────────────────────────────────
{
  const root = makeTree()
  try {
    check('基线：合法树 → 零问题', gate.notesTreeProblems(root).problems.length === 0 && gate.notesStatusProblems(root).problems.length === 0)
    check('基线：文件计数 > 0', gate.notesTreeProblems(root).files > 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

// ── 形状判据 ───────────────────────────────────────────────────────────────────
{
  const root = makeTree()
  try {
    mkdirSync(join(root, 'notes/zz-lifecycle'))
    check('未知生命周期目录 → 红', treeHas(root, '未知生命周期目录'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/implemented/zz-probe/2026-11-14-x.md')
    check('未登记二级目录 → 红', treeHas(root, '未登记子目录'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    mkdirSync(join(root, 'notes/archived/receipts/zz-nested'))
    check('receipts 下再建目录（深度 4）→ 红', treeHas(root, '不允许深度 4 目录'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/implemented/zz-no-date.md')
    check('无日期文件名 → 红', treeHas(root, '文件名须为 yyyy-mm-dd-<slug>.md'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/2026-11-14-root-stray.md')
    check('notes 根散件 → 红', treeHas(root, '根目录只允许 README.md / AGENTS.md'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/implemented/INDEX.md')
    check('INDEX.md → 红', treeHas(root, '集中索引禁止'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/archived/2026-09-30-pin-review.json', '{}\n')
    check('非 .md 证据件（.json）→ 不判形状', gate.notesTreeProblems(root).problems.length === 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

// ── 状态行判据（前向生效）─────────────────────────────────────────────────────
{
  const root = makeTree()
  try {
    write(root, 'notes/implemented/2026-11-14-a.md', '# a\n\n状态：implemented\n\n状态：implemented\n')
    check('状态行重复 → 红', statusHas(root, '状态行必须恰好 1 行'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/implemented/2026-11-14-b.md', '# b\n\n状态：proposed\n')
    check('状态词与目录不符 → 红', statusHas(root, '状态词须以 implemented/已交付/已消化 开头'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    const padded = ['# c', '', ...Array.from({ length: 12 }, () => '填充行'), '状态：implemented', ''].join('\n')
    write(root, 'notes/implemented/2026-11-14-c.md', padded)
    check('状态行不在前 12 行 → 红', statusHas(root, '状态行必须在前 12 行内'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/implemented/2026-11-13-old.md', '# old\n\n无状态行\n')
    check('存量（日期 < 生效日）无状态行 → 绿', gate.notesStatusProblems(root).problems.length === 0)
    check('存量不计入受查数', gate.notesStatusProblems(root).checked === 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/archived/receipts/2026-11-14-receipt.md', '# 收据\n\n无状态行\n')
    check('receipts 证据件不查状态 → 绿', gate.notesStatusProblems(root).problems.length === 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    write(root, 'notes/archived/2026-11-14-d.md', '# d\n\n状态：已交付（2026-11-14；批准：fixture）\n')
    check('archived 保留实现状态 → 绿', gate.notesStatusProblems(root).problems.length === 0)
    check('archived 新写计入受查数', gate.notesStatusProblems(root).checked === 1)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

// ── 入口与缺失 ────────────────────────────────────────────────────────────────
{
  const root = mkdtempSync(join(tmpdir(), 'notes-tree-empty-'))
  try {
    const messages = []
    gate.run({ root, ok: message => messages.push(`OK ${message}`), fail: (name, message) => messages.push(`FAIL ${name}: ${message}`) })
    check('notes/ 缺失 → 报「不在盘上」不崩', messages.some(message => message.startsWith('FAIL notes-tree:') && message.includes('不在盘上')))
  } finally { rmSync(root, { recursive: true, force: true }) }
}
{
  const root = makeTree()
  try {
    const messages = []
    gate.run({ root, ok: message => messages.push(`OK ${message}`), fail: (name, message) => messages.push(`FAIL ${name}: ${message}`) })
    check('合法树 → 门禁 ok 行点名 notes-tree', messages.length === 1 && messages[0].startsWith('OK notes-tree（'))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

console.log(failures === 0 ? 'notes-tree-checks: ALL PASS' : `notes-tree-checks: ${failures} FAILURE(S)`)
process.exitCode = failures === 0 ? 0 : 1
