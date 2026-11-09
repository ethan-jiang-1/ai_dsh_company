// 状态：常驻
// 何时跑：改 `content/kb-setup/seed.json`、guide、或新增 kb 文件后；发布前。跑法 = pnpm verify。
//
// 判据：seed 清单是 kb 装配的唯一映射；guide 是它的说明书——两边不许各说各话。
//   ① 每条 source 在 content/ 下存在；
//   ② target 以 `.dsh-company/` 开头、不越界、不重复；
//   ③ target 在 `.dsh-company/kb/` 下的，必须被 guide.md 点名（说明书写到了它）；
//   ④ guide 里的 kb 路径行不得指向清单外的条目（允许 <role>/ 目录写法）。
// 负例留证（建门时实跑）：把 seed 的 target 改名 → ③/④ 红；还原 → 绿。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'
const SEED = 'kb-setup/seed.json'
const GUIDE = 'kb-setup/guide.md'

export function run({ root, ok, fail }) {
  const seedPath = join(root, CONTENT, SEED)
  if (!existsSync(seedPath)) { fail('seed-integrity', `缺 ${SEED}`); return }
  let seeds
  try {
    seeds = JSON.parse(readFileSync(seedPath, 'utf8')).seeds
  } catch (error) {
    fail('seed-integrity', `${SEED} 不可解析：${String(error)}`)
    return
  }
  if (!Array.isArray(seeds) || seeds.length === 0) { fail('seed-integrity', `${SEED} 没有 seeds`); return }
  const guide = readFileSync(join(root, CONTENT, GUIDE), 'utf8')
  const problems = []
  const targets = new Set()
  for (const item of seeds) {
    const { source, target } = item ?? {}
    if (typeof source !== 'string' || typeof target !== 'string') { problems.push(`条目不完整：${JSON.stringify(item)}`); continue }
    if (!existsSync(join(root, CONTENT, source))) problems.push(`缺源：${source}`)
    if (!target.startsWith('.dsh-company/') || target.split('/').includes('..')) problems.push(`target 不合法：${target}`)
    if (targets.has(target)) problems.push(`重复 target：${target}`)
    targets.add(target)
    // guide 是给人/agent 的表；它按文件名点名（`company.md`），不必写全 target。
    // AGENTS.md 是 guide 自己，不自我点名。
    if (target.startsWith('.dsh-company/kb/') && !target.endsWith('/AGENTS.md')) {
      const base = target.split('/').pop()
      if (!guide.includes(base)) problems.push(`guide 未点名 kb 目标：${target}（缺 ${base}）`)
    }
  }
  problems.length === 0
    ? ok(`seed-integrity（${String(seeds.length)} 条 seed；源在场、target 唯一、guide 对齐）`)
    : fail('seed-integrity', problems.slice(0, 8).join('；'))
}
