// 状态：常驻
// 何时跑：改 `content/product-types/`、`product-definition` 品类表、`meta.md`/`mrd.md` 模板、
//   `company.md` 默认、CMO 章程或产品定义指南后；发布前。跑法 = pnpm verify。
//
// 判据（产品类型允许值只有一个来源 = `content/product-types/*/` 目录）：
//   ① 每个类型包在 `product-definition` 品类表里恰有一行，且该行的 `references/<id>.md` 在场；
//   ② 品类表每行的 `<id>` 都有 `content/product-types/<id>/check-rules.json`；
//   ③ 不在盘上的 `references/<id>.md` 必须自报「未来类型」/「未随包发布」；
//   ④ `company.md` 的默认 `productType` 必须解析到类型包；
//   ⑤ 选值面（skill/CMO/模板/CEO/指南/类型包正文）里出现的类型 id（references/<id>.md、
//      product-types/<id>/、`产品类型: <id>`、`productType: "<id>"`、反引号 id）必须解析。
// 边界：选值面只抓反引号 id / path / field / `改用`；不加反引号的裸散文不判（C4）。未来类型不进
//   品类表（C5 的策略选择），reference 文件须自报「未来类型」。
// 负例留证 2026-11-11（实地造红→还原→绿）：把 `project-services` 行放回品类表 → 红（无类型包）；
//   把 company.md 的 productType 改成 `nope` → 红（默认不可解析）；删 references/project-services.md
//   的「未来类型」字样 → 红（孤儿 reference）。还原 → 绿。
// 负例留证 2026-11-11（red-team E16）：`productType: "business-software"` 引号形式与
//   `productType: business-software # 默认` 行尾注释曾被误判为未知/缺失；已按 YAML 标量解析（去引号、
//   去 ` #` 注释），C2/C3 回归转绿。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const PRESETS = 'packages/company-pack/presets'
const SKILL = `${PRESETS}/_shared/skills/product-definition/SKILL.md`
const REFS = `${PRESETS}/_shared/skills/product-definition/references`
const TYPE_DIR = `${CONTENT}/product-types`
const FUTURE_MARK = /未来类型|未随包发布|尚未随包发布/

/** 需要人读的选值面（skill 是唯一品类表；其余只允许指针，不允许第二套枚举）。 */
const SELECT_FILES = [
  SKILL,
  `${PRESETS}/ceo/skills/assembling-the-team/SKILL.md`,
  `${CONTENT}/charters/cmo.md`,
  `${CONTENT}/templates/meta.md`,
  `${CONTENT}/templates/mrd.md`,
  `${CONTENT}/AGENTS.md`,
  'docs/guides/product-definition.md',
]

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 取 YAML 标量：去成对引号、去行尾 ` #` 注释（合法 YAML 写法不能误判成未知类型）。 */
function yamlScalar(raw) {
  const value = raw.trim()
  if (value === '') return ''
  const quote = value[0]
  if (quote === '"' || quote === "'") {
    const end = value.indexOf(quote, 1)
    if (end !== -1) return value.slice(1, end)
  }
  const comment = value.indexOf(' #')
  return (comment === -1 ? value : value.slice(0, comment)).trim()
}

/** 递归收集目录下的 Markdown（相对该目录）。 */
function markdownFiles(absDir, prefix = '') {
  if (!existsSync(absDir)) return []
  const out = []
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...markdownFiles(join(absDir, entry.name), rel))
    else if (entry.name.endsWith('.md')) out.push(rel)
  }
  return out
}

/** 某 content / presets 子目录下的 Markdown（带子目录前缀，便于报位置）。 */
function filesUnder(root, relDir) {
  return markdownFiles(join(root, relDir)).map(rel => `${relDir}/${rel}`)
}

export function run({ root, ok, fail }) {
  const typeDir = join(root, TYPE_DIR)
  if (!existsSync(typeDir) || !statSync(typeDir).isDirectory()) {
    fail('product-type-sources', `${TYPE_DIR} 不在盘上——产品类型没有唯一枚举源`)
    return
  }
  const packs = readdirSync(typeDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
  if (packs.length === 0) { fail('product-type-sources', `${TYPE_DIR} 没有任何类型包`); return }
  const packSet = new Set(packs)
  const problems = []

  // ① / ② 品类表 = 唯一枚举：逐行解析，双向对账。
  const skillPath = join(root, SKILL)
  if (!existsSync(skillPath)) {
    fail('product-type-sources', `${SKILL} 不在盘上——品类表没有家`)
    return
  }
  const skillLines = readFileSync(skillPath, 'utf8').split('\n')
  const rows = []
  for (const [index, line] of skillLines.entries()) {
    if (!line.trimStart().startsWith('|')) continue
    const ref = /`references\/([a-z][a-z-]*)\.md`/.exec(line)
    if (ref === null) continue
    rows.push({ id: ref[1], line: index + 1 })
  }
  if (rows.length === 0) problems.push(`${SKILL}: 品类表没有任何 references/<id>.md 行（唯一枚举表丢了）`)
  const rowIds = new Map()
  for (const row of rows) {
    rowIds.set(row.id, (rowIds.get(row.id) ?? 0) + 1)
    if (!packSet.has(row.id)) {
      problems.push(`${SKILL}:${String(row.line)} 品类表指向 ${row.id}，但 ${TYPE_DIR}/${row.id}/ 不存在（宣告了不可执行的类型）`)
    }
    if (!existsSync(join(root, REFS, `${row.id}.md`))) {
      problems.push(`${SKILL}:${String(row.line)} 品类表指向 ${row.id}，但 ${REFS}/${row.id}.md 不存在`)
    }
  }
  for (const id of packs) {
    const count = rowIds.get(id) ?? 0
    if (count === 0) problems.push(`${SKILL}: 品类表漏了类型包 ${id}（每个 product-types/<id>/ 必须有一行）`)
    if (count > 1) problems.push(`${SKILL}: 类型 ${id} 在品类表出现 ${String(count)} 次（每个类型只能一行）`)
  }

  // ③ references/ 里没有类型包的 playbook 必须自报「未来类型」。
  const refDir = join(root, REFS)
  const refIds = existsSync(refDir)
    ? readdirSync(refDir, { withFileTypes: true }).filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => e.name.replace(/\.md$/, ''))
    : []
  for (const id of refIds) {
    if (packSet.has(id)) continue
    const text = readFileSync(join(refDir, `${id}.md`), 'utf8')
    if (!FUTURE_MARK.test(text)) {
      problems.push(`${REFS}/${id}.md: 类型包 ${TYPE_DIR}/${id}/ 不存在，但文件没有「未来类型」/「未随包发布」标记（孤儿 playbook 会被当成可选类型）`)
    }
  }

  // ④ 默认值必须解析到类型包。
  const companyPath = join(root, CONTENT, 'state/company.md')
  if (!existsSync(companyPath)) {
    problems.push(`${CONTENT}/state/company.md 不在盘上——默认产品类型没有家`)
  } else {
    const company = readFileSync(companyPath, 'utf8')
    const match = /^(?:productType|产品类型)\s*[:：]\s*(.+)$/m.exec(company)
    const id = yamlScalar(match?.[1] ?? '')
    if (id === '') problems.push(`${CONTENT}/state/company.md: 缺 productType（默认产品类型不能为空）`)
    else if (!packSet.has(id)) {
      problems.push(`${CONTENT}/state/company.md: productType「${id}」解析不到 ${TYPE_DIR}/${id}/check-rules.json（可用：${packs.join(' / ')}）`)
    }
  }

  // ⑤ 选值面出现类型 id 时必须解析；反引号 id 只在「已知类型名」范围内查（避免误伤普通词）。
  const known = [...new Set([...packs, ...refIds])].sort()
  const bareRe = known.length === 0 ? null : new RegExp(`\`(${known.map(escapeRe).join('|')})(?:\\.md)?\``, 'g')
  const scanFiles = [
    ...SELECT_FILES,
    ...filesUnder(root, `${CONTENT}/charters`),
    ...filesUnder(root, `${CONTENT}/product-types`),
    ...filesUnder(root, REFS),
  ]
  const seenFiles = new Set()
  for (const rel of scanFiles) {
    if (seenFiles.has(rel)) continue
    seenFiles.add(rel)
    const path = join(root, rel)
    if (!existsSync(path)) continue
    const lines = readFileSync(path, 'utf8').split('\n')
    for (const [index, line] of lines.entries()) {
      const at = `${rel}:${String(index + 1)}`
      const hits = []
      for (const match of line.matchAll(/references\/([a-z][a-z-]*)\.md/g)) hits.push({ id: match[1], what: 'playbook 链接' })
      for (const match of line.matchAll(/product-types\/([a-z][a-z-]*)\//g)) hits.push({ id: match[1], what: '类型包路径' })
      for (const match of line.matchAll(/(?:产品类型|productType)\s*[:：]\s*["']?([a-z][a-z-]*)/g)) hits.push({ id: match[1], what: '字段值' })
      for (const match of line.matchAll(/改用\s*`([a-z][a-z-]*)`/g)) hits.push({ id: match[1], what: '改用指针' })
      if (bareRe !== null) {
        bareRe.lastIndex = 0
        for (const match of line.matchAll(bareRe)) hits.push({ id: match[1], what: '类型 id' })
      }
      for (const hit of hits) {
        if (!packSet.has(hit.id)) {
          problems.push(`${at}: ${hit.what}「${hit.id}」解析不到类型包（可用：${packs.join(' / ')}）`)
        }
      }
    }
  }

  problems.length === 0
    ? ok(`product-type-sources ×${String(packs.length)}（品类表/默认/选值面与 ${TYPE_DIR} 一致；未来类型 ${String(refIds.filter(id => !packSet.has(id)).length)} 个已标注）`)
    : fail('product-type-sources', problems.slice(0, 10).join('；') + (problems.length > 10 ? ` …共 ${String(problems.length)} 处` : ''))
}
