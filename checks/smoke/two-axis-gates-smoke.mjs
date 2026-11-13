// 状态：常驻
// 何时跑：改 `checks/gates/{product-type,delivery-mode}-sources.mjs`、对应的 content 枚举/包形状后；
//   发布前。跑法 = `node checks/smoke/two-axis-gates-smoke.mjs`（keyless，秒级，不进 pnpm test）。
//
// 为什么在 smoke 而不在 tests/：这两个门禁读的是根驱动面（checks/gates），tests/ 的 layering 守卫
//   禁止 import checks 驱动；负例需要真复制 content/presets 再跑门禁，属于入口级检查。
//
// 判据：① 真副本双双 OK；② 品类表加无类型包的行 → product-type-sources 红；
//   ③ 删 managed-service 的 SLA 模板 → delivery-mode-sources 红；④ 删 meta 的 deliveryMode 字段 → 红。
// 负例 mutation 必须真的改到字节（mutateFile 守卫）：输入改名/改形时先报「mutation 没命中」，
//   不把夹具过期误报成「gate 没红」（2026-11-13 的两次空转事故）。
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as productGate from '../gates/product-type-sources.mjs'
import * as deliveryGate from '../gates/delivery-mode-sources.mjs'
import { mutateFile } from './lib/mutation.mjs'

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
const mutateOrFail = (label, path, transform) => {
  if (mutateFile(path, transform)) return true
  failures += 1
  console.log(`FAIL ${label}（mutation 没命中：输入已改名/改形，先更新夹具）`)
  return false
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
    if (mutateOrFail('品类表加无类型包的行', skill, text => text.replace(
      '| Hardware-software product |',
      '| zz-no-such-type | `references/zz-no-such-type.md` | SOW/UAT |\n| Hardware-software product |',
    ))) {
      report('品类表加无类型包的行 → product-type-sources 红', run(productGate, root), messages => messages.some(m => m.includes('宣告了不可执行的类型')))
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const sla = join(root, 'packages/company-pack/content/delivery-modes/managed-service/templates/sla.md')
    if (!existsSync(sla)) {
      failures += 1
      console.log('FAIL 删 managed-service SLA 模板（fixture 缺失：先更新夹具）')
    } else {
      rmSync(sla)
      report('删 managed-service SLA 模板 → delivery-mode-sources 红', run(deliveryGate, root), messages => messages.some(m => m.includes('SLA.template 不在场')))
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const meta = join(root, 'packages/company-pack/content/templates/meta.md')
    if (mutateOrFail('删 meta deliveryMode 字段', meta, text => text.replace(/^deliveryMode:.*$/m, ''))) {
      report('删 meta deliveryMode 字段 → delivery-mode-sources 红', run(deliveryGate, root), messages => messages.some(m => m.includes('缺「deliveryMode:」字段')))
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

console.log(failures === 0 ? 'two-axis-gates-smoke: ALL PASS' : `two-axis-gates-smoke: ${failures} FAILURE(S)`)
process.exitCode = failures === 0 ? 0 : 1
