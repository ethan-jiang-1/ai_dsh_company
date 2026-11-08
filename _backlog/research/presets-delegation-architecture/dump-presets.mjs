// 只读：从 `dsh --profile company --dump-config` 的输出里抽 preset 组合（keyless 声明面读数）。
// 用法：node dump-presets.mjs /tmp/company-dump.yml > dump-presets.json
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const yaml = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const schema = yaml.CORE_SCHEMA.extend([new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: d => d })])
const file = process.argv[2]
if (!file) throw new Error('usage: node dump-presets.mjs <dump.yml>')
const doc = yaml.load(readFileSync(file, 'utf8'), { schema })
const rows = Array.isArray(doc) ? doc : []
const flatten = v => Array.isArray(v) ? v.flatMap(flatten) : (v && typeof v === 'object' && Array.isArray(v.config) ? v.config.flatMap(flatten) : [v])
const out = []
for (const row of rows) {
  if (row?.name !== '@deepseek-ai/dsh-agent-preset' || typeof row?.config?.id !== 'string') continue
  const plugins = flatten(row.config.plugins ?? []).filter(x => x && typeof x === 'object' && typeof x.name === 'string')
  const subagent = plugins.filter(x => x.name === '@deepseek-ai/dsh-tool-subagent').map(x => ({ toolName: x.config?.toolName, agentPreset: x.config?.agentPreset, maxDepth: x.config?.maxDepth, provider: x.config?.provider }))
  out.push({
    id: row.config.id,
    childRows: plugins.length,
    subagent,
    control: plugins.some(x => String(x.name).includes('tool-subagent-control')),
    workflow: plugins.some(x => String(x.name).includes('workflow')),
    names: plugins.map(x => x.name.replace('@deepseek-ai/dsh-', '').replace('@deepseek-ai/', '')).sort(),
  })
}
console.log(JSON.stringify(out, null, 2))
