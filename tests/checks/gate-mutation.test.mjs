// 状态：常驻
// 何时跑：改四个高风险门禁（naming-contract / company-root-carriers / fix-evidence / notes-tree）的判据后；
//         `pnpm test:checks`。这是**定向 mutation**：删掉门禁的一条规则，坏输入必须漏过去；
//         证明 conformance 的坏夹具确实踩在那条规则上，而不是靠别的分支顺带变红。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as naming from '../../checks/gates/naming-contract.mjs'
import * as carrier from '../../checks/gates/company-root-carriers.mjs'
import * as fixEvidence from '../../checks/gates/fix-evidence.mjs'
import * as notesTree from '../../checks/gates/notes-tree.mjs'

const GATES = join(dirname(fileURLToPath(import.meta.url)), '../../checks/gates')

async function mutant(gate, from, to) {
  const source = readFileSync(join(GATES, `${gate}.mjs`), 'utf8')
  assert.ok(source.includes(from), `${gate} 的 mutation 锚点不在了——先同步本测试`)
  const path = join(GATES, `.zz-mut-${gate}-${String(Date.now())}-${String(Math.random()).slice(2)}.mjs`)
  writeFileSync(path, source.replace(from, to))
  const mod = await import(`${pathToFileURL(path).href}?v=${String(Date.now())}`)
  return { mod, cleanup: () => rmSync(path, { force: true }) }
}

function fixture(files, dirs = []) {
  const root = mkdtempSync(join(tmpdir(), 'gate-mutation-'))
  for (const dir of dirs) mkdirSync(join(root, dir), { recursive: true })
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  return root
}

function invoke(mod, root, extra = {}) {
  const problems = []
  let okLine
  mod.run({ root, ...extra, ok: line => { okLine = line }, fail: (_name, detail) => problems.push(detail) })
  return { problems, okLine }
}

test('naming-contract：删「tests/checks 必须 .test.mjs」→ 坏夹具漏过', async () => {
  const root = fixture({
    'checks/lanes/ok.e2e.mjs': '',
    'tests/checks/bad.mjs': '',
    'checks/audit/ok-audit.mjs': '',
    'checks/gates/ok.mjs': '',
    'probes/team/ok-probe.mjs': '',
  }, ['checks/lanes', 'checks/audit', 'checks/gates', 'tests/checks', 'probes'])
  const mutated = await mutant('naming-contract',
    "if (!entry.name.endsWith('.test.mjs')) failWith(join(checksDir, entry.name), '期望 .test.mjs（门禁自身）')",
    "if (false) failWith(join(checksDir, entry.name), '期望 .test.mjs（门禁自身）')")
  try {
    assert.match(invoke(naming, root).problems.join(), /bad\.mjs/)
    assert.deepEqual(invoke(mutated.mod, root).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('company-root-carriers：删「未登记写入口」→ 未登记 writer 漏过', async () => {
  const root = fixture({
    'packages/company-pack/src/host/writer.ts': ["const p = '.dsh-company/x'", "writeFileSync(p, 'x')"].join('\n'),
  })
  const mutated = await mutant('company-root-carriers', 'if (!registered.has(rel)) {', 'if (false) {')
  try {
    const extra = { carriers: [], exempt: [], knownGap: [] }
    assert.match(invoke(carrier, root, extra).problems.join(), /未登记的公司盘写入口/)
    assert.deepEqual(invoke(mutated.mod, root, extra).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('fix-evidence：删「缺修复证据」push → 缺节卡漏过', async () => {
  const root = fixture({
    '_backlog/_archive/fixed_bugs/BUG-900-fixture.md': ['---', 'status: 已修', 'opened: 2026-11-14', '---', '', '# BUG-900'].join('\n'),
  })
  const mutated = await mutant('fix-evidence',
    "state.problems.push(`${rel} 缺「## 修复证据」（已修卡必须给改动面/红/绿/提交——翻状态 + git mv 不算修复）`)\n    return",
    'return')
  try {
    assert.match(invoke(fixEvidence, root).problems.join(), /缺「## 修复证据」/)
    assert.deepEqual(invoke(mutated.mod, root).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})

test('notes-tree：删「未知生命周期目录」→ zz 目录漏过', async () => {
  const root = fixture({ 'notes/README.md': '# notes\n' }, ['notes/zz-lifecycle'])
  const mutated = await mutant('notes-tree',
    "if (!LIFECYCLES.includes(entry.name)) {\n      problems.push(`notes/${entry.name}/ — 未知生命周期目录（允许：${LIFECYCLES.join('、')}）`)\n      continue\n    }",
    'if (false) {\n      continue\n    }')
  try {
    assert.match(invoke(notesTree, root).problems.join(), /未知生命周期目录/)
    assert.deepEqual(invoke(mutated.mod, root).problems, [])
  } finally { mutated.cleanup(); rmSync(root, { recursive: true, force: true }) }
})
