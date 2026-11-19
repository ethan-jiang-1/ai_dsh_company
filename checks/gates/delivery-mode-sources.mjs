// 状态：常驻
// 何时跑：新增/改名/移动 `content/delivery-modes/`、改 `meta.md` 交付模式字段或 `AGENTS.md` 两轴说明后；
//   发布前。跑法 = pnpm verify。
//
// 判据（交付模式包是一等能力，不是产品类型）：
//   ① `content/delivery-modes/<id>/` 至少有 overview.md、document-map.md、delivery-rules.json；
//   ② delivery-rules.json 的 deliveryMode = 目录名，entry 在场，每个 document 的 template 在场、owner 非空；
//   ③ 动议户口模板必须有 `deliveryMode:` 字段；公司手册必须有 delivery mode 与 `content/delivery-modes/` 指针；
//   ④ 产品类型目录不得出现 delivery-modes 的同名目录（避免把交付模式塞回类型轴）。
// 负例留证（建门时实跑）：删 overview → 红；把 deliveryMode 改成 nope → 红；删 meta 的 交付模式 行 → 红；
//   还原 → 绿。
// 负例留证 2026-11-12（字段 canonical 英文化）：把 meta 的 `deliveryMode:` 改回 `交付模式:` → 红；
//   还原 → 绿。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { contentJsonProblems, listContentFiles } from '../../tools/lib/company/content-contract.mjs'

const CONTENT = 'packages/company-pack/content'
const DELIVERY_DIR = `${CONTENT}/delivery-modes`

export function run({ root, ok, fail }) {
  const dir = join(root, DELIVERY_DIR)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    fail('delivery-mode-sources', `${DELIVERY_DIR} 不在盘上——交付模式没有唯一枚举源`)
    return
  }
  const modes = readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
  if (modes.length === 0) { fail('delivery-mode-sources', `${DELIVERY_DIR} 没有任何交付模式包`); return }
  const problems = []
  const typeDir = join(root, CONTENT, 'product-types')
  const types = existsSync(typeDir)
    ? readdirSync(typeDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
    : []

  const rulesFiles = listContentFiles(join(root, CONTENT)).files
  for (const mode of modes) {
    const base = join(dir, mode)
    for (const file of ['overview.md', 'document-map.md', 'delivery-rules.json']) {
      if (!existsSync(join(base, file))) problems.push(`${DELIVERY_DIR}/${mode}/${file} 缺失`)
    }
    if (types.includes(mode)) problems.push(`${DELIVERY_DIR}/${mode} 与 product-types/${mode} 同名——交付模式不是产品类型`)
    const rulesPath = join(base, 'delivery-rules.json')
    if (!existsSync(rulesPath)) continue
    let rules
    try {
      rules = JSON.parse(readFileSync(rulesPath, 'utf8'))
    } catch (error) {
      problems.push(`${DELIVERY_DIR}/${mode}/delivery-rules.json 不可解析：${String(error)}`)
      continue
    }
    if (rules.deliveryMode !== mode) problems.push(`${DELIVERY_DIR}/${mode}/delivery-rules.json 的 deliveryMode「${String(rules.deliveryMode)}」与目录名不一致`)
    // entry / template / owner / file / requiredFields / v1Reminder 的判据唯一家 = content-contract
    // （与 tarball checker、content-manifest gate 同一份实现；本门禁只留交付模式轴自己的东西）。
    for (const problem of contentJsonProblems({ rel: `delivery-modes/${mode}/delivery-rules.json`, value: rules, files: rulesFiles })) {
      problems.push(`${DELIVERY_DIR}/${mode}: ${problem}`)
    }
    const docs = Object.entries(rules.documents ?? {})
    const docNames = new Set(docs.map(([name]) => name))
    const files = new Set()
    for (const [name, doc] of docs) {
      if (typeof doc?.file === 'string' && /^drafts\/[a-z0-9-]+\.md$/.test(doc.file)) {
        if (files.has(doc.file)) problems.push(`${DELIVERY_DIR}/${mode}: ${name}.file 与其他文档重复：${doc.file}`)
        else files.add(doc.file)
      }
    }
    for (const key of Object.keys(rules.requiredSections ?? {})) {
      if (!docNames.has(key)) problems.push(`${DELIVERY_DIR}/${mode}: requiredSections「${key}」没有对应 document`)
    }
  }

  const metaPath = join(root, CONTENT, 'templates/meta.md')
  if (!existsSync(metaPath)) problems.push(`${CONTENT}/templates/meta.md 缺失`)
  else if (!/^deliveryMode\s*[:：]/m.test(readFileSync(metaPath, 'utf8'))) {
    problems.push(`${CONTENT}/templates/meta.md: 缺「deliveryMode:」字段（动议没有选择面）`)
  }

  const handbookPath = join(root, CONTENT, 'AGENTS.md')
  if (!existsSync(handbookPath)) problems.push(`${CONTENT}/AGENTS.md 缺失`)
  else {
    const handbook = readFileSync(handbookPath, 'utf8')
    if (!/delivery ?mode/i.test(handbook)) problems.push(`${CONTENT}/AGENTS.md: 缺 delivery mode 说明（全员 awareness 没有入口）`)
    if (!handbook.includes('delivery-modes')) problems.push(`${CONTENT}/AGENTS.md: 缺 ${DELIVERY_DIR} 指针`)
  }

  problems.length === 0
    ? ok(`delivery-mode-sources ×${String(modes.length)}（包形状 + 规则模板 + meta 字段 + 手册指针）`)
    : fail('delivery-mode-sources', problems.slice(0, 10).join('；') + (problems.length > 10 ? ` …共 ${String(problems.length)} 处` : ''))
}
