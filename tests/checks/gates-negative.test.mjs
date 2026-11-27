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
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as baseClean from '../../checks/gates/base-clean.mjs'
import * as contentManifest from '../../checks/gates/content-manifest.mjs'
import * as contentSingleHome from '../../checks/gates/content-single-home.mjs'
import * as methodContract from '../../checks/gates/method-contract.mjs'
import * as packContentPaths from '../../checks/gates/pack-content-paths.mjs'
import * as navCountClaims from '../../checks/gates/nav-count-claims.mjs'
import * as mdLinks from '../../checks/gates/md-links.mjs'
import * as docTaxonomy from '../../checks/gates/doc-taxonomy.mjs'
import * as docBudget from '../../checks/gates/doc-budget.mjs'
import * as layoutBlock from '../../checks/gates/layout-block.mjs'
import * as commandRefs from '../../checks/gates/command-refs.mjs'
import * as scriptIndex from '../../checks/gates/script-index.mjs'
import * as devProductParity from '../../checks/gates/dev-product-parity.mjs'
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
    // 2026-11-25：preset 计数类（第 12 个 preset 进仓当天即过期）。
    writeFileSync(path, '# x\n\n## 名册\n\n公司有 6 个 preset，六公司角色各一行。\n')
    report('nav-count-claims：preset 计数（6 个 preset）→ 红', run(navCountClaims, root), 'preset 计数声明')
    // 盲审 S2：豁免夹具补齐注释清单（长篇/八篇/两篇），与真盘 13 行绿双兜。
    writeFileSync(path, '# x\n\n本篇管环境。各追加一篇。四篇理由 Note。八篇制度。两篇 PDF。长篇失控。（46 篇 journal 已于昔日迁移）。\n')
    const msgs = run(navCountClaims, root)
    const green = !msgs.some(m => m.startsWith('FAIL'))
    if (!green) failures += 1
    console.log(`${green ? 'PASS' : 'FAIL'} nav-count-claims：本篇/一篇/四篇/历史叙事 → 豁免绿`)
    for (const m of msgs.slice(0, 2)) console.log(`  ${m}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // md-links repo-closed 判据（2026-11-25 立）：clean-clone 等价。三类夹具，三个方向都跑。
  const root = mkdtempSync(join(tmpdir(), 'gates-mdlinks-'))
  try {
    mkdirSync(join(root, 'docs'), { recursive: true })
    mkdirSync(join(root, 'lib'), { recursive: true })
    writeFileSync(join(root, '.gitignore'), 'lib/\n')
    writeFileSync(join(root, 'lib/out.js'), 'x\n')
    spawnSync('git', ['init', '-q'], { cwd: root })
    writeFileSync(join(root, 'docs/ok.md'), '# ok\n\n[内链](./also.md)\n')
    writeFileSync(join(root, 'docs/also.md'), '# also\n')
    writeFileSync(join(root, 'docs/outside.md'), '# x\n\n[外链](../../outside.md)\n')
    writeFileSync(join(root, 'docs/ignored.md'), '# x\n\n[产物](../lib/out.js)\n')
    report('md-links：相对链接逃出仓库根 → 红', run(mdLinks, root), 'repo 外目标')
    report('md-links：gitignored 产物目标 → 红', run(mdLinks, root), 'gitignored 目标')
    rmSync(join(root, 'docs/outside.md'))
    rmSync(join(root, 'docs/ignored.md'))
    const green = run(mdLinks, root)
    const clean = !green.some(m => m.startsWith('FAIL'))
    if (!clean) failures += 1
    console.log(`${clean ? 'PASS' : 'FAIL'} md-links：仓库内链接 → 绿`)
    for (const m of green.slice(0, 2)) console.log(`  ${m}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // doc-taxonomy（2026-11-27）：三分区（contracts/guides/reference）、最大深度 2、分区禁子 README.md、禁 docs/ 链 _backlog/。
  const root = mkdtempSync(join(tmpdir(), 'gates-taxonomy-'))
  try {
    mkdirSync(join(root, 'docs/contracts'), { recursive: true })
    mkdirSync(join(root, '_backlog'), { recursive: true })
    writeFileSync(join(root, '_backlog/README.md'), '# backlog\n')
    writeFileSync(join(root, 'docs/AGENTS.md'), '# AGENTS\n\n| 层 | 目录 | Job | **不属于这层** |\n|---|---|---|---|')
    writeFileSync(join(root, 'docs/README.md'), '# docs\n\n[AGENTS](./AGENTS.md)\n[contracts/](./contracts/)\n\n纯说明可用 `_backlog/` 反引号。\n')
    writeFileSync(join(root, 'docs/contracts/host-and-lib.md'), '# host\n')
    const green = run(docTaxonomy, root)
    const okClean = !green.some(m => m.startsWith('FAIL'))
    if (!okClean) failures += 1
    console.log(`${okClean ? 'PASS' : 'FAIL'} doc-taxonomy：三分区 + 反引号 _backlog → 绿`)
    for (const m of green.slice(0, 2)) console.log(`  ${m}`)

    writeFileSync(join(root, 'docs/contracts/bad-link.md'), '# bad\n\n[探索](../../_backlog/README.md)\n')
    report('doc-taxonomy：docs/ 出现 _backlog Markdown 链接 → 红', run(docTaxonomy, root), '禁止 docs/ 链接 _backlog/')
    rmSync(join(root, 'docs/contracts/bad-link.md'))

    mkdirSync(join(root, 'docs/contracts/sub'), { recursive: true })
    writeFileSync(join(root, 'docs/contracts/sub/deep.md'), '# deep\n')
    report('doc-taxonomy：分区下超深（深度 >2）→ 红', run(docTaxonomy, root), '超过最大深度 2')
    rmSync(join(root, 'docs/contracts/sub'), { recursive: true, force: true })

    writeFileSync(join(root, 'docs/contracts/README.md'), '# sub readme\n')
    report('doc-taxonomy：分区内建子 README.md → 红', run(docTaxonomy, root), '分区目录禁止子 README.md')
    rmSync(join(root, 'docs/contracts/README.md'))

    mkdirSync(join(root, 'docs/zz-tier'), { recursive: true })
    writeFileSync(join(root, 'docs/zz-tier/zz.md'), '# stray\n')
    report('doc-taxonomy：未知 tier 目录 → 红', run(docTaxonomy, root), '不在 tier 目录')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // doc-budget（2026-11-27）：UTF-8 字节预算 + 反向棘轮 + 反单行正文墙（豁免代码块与表格行）。
  const root = mkdtempSync(join(tmpdir(), 'gates-docbudget-'))
  try {
    mkdirSync(join(root, 'docs'), { recursive: true })
    writeFileSync(join(root, 'docs/ok.md'), `${'a'.repeat(85)}\n`)
    const okMsgs = []
    docBudget.run({ root, budgets: [['docs/ok.md', 100]], ok: m => okMsgs.push(`OK ${m}`), fail: (n, m) => okMsgs.push(`FAIL ${n}: ${m}`) })
    const okPass = okMsgs.every(m => !m.startsWith('FAIL'))
    if (!okPass) failures += 1
    console.log(`${okPass ? 'PASS' : 'FAIL'} doc-budget：合法字节窗口 → 绿`)

    const overMsgs = []
    docBudget.run({ root, budgets: [['docs/ok.md', 80]], ok: m => overMsgs.push(`OK ${m}`), fail: (n, m) => overMsgs.push(`FAIL ${n}: ${m}`) })
    report('doc-budget：字节超上限 → 红', overMsgs, '超上限')

    const slackMsgs = []
    docBudget.run({ root, budgets: [['docs/ok.md', 200]], ok: m => slackMsgs.push(`OK ${m}`), fail: (n, m) => slackMsgs.push(`FAIL ${n}: ${m}`) })
    report('doc-budget：反向棘轮空置 >20% → 红', slackMsgs, '空置 >20%')

    const missingMsgs = []
    docBudget.run({ root, budgets: [['docs/zz-missing.md', 100]], ok: m => missingMsgs.push(`OK ${m}`), fail: (n, m) => missingMsgs.push(`FAIL ${n}: ${m}`) })
    report('doc-budget：缺失文件报缺失不崩 → 红', missingMsgs, '不在盘上')

    writeFileSync(join(root, 'docs/wall.md'), `${'字'.repeat(360)}\n`)
    const wallMsgs = []
    docBudget.run({ root, budgets: [['docs/wall.md', 2000]], ok: m => wallMsgs.push(`OK ${m}`), fail: (n, m) => wallMsgs.push(`FAIL ${n}: ${m}`) })
    report('doc-budget：单行正文 >350 字符压缩墙 → 红', wallMsgs, '单行正文 360 字符超上限')

    writeFileSync(join(root, 'docs/table.md'), `| c |\n|---|\n| ${'字'.repeat(380)} |\n\`\`\`txt\n${'x'.repeat(380)}\n\`\`\`\n`)
    const tblBytes = Buffer.byteLength(readFileSync(join(root, 'docs/table.md'), 'utf8'), 'utf8')
    const tblMsgs = []
    docBudget.run({ root, budgets: [['docs/table.md', Math.ceil(tblBytes / 0.88)]], ok: m => tblMsgs.push(`OK ${m}`), fail: (n, m) => tblMsgs.push(`FAIL ${n}: ${m}`) })
    const tblOk = tblMsgs.every(m => !m.startsWith('FAIL'))
    if (!tblOk) failures += 1
    console.log(`${tblOk ? 'PASS' : 'FAIL'} doc-budget：表格与代码块超宽不误伤 → 绿`)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // layout-block（2026-11-27）：DSH 软链（CLAUDE.md / .claude/skills）与布局路径非零守卫。
  const root = mkdtempSync(join(tmpdir(), 'gates-layout-'))
  try {
    mkdirSync(join(root, 'docs'), { recursive: true })
    mkdirSync(join(root, '.agents/skills'), { recursive: true })
    mkdirSync(join(root, '.claude'), { recursive: true })
    writeFileSync(join(root, 'AGENTS.md'), '# AGENTS\n\n## 布局\n\n| 目录 | 用途 |\n|---|---|\n| [`docs/`](./docs/) | 文档 |\n')
    symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))
    symlinkSync('../.agents/skills', join(root, '.claude/skills'))
    const okMsgs = run(layoutBlock, root)
    const okClean = okMsgs.every(m => !m.startsWith('FAIL'))
    if (!okClean) failures += 1
    console.log(`${okClean ? 'PASS' : 'FAIL'} layout-block：表格布局 + 双软链 → 绿`)

    rmSync(join(root, 'CLAUDE.md'))
    writeFileSync(join(root, 'CLAUDE.md'), '# copy\n')
    report('layout-block：CLAUDE.md 写成普通文件 → 红', run(layoutBlock, root), '不是符号链接')

    rmSync(join(root, 'CLAUDE.md'))
    symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))
    rmSync(join(root, '.claude/skills'))
    report('layout-block：.claude/skills 缺失 → 红', run(layoutBlock, root), '.claude/skills 缺失')

    symlinkSync('../wrong-target', join(root, '.claude/skills'))
    report('layout-block：软链目标不符 → 红', run(layoutBlock, root), '软链目标为 ../wrong-target')
    rmSync(join(root, '.claude/skills'))
    symlinkSync('../.agents/skills', join(root, '.claude/skills'))

    writeFileSync(join(root, 'AGENTS.md'), '# AGENTS\n\n## 布局\n\n| 目录 | 用途 |\n|---|---|\n| [`docs/no-such-file.md`](./docs/no-such-file.md) | 死路径 |\n')
    report('layout-block：布局表死路径 → 红', run(layoutBlock, root), '不存在')

    writeFileSync(join(root, 'AGENTS.md'), '# AGENTS\n\n## 命令表\n\n```sh\ntools/dev/setup.mjs\n```\n')
    report('layout-block：无 ## 布局节（×0 防空转）→ 红', run(layoutBlock, root), '未解析到任何布局路径')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // dev-product-parity（2026-11-27）：退役词扫描目标缺失必须 fail-closed 报红，禁止 existsSync 静默跳过。
  const root = mkdtempSync(join(tmpdir(), 'gates-parity-'))
  try {
    mkdirSync(join(root, 'docs/guides'), { recursive: true })
    mkdirSync(join(root, 'docs/reference'), { recursive: true })
    mkdirSync(join(root, 'tools/dev'), { recursive: true })
    mkdirSync(join(root, 'tools/lib/core'), { recursive: true })
    mkdirSync(join(root, 'packages/company-pack'), { recursive: true })
    mkdirSync(join(root, '_dist'), { recursive: true })
    mkdirSync(join(root, 'run'), { recursive: true })
    cpSync(join(ROOT, 'tools/dev/company.mjs'), join(root, 'tools/dev/company.mjs'))
    cpSync(join(ROOT, 'tools/lib/core/dev-install.mjs'), join(root, 'tools/lib/core/dev-install.mjs'))
    cpSync(join(ROOT, 'docs/guides/dev-product-parity.md'), join(root, 'docs/guides/dev-product-parity.md'))
    cpSync(join(ROOT, 'docs/guides/bootstrap.md'), join(root, 'docs/guides/bootstrap.md'))
    cpSync(join(ROOT, 'README.md'), join(root, 'README.md'))
    cpSync(join(ROOT, 'packages/company-pack/README.md'), join(root, 'packages/company-pack/README.md'))
    cpSync(join(ROOT, '_dist/安装手册.md'), join(root, '_dist/安装手册.md'))
    cpSync(join(ROOT, 'run/README.md'), join(root, 'run/README.md'))
    cpSync(join(ROOT, 'docs/reference/external.md'), join(root, 'docs/reference/external.md'))
    // 故意缺失 docs/guides/orient.md
    report('dev-product-parity：退役词目标 docs/guides/orient.md 缺失 → fail-closed 红', run(devProductParity, root), '退役词校验目标缺失：docs/guides/orient.md')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // command-refs（2026-11-27）：package.json scripts ↔ docs/reference/commands.md 双向对齐。
  const root = mkdtempSync(join(tmpdir(), 'gates-cmdrefs-'))
  try {
    mkdirSync(join(root, 'docs/reference'), { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { verify: 'echo ok', test: 'echo ok' } }))
    writeFileSync(join(root, 'docs/reference/commands.md'), '# 命令\n\n| 命令 | 用途 |\n|---|---|\n| `pnpm verify` | 门禁 |\n| `pnpm test` | 测试 |\n')
    const okMsgs = run(commandRefs, root)
    const okClean = okMsgs.every(m => !m.startsWith('FAIL'))
    if (!okClean) failures += 1
    console.log(`${okClean ? 'PASS' : 'FAIL'} command-refs：双向对齐 → 绿`)

    writeFileSync(join(root, 'docs/reference/commands.md'), '# 命令\n\n| 命令 | 用途 |\n|---|---|\n| `pnpm verify` | 门禁 |\n')
    report('command-refs：commands.md 漏记 package.json 脚本 → 红', run(commandRefs, root), '未登记在 docs/reference/commands.md：test')

    writeFileSync(join(root, 'docs/reference/commands.md'), '# 命令\n\n| 命令 | 用途 |\n|---|---|\n| `pnpm verify` | 门禁 |\n| `pnpm test` | 测试 |\n| `pnpm ghost-cmd` | 幽灵 |\n')
    report('command-refs：commands.md 引用不存在的脚本 → 红', run(commandRefs, root), 'pnpm ghost-cmd 不是本仓脚本')

    writeFileSync(join(root, 'docs/reference/commands.md'), '# 命令\n\n| 命令 | 用途 |\n|---|---|\n| `pnpm verify` | 门禁 |\n| `pnpm test` | 测试 |\n| `pnpm build` | 非本仓上游脚本 |\n| `pnpm pack` | pnpm 内建 |\n')
    report('command-refs：commands.md 表格误登内建/上游脚本（绕过反向白名单）→ 红', run(commandRefs, root), '表格登记了非本仓 package.json 脚本：pnpm build')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

{
  // script-index（2026-11-27）：docs/reference/package-catalog.generated.md 过期/缺失报红。
  const root = mkdtempSync(join(tmpdir(), 'gates-catalog-'))
  try {
    cpSync(join(ROOT, 'checks'), join(root, 'checks'), { recursive: true })
    cpSync(join(ROOT, 'probes'), join(root, 'probes'), { recursive: true })
    cpSync(join(ROOT, 'tools'), join(root, 'tools'), { recursive: true })
    cpSync(join(ROOT, 'packages/company-pack/package.json'), join(root, 'packages/company-pack/package.json'))
    cpSync(join(ROOT, 'packages/company-pack/cordis.patch.yml'), join(root, 'packages/company-pack/cordis.patch.yml'))
    cpSync(join(ROOT, 'packages/company-pack/presets'), join(root, 'packages/company-pack/presets'), { recursive: true })
    mkdirSync(join(root, 'docs/reference'), { recursive: true })
    writeFileSync(join(root, 'docs/reference/package-catalog.generated.md'), '# stale\n')
    report('script-index：package-catalog.generated.md 过期 → 红', run(scriptIndex, root), 'package-catalog.generated.md 与 packages/company-pack 源码不一致')
  } finally { rmSync(root, { recursive: true, force: true }) }
}

console.log(failures === 0 ? 'gates-negative-smoke: ALL PASS' : `gates-negative-smoke: ${failures} FAILURE(S)`)

process.exitCode = failures === 0 ? 0 : 1
