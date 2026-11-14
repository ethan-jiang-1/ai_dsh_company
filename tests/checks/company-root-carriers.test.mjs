// 状态：常驻
// 何时跑：改 company-root-carriers 判据或 carrier-registry 后；`pnpm test:checks`。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { run } from '../../checks/gates/company-root-carriers.mjs'

const MODULE = 'packages/company-pack/src/host/writer.ts'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'carriers-'))
  const path = join(root, MODULE)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, ["import { writeFileSync } from 'node:fs'", "const p = '.dsh-company/kb/x'", "writeFileSync(p, 'x')"].join('\n'))
  return root
}

function gate(root, registry = {}) {
  const problems = []
  let okLine
  run({ root, carriers: [], exempt: [], knownGap: [], ...registry, ok: line => { okLine = line }, fail: (_name, detail) => problems.push(detail) })
  return { problems, okLine }
}

test('未登记的公司盘写入口 → 红（报 file:line）', () => {
  const root = fixture()
  try { assert.match(gate(root).problems.join(), /writer\.ts:3 → 未登记的公司盘写入口/) } finally { rmSync(root, { recursive: true, force: true }) }
})

test('登记为 writer → 绿', () => {
  const root = fixture()
  try {
    const result = gate(root, { carriers: [{ kind: 'writer', module: MODULE }] })
    assert.deepEqual(result.problems, [])
    assert.match(result.okLine, /company-root-carriers ×1 文件/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('登记项模块不存在 / KNOWN_GAP 卡不存在 → 红', () => {
  const root = fixture()
  try {
    assert.match(gate(root, { carriers: [{ kind: 'writer', module: 'packages/company-pack/src/host/missing.ts' }] }).problems.join(), /missing\.ts → 登记项指向的模块不存在/)
    assert.match(gate(root, { knownGap: [{ kind: 'writer', module: MODULE, bug: 'BUG-999' }] }).problems.join(), /BUG-999 卡不存在/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
