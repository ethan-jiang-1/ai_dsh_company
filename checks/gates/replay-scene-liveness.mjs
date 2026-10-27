// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 重放场景活性门禁（replay-scene-liveness，2026-10-09 立）─────────────────────
// 为什么：`snapshots/replay/` 现在只保留 foundation-workspace 合成场景（~100K）；r3/r2 真实
// 录制已移出产品仓。replay-smoke **不在 hook、不在 CI**，纯手动。⇒ 场景可以无限累积、
// "这个场景算不算能跑的回归门"全靠 README 散文记着，没有任何机制发现"又收了一个跑不起来的场景"。
// DSH 立场：Skill = guidance，只有**机械可判**的规则才进门禁。本门禁把散文升成字段。
// 三态（各场景 snapshot.yml 的 `replayEligible:`）+ 每种态各查什么：
//   runnable —— 必须**有** fixture（replay/session*.v3.jsonl）**且**有 replay/cordis.snapshot.yml
//               （后者是 replay-smoke 硬要求的组合 patch，缺了 exit(2) 起不来）；
//   archived —— 必须**有** fixture（否则该归 baseline）；判据红/起不来的理由写在「# 资格理由（日期）：」；
//   baseline —— 必须**没有** fixture（有输入却叫 baseline = 静默死资产，正是本门禁要抓的）。
// 另：每个场景都必须有 snapshot.yml + `replayEligible` 三值之一 + 「# 资格理由（YYYY-MM-DD）：」行
// （资格是判断，判断要留痕 **且带判定日期**——无日期就查不出"这条还成立吗"：一轮实测的 ALL PASS
//  会随机制漂移过期，日期让陈旧资格可被回溯。r6 为什么不算回归门也因此可查）。
// 判据源 = 磁盘 + 场景自己的 snapshot.yml。**不另立登记表文件**：内容派生的第三本账必然漂移
// （D34/D36 已拆过一次），场景元数据本来就该住各场景自己。
// ⚠ 本门禁**不证明**的（边界照 testing.md §1 写清）：它不跑 replay-smoke，所以**不证明**
//   `runnable` 的判据真的绿、也不证明 `archived` 真的红——那要起进程、单场景 11–49s，
//   远超门禁"秒级"预算。它证明的是**声明与磁盘相符 + 判断留痕**，即"没人能悄悄让一个
//   场景失去可跑性而不被注意"。真绿由 replay-smoke 自己报（触发条件见其头注）。
// 🩸 这条边界**有活证据**（2026-10-09 收尾实测）：首版把 r3-delegation / foundation-workspace
//   定成 runnable（依据 = 一次实跑 ALL PASS），门禁照绿；复跑却 4 / 3 FAILURE——录制是内容快照，
//   仓库在动而快照不动（AGENTS.md 涨过注入预算、workspace_doors 入工具表、vendor 工具描述演进），
//   full 档"逐字节零 diff"于是必红。⇒ **声明本身会过期，而本门禁抓不到**。这正是「资格理由」
//   必须带**日期**的原因（无日期查不出判断多旧），也是 1/9 场景仍可用的由来。
// 负例留证 2026-10-09（三态各一，实地造红→还原→绿）：
//   ① r1-motion: baseline → runnable（无输入却声明可跑）→ 红；
//   ② r3-delegation: runnable → baseline（有输入却降级为基线 = 静默死资产）→ 红；
//   ③ r3-delegation: 删 replay/cordis.snapshot.yml 而声明仍 runnable → 红；
//   ④ 删任一场景的「# 资格理由（日期）：」行，或**抹掉其中的日期** → 红。
//   还原 → 全绿（见 implemented/2026-10-09-replay-scene-liveness.md）。
export function run({ root, ok, fail }) {
const replayRoot = join(root, 'snapshots/replay')
if (existsSync(replayRoot)) {
  const scenes = readdirSync(replayRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.isSymbolicLink())
    .map(e => e.name).sort()
  const problems = []
  const tally = { runnable: 0, archived: 0, baseline: 0 }
  for (const scene of scenes) {
    const sceneDir = join(replayRoot, scene)
    const ymlPath = join(sceneDir, 'snapshot.yml')
    if (!existsSync(ymlPath)) { problems.push(`${scene}（缺 snapshot.yml——场景元数据必填）`); continue }
    const yml = readFileSync(ymlPath, 'utf8')
    const m = /^replayEligible:\s*(\S+)\s*$/m.exec(yml)
    if (m === null) { problems.push(`${scene}（缺 replayEligible 字段）`); continue }
    const state = m[1]
    if (!(state in tally)) { problems.push(`${scene}（replayEligible: ${state} 不是三态之一——只认 runnable|archived|baseline）`); continue }
    if (!/^#\s*资格理由（\d{4}-\d{2}-\d{2}）：/m.test(yml)) { problems.push(`${scene}（缺「# 资格理由（YYYY-MM-DD）：」行——资格是判断，判断会过期，无日期就查不出「这条还成立吗」）`); continue }
    // fixture 判据 = replay-smoke 真正读的输入；replay/ 与场景根两处都认（r3 历史形状在 replay/ 下）
    const hasFixture = [join(sceneDir, 'replay'), sceneDir]
      .some(d => existsSync(d) && readdirSync(d).some(n => /^session(\.\d+)?\.v3\.jsonl$/.test(n)))
    const hasPatch = ['replay', ''].some(sub => existsSync(join(sceneDir, sub, 'cordis.snapshot.yml')))
    if (state === 'baseline' && hasFixture) {
      problems.push(`${scene}（有 replay/session*.v3.jsonl 却声明 baseline——能重放却没人知道，静默死资产）`)
    } else if (state !== 'baseline' && !hasFixture) {
      problems.push(`${scene}（声明 ${state} 但盘上没有 replay/session*.v3.jsonl——重放起不来）`)
    } else if (state === 'runnable' && !hasPatch) {
      problems.push(`${scene}（声明 runnable 但缺 replay/cordis.snapshot.yml——replay-smoke 硬要求，缺了直接 exit(2)）`)
    }
    if (state in tally) tally[state]++
  }
  problems.length === 0
    ? ok(`replay-scene-liveness ×${scenes.length}（声明↔磁盘一致；runnable ${tally.runnable} / archived ${tally.archived} / baseline ${tally.baseline}）`)
    : fail('replay-scene-liveness', `重放场景声明与磁盘不符或元数据缺字段（三态事实家 = 各场景 snapshot.yml，散文旧记 = snapshots/README.md §快照与 live 盘差异的语义）：${problems.join('；')}`)
}
}
