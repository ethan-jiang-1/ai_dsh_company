// 状态：常驻
// 何时跑：fresh clone、或 dev 的 company-workspace 被清掉之后——重建 dev 公司状态的 workspace。
// 形状：只在 `company-workspace/.dsh-company/` 建状态/产物目录与状态实例；
// 插件内容（手册/模板/默认章程）住 pack `content/`，不复制、不建符号链接。已有 workspace 时跳过。
//
// 应用内安装不需要本脚本——`dsh --profile company` 首启会自己初始化 `.dsh-company/`；这里只补 dev 盘。
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { repositoryRoot as repoRoot } from './lib/repository-layout.mjs'

const CONTENT = join(repoRoot, 'packages/company-pack/content')
const WORKSPACE = join(repoRoot, 'company-workspace')
const RUN = join(WORKSPACE, '.dsh-company')
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

if (existsSync(WORKSPACE)) {
  console.log(`bundle:init 跳过——dev 公司状态 workspace 已在场：${relative(repoRoot, WORKSPACE)}（一个字节都不动）`)
  process.exit(0)
}
if (!existsSync(CONTENT)) {
  console.error(`bundle:init 失败——插件内容不在：${relative(repoRoot, CONTENT)}`)
  process.exit(1)
}

for (const dir of [
  RUN,
  join(RUN, 'kb'),
  ...ROLES.flatMap(role => [join(RUN, 'kb', role), join(RUN, 'kb', role, 'journal')]),
  join(RUN, 'deliverables'),
  join(RUN, 'deliverables-archive'),
  join(RUN, 'cultivation'),
  join(RUN, 'cultivation/records'),
  join(RUN, 'logs'),
  join(RUN, 'exports'),
  join(RUN, 'overrides'),
]) mkdirSync(dir, { recursive: true })

for (const file of ['company.md', 'org.md', 'owners.md', 'motion-ledger.md']) {
  const source = join(CONTENT, 'state', file)
  const target = join(RUN, 'kb', file)
  if (existsSync(source) && !existsSync(target)) copyFileSync(source, target)
}
for (const role of ROLES) {
  const source = join(CONTENT, 'charters', `${role}.md`)
  const target = join(RUN, 'kb', role, 'CHARTER.md')
  if (existsSync(source) && !existsSync(target)) copyFileSync(source, target)
}

console.log(`bundle:init 完成——${relative(repoRoot, WORKSPACE)}/.dsh-company（状态实例 ×${ROLES.length + 4}；插件内容不复制）`)
console.log('下一步：source run/env.sh；`pnpm company --no-open` 或 `cd company-workspace && pnpm dsh --profile company`。')
