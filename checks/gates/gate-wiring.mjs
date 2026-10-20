// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 门禁接线门（gate-wiring，2026-10-21 立，六维度第二轮 Phase B）──────────────────
// 为什么：run-gates.mjs 与 checks/README 都声称「清单唯一源 = checks/gates/ 目录」，但 runner 实际是
// **手工维护的静态 import + 调用块**——往 gates/ 落一个新门禁文件而忘了接线，就是**静默哑弹**
// （门永远不跑、无人报错）；当前实测 37 门全接线零孤儿，但这个体系里唯一没被门禁管住的事就是它自己。
// 本门禁补这一格：gates/ 下的门禁文件（排除 lib/）必须在 run-gates.mjs 的 import 块里被接线。
// ⚠ 不查的反面：接线名不存在（import 会直接崩 runner，fail-loud 天然覆盖，无需本门）。
// 负例留证 2026-10-21：向 gates/ 放一个真实形状的孤儿门禁文件 checks/gates/zz-orphan-demo.mjs
// （带 run 导出的最小门禁模块，未在 run-gates.mjs 接线）→ 红：
//   FAIL gate-wiring: checks/gates/zz-orphan-demo.mjs 未在 run-gates.mjs 接线（静默哑弹：门永远不跑）；
// 删除该文件 → 绿（×37 门全接线）。zz- 前缀沿用 FIXTURE_PATH 假路径语义（本门对 zz- 不豁免——
// 它就是给负例用的形状）。
export function run({ root, ok, fail }) {
  const gatesDir = join(root, 'checks/gates')
  const runner = readFileSync(join(root, 'checks/run-gates.mjs'), 'utf8')
  const wired = new Set([...runner.matchAll(/from '\.\/gates\/([\w.-]+)\.mjs'/g)].map(m => m[1]))
  const files = readdirSync(gatesDir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.mjs'))
    .map(e => e.name.replace(/\.mjs$/, ''))
  const orphans = files.filter(name => !wired.has(name))
  orphans.length === 0
    ? ok(`gate-wiring ×${String(files.length)}（gates/ 目录与 run-gates.mjs 接线一致，零静默哑弹）`)
    : fail('gate-wiring', `这些门禁文件未在 run-gates.mjs 接线（静默哑弹：门永远不跑；接线或删除二选一）：${orphans.map(n => `checks/gates/${n}.mjs`).join('；')}`)
}
