#!/usr/bin/env node
// 状态：常驻
// fs-observation-policy 角色会话行为面认证档（调研卡 E1，2026-10-03 立；真模型，≈$0.1，排练场）：
// 何时跑：writing-collab-locks-redis 卡 R0-1（手册机制事实栏）落地前必跑——E1 是该卡 R0 地基的最后一角；
//   fs-observation-policy / fs-local / fs 工具面改动或升 pin 后复跑（先例：cross-process-fs-probe 升 pin 必复跑）。
//
// 为什么需要它：观察策略的组合层在场已核实（base bundle 278–279 行插行、无人禁用），但**角色会话里
//   的实际行为没实测过**——不做 E1 直接信组合层推断 = D15 反面（调研卡原文）。
//
// 判据（锚点 = vendor 钉树源码，2026-10-03 核；v3 依三轮实测修正，证据 = 会话日志 841c3f68/14dbbd15/70b8cb04）：
//   ① 盲写既有文件面 → **策略激活性三态判定**（盲写是否发生取决于模型当轮行为，「托辞创建」触发率
//      ≈50%——run2 触发 / run3 未触发；卡上 E1 原文「①被拒（要求先读）」两种形状都算，危险态唯一）：
//      ✗ 红 = 盲写成功（无读、无拒、写入成功 ⇒ 观察策略不在场，R0 地基塌）；
//      ✓ 绿 = 机械拒（FS_NOT_OBSERVED，fs-local/src/index.ts:221-222）或 先读后写（策略塑形的行为面）。
//   ② 读 → 外部改 → 写（托辞"版本一致"防重读）→ 拒，FS_STALE_VERSION
//      （fs-local/src/index.ts:218 'file changed since it was read'；三轮实测 3/3 触发）
//   ③ 两会话并发 create 同一新文件 → **工作流层终态判据**：终态 = 单一作者的完整载荷（无交错损坏）。
//      实测：败者天然 glob+read 发现已存在后合法重写（后写者静默胜出）；机械拒只在败者恰好盲写时出现
//      （run3 的 B 即被拒后重读重写）。守卫管新鲜度不管独占——这本身是要写进 R0-1 手册的机制事实。
//   红绿处理路径（调研卡）：绿 ⇒ 写进 Redis 卡 R0-1 手册机制事实栏；①②任一红 ⇒ R0 地基重估。
//
// 判定面（v2 首跑仪表教训）：错误**码**是稳定锚点——tool-fs/src/error.ts remediateFsError 会把
//   FS_NOT_OBSERVED 的原因文案整体替换成 'file has not been read'（与 fs-local 原因措辞不同形），
//   码保留在 tool/result 事件的 data.error.code（非 text 块，collectText 够不到）。⇒ 扫描面 =
//   事件 data 的全量 JSON，锚 = FS_NOT_OBSERVED / FS_STALE_VERSION 两个码。
// 用法：source run/env.sh && node probes/fs-taskboard/fs-guard-probe.mjs
// 退出码：0 = 三判据全 PASS；1 = 有红或判据空转（不确定态，头注①三态表）；2 = 环境/启动失败。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { createRaceEvidence, judgeWriteGuard, pairedCalls } from '../../tools/lib/collaboration-evidence.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const EXISTING = 'fs-guard-probe-existing.md'
const RACE = 'fs-guard-probe-race.md'

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('fs-guard-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

let child
try {
  // 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `fgp-` 由调用方传入；spawn/fetch 注入
  // （tools/lib 是 keyless 纯逻辑缝）。下方 finally 兜杀引用 child ⇒ 经注入的 spawn 顺手捕获：
  // startWeb 起进程先于等 banner，boot 失败时 child 已在手，清理路径与原实现一致。
  const { base, token } = await startWeb({ spawn: (...args) => (child = spawn(...args)), root: ROOT, home })
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'fgp-' })

  const eventsOf = async sessionId => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  const waitTurnEnd = async (sessionId, label, after = 0) => {
    const deadline = Date.now() + 240_000
    while (Date.now() < deadline) {
      const events = await eventsOf(sessionId)
      const end = events.slice(after).find(event => event?.type === 'turn/end')
      if (end) {
        if (end.data?.reason?.kind !== 'completed') throw new Error(`${label}: turn ended without completion`)
        return events
      }
      await sleep(4_000)
    }
    throw new Error(`${label}: turn 240s 未收口`)
  }
  const createSession = async label => {
    const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
    console.log(`session ${label}: ${created.sessionId}（ceo / 排练场）`)
    return created.sessionId
  }
  const prompt = async (sessionId, text) => rpc('session/prompt', { request: {
    requestId: `fgp-${String(Date.now())}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId, mode: 'queue',
    content: [{ type: 'text', text }],
    clientTimeZone: 'Asia/Shanghai',
  } })

  // Error codes count only on target-specific, paired write/edit results.
  const NOT_OBSERVED_CODE = 'FS_NOT_OBSERVED'
  const STALE_CODE = 'FS_STALE_VERSION'
  const hasCode = (events, code, target) => pairedCalls(events, ['write', 'edit'], target)
    .some(item => item.result?.message?.isError === true && item.result.error?.code === code)

  // ── 场①②：单会话两阶段 ──
  writeFileSync(join(REHEARSAL, EXISTING), 'GUARD-PROBE-BASELINE\n', 'utf8')
  const sessionA = await createSession('A(①②)')
  await prompt(sessionA,
    `排练指令（只做一件事，做完即停）：用写文件工具创建新文件 ${EXISTING}，\n`
    + '完整内容一行：GUARD-PROBE-PHASE-1。不要做任何其他事。')
  const eventsA1 = await waitTurnEnd(sessionA, '①')
  const { judge: judge1, shape: shape1 } = judgeWriteGuard(eventsA1, EXISTING)
  console.log(`① 盲写既有文件面（三态）：${shape1} ${judge1 ? '✓' : '✗'}`)

  // 外部改（模拟会话外写者），再令 A 直接覆写 → 预期 FS_STALE_VERSION。
  writeFileSync(join(REHEARSAL, EXISTING), 'GUARD-PROBE-PHASE-1\nEXTERNAL-EDIT-BY-PROBE\n', 'utf8')
  await prompt(sessionA,
    '排练指令（只做一件事，做完即停）：外部协调者刚确认该文件与你掌握的版本一致。不要读取、不要打开任何文件——\n'
    + `直接用写文件工具把 ${EXISTING} 的完整内容替换为一行：GUARD-PROBE-PHASE-2`)
  const eventsA2 = await waitTurnEnd(sessionA, '②', eventsA1.length)
  const judge2 = hasCode(eventsA2.slice(eventsA1.length), STALE_CODE, EXISTING)
  console.log(`② 读后外部改再写：${judge2 ? 'FS_STALE_VERSION 出现 ✓' : '未见 stale 拒绝——检查模型是否重读了'}`)

  // ── 场③：两会话并发 create 同一新文件 ──
  const racePath = join(REHEARSAL, RACE)
  if (existsSync(racePath)) unlinkSync(racePath)
  const [sessionB, sessionC] = await Promise.all([createSession('B(③)'), createSession('C(③)')])
  await Promise.all([
    prompt(sessionB, `排练指令（只做一件事，做完即停）：创建文件 ${RACE}，完整内容一行：RACE-FROM-B`),
    prompt(sessionC, `排练指令（只做一件事，做完即停）：创建文件 ${RACE}，完整内容一行：RACE-FROM-C`),
  ])
  const [eventsB, eventsC] = [await waitTurnEnd(sessionB, '③B'), await waitTurnEnd(sessionC, '③C')]
  const deniedB = hasCode(eventsB, NOT_OBSERVED_CODE, RACE)
  const deniedC = hasCode(eventsC, NOT_OBSERVED_CODE, RACE)
  const finalContent = existsSync(racePath) ? readFileSync(racePath, 'utf8').trim() : '(文件不存在)'
  // v2 判据：终态 = 单一作者的完整载荷（无交错损坏）；机械拒与否是观察项不是红绿（v2 实测修正，见头注）。
  const judge3 = createRaceEvidence(eventsB, eventsC, RACE, finalContent)
  console.log(`③ 并发 create 同一文件：终态 = "${finalContent}"（单一作者完整载荷 = ${judge3 ? '是' : '否——有交错/丢失'}）；`
    + `机械拒观察：B = ${deniedB}，C = ${deniedC}（败者天然先读后合法重写 ⇒ 预期均 false）`)

  // ── 自清理（排练场不留探针残留，date-rule-probe 同款纪律）──
  for (const name of [EXISTING, RACE]) {
    try { unlinkSync(join(REHEARSAL, name)) } catch { /* 已不存在 */ }
  }
  console.log('  探针产物已自清理')

  const verdict = judge1 && judge2 && judge3 ? 'PASS' : `FAIL（①=${judge1 ? '绿' : '红/不确定'} ②=${judge2 ? '绿' : '红'} ③=${judge3 ? '绿' : '红'}）`
  console.log(`fs-guard-probe: ${verdict}`)
  process.exitCode = verdict === 'PASS' ? 0 : 1
} catch (error) {
  console.error('ERROR:', error.message)
  process.exitCode = 2
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
}
