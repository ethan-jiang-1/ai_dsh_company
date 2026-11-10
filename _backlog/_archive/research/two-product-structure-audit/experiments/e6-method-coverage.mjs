// E6：CFO/COO/VP-Sales 的方法是否随产品类型变。
// 看 business-software 的交付模式词、hardware 的成本/认证词、项目制的收款/验收词分别落在哪。
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = '/Users/bowhead/ai_dsh_company'
const files = [
  ...readdirSync(join(root, 'packages/company-pack/presets/cfo/skills'), { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => `packages/company-pack/presets/cfo/skills/${e.name}/SKILL.md`),
  ...readdirSync(join(root, 'packages/company-pack/presets/coo/skills'), { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => `packages/company-pack/presets/coo/skills/${e.name}/SKILL.md`),
  ...readdirSync(join(root, 'packages/company-pack/presets/vp-sales/skills'), { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => `packages/company-pack/presets/vp-sales/skills/${e.name}/SKILL.md`),
  'packages/company-pack/content/charters/cfo.md',
  'packages/company-pack/content/charters/coo.md',
  'packages/company-pack/content/charters/vp-sales.md',
]

const groups = {
  'business-software': /SaaS|私有化|永久授权|订阅|ARR|CAC|churn|留存|SLO|激活|租户|tenant/,
  hardware: /BOM|质保|认证|试产|返修|供应链|固件|EVT|DVT|PVT|MTBF/,
  project: /3-4-3|SOW|UAT|人·周|维护年费|里程碑|驻场/,
}

console.log('== E6 per-file term counts ==')
console.log(['file', ...Object.keys(groups)].join('\t'))
for (const rel of files) {
  const text = readFileSync(join(root, rel), 'utf8')
  const counts = Object.entries(groups).map(([, re]) => text.split('\n').filter(line => re.test(line)).length)
  console.log([rel, ...counts].join('\t'))
}

console.log('\n== E6 exact business-software / hardware hits (if any) ==')
for (const rel of files) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n')
  const hits = lines.map((line, i) => ({ line, i: i + 1 }))
    .filter(({ line }) => groups['business-software'].test(line) || groups.hardware.test(line))
  if (hits.length === 0) continue
  console.log(`\n# ${rel}`)
  for (const { line, i } of hits.slice(0, 6)) console.log(`${i}: ${line.trim()}`)
}

console.log('\n== E6 project assumptions (first 3 per file) ==')
for (const rel of files) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n')
  const hits = lines.map((line, i) => ({ line, i: i + 1 })).filter(({ line }) => groups.project.test(line))
  if (hits.length === 0) continue
  console.log(`\n# ${rel}`)
  for (const { line, i } of hits.slice(0, 3)) console.log(`${i}: ${line.trim()}`)
}
