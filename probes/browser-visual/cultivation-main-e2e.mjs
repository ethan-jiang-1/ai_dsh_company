#!/usr/bin/env node
// 状态：常驻
// 培养主视图 E2E（2026-10-30 工作优先切片的第一口**含真模型**的端到端）：真 Web + Chromium 走
// 「新会话首启 → 第三个 conversation tab → 左板单表单 → host 命令 → 公司盘落盘 → 右栏独立培养会话
// → 真模型回复」全程。
//
// 何时跑：改培养主视图 / CultivationChatPanel / CultivationCompose / host `/cultivation` 命令族，
//   或大版本交付前的人工 E2E（keyless 档只证「点了发哪条线」，本档证「真页面、真 host、真模型」）。
// 成本：**真模型 2 次短调用**（新会话首启 1 次 + 培养对话 1 次）+ chromium；dev home（有密钥）。
// 用法：source run/env.sh && node probes/browser-visual/cultivation-main-e2e.mjs [--shots]
//
// ⚠ 与其他培养档的分工：cultivation-gui-probe 从侧栏页签进（面板复用，隔离 home、keyless）；
//   本档从会话头第三个 tab 进——主视图与独立培养会话**只在主视图存在**，且独立会话要真模型才有回复。
//   本档会在 dev 公司盘写自己前缀的记录并清理；创建的独立培养会话留在侧栏（真实使用痕迹，不删）。
//
// 判据（全过 = 主视图 E2E 成立；任一红即 exit 1）：
//   ① 零挂载失败（无 banner / 无 loader 错误 / 无 pageerror）；
//   ② 主视图挂载：`.wk-cult-view` 左板含主任务与入口；右栏独立培养会话真建立（session: 前缀）；
//      shell composer seat 在主视图挂载期隐藏；
//   ③ 单表单全链路（纠正）：work/期望/做法 → 预览 → 提交 → 盘上记录含 work+status open+targetRole=会话角色；
//      提交成功表单收回单一入口；
//   ④ 建议切换：默认显纠正说明；点 CFO 显建议说明 + 预览「CFO（建议）」→ 提交 → 盘上 kind suggestion+targetRole cfo；
//   ⑤ 治理回路：自纠正进「需要我处理」带「待我决定」；采纳落方法层；验证无依据不发、
//      有用/失败各写一条历史、失败不撤回；已采纳卡显示「这次工作：…」；
//   ⑥ 右栏对话 E2E（真模型）：附加记录下拉含刚才记录；发送后 90s 内助手文本渲染；
//      用户行落 transcript；过程零 pageerror；
//   ⑦ 分隔条拖宽生效且 localStorage 持久化。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices } from '../../tools/lib/probe-window.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const SHOTS = process.argv.includes('--shots')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const MARK = 'mainE2E'

// ── 陈旧构建守卫：lib 早于 src = 拒跑（旧 bundle 会把探针变成假绿；2026-10-30 实证）─────
function newestSourceMtime(dir) {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') newest = Math.max(newest, newestSourceMtime(path))
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      newest = Math.max(newest, statSync(path).mtimeMs)
    }
  }
  return newest
}
{
  const newest = newestSourceMtime(join(ROOT, 'packages/company-pack/src'))
  for (const name of ['client.js', 'index.js']) {
    const artifact = join(ROOT, 'packages/company-pack/lib', name)
    if (!existsSync(artifact)) { console.error(`main-e2e: 缺 ${artifact}；先构建 pack`); process.exit(2) }
    if (statSync(artifact).mtimeMs < newest) {
      console.error(`main-e2e: ${name} 早于 src；先构建 pack（pnpm typecheck + tsdown）再跑`)
      process.exit(2)
    }
  }
}

const home = requireDevHome('cultivation-main-e2e')
ensureRehearsalWorkspace(ROOT)
const WORKSPACE = join(ROOT, 'company-workspace')
const RECORDS_DIR = join(WORKSPACE, 'cultivation', 'records')
const METHOD_ROOT = (role) => join(home, 'company', 'methods', role)
const OUT_DIR = join(ROOT, 'runtime', 'human-exits-evidence')
const recordsBefore = new Set(existsSync(RECORDS_DIR) ? readdirSync(RECORDS_DIR) : [])
const recordTextOf = (id) => existsSync(join(RECORDS_DIR, `${id}.md`)) ? readFileSync(join(RECORDS_DIR, `${id}.md`), 'utf8') : null

const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  error => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)
let hostRole = null
let correctionId = null
let suggestionId = null
let adoptedSlug = null

const browser = await launchChromium(await loadChromium(ROOT))
try {
  const url = `http://127.0.0.1:${String(port)}/?token=${token}`
  const cookie = await companyCookie({ fetch, base: `http://127.0.0.1:${String(port)}`, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base: `http://127.0.0.1:${String(port)}`, cookie, prefix: 'cme-' })

  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await context.newPage()
  const pageErrors = []
  const loaderErrors = []
  page.on('console', (m) => { if (m.type() === 'error' && m.text().includes('failed to apply loader entry')) loaderErrors.push(m.text()) })
  page.on('pageerror', (e) => { pageErrors.push(String(e)) })

  const dismissStartupOverlays = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await dismissNotices(page, sleep)
      const preview = page.getByRole('dialog').filter({ hasText: /still in preview/i })
      if (await preview.count() > 0) {
        const proceed = preview.getByRole('button', { name: /Continue/ })
        if (await proceed.count() === 0) throw new Error('preview notice 缺 Continue 按钮')
        await proceed.first().click()
        await sleep(500)
      }
      const signin = page.getByRole('dialog').filter({ hasText: 'Sign in to your DeepSeek account or add an API Key' })
      if (await signin.count() > 0) {
        const close = signin.getByRole('button', { name: 'Close' })
        if (await close.count() > 0) await close.click()
        else await signin.locator('button').filter({ hasText: '×' }).click()
        await sleep(500)
      }
      if (await page.locator('[role="dialog"]').count() === 0) return
      await sleep(300)
    }
    const remaining = await page.locator('[role="dialog"]').allTextContents()
    if (remaining.length > 0) throw new Error(`未关闭的首启提示：${remaining.join(' | ').slice(0, 200)}`)
  }

  await check('① 零挂载失败（banner + loader 错误 + pageerror）', async () => {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    await sleep(4000)
    if (await page.locator('text=Failed to load plugins').count() > 0) throw new Error('出现 Failed to load plugins')
    if (loaderErrors.length > 0) throw new Error(loaderErrors.slice(0, 2).join(' | '))
    if (pageErrors.length > 0) throw new Error(`pageerror：${pageErrors.slice(0, 2).join(' | ')}`)
  })

  // 开场：落公司盘 → 用 RPC 挑一个 cwd=公司盘根的既有会话（最近更新优先）→ 按标题点开 →
  // 点「培养」tab 进主视图。空白新会话停在 Home 屏不渲染 conversation tabs（2026-10-30 两次实测），
  // 所以不造新会话，走真用户日常路径：打开既有会话。
  await (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await dismissStartupOverlays()
      const chooser = page.getByRole('button').filter({ hasText: /Choose workspace|company-workspace/ })
      if (await chooser.count() > 0) {
        await chooser.last().click().catch(() => {})
        await sleep(1200)
        const drive = page.getByText('company-workspace', { exact: true }).last()
        if (await drive.count() > 0) { await drive.click().catch(() => {}); await sleep(2500) }
      }
      const list = await rpc('session/list', { _request: {} })
      const candidates = (list?.items ?? [])
        .filter(item => item.cwd === WORKSPACE && item.parentSessionId === undefined && item.origin !== 'subagent' && item.blank !== true)
        .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
      if (candidates.length === 0) throw new Error(`session/list 里没有 cwd=${WORKSPACE} 的既有会话；先在该公司盘真实用过一次`)
      const lead = candidates[0]
      // 原始 RPC 的行不带 title 字段：标题住 title 投影（values.title；client store 才展开它）。
      const title = [lead?.projections?.values?.title, lead?.displayTitle, lead?.title]
        .find(value => typeof value === 'string' && value.trim() !== '')?.trim() ?? ''
      if (title === '') throw new Error(`候选会话缺标题（projection keys=${Object.keys(lead?.projections?.values ?? {}).join(',')}）`)
      const row = page.getByText(title, { exact: true }).first()
      if (await row.count() === 0) {
        // 侧栏虚拟化/折叠时用搜索。
        const searchButton = page.getByRole('button', { name: 'Search sessions' })
        if (await searchButton.count() > 0) {
          if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
          await page.getByPlaceholder('Search session names').fill(title.slice(0, 12))
          const hit = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: title })
          if (await hit.count() === 0) throw new Error(`搜索也找不到会话「${title}」`)
          await hit.first().click()
        } else {
          throw new Error(`侧栏里找不到会话「${title}」且没有搜索入口`)
        }
      } else {
        await row.click()
      }
      await sleep(3500)
      const tab = page.getByRole('tab', { name: '培养' })
      if (await tab.count() > 0) {
        await tab.first().click()
        await sleep(2500)
        if (await page.locator('.wk-cult-view').count() > 0) {
          console.log(`  NOTE E2E 载体会话：${title}（cwd=公司盘根）`)
          return
        }
      }
      console.log(`  NOTE 开场自愈第 ${String(attempt + 1)} 轮未进主视图——重试`)
    }
    throw new Error(`3 轮自愈仍打不开培养主视图：${(await page.locator('body').innerText()).slice(0, 200)}`)
  })()

  await check('② 主视图挂载：左板主任务 + 右栏独立会话 + composer 隐藏', async () => {
    if (await page.locator('.wk-cult-view').count() !== 1) throw new Error('主视图容器缺席')
    const board = page.locator('.wk-cult-view-board')
    await board.getByText('让角色今后的工作更好').first().waitFor({ timeout: 15_000 })
    await board.getByRole('button', { name: '开始记录一项工作', exact: true }).waitFor({ timeout: 15_000 })
    const chat = page.locator('.wk-cult-chat')
    await chat.getByText('独立培养会话').first().waitFor({ timeout: 15_000 })
    await chat.locator('.wk-cult-chat-session').filter({ hasText: 'session: ' }).waitFor({ timeout: 30_000 })
    const seat = page.locator('[data-composer-seat]').first()
    if (await seat.count() > 0 && await seat.evaluate(node => getComputedStyle(node).display) !== 'none') {
      throw new Error('shell composer seat 未被主视图隐藏')
    }
  })

  const composeForm = () => page.locator('.wk-cultivation-compose').first()

  await check('③ 单表单全链路（纠正）：预览 → 提交 → 盘上 work+open', async () => {
    await composeForm().getByRole('button', { name: '开始记录一项工作', exact: true }).click()
    const form = composeForm()
    await form.getByLabel('这次什么工作 / 想改善什么').fill(`${MARK}：收口时漏了未决项。`)
    await form.getByLabel('期望它怎么做（一句话）').fill(`${MARK}：收口前逐项列出未决项`)
    // 单表单的 textarea 顺序固定：第 1 个 = 工作事实，第 2 个 = 做法/证据正文。
    // 正文标签会随「默认自动带背景」翻成「做法（可选）」——按标签找会撞切换，按序号找才稳。
    await form.locator('textarea').nth(1).fill('做法：先列未决清单再下结论。')
    const preview = form.locator('[aria-label="提交前预览"]')
    await preview.waitFor({ timeout: 10_000 })
    if (!await preview.getByText(`${MARK}：收口时漏了未决项。`).count()) throw new Error('预览没显示工作事实')
    if (!await preview.getByText('CEO').count()) throw new Error('预览没显示目标角色')
    await form.getByRole('button', { name: '记下来', exact: true }).click()
    const deadline = Date.now() + 25_000
    let found = null
    while (Date.now() < deadline && found === null) {
      for (const name of readdirSync(RECORDS_DIR)) {
        if (!name.endsWith('.md') || recordsBefore.has(name)) continue
        const body = readFileSync(join(RECORDS_DIR, name), 'utf8')
        if (body.includes(`${MARK}：收口前逐项列出未决项`) && body.includes('status: open')) { found = { name, body }; break }
      }
      if (found === null) await sleep(500)
    }
    if (found === null) throw new Error('提交后盘上没找到 open 记录')
    correctionId = found.name.replace(/\.md$/, '')
    if (!found.body.includes(`work: ${MARK}：收口时漏了未决项。`)) throw new Error('记录缺 work 字段')
    const role = /targetRole:\s*(\S+)/.exec(found.body)?.[1]
    if (role === undefined) throw new Error('记录缺 targetRole')
    hostRole = role
    if (!found.body.includes('proposerKind: human')) throw new Error('记录没署人侧提交')
    await composeForm().getByText('已提交培养记录', { exact: false }).first().waitFor({ timeout: 15_000 })
    if (await composeForm().getByRole('button', { name: '开始记录一项工作', exact: true }).count() !== 1) {
      throw new Error('提交成功后没回到单一主入口')
    }
  })

  await check('④ 建议切换：默认纠正说明 → 点 CFO 变建议 → 盘上 suggestion/cfo', async () => {
    await composeForm().getByRole('button', { name: '开始记录一项工作', exact: true }).click()
    const form = composeForm()
    await form.getByText('记录自己的纠正；提交后在「需要我处理」里由你（CEO 角色语境）决定。').waitFor({ timeout: 10_000 })
    await form.getByRole('button', { name: 'CFO', exact: true }).click()
    await form.getByText('这是给 CFO 的建议，由对方角色语境下的人决定；你这边只留回执。').waitFor({ timeout: 10_000 })
    await form.getByLabel('这次什么工作 / 想改善什么').fill(`${MARK}：预算结论没列假设。`)
    await form.getByLabel('期望它怎么做（一句话）').fill(`${MARK}：结论前列出关键假设`)
    const preview = form.locator('[aria-label="提交前预览"]')
    if (!await preview.getByText('CFO（建议）').count()) throw new Error('预览没把 CFO 标成建议')
    await form.getByRole('button', { name: '记下来', exact: true }).click()
    const deadline = Date.now() + 25_000
    let found = null
    while (Date.now() < deadline && found === null) {
      for (const name of readdirSync(RECORDS_DIR)) {
        if (!name.endsWith('.md') || recordsBefore.has(name)) continue
        const body = readFileSync(join(RECORDS_DIR, name), 'utf8')
        if (body.includes(`${MARK}：结论前列出关键假设`)) { found = { name, body }; break }
      }
      if (found === null) await sleep(500)
    }
    if (found === null) throw new Error('建议提交后盘上没找到记录')
    suggestionId = found.name.replace(/\.md$/, '')
    if (!found.body.includes('kind: suggestion')) throw new Error('记录不是 suggestion')
    if (!/targetRole:\s*cfo\b/.test(found.body)) throw new Error('建议目标不是 cfo')
  })

  await check('⑤ 治理回路：待我决定 → 采纳落方法层 → 验证历史两条 → 失败不撤回', async () => {
    if (correctionId === null) throw new Error('③ 未产出纠正记录')
    const row = page.getByRole('listitem', { name: `待处理 ${correctionId}` })
    await row.waitFor({ timeout: 30_000 })
    if (!await row.getByText(`这次工作：${MARK}：收口时漏了未决项。`).count()) throw new Error('待办行没显示工作事实')
    // 「待我决定」的合同位置 = 我提交的·我已处理（entry-followup Note）；待处理行本身不带状态 Tag。
    const mineRow = page.getByRole('listitem', { name: `我提交的 ${correctionId}` })
    await mineRow.waitFor({ timeout: 30_000 })
    if (!await mineRow.getByText('待我决定').count()) throw new Error('我提交的行没显示「待我决定」')
    await row.getByRole('button', { name: '采纳', exact: true }).click()
    const deadline = Date.now() + 25_000
    while (Date.now() < deadline && !(recordTextOf(correctionId) ?? '').includes('status: adopted')) await sleep(500)
    const adopted = recordTextOf(correctionId) ?? ''
    if (!adopted.includes('status: adopted')) throw new Error('记录未翻 adopted')
    adoptedSlug = /methodSlug:\s*(\S+)/.exec(adopted)?.[1]
    if (adoptedSlug === undefined) throw new Error('记录缺 methodSlug')
    const skillPath = join(METHOD_ROOT(hostRole ?? 'ceo'), adoptedSlug, 'SKILL.md')
    if (!existsSync(skillPath)) throw new Error(`方法未落方法层：${skillPath}`)
    const methodCard = page.getByRole('listitem', { name: `方法 ${adoptedSlug}` })
    await methodCard.waitFor({ timeout: 15_000 })
    if (!await methodCard.getByText(`这次工作：${MARK}：收口时漏了未决项。`).count()) throw new Error('方法卡没显示工作事实')

    await methodCard.getByRole('button', { name: '这条有用', exact: true }).click()
    const verifyForm = methodCard.locator('.wk-cultivation-verification-form')
    await verifyForm.waitFor({ timeout: 10_000 })
    await verifyForm.getByRole('button', { name: '记录有用观察', exact: true }).click()
    await methodCard.getByText('请写明一项采纳后的相似工作').first().waitFor({ timeout: 5_000 })
    await verifyForm.locator('textarea').fill('E2E：后续同类收口按清单盘点了。')
    await verifyForm.getByRole('button', { name: '记录有用观察', exact: true }).click()
    const deadline2 = Date.now() + 25_000
    let text = recordTextOf(correctionId) ?? ''
    while (Date.now() < deadline2 && !text.includes('verification: pass')) { await sleep(500); text = recordTextOf(correctionId) ?? '' }
    if (!text.includes('verification: pass')) throw new Error('有用观察未落盘')

    await methodCard.getByRole('button', { name: '没起作用', exact: true }).click()
    await methodCard.locator('.wk-cultivation-verification-form').locator('textarea').fill('E2E：下一次又漏了。')
    await methodCard.getByRole('button', { name: '记录失败观察', exact: true }).click()
    const deadline3 = Date.now() + 25_000
    text = recordTextOf(correctionId) ?? ''
    while (Date.now() < deadline3 && !text.includes('verification: fail')) { await sleep(500); text = recordTextOf(correctionId) ?? '' }
    if (!text.includes('verification: fail')) throw new Error('失败观察未落盘')
    if (!text.includes('status: adopted')) throw new Error('失败观察不应撤回方法')
    if (!existsSync(skillPath)) throw new Error('失败观察不应删方法文件')
    await methodCard.getByText('后续相似工作观察：2 条').first().waitFor({ timeout: 15_000 })
  })

  await check('⑥ 右栏对话 E2E（真模型）：附加记录可选 → 发送 → 助手回复渲染', async () => {
    const chat = page.locator('.wk-cult-chat')
    if (correctionId !== null) {
      const optionText = await chat.locator('select option').allTextContents()
      if (!optionText.some(text => text.includes(correctionId.slice(0, 18)))) {
        throw new Error(`附加下拉没有刚才的记录（${JSON.stringify(optionText).slice(0, 120)}）`)
      }
    }
    const area = chat.getByLabel('培养对话输入')
    await area.fill('用一句话说明你能做什么。')
    await chat.getByRole('button', { name: '发送', exact: true }).click()
    // 真模型：90s 内助手文本渲染（用户行先落 transcript，随后 host 回复）。
    const deadline = Date.now() + 90_000
    let replied = false
    while (Date.now() < deadline) {
      const bubbles = chat.locator('.wk-cult-chat-line.host .wk-cult-chat-bubble')
      const count = await bubbles.count()
      for (let index = 0; index < count; index += 1) {
        const text = (await bubbles.nth(index).innerText().catch(() => '')).trim()
        if (text !== '' && !text.includes('生成中')) { replied = true; break }
      }
      if (replied) break
      await sleep(2000)
    }
    if (!replied) {
      const text = await chat.innerText()
      throw new Error(`90s 内没有助手回复（面板文本：${text.replaceAll('\n', ' | ').slice(0, 300)}）`)
    }
    const userLogged = await chat.locator('.wk-cult-chat-line.you').filter({ hasText: '用一句话说明你能做什么。' }).count()
    if (userLogged === 0) throw new Error('用户行没落 transcript')
    if (pageErrors.length > 0) throw new Error(`对话过程出现 pageerror：${pageErrors.slice(0, 2).join(' | ')}`)
  })

  await check('⑦ 分隔条拖宽生效且持久化', async () => {
    const handle = page.locator('[role="separator"]')
    const box = await handle.boundingBox()
    if (box === null) throw new Error('找不到分隔条')
    const before = await page.evaluate(() => document.querySelector('.wk-cult-view-split')?.getAttribute('style') ?? '')
    const x = box.x + box.width / 2
    const y = box.y + Math.min(300, box.height / 2)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 120, y, { steps: 12 })
    await page.mouse.up()
    await sleep(400)
    const after = await page.evaluate(() => ({
      style: document.querySelector('.wk-cult-view-split')?.getAttribute('style') ?? '',
      stored: localStorage.getItem('dsh-company-cultivation-chat-width'),
    }))
    if (after.style === before) throw new Error(`拖动后宽度没变（${before}）`)
    if (after.stored === null) throw new Error('宽度没持久化到 localStorage')
  })

  if (SHOTS) {
    mkdirSync(OUT_DIR, { recursive: true })
    await page.screenshot({ path: join(OUT_DIR, 'cultivation-main-e2e.png'), fullPage: false })
  }
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

// ── 清理：只删本探针自己种下的记录（不在 recordsBefore 且正文带 MARK）与方法目录 ────
if (existsSync(RECORDS_DIR)) {
  for (const name of readdirSync(RECORDS_DIR)) {
    if (!name.endsWith('.md') || recordsBefore.has(name)) continue
    const body = readFileSync(join(RECORDS_DIR, name), 'utf8')
    if (body.includes(`${MARK}：`)) rmSync(join(RECORDS_DIR, name), { force: true })
  }
}
if (adoptedSlug !== null) {
  rmSync(join(METHOD_ROOT(hostRole ?? 'ceo'), adoptedSlug), { recursive: true, force: true })
}

console.log(failures.length === 0
  ? '\nmain-e2e: ALL PASS（主视图挂载/单表单/建议切换/治理回路/真模型对话/拖宽）'
  : `\nmain-e2e: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
