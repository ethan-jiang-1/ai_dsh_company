// E13：质量环“独立”的说法是否有过度声称。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = '/Users/bowhead/ai_dsh_company'
const files = [
  'packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md',
  'packages/company-pack/content/company/review-protocol.md',
  'docs/guides/quality-loop.md',
  'packages/company-pack/presets/quality-loop-verifier/agent.cordis.yml',
  'packages/company-pack/presets/quality-loop-producer/agent.cordis.yml',
]
const re = /独立复核|异人|双人|独立验证|上下文独立|同模/

for (const rel of files) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n')
  const hits = lines.map((line, i) => ({ line, i: i + 1 })).filter(({ line }) => re.test(line))
  console.log(`\n# ${rel} (${hits.length} hits)`)
  for (const { line, i } of hits) console.log(`${i}: ${line.trim()}`)
}
