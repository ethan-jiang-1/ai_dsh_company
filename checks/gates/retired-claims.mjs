// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 已证伪断言的禁写门（retired-claims，2026-11-03 第六轮 D4）──────────────────────
// 为什么：`bare-path` 只认「以顶层目录开头的反引号路径」，`md-links` 只认链接——**散文里的
// "现在时"断言没有任何机械面**。实测 2026-11-03：`docs/design/architecture.md` 仍写
// 「`company` profile 已退役」，而 README/profile/release 都说产品入口就是它；上一轮只修了
// index/ui-demo/terminology 三处，漏了这份。同一类断言散布多份文档时，人修必漏（D4-1）。
// 规则：**只收已证伪、且能被一句话说清替代事实的断言**（不是风格门禁、不是语义判断）：
//   命中即红，点名文件:行与替代事实。新条目必须有「哪天被证伪 + 证据」的记录，否则别加。
// 负例留证 2026-11-03（实地造红→还原→绿）：① 在 `docs/orient.md` 插「`company` profile 已退役」→
//   `FAIL retired-claims: docs/orient.md:N → 已证伪断言「company profile 已退役」…`；② 插
//   「四条协作通道」→ 同门红；③ 插「CompanyView.tsx 未注册」→ 红。三例还原即绿。
const CLAIMS = [
  { pattern: /company`?\s*profile\s*已退役/, claim: 'company profile 已退役',
    truth: '`company` 是产品入口（v3/D52）；GUI 安装落当前 profile，CLI 从 web 模板建 company profile', since: '2026-11-01 v3' },
  // 2026-11-08：移除「四条协作通道」条目——workflow 以 vp-eng 同身份扇出回归（architecture.md §3），
  //   四条通道重新成立；旧条目会把真话判红。负例留证：docs/tmp-retired-claim-check.md 写「四条协作通道」
  //   在旧条目下红（真话被误判）；删条目后同文件绿；临时文件同轮删除。
  { pattern: /CompanyView\.tsx[^\n]{0,20}未注册/, claim: 'CompanyView.tsx 未注册、仅测试引用',
    truth: 'CompanyView.tsx 已于 2026-11-02 删除（主视图 = Chat + 培养）', since: '2026-11-02' },
]

/** 活跃的面（与 docs/AGENTS.md 的"当前合同"同范围；归档/笔记不扫——记录当时事实）。 */
function activeDocs(root) {
  const files = ['AGENTS.md', 'README.md', 'tests/README.md', 'checks/README.md', 'run/README.md', 'runtime/README.md',
    'packages/company-pack/README.md']
  const walk = (rel) => {
    const dir = join(root, rel)
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith('.md')) files.push(child)
    }
  }
  walk('docs')
  return files.filter(rel => existsSync(join(root, rel)))
}

export function run({ root, ok, fail }) {
  const problems = []
  const files = activeDocs(root)
  for (const rel of files) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, index) => {
      for (const entry of CLAIMS) {
        if (!entry.pattern.test(line)) continue
        problems.push(`${rel}:${String(index + 1)} → 已证伪断言「${entry.claim}」（${entry.since} 起不成立；` +
          `现行事实 = ${entry.truth}）——删掉/改写成现行事实，别把旧结论留在活跃面`)
      }
    })
  }
  problems.length === 0
    ? ok(`retired-claims ×${String(files.length)}（活跃面零已证伪断言；清单 ${String(CLAIMS.length)} 条）`)
    : fail('retired-claims', problems.join('；'))
}
