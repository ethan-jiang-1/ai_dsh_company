// 状态：常驻
// 何时跑：改 `checks/gates/fix-evidence.mjs` 的判据后；`pnpm test:checks`（pre-push 也跑）。keyless，秒级。
// 跑法：`node tests/checks/fix-evidence.test.mjs`
//
// 为什么：真树红证（门禁头注四形状）只证明「今天会红一次」。本文件用临时 git 仓库把四行形状与
// 提交交集钉成可回归判据——判据被改动时这里先红，不靠下一次事故发现。
//
// 负例留证 2026-11-14：删掉 `section(evidence)` 判定 → 「缺节」用例绿（红）；去掉提交交集比较 →
// 「提交没改到」用例绿（红）。
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { run } from '../../checks/gates/fix-evidence.mjs'

const OPENED = '2026-11-14'

/** 临时 git 仓库：返回 { dir, git, commit, cleanup }。 */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'fix-evidence-'))
  const git = args => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  git(['init', '-q', '--initial-branch', 'main'])
  git(['config', 'user.email', 't@t'])
  git(['config', 'user.name', 't'])
  git(['config', 'commit.gpgsign', 'false'])
  const commit = (rel, body, message) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true })
    writeFileSync(join(dir, rel), body)
    git(['add', '-A'])
    git(['commit', '-q', '-m', message])
    return git(['rev-parse', 'HEAD'])
  }
  return { dir, git, commit, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** 写一张已修卡；evidence 为 `## 修复证据` 起的行（undefined = 整节缺失）。 */
function card(dir, { name = 'BUG-900-fixture.md', opened = OPENED, evidence } = {}) {
  const lines = ['---', 'status: 已修', 'severity: P2', `opened: ${opened}`, '---', '', '# BUG-900：fixture', '']
  if (evidence !== undefined) lines.push(...evidence, '')
  mkdirSync(join(dir, '_backlog/_archive/fixed_bugs'), { recursive: true })
  writeFileSync(join(dir, '_backlog/_archive/fixed_bugs', name), lines.join('\n'))
}

const CMD = '`pnpm test tests/demo.spec.ts`'
const evidence = (sha, surface = 'packages/demo/a.ts', red = `- 红：拆掉守卫 → ${CMD} 红`, green = `- 绿：接回守卫 → ${CMD} 绿`) => [
  '## 修复证据', '',
  `- 改动面：\`${surface}\``,
  red,
  green,
  `- 提交：commit ${sha}`,
]

function gate(dir) {
  const problems = []
  let okLine
  run({ root: dir, ok: line => { okLine = line }, fail: (_name, detail) => problems.push(detail) })
  return { problems, okLine }
}

test('合法卡：改动面真实 + 红/绿齐 + 提交改到改动面 → 绿', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const sha = commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    card(dir, { evidence: evidence(sha) })
    const { problems, okLine } = gate(dir)
    assert.deepEqual(problems, [])
    assert.match(okLine, /fix-evidence ×1/)
  } finally { cleanup() }
})

test('缺 `## 修复证据` 节 → 红（翻状态 + git mv 不算修复）', () => {
  const { dir, cleanup } = repo()
  try {
    card(dir)
    assert.match(gate(dir).problems.join(), /缺「## 修复证据」/)
  } finally { cleanup() }
})

test('证据提交不存在 → 红', () => {
  const { dir, cleanup } = repo()
  try {
    card(dir, { evidence: evidence('deadbeef') })
    assert.match(gate(dir).problems.join(), /提交 deadbeef 不存在/)
  } finally { cleanup() }
})

test('改动面路径不在盘上 → 红', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const sha = commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    card(dir, { evidence: evidence(sha, 'packages/demo/missing.ts') })
    assert.match(gate(dir).problems.join(), /不在盘上/)
  } finally { cleanup() }
})

test('改动面只指向 notes/ → 红（不算系统面改动）', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const sha = commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    commit('notes/implemented/x.md', '# x\n', 'docs: note')
    card(dir, { evidence: evidence(sha, 'notes/implemented/x.md') })
    assert.match(gate(dir).problems.join(), /只指向卡\/笔记\/vendor/)
  } finally { cleanup() }
})

test('改动面存在但证据提交没改它 → 红（卡与提交对不上）', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const sha = commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    commit('packages/demo/b.ts', 'export const b = 1\n', 'feat: b')
    card(dir, { evidence: evidence(sha, 'packages/demo/b.ts') })
    assert.match(gate(dir).problems.join(), /没有改到改动面里的任何路径/)
  } finally { cleanup() }
})

test('存量卡（opened < 生效日）不追补：无证据也不红', () => {
  const { dir, cleanup } = repo()
  try {
    card(dir, { opened: '2026-11-13' })
    const { problems, okLine } = gate(dir)
    assert.deepEqual(problems, [])
    assert.match(okLine, /×0/)
  } finally { cleanup() }
})

test('红/绿没有同一条命令 → 红（红→绿必须同一条命令复跑）', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const sha = commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    card(dir, { evidence: evidence(sha, 'packages/demo/a.ts', '- 红：拆守卫 → `pnpm test tests/a.spec.ts` 红', '- 绿：接回 → `pnpm test tests/b.spec.ts` 绿') })
    assert.match(gate(dir).problems.join(), /红\/绿没有同一条命令/)
  } finally { cleanup() }
})

test('红/绿没点名命令 → 红', () => {
  const { dir, commit, cleanup } = repo()
  try {
    const sha = commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    card(dir, { evidence: evidence(sha, 'packages/demo/a.ts', '- 红：拆守卫 → 用例红', '- 绿：接回 → 用例绿') })
    assert.match(gate(dir).problems.join(), /必须点名一条可执行命令/)
  } finally { cleanup() }
})

test('证据提交不在 HEAD 历史上 → 红（当前分支无法复算）', () => {
  const { dir, git, commit, cleanup } = repo()
  try {
    commit('packages/demo/a.ts', 'export const a = 1\n', 'feat: a')
    git(['checkout', '-q', '-b', 'side'])
    const sideSha = commit('packages/demo/a.ts', 'export const a = 2\n', 'side: a2')
    git(['checkout', '-q', 'main'])
    card(dir, { evidence: evidence(sideSha) })
    assert.match(gate(dir).problems.join(), /不在 HEAD 历史上/)
  } finally { cleanup() }
})
