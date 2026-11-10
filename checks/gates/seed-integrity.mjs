// 状态：常驻
// 何时跑：改 `content/kb-setup/seed.json`、guide、或新增 kb 文件后；发布前。跑法 = pnpm verify。
//
// 判据：seed 清单是 kb 装配的唯一映射；guide 是它的说明书——两边不许各说各话。
//   ① 每条 source 在 content/ 下存在（类型相关 source 见 ⑤/⑥）；
//   ② target 以 `.dsh-company/` 开头、不越界、不重复；
//   ③ target 在 `.dsh-company/kb/` 下的，必须被 guide.md 点名（说明书写到了它）；
//   ④ guide 里的 kb 路径行不得指向清单外的条目（允许 <role>/ 目录写法）；
//   ⑤ `process-docs.md` 的 source 必须含 `{productType}`——播种不能恒为单一类型（BUG-063）；
//   ⑥ 类型相关 source 必须在 `product-types/` 下、`{productType}` 只出现一次、每个类型包都能
//      解析到它，且 company.md 的默认 productType 是盘上真实类型。
// 负例留证（建门时实跑）：把 seed 的 target 改名 → ③ 红；还原 → 绿。
// 负例留证 2026-11-11：把 process-docs 的 source 改回 `product-types/hardware-software/...` → ⑤/⑥ 红；
//   删 `business-software/requirements-model.md` → ⑥ 红（「类型包 business-software 解析不到」）；还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const SEED = 'kb-setup/seed.json'
const GUIDE = 'kb-setup/guide.md'
const TYPE_TOKEN = '{productType}'
const TYPE_DIR = 'product-types'
const TYPE_ID = /^[a-z][a-z0-9-]*$/

/** 取 YAML 标量：去成对引号、去行尾 ` #` 注释。 */
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

/** 读 company.md 的默认 productType（缺失/占位 = 空串；引号与行尾注释按 YAML 标量处理）。 */
function defaultProductType(content) {
  try {
    const text = readFileSync(join(content, 'state/company.md'), 'utf8')
    const match = /^(?:productType|产品类型)\s*[:：]\s*(.+)$/m.exec(text)
    return yamlScalar(match?.[1] ?? '')
  } catch {
    return ''
  }
}

export function run({ root, ok, fail }) {
  const content = join(root, CONTENT)
  const seedPath = join(content, SEED)
  if (!existsSync(seedPath)) { fail('seed-integrity', `缺 ${SEED}`); return }
  let seeds
  try {
    seeds = JSON.parse(readFileSync(seedPath, 'utf8')).seeds
  } catch (error) {
    fail('seed-integrity', `${SEED} 不可解析：${String(error)}`)
    return
  }
  if (!Array.isArray(seeds) || seeds.length === 0) { fail('seed-integrity', `${SEED} 没有 seeds`); return }
  const guide = readFileSync(join(content, GUIDE), 'utf8')
  const typeDir = join(content, TYPE_DIR)
  const typeIds = existsSync(typeDir)
    ? readdirSync(typeDir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    : []
  const defaultType = defaultProductType(content)
  const problems = []
  const targets = new Set()
  let templated = 0
  for (const item of seeds) {
    const { source, target } = item ?? {}
    if (typeof source !== 'string' || typeof target !== 'string') { problems.push(`条目不完整：${JSON.stringify(item)}`); continue }
    if (!target.startsWith('.dsh-company/') || target.split('/').includes('..')) problems.push(`target 不合法：${target}`)
    if (targets.has(target)) problems.push(`重复 target：${target}`)
    targets.add(target)
    const typeAware = source.includes(TYPE_TOKEN)
    if (typeAware) {
      templated += 1
      if (!source.startsWith(`${TYPE_DIR}/`)) problems.push(`类型相关 source 必须在 ${TYPE_DIR}/ 下：${source}`)
      if (source.split(TYPE_TOKEN).length !== 2) problems.push(`${TYPE_TOKEN} 只能出现一次：${source}`)
      if (typeIds.length === 0) problems.push(`没有类型包，${TYPE_TOKEN} 无从解析`)
      for (const id of typeIds) {
        const resolved = source.split(TYPE_TOKEN).join(id)
        if (!existsSync(join(content, resolved))) problems.push(`类型包 ${id} 解析不到 ${resolved}`)
      }
      if (defaultType === '') problems.push(`company.md 缺 productType（类型相关 seed ${target} 无法解析）`)
      else if (!TYPE_ID.test(defaultType) || !typeIds.includes(defaultType)) {
        problems.push(`company.md 的 productType「${defaultType}」不在盘上（可用：${typeIds.length > 0 ? typeIds.join(' / ') : '（无）'}）`)
      }
    } else if (source.startsWith(`${TYPE_DIR}/`)) {
      problems.push(`类型包 source 必须用 ${TYPE_TOKEN} 占位（写死单一类型 = BUG-063）：${source}`)
    } else if (!existsSync(join(content, source))) {
      problems.push(`缺源：${source}`)
    }
    if (target === '.dsh-company/kb/process-docs.md' && !typeAware) {
      problems.push(`process-docs.md 的 source 必须含 ${TYPE_TOKEN}（播种不能恒为单一类型）`)
    }
    // guide 是给人/agent 的表；它按文件名点名（`company.md`），不必写全 target。
    // AGENTS.md 是 guide 自己，不自我点名。
    if (target.startsWith('.dsh-company/kb/') && !target.endsWith('/AGENTS.md')) {
      const base = target.split('/').pop()
      if (!guide.includes(base)) problems.push(`guide 未点名 kb 目标：${target}（缺 ${base}）`)
    }
  }
  problems.length === 0
    ? ok(`seed-integrity（${String(seeds.length)} 条 seed；源在场、target 唯一、guide 对齐；类型占位 ×${String(templated)} → ${defaultType}）`)
    : fail('seed-integrity', problems.slice(0, 8).join('；'))
}
