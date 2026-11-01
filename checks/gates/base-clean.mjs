// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 基部零部署历史（base-clean，2026-11-01 v3）──────────────────────────────────
// 为什么：插件只读内容随包分发；CHARTER/手册/模板里带本部署历史，新装公司就会继承我们的
// 客户/价格/结论。判据（只看随包分发的 content/）：
//   ① 五份默认章程不含历史条目与归档引用；
//   ② 手册/README/模板/状态默认值不含部署日期与 snapshots/archive/deliverables-archive 引用；
//   ③ content/ 不含 journal/deliverables/cultivation 的运行态文件（只读内容不装 run bundle）。
const ROLES = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']
const TEXT_FILES = ['AGENTS.md', 'README.md', 'state/org.md', 'state/company.md', 'state/owners.md', 'state/motion-ledger.md',
  ...['decision-memo.md', 'meta.md', 'ops-review-note.md', 'prd.md', 'review-note.md', 'weekly-report.md'].map(name => `templates/${name}`)]

export function run({ root, ok, fail }) {
  const content = join(root, 'packages/company-pack/content')
  const problems = []
  for (const role of ROLES) {
    const rel = `packages/company-pack/content/charters/${role}.md`
    const path = join(content, 'charters', `${role}.md`)
    if (!existsSync(path)) { problems.push(`${rel} 缺失`); continue }
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      if (/^- \d{4}-\d{2}-\d{2} · /.test(line)) problems.push(`${rel}:${String(index + 1)} 含历史条目`)
      if (/snapshots\/archive|deliverables-archive/.test(line)) problems.push(`${rel}:${String(index + 1)} 含归档引用`)
    }
  }
  for (const rel of TEXT_FILES) {
    const path = join(content, rel)
    if (!existsSync(path)) { problems.push(`packages/company-pack/content/${rel} 缺失`); continue }
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      if (/snapshots\/archive/.test(line)) problems.push(`packages/company-pack/content/${rel}:${String(index + 1)} 含归档引用`)
      if (/（2026-\d\d-\d\d/.test(line)) problems.push(`packages/company-pack/content/${rel}:${String(index + 1)} 含部署日期`)
    }
  }
  for (const dir of ['kb', 'deliverables', 'deliverables-archive', 'cultivation']) {
    if (existsSync(join(content, dir))) problems.push(`packages/company-pack/content/${dir} 是运行态目录（只读内容不装 run bundle）`)
  }
  problems.length === 0
    ? ok('base-clean 只读内容零部署历史（CHARNER ×5 + 手册/模板/状态）')
    : fail('base-clean', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
