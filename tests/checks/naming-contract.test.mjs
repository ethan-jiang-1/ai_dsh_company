// 状态：常驻
// 何时跑：改 naming-contract 判据后；`pnpm test:checks`。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { run } from '../../checks/gates/naming-contract.mjs'

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'naming-contract-'))
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  for (const dir of ['checks/lanes', 'checks/audit', 'checks/gates', 'tests/checks', 'probes']) {
    mkdirSync(join(root, dir), { recursive: true })
  }
  return root
}

function gate(root) {
  const problems = []
  run({ root, ok: () => {}, fail: (_name, detail) => problems.push(detail) })
  return problems.join('；')
}

test('合法后缀 + 合法名 → 无问题', () => {
  const root = fixture({
    'checks/lanes/alpha.e2e.mjs': '',
    'checks/lanes/beta.entry.mjs': '',
    'checks/lanes/gamma-lane.mjs': '',
    'checks/audit/delta-audit.mjs': '',
    'checks/gates/alpha.mjs': '',
    'tests/checks/eps.test.mjs': '',
    'probes/team/zeta-probe.mjs': '',
  })
  try { assert.equal(gate(root), '') } finally { rmSync(root, { recursive: true, force: true }) }
})

test('lane 后缀不是 e2e/entry/-lane → 红', () => {
  const root = fixture({ 'checks/lanes/bad-smoke.mjs': '' })
  try { assert.match(gate(root), /bad-smoke\.mjs → 期望 \.e2e\.mjs/) } finally { rmSync(root, { recursive: true, force: true }) }
})

test('probe 后缀不是 -probe → 红；audit 后缀不是 audit/check/eval/ratchet → 红', () => {
  const root = fixture({ 'probes/team/bad-e2e.mjs': '', 'checks/audit/bad.mjs': '' })
  try {
    const problems = gate(root)
    assert.match(problems, /bad-e2e\.mjs → 期望 -probe\.mjs/)
    assert.match(problems, /bad\.mjs → 期望 -\(audit\|check\|eval\|ratchet\)\.mjs/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('禁用词 token → 红', () => {
  const root = fixture({ 'checks/lanes/golden-thing.e2e.mjs': '' })
  try { assert.match(gate(root), /文件名含禁用词 golden/) } finally { rmSync(root, { recursive: true, force: true }) }
})
