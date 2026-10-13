// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectScripts } from '../../tools/lib/repository-layout.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// ── 2f. 脚本触发条件门禁（2026-09-26 立，技术债 B7/R5 类）───────────────
// 负例留证 2026-09-27：探针头注「何时跑」改形 → script-triggers 红。────────
// 为什么：dev-loop §9.1 被 AGENTS.md 指定为"何时跑"的唯一家，却漏了 6 个已存在脚本，而 AGENTS.md
// 又把它指回 §9.1——成环，fresh agent 查"dag-visual 什么时候跑"两处都查不到。
// 根因是"枚举型事实写在文档里、实现那处更新了"（本仓六份清单同一种病）。
// 解法：**触发条件的家 = 脚本自己**（一处事实一个家，紧挨实现、改脚本时必然看见）；
// 文档只留分层原则与指针；本门禁强制自述存在。
export const scriptInspection = inspectScripts(root)
export function run({ ok, fail }) {
const TRIGGER_FILES = scriptInspection.triggers
const missingTrigger = scriptInspection.missingTriggers
missingTrigger.length === 0
  ? ok(`script-triggers ×${TRIGGER_FILES.length}（每个门禁/探针脚本头注自述「何时跑」）`)
  : fail('script-triggers', `这些脚本头注缺「// 何时跑：」（触发条件的家 = 脚本自己，别写回文档）：${missingTrigger.join(', ')}`)
}
