// E12：11 个 preset 的工具面矩阵；对照 persona/注释里的能力声明。
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = '/Users/bowhead/ai_dsh_company'
const presets = join(root, 'packages/company-pack/presets')
const files = readdirSync(presets, { withFileTypes: true })
  .filter(e => e.isDirectory() && !e.name.startsWith('_'))
  .map(e => `packages/company-pack/presets/${e.name}/agent.cordis.yml`)

const flags = [
  ['fs', /dsh-tool-fs/],
  ['write', /write:\s*true|write:\s*false/],
  ['bash', /dsh-tool-bash/],
  ['web', /dsh-tool-web/],
  ['skill', /dsh-tool-skill/],
  ['subagent', /dsh-tool-subagent/],
  ['workflow', /dsh-tool-workflow/],
  ['control', /dsh-tool-subagent-control/],
  ['team', /tool-agent-team/],
  ['ask', /dsh-tool-ask-user/],
  ['present', /dsh-tool-present/],
  ['handbook', /dsh-agent-instructions/],
]

console.log(['preset', ...flags.map(([name]) => name)].join('\t'))
for (const rel of files) {
  const text = readFileSync(join(root, rel), 'utf8')
  const row = [rel.split('/').at(-2)]
  for (const [, re] of flags) row.push(re.test(text) ? 'Y' : '—')
  console.log(row.join('\t'))
}

console.log('\n== E12 write/edit off ==')
for (const rel of files) {
  const text = readFileSync(join(root, rel), 'utf8')
  if (/write:\s*false|edit:\s*false/.test(text)) {
    console.log(`${rel.split('/').at(-2)}\twriteFalse=${/write:\s*false/.test(text)}\teditFalse=${/edit:\s*false/.test(text)}`)
  }
}
