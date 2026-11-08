// 只读：统计委派/引擎合同词在 persona、角色 skills、docs 合同中的出现与分布。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const yaml = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const schema = yaml.CORE_SCHEMA.extend([new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: d => d })])
const base = join(ROOT, 'packages/company-pack/presets')
const terms = ['workflow', 'subagent', 'structured_output', 'UNSUPPORTED_SCHEMA', 'spill', 'truncat', '50k', '200k', '重启', 'interrupted', 'maxDepth', 'wait_agent', 'send_message', 'list_agents', 'team']
const files = []
const add = (path, text, kind) => {
  const lower = text.toLowerCase()
  const counts = Object.fromEntries(terms.map(t => [t, (lower.match(new RegExp(t.toLowerCase(), 'g')) ?? []).length]))
  files.push({ path: path.slice(ROOT.length), kind, lines: text.split('\n').length, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) })
}
for (const role of readdirSync(base).filter(n => n !== '_shared' && statSync(join(base, n)).isDirectory())) {
  const doc = yaml.load(readFileSync(join(base, role, 'agent.cordis.yml'), 'utf8'), { schema })
  const rows = []
  const collect = v => { if (Array.isArray(v)) return v.forEach(collect); if (v && typeof v === 'object') { if (typeof v.id === 'string' && typeof v.name === 'string') rows.push(v); Object.values(v).forEach(collect) } }
  collect(doc)
  const preset = rows.find(r => r.name === '@deepseek-ai/dsh-agent-preset')
  const plugins = (preset?.config?.plugins ?? []).flatMap(x => Array.isArray(x?.config) ? x.config : [x])
  const persona = plugins.find(x => x?.name === '@deepseek-ai/dsh-persona')?.config?.prefix ?? ''
  add(join(base, role, 'agent.cordis.yml'), persona, `persona:${role}`)
}
const walk = d => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]) : []
for (const f of walk(join(base)).filter(f => f.endsWith('SKILL.md'))) add(f, readFileSync(f, 'utf8'), 'skill')
for (const f of ['docs/delegation.md', 'docs/presets.md']) add(join(ROOT, f), readFileSync(join(ROOT, f), 'utf8'), 'contract')
const top = files.filter(f => f.total > 0).sort((a, b) => b.total - a.total)
const termFiles = Object.fromEntries(terms.map(t => [t, files.filter(f => f.counts[t] > 0).length]))
const termTotal = Object.fromEntries(terms.map(t => [t, files.reduce((n, f) => n + f.counts[t], 0)]))
console.log(JSON.stringify({ top, termFiles, termTotal }, null, 2))
