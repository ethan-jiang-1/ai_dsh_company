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
//   content-manifest      content/ 下放 symlink 文件                          → 出现 symlink
//   content-manifest      删 content/templates/ 整目录                        → 必需目录缺内容
//   content-manifest      inventory 里塞重复项                                → inventory 重复
//   base-clean            charter 加“公司财务 agent 案（date-pending）”           → 含部署个案语言
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as baseClean from '../../checks/gates/base-clean.mjs'
import * as contentManifest from '../../checks/gates/content-manifest.mjs'
import * as contentSingleHome from '../../checks/gates/content-single-home.mjs'
import * as methodContract from '../../checks/gates/method-contract.mjs'
import * as packContentPaths from '../../checks/gates/pack-content-paths.mjs'
import * as navCountClaims from '../../checks/gates/nav-count-claims.mjs'
import { mutateFile } from '../support/mutation.mjs'

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
  // BUG-266：symlink 文件此前 entry.isFile() 为 false，整条被静默跳过 → gate 绿。
  const root = makeRoot()
  try {
    symlinkSync(join(root, 'packages/company-pack/content/AGENTS.md'), join(root, 'packages/company-pack/content/company/zz-link.md'))
    report('content-manifest：symlink 文件 → 红', run(contentManifest, root), '出现 symlink')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // BUG-274：gate 用 Set 收敛重复项（不判重复），checker 判 —— 同一清单两门结论相反。
  const root = makeRoot()
  try {
    const path = join(root, 'packages/company-pack/content/manifest.json')
    const manifest = JSON.parse(readFileSync(path, 'utf8'))
    manifest.inventory = [...manifest.inventory, manifest.inventory[0]]
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
    report('content-manifest：inventory 重复项 → 红', run(contentManifest, root), 'inventory 重复')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // BUG-273：必需目录此前只用于「未登记 .md」扫描，目录缺失走 continue → gate 绿。
  const root = makeRoot()
  try {
    rmSync(join(root, 'packages/company-pack/content/templates'), { recursive: true, force: true })
    report('content-manifest：删必需目录 → 红', run(contentManifest, root), '必需目录缺内容')
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

{
  // nav-count-claims 文档篇数类（2026-11-16 扩）：红方向 = 括号裸篇数库存注解（真实病灶形状）；
  // 豁免方向 = 本篇/一篇/四篇/历史叙事（篇后散文）仍绿。门属导航面中风险，conformance 住本 smoke；
  // 分支级定向 mutation 套件（gate-mutation.test.mjs）scope 仍是七个高风险门，不含本门。
  const root = makeRoot()
  try {
    mkdirSync(join(root, 'docs/guides'), { recursive: true })
    const path = join(root, 'docs/guides/zz-doc-count.md')
    writeFileSync(path, '# x\n\n- `notes/`（332 篇）与 `_backlog/`（597 篇）是决策记忆。\n')
    report('nav-count-claims：括号裸篇数（分支①）→ 红', run(navCountClaims, root), '文档篇数计数声明')
    // 盲审 S1：分支②（库存目录相邻裸篇数）独立红夹具——只坏分支②而①仍在时也必须红。
    writeFileSync(path, '# x\n\nnotes/ 现有 335 篇，持续增长。\n')
    report('nav-count-claims：库存目录相邻裸篇数（分支②）→ 红', run(navCountClaims, root), '文档篇数计数声明')
    // 盲审 S2：豁免夹具补齐注释清单（长篇/八篇/两篇），与真盘 13 行绿双兜。
    writeFileSync(path, '# x\n\n本篇管环境。各追加一篇。四篇理由 Note。八篇制度。两篇 PDF。长篇失控。（46 篇 journal 已于昔日迁移）。\n')
    const msgs = run(navCountClaims, root)
    const green = !msgs.some(m => m.startsWith('FAIL'))
    if (!green) failures += 1
    console.log(`${green ? 'PASS' : 'FAIL'} nav-count-claims：本篇/一篇/四篇/历史叙事 → 豁免绿`)
    for (const m of msgs.slice(0, 2)) console.log(`  ${m}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

console.log(failures === 0 ? 'gates-negative-smoke: ALL PASS' : `gates-negative-smoke: ${failures} FAILURE(S)`)
process.exitCode = failures === 0 ? 0 : 1
