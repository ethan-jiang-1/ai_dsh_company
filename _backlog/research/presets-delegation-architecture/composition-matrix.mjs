// 只读：把 9 个 preset 的 plugins 行归一化，区分“公共底座”与“每角色 delta”，量化 H1/H2 的可行性。
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const yaml = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const schema = yaml.CORE_SCHEMA.extend([new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: d => d })])
const base = join(ROOT, 'packages/company-pack/presets')
const stable = v => JSON.stringify(v, Object.keys(v ?? {}).sort())
const roles = readdirSync(base).filter(n => n !== '_shared' && statSync(join(base, n)).isDirectory()).sort()
const all = []
for (const role of roles) {
  const doc = yaml.load(readFileSync(join(base, role, 'agent.cordis.yml'), 'utf8'), { schema })
  const rows = []
  const collect = v => { if (Array.isArray(v)) return v.forEach(collect); if (v && typeof v === 'object') { if (typeof v.id === 'string' && typeof v.name === 'string') rows.push(v); Object.values(v).forEach(collect) } }
  collect(doc)
  const preset = rows.find(r => r.name === '@deepseek-ai/dsh-agent-preset')
  const plugins = (preset?.config?.plugins ?? []).flatMap(x => Array.isArray(x?.config) ? x.config : [x])
  for (const row of plugins) {
    if (!row || typeof row.name !== 'string') continue
    all.push({ role, name: row.name, key: stable({ name: row.name, config: row.config ?? null }) })
  }
}
const byKey = new Map()
for (const row of all) {
  const entry = byKey.get(row.key) ?? { name: row.name, roles: new Set(), count: 0 }
  entry.roles.add(row.role); entry.count += 1
  byKey.set(row.key, entry)
}
const common = [...byKey.values()].filter(e => e.roles.size === roles.length)
const shared = [...byKey.values()].filter(e => e.roles.size > 1 && e.roles.size < roles.length)
const unique = [...byKey.values()].filter(e => e.roles.size === 1)
const deltas = Object.fromEntries(roles.map(role => {
  const rows = all.filter(r => r.role === role)
  const delta = rows.filter(r => (byKey.get(r.key)?.roles.size ?? 0) < roles.length)
  return [role, { total: rows.length, delta: delta.length, names: [...new Set(delta.map(r => r.name))] }]
}))
console.log(JSON.stringify({
  roles, totalRows: all.length, distinctRows: byKey.size,
  common: common.map(e => e.name).sort(),
  shared: shared.map(e => ({ name: e.name, roles: [...e.roles] })).sort((a, b) => a.name.localeCompare(b.name)),
  unique: unique.map(e => ({ name: e.name, role: [...e.roles][0] })).sort((a, b) => a.name.localeCompare(b.name)),
  deltas,
}, null, 2))
