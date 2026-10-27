// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { freshnessProblems } from '../../tools/lib/replay-fixture-freshness.mjs'

// ── 重放注入面新鲜度门禁（replay-fixture-freshness，2026-10-20 立）────────────────
// 为什么：手册（packages/company-pack/workspace/AGENTS.md，唯一家；company-workspace 是符号链接）
// 是**会话注入内容**——纯 docs 提交改它 = 改回放输入。2026-10-20 实锤（本门禁的出生事故）：
// 589d785（手册去重 190→187 行，纯 docs）当晚把 r3-delegation 的 full 档「归一化零 diff」
// 打红，而 pre-push 只跑 verify+test、replay-scene-liveness 按设计不跑进程 ⇒ 整条链没有
// 任何东西能拦住「注入面改动打破 runnable 场景」。本门禁补这一格：**静态**比对
// 「录制 fixture 里的注入手册 vs 现行手册」，不跑进程、秒级。
// 判据分档（与 replay-smoke 的 replayJudges 同源）：只查 runnable + full 档场景——
// presence 档的判据本来就跳过内容比对（录制早于内容演进），不适用；baseline 无 fixture。
// ⚠ 本门禁不证明的（边界）：它不跑 replay——判据真绿仍由 replay-smoke 自报；它也不比
// persona/工具表 sidecar（那些由 sidecar 判据在 replay 时比；先证伪过手册这一格才扩）。
// 负例留证 2026-10-20（出生事故即活红，非构造）：
//   ① r3-delegation 现行手册（187 行）vs 录制（190 行版）→ 红，报
//     「注入手册第 152 行与现行不一致：录制『- 第一版只把已生效的签字线落进…』vs 现行『### 规矩缺口…』」；
//   ② 单测负例（replay-fixture-freshness.spec）：无注入面 → 报形状异常；marker 缺席 → undefined 不误判。
export function run({ root, ok, fail, skip }) {
  const replayRoot = join(root, 'snapshots/replay')
  const handbookPath = join(root, 'packages/company-pack/workspace/AGENTS.md')
  if (!existsSync(replayRoot)) { ok('replay-fixture-freshness（无 replay 场景，跳过）'); return }
  if (!existsSync(handbookPath)) { fail('replay-fixture-freshness', `现行手册缺失：${handbookPath}（注入源唯一家，缺了所有 full 档场景都失判）`); return }
  const currentHandbook = readFileSync(handbookPath, 'utf8')

  const scenes = readdirSync(replayRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.isSymbolicLink())
    .map(e => e.name).sort()
  const problems = []
  let checkedScenes = 0
  let skippedPresence = 0
  let skippedHeadless = 0
  let checkedInjections = 0
  for (const scene of scenes) {
    const sceneDir = join(replayRoot, scene)
    const ymlPath = join(sceneDir, 'snapshot.yml')
    if (!existsSync(ymlPath)) continue // 元数据缺失归 replay-scene-liveness 报，本门不重复管
    const yml = readFileSync(ymlPath, 'utf8')
    const eligible = /^replayEligible:\s*(\S+)\s*$/m.exec(yml)?.[1]
    if (eligible !== 'runnable') continue // archived/baseline 的新鲜度无意义（不作为回归门）
    // headless foundation 场景不注入公司手册（2026-10-25 合成场景替换后唯一 runnable 场景）——
    // 没有注入面可查，不是“录制形状坏了”。
    if (/^profile:\s*headless\s*$/m.test(yml)) { skippedHeadless++; continue }
    if (/^replayJudges:\s*presence\s*$/m.test(yml)) { skippedPresence++; continue }
    checkedScenes++
    const fixtureDirs = [join(sceneDir, 'replay'), sceneDir]
      .filter(d => existsSync(d) && readdirSync(d).some(n => /^session(\.\d+)?\.v3\.jsonl$/.test(n)))
    if (fixtureDirs.length === 0) {
      problems.push(`${scene}（runnable+full 但找不到 replay/session*.v3.jsonl——归 replay-scene-liveness 报，此处不重复）`)
      continue
    }
    const fixtureHandbooks = []
    for (const dir of fixtureDirs) {
      for (const name of readdirSync(dir).filter(n => /^session(\.\d+)?\.v3\.jsonl$/.test(n)).sort()) {
        const injections = []
        for (const line of readFileSync(join(dir, name), 'utf8').split('\n')) {
          if (line.trim() === '') continue
          try {
            const record = JSON.parse(line)
            const text = record?.type === 'user/message' ? record?.data?.content?.[0]?.text : undefined
            if (typeof text === 'string' && text.includes('Instructions from: AGENTS.md')) injections.push(text)
          } catch { /* 坏行归 replay-smoke 的 fixture 校验管 */ }
        }
        if (injections.length > 0) fixtureHandbooks.push({ file: name, injections })
      }
    }
    checkedInjections += fixtureHandbooks.reduce((n, entry) => n + entry.injections.length, 0)
    problems.push(...freshnessProblems(scene, fixtureHandbooks, currentHandbook))
  }
  if (problems.length > 0) {
    fail('replay-fixture-freshness', `runnable+full 场景的注入面与现行手册漂移——改注入源必须同 diff 重跑/重录受影响场景（改动面映射 = tests/README「注入面」行）：${problems.join('；')}`)
  } else if (checkedScenes === 0) {
    // 无对象 ≠ 通过（R3-06）：本仓唯一 runnable 场景是 headless 合成场景，没有公司手册注入面可查；
    // 公司行为的注入面随真实证据移出产品仓。门禁照旧存在，等场景回来（或部署仓）自动接上。
    skip('replay-fixture-freshness', `盘上没有需查注入面的 runnable 场景（headless 跳过 ${String(skippedHeadless)} / presence 跳过 ${String(skippedPresence)}）——公司行为回放已移私有仓`)
  } else {
    ok(`replay-fixture-freshness ×${String(checkedScenes)} 场景 ${String(checkedInjections)} 处注入面与现行手册一致（presence 跳过 ${String(skippedPresence)} / headless 跳过 ${String(skippedHeadless)}）`)
  }
}
