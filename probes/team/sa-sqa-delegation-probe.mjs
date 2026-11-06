#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 SA/SQA 子人格、VP-Eng 的委托行或 `maxDepth` 后；或怀疑「落地项目起不了两个独立子代理」时。
// 为什么存在（2026-11-06）：CEO 组队后 VP-Eng 是**团队成员**（delegationDepth 1），而 `spawn_teammate`
//   只有 Lead 能调、命名 subagent 行的默认 maxDepth 是 1 ⇒ 默认配置下 VP-Eng **起不了**帮手。本探针
//   用真模型证明两件事同时成立：① VP-Eng 能调 `system_architect` / `system_qa`；② 两个子代是
//   **独立会话**（各自 preset、depth 2、同一 parent = VP-Eng）。
// 成本/预算：真模型一轮（组队 + VP-Eng 两次委托），约 4–9 分钟；无自动重跑。
// 用法：source run/env.sh && node probes/team/sa-sqa-delegation-probe.mjs [--wall 600]
// 收口断言（2026-11-06 补）：等 CEO 出 final.md，断言它点名 SQA、带裁决词，且 drafts 里有 SQA/SA 稿——
//   「SQA 否决真的进了收口」是行为证据，不再只靠文本规则。
// 退出码：0 接线 + 收口断言全过；1 判据不成立（真失败）；2 环境未就绪（缺 DSH_HOME）；
//   3 TIMEOUT = 接线 PASS 但收口未在墙钟内出现（**不是功能失败**，且保留实例不杀活）。
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const WALL_MS = Number(arg('wall', '1800')) * 1000
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let home
try { home = requireDevHome('sa-sqa-delegation-probe') } catch (error) { console.error(error.message); process.exit(2) }
const { child, base, token } = await startWeb({ spawn, root: ROOT, home })
console.log(`web up: ${base}`)
const SESSIONS = join(home, 'sessions/--Users-bowhead-ai_dsh_company-company-workspace--')
const startedAt = Date.now()
try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'saqa-', dumpBodyOnError: true })
  // 产品必须写死：2026-11-06 实踩「便携式过载检测」有电气/机械两种读法，含糊任务书让不同轮次做出
  // 不同产品（run2 做成 0–20 kN 力学件）——那是探针的缺陷，不是角色的。
  const prompt = [
    '落地项目验证（一轮内完成，不要问我；这是真实交付项目，不是 demo）：',
    '1) 用 spawn_teammate 起 vp-eng（名字就是 vp-eng）；',
    '2) 任务板建一个任务给 vp-eng，任务书写明：落地项目必须用 system_architect 与 system_qa 各起一个子代理——',
    '   SA 出系统架构稿（含 IF-### 接口清单），SQA 出 V&V 计划并对架构稿给独立结论（不通过就写不通过）；',
    '3) vp-eng 交回后收口，SQA 的原始结论单列一条。',
    '目标产品锁定为**电气侧**：串在 16 A / 220 VAC 插座回路里的便携过载检测器（不是力学测力计）；其它细节自定；≤ 10 个工具轮；现在开始。',
  ].join('\n')
  const created = await rpc('session/create', { request: { cwd: join(ROOT, 'company-workspace'), agentPreset: 'ceo' } })
  console.log(`lead session: ${created.sessionId}`)
  await rpc('session/prompt', {
    request: {
      requestId: `saqa-${Date.now()}`, sessionId: created.sessionId, mode: 'queue',
      content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  console.log('prompt sent; polling for system-architect / system-qa child sessions …')
  const found = new Map()
  // ⚠ 只认**本次运行开始之后**创建的会话：目录里平铺着历史运行留下的同名 preset 会话，
  //   不过滤会把上一轮的 system-architect/system-qa 当成这一轮的 ⇒ 假绿（2026-11-06 实踩：
  //   19:04 起的探针「找到」18:05 的旧子会话，被判 ALL PASS）。
  const header = (dir) => {
    const file = join(SESSIONS, dir, 'session.v4.jsonl.zstd')
    if (!existsSync(file)) return undefined
    try {
      const first = execFileSync('zstd', ['-dc', file], { maxBuffer: 64 * 1024 * 1024 }).toString().split('\n')[0]
      const info = JSON.parse(first)
      if (typeof info?.createdAt !== 'number' || info.createdAt < startedAt) return undefined
      return info
    } catch { return undefined }
  }
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(8000)
    for (const dir of readdirSync(SESSIONS)) {
      if (found.has(dir)) continue
      const info = header(dir)
      if (info?.agentPreset === 'system-architect' || info?.agentPreset === 'system-qa') {
        found.set(dir, info)
        console.log(`  FOUND ${info.agentPreset} ${dir} depth=${info.delegationDepth} parent=${info.parentSession}`)
      }
    }
    if (found.size >= 2) break
  }
  const presets = [...found.values()].map(i => i.agentPreset).sort()
  const depthOk = [...found.values()].every(i => i.delegationDepth === 2)
  const parents = new Set([...found.values()].map(i => i.parentSession))
  const wiringOk = presets.length === 2 && depthOk && parents.size === 1

  // 收口断言：等 CEO 出 final.md，并断言 SQA 的否决真的进了收口稿（这是「否决直达 CEO」的行为证据）。
  const DELIV = join(ROOT, 'company-workspace/.dsh-company/deliverables')
  const mtimeOf = (dir) => {
    try { return statSync(join(DELIV, dir, 'final.md')).mtimeMs } catch { return 0 }
  }
  const known = new Map(existsSync(DELIV) ? readdirSync(DELIV).map(dir => [dir, mtimeOf(dir)]) : [])
  let slug
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(8000)
    for (const dir of readdirSync(DELIV)) {
      const changed = !known.has(dir) || mtimeOf(dir) > (known.get(dir) ?? 0)
      if (changed && existsSync(join(DELIV, dir, 'final.md'))) { slug = dir; break }
    }
    if (slug !== undefined) break
  }
  const finalPath = slug === undefined ? undefined : join(DELIV, slug, 'final.md')
  const finalText = finalPath === undefined ? '' : readFileSync(finalPath, 'utf8')
  const draftsDir = slug === undefined ? undefined : join(DELIV, slug, 'drafts')
  const draftTexts = draftsDir === undefined || !existsSync(draftsDir) ? []
    : readdirSync(draftsDir).filter(name => name.endsWith('.md'))
      .map(name => readFileSync(join(draftsDir, name), 'utf8'))
  const checks = [
    ['两个子会话接线（preset ×2 / depth=2 / 同一 parent）', wiringOk],
    ['收口稿 final.md 出现', finalPath !== undefined],
    ['收口稿点名 SQA（否决可见）', /SQA|system_qa/i.test(finalText)],
    ['收口稿带裁决词（不通过/否决/待验/通过）', /不通过|否决|待验|通过/.test(finalText)],
    ['SQA 稿已落盘（drafts 里有 SQA/V&V 内容）', draftTexts.some(x => /SQA|system_qa/.test(x) && /V&V|验证/.test(x))],
    ['SA 稿已落盘（drafts 里有架构/接口内容）', draftTexts.some(x => /系统架构|IF-\d{3}/.test(x))],
  ]
  for (const [label, pass] of checks) console.log(`  ${pass ? 'PASS' : 'FAIL'} ${label}`)
  const ok = checks.every(([, pass]) => pass)
  // 收口没在墙钟内出现 ≠ 功能坏：活还在跑（实测某轮 SQA 单干 25 分钟）。分开报，别把超时说成失败。
  const closeOutPending = wiringOk && slug === undefined
  if (ok) console.log(`\nsa-sqa-delegation-probe: ALL PASS（${String(Math.round((Date.now() - startedAt) / 1000))}s；slug=${String(slug)}）`)
  else if (closeOutPending) {
    console.log(`\nsa-sqa-delegation-probe: TIMEOUT（${String(Math.round((Date.now() - startedAt) / 1000))}s）——接线 PASS，收口稿未在墙钟内出现；`
      + '这不是功能失败，活可能还在跑（用 --wall 加大或去实例里看）')
    process.exitCode = 3
  } else console.log(`\nsa-sqa-delegation-probe: FAIL（slug=${String(slug)}；接线 ${String(wiringOk)}）`)
  if (!ok) process.exitCode = process.exitCode === 3 ? 3 : 1
} catch (error) {
  console.error(`sa-sqa-delegation-probe: 异常 ${String(error.message).split('\n')[0]}`)
  process.exitCode = 1
} finally {
  // TIMEOUT（exit 3）时**保留实例**：杀掉 web 等于把还在跑的 SA/SQA 活干一起毙掉（2026-11-06 实踩）。
  if (process.exitCode !== 3) {
    child.kill('SIGTERM')
    await sleep(300)
  } else {
    console.log(`  实例保留在 ${base}（去里面看进展；确认后可手动结束）`)
  }
}
