// 状态：常驻
// 何时跑：改 `checks/gates/` 的判据、或发布前；keyless，秒级。
// 跑法：`node tests/checks/gates-negative.test.mjs`
//
// 为什么在 smoke 而不在 tests/：门禁读的是根驱动面（checks/gates），tests/ 的 layering 守卫
// 禁止 import checks 驱动；负例要复制 content/presets 再跑门禁，属于入口级检查。
//
// gate → 破坏方式 → 期望消息：
//   method-contract       project-economics 的 `适用交付模式 = nope`          → 没有交付模式包
//   pack-content-paths    AGENTS 加 `` `content/nope.md` ``                    → 死指针
//   content-single-home   删 policy-lines 的“服务信用”行                     → 缺政策线
//   content-manifest      company/ 加一份未登记 .md                           → 未登记的 content 文件
//   base-clean            charter 加“公司财务 agent 案（date-pending）”           → 含部署个案语言
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as baseClean from '../../checks/gates/base-clean.mjs'
import * as contentManifest from '../../checks/gates/content-manifest.mjs'
import * as contentSingleHome from '../../checks/gates/content-single-home.mjs'
import * as methodContract from '../../checks/gates/method-contract.mjs'
import * as packContentPaths from '../../checks/gates/pack-content-paths.mjs'
import { mutateFile } from '../../checks/lanes/lib/mutation.mjs'

const ROOT = new URL('../../', import.meta.url).pathname

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'gates-negative-'))
  cpSync(join(ROOT, 'packages/company-pack/content'), join(root, 'packages/company-pack/content'), { recursive: true })
  cpSync(join(ROOT, 'packages/company-pack/presets'), join(root, 'packages/company-pack/presets'), { recursive: true })
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
const report = (label, messages, needle) => {
  const passed = messages.some(msg => msg.startsWith('FAIL') && msg.includes(needle))
  if (!passed) failures += 1
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
  for (const message of messages.slice(0, 2)) console.log(`  ${message}`)
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
    const path = join(root, 'packages/company-pack/presets/cfo/skills/project-economics/SKILL.md')
    if (mutateOrFail('method-contract：未知交付模式', path, text => text.replace('applicable delivery modes = project-services', 'applicable delivery modes = nope'))) {
      report('method-contract：未知交付模式 → 红', run(methodContract, root), '没有交付模式包')
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const path = join(root, 'packages/company-pack/content/AGENTS.md')
    writeFileSync(path, `${readFileSync(path, 'utf8')}\n死指针：\`content/nope.md\`\n`)
    report('pack-content-paths：content/nope.md → 红', run(packContentPaths, root), '死指针')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const path = join(root, 'packages/company-pack/content/company/policy-lines.md')
    if (mutateOrFail('content-single-home：删 Service credit', path, text => text.replace(/^- \*\*Service credit\*\*.*$/m, ''))) {
      report('content-single-home：删 Service credit → 红', run(contentSingleHome, root), '缺政策线「Service credit」')
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    writeFileSync(join(root, 'packages/company-pack/content/company/zz-unlisted.md'), '# 未登记\n')
    report('content-manifest：未登记文件 → 红', run(contentManifest, root), '未登记的 content 文件')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  const root = makeRoot()
  try {
    const path = join(root, 'packages/company-pack/content/charters/cfo.md')
    if (mutateOrFail('base-clean：部署个案语言', path, text => text.replace('## Historical minutes', '- 公司财务 agent 案（date-pending）。\n\n## Historical minutes'))) {
      report('base-clean：部署个案语言 → 红', run(baseClean, root), '含部署个案语言')
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

console.log(failures === 0 ? 'gates-negative-smoke: ALL PASS' : `gates-negative-smoke: ${failures} FAILURE(S)`)
process.exitCode = failures === 0 ? 0 : 1
