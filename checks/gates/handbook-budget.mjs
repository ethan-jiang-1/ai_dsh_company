// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { flattenCordisRows, loadCordisYaml, parseFrontmatter } from '../../tools/lib/core/repo-markdown.mjs'

// ── 2c-bis. 公司手册注入预算（2026-10-02 立；2026-11-01 v3 改源）──────────────────
// v3 起手册住 pack `content/AGENTS.md`，由 host 作为 system prompt section 注入（不再复制到
// workspace、不再走 agent-instructions 的静默截断）。预算 = host `HANDBOOK_MAX_BYTES`（32768）。
// 判据：content 手册字节 + 1024B 包装余量 ≤ 32768；超限运行时只告警、构建门禁红。
export function run({ root, ok, fail }) {
  const HANDBOOK_MAX_BYTES = 32_768
  const handbookBytes = readFileSync(join(root, 'packages/company-pack/content/AGENTS.md')).length
  const presetsRoot = join(root, 'packages/company-pack/presets')
  // `presets/` 下不全是 preset：`_shared/` 是共享 skills（无 agent.cordis.yml）。
  // 判据 = 有声明文件才算 preset；缺声明文件是共享目录，跳过而不是崩。
  const budgets = readdirSync(presetsRoot)
    .filter(name => existsSync(join(presetsRoot, name, 'agent.cordis.yml')))
    .flatMap(role =>
      [...readFileSync(join(presetsRoot, role, 'agent.cordis.yml'), 'utf8')
        .matchAll(/maxBytes:\s*(\d+)/g)].map(m => Number(m[1])))
  const maxBytes = Math.max(...budgets)
  new Set(budgets).size === 1
    ? ok(`handbook-budget 各 preset maxBytes 一致（${maxBytes}；这是用户项目指令面，不是公司手册面）`)
    : fail('handbook-budget', `各 preset 的 maxBytes 不一致：${budgets.join(', ')}（预算应同值）`)
  const margin = 1024
  handbookBytes + margin <= HANDBOOK_MAX_BYTES
    ? ok(`handbook-budget content/AGENTS.md ${handbookBytes}B + ${margin}B 余量 ≤ ${HANDBOOK_MAX_BYTES}`)
    : fail('handbook-budget', `content/AGENTS.md ${handbookBytes}B + ${margin}B > ${HANDBOOK_MAX_BYTES}——host 注入会超预算（先瘦身手册）`)
  // T0 预算（2026-11-09 三层）：开场常驻面 ≤ 6KB；细则一律挪 generic/ 按需读。
  const T0_MAX_BYTES = 6_144
  handbookBytes <= T0_MAX_BYTES
    ? ok(`handbook-budget T0 常驻 ${handbookBytes}B ≤ ${T0_MAX_BYTES}B`)
    : fail('handbook-budget', `T0 常驻面 ${handbookBytes}B > ${T0_MAX_BYTES}B——手册又胖了，细则应挪 generic/ 按需读`)

  // ── 2c-ter. persona 与 skills catalog 的常驻字节账本（2026-11-16 L1 审计 GAP：dim6 无 Model Experience 账本）──
  // 为什么：会话 system prompt 的常驻面 = 手册（上面两轴）+ 角色 persona prefix + skills catalog
  //   （skill-filesystem 把每个 SKILL.md 的 name+description 注入目录）。前两者有预算，后两者从没有过
  //   ——只加不减的常驻文本会安静吃掉上下文，且这里没有「读一次就知道花多少」的读取面。
  // 判据（棘轮，只降不升；值 = 2026-11-16 实测最大者 +10% 取整）：persona ≤ 5120B（实测 ceo 4612B）、
  //   catalog ≤ 2304B（实测 vp-eng 2082B，8 个 skill）。超限先瘦身（persona 细则挪 CHARTER/skill；
  //   skill description 写短），确需提额须 Note 论证。
  // 负例留证 2026-11-16：ceo persona prefix 追加 600B 文本 → persona-budget 红点名 ceo；还原 → 绿。
  const PERSONA_MAX_BYTES = 5_120
  const CATALOG_MAX_BYTES = 2_304
  const personaProblems = []
  const catalogProblems = []
  let personaMax = 0
  let catalogMax = 0
  let personaOwner = ''
  let catalogOwner = ''
  for (const name of readdirSync(presetsRoot)) {
    const ymlPath = join(presetsRoot, name, 'agent.cordis.yml')
    if (!existsSync(ymlPath)) continue
    let rows
    try {
      rows = flattenCordisRows(loadCordisYaml(readFileSync(ymlPath, 'utf8')))
    } catch (error) {
      fail('prompt-byte-budget', `${name}/agent.cordis.yml 不可解析（${error instanceof Error ? error.message : String(error)}）——预算不能静默跳过`)
      continue
    }
    let personaBytes = 0
    const skillDirs = new Set()
    for (const row of rows) {
      if (typeof row?.config?.prefix === 'string') personaBytes += Buffer.byteLength(row.config.prefix, 'utf8')
      for (const dir of row?.config?.customSkillDirs ?? []) {
        // customSkillDirs 是 `!!js` 表达式（profile 相对 URL）；取其中的 presets/<rel> 段。
        if (typeof dir !== 'string') continue
        const rel = /presets\/([^'"]+?)\/*['"]/.exec(dir)?.[1]
        if (rel !== undefined) skillDirs.add(rel)
      }
    }
    if (personaBytes > personaMax) { personaMax = personaBytes; personaOwner = name }
    if (personaBytes > PERSONA_MAX_BYTES) {
      personaProblems.push(`${name} ${personaBytes}B > ${PERSONA_MAX_BYTES}B`)
    }
    let catalogBytes = 0
    for (const rel of skillDirs) {
      const dirAbs = join(presetsRoot, rel)
      if (!existsSync(dirAbs)) continue
      for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const skillFile = join(dirAbs, entry.name, 'SKILL.md')
        if (!existsSync(skillFile)) continue
        const fm = parseFrontmatter(readFileSync(skillFile, 'utf8'))
        if (fm.present !== true || fm.data === null) continue
        catalogBytes += Buffer.byteLength(String(fm.data.name ?? ''), 'utf8')
          + Buffer.byteLength(String(fm.data.description ?? ''), 'utf8')
      }
    }
    if (catalogBytes > catalogMax) { catalogMax = catalogBytes; catalogOwner = name }
    if (catalogBytes > CATALOG_MAX_BYTES) {
      catalogProblems.push(`${name} ${catalogBytes}B > ${CATALOG_MAX_BYTES}B`)
    }
  }
  personaProblems.length === 0
    ? ok(`persona-budget 常驻 persona 最大 ${personaMax}B（${personaOwner}）≤ ${PERSONA_MAX_BYTES}B`)
    : fail('persona-budget', `常驻 persona 超预算（先瘦身，persona 细则挪 CHARTER/skill）：${personaProblems.join('；')}`)
  catalogProblems.length === 0
    ? ok(`skill-catalog-budget 常驻目录最大 ${catalogMax}B（${catalogOwner}）≤ ${CATALOG_MAX_BYTES}B`)
    : fail('skill-catalog-budget', `skills 目录描述超预算（把 description 写短）：${catalogProblems.join('；')}`)
}
