#!/usr/bin/env node
// 状态：常驻
// 培养方法层机制探针（2026-10-13 培养卡 S0/V3/V4/V5）：真 boot web，**零模型**——
// 目录发现 / 跨角色隔离 / 缺目录容忍 / 命令族 wiring / 采纳落盘 / 跨会话生效。
//
// 何时跑：改 preset 第二 customSkillDirs（company-cultivation/<role>/）、host /cultivation
//   命令族或 cultivation_propose 工具、cordis.patch.yml 的 cultivationRoot 锚、或升 pin 后必跑；
//   培养回路验收（培养卡 V3–V5）前必跑。
// 成本：keyless（boot ~20–40s，零模型调用；skills/list 与 commands/* 是免模型冷读 Remote）。
// 用法：source run/env.sh && node probes/session-context/cultivation-method-layer-probe.mjs
//
// 为什么需要它：方法层是 2026-10-13 培养卡 C 路径的新机制面——preset 表达式（!!js 锚
// baseUrl）与 host config 的路径对齐、skill-filesystem 对方法层目录的发现与刷新、命令族
// 与工具的 host 注册，都是组合层推断不出的运行时事实（D15：验证世界不信自报）。
// 红证（2026-10-13 实跑）：preset 改动前 tests/presets 的「方法层根」断言红（8 断言/3 文件
// 的新 spec 全红）——本探针在实现后首跑即绿；若机制被证伪（如锚点不对齐），①⑤⑥ 会红。
//
// 判据（六条，全过 = 机制成立）：
//   ① cfo 新会话 catalog 含预置方法 probe-seeded-method（方法层冷启动发现；目录预先手写）
//   ② ceo / vp-eng / coo 会话不含它（方法层按角色隔离，不串 CEO、不串其他职能）
//   ③ 五角色 session/create 全部成功（缺目录容忍：只有 cfo 方法层存在，其余四角色目录缺席）
//   ④ commands/list 含 cultivation；/cultivation correct 落记录到 <cwd>/cultivation/records/
//   ⑤ /cultivation adopt → 方法 SKILL.md 落 <profile>/company-cultivation/cfo/ + 记录翻 adopted
//   ⑥ 采纳后**新开**的 cfo 会话 catalog 含该方法（跨会话持续生效）；运行中会话复查 = 观察项
//      （watcher 刷新时点不是 V5 的主张面，打印实测行为供卡参考）
// `--full` 档加第七条（V6 写隔离，真模型一轮 ≈$0.05）：
//   ⑦ cfo 会话经 fs write 往方法层绝对路径写 → 沙箱拒（`[sandbox: file access denied under
//      workspace-write mode]`）。⚠ **模式依赖**（2026-10-13 实测发现）：围栏只在
//      workspace-write 下存在——本机 Seatbelt 被禁时 run/env.sh 导出 DSH_PERMISSION_MODE=
//      danger-full-access（机器条件，env.sh 明示打印），⑦ 会红且红文提示按 workspace-write
//      重跑；判 ⑦ 前先 `DSH_PERMISSION_MODE=workspace-write` 钉住模式。
// 清理：探针只删自己种下的文件（seed 方法目录、adopt 产物、本次写入的记录文件）。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const FULL = process.argv.includes('--full')
const SEED_METHOD = 'probe-seeded-method'

let home
try {
  home = requireDevHome('cultivation-method-layer-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
const REHEARSAL = join(ROOT, REHEARSAL_REL)
ensureRehearsalWorkspace(ROOT)
const PROFILE_WEB = join(home, 'profiles', 'web')
const METHOD_ROOT = join(PROFILE_WEB, 'company-cultivation')
const RECORDS_DIR = join(REHEARSAL, 'cultivation', 'records')
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

// ── 预置（探针前清掉自己的历史残留，再种 seed 方法到 cfo 方法层）────────────────
const seedDir = join(METHOD_ROOT, 'cfo', SEED_METHOD)
rmSync(seedDir, { recursive: true, force: true })
mkdirSync(seedDir, { recursive: true })
writeFileSync(join(seedDir, 'SKILL.md'), [
  '---',
  `name: ${SEED_METHOD}`,
  'description: 探针预置方法：验证方法层目录被该角色新会话发现。',
  '---',
  '',
  `# ${SEED_METHOD}`,
  '',
  '探针方法正文（机制证据用，不是真实培养产物）。',
  '',
].join('\n'))
const recordsBefore = new Set(existsSync(RECORDS_DIR) ? readdirSync(RECORDS_DIR) : [])

const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  error => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)

// 本次探针落下的记录 id（④⑤ 写入、清理段收走——外层声明，finally 后仍可见）。
let recordId = null

const { child, base, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'cm-', dumpBodyOnError: true })

  // ③ 五角色可挂载（缺目录容忍：方法层只有 cfo 目录存在）
  const sessionIds = new Map()
  for (const role of ROLES) {
    await check(`session/create 挂上 ${role}（方法层缺目录不炸）`, async () => {
      const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: role } })
      if (created?.agentPreset !== role) throw new Error(`返回 preset 不是 ${role}：${JSON.stringify(created).slice(0, 160)}`)
      sessionIds.set(role, created.id ?? created.sessionId)
    })
  }

  // ①/② 目录发现与跨角色隔离
  const catalogOf = async role => {
    const value = await rpc('skills/list', { request: { sessionId: sessionIds.get(role) } })
    return (value.skills ?? []).map(skill => skill.name)
  }
  await check('① cfo 新会话发现预置方法（方法层冷启动）', async () => {
    const names = await catalogOf('cfo')
    if (!names.includes(SEED_METHOD)) throw new Error(`cfo catalog 缺 ${SEED_METHOD}（实际：${names.join(', ').slice(0, 200)}）`)
  })
  for (const role of ['ceo', 'vp-eng', 'coo']) {
    await check(`② ${role} 不串 cfo 的方法（角色隔离）`, async () => {
      const names = await catalogOf(role)
      if (names.includes(SEED_METHOD)) throw new Error(`${role} 误加载了 cfo 方法 ${SEED_METHOD}`)
    })
  }

  // ④ 命令族 wiring + 提案落盘
  const cfoSession = sessionIds.get('cfo')
  await check('④ commands/list 含 cultivation；/cultivation correct 落记录', async () => {
    const descriptors = await rpc('commands/list', { agentId: cfoSession })
    const names = (descriptors ?? []).map(d => d.name)
    if (!names.includes('cultivation')) throw new Error(`命令面缺 cultivation（实际：${names.join(', ').slice(0, 200)}）`)
    const run = await rpc('commands/execute', {
      agentId: cfoSession,
      line: '/cultivation correct 测算结论先列假设口径 :: 做法：出测算稿前，先单列固定成本与边际成本两栏再下结论。',
      submittedAttachments: [],
    })
    if (run?.result?.kind !== 'success') throw new Error(`correct 未成功：${JSON.stringify(run).slice(0, 240)}`)
    const m = /(\d{8}-\d{6}-[a-z0-9]{4})/.exec(run.result.text ?? '')
    if (m === null) throw new Error(`回执里没有记录 id：${run.result.text ?? ''}`)
    recordId = m[1]
    const path = join(RECORDS_DIR, `${recordId}.md`)
    if (!existsSync(path)) throw new Error(`记录未落盘：${path}`)
    if (!readFileSync(path, 'utf8').includes('status: open')) throw new Error('记录不是 open 态')
  })

  // ⑤ 采纳 → 方法落方法层 + 记录翻转（cfo 会话内本人采纳）
  await check('⑤ adopt 部署方法 + 记录翻 adopted', async () => {
    if (recordId === null) throw new Error('上一步未通过，没有记录 id')
    const run = await rpc('commands/execute', {
      agentId: cfoSession,
      line: `/cultivation adopt ${recordId}`,
      submittedAttachments: [],
    })
    if (run?.result?.kind !== 'success') throw new Error(`adopt 未成功：${JSON.stringify(run).slice(0, 240)}`)
    const skillPath = join(METHOD_ROOT, 'cfo', `method-${recordId}`, 'SKILL.md')
    if (!existsSync(skillPath)) throw new Error(`方法未落方法层：${skillPath}`)
    const skill = readFileSync(skillPath, 'utf8')
    if (!skill.includes(`name: method-${recordId}`)) throw new Error('SKILL.md 缺 name frontmatter')
    if (!skill.includes('测算结论先列假设口径')) throw new Error('SKILL.md 缺 description（期望行为）')
    const recordText = readFileSync(join(RECORDS_DIR, `${recordId}.md`), 'utf8')
    if (!recordText.includes('status: adopted')) throw new Error('记录未翻 adopted')
    if (!recordText.includes(`methodSlug: method-${recordId}`)) throw new Error('记录缺 methodSlug 回执')
  })

  // ⑥ 跨会话持续生效：新开的 cfo 会话 catalog 含采纳方法；旧会话复查 = 观察项
  await check('⑥ 采纳后新开的 cfo 会话加载该方法（跨会话生效）', async () => {
    const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'cfo' } })
    const value = await rpc('skills/list', { request: { sessionId: created.id ?? created.sessionId } })
    const names = (value.skills ?? []).map(skill => skill.name)
    if (!names.includes(`method-${recordId}`)) {
      throw new Error(`新 cfo 会话缺已采纳方法（实际：${names.join(', ').slice(0, 200)}）`)
    }
    // 观察项（不判红绿）：运行中会话的 catalog 复查——watcher 刷新时点供卡参考。
    try {
      await sleep(1500)
      const liveNames = await catalogOf('cfo')
      console.log(`  NOTE 运行中的 cfo 会话复查：${liveNames.includes(`method-${recordId}`) ? '已见（watcher 已刷新 catalog）' : '未见（watcher 未及/仅后续模型步骤生效）'}——${liveNames.join(', ').slice(0, 120)}`)
    } catch { /* 观察项失败不判红 */ }
  })

  // 反例（角色闸）：ceo 会话采纳 cfo 的记录 → 拒绝（仅建议权，目标本人采纳）
  let suggestionRecordId = null
  await check('反例：ceo 会话代采纳 cfo 的记录被拒（仅建议权）', async () => {
    if (recordId === null) throw new Error('没有可用的记录 id')
    const ceoSession = sessionIds.get('ceo')
    const sug = await rpc('commands/execute', {
      agentId: ceoSession,
      line: '/cultivation suggest cfo 引用客户事实必须带 KB 出处 :: 建议：客户判断逐条给出 kb/vp-sales/CHARTER.md 的条目出处。',
      submittedAttachments: [],
    })
    if (sug?.result?.kind !== 'success') throw new Error(`suggest 未成功：${JSON.stringify(sug).slice(0, 240)}`)
    const sugId = /(\d{8}-\d{6}-[a-z0-9]{4})/.exec(sug.result.text ?? '')?.[1]
    if (sugId === undefined) throw new Error('suggest 回执缺记录 id')
    suggestionRecordId = sugId
    const run = await rpc('commands/execute', {
      agentId: ceoSession,
      line: `/cultivation adopt ${sugId}`,
      submittedAttachments: [],
    })
    if (run?.result?.kind !== 'error') throw new Error(`ceo 代采纳本应被拒：${JSON.stringify(run).slice(0, 240)}`)
    if (!(run.result.text ?? '').includes('仅建议权')) throw new Error(`拒绝文案未点名仅建议权：${run.result.text ?? ''}`)
  })

  // ⑦ --full 档（V6 写隔离，真模型一轮）：cfo 分身往方法层绝对路径写 → 沙箱拒。
  if (FULL) {
    await check('⑦ 分身 fs 写方法层路径被沙箱拒（D25 自改否决的活体面）', async () => {
      const target = join(METHOD_ROOT, 'cfo', 'probe-write-test', 'SKILL.md')
      const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'cfo' } })
      const sessionId = created.id ?? created.sessionId
      await rpc('session/prompt', { request: {
        requestId: `cmp-${String(Date.now())}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId, mode: 'queue',
        content: [{ type: 'text', text: `排练指令（只做一件事，做完即停）：用 write 工具在绝对路径 ${target} 写入一行字「probe-write-test」。无论成功失败，报告结果后就停。` }],
        clientTimeZone: 'Asia/Shanghai',
      } })
      // 等轮收口（fs-guard 同款：轮 240s 未收口 = 红）。
      const eventsOf = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
        .map(record => record.event).filter(Boolean)
      const deadline = Date.now() + 240_000
      let events = []
      while (Date.now() < deadline) {
        events = await eventsOf()
        if (events.some(event => event?.type === 'turn/end')) break
        await sleep(4_000)
      }
      if (!events.some(event => event?.type === 'turn/end')) throw new Error('写拒绝探针：turn 240s 未收口')
      // 判定：日志里有 write 调用且结果为错误（拒绝类），且目标路径无新文件。
      const json = JSON.stringify(events)
      const wrote = existsSync(target)
      if (wrote) throw new Error(`分身成功写进了方法层（${target}）——写隔离被证伪（若本机 DSH_PERMISSION_MODE=danger-full-access〔Seatbelt 禁用的 env.sh 处方〕属机器条件，先按 workspace-write 重跑再判）`)
      if (!json.includes('"write"')) throw new Error('日志里没有 write 调用——模型没按要求尝试（判据空转，重跑）')
      const denial = /\[sandbox: file access denied under [a-z-]+ mode\]|FS_SANDBOX_DENIED/.exec(json)?.[0]
        ?? (/Error:[^"\\]{0,120}/.exec(json)?.[0] ?? '')
      if (denial === '') throw new Error('write 调用没有错误回执——无法证明被拒')
      console.log(`  NOTE 写拒绝回执锚：${String(denial).slice(0, 120)}`)
    })
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

// ── 清理：只删本次探针自己的产物（seed 方法、adopt 方法、新写的记录）────────────
rmSync(seedDir, { recursive: true, force: true })
if (recordId !== null) {
  rmSync(join(METHOD_ROOT, 'cfo', `method-${recordId}`), { recursive: true, force: true })
  rmSync(join(RECORDS_DIR, `${recordId}.md`), { force: true })
}
if (existsSync(RECORDS_DIR)) {
  for (const name of readdirSync(RECORDS_DIR)) {
    if (!recordsBefore.has(name) && name.endsWith('.md') && name.startsWith('2026')) {
      rmSync(join(RECORDS_DIR, name), { force: true })
    }
  }
}
// cfo 方法层目录只在清完探针产物后**为空**时才收走（非空 = 里面有真实方法，一个不动）。
try { require('node:fs').rmdirSync(join(METHOD_ROOT, 'cfo')) } catch { /* 非空/缺失则留着 */ }

console.log(failures.length === 0
  ? '\ncultivation-method-layer-probe: ALL PASS（方法层机制六判据 + 角色闸反例全过）'
  : `\ncultivation-method-layer-probe: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
