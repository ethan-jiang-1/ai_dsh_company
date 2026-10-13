// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expectedSha, expectedTag } from './lib/pin.mjs'
import { NOW_FILES } from './bare-path.mjs'

// ── 2e. pin 版本一致性门禁（2026-09-26 立，技术债清扫 B2/B3/B4 类）───────────────
// 负例留证 2026-09-27：簿记 SHA 漂一字 → pin-bookkeeping 红；README 现在时行过期 pin 字面量 → pin-currency 红。
// 为什么：升 pin 的消费面只改了一半——代码改对了，叙述机制的老文档留在上一代（dev-loop 头部
// 自称"已在 0.1.5-rc.2 核对"、index 的 `_digested` 行写 0.1.5-rc.2、release.md 的依赖与矩阵示例）。
// 这类"易腐常量多拷贝、无机械单一源"没有守卫，只能靠人交叉核对。
// 规则：**唯一事实家 = gates/lib/pin.mjs 的 expectedTag/expectedSha**（vendor-pin 门禁已用它核对 submodule HEAD）。
//   ① AGENTS.md §vendor 簿记必须逐字声明该 tag 与 SHA（簿记是给 agent 读的那一份，不能漂）；
//   ② 现在时文件里出现的 `dsh-v<x.y.z>` 字面量必须等于 expectedTag，除非该行自带历史/外部标记。
// 收窄理由（避免假阳性）：只认 `dsh-v` 前缀形式——裸 `x.y.z-rc.n` 在本仓多为历史叙述或外部语料；
//   外研语料 `_dsh_plugin_agent_ready_development`（更名前 `_agent_ready_development`）现钉 rc.2 = 本仓
//   pin 无需豁免；EXTERNAL_PINS 只兜旧名时代 0.1.7-rc.1 的历史提及（同 RETIRED_PATHS 的显式豁免体例）。
// 结构性排除（不是内容白名单，而是尊重文件自述的性质）：
//   · 原 `notes/intents.md`（时序意图日志）与 `ROADMAP.md` §历史维护记录两个特例，均随各自文件
//     退役移除（D32 / D34）——现在无结构性排除项，集合留空备用。
const EXTERNAL_PINS = new Set(['dsh-v0.1.7-rc.1'])   // 外部研究树语料的 pin，不是本仓 pin
const PIN_HISTORY_MARKERS = /历史|旧|曾|原|当时|已退役|矩阵|compat|legacy/i
const PIN_SKIP_FILES = new Set([])
export function run({ root, ok, fail }) {
const agentsText = readFileSync(join(root, 'AGENTS.md'), 'utf8')
const bookkeepingOk = agentsText.includes(`tag \`${expectedTag}\``) && agentsText.includes(`= \`${expectedSha}\``)
bookkeepingOk
  ? ok(`pin-bookkeeping (AGENTS.md §vendor 簿记 = ${expectedTag} @ ${expectedSha.slice(0, 8)})`)
  : fail('pin-bookkeeping', `AGENTS.md §vendor 簿记没有逐字声明 tag \`${expectedTag}\` / SHA \`${expectedSha}\`（簿记是唯一人读事实家）`)
let pinCount = 0
let pinBad = false
for (const rel of NOW_FILES) {
  if (PIN_SKIP_FILES.has(rel)) continue
  readFileSync(join(root, rel), 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/dsh-v\d+\.\d+\.\d+(?:-rc\.\d+)?/g)) {
      if (m[0] === expectedTag || EXTERNAL_PINS.has(m[0])) continue
      if (PIN_HISTORY_MARKERS.test(line)) continue
      pinBad = true
      fail('pin-currency', `${rel}:${i + 1} → \`${m[0]}\` ≠ 当前钉住 ${expectedTag}（现在时文件里的过期 pin：改指针到 AGENTS.md 簿记，或标历史）`)
    }
    pinCount += [...line.matchAll(/dsh-v\d+\.\d+\.\d+(?:-rc\.\d+)?/g)].length
  })
}
if (!pinBad) ok(`pin-currency ×${pinCount}（现在时文件的 dsh-v 字面量 = ${expectedTag}）`)
}
