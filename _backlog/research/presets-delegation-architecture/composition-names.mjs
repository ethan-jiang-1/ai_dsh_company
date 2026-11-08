import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const yaml = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const schema = yaml.CORE_SCHEMA.extend([new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: d => d })])
const base = join(ROOT, 'packages/company-pack/presets')
const roles = readdirSync(base).filter(n => n !== '_shared' && statSync(join(base, n)).isDirectory()).sort()
const all = []
for (const role of roles) {
  const doc = yaml.load(readFileSync(join(base, role, 'agent.cordis.yml'), 'utf8'), { schema })
  const rows = []
  const collect = v => { if (Array.isArray(v)) return v.forEach(collect); if (v && typeof v === 'object') { if (typeof v.id === 'string' && typeof v.name === 'string') rows.push(v); Object.values(v).forEach(collect) } }
  collect(doc)
  const preset = rows.find(r => r.name === '@deepseek-ai/dsh-agent-preset')
  const plugins = (preset?.config?.plugins ?? []).flatMap(x => Array.isArray(x?.config) ? x.config : [x])
  for (const row of plugins) if (row && typeof row.name === 'string') all.push({ role, name: row.name, config: row.config })
}
const nameRoles = new Map()
for (const r of all) { const s = nameRoles.get(r.name) ?? new Set(); s.add(r.role); nameRoles.set(r.name, s) }
const common = [...nameRoles.entries()].filter(([, s]) => s.size === roles.length).map(([n]) => n).sort()
const partial = [...nameRoles.entries()].filter(([, s]) => s.size > 1 && s.size < roles.length).map(([n, s]) => [n, s.size, [...s].join(',')])
const unique = [...nameRoles.entries()].filter(([, s]) => s.size === 1).map(([n, s]) => [n, [...s][0]])
console.log(JSON.stringify({ roles, names: nameRoles.size, common, partial, unique, sample: { fs: all.filter(r=>r.name.endsWith('tool-fs')).map(r=>[r.role, JSON.stringify(r.config)]), instr: all.filter(r=>r.name.endsWith('agent-instructions')).map(r=>[r.role, JSON.stringify(r.config)]) } }, null, 2))
