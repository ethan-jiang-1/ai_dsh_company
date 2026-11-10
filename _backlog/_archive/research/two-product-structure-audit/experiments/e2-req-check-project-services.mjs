// E2：同一个动议，只换 meta 的 `产品类型`：
//   project-services（skill 表里有 playbook）vs business-software（content 里有包）。
// 预期：前者“未知产品类型”，后者通过。用真实 registerReqCommand + 真 contentDir。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerReqCommand } from '/Users/bowhead/ai_dsh_company/packages/company-pack/src/host/commands/req-command.ts'

const contentDir = '/Users/bowhead/ai_dsh_company/packages/company-pack/content'
const MRD = `---\nlayer: MRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n{"mrd":{"version":"0.1","status":"draft","opportunities":[{"id":"MR-001","title":"机会","recommendation":"go"}]}}\n\`\`\`\n`
const STRS = `---\nlayer: StRS\ndefinition: headings\n---\n\n### REQ-001 涉众诉求\n\n- status: 草案\n- traces: [MR-001]\n`
const PRD = `---\nlayer: PRD\ndefinition: json-ledger\n---\n\n\`\`\`json\n{"prd":{"version":"0.1","status":"draft","slices":[{"id":"S1","goal":"闭环","requirements":["REQ-002"]}],"requirements":[{"id":"REQ-002","title":"需求","type":"functional","priority":"P0","status":"draft","source":["MR-001"],"traces":["REQ-001"],"slice":"S1","userStory":"作为用户我要它","acceptance":[{"id":"AC-002-1","given":"g","when":"w","then":"t"}],"dependsOn":[],"verification":"test","openQuestions":[],"changeLog":[]}]}}\n\`\`\`\n`

function mount(workspace) {
  let definition
  const ctx = { commands: { register: (def) => { definition = def } } }
  registerReqCommand(ctx, { dataBlocked: false, workspace, contentDir })
  return definition
}

for (const type of ['business-software', 'project-services']) {
  const workspace = mkdtempSync(join(tmpdir(), `e2-${type}-`))
  const root = join(workspace, '.dsh-company/deliverables/2026-11-11-demo')
  const drafts = join(root, 'drafts')
  mkdirSync(drafts, { recursive: true })
  writeFileSync(join(root, 'meta.md'), `slug: demo\nkickoff: 2026-11-11\n编号体系: identity\n产品类型: ${type}\n`)
  for (const [name, body] of [['mrd.md', MRD], ['strs.md', STRS], ['prd.md', PRD]]) {
    writeFileSync(join(drafts, name), body)
  }
  try {
    const result = await mount(workspace).handler({ rawInput: 'check 2026-11-11-demo' })
    console.log(`\n== productType: ${type} ==`)
    console.log(`kind: ${result.kind}`)
    console.log(result.text)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}
