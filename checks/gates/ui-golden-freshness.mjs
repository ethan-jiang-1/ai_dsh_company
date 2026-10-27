// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCompanyTabCatalog } from '../../tools/lib/company-tab-catalog.mjs'
import { goldenProblems } from '../../tools/lib/ui-golden.mjs'

// ── 3c. UI 金样与注册面（ui-golden-freshness，2026-10-28 立，六维提分 D5）────────────
// 为什么：`snapshots/visual/company-shell/ui.golden.json` 是 `ui-scene-smoke --isolated --golden` 的
//   比对基准；页签注册面改了而金样没重刷，下一次真页面跑会红在一个看不懂的文本差异上。
//   本门禁做静态那一半：金样形状（schema/scene）+ 目录 == 注册源解析结果 + 每页签非空文本。
// 边界：不跑浏览器（文本比对在 ui-scene-smoke）；金样只覆盖无会话的公司壳。
// 负例留证 2026-10-28：把金样里「待办」改名成「待办X」→ 红（目录不一致 + 缺页签文本）；还原 → 绿。
export function run({ root, ok, fail }) {
  const goldenPath = join(root, 'snapshots/visual/company-shell/ui.golden.json')
  if (!existsSync(goldenPath)) {
    fail('ui-golden-freshness', 'snapshots/visual/company-shell/ui.golden.json 不在盘上（被删？从 git 恢复，或 ui-scene-smoke --isolated --refresh-golden 重建）')
    return
  }
  let golden
  try {
    golden = JSON.parse(readFileSync(goldenPath, 'utf8'))
  } catch (error) {
    fail('ui-golden-freshness', `金样不可解析：${String(error?.message ?? error)}`)
    return
  }
  let catalog
  try {
    const source = readFileSync(join(root, 'packages/company-pack/src/client/company-tab-registration.ts'), 'utf8')
    const identity = readFileSync(join(root, 'packages/company-pack/src/client/tab-icons.tsx'), 'utf8')
    catalog = parseCompanyTabCatalog(source, identity).map(tab => tab.title)
  } catch (error) {
    fail('ui-golden-freshness', `读页签注册源失败：${String(error?.message ?? error)}`)
    return
  }
  if (catalog.length === 0) {
    fail('ui-golden-freshness', '页签注册源解析为空（格式漂移？）——拒绝以空清单通过')
    return
  }
  const problems = goldenProblems(golden, catalog)
  if ((golden.catalog ?? []).join('|') !== catalog.join('|')) {
    problems.push(`金样目录 [${(golden.catalog ?? []).join('、')}] ≠ 注册面 [${catalog.join('、')}]——重跑 ui-scene-smoke --isolated --refresh-golden`)
  }
  problems.length === 0
    ? ok(`ui-golden-freshness（${String(catalog.length)} 页签；金样与注册面一致）`)
    : fail('ui-golden-freshness', problems.join('；'))
}
