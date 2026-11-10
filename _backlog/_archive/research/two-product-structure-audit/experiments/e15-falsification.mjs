// E15：反证实验——故意找三条可能被证伪的假设，记录“确实被证伪”。
import { readFileSync } from 'node:fs'

const root = '/Users/bowhead/ai_dsh_company'

// H1：org 编制总数不等于 50。
const org = readFileSync(`${root}/packages/company-pack/content/state/org.md`, 'utf8').split('\n')
let sum = 0
for (const line of org) {
  if (!/^\| /.test(line) || /合计|---|岗位|人数/.test(line)) continue
  const n = Number(line.split('|').map(s => s.trim())[2])
  if (Number.isFinite(n)) sum += n
}
console.log(`H1 org sum = ${sum} -> ${sum === 50 ? 'REFUTED (等于 50)' : 'CONFIRMED (不等于 50)'}`)

// H2：worker 带 team/subagent/workflow/control/ask-user/present。
const worker = readFileSync(`${root}/packages/company-pack/presets/worker/agent.cordis.yml`, 'utf8')
const forbidden = ['tool-agent-team', 'dsh-tool-subagent', 'dsh-tool-workflow', 'dsh-tool-subagent-control', 'dsh-tool-ask-user', 'dsh-tool-present']
const workerHits = forbidden.filter(name => worker.includes(name))
console.log(`H2 worker forbidden tool rows = [${workerHits.join(', ')}] -> ${workerHits.length === 0 ? 'REFUTED (没有)' : 'CONFIRMED (有)'}`)

// H3：quality-loop-verifier 能写/能跑 bash。
const verifier = readFileSync(`${root}/packages/company-pack/presets/quality-loop-verifier/agent.cordis.yml`, 'utf8')
console.log(`H3 verifier write:false=${/write:\s*false/.test(verifier)} edit:false=${/edit:\s*false/.test(verifier)} bash=${/dsh-tool-bash/.test(verifier)} -> ${/write:\s*false/.test(verifier) && /edit:\s*false/.test(verifier) && !/dsh-tool-bash/.test(verifier) ? 'REFUTED (只读)' : 'CONFIRMED (能写/能跑)'}`)
