// E4：fresh workspace 的 kb/process-docs.md 是否随 company.md 的 productType 变。
// 两个仅 productType 不同的临时 workspace，跑真实 bootstrapCompanyWorkspace，比较播种结果。
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapCompanyWorkspace } from '/Users/bowhead/ai_dsh_company/packages/company-pack/src/host/run-bundle/bootstrap.ts'

const contentDir = '/Users/bowhead/ai_dsh_company/packages/company-pack/content'
const seeded = new Map()

for (const type of ['business-software', 'hardware-software']) {
  const workspace = mkdtempSync(join(tmpdir(), `e4-${type}-`))
  const kb = join(workspace, '.dsh-company/kb')
  mkdirSync(kb, { recursive: true })
  writeFileSync(join(kb, 'company.md'), `---\ncompany: experiment\nproductType: ${type}\n---\n`)
  try {
    const { plan, result } = bootstrapCompanyWorkspace(contentDir, workspace)
    const target = join(kb, 'process-docs.md')
    const text = readFileSync(target, 'utf8')
    seeded.set(type, text)
    console.log(`\n== productType: ${type} ==`)
    console.log(`created=${result.created.length} skipped=${result.skipped.length}`)
    const entry = plan.entries.find(e => e.rel.endsWith('kb/process-docs.md'))
    console.log(`plan entry: source=${entry?.sourceRel} rel=${entry?.rel}`)
    console.log(`sha256=${createHash('sha256').update(text).digest('hex').slice(0, 16)}`)
    console.log(`has hardware-software: ${text.includes('hardware-software')}`)
    console.log(`has SyRS/IRS/V&V: ${/SyRS/.test(text)}/${/IRS/.test(text)}/${/V&V/.test(text)}`)
    console.log('--- first 12 lines ---')
    console.log(text.split('\n').slice(0, 12).join('\n'))
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

const [a, b] = [...seeded.values()]
console.log(`\n== differential ==\nbusiness == hardware: ${a === b}`)
