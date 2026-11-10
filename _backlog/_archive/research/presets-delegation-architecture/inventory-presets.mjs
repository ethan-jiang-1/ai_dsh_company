import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const yaml = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const schema = yaml.CORE_SCHEMA.extend([
  new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: d => d }),
])
const base = join(ROOT, 'packages/company-pack/presets')
const roles = readdirSync(base).filter(n => n !== '_shared' && statSync(join(base, n)).isDirectory()).sort()
const walk = d => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]) : []
const out = []
for (const role of roles) {
  const file = join(base, role, 'agent.cordis.yml')
  const text = readFileSync(file, 'utf8')
  const doc = yaml.load(text, { schema })
  const rows = []
  const collect = v => {
    if (Array.isArray(v)) { for (const x of v) collect(x); return }
    if (v && typeof v === 'object') {
      if (typeof v.id === 'string' && typeof v.name === 'string') rows.push(v)
      for (const x of Object.values(v)) collect(x)
    }
  }
  collect(doc)
  const presetRow = rows.find(r => r.name === '@deepseek-ai/dsh-agent-preset')
  const plugins = presetRow?.config?.plugins ?? []
  const flatten = v => Array.isArray(v) ? v.flatMap(flatten) : (v && typeof v === 'object' && Array.isArray(v.config) ? v.config.flatMap(flatten) : [v])
  const pluginRows = flatten(plugins).filter(x => x && typeof x === 'object' && typeof x.name === 'string')
  const toolRows = pluginRows.filter(x => /dsh-tool-|dsh-persona|skill-filesystem|agent-preset/.test(x.name))
  const persona = pluginRows.find(x => x.name === '@deepseek-ai/dsh-persona')?.config?.prefix ?? ''
  const skillDirs = pluginRows.filter(x => x.name === '@deepseek-ai/dsh-skill-filesystem').flatMap(x => x.config?.customSkillDirs ?? [])
  const skillFiles = walk(join(base, role, 'skills')).filter(f => f.endsWith('SKILL.md'))
  out.push({
    role,
    ymlLines: text.split('\n').length,
    ymlBytes: text.length,
    pluginRows: pluginRows.length,
    toolRows: toolRows.length,
    personaChars: persona.length,
    personaMentionsWorkflow: (persona.match(/workflow/gi) ?? []).length,
    personaMentionsSubagent: (persona.match(/subagent/gi) ?? []).length,
    personaMentionsTeam: (persona.match(/team/gi) ?? []).length,
    skillFiles: skillFiles.length,
    skillLines: skillFiles.reduce((n, f) => n + readFileSync(f, 'utf8').split('\n').length, 0),
    toolNames: toolRows.map(x => x.name.replace('@deepseek-ai/dsh-', '').replace('@deepseek-ai/', '')).sort(),
  })
}
console.log(JSON.stringify(out, null, 2))
