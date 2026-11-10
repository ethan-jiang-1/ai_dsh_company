// E10：content 门禁是否覆盖“T1/T2 标注”与“政策数字单家”。
// 真 root 跑 content-manifest / content-single-home，同时人工核对 header 与 manifest / policy-lines。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as contentManifest from '/Users/bowhead/ai_dsh_company/checks/gates/content-manifest.mjs'
import * as contentSingleHome from '/Users/bowhead/ai_dsh_company/checks/gates/content-single-home.mjs'

const root = '/Users/bowhead/ai_dsh_company'
const content = 'packages/company-pack/content'

function runGate(gate, label) {
  const messages = []
  gate.run({ root, ok: (msg) => messages.push(`OK ${msg}`), fail: (name, msg) => messages.push(`FAIL ${name}: ${msg}`) })
  console.log(`\n== ${label} ==`)
  for (const msg of messages) console.log(msg)
}

const manifest = JSON.parse(readFileSync(join(root, content, 'manifest.json'), 'utf8'))
const tiers = manifest.tiers ?? {}
const tierOf = (rel) => Object.entries(tiers).find(([, files]) => files.includes(rel))?.[0] ?? 'UNLISTED'

console.log('== E10 T1 header vs manifest tier ==')
for (const type of ['hardware-software', 'business-software']) {
  const rel = `product-types/${type}/overview.md`
  const text = readFileSync(join(root, content, rel), 'utf8')
  const header = text.split('\n').find(line => line.includes('加载：'))?.trim() ?? '(no header)'
  console.log(`${rel}\ttier=${tierOf(rel)}\theader=${header}`)
}

console.log('\n== E10 10% policy: CFO charter vs policy-lines ==')
for (const rel of ['charters/cfo.md', 'company/policy-lines.md']) {
  const lines = readFileSync(join(root, content, rel), 'utf8').split('\n')
  const hits = lines.map((line, i) => ({ line, i: i + 1 })).filter(({ line }) => /10\s*%/.test(line))
  console.log(`\n# ${rel} (${hits.length} hits)`)
  for (const { line, i } of hits) console.log(`${i}: ${line.trim()}`)
}

runGate(contentManifest, 'content-manifest on real root')
runGate(contentSingleHome, 'content-single-home on real root')
