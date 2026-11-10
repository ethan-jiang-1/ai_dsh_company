// E11：maxDepth 是绝对上限，还是相对层级？
// 用 vendor 的真实 resolveChildDepth 构造 parent depth × maxDepth 真值表，
// 再对照 docs/contracts/delegation.md 的例子。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveChildDepth } from '/Users/bowhead/ai_dsh_company/vendor/dsh/packages/subagent/subagent/src/child-agent.ts'

const root = '/Users/bowhead/ai_dsh_company'

function fakeAgent(depth) {
  return {
    options: { subagentDepth: depth },
    session: { header: { delegationDepth: depth } },
  }
}

console.log('== E11 truth table: child = parent + 1; allowed iff child <= maxDepth ==')
console.log(['parentDepth', 'maxDepth', 'childDepth', 'result'].join('\t'))
for (const parent of [0, 1, 2]) {
  for (const max of [1, 2, 3]) {
    try {
      const child = resolveChildDepth(fakeAgent(parent), max)
      console.log([parent, max, child, 'ALLOW'].join('\t'))
    } catch (error) {
      console.log([parent, max, parent + 1, `THROW ${error.constructor.name}`].join('\t'))
    }
  }
}

console.log('\n== E11 delegation.md line 40 ==')
const doc = readFileSync(join(root, 'docs/contracts/delegation.md'), 'utf8').split('\n')
console.log(`40: ${doc[39]}`)

console.log('\n== E11 vp_eng / vp_cmo rows ==')
for (const line of doc) {
  if (/\| `vp_eng` \||\| `vp_cmo` \|/.test(line)) console.log(line)
}
