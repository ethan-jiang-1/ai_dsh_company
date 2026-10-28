#!/usr/bin/env node
// 状态：常驻
// preset 冒烟（上线前门禁）：boot 真 web profile，逐个 preset 建一次会话，断言挂载成功。
// 何时跑：**preset 改动的完成定义**：改 presets/**（persona/skills）或组合行后必跑（keyless 真挂载 ~30s）
//
// 为什么必须有它（R1 实证）：preset 的失败发生在"**会话创建时挂载**"——Loader 用每行的 config
// 校验插件 schema，任一必填字段缺失就让整个 preset 挂载失败（agent-preset/invalid）。
// 而 roster 扫描（discoverPresets）只解析 YAML + 解析包名，`--dump-config` 只打印 profile 树，
// 两者都看不到 config 校验；**UI 还会把错误吞掉**（"新建会话点了没反应"）。
// 所以唯一能上线前抓住它的手段是：走真入口路径（web RPC session/create）挂一次。
//
// 前置：DSH_HOME 指向已装本 pack 的 profile（`source run/env.sh` 后用 dev home），
//       client 面与前端 dist 已构建（guides/bootstrap）。
// 用法：source run/env.sh && node checks/smoke/preset-smoke.mjs [--port 0] [--profile web]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { COMPANY_ROLE_IDS, COMPANY_SUPPORT_PRESET_IDS } from '../../tools/lib/company-roles.mjs'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '0'))
const PROFILE = arg('profile', 'web')
// 练习场 ≠ 运行场（轮间待办②）：默认 cwd 在排练场，排练/探针产物不再积进真盘；
// `--cwd` 可显式覆盖（确需指回真盘时）。
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))
const ROLES = COMPANY_ROLE_IDS
// 0.2.1：委派子人格（researcher）也随包发布 ⇒ 它必须能真挂上（CEO 的 subagent_research 依赖它）。
// 它不是职能 ⇒ 只断言 roster/挂载，不断言 skills 面（它没有专属 skills）。
const SUPPORT_PRESETS = COMPANY_SUPPORT_PRESET_IDS
const OUR_PACKAGE = 'dsh-company-pack'

/** 该角色目录里实际存在的 skill（preset 约定：目录名 = skill 名）。 */
const roleSkills = (role) => readdirSync(join(ROOT, 'packages/company-pack/presets', role, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

/** 该角色方法层里实际存在的 skill（deployer 根；旧 profile 路径与 M3 后的 home 路径都收）。 */
const methodSkills = (role, homeDir, profileName) => {
  const roots = [
    join(homeDir, 'profiles', profileName, 'company-cultivation', role),
    join(homeDir, 'company', 'methods', role),
  ]
  const names = []
  for (const root of roots) {
    try {
      for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory()) names.push(entry.name)
      }
    } catch { /* 目录缺席 = 没有方法 */ }
  }
  return names
}

let home
try {
  home = requireDevHome('preset-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * 解析页面里的 `window.__DSH_BOOT__` 启动清单。
 * @returns 模块总数，以及"inject 依赖既非动态行、也非 shell baseline"的 `模块 → 依赖` 清单。
 */
async function moduleClosure(base, cookie) {
  const html = await (await fetch(`${base}/`, { headers: { cookie } })).text()
  const marker = html.indexOf('__DSH_BOOT__')
  if (marker === -1) throw new Error('页面里找不到 __DSH_BOOT__（前端未构建？）')
  const start = html.indexOf('{', marker)
  let depth = 0
  let end = -1
  for (let index = start; index < html.length; index++) {
    const char = html[index]
    if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) { end = index + 1; break }
    }
  }
  const boot = JSON.parse(html.slice(start, end))
  const entries = boot.entries ?? []
  const ids = new Set(entries.map(entry => entry.id))
  // shell 预置 baseline（vendor `packages/client/web/src/platform.ts` 的 PLATFORM_MODULES）：
  // react / cordis / store / ui-slots / ui-primitives / ui-dockkit 等。它们不在 entries 里、
  // 也**不应该**在（baseline 对每个动态 bundle 隐式可用）。闭包世界 = 动态行 ∪ baseline。
  const platform = readFileSync(
    join(ROOT, 'vendor/dsh/packages/client/web/src/platform.ts'), 'utf8')
  const platformBlock = /export const PLATFORM_MODULES = \[([^\]]*)\]/s.exec(platform)?.[1] ?? ''
  const baseline = new Set([...platformBlock.matchAll(/'([^']+)'/g)].map(m => m[1]))
  const missing = []
  for (const entry of entries) {
    for (const dep of entry.inject ?? []) {
      if (!ids.has(dep) && !baseline.has(dep)) missing.push(`${entry.id} → ${dep}`)
    }
  }
  return { count: entries.length, missing }
}

const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)

// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝）。
// 既有差异当参数保留：--port 走 PORT（默认 0）、空 cookie 即抛（onEmptyCookie: 'throw'）、rpcId 前缀
// `smoke-` + 失败回退转储响应体（dumpBodyOnError）；rpc/boot 失败文案统一为模块款（卡内接受的
// 文本统一：只进 FAIL 行的诊断后缀，判据标签与退出码不变）。
const { child, base, token } = await startWeb({ spawn, root: ROOT, home, port: PORT })
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  // 四参旧签名保留给下方既有调用点（base/cookie 已由工厂闭包持有），调用点一字不动。
  const rpcFactory = companyRpc({ fetch, base, cookie, prefix: 'smoke-', dumpBodyOnError: true })
  const rpc = (b, ck, endpoint, args) => rpcFactory(endpoint, args)

  // ① roster：五个角色都在且零 broken（扫不到就不必谈挂载）
  //    `agentPresets/list` 无参数 → args 就是空对象；`session/create(request)` → args 是 { request }
  const roster = await rpc(base, cookie, 'agentPresets/list', {})
  const presets = roster.presets ?? []
  for (const role of [...ROLES, ...SUPPORT_PRESETS]) {
    await check(`roster 含 ${role}`, async () => {
      const row = presets.find(p => p.id === role)
      if (row === undefined) throw new Error(`roster 里没有 ${role}（共 ${presets.length} 条）`)
      if (row.broken !== undefined) throw new Error(`preset 被标 broken：${String(row.broken).slice(0, 160)}`)
    })
  }

  // ② 真入口：逐个 preset 建会话——**这一步才会触发行 config 校验**
  const sessionIds = new Map()
  for (const role of [...ROLES, ...SUPPORT_PRESETS]) {
    await check(`session/create 挂上 ${role}`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: role } })
      if (created?.agentPreset !== role) throw new Error(`返回的 preset 不是 ${role}：${JSON.stringify(created)}`)
      const id = created?.id ?? created?.sessionId
      if (typeof id !== 'string') throw new Error(`session/create 没返回会话 id：${JSON.stringify(created).slice(0, 200)}`)
      sessionIds.set(role, id)
    })
  }

  // ②b 并发两会话：同一 profile/同一工作区同时创建，返回的 preset/id 不串。
  await check('并发两会话创建不串', async () => {
    const [a, b] = await Promise.all([
      rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: 'ceo' } }),
      rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: 'vp-eng' } }),
    ])
    if (a?.agentPreset !== 'ceo' || b?.agentPreset !== 'vp-eng') throw new Error(`preset 串了：${JSON.stringify({ a, b }).slice(0, 200)}`)
    const aid = a?.id ?? a?.sessionId
    const bid = b?.id ?? b?.sessionId
    if (typeof aid !== 'string' || typeof bid !== 'string' || aid === bid) throw new Error(`会话 id 异常：${String(aid)} / ${String(bid)}`)
  })

  // ③ 角色 skills 硬隔离（真入口断言）：`skills/list` 是 session 寻址的冷读 Remote，
  //    按会话的 preset scope 解析注册表。期望集 = 包内 skills + **本角色方法层**
  //    （deployer 根；旧 profile 路径与 M3 后的 home 路径都收）——方法层是数据，不是组合泄漏；
  //    不把它算进 expected 会在 adopt 过的 home 里假红。`includeDefaultRoots` 默认 true 时，
  //    角色会话会额外看见项目根/用户级技能集（`~/.agents/skills` 等），本条仍抓这个泄漏。
  for (const role of ROLES) {
    await check(`${role} 只看见自己的 skills`, async () => {
      const sessionId = sessionIds.get(role)
      if (sessionId === undefined) throw new Error('没有会话 id（上一步未通过）')
      const value = await rpc(base, cookie, 'skills/list', { request: { sessionId } })
      const actual = (value.skills ?? []).map(skill => skill.name).sort()
      const expected = [...new Set([...roleSkills(role), ...methodSkills(role, home, PROFILE)])].sort()
      const extra = actual.filter(name => !expected.includes(name))
      const missing = expected.filter(name => !actual.includes(name))
      if (extra.length > 0) throw new Error(`看见了非本角色的 skill：${extra.join(', ')}`)
      if (missing.length > 0) throw new Error(`本角色 skill 缺席：${missing.join(', ')}`)
    })
  }

  // ④ 浏览器模块闭包（lint 级）：每个 client 模块 `dsh.client.inject` 里的包名，应当是
  //    动态行（entries[].id）或 shell baseline 之一。⚠ inject 是 **informational only**
  //    （vendor packages/client/AGENTS.md）：不排序、不 gate 加载——这里抓的是"引用了
  //    不存在的包名"这类配置笔误，**不是可加载性判据**。client 入口真正的挂载失败
  //    **不静默**：BootPage 错误屏 + console `failed to apply loader entry`，由
  //    `checks/smoke/client-load-smoke.mjs` 抓。R1 的"官方 Team UI 挂不上"是误诊
  //    （postmortem 0003）。本包模块缺失 = FAIL；他人模块缺失 = WARN。
  const closure = await moduleClosure(base, cookie)
  const ours = closure.missing.filter(item => item.startsWith(OUR_PACKAGE))
  const foreign = closure.missing.filter(item => !item.startsWith(OUR_PACKAGE))
  await check(`client 模块闭包 lint（${String(closure.count)} 个模块，本包缺失 ${String(ours.length)}）`, async () => {
    if (ours.length > 0) throw new Error(`本包模块引用未知包名：${ours.join(', ')}`)
  })
  if (foreign.length > 0) {
    console.log(`  WARN 非本包模块 inject 引用未知包名（上游配置可疑）：${foreign.join(', ')}`)
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? `\npreset-smoke: ALL PASS（${ROLES.length} 个角色 + ${SUPPORT_PRESETS.length} 个委派子人格全部可挂载）`
  : `\npreset-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
