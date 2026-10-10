#!/usr/bin/env node
// 状态：常驻
// 公司手册注入验收（会话级验证）：boot 真 web → 真挂 preset → 真发一个 prompt → 读会话日志里的
// 何时跑：公司手册（company-workspace/AGENTS.md）改动时；真模型
// **指令基线**事件（`user/message` + `source.kind === 'agent-instructions'` + `baseline === true`）。
//
// 为什么需要它（D15 + D7）：`agent-instructions` 的载体是"从 projectRoot 到 cwd 的 AGENTS.md 链"，
// 而 projectRoot 默认靠 `.git` 认——公司共享盘在开发仓库里，认错根就会把**本仓的开发 AGENTS.md**
// （vendor 铁律等）灌进角色会话。所以必须断言"注入的是 `company-workspace/AGENTS.md`、不是仓库根
// 那份"，这正是 preset 里 `projectRootMarkers: []` 的作用。preset-smoke 只能证明行能挂上，
// 证明不了注入内容；本脚本是这条线的完成定义。
//
// 前置：DSH_HOME + 已装 pack + 模型凭据（每个角色 1 次小调用）。
// 用法：source run/env.sh && node checks/smoke/handbook-smoke.mjs [--roles ceo,vp-eng] [--port 0]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { collectText, readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '0'))
const ROLES = arg('roles', 'ceo').split(',').map(role => role.trim()).filter(role => role !== '')
// 练习场 ≠ 运行场（轮间待办②）：默认 cwd 在排练场，排练/探针产物不再积进真盘；
// `--cwd` 可显式覆盖。排练场的 AGENTS.md 是指向真盘手册的符号链接 ⇒ 注入基线仍是手册，
// projectRootMarkers: [] ⇒ 指令链只认 cwd，不会向上混入开发仓库 AGENTS.md——断言语义不变。
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))
const BASELINE_TIMEOUT_MS = 120_000

/** 手册里必须出现、且**只**可能来自 `company-workspace/AGENTS.md` 的字符串。 */
const HANDBOOK_MARKERS = ['公司手册', '事实的家', '唯一事实家']
/** 只可能来自**本仓开发用** AGENTS.md 的字符串——出现即说明 projectRoot 认到了仓库根。 */
const DEV_REPO_MARKERS = ['vendor 铁律', 'pnpm verify', '双 home']

let home
try {
  home = requireDevHome('handbook-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** 等指令基线事件出现（它由首个请求的 pre-step 追加，早于模型回复）。 */
async function waitBaseline(page, address, deadline) {
  for (;;) {
    for (const record of await readRecords(page, address)) {
      const event = record.event
      if (event?.type !== 'user/message') continue
      const source = event.data?.source
      if (source?.kind !== 'agent-instructions' || source?.baseline !== true) continue
      return collectText(event.data).join('\n')
    }
    if (Date.now() > deadline) throw new Error(`等指令基线超时（${String(BASELINE_TIMEOUT_MS)}ms）`)
    await sleep(1000)
  }
}

const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)

// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝）。
// 既有差异当参数保留：--port 走 PORT（默认 0）、空 cookie 即抛（onEmptyCookie: 'throw'）、rpcId 前缀
// `handbook-` + 失败回退转储响应体（dumpBodyOnError；rpc 错误措辞统一为模块的 `${endpoint}: …`，
// boot 失败文案同——卡内接受的文本统一，判据标签与退出码不变）。
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, port: PORT })
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  // 四参旧签名保留给下方既有调用点（base/cookie 已由工厂闭包持有），调用点一字不动。
  const rpcFactory = companyRpc({ fetch, base, cookie, prefix: 'handbook-', dumpBodyOnError: true })
  const rpc = (b, ck, endpoint, args) => rpcFactory(endpoint, args)

  for (const role of ROLES) {
    await check(`${role} 注入公司手册（且不是开发仓库的 AGENTS.md）`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: role } })
      const sessionId = created?.sessionId ?? created?.id
      if (typeof sessionId !== 'string') throw new Error(`session/create 没返回会话 id：${JSON.stringify(created).slice(0, 200)}`)
      await rpc(base, cookie, 'session/prompt', {
        request: {
          requestId: `handbook-${role}-${String(Date.now())}`,
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: '用一句话说明你是谁。' }],
          clientTimeZone: 'Asia/Shanghai',
        },
      })
      const page = (request) => rpc(base, cookie, 'session/page', { request })
      const baseline = await waitBaseline(page, { kind: 'session', sessionId }, Date.now() + BASELINE_TIMEOUT_MS)
      const missing = HANDBOOK_MARKERS.filter(marker => !baseline.includes(marker))
      if (missing.length > 0) {
        throw new Error(`基线里没有手册内容（缺 ${missing.join(' / ')}）\n──基线──\n${baseline.slice(0, 600)}`)
      }
      const leaked = DEV_REPO_MARKERS.filter(marker => baseline.includes(marker))
      if (leaked.length > 0) {
        throw new Error(`基线里混进了开发仓库 AGENTS.md 的内容（${leaked.join(' / ')}）——projectRootMarkers 没生效？`)
      }
    })
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? `\nhandbook-smoke: ALL PASS（${ROLES.join(', ')} 的指令基线 = 公司手册，未混入开发仓库 AGENTS.md）`
  : `\nhandbook-smoke: ${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
