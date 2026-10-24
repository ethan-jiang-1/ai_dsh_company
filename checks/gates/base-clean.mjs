// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 基部零部署历史（base-clean，2026-10-24 二修立）──────────────────────────────
// 为什么：run bundle 第一版只把 workspace 移出 git，但 5 份 CHARTER 的「历史纪要」与内联裁定
// 仍随 pack 分发——新装的公司盘带着我们 305 行真实动议（客户/价格/结论）。这就是“只错了一半”。
// 判据（机械、只看会随包分发的面）：
//   ① CHARTER 不含历史条目（`- YYYY-MM-DD · slug`）与归档引用（snapshots/archive、deliverables-archive）；
//   ② workspace 不带 journal / deliverables / cultivation 的实际成品（.gitkeep 除外）。
// 负例留证（实跑，红→还原→绿）：往 pack 的 CEO CHARTER 追加一行 `- 2026-09-22 · x` ⇒ 红；
//   删回 ⇒ 绿。注意：默认虚构公司画像（org/9 家客户）不在此门禁——它是 starter，不是本部署历史。
const ROLES = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']
const EXTRA = ['AGENTS.md', 'README.md', 'kb/org.md', ...['decision-memo.md', 'meta.md', 'ops-review-note.md', 'prd.md', 'review-note.md', 'weekly-report.md'].map(name => `templates/${name}`)]

export function run({ root, ok, fail }) {
  const skeleton = join(root, 'packages/company-pack/workspace')
  const problems = []
  for (const role of ROLES) {
    const rel = `packages/company-pack/workspace/kb/${role}/CHARTER.md`
    const path = join(skeleton, 'kb', role, 'CHARTER.md')
    if (!existsSync(path)) { problems.push(`${rel} 缺失`); continue }
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      if (/^- \d{4}-\d{2}-\d{2} · /.test(line)) problems.push(`${rel}:${String(index + 1)} 含历史条目`)
      if (/snapshots\/archive|deliverables-archive/.test(line)) problems.push(`${rel}:${String(index + 1)} 含归档引用`)
    }
  }
  for (const rel of EXTRA) {
    const path = join(skeleton, rel)
    if (!existsSync(path)) { problems.push(`packages/company-pack/workspace/${rel} 缺失`); continue }
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      if (/snapshots\/archive/.test(line)) problems.push(`packages/company-pack/workspace/${rel}:${String(index + 1)} 含归档引用`)
      if (/（2026-\d\d-\d\d/.test(line)) problems.push(`packages/company-pack/workspace/${rel}:${String(index + 1)} 含部署日期`)
    }
  }
  const nonKeep = (dir) => existsSync(dir) && readdirSync(dir, { withFileTypes: true })
    .some(entry => entry.name !== '.gitkeep')
  for (const dir of ['kb/ceo/journal', 'kb/cfo/journal', 'kb/coo/journal', 'kb/vp-eng/journal', 'kb/vp-sales/journal',
    'deliverables', 'deliverables-archive', 'cultivation/records']) {
    if (nonKeep(join(skeleton, dir))) problems.push(`packages/company-pack/workspace/${dir} 含实际内容（应只有 .gitkeep）`)
  }
  problems.length === 0
    ? ok('base-clean 基部零部署历史（CHARTER ×5 + 运行目录空）')
    : fail('base-clean', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
