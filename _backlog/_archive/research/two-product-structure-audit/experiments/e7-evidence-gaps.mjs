// E7：角色 skill 引用的“费率基准 / 列到人”是否有事实出处。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = '/Users/bowhead/ai_dsh_company'
const files = {
  org: 'packages/company-pack/content/state/org.md',
  cfoCharter: 'packages/company-pack/content/charters/cfo.md',
  cooCharter: 'packages/company-pack/content/charters/coo.md',
  owners: 'packages/company-pack/content/state/owners.md',
  policy: 'packages/company-pack/content/company/policy-lines.md',
  cfoWorkflow: 'packages/company-pack/presets/cfo/skills/cfo-workflow/SKILL.md',
  projectEconomics: 'packages/company-pack/presets/cfo/skills/project-economics/SKILL.md',
  opsFeasibility: 'packages/company-pack/presets/coo/skills/ops-feasibility/SKILL.md',
}

const read = rel => readFileSync(join(root, rel), 'utf8')

console.log('== E7 “费率/成本基准”事实搜索 ==')
const rateRe = /费率|rate|工资|成本基准|人·周|人天/
for (const [name, rel] of Object.entries(files)) {
  if (!['org', 'cfoCharter', 'cooCharter', 'policy', 'cfoWorkflow', 'projectEconomics'].includes(name)) continue
  const lines = read(rel).split('\n')
  const hits = lines.map((line, i) => ({ line, i: i + 1 })).filter(({ line }) => rateRe.test(line))
  console.log(`\n# ${name}: ${rel} (${hits.length} hits)`)
  for (const { line, i } of hits.slice(0, 8)) console.log(`${i}: ${line.trim()}`)
}

console.log('\n== E7 “人名/列到人”事实搜索 ==')
for (const name of ['org', 'cfoCharter', 'cooCharter', 'owners']) {
  const rel = files[name]
  const text = read(rel)
  const placeholder = (text.match(/<待填>/g) ?? []).length
  const names = (text.match(/人名|列到人|谁、每周|具体到人/g) ?? []).length
  console.log(`${name}\t${rel}\t<待填>=${placeholder}\t人名/列到人=${names}`)
}

console.log('\n== E7 引用句 vs 事实 ==')
const claims = [
  ['cfo-workflow 说读 org.md 的费率基准', files.cfoWorkflow, /费率基准/],
  ['project-economics 说费率基准见 org.md/CHARTER', files.projectEconomics, /费率基准/],
  ['ops-feasibility 说列到“8 人编制里谁”', files.opsFeasibility, /8 人编制里谁/],
]
for (const [label, rel, re] of claims) {
  const line = read(rel).split('\n').find(l => re.test(l))?.trim() ?? '(no match)'
  const orgHasRate = /费率|rate|成本基准/.test(read(files.org))
  const charterHasRate = /费率|rate|成本基准/.test(read(files.cfoCharter))
  const ownersHasNames = !/<待填>/.test(read(files.owners))
  console.log(`${label}\n  claim: ${line}\n  org 费率=${orgHasRate} cfo charter 费率=${charterHasRate} owners 有真人名=${ownersHasNames}`)
}
