// 状态：常驻
// 何时跑：改 `presets/{cfo,coo,vp-sales}/skills/`、产品类型包、`kb-setup/seed.json` 或公司事实载体后；
//   发布前。跑法 = pnpm verify。
//
// 判据（经营侧方法契约）：
//   ① 三个经营角色的每个 skill 必须有 `> **方法契约**：` 块，声明 `适用产品类型 = ...`、`需要事实 = ...`；
//      方法可按交付模式适用，声明 `适用交付模式 = ...`；
//   ② 类型值 = `all` 或真实类型包 id；交付模式值 = `all` 或真实交付模式包 id；
//      类型集不含公司默认类型时必须声明 `fail-closed`；
//   ③ `需要事实` = `无` 或 `kb/<file>`，且每个 `<file>` 必须是 seed.json 的真实 target
//      （方法不能要求一个没被播种的事实）；
//   ④ 三个 workflow skill（cfo/ops/sales）必须写出交付模式分派与 fail-closed（防止只改方法、不改入口）。
//
// 为什么：BUG-064/065/066 同型——方法默认套用项目制、要求不存在的事实、把「名册未填」判成「没人」。
//   让方法自己声明类型与事实，缺了就 fail-closed；gate 把声明对到类型包与 seed 清单。
// 负例留证 2026-11-11（实地造红→还原→绿）：删 `project-economics` 的契约块 → 红；把
//   `适用产品类型` 改成 `nope` → 红；把 `需要事实` 改成 `kb/nope.md` → 红；删 `cfo-workflow` 的
//   `fail-closed` → 红；还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const PRESETS = 'packages/company-pack/presets'
const ROLES = ['cfo', 'coo', 'vp-sales']
const WORKFLOWS = { cfo: 'cfo-workflow', coo: 'ops-workflow', 'vp-sales': 'sales-workflow' }
const TYPE_DIR = `${CONTENT}/product-types`
const MODE_DIR = `${CONTENT}/delivery-modes`

/** 收集 `> **方法契约**：…` 起的引用块（到第一个非 `>` 行为止），返回纯文本。 */
function contractBlock(text) {
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.startsWith('> **方法契约**'))
  if (start === -1) return null
  const block = []
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.startsWith('>')) break
    block.push(line.replace(/^>\s?/, ''))
  }
  return block.join(' ')
}

/** 去掉中文括号注释，便于从 `kb/roster.md（席位 / 人力）` 取路径。 */
const stripNote = (text) => text.replace(/（[^）]*）/g, '').trim()

/** 按中文/英文分隔符切列表。 */
const splitList = (text) => text.split(/[,，、;；\s]+/).map(item => item.trim()).filter(item => item !== '')

export function run({ root, ok, fail }) {
  const content = join(root, CONTENT)
  const typeDir = join(content, 'product-types')
  const types = existsSync(typeDir)
    ? readdirSync(typeDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    : []
  if (types.length === 0) { fail('method-contract', `${TYPE_DIR} 没有任何类型包`); return }
  const modeDir = join(content, 'delivery-modes')
  const modes = existsSync(modeDir)
    ? readdirSync(modeDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    : []
  const seedPath = join(content, 'kb-setup/seed.json')
  let seedTargets = new Set()
  try {
    const seeds = JSON.parse(readFileSync(seedPath, 'utf8')).seeds
    seedTargets = new Set(Array.isArray(seeds) ? seeds.map(seed => seed.target) : [])
  } catch (error) {
    fail('method-contract', `${CONTENT}/kb-setup/seed.json 不可读：${String(error)}`)
    return
  }
  const defaultType = (() => {
    try {
      const text = readFileSync(join(content, 'state/company.md'), 'utf8')
      return /^(?:productType|产品类型)\s*[:：]\s*(.+)$/m.exec(text)?.[1]?.trim() ?? ''
    } catch {
      return ''
    }
  })()
  const problems = []
  let checked = 0
  for (const role of ROLES) {
    const skillsDir = join(root, PRESETS, role, 'skills')
    if (!existsSync(skillsDir)) { problems.push(`${PRESETS}/${role}/skills 不在盘上`); continue }
    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && existsSync(join(skillsDir, entry.name, 'SKILL.md')))
      .map(entry => entry.name)
      .sort()
    if (skills.length === 0) problems.push(`${PRESETS}/${role}/skills 没有任何 skill`)
    let typeAware = 0
    let deliveryAware = 0
    for (const skill of skills) {
      checked += 1
      const rel = `${PRESETS}/${role}/skills/${skill}/SKILL.md`
      const text = readFileSync(join(root, rel), 'utf8')
      const block = contractBlock(text)
      if (block === null) { problems.push(`${rel}: 缺 \`> **方法契约**\` 块`); continue }
      const typeRaw = /适用产品类型\s*=\s*([^（(；;]+)/.exec(block)?.[1]?.trim() ?? ''
      const modeRaw = /适用交付模式\s*=\s*([^（(；;]+)/.exec(block)?.[1]?.trim() ?? ''
      const factRaw = (/需要事实\s*=\s*([^；;]+)/.exec(block)?.[1]?.trim() ?? '').replace(/[。.]$/, '')
      if (typeRaw === '') { problems.push(`${rel}: 方法契约缺「适用产品类型 = ...」`); continue }
      if (factRaw === '') { problems.push(`${rel}: 方法契约缺「需要事实 = ...」`); continue }
      const typeList = splitList(stripNote(typeRaw))
      const allTypes = typeList.includes('all')
      if (!allTypes) {
        typeAware += 1
        for (const type of typeList) {
          if (!types.includes(type)) {
            problems.push(`${rel}: 适用产品类型「${type}」没有类型包（可用：${types.join(' / ')}）`)
          }
        }
        if (defaultType !== '' && !typeList.includes(defaultType) && !/fail-closed/.test(block)) {
          problems.push(`${rel}: 不覆盖公司默认类型「${defaultType}」，但契约没有 fail-closed`)
        }
      }
      const modeList = modeRaw === '' ? [] : splitList(stripNote(modeRaw))
      const allModes = modeList.includes('all')
      if (modeList.length > 0 && !allModes) {
        deliveryAware += 1
        for (const mode of modeList) {
          if (!modes.includes(mode)) {
            problems.push(`${rel}: 适用交付模式「${mode}」没有交付模式包（可用：${modes.join(' / ')}）`)
          }
        }
      }
      const facts = factRaw === '无' ? [] : splitList(stripNote(factRaw))
      for (const fact of facts) {
        if (!fact.startsWith('kb/')) {
          problems.push(`${rel}: 需要事实「${fact}」必须是 kb/<file>（workspace 事实载体）`)
          continue
        }
        const target = `.dsh-company/${fact}`
        if (!seedTargets.has(target)) {
          problems.push(`${rel}: 需要事实「${fact}」不在 seed.json（target ${target}）——方法要求了没被播种的事实`)
        }
      }
      if (facts.length > 0 && !/fail-closed/.test(block)) {
        problems.push(`${rel}: 声明了需要事实，但契约没有 fail-closed（缺事实时不能静默）`)
      }
    }
    const workflow = WORKFLOWS[role]
    const workflowRel = `${PRESETS}/${role}/skills/${workflow}/SKILL.md`
    if (!existsSync(join(root, workflowRel))) {
      problems.push(`${workflowRel}: 缺 workflow skill（类型分派没有入口）`)
    } else {
      const text = readFileSync(join(root, workflowRel), 'utf8')
      if (!text.includes('交付模式')) problems.push(`${workflowRel}: 缺交付模式分派（读动议 meta.md 的产品类型 + 交付模式）`)
      if (!/fail-closed/.test(text)) problems.push(`${workflowRel}: 缺 fail-closed（类型/事实缺时不能静默）`)
    }
    if (typeAware === 0 && deliveryAware === 0) problems.push(`${PRESETS}/${role}/skills: 没有任何类型/交付模式敏感方法（全员 all = 切换不会触达经营模型）`)
  }
  problems.length === 0
    ? ok(`method-contract ×${String(checked)}（三个经营角色；类型/交付模式解析 + 事实已播种 + workflow 分派）`)
    : fail('method-contract', problems.slice(0, 10).join('；') + (problems.length > 10 ? ` …共 ${String(problems.length)} 处` : ''))
}
