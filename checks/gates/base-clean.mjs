// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPANY_ROLE_IDS } from '../../tools/lib/company-roles.mjs'

// ── 基部零部署历史（base-clean，2026-11-01 v3）──────────────────────────────────
// 为什么：插件只读内容随包分发；CHARTER/手册/模板里带本部署历史，新装公司就会继承我们的
// 客户/价格/结论。判据（只看随包分发的 content/）：
//   ① 六份默认章程不含历史条目与归档引用；
//   ② 手册/README/模板/状态默认值不含部署日期与 snapshots/archive/deliverables-archive 引用；
//   ③ content/ 不含 journal/deliverables/cultivation 的运行态文件（只读内容不装 run bundle）。
//   ④ 出厂章程（`## 历史纪要` 之前）不含部署个案语言：公司/客户…agent…案、内部…动议、日期待核、本部署。
const ROLES = [...COMPANY_ROLE_IDS]

/** 部署个案语言：出厂章程只写中性事实，不写“某客户/某内部动议”的叙述。 */
const CASE_LANGUAGE = [
  { name: '公司…agent…案', re: /公司[^\n]{0,20}(?:agent|代理)[^\n]{0,10}案/ },
  { name: '客户…agent…案', re: /客户[^\n]{0,12}(?:agent|代理)[^\n]{0,10}案/ },
  { name: '内部…动议', re: /内部[^\n]{0,20}动议/ },
  { name: '日期待核', re: /日期待核/ },
]
// 负例留证 2026-11-07（A1）：process-docs 落进 content 后同步纳入本表——删 `state/process-docs.md`
// 走「缺失」判红（不抛异常）；把 `（2026-11-07` 写回正文 → 「含部署日期」判红。
const TEXT_FILES = ['AGENTS.md', 'README.md', 'state/org.md', 'state/company.md', 'state/owners.md', 'state/motion-ledger.md', 'product-types/hardware-software/requirements-model.md', 'company/policy-lines.md', 'company/review-protocol.md', 'company/rates.md', 'state/roster.md',
  ...['decision-memo.md', 'meta.md', 'mrd.md', 'ops-review-note.md', 'prd.md', 'review-note.md', 'strs.md', 'weekly-report.md'].map(name => `templates/${name}`),
  ...['syrs.md', 'irs.md', 'allocation.md'].map(name => `product-types/hardware-software/templates/${name}`)]

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
    // 章程正文（历史纪要之前）不得出现部署个案语言；页脚“本部署的动议纪要…”是合法模板说明。
    const body = readFileSync(path, 'utf8').split('\n## 历史纪要')[0]
    for (const [index, line] of body.split('\n').entries()) {
      for (const rule of CASE_LANGUAGE) {
        if (rule.re.test(line)) problems.push(`${rel}:${String(index + 1)} 含部署个案语言「${rule.name}」（出厂章程只写中性事实）`)
      }
    }
  }
  for (const rel of TEXT_FILES) {
    const path = join(content, rel)
    if (!existsSync(path)) { problems.push(`packages/company-pack/content/${rel} 缺失`); continue }
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      if (/snapshots\/archive/.test(line)) problems.push(`packages/company-pack/content/${rel}:${String(index + 1)} 含归档引用`)
      if (/（2026-\d\d-\d\d/.test(line)) problems.push(`packages/company-pack/content/${rel}:${String(index + 1)} 含部署日期`)
      // 具体部署交付物路径（slug 不是占位）——pack 是出厂内容，换一家公司就是死链。
      if (/\.dsh-company\/deliverables\/(?!<)[A-Za-z0-9][\w.-]*\//.test(line)) {
        problems.push(`packages/company-pack/content/${rel}:${String(index + 1)} 指向具体部署交付物（应留 <日期>-<slug> 占位）`)
      }
    }
  }
  for (const dir of ['kb', 'deliverables', 'deliverables-archive', 'cultivation']) {
    if (existsSync(join(content, dir))) problems.push(`packages/company-pack/content/${dir} 是运行态目录（只读内容不装 run bundle）`)
  }
  problems.length === 0
    ? ok(`base-clean 只读内容零部署历史（CHARTER ×${String(ROLES.length)} + 手册/模板/状态）`)
    : fail('base-clean', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
