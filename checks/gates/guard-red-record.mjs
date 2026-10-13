// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 守卫负例门禁（guard-red-record，2026-10-09 立）──────────────────────────────
// 为什么：门禁有 23 处「负例留证」，而 36 个 spec **一处都没有**——同样是"守卫"，
// 一边强制证明自己能红、一边不强制。testing.md §3.7 明文要求 prove-it-red
// （「守卫只有挡得住回归才算守卫——制造回归看红、还原看绿，三步留证」），但只写在散文里。
// **实测触发（不是推测）**：`tests/company/deliverables.spec.ts` 的 BUG-004 守卫
// （让位行机器可查面）被弱化成子串匹配——即它自己声称要防的"措辞走样也认"失效——
// 全套 355 项**依然全绿**，且能让「持认 ∧ 让位」同时为真（BUG-004 存在要防的互斥失效）。
// 那条守卫的 fixture 正文不含让位行原文，所以两种实现都返回 false，验不出弱化。
// ⇒ 一条从没红过的守卫，就是一条**没人知道能不能红**的守卫。
// 判据（机械可判，不靠关键词猜测）：
//   ① **守卫声明** = 某个 `describe('…')` / `it('…')` 的**标题里带 `BUG-nnn`**。
//      标题是"我在这里守一条具体不变量"的正式声明；正文注释里提 BUG 号只是解释
//      （反例：`signoff-tool.spec.ts` 用注释解释 mock 为何要 no-op，它不声称守卫 BUG-002）。
//   ② **事故必须可解析**：`BUG-nnn` 必须能对到 `_backlog/_archive/fixed_bugs/BUG-nnn-*.md`
//      真卡（悬空编号 = 声称守一个不存在的过去 → 红）。
//   ③ **每个声明必须有对应的负例留证行**：文件里存在 `// 负例留证 YYYY-MM-DD：…BUG-nnn…`
//      （按编号对齐——一篇 spec 声明守卫 N 个事故，就要 N 条，不许一条笼统行糊过去）。
// 判据源 = `tests/**/*.spec.ts` 自身 + `_backlog/_archive/fixed_bugs/` 真卡。
// ⚠ 本门禁**不证明**的：它不制造回归、不跑 vitest，所以**不证明**那条留证是真的
//   （留证写了但假的，本门禁看不出来——那要靠人复现）。它证明的是"**声称守卫具体事故的
//   spec 必须交出可复现的红的配方**"，把"没人知道能不能红"变成"红法写在守卫旁边"。
// 负例留证 2026-10-09（实地造红→还原→绿）：
//   ① 新增一个 `describe('…（BUG-006）', …)` 但文件里没有对应留证行 → 红；
//   ② 把某条留证的 BUG 编号改错（BUG-004 → BUG-009，卡不存在）→ 红（悬空编号）；
//   ③ 把留证行整行删掉 → 红。还原 → 全绿（见 implemented/2026-10-09-guard-red-record.md）。
export function run({ root, ok, fail }) {
  const specFiles = []
  const walkSpecs = d => {
    if (!existsSync(d)) return
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walkSpecs(p)
      else if (e.name.endsWith('.spec.ts')) specFiles.push(p)
    }
  }
  walkSpecs(join(root, 'tests'))
  const bugCardExists = n => existsSync(join(root, '_backlog/_archive/fixed_bugs')) &&
    readdirSync(join(root, '_backlog/_archive/fixed_bugs')).some(f => f.startsWith(`BUG-${n}-`))
  const problems = []
  let claims = 0
  for (const file of specFiles.sort()) {
    const text = readFileSync(file, 'utf8')
    const rel = file.slice(root.length + 1)
    // ① 标题里的 BUG 号 = 守卫声明
    const claimed = new Set()
    for (const m of text.matchAll(/^\s*(?:describe|it)\(\s*['"`][^'"`]*?(BUG-\d{3})/gm)) claimed.add(m[1])
    if (claimed.size === 0) continue
    // ② 事故必须可解析 + ③ 每个声明要自己的留证行
    for (const id of [...claimed].sort()) {
      claims++
      const num = id.slice(4)
      if (!bugCardExists(num)) {
        problems.push(`${rel}：标题声称守卫 ${id}，但 _backlog/_archive/fixed_bugs/ 里没有 ${id}-* 卡（悬空事故号）`)
        continue
      }
      // 留证是**块**（首行「// 负例留证 日期：…」，续行是 // …）——与 run-gates 自身同形，
      // 故按块找：本行或其后紧邻的 // 续行里出现该 ID 即可。
      const record = new RegExp(
        `^\\s*//\\s*负例留证\\s+\\d{4}-\\d{2}-\\d{2}：(?:[^\\n]*\\n(?:\\s*//[^\\n]*\\n)*)?[^\\n]*${id}`,
        'm')
      if (!record.test(text)) {
        problems.push(`${rel}：标题声称守卫 ${id}，但文件里没有「// 负例留证 YYYY-MM-DD：…${id}…」行（这条守卫没人知道能不能红）`)
      }    }
  }
  problems.length === 0
    ? ok(`guard-red-record ×${claims} 条守卫声明（${specFiles.length} 个 spec；每条都对到真事故卡 + 自带红配方）`)
    : fail('guard-red-record', `这些 spec 声称守卫具体事故却没交出可复现的红配方（testing.md §3.7 prove-it-red；留证形状照 run-gates 自身的「负例留证」）：${problems.join('；')}`)
}
