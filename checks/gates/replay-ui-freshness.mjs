// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 为什么：`ui.expected.md` 是 aria 金样，它的输入是同一目录的 `session.v3.jsonl`。重录会话后忘了刷金样，
//   下一次 `replay --ui` 会红在「某行文本变了」——人很难分清「金样陈旧」还是「UI 真回归」（2026-10-23 实锤：
//   金样比第六次重录早 9 小时，红的其实是上一版模型的措辞）。本门禁把这一格变成静态判据：
//   金样旁的 `ui.expected.session.sha256` 记下它对应的 session，复算不一致即红。
// 边界：只比对「金样 ↔ session」这一条配对，不跑浏览器；金样内容本身仍由 `replay --ui` 断言。
// 红配方：改 `replay/session.v3.jsonl` 一个字节（不重录）→ 本门禁红；还原 → 绿。
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function run({ root, ok, fail }) {
  const replayRoot = join(root, 'snapshots/replay')
  if (!existsSync(replayRoot)) { ok('replay-ui-freshness（无 replay 场景，跳过）'); return }
  const problems = []
  for (const scene of readdirSync(replayRoot, { withFileTypes: true })) {
    if (!scene.isDirectory() || scene.isSymbolicLink()) continue
    const dir = join(replayRoot, scene.name, 'replay')
    const golden = join(dir, 'ui.expected.md')
    if (!existsSync(golden)) continue
    const stamp = join(dir, 'ui.expected.session.sha256')
    const fixture = join(dir, 'session.v3.jsonl')
    if (!existsSync(fixture)) { problems.push(`${scene.name}: 有 ui 金样但无 session.v3.jsonl`); continue }
    if (!existsSync(stamp)) { problems.push(`${scene.name}: 缺 ui.expected.session.sha256（--ui --refresh-ui 生成）`); continue }
    const recorded = readFileSync(stamp, 'utf8').trim().split(/\s+/)[0]
    const actual = createHash('sha256').update(readFileSync(fixture)).digest('hex')
    if (recorded !== actual) {
      problems.push(`${scene.name}: 金样所对的 session 已变（${recorded.slice(0, 8)}… vs ${actual.slice(0, 8)}…）——重跑 --ui --refresh-ui，或回滚 session`)
    }
  }
  if (problems.length === 0) ok('replay-ui-freshness（金样与 session 同代）')
  else fail('replay-ui-freshness', problems.join('；'))
}
