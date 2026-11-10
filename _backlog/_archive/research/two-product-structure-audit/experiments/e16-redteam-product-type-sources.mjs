// E16：red-team 新门禁 product-type-sources。
// 在临时 root 复制 content/presets/docs，逐案变异，观察门禁是“该红则红、该绿则绿”，
// 以及是否存在误伤/漏检。只读真仓库；所有变异只发生在临时副本。
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import * as gate from '/Users/bowhead/ai_dsh_company/checks/gates/product-type-sources.mjs'

const repo = '/Users/bowhead/ai_dsh_company'

/** 每个案例用一份干净副本，避免变异互相污染。 */
function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'e16-product-type-'))
  cpSync(join(repo, 'packages/company-pack/content'), join(root, 'packages/company-pack/content'), { recursive: true })
  cpSync(join(repo, 'packages/company-pack/presets'), join(root, 'packages/company-pack/presets'), { recursive: true })
  mkdirSync(join(root, 'docs/guides'), { recursive: true })
  cpSync(join(repo, 'docs/guides/product-definition.md'), join(root, 'docs/guides/product-definition.md'))
  return root
}

function run(root) {
  const messages = []
  gate.run({
    root,
    ok: (msg) => messages.push(`OK ${msg}`),
    fail: (name, msg) => messages.push(`FAIL ${name}: ${msg}`),
  })
  return messages
}

function read(root, rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function write(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
}

/** 把“未来类型”的提及从可选面拿掉，并把 playbook 标成未来；这是修复方可能的终态。 */
function applyIntendedFix(root) {
  const skill = 'packages/company-pack/presets/_shared/skills/product-definition/SKILL.md'
  write(root, skill, read(root, skill).replace(/^\| 项目制 \/ 系统集成 .*$/m, '').replace(/\n{3,}/g, '\n\n'))

  const ref = 'packages/company-pack/presets/_shared/skills/product-definition/references/project-services.md'
  write(root, ref, `> 未来类型：未随包发布。\n\n${read(root, ref)}`)

  const cmo = 'packages/company-pack/content/charters/cmo.md'
  write(root, cmo, read(root, cmo).replace('`project-services` / `hardware-software`', '`hardware-software` / `business-software`'))

  const guide = 'docs/guides/product-definition.md'
  write(root, guide, read(root, guide).replace('`project-services.md`（项目制/系统集成）/ ', ''))

  const businessOverview = 'packages/company-pack/content/product-types/business-software/overview.md'
  write(root, businessOverview, read(root, businessOverview)
    .replace('若按 SOW/UAT/驻场交付，改用 `project-services`（后续类型）。', '若按 SOW/UAT/驻场交付，改用项目制类型（未来类型，当前未随包发布）。'))
}

function caseRun(name, mutate, expect) {
  const root = makeRoot()
  try {
    mutate?.(root)
    const messages = run(root)
    const failed = messages.some(msg => msg.startsWith('FAIL'))
    const verdict = failed ? 'RED' : 'GREEN'
    console.log(`\n== ${name} (expected ${expect}) ==`)
    console.log(`verdict: ${verdict}`)
    for (const message of messages.slice(0, 4)) console.log(message)
    return { name, verdict, expect, messages, ok: verdict === expect }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const results = []
results.push(caseRun('C0 当前真树（修复后应绿）', null, 'GREEN'))
results.push(caseRun('C1 修复方终态（应绿）', applyIntendedFix, 'GREEN'))

results.push(caseRun('C2 默认值加引号（YAML 合法，应绿？）', (root) => {
  applyIntendedFix(root)
  const company = 'packages/company-pack/content/state/company.md'
  write(root, company, read(root, company).replace(/^productType:.*$/m, 'productType: "business-software"'))
}, 'GREEN'))

results.push(caseRun('C3 默认值带行内注释（YAML 合法，应绿？）', (root) => {
  applyIntendedFix(root)
  const company = 'packages/company-pack/content/state/company.md'
  write(root, company, read(root, company).replace(/^productType:.*$/m, 'productType: business-software # 默认'))
}, 'GREEN'))

results.push(caseRun('C4 可选面裸写 project-services（已知边界：裸散文不判，应绿）', (root) => {
  applyIntendedFix(root)
  const cmo = 'packages/company-pack/content/charters/cmo.md'
  write(root, cmo, read(root, cmo).replace('先加载共享 `product-definition`', '项目制类型 project-services 暂未随包发布；先加载共享 `product-definition`'))
}, 'GREEN'))

results.push(caseRun('C5 品类表保留“未来类型”行（策略：不进表，应红）', (root) => {
  applyIntendedFix(root)
  const skill = 'packages/company-pack/presets/_shared/skills/product-definition/SKILL.md'
  write(root, skill, read(root, skill).replace('| 硬软一体产品 |', '| 项目制 / 系统集成（未来类型） | `references/project-services.md` | SOW 边界、UAT |\n| 硬软一体产品 |'))
}, 'RED'))

results.push(caseRun('C6 受支持类型从 CMO/meta/CEO 全部删掉（第二套枚举已移除：应绿）', (root) => {
  applyIntendedFix(root)
  for (const rel of [
    'packages/company-pack/content/charters/cmo.md',
    'packages/company-pack/content/templates/meta.md',
    'packages/company-pack/content/templates/mrd.md',
    'packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md',
  ]) {
    const text = read(root, rel)
    write(root, rel, text.replaceAll('`business-software`', '').replaceAll('business-software', ''))
  }
}, 'GREEN'))

console.log('\n== summary ==')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'UNEXPECTED'} ${r.name}: ${r.verdict}`)
