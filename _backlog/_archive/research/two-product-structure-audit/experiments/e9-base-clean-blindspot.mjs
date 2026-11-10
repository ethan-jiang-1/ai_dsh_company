// E9：base-clean 是否漏掉“部署个案语言”。
// 在临时 root 复制 content，先跑现状，再往副本的 charter 里加一句个案语言，看门禁是否红。
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as baseClean from '/Users/bowhead/ai_dsh_company/checks/gates/base-clean.mjs'

const repo = '/Users/bowhead/ai_dsh_company'
const contentRel = 'packages/company-pack/content'

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'e9-base-clean-'))
  cpSync(join(repo, contentRel), join(root, contentRel), { recursive: true })
  return root
}

function run(root) {
  const messages = []
  baseClean.run({ root, ok: (msg) => messages.push(`OK ${msg}`), fail: (name, msg) => messages.push(`FAIL ${name}: ${msg}`) })
  return messages
}

console.log('== E9 current charters: case-like language ==')
for (const rel of ['charters/cfo.md', 'charters/vp-sales.md', 'charters/coo.md']) {
  const lines = readFileSync(join(repo, contentRel, rel), 'utf8').split('\n')
  const hits = lines.map((line, i) => ({ line, i: i + 1 }))
    .filter(({ line }) => /公司财务 agent 案|财务 agent workflow|日期待核|常设口径/.test(line))
  if (hits.length === 0) continue
  console.log(`\n# ${rel}`)
  for (const { line, i } of hits) console.log(`${i}: ${line.trim()}`)
}

console.log('\n== E9 base-clean on current copy ==')
const root1 = makeRoot()
try { for (const msg of run(root1)) console.log(msg) } finally { rmSync(root1, { recursive: true, force: true }) }

console.log('\n== E9 base-clean after adding a new case line to a charter copy ==')
const root2 = makeRoot()
try {
  const charter = join(root2, contentRel, 'charters/cfo.md')
  writeFileSync(charter, `\n- 2026-11-11 客户 X 的财务 agent 案：日期待核，服务信用 10% 口径。\n${readFileSync(charter, 'utf8')}`)
  for (const msg of run(root2)) console.log(msg)
} finally { rmSync(root2, { recursive: true, force: true }) }
