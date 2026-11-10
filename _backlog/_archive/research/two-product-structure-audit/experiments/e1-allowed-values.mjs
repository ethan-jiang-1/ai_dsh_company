// E1/E3：产品类型“允许值”在哪些家出现；默认值/业务叙事/机会清单是否互相矛盾。
// 只读；不写仓库。输出 TSV，便于贴进 ledger。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = '/Users/bowhead/ai_dsh_company'
const ids = ['hardware-software', 'business-software', 'project-services']
const files = [
  'packages/company-pack/presets/_shared/skills/product-definition/SKILL.md',
  'packages/company-pack/content/charters/cmo.md',
  'packages/company-pack/content/templates/meta.md',
  'packages/company-pack/content/templates/mrd.md',
  'packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md',
  'docs/guides/product-definition.md',
  'packages/company-pack/content/AGENTS.md',
  'packages/company-pack/content/product-types/hardware-software/check-rules.json',
  'packages/company-pack/content/product-types/business-software/check-rules.json',
]

console.log('== E1 matrix: which source names which product type ==')
console.log(['source', ...ids].join('\t'))
const dirs = readdirSync(join(root, 'packages/company-pack/content/product-types'), { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
console.log(['content/product-types/ (dirs)', ...ids.map(id => dirs.includes(id) ? 'YES' : '—')].join('\t'))
for (const rel of files) {
  const path = join(root, rel)
  if (!existsSync(path)) { console.log([rel, 'MISSING', '', ''].join('\t')); continue }
  const text = readFileSync(path, 'utf8')
  console.log([rel, ...ids.map(id => text.includes(id) ? 'YES' : '—')].join('\t'))
}

console.log('\n== E1 exact lines (up to 2 per source) ==')
for (const rel of files) {
  const path = join(root, rel)
  if (!existsSync(path)) continue
  const lines = readFileSync(path, 'utf8').split('\n')
  const hits = lines.map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => ids.some(id => line.includes(id)))
  if (hits.length === 0) continue
  console.log(`\n# ${rel}`)
  for (const { line, index } of hits.slice(0, 2)) console.log(`${index}: ${line.trim()}`)
}

console.log('\n== E3 default vs business vs opportunity ==')
const show = (rel, re) => {
  const text = readFileSync(join(root, rel), 'utf8')
  const line = text.split('\n').find(l => re.test(l))
  console.log(`${rel}\t${line?.trim() ?? '(no match)'}`)
}
show('packages/company-pack/content/state/company.md', /productType:/)
show('packages/company-pack/content/state/company.md', /出厂 = /)
show('packages/company-pack/content/state/org.md', /三类业务/)
show('packages/company-pack/content/charters/cmo.md', /新机会方向/)
