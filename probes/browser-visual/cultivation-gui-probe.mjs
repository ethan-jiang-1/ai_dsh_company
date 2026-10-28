#!/usr/bin/env node
// 状态：常驻
// 培养 GUI 行动面探针（2026-10-17 培养 GUI 卡 S6）：**真浏览器点真按钮** → 真命令 → 真落盘。
//
// 何时跑：改 client 面培养动作（CultivationBoard / CultivationCompose / cultivation-actions）、
//   host `/cultivation` 命令族、或升 pin 后必跑（人侧命令通道 = vendor `remote.commands.execute`）；
//   培养 GUI 卡验收（S2–S6）前必跑。
// 成本：keyless（boot ~20–60s + chromium；零模型调用）。
// 用法：source run/env.sh && node probes/browser-visual/cultivation-gui-probe.mjs [--fixture] [--summary]
//   --summary：额外种 130 条旧记录 + 1 条坏记录，断言面板显示“未展开/坏记录”真浏览器文案。
//
// 为什么需要它：keyless 交互档（happy-dom）只能证明「点了发哪条线」；**线真的被 host 执行、
//   方法真的落进方法层、命令真的进会话日志**只有真浏览器 + 真 host 能证明（client-load-smoke
//   只证挂载、不点按）。本档是「挂得上 ≠ 行为对」里"行为对"那一格。
//
// 判据（全过 = 面板行动面成立；任一条红即 exit 1）：
//   ① 面板给待办行「采纳/拒绝」把手，且**只给本角色**的（跨角色记录不出按钮——客户端隐藏；
//      真闸在 host，由 ④ 单独验）；
//   ② 点「采纳」→ 公司盘记录翻 `status: adopted` + `methodSlug`，方法 SKILL.md 落该角色方法层；
//   ③ 该会话日志出现 `command/run` + `command/done`（name=cultivation、source.kind=user）——
//      证明"按钮 = 人侧命令"，不是旁路；
//   ④ 跨角色采纳被 host 拒（`commands/execute` 直发 cfo 会话采纳 ceo 的记录 → 文案含「仅建议权」）；
//   ⑤ 创作表单提交 → 公司盘新增一条 `status: open` 记录（人给分身的输入进得去）；
//   ⑥ 零挂载失败（无 banner / 无 loader 错误）；
//   ⑦ `--fixture` 时截图入 snapshots/visual/cultivation-gui/（用户可见改动的视觉夹具）。
//
// ⚠ 会话落在**公司盘** `company-workspace/`（注册工作区里唯一路径有效的那个：侧栏的
//   `rehearsal-workspace` 仍指着旧路径 dev/rehearsal-workspace，面板读不到那边的记录——
//   2026-10-18 实测）。因此本探针会在公司盘写/删**自己命名**的记录（`guiprobe-*`）与
//   `method-guiprobe-*` 方法目录，动别人的一个不碰。
//
// 清理：只删本次探针自己种下/产生的记录与方法目录（动别人的一个不碰）。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices, openCompanyTab, openSession } from '../../tools/lib/probe-window.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'

const FIXTURE = process.argv.includes('--fixture')
const SUMMARY = process.argv.includes('--summary')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let home
try {
  home = requireDevHome('cultivation-gui-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
const REHEARSAL = join(ROOT, REHEARSAL_REL)
ensureRehearsalWorkspace(ROOT)
/** 面板实际读写的公司盘（侧栏工作区 `company-workspace` 的真实路径）。 */
const WORKSPACE = join(ROOT, 'company-workspace')
/**
 * 目标角色在**运行期发现**：面板给哪个角色的记录出「采纳」，那个角色就是这个会话在 host 侧的身份。
 * 为什么不写死：客户端的 preset 选择器只改**客户端投影**，host 会话仍是建会话时的 preset
 * （2026-10-18 实测：选 CFO 后点采纳被 host 拒，文案「请在 CFO 的会话里采纳」）⇒ 写死角色必翻车。
 * 所以五种角色各给一条待办，让面板自己认领。
 */
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
const STAMP = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const OWN_EXPECTATION = 'GUI探针：收口前逐项列出未决项'
const COMPOSE_EXPECTATION = 'GUI探针：创作面提交的纠正'
const CONTEXT_EXPECTATION = 'GUI探针：带成品背景的跨角色建议'
const seeds = ROLES.map(role => ({
  id: `guiprobe-${STAMP}-${role}`,
  role,
  expectation: `${OWN_EXPECTATION}（${role}）`,
}))
const CROSS_EXPECTATION = 'GUI探针：跨角色建议（可见但不该给采纳把手）'
const PROFILE_WEB = join(home, 'profiles', 'web')
const METHOD_ROOT_OF = (role) => join(home, 'company', 'methods', role)
const RECORDS_DIR = join(WORKSPACE, 'cultivation', 'records')
const OUT_DIR = join(ROOT, 'runtime', 'human-exits-evidence')
const FIXTURE_DIR = join(ROOT, 'snapshots', 'visual', 'cultivation-gui')
// 会话目录名 = `--` + 绝对路径去掉前导 `/` 后把 `/` 换成 `-` + `--`（实测命名，别自己发明）。

/** 角色 → preset 菜单显示名（点选 chip 用）。 */
const ROLE_MENU_LABEL = {
  ceo: '梦之队 CEO', 'vp-eng': '梦之队 VP-Eng', 'vp-sales': '梦之队 VP-Sales', coo: '梦之队 COO', cfo: '梦之队 CFO',
}
/** 角色 → 面板短标签（`我的分身：<短标签>`，与 pack 的 roleLabel 同口径）。 */
const ROLE_SHORT = { ceo: 'CEO', 'vp-eng': 'VP-Eng', 'vp-sales': 'VP-Sales', coo: 'COO', cfo: 'CFO' }
const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  error => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)

/** 种一条记录（手写 frontmatter，与 host 的 recordText 同形状——探针不 import TS 源）。 */
function seedRecord(id, { kind, targetRole, expectation, body, proposerRole = targetRole, contexts }) {
  mkdirSync(RECORDS_DIR, { recursive: true })
  writeFileSync(join(RECORDS_DIR, `${id}.md`), [
    '---',
    `kind: ${kind}`,
    `targetRole: ${targetRole}`,
    `proposerRole: ${proposerRole}`,
    'proposerKind: agent',
    'source: （会话内提交）',
    `expectation: ${expectation}`,
    'status: open',
    ...(contexts === undefined ? [] : [`contexts: ${JSON.stringify(contexts)}`]),
    '---',
    '',
    body,
    '',
  ].join('\n'))
}
// ── 预置：五角色各一条待办（面板认领其一）+ 一条跨角色建议（提出者侧不该有把手）────
const CROSS_ID = `guiprobe-${STAMP}-cross`
// 会话目录名 = `--` + 绝对路径去掉前导 `/` 后把 `/` 换成 `-` + `--`（实测命名，别自己发明）。
const SESSIONS_ROOT = join(home, 'sessions', `--${WORKSPACE.replace(/^\//, '').replaceAll('/', '-')}--`)
const sessionDirsBefore = new Set(existsSync(SESSIONS_ROOT) ? readdirSync(SESSIONS_ROOT) : [])
const recordsBefore = new Set(existsSync(RECORDS_DIR) ? readdirSync(RECORDS_DIR) : [])
if (SUMMARY) {
  mkdirSync(RECORDS_DIR, { recursive: true })
  for (let index = 0; index < 130; index += 1) {
    const id = `guiprobe-summary-20200101-${String(index).padStart(6, '0')}`
    writeFileSync(join(RECORDS_DIR, `${id}.md`), [
      '---', 'kind: correction', 'targetRole: ceo', 'proposerRole: ceo', 'proposerKind: human',
      'source: summary probe', 'expectation: summary', 'status: rejected', '---', '', 'old body', '',
    ].join('\n'))
  }
  writeFileSync(join(RECORDS_DIR, 'guiprobe-broken.md'), 'not a record\n')
}
/** 读一条记录的当前全文（不存在给 null）。 */
const recordTextOf = (id) => existsSync(join(RECORDS_DIR, `${id}.md`)) ? readFileSync(join(RECORDS_DIR, `${id}.md`), 'utf8') : null

const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
let createdRecordId = null
let contextRecordId = null
let sessionContextRecordId = null
let contextOpenId = null
let own = null
let foreignId = null
const browser = await launchChromium(await loadChromium(ROOT))
try {
  const url = `http://127.0.0.1:${String(port)}/?token=${token}`
  const cookie = await companyCookie({ fetch, base: `http://127.0.0.1:${String(port)}`, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base: `http://127.0.0.1:${String(port)}`, cookie, prefix: 'cgp-', dumpBodyOnError: true })

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const loaderErrors = []
  page.on('console', (m) => { if (m.type() === 'error' && m.text().includes('failed to apply loader entry')) loaderErrors.push(m.text()) })
  page.on('pageerror', (e) => { if (String(e).includes('failed to apply loader entry')) loaderErrors.push(String(e)) })

  await check('⑥ 零挂载失败（banner + loader 错误）', async () => {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    await sleep(4000)
    const banner = await page.locator('text=Failed to load plugins').count()
    if (banner > 0) throw new Error(`出现 Failed to load plugins（${String(banner)} 处）`)
    if (loaderErrors.length > 0) throw new Error(loaderErrors.slice(0, 2).join(' | '))
  })

  /** 面板认领的角色（客户端投影的显示名）。 */
  const claimedRole = async () => {
    const text = await page.locator('body').innerText()
    const m = /我的分身：([^\n|]+)/.exec(text)
    return m === null ? null : m[1].trim()
  }

  await check('① 打开会话的「培养」面板（走人在界面上的真路径）', async () => {
    await dismissNotices(page, sleep)
    const chooser = page.getByRole('button').filter({ hasText: /Choose workspace|company-workspace|ai_dsh_company|harness-home|rehearsal-workspace/ })
    if (await chooser.count() > 0) {
      await chooser.last().click()
      await sleep(1200)
      const drive = page.getByText('company-workspace', { exact: true }).last()
      if (await drive.count() > 0) { await drive.click(); await sleep(2500) }
    }
    const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
    if (await opener.count() > 0) { await opener.first().click(); await sleep(900) }
    const entry = page.locator('.wk-guide-entry-label').filter({ hasText: '培养' })
    await entry.first().click()
    await sleep(2000)
  // 开场自愈：会话 preset 是**持久**的（别的探针/人可能把它切成 PTC/Standard）⇒ 先归位到公司角色。
  // 开场自愈循环（与场景档同一条纪律）：选「梦之队 CEO」→ 新建会话 → 开面板 → 读「我的分身」；
  // 新建会话继承**持久化默认 preset**，只切一次 chip 治不了漂移（实测连红两轮）⇒ 3 轮不成 fail-loud。
  await (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      // ① 先落公司盘（工作区芯片的正则要覆盖所有已注册工作区名；漏一个就静默留在别的工作区）
      const chooser = page.getByRole('button').filter({ hasText: /Choose workspace|company-workspace|ai_dsh_company|harness-home|rehearsal-workspace/ })
      if (await chooser.count() > 0) {
        await chooser.last().click().catch(() => {})
        await sleep(1200)
        const drive = page.getByText('company-workspace', { exact: true }).last()
        if (await drive.count() > 0) { await drive.click().catch(() => {}); await sleep(2500) }
      }
      // ② 再选 preset
      const chip = page.getByRole('button').filter({ hasText: /梦之队 (CEO|CFO|COO|VP-Eng|VP-Sales)|Standard mode|PTC mode|Minimal mode/ })
      if (await chip.count() === 0) throw new Error('找不到 preset chip——无法确保会话是公司角色（模式残留）')
      await chip.last().click()
      await sleep(1200)
      const ceo = page.getByText('梦之队 CEO', { exact: true }).last()
      if (await ceo.count() === 0) throw new Error('preset 菜单里没有「梦之队 CEO」')
      await ceo.click()
      await sleep(1500)
      await page.keyboard.press('Escape')
      await page.getByRole('button').filter({ hasText: 'New Session' }).first().click().catch(() => {})
      await sleep(3000)
      const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
      if (await opener.count() > 0) { await opener.first().click().catch(() => {}); await sleep(900) }
      const entry = page.locator('.wk-guide-entry-label').filter({ hasText: '培养' }).first()
      if (await entry.count() > 0) { await entry.click().catch(() => {}); await sleep(2000) }
      const short = /我的分身：([^\n|]+)/.exec(await page.locator('body').innerText())?.[1]?.trim() ?? null
      if (short !== null && short !== '' && short !== 'ptc' && short !== 'standard') return
      console.log(`  NOTE 开场自愈第 ${String(attempt + 1)} 轮仍未归位（我的分身=${String(short)}）——重试`)
    }
    throw new Error(`3 轮自愈仍拿不到公司角色：${(await page.locator('body').innerText()).replaceAll('\n', ' | ').slice(0, 200)}`)
  })()

    const pane = page.locator('.wk-cultivation-compose').first()
    await pane.waitFor({ timeout: 30_000 })
  })

  if (SUMMARY) {
    const text = await page.locator('body').innerText()
    const summary = /(\d+) 条旧记录只读了摘要/.exec(text)
    const broken = /(\d+) 条记录读不动/.exec(text)
    if (summary === null) failures.push('summary：面板未显示“旧记录只读了摘要”')
    else console.log(`  PASS summary 面板显示未展开 ${summary[1]} 条`)
    if (broken === null) failures.push('summary：面板未显示坏记录')
    else console.log(`  PASS summary 面板显示坏记录 ${broken[1]} 条`)
  }

  // 会话身份 + host 角色：靠**创作面**自己问出来——`correct` 写下的记录，targetRole 就是
  // host 会话的真实角色（handler 取会话 header），这比信客户端投影可靠（2026-10-18 实测：
  // 客户端 chip 说 CFO 而 host 是别的角色，点采纳被角色闸拒）。
  let sessionId = null
  let hostRole = null
  await check('⑤a 创作提交一条（同时问出 host 角色）', async () => {
    await page.getByRole('button', { name: '给你的角色留一条方法', exact: true }).click()
    await page.getByLabel('期望它怎么做（一句话）').fill(COMPOSE_EXPECTATION)
    await page.getByLabel('做法与证据').fill('做法：先说结论再给依据。\n证据：probes/browser-visual/cultivation-gui-probe.mjs。')
    await page.getByRole('button', { name: '记下来', exact: true }).click()
    const deadline = Date.now() + 25_000
    let found = null
    while (Date.now() < deadline && found === null) {
      for (const name of readdirSync(RECORDS_DIR)) {
        if (!name.endsWith('.md') || recordsBefore.has(name)) continue
        const body = readFileSync(join(RECORDS_DIR, name), 'utf8')
        if (body.includes(COMPOSE_EXPECTATION) && body.includes('status: open')) { found = { name, body }; break }
      }
      if (found === null) await sleep(500)
    }
    if (found === null) throw new Error('创作提交后没找到新记录（open）')
    createdRecordId = found.name.replace(/\.md$/, '')
    if (!found.body.includes('proposerKind: human')) throw new Error('新记录没署成人侧提交（proposerKind）')
    const role = /targetRole:\s*(\S+)/.exec(found.body)?.[1]
    if (role === undefined) throw new Error('新记录缺 targetRole')
    hostRole = role
    console.log(`  NOTE host 会话角色：${hostRole}；面板客户端投影：${await claimedRole() ?? '（未显示）'}`)
    // 会话身份：session/list 里日志含这次创作命令的那一个。
    const deadline2 = Date.now() + 30_000
    while (Date.now() < deadline2 && sessionId === null) {
      const list = await rpc('session/list', { _request: {} })
      const candidates = (list?.items ?? [])
        .filter(entry => entry.cwd === WORKSPACE && entry.parentSessionId === undefined && entry.origin !== 'subagent')
        .slice(0, 12)
      for (const item of candidates) {
        const events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId: item.sessionId }))
          .map(record => record.event).filter(Boolean)
        if (events.some(event => event?.type === 'command/run' && String(event?.data?.args ?? '').includes(COMPOSE_EXPECTATION))) {
          sessionId = item.sessionId
          break
        }
      }
      if (sessionId === null) await sleep(2000)
    }
    if (sessionId === null) throw new Error('找不到承载这次创作命令的会话（真机链路没落到 host 日志？）')
  })

  await check('⑤b 可选背景：suggest + 成品背景 → 记录 contexts + 人话 source；正文可空', async () => {
    await page.getByRole('button', { name: '给别的角色提建议', exact: true }).click()
    await page.getByRole('button', { name: '＋ 添加背景', exact: true }).click()
    const catalog = JSON.parse(readFileSync(join(WORKSPACE, 'kb', 'deliverables-index.json'), 'utf8'))
    const slug = Array.isArray(catalog?.entries) ? catalog.entries[0]?.slug : undefined
    if (typeof slug !== 'string' || slug === '') throw new Error('成品目录为空，无法验成品背景')
    const option = page.locator('.wk-cultivation-context-option').filter({ hasText: slug }).first()
    await option.waitFor({ timeout: 20_000 })
    const optionText = await option.innerText()
    await option.click()
    await page.locator('.wk-cultivation-context-card').first().waitFor({ timeout: 10_000 })
    await page.getByLabel('期望它怎么做（一句话）').fill(CONTEXT_EXPECTATION)
    // 正文留空 = D3 的核心（“只写一句”）。
    await page.getByRole('button', { name: '记下来', exact: true }).click()
    const deadline = Date.now() + 25_000
    let found = null
    while (Date.now() < deadline && found === null) {
      for (const name of readdirSync(RECORDS_DIR)) {
        if (!name.endsWith('.md') || recordsBefore.has(name)) continue
        const body = readFileSync(join(RECORDS_DIR, name), 'utf8')
        if (body.includes(CONTEXT_EXPECTATION)) { found = { name, body }; break }
      }
      if (found === null) await sleep(500)
    }
    if (found === null) throw new Error(`背景提交后没找到记录（选项：${optionText.replaceAll('\n', ' ')}）`)
    contextRecordId = found.name.replace(/\.md$/, '')
    if (!found.body.includes('contexts: ')) throw new Error('记录缺 contexts')
    if (!found.body.includes('"kind":"deliverable"')) throw new Error('记录 contexts 不是 deliverable')
    if (!/source: 成品「/.test(found.body)) throw new Error('记录 source 不是成品人话摘要')
    const bodyAfter = found.body.split('---').at(-1)?.trim() ?? ''
    if (bodyAfter !== '') throw new Error(`正文应为空，实际：${bodyAfter.slice(0, 80)}`)
    await page.getByText('背景：成品「').first().waitFor({ timeout: 15_000 })
    console.log(`  NOTE 背景选项：${optionText.replaceAll('\n', ' ')}`)
  })

  await check('⑤c 会话背景：host 读真实会话 → contexts.kind=session + source=会话「…」', async () => {
    await page.getByRole('button', { name: '给别的角色提建议', exact: true }).click()
    let card = false
    for (let attempt = 0; attempt < 3 && !card; attempt += 1) {
      await page.getByRole('button', { name: '＋ 添加背景', exact: true }).click()
      const options = page.locator('.wk-cultivation-context-option').filter({ hasText: /CEO|CFO|COO|VP-Eng|VP-Sales|成员/ })
      await options.first().waitFor({ timeout: 20_000 })
      if (await options.count() === 0) break
      await options.nth(Math.min(attempt, (await options.count()) - 1)).click()
      try {
        await page.locator('.wk-cultivation-context-card').first().waitFor({ timeout: 10_000 })
        card = true
      } catch {
        await sleep(500)
      }
    }
    if (!card) throw new Error('三次会话预览都没出卡片（会话背景读不到）')
    const expectation = 'GUI探针：带会话背景的跨角色建议'
    await page.getByLabel('期望它怎么做（一句话）').fill(expectation)
    await page.getByRole('button', { name: '记下来', exact: true }).click()
    const deadline = Date.now() + 25_000
    let found = null
    while (Date.now() < deadline && found === null) {
      for (const name of readdirSync(RECORDS_DIR)) {
        if (!name.endsWith('.md') || recordsBefore.has(name)) continue
        const body = readFileSync(join(RECORDS_DIR, name), 'utf8')
        if (body.includes(expectation)) { found = { name, body }; break }
      }
      if (found === null) await sleep(500)
    }
    if (found === null) throw new Error('会话背景提交后没找到记录')
    sessionContextRecordId = found.name.replace(/\.md$/, '')
    if (!found.body.includes('"kind":"session"')) throw new Error('记录 contexts 不是 session')
    if (!/source: 会话「/.test(found.body)) throw new Error('记录 source 不是会话人话摘要')
    if (!found.body.includes('\n\n\n')) throw new Error('正文应为空')
    console.log('  NOTE 会话背景：已验 host 读真实会话')
  })

  // 面板的客户端投影要与 host 对齐，采纳才会被 host 认（chip 只改客户端，正好用来对齐）。
  await check('①b 面板角色与 host 对齐（点采纳前的前提）', async () => {
    if (hostRole === null) throw new Error('⑤a 未问出 host 角色')
    if (await claimedRole() === ROLE_SHORT[hostRole]) return
    const chip = page.getByRole('button').filter({ hasText: /梦之队 (CEO|CFO|COO|VP-Eng|VP-Sales)/ })
    if (await chip.count() === 0) throw new Error('找不到 preset chip，无法对齐角色')
    await chip.last().click()
    await sleep(1200)
    const option = page.getByText(ROLE_MENU_LABEL[hostRole] ?? '', { exact: true }).last()
    if (await option.count() === 0) throw new Error(`preset 菜单里没有 ${String(ROLE_MENU_LABEL[hostRole])}`)
    await option.click()
    await sleep(2000)
    if (await claimedRole() !== ROLE_SHORT[hostRole]) {
      throw new Error(`对齐失败：面板仍显示 ${String(await claimedRole())}，host 是 ${hostRole}`)
    }
  })

  await check('① 把手只给本角色的待办（其余角色记录不进我的收件箱）', async () => {
    if (hostRole === null) throw new Error('⑤a 未问出 host 角色')
    const ownSeed = { id: `guiprobe-${STAMP}-own`, role: hostRole, expectation: `${OWN_EXPECTATION}（${hostRole}）` }
    seedRecord(ownSeed.id, {
      kind: 'correction', targetRole: hostRole, expectation: ownSeed.expectation,
      body: `做法：收口盘点先列未决清单，按 owner 分行再下结论。\n证据：probes/browser-visual/cultivation-gui-probe.mjs（机制证据，非真实培养产物）。`,
    })
    own = ownSeed
    const row = page.getByRole('listitem', { name: `待处理 ${ownSeed.id}` })
    const deadline = Date.now() + 40_000
    while (Date.now() < deadline && await row.count() === 0) {
      seedRecord(ownSeed.id, {
        kind: 'correction', targetRole: hostRole, expectation: ownSeed.expectation,
        body: `做法：收口盘点先列未决清单，按 owner 分行再下结论。\n证据：probes/browser-visual/cultivation-gui-probe.mjs（机制证据，非真实培养产物）。`,
      })
      await sleep(4000)
    }
    if (await row.count() === 0) throw new Error('种下的待办没进面板（记录目录读不到？）')
    if (await row.getByRole('button', { name: '采纳', exact: true }).count() !== 1) throw new Error('本角色记录应有且仅有一个「采纳」按钮')
    if (await row.locator('.wk-cultivation-body').count() !== 1) throw new Error('待办行没有就地显示提案正文（判断无材料）')
    for (const seed of seeds) {
      if (seed.role === hostRole) continue
      const stale = page.getByRole('listitem', { name: `待处理 ${seed.id}` })
      if (await stale.count() > 0) throw new Error(`别的角色（${seed.role}）的记录也进了「需要我处理」`)
    }
  })

  await check('② 点「采纳」→ 记录翻 adopted + 方法落方法层', async () => {
    if (own === null) throw new Error('① 未认领到记录')
    const row = page.getByRole('listitem', { name: `待处理 ${own.id}` })
    await row.getByRole('button', { name: '采纳', exact: true }).click()
    const deadline = Date.now() + 25_000
    while (Date.now() < deadline && !(recordTextOf(own.id) ?? '').includes('status: adopted')) await sleep(500)
    const text = recordTextOf(own.id) ?? ''
    if (!text.includes('status: adopted')) {
      const panelText = await row.innerText().catch(() => '（读不到行文本）')
      throw new Error(`记录未翻 adopted。面板行文本：${panelText.replaceAll('\n', ' | ').slice(0, 400)}`)
    }
    if (!text.includes(`methodSlug: method-${own.id}`)) throw new Error('记录缺 methodSlug 回执')
    const skillPath = join(METHOD_ROOT_OF(own.role), `method-${own.id}`, 'SKILL.md')
    if (!existsSync(skillPath)) throw new Error(`方法未落方法层：${skillPath}`)
    if (!readFileSync(skillPath, 'utf8').includes(OWN_EXPECTATION)) throw new Error('SKILL.md 缺期望行为（description）')
    const adoptedRow = page.getByRole('listitem', { name: `方法 method-${own.id}` })
    await adoptedRow.waitFor({ timeout: 15_000 })
  })

  await check('③ 命令进会话日志（command/run + command/done，source=user）', async () => {
    if (sessionId === null || own === null) throw new Error('前序判据未就绪')
    // command/run 与 command/done 是直写日志的事件（不吃轮次 checkpoint），落盘有延迟 ⇒ 轮询等齐。
    const eventsOf = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
      .map(record => record.event).filter(Boolean)
    const deadline = Date.now() + 25_000
    let events = await eventsOf()
    while (Date.now() < deadline) {
      const runIds = events.filter(event => event?.type === 'command/run' && event?.data?.name === 'cultivation')
        .map(event => event?.data?.commandId)
      const done = events.some(event => event?.type === 'command/done' && runIds.includes(event?.data?.commandId))
      const adopted = events.some(event => event?.type === 'command/run' && String(event?.data?.args ?? '').includes(`adopt ${own.id}`))
      if (done && adopted) break
      await sleep(2000)
      events = await eventsOf()
    }
    const runs = events.filter(event => event?.type === 'command/run' && event?.data?.name === 'cultivation')
    // `command/done` 的载荷不带 name（只有 commandId + result）⇒ 按 pairing id 与 run 配对。
    const runIds = runs.map(event => event?.data?.commandId)
    const dones = events.filter(event => event?.type === 'command/done' && runIds.includes(event?.data?.commandId))
    if (runs.length === 0) throw new Error('日志里没有 cultivation 的 command/run')
    if (dones.length === 0) throw new Error(`日志里没有与 cultivation run 配对的 command/done；会话 ${String(sessionId)}`)
    if (!runs.some(event => event?.data?.source?.kind === 'user')) throw new Error('command/run 的 source 不是 user（人侧留痕被旁路）')
    if (!runs.some(event => String(event?.data?.args ?? '').includes(`adopt ${own.id}`))) {
      throw new Error(`command/run 里没有本次采纳：${JSON.stringify(runs.map(event => event?.data?.args)).slice(0, 200)}`)
    }
  })

  await check('④ 跨角色采纳被 host 拒（按钮隐藏只是 UX，真闸在 host）', async () => {
    if (sessionId === null || own === null) throw new Error('前序判据未就绪')
    if (hostRole === null) throw new Error('前序判据未就绪')
    const foreignRole = ROLES.find(role => role !== hostRole) ?? 'coo'
    foreignId = `guiprobe-${STAMP}-foreign`
    seedRecord(foreignId, {
      kind: 'suggestion', targetRole: foreignRole, expectation: CROSS_EXPECTATION, proposerRole: hostRole,
      body: '做法：跨角色建议由目标本人采纳——提出者本人这里不该有采纳把手。',
    })
    const run = await rpc('commands/execute', { agentId: sessionId, line: `/cultivation adopt ${foreignId}`, submittedAttachments: [] })
    if (run?.result?.kind !== 'error') throw new Error(`本角色会话代采纳 ${foreignRole} 的记录本应被拒：${JSON.stringify(run).slice(0, 200)}`)
    if (!(run.result.text ?? '').includes('仅建议权')) throw new Error(`拒绝文案未点名仅建议权：${run.result.text ?? ''}`)
  })

  await check('⑤d 审批行背景卡「打开原文」：stat + openResource 真链路不报错', async () => {
    if (hostRole === null) throw new Error('前序判据未就绪')
    const catalog = JSON.parse(readFileSync(join(WORKSPACE, 'kb', 'deliverables-index.json'), 'utf8'))
    const entry = Array.isArray(catalog?.entries) ? catalog.entries[0] : undefined
    if (typeof entry?.path !== 'string' || entry.path === '') throw new Error('成品目录为空，无法验打开原文')
    const id = `guiprobe-${STAMP}-ctxopen`
    contextOpenId = id
    const contexts = { v: 1, items: [{
      kind: 'deliverable', ref: entry.path, title: String(entry.slug ?? '成品'),
      subtitle: String(entry.result ?? ''), excerpt: '探针背景（打开原文链路证据）。', truncated: false,
    }] }
    seedRecord(id, {
      kind: 'correction', targetRole: hostRole, expectation: `${OWN_EXPECTATION}（背景打开）`,
      body: '做法：背景卡的「打开原文」应打开右栏文件，不出现死按钮。', contexts,
    })
    const row = page.getByRole('listitem', { name: `待处理 ${id}` })
    const deadline = Date.now() + 40_000
    while (Date.now() < deadline && await row.count() === 0) {
      seedRecord(id, {
        kind: 'correction', targetRole: hostRole, expectation: `${OWN_EXPECTATION}（背景打开）`,
        body: '做法：背景卡的「打开原文」应打开右栏文件，不出现死按钮。', contexts,
      })
      await sleep(4000)
    }
    if (await row.count() === 0) throw new Error('带背景的待办没进面板')
    const card = row.locator('.wk-cultivation-context-card').first()
    await card.waitFor({ timeout: 10_000 })
    if (await card.getByRole('button', { name: '打开原文', exact: true }).count() !== 1) {
      throw new Error('背景卡没有「打开原文」按钮')
    }
    await card.getByRole('button', { name: '打开原文', exact: true }).click()
    // 打开成功 = 右栏从培养面板切到文件视图（不是靠行内文案断言——导航把行带走了）。
    await page.waitForFunction(
      () => document.querySelectorAll('.wk-cultivation-compose').length === 0,
      null,
      { timeout: 15_000 },
    )
    await page.getByText('final.md', { exact: true }).first().waitFor({ timeout: 15_000 })
  })

  await check('⑦ 截图（视觉夹具）', async () => {
    mkdirSync(OUT_DIR, { recursive: true })
    await page.screenshot({ path: join(OUT_DIR, 'cultivation-gui.png'), fullPage: false })
    if (FIXTURE) {
      mkdirSync(FIXTURE_DIR, { recursive: true })
      await page.screenshot({ path: join(FIXTURE_DIR, 'panel.png'), fullPage: false })
    }
  })
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

// ── 清理：只删本次探针自己的产物 ──────────────────────────────────────────────
if (own !== null) {
  rmSync(join(RECORDS_DIR, `${own.id}.md`), { force: true })
  rmSync(join(METHOD_ROOT_OF(own.role), `method-${own.id}`), { recursive: true, force: true })
}
if (foreignId !== null) rmSync(join(RECORDS_DIR, `${foreignId}.md`), { force: true })
if (createdRecordId !== null) rmSync(join(RECORDS_DIR, `${createdRecordId}.md`), { force: true })
if (contextRecordId !== null) rmSync(join(RECORDS_DIR, `${contextRecordId}.md`), { force: true })
if (sessionContextRecordId !== null) rmSync(join(RECORDS_DIR, `${sessionContextRecordId}.md`), { force: true })
if (contextOpenId !== null) rmSync(join(RECORDS_DIR, `${contextOpenId}.md`), { force: true })

if (existsSync(RECORDS_DIR)) {
  for (const name of readdirSync(RECORDS_DIR)) {
    if (!recordsBefore.has(name) && name.startsWith('guiprobe-')) rmSync(join(RECORDS_DIR, name), { force: true })
  }
}
for (const role of ROLES) {
  try { require('node:fs').rmdirSync(METHOD_ROOT_OF(role)) } catch { /* 非空/缺失则留着（里面有真实方法） */ }
}

console.log(failures.length === 0
  ? '\ncultivation-gui-probe: ALL PASS（真浏览器点按：把手/采纳落盘/日志留痕/角色闸/创作提交/零挂载失败）'
  : `\ncultivation-gui-probe: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
