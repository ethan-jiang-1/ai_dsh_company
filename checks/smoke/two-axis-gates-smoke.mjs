// 状态：常驻
// 何时跑：改 `checks/gates/{product-type,delivery-mode}-sources.mjs`、对应的 content 枚举/包形状后；
//   发布前。跑法 = `node checks/smoke/two-axis-gates-smoke.mjs`（keyless，秒级，不进 pnpm test）。
//
// 为什么在 smoke 而不在 tests/：这两个门禁读的是根驱动面（checks/gates），tests/ 的 layering 守卫
//   禁止 import checks 驱动；负例需要真复制 content/presets 再跑门禁，属于入口级检查。
//
// 判据：① 真副本双双 OK；② 品类表加无类型包的行 → product-type-sources 红；
//   ③ 删 managed-service 的 SLA 模板 → delivery-mode-sources 红；④ 删 meta 的交付模式字段 → 红。
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as productGate from '../gates/product-type-sources.mjs'
import * as deliveryGate from '../gates/delivery-mode-sources.mjs'

const ROOT = new URL('../../', import.meta.url).pathname

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'two-axis-gates-'))
  cpSync(join(ROOT, 'packages/company-pack/content'), join(root, 'packages/company-pack/content'), { recursive: true })
  cpSync(join(ROOT, 'packages/company-pack/presets'), join(root, 'packages/company-pack/presets'), { recursive: true })
  cpSync(join(ROOT, 'docs/guides/product-definition.md'), join(root, 'docs/guides/product-definition.md'))
  return root
}

function run(gate, root) {
  const messages = []
  gate.run({
    root,
    ok: (msg) => messages.push(`OK ${msg}`),
    fail: (name, msg) => messages.push(`FAIL ${name}: ${msg}`),
  })
  return messages
}

let failures = 0
const report = (label, messages, predicate) => {
  const passed = predicate(messages)
  if (!passed) failures += 1
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
  for (const message of messages.slice(0, 3)) console.log(`  ${message}`)
}

{
  const root = makeRoot()
  try {
    report('真副本：product-type-sources OK', run(productGate, root), messages => messages.some(m => m.startsWith('OK')))
    report('真副本：delivery-mode-sources OK', run(deliveryGate, root), messages => messages.some(m => m.startsWith('OK')))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const skill = join(root, 'packages/company-pack/presets/_shared/skills/product-definition/SKILL.md')
    writeFileSync(skill, readFileSync(skill, 'utf8').replace('| 硬软一体产品 |', '| 项目制 / 系统集成 | `references/project-services.md` | SOW/UAT |\n| 硬软一体产品 |'))
    report('品类表加无类型包的行 → product-type-sources 红', run(productGate, root), messages => messages.some(m => m.includes('宣告了不可执行的类型')))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    rmSync(join(root, 'packages/company-pack/content/delivery-modes/managed-service/templates/sla.md'))
    report('删 managed-service SLA 模板 → delivery-mode-sources 红', run(deliveryGate, root), messages => messages.some(m => m.includes('SLA.template 不在场')))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const meta = join(root, 'packages/company-pack/content/templates/meta.md')
    writeFileSync(meta, readFileSync(meta, 'utf8').replace(/^交付模式:.*$/m, ''))
    report('删 meta 交付模式字段 → delivery-mode-sources 红', run(deliveryGate, root), messages => messages.some(m => m.includes('缺「交付模式:」字段')))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

console.log(failures === 0 ? 'two-axis-gates-smoke: ALL PASS' : `two-axis-gates-smoke: ${failures} FAILURE(S)`)
process.exitCode = failures === 0 ? 0 : 1
