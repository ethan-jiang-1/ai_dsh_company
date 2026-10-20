// 纯逻辑：replay fixture 的注入面新鲜度判据（keyless，无 I/O）。
//
// 为什么（2026-10-20 BUG-r3 事故）：手册是会话注入内容——纯 docs 提交改了
// packages/company-pack/workspace/AGENTS.md，就等于改了回放输入；r3-delegation 的 full 档
// 「归一化零 diff」判据当晚被打红，而 pre-push 只跑 verify+test（不含 replay）、
// replay-scene-liveness 又按设计不跑进程——整条链没有任何东西能拦住或发现「注入面变了」。
// 本模块把「录制时的注入内容 vs 现行注入源」收成静态可比判据（不跑进程、秒级）。
//
// 分档（与 replay-smoke 的判据档位同源）：只有 **runnable + full 档**场景要求注入面新鲜——
// presence 档的判据本来就跳过内容比对（录制早于内容演进是其已知边界），不适用本判据。

/** 注入包裹里的起点标记（agent-instructions 注入面）。 */
const MARKER = 'Instructions from: AGENTS.md'

/**
 * 从一条注入文本里提取手册正文：marker 之后、`</system-reminder>` 之前，去首尾空行。
 * 没有 marker（该 user/message 不是手册注入）= undefined，不误当空正文。
 */
export function extractInjectedHandbook(text) {
  const raw = String(text ?? '')
  const at = raw.indexOf(MARKER)
  if (at === -1) return undefined
  const end = raw.lastIndexOf('</system-reminder>')
  const body = raw.slice(at + MARKER.length, end === -1 ? raw.length : end)
  return body.replace(/^\n+/, '').replace(/\n+$/, '')
}

/** 比较双方都按「去尾部空行」归一（注入包裹会加一层尾换行；文件以单换行结尾是本仓形状）。 */
function normalizeTail(text) {
  return String(text ?? '').replace(/\n+$/, '')
}

/**
 * 录制手册 vs 现行手册的首差异定位。
 * @returns {null | {line: number, recorded: string, current: string}} 一致 = null；否则给首个不同行（1 基）。
 */
export function handbookDrift(recorded, current) {
  const left = normalizeTail(recorded).split('\n')
  const right = normalizeTail(current).split('\n')
  const width = Math.max(left.length, right.length)
  for (let i = 0; i < width; i++) {
    if (left[i] !== right[i]) {
      return { line: i + 1, recorded: left[i] ?? '(缺)', current: right[i] ?? '(缺)' }
    }
  }
  return null
}

/**
 * 一个 runnable+full 场景的注入面新鲜度。
 * @param {string} scene 场景名（报错点名用）。
 * @param {{file: string, injections: string[]}[]} fixtureHandbooks 每 fixture 的注入文本（含 marker 的 user/message 文本，可多条）。
 * @param {string} currentHandbook 现行手册全文。
 * @returns {string[]} 问题清单（空 = 新鲜）。无任何注入面 = 报形状异常（fail-loud，不静默跳过——
 *   录制形状变了或注入机制变了，得有人看一眼，而不是绿灯放行）。
 */
export function freshnessProblems(scene, fixtureHandbooks, currentHandbook) {
  const problems = []
  const injections = fixtureHandbooks.flatMap(entry => entry.injections.map(text => ({ file: entry.file, text })))
  if (injections.length === 0) {
    problems.push(`${scene}（runnable+full 但全部 fixture 未找到手册注入面——录制形状变了？注入机制变了？需人核对，不静默跳过）`)
    return problems
  }
  for (const { file, text } of injections) {
    const recorded = extractInjectedHandbook(text)
    if (recorded === undefined) {
      problems.push(`${scene}/${file}（含 marker 判据的文本提取失败——内部错误，需查）`)
      continue
    }
    const drift = handbookDrift(recorded, currentHandbook)
    if (drift !== null) {
      problems.push(`${scene}/${file}（注入手册第 ${String(drift.line)} 行与现行不一致：录制「${drift.recorded.slice(0, 60)}」vs 现行「${drift.current.slice(0, 60)}」——注入面变了，重跑 replay 确认 / --record 重录 / 或翻 archived 并带日期理由）`)
    }
  }
  return problems
}
