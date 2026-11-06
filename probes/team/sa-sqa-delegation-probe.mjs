#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 SA/SQA 子人格、VP-Eng 的委托行或 `maxDepth` 后；或怀疑「落地项目起不了两个独立子代理」时。
// 为什么存在（2026-11-06）：CEO 组队后 VP-Eng 是**团队成员**（delegationDepth 1），而 `spawn_teammate`
//   只有 Lead 能调、命名 subagent 行的默认 maxDepth 是 1 ⇒ 默认配置下 VP-Eng **起不了**帮手。本探针
//   用真模型证明两件事同时成立：① VP-Eng 能调 `system_architect` / `system_qa`；② 两个子代是
//   **独立会话**（各自 preset、depth 2、同一 parent = VP-Eng）。
// 成本/预算：真模型一轮（组队 + VP-Eng 两次委托），约 4–9 分钟；无自动重跑。
// 用法：source run/env.sh && node probes/team/sa-sqa-delegation-probe.mjs [--wall 600]
// 退出码：0 两个子代都出现且 depth=2；1 超时或判据不成立；2 环境未就绪（缺 DSH_HOME）。
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const WALL_MS = Number(arg('wall', '600')) * 1000
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
  const prompt = [
    '落地项目验证（一轮内完成，不要问我；这是真实交付项目，不是 demo）：',
    '1) 用 spawn_teammate 起 vp-eng（名字就是 vp-eng）；',
    '2) 任务板建一个任务给 vp-eng，任务书写明：落地项目必须用 system_architect 与 system_qa 各起一个子代理——',
    '   SA 出系统架构稿（含 IF-### 接口清单），SQA 出 V&V 计划并对架构稿给独立结论（不通过就写不通过）；',
    '3) vp-eng 交回后收口，SQA 的原始结论单列一条。',
    '目标产品写「便携式过载检测」，其它自定；≤ 10 个工具轮；现在开始。',
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
  const header = (dir) => {
    const file = join(SESSIONS, dir, 'session.v4.jsonl.zstd')
    if (!existsSync(file)) return undefined
    try {
      const first = execFileSync('zstd', ['-dc', file], { maxBuffer: 4 * 1024 * 1024 }).toString().split('\n')[0]
      return JSON.parse(first)
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
  const ok = presets.length === 2 && depthOk && parents.size === 1
  console.log(ok ? `\nsa-sqa-delegation-probe: ALL PASS（${String(Math.round((Date.now() - startedAt) / 1000))}s）`
    : `\nsa-sqa-delegation-probe: FAIL（found=${presets.join(',')} depthOk=${String(depthOk)} parents=${String(parents.size)}）`)
  process.exitCode = ok ? 0 : 1
} catch (error) {
  console.error(`sa-sqa-delegation-probe: 异常 ${String(error.message).split('\n')[0]}`)
  process.exitCode = 1
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}
