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
  run({ root, carriers: [], exempt: [], knownGap: [], tooling: [], ...registry, ok: line => { okLine = line }, fail: (_name, detail) => problems.push(detail) })
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

test('host 只读模块不误红、多行 import 不算写、promises 写调用判红（AST 写调用，复审 S1/S2 跟进）', () => {
  const root = fixture()
  try {
    writeFileSync(join(root, 'packages/company-pack/src/host/readonly.ts'), [
      'import {',
      '  writeFileSync,',
      '  readFileSync,',
      "} from 'node:fs'",
      "export const r = p => readFileSync(`${p}/.dsh-company/x`, 'utf8')",
    ].join('\n'))
    writeFileSync(join(root, 'packages/company-pack/src/host/promises-writer.ts'), [
      "import { mkdir } from 'node:fs/promises'",
      "export const w = ws => mkdir(`${ws}/.dsh-company/kb`, { recursive: true })",
    ].join('\n'))
    const problems = gate(root, { markdownPrimitives: [] }).problems.join('；')
    assert.doesNotMatch(problems, /readonly\.ts/) // 只读模块 + 多行 import 不再误红
    assert.match(problems, /promises-writer\.ts:2 → 未登记的公司盘写入口/)
    assert.match(problems, /writer\.ts:3 → 未登记的公司盘写入口/) // 行号仍指真写调用，不是 :0
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('非注册原语植入裸 frontmatter 正则/前缀或裸 Markdown `##` 节切分（含子目录、BOM 前缀、量词空格、拼接构造）→ 报 file:line 红（W2.2）', () => {
  const root = fixture()
  try {
    mkdirSync(join(root, 'checks/gates/lib'), { recursive: true })
    mkdirSync(join(root, 'tools/lib'), { recursive: true })
    writeFileSync(join(root, 'tools/lib/repo-markdown.mjs'), 'export const FRONTMATTER = /^---\\n([\\s\\S]*?)\\n---/\n')
    writeFileSync(join(root, 'tools/lib/markdown-links.mjs'), 'export const ok = true\n')
    writeFileSync(join(root, 'checks/gates/bad-gate.mjs'), [
      '// comment /^##\\s+/ does not trigger',
      'export function run(text) {',
      '  const fm = /^---\\r?\\n([\\s\\S]*?)\\r?\\n---/.exec(text)',
      '  const sec = text.split("\\n").findIndex(l => /^##\\s+/.test(l))',
      '  const bomFm = /^(?:\\uFEFF)?---\\r?\\n/.test(text)',
      '  const prefix = text.startsWith("---\\n")',
      '  const spaced = /^\\s{0,3}##\\s+/.test(text) || /^ {0,3}##\\s+/.test(text)',
      '  return { fm, sec, bomFm, prefix, spaced }',
      '}',
    ].join('\n'))
    writeFileSync(join(root, 'checks/gates/lib/sub-bad.mjs'), 'export const r = new RegExp("^##\\\\s+" + name)\n')
    writeFileSync(join(root, 'tools/lib/bad-helper.mjs'), 'export const r = new RegExp(`^\\\\s{0,3}##\\\\s+${name}$`)\n')
    const result = gate(root, { carriers: [{ kind: 'writer', module: MODULE }] })
    const joined = result.problems.join('；')
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:3 → 禁止手写裸 frontmatter 正则/)
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:4 → 禁止手写裸 Markdown 节切分正则/)
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:5 → 禁止手写裸 frontmatter 正则/)
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:6 → 禁止手写裸 frontmatter 前缀判据/)
    assert.match(joined, /checks\/gates\/bad-gate\.mjs:7 → 禁止手写裸 Markdown 节切分正则/)
    assert.match(joined, /checks\/gates\/lib\/sub-bad\.mjs:1 → 禁止手写裸 Markdown 节切分正则/)
    assert.match(joined, /tools\/lib\/bad-helper\.mjs:1 → 禁止手写裸 Markdown 节切分正则/)
    assert.doesNotMatch(joined, /repo-markdown\.mjs:\d+/)

    // 逃逸形态：startsWith/split 字符串前缀、非 ^ 锚正则必须判红；URL 锚 `#` 与 includes/indexOf 探测不误报
    writeFileSync(join(root, 'checks/gates/escape-gate.mjs'), [
      "export const a = l => l.startsWith('## 合成')",
      "export const b = t => t.split('\\n## 尾')",
      'export const c = /\\n## /',
      'export const d = /(?=^## )/m',
      'export const e = /(?:^|\\n)## /',
      'export const f = /\\n#{2} /',
      'export const g = /^[#]{2}/',
      "export const h = t => t.startsWith('##')",
      "export const ok1 = u => u.startsWith('#') || u.indexOf('#') || u.includes('# 标题')",
    ].join('\n'))
    const escaped = gate(root, { carriers: [{ kind: 'writer', module: MODULE }] }).problems.join('；')
    for (const line of [1, 2, 3, 4, 5, 6, 7, 8]) {
      assert.match(escaped, new RegExp(`escape-gate\\.mjs:${String(line)} → 禁止手写裸 Markdown 节`))
    }
    assert.doesNotMatch(escaped, /escape-gate\.mjs:9/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('工具盘直写 .dsh-company 未登记 → 红（file:line）；登记（含理由）→ 绿；无/只读/间接形态不误报（B2+复审）', () => {
  const root = fixture()
  try {
    mkdirSync(join(root, 'tools/lib'), { recursive: true })
    writeFileSync(join(root, 'tools/lib/scaffold.mjs'), [
      "import { mkdirSync } from 'node:fs'",
      "import { join } from 'node:path'",
      'export function scaffold(ws) {',
      "  mkdirSync(join(ws, '.dsh-company/kb'), { recursive: true })",
      '  mkdirSync(join(ws, `./.dsh-company/${deliverables}`), { recursive: true })',
      "  return '.dsh-company' + '/exports'",
      '}',
    ].join('\n'))
    // 逃逸形态：`./` 前缀 / 模板 `${ws}/` 前缀 / 模板后缀插值 / promises 写 API → 都必须红
    writeFileSync(join(root, 'tools/lib/dot-prefix.mjs'), ["import { mkdirSync } from 'node:fs'", "mkdirSync(join(ws, './.dsh-company/kb'), { recursive: true })"].join('\n'))
    writeFileSync(join(root, 'tools/lib/template-prefix.mjs'), ['import { mkdirSync } from \'node:fs\'', 'mkdirSync(`${ws}/.dsh-company/kb`, { recursive: true })'].join('\n'))
    writeFileSync(join(root, 'tools/lib/template-suffix.mjs'), ['import { mkdirSync } from \'node:fs\'', 'mkdirSync(`${ws}/.dsh-company${sub}`, { recursive: true })'].join('\n'))
    writeFileSync(join(root, 'tools/lib/promises-writer.mjs'), ["import { mkdir } from 'node:fs/promises'", "await mkdir(join(ws, '.dsh-company/kb'), { recursive: true })"].join('\n'))
    // 无字面量 / 只 import 写原语但只读（含多行 import）/ 变量拼接（声明边界外）→ 都不红
    writeFileSync(join(root, 'tools/lib/plain-writer.mjs'), ["import { writeFileSync } from 'node:fs'", "writeFileSync('x', 'y')"].join('\n'))
    writeFileSync(join(root, 'tools/lib/reader.mjs'), ["import { readFileSync, writeFileSync } from 'node:fs'", "export const read = ws => readFileSync(join(ws, '.dsh-company/kb/x'), 'utf8')"].join('\n'))
    writeFileSync(join(root, 'tools/lib/multiline-reader.mjs'), ['import {', '  writeFileSync,', '  readFileSync,', "} from 'node:fs'", "export const read = ws => readFileSync(join(ws, '.dsh-company/kb/x'), 'utf8')"].join('\n'))
    writeFileSync(join(root, 'tools/lib/indirect.mjs'), ["import { mkdirSync } from 'node:fs'", "const NAME = '.dsh' + '-company'", 'mkdirSync(`${ws}/${NAME}/kb`, { recursive: true })'].join('\n'))
    // 错误消息/内容里出现 `.dsh-company`、实际写别处 → 不红（只判写调用路径实参）
    writeFileSync(join(root, 'tools/lib/error-message.mjs'), ["import { writeFileSync } from 'node:fs'", "writeFileSync('/tmp/log', 'see ' + ws + '/.dsh-company/x')", "export const msg = ws => 'blocked: ' + ws + '/.dsh-company/x'"].join('\n'))
    const carriers = [{ kind: 'writer', module: MODULE }]
    const opened = gate(root, { carriers, markdownPrimitives: [] }).problems.join('；')
    assert.match(opened, /tools\/lib\/scaffold\.mjs:4 → 禁止手写裸 \.dsh-company 路径拼接/)
    assert.match(opened, /tools\/lib\/dot-prefix\.mjs:2 → 禁止手写裸 \.dsh-company 路径拼接/)
    assert.match(opened, /tools\/lib\/template-prefix\.mjs:2 → 禁止手写裸 \.dsh-company 路径拼接/)
    assert.match(opened, /tools\/lib\/template-suffix\.mjs:2 → 禁止手写裸 \.dsh-company 路径拼接/)
    assert.match(opened, /tools\/lib\/promises-writer\.mjs:2 → 禁止手写裸 \.dsh-company 路径拼接/)
    assert.doesNotMatch(opened, /plain-writer\.mjs/)
    assert.doesNotMatch(opened, /reader\.mjs/) // 只读模块不因 import 写原语被误红
    assert.doesNotMatch(opened, /multiline-reader\.mjs/) // 多行 import 也不误红
    assert.doesNotMatch(opened, /indirect\.mjs/) // 变量拼接 = 头注声明的开放边界
    assert.doesNotMatch(opened, /error-message\.mjs/) // 内容/错误消息里的路径不算写目标
    const registered = gate(root, {
      carriers,
      markdownPrimitives: [],
      tooling: [
        { module: 'tools/lib/scaffold.mjs', symbol: '.dsh-company', reason: '测试夹具：演练盘' },
        { module: 'tools/lib/dot-prefix.mjs', symbol: './.dsh-company', reason: '测试夹具：点前缀' },
        { module: 'tools/lib/template-prefix.mjs', symbol: '/.dsh-company/', reason: '测试夹具：模板前缀' },
        { module: 'tools/lib/template-suffix.mjs', symbol: '/.dsh-company$', reason: '测试夹具：模板后缀' },
        { module: 'tools/lib/promises-writer.mjs', symbol: '.dsh-company', reason: '测试夹具：promises' },
      ],
    })
    assert.deepEqual(registered.problems, [])
    assert.match(registered.okLine, /工具盘入口 5/)
    // 登记缺 reason / 缺 symbol / 符号不在文件里 → 红（登记项自身必须可解析）
    const noReason = gate(root, {
      carriers,
      markdownPrimitives: [],
      tooling: [{ module: 'tools/lib/scaffold.mjs', symbol: '.dsh-company' }],
    })
    assert.match(noReason.problems.join('；'), /scaffold\.mjs → WORKSPACE_TOOLING 必须写 reason/)
    const noSymbol = gate(root, {
      carriers,
      markdownPrimitives: [],
      tooling: [{ module: 'tools/lib/scaffold.mjs', reason: '测试夹具' }],
    })
    assert.match(noSymbol.problems.join('；'), /scaffold\.mjs → WORKSPACE_TOOLING 必须写 symbol/)
    const broken = gate(root, {
      carriers,
      markdownPrimitives: [],
      tooling: [{ module: 'tools/lib/scaffold.mjs', symbol: 'not-in-file', reason: '测试夹具' }],
    })
    assert.match(broken.problems.join('；'), /scaffold\.mjs → 登记符号 not-in-file 不在文件里/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
