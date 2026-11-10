// E5：hardware-software playbook 要求的能力，在 org/charter/role skill/method 里有没有落点。
// 只读；输出计数与 org/charter 的首个命中行，便于判断“有词”还是“有席位”。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = '/Users/bowhead/ai_dsh_company'
const content = join(root, 'packages/company-pack/content')
const presets = join(root, 'packages/company-pack/presets')

const keywords = [
  ['BOM', /\bBOM\b/],
  ['供应链', /供应链/],
  ['认证', /认证/],
  ['EVT/DVT/PVT', /EVT|DVT|PVT/],
  ['DFM', /\bDFM\b/],
  ['OTA', /\bOTA\b/],
  ['FAT/SAT', /\bFAT\b|\bSAT\b/],
  ['MTBF', /\bMTBF\b/],
  ['固件', /固件/],
  ['电气', /电气/],
  ['机械', /机械/],
  ['试产', /试产/],
  ['良率', /良率/],
  ['现场', /现场/],
  ['备件', /备件/],
  ['返修', /返修/],
]

const walk = (dir, ext) => {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path, ext))
    else if (entry.name.endsWith(ext)) out.push(path)
  }
  return out
}

const files = {
  playbook: [
    join(content, 'product-types/hardware-software/overview.md'),
    join(content, 'product-types/hardware-software/requirements-model.md'),
    join(content, 'product-types/hardware-software/glossary.md'),
    join(presets, '_shared/skills/product-definition/references/hardware-software.md'),
  ].filter(existsSync),
  org: [join(content, 'state/org.md')],
  charters: walk(join(content, 'charters'), '.md'),
  roleSkills: walk(join(presets), '.md').filter(path => path.includes('/skills/') && !path.includes('/_shared/skills/product-definition/')),
  methods: walk(join(content, 'methods'), '.md'),
}

const count = (file, re) => {
  const text = readFileSync(file, 'utf8')
  return text.split('\n').filter(line => re.test(line)).length
}
const first = (files, re) => {
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    const hit = lines.find(line => re.test(line))
    if (hit) return `${file.replace(`${root}/`, '')}: ${hit.trim()}`
  }
  return '—'
}

console.log('== E5 capability matrix: count of lines mentioning each capability ==')
console.log(['capability', 'playbook', 'org', 'charters', 'roleSkills', 'methods'].join('\t'))
for (const [name, re] of keywords) {
  const row = [
    name,
    files.playbook.reduce((n, f) => n + count(f, re), 0),
    files.org.reduce((n, f) => n + count(f, re), 0),
    files.charters.reduce((n, f) => n + count(f, re), 0),
    files.roleSkills.reduce((n, f) => n + count(f, re), 0),
    files.methods.reduce((n, f) => n + count(f, re), 0),
  ]
  console.log(row.join('\t'))
}

console.log('\n== E5 org/charter first hits ==')
for (const [name, re] of keywords) {
  const orgHit = first(files.org, re)
  const charterHit = first(files.charters, re)
  if (orgHit !== '—' || charterHit !== '—') {
    console.log(`${name}\torg=${orgHit}\tcharter=${charterHit}`)
  }
}

console.log('\n== E5 org role lines (the actual seats) ==')
for (const line of readFileSync(join(content, 'state/org.md'), 'utf8').split('\n')) {
  if (/^\| /.test(line) && /CEO|CFO|CMO|VP-Sales|VP-Eng|COO|平台|前端|数据|测试|SRE|PMO|系统集成|定制开发|运维|客户成功|会计|出纳|售前|客户销售/.test(line)) {
    console.log(line)
  }
}
