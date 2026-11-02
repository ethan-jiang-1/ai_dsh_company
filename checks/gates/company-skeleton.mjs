// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c-ter. 插件内容随包分发（company-skeleton，2026-11-01 v3 重写）──────────────
// 为什么：0.5.0 把手册/模板当“骨架”复制进 workspace，导致插件内容跑到 公司状态。v3 起：
// 只读内容住 pack `content/`；workspace 只有 `.dsh-company/` 状态/产物；没有 launcher/bin。
// 本门禁钉：① files 带 content/**；② 该带的内容件在场；③ 不把 workspace/** 或 bin 打进包；
// ④ dev workspace 若在场，不得再有根 AGENTS.md/templates（旧形状残留要清理）。
export function run({ root, ok, fail }) {
  const PACK = 'packages/company-pack'
  const CONTENT = `${PACK}/content`
  const ROLES = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']
  const required = [
    `${CONTENT}/AGENTS.md`,
    `${CONTENT}/templates/meta.md`,
    ...ROLES.map(role => `${CONTENT}/charters/${role}.md`),
    ...['company.md', 'org.md', 'owners.md', 'motion-ledger.md'].map(file => `${CONTENT}/state/${file}`),
  ]
  const pkg = JSON.parse(readFileSync(join(root, PACK, 'package.json'), 'utf8'))
  const files = Array.isArray(pkg.files) ? pkg.files : []
  const problems = []
  if (!files.includes('content/**')) problems.push('package.json 的 files 缺 content/**——第三方装了插件却没有手册/模板/默认章程')
  if (files.includes('workspace/**')) problems.push('files 仍带 workspace/**——只读内容已迁到 content/')
  if (files.some(file => file.startsWith('bin/'))) problems.push('files 仍带 bin/**——产品包不得有启动器')
  if (pkg.bin !== undefined) problems.push('package.json 仍有 bin 字段——启动入口是 dsh --profile company')
  for (const rel of required) {
    if (!existsSync(join(root, rel))) problems.push(`${rel} 缺失（插件只读内容不完整）`)
  }
  const dev = join(root, 'company-workspace')
  if (existsSync(dev)) {
    for (const stale of ['AGENTS.md', 'COMPANY.md', 'templates', 'kb', 'deliverables', 'deliverables-archive', 'cultivation']) {
      if (existsSync(join(dev, stale))) problems.push(`company-workspace/${stale} 是旧形状残留；dev 公司状态 只应有 .dsh-company/`)
    }
  }
  problems.length === 0
    ? ok(`company-skeleton content ×${required.length}（只读内容在 pack；无 bin/workspace；dev 盘无根残留${existsSync(dev) ? '' : '；dev 盘未初始化'}）`)
    : fail('company-skeleton', problems.join('；'))
}
