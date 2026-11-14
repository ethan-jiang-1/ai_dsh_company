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

test('非注册原语植入裸 frontmatter 正则或裸 Markdown `##` 节切分 → 报 file:line 红（W2.2）', () => {
  const root = fixture()
  try {
    mkdirSync(join(root, 'checks/gates'), { recursive: true })
    mkdirSync(join(root, 'tools/lib'), { recursive: true })
    writeFileSync(join(root, 'tools/lib/repo-markdown.mjs'), 'export const FRONTMATTER = /^---\\n([\\s\\S]*?)\\n---/\n')
    writeFileSync(join(root, 'tools/lib/markdown-links.mjs'), 'export const ok = true\n')
    writeFileSync(join(root, 'checks/gates/bad-gate.mjs'), [
      '// comment /^##\\s+/ does not trigger',
      'export function run(text) {',
      '  const fm = /^---\\r?\\n([\\s\\S]*?)\\r?\\n---/.exec(text)',
      '  const sec = text.split("\\n").findIndex(l => /^##\\s+/.test(l))',
      '  return { fm, sec }',
      '}',
    ].join('\n'))
    writeFileSync(join(root, 'tools/lib/bad-helper.mjs'), 'export const r = new RegExp(`^##\\\\s+${name}$`)\n')
    const result = gate(root, { carriers: [{ kind: 'writer', module: MODULE }] })
    const joined = result.problems.join('；')
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:3 → 禁止手写裸 frontmatter 正则/)
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:4 → 禁止手写裸 Markdown 节切分正则/)
    assert.match(joined, /tools\/lib\/bad-helper\.mjs:1 → 禁止手写裸 Markdown 节切分正则/)
    assert.doesNotMatch(joined, /repo-markdown\.mjs:\d+/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
