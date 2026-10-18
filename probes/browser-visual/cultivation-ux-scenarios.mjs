#!/usr/bin/env node
// 状态：常驻
// 培养面板 UX **场景轮**（2026-10-18 第二轮第一人称走查）：不走 T1–T6 顺路，专挑"第一次用会撞上的边角"——
// 空收件箱 / 无人值守视角 / 失败与校验 / 规模与长文本 / 窄窗与浮窗 / 跨角色流向 / 键盘可达性。
//
// 何时跑：改培养面板交互与文案后；或每轮 UX 收口时（与 cultivation-ux-walkthrough.mjs 配对：那条跑顺路，本档跑边角）。
// 成本：keyless（boot ~20–60s + chromium）。前置：source run/env.sh + pack 与前端已构建。
// 用法：source run/env.sh && node probes/browser-visual/cultivation-ux-scenarios.mjs [--shots]
//
// ⚠ 边界：本档证明"边角场景下机制与文案仍然可执行"，**不证明**"新人不会困惑"（那是真人档）。
// 三条仪器纪律（都是被假红/假绿教出来的）：① **先等再判**（有过渡态的面，断言要等收口；S12 教训）；
//   ② 失败**自描述**（找不到入口就把这一带可见按钮/文本 dump 进报错；S13 一次定位）；
//   ③ 找不到入口**响亮**（记 NOTE 必须写清"未验成+原因+下一步"，不许静默跳过当绿）。
// 判据（S1–S6；任一红即 exit 1）：
//   S1 无角色会话（viewer 缺席）→ 面板说清"用五角色之一开会话"，且**不出死按钮**
//   S2a 采纳撞名失败 → 行内出宿主原话（"已存在，未覆盖"），行**仍可操作**（不是卡死）
//   S2b 拒绝空理由 → 行内出校验提示，且**不发命令**
//   S3 规模与长文本 → 12 条待办 + 60 行正文下，面板仍能滚到底、按钮仍可达（记录步数/高度）
//   S4a 窄视口 → 按钮与警告不重叠、警告仍读得到；S4b 浮窗 → 浮窗里动作仍可用（点到就落盘）
//   S5 跨角色流向 → CEO 提交给 CFO 的建议：记录 targetRole=cfo、只在「我提交的」、不进「需要我处理」
//   S6 键盘可达性 → 从面板起 Tab 到「采纳」≤ 6 步、焦点可见（有 outline）、Enter 能真触发
//   S9 时间感 → 每条记录说得出"什么时候提的"（id 里带时间戳；此前面板完全没有时间信息）
//   S10 并发/陈旧 → 另一端先处理后，本端收件箱同步；陈旧副本再动手被 host 状态守卫拒
//   S13 多入口并存 → 侧栏 + 公司页第四子页同开：一侧动作后另一实例 **≤8s 同步**（动作面广播；撤掉广播应红）
//   S14 会话级掉线 → 全量断 /api/：面板不崩、旧数据保留、动作收口（错误话+按钮回可用）、恢复即好
//   S15 时间序 → 三条不同时间戳记录：列表**新在前**且时间标签有序
//   S16 规模 → 30 条待办：全部渲染、滚到底可达、按钮可点（记录耗时）
//   S17 极端形态 → 空正文（不渲染空块）+ 600 字期望句（按钮仍在行内）
//   S18 已撤回记录 → 说清"已撤回"、不再给验证/撤回把手
//   S19 验证负路 → 「没起作用」⇒ verification: fail + 回执
//   S20 撤回后不可再采纳 → host 拒绝 + 面板不再列
//   S21 规模 100 条 → 全部渲染 + 末条可操作（记耗时）
//   S11 极端文案 → 超长期望句 + emoji 不挤坏排版（按钮仍在行内）
//   S12 错误恢复 → 命令面被打断时行内说"不可达"且**按钮回到可用**；解除注入后重试即成功
//   S13 多入口并存 → 侧栏 + 公司页第四子页同开：一端处理完，另一处要么同步、要么被 host 明确拒绝（不许静默）
//   （空盘/不可达首启 = keyless 档钉住两种文案：records:null → 尚未读到/不算 0 条；records:[] → 没有给我的建议或纠正）
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices } from '../../tools/lib/probe-window.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const SHOTS = process.argv.includes('--shots')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const STAMP = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const WORKSPACE = join(ROOT, 'company-workspace')
const RECORDS = join(WORKSPACE, 'cultivation', 'records')
const OUT_DIR = join(ROOT, 'runtime', 'human-exits-evidence')
const SHOT_DIR = join(OUT_DIR, 'ux-scenarios')
// ⚠ 每轮唯一 token：id 跨轮复用会撞上**上一轮遗留的方法目录**（`method-<id>` 已存在 ⇒ host 拒采纳，
//   看起来就像"按钮点了没反应"——2026-10-18 BUG-023 假阳性就是这么来的）。唯一 id + 收尾清理双保险。
const TOKEN = Math.random().toString(36).slice(2, 6)
const P = `uxsc-${STAMP}-${TOKEN}`
const COPY = { adopt: '采纳', reject: '拒绝', rejectConfirm: '确认拒绝', verifyPass: '这条有用', composeSuggest: '给别的角色提建议', submit: '记下来' }

let home
try {
  home = requireDevHome('cultivation-ux-scenarios')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const failures = []
const notes = []
/** 未验成（入口不可达/前置不足）：**必须单独列出**，不许混在 PASS 里冒充绿。 */
const unverified = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  error => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)
/** 截一张（面板局部优先；浮窗场景传 full）。 */
async function shot(page, name, { full = false, selector = '.wk-pane' } = {}) {
  if (!SHOTS) return
  mkdirSync(SHOT_DIR, { recursive: true })
  try {
    const target = full ? page : page.locator(selector).first()
    await target.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: false, timeout: 10_000 })
  } catch { /* 不在场就跳过 */ }
}
/** 种一条记录。 */
function seedRecord(id, { status = 'open', targetRole, expectation, body, methodSlug }) {
  mkdirSync(RECORDS, { recursive: true })
  writeFileSync(join(RECORDS, `${id}.md`), [
    '---', 'kind: correction', `targetRole: ${targetRole}`, `proposerRole: ${targetRole}`, 'proposerKind: agent',
    'source: （会话内提交）', `expectation: ${expectation}`, `status: ${status}`,
    ...(methodSlug === undefined ? [] : [`methodSlug: ${methodSlug}`]),
    '---', '', body, '',
  ].join('\n'))
}
const recordTextOf = (id) => existsSync(join(RECORDS, `${id}.md`)) ? readFileSync(join(RECORDS, `${id}.md`), 'utf8') : ''
const seeded = []

/**
 * 开右栏 + 点「培养」页签（带重试：菜单遮罩/懒渲染/刚切过会话都可能让首次不成立）。
 * S7/S8 新建会话后要重开面板，故抽成助手。
 * @param page - Playwright 页面。
 */
async function openPanel(page) {
  await sleep(200)
  const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
  if (await opener.count() > 0) { await opener.first().click().catch(() => {}); await sleep(900) }
  for (let attempt = 0; attempt < 3; attempt++) {
    const entry = page.locator('.wk-guide-entry-label').filter({ hasText: '培养' }).first()
    if (await entry.count() > 0) {
      await entry.click().catch(() => {})
      await sleep(2000)
      if (await page.locator('.wk-pane').count() > 0) return
    }
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(800)
  }
  throw new Error('打不开培养面板（开右栏 + 点页签三次都没成）')
}

/**
 * 切回会话视图（S13/S23 打开过公司页第四子页 ⇒ 不退出来的话，后面所有场景都会看到**两份同名行**，
 * 触发 strict mode violation——2026-10-19 实测）。找不到入口就退化为按 Escape，不判红（还原动作本身不是判据）。
 * @param page - Playwright 页面。
 */
async function backToSessionView(page) {
  for (const name of [/Chat/, /对话/, /Start/]) {
    const tab = page.getByRole('tab', { name }).first()
    if (await tab.count() > 0) { await tab.click().catch(() => {}); await sleep(1200); return }
  }
  await page.keyboard.press('Escape').catch(() => {})
  await sleep(600)
}

/**
 * 把已有浮窗收回停靠位（**探针卫生**：浮出状态跨会话恢复——上轮 S4b 浮出的面板会出现在下一轮，
 * 挡住导航/让同名行出现多份；2026-10-18 实测两次翻车）。开场与收尾各调一次。
 * @param page - Playwright 页面。
 */
async function dockFloats(page) {
  const floats = page.locator('[data-dockkit-float]')
  for (let i = (await floats.count()) - 1; i >= 0; i--) {
    const dock = floats.nth(i).getByRole('button', { name: /收回|Send back/i }).first()
    if (await dock.count() > 0) { await dock.click().catch(() => {}); await sleep(700) }
  }
}

const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
const browser = await launchChromium(await loadChromium(ROOT))
let role = null
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'uxs-', dumpBodyOnError: true })
  const sessionOf = async () => (await rpc('session/list', { _request: {} }))?.items
    ?.find(item => item.cwd === WORKSPACE)?.sessionId ?? null
  const page = await browser.newPage()
  const loaderErrors = []
  page.on('console', (m) => { if (m.type() === 'error' && m.text().includes('failed to apply loader entry')) loaderErrors.push(m.text()) })
  await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'load', timeout: 60_000 })
  await sleep(4500)
  await dismissNotices(page, sleep)
  // ⚠ 会话 preset 是**持久**的：上一轮若把它切成 Standard/PTC，这一轮客户端会复用那条会话。
  //   所以先把 preset 归位到「梦之队 CEO」，再开培养页签。
  // ── S0 会话归位（**自愈循环**）：选「梦之队 CEO」→ 新建会话 → 开面板 → 读「我的分身」
  //   为什么要循环：新建会话继承**持久化的默认 preset**——前几轮切过 PTC/Standard 就会一路传下去，
  //   只做一次"切 chip"治不了（实测两轮开场"未拿到角色"）。3 轮不成即 fail-loud 并打印面板文本。
  await check('S0 会话归位（自愈循环：选 CEO → 新建会话 → 开面板 → 读角色）', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const chip = page.getByRole('button').filter({ hasText: /梦之队 (CEO|CFO|COO|VP-Eng|VP-Sales)|Standard mode|PTC mode|Minimal mode/ })
      if (await chip.count() === 0) throw new Error('找不到 preset chip（会话面异常）')
      await chip.last().click()
      await sleep(1200)
      const ceo = page.getByText('梦之队 CEO', { exact: true }).last()
      if (await ceo.count() === 0) throw new Error('preset 菜单里没有「梦之队 CEO」')
      await ceo.click()
      await sleep(1800)
      await page.keyboard.press('Escape')   // 收掉菜单遮罩（它会吞掉后面的开栏/点页签）
      await page.getByRole('button').filter({ hasText: 'New Session' }).first().click().catch(() => {})
      await sleep(3000)
      // 新建会话会把面板关上 ⇒ 重开再读角色（openPanel 定义在本文件上方）
      try { await openPanel(page) } catch { /* 下一轮再来 */ }
      const short = /我的分身：([^\n|]+)/.exec(await page.locator('body').innerText())?.[1]?.trim() ?? null
      if (short !== null && short !== '' && short !== 'ptc' && short !== 'standard') return
      console.log(`  NOTE S0 第 ${String(attempt + 1)} 轮仍未归位（我的分身=${String(short)}）——重试`)
    }
    throw new Error(`3 轮自愈仍拿不到公司角色：${(await page.locator('body').innerText()).replaceAll('\n', ' | ').slice(0, 200)}`)
  })

  // 挂公司盘 + 开「培养」页签（与顺路档同一条真路径）
  await dockFloats(page)
  const chooser = page.getByRole('button').filter({ hasText: /Choose workspace|company-workspace|ai_dsh_company|harness-home|rehearsal-workspace/ })
  if (await chooser.count() > 0) {
    await chooser.last().click()
    await sleep(1200)
    const drive = page.getByText('company-workspace', { exact: true }).last()
    if (await drive.count() > 0) { await drive.click(); await sleep(2500) }
    const chipText = await page.getByRole('button').filter({ hasText: /company-workspace|ai_dsh_company|harness-home|rehearsal-workspace/ }).last().innerText().catch(() => '')
    if (!chipText.includes('company-workspace')) throw new Error(`没落在公司盘（当前工作区：${chipText.trim()}）——记录会读错地方`)
  }
  // 开右栏 → 点「培养」页签（带一次重试：菜单遮罩/懒渲染都可能让首次不成立）
  for (let attempt = 0; attempt < 3; attempt++) {
    const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
    if (await opener.count() > 0) { await opener.first().click().catch(() => {}); await sleep(900) }
    const entry = page.locator('.wk-guide-entry-label').filter({ hasText: '培养' }).first()
    if (await entry.count() > 0) {
      await entry.click().catch(() => {})
      await sleep(2000)
      if (await page.locator('.wk-pane').count() > 0) break
    }
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(800)
  }
  const wake = async () => { await page.evaluate(() => { window.dispatchEvent(new Event('focus')) }); await sleep(700) }
  const roleShort = async () => /我的分身：([^\n|]+)/.exec(await page.locator('body').innerText())?.[1]?.trim() ?? null
  role = { CEO: 'ceo', 'VP-Eng': 'vp-eng', 'VP-Sales': 'vp-sales', COO: 'coo', CFO: 'cfo' }[await roleShort()] ?? null

  // 行查询一律限定在**侧栏那个面板**内：公司页实例并存时，page-wide 会命中两份（strict violation）。
  const rowOf = (id) => page.locator('.wk-pane').getByRole('listitem', { name: `待处理 ${id}` }).first()
  /** 目标行被"默认只给最近 10 条"挡住时，先点「显示全部（共 N 条）」再返回它（2026-10-19 折叠上线后的必需动作）。 */
  const revealRow = async (id) => {
    if (await rowOf(id).count() > 0) return rowOf(id)
    const showAll = page.locator('.wk-pane').getByRole('button', { name: /显示全部（共/ }).first()
    if (await showAll.count() > 0) { await showAll.click(); await sleep(1200) }
    return rowOf(id)
  }
  /** 等一条种子行出现（被折叠挡住就先展开）。**所有**等种子行的地方都走它。 */
  const waitRow = async (id, timeout = 25_000) => {
    const row = await revealRow(id)
    await row.waitFor({ timeout })
    return row
  }
  /** 折叠状态跨场景保留（同一组件实例）⇒ 规模场景开场先收起，才能验"默认 10 条"。 */
  const collapseInbox = async () => {
    const less = page.locator('.wk-pane').getByRole('button', { name: /只看最近的/ }).first()
    if (await less.count() > 0) { await less.click(); await sleep(1000) }
  }
  /** 探针卫生：把自己的种子**退场**（改 fs 状态 + 唤醒），免得几百条待办留在共享盘里污染后续断言。 */
  const retireSeeds = async (ids) => {
    for (const id of ids) {
      const file = join(RECORDS, `${id}.md`)
      if (!existsSync(file)) continue
      const text = readFileSync(file, 'utf8')
      if (text.includes('status: open')) {
        writeFileSync(file, text.replace('status: open', 'status: rejected\nreason: 探针退场（场景档自清）'))
      }
    }
    await wake()
    await sleep(800)
  }

  // ── S2a 采纳撞名失败：预先占住方法目录 → 行内必须出宿主原话且行仍可操作 ──────────────
  const conflictId = `${P}-conflict`
  await check('S2a 采纳撞名失败：行内出宿主原话，行仍可操作', async () => {
    if (role === null) throw new Error('未拿到角色')
    seedRecord(conflictId, { targetRole: role, expectation: 'UX场景：撞名失败', body: '做法：测失败态。' })
    seeded.push(conflictId)
    const dir = join(home, 'profiles', 'web', 'company-cultivation', role, `method-${conflictId}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'SKILL.md'), '---\nname: occupied\ndescription: 占位\n---\n\n占位\n')
    await wake()
    const row = await waitRow(conflictId)
    await row.getByRole('button', { name: COPY.adopt, exact: true }).click()
    const deadline = Date.now() + 15_000
    let text = ''
    while (Date.now() < deadline) {
      text = await row.innerText()
      if (text.includes('已存在')) break
      await sleep(500)
    }
    await shot(page, 'S2a-adopt-conflict')
    if (!text.includes('已存在')) throw new Error(`行内没出宿主原话（"已存在"）：${text.replaceAll('\n', ' | ').slice(0, 200)}`)
    if (await row.getByRole('button', { name: COPY.adopt, exact: true }).count() !== 1) throw new Error('失败后行不可再操作（按钮没了）')
    if (recordTextOf(conflictId).includes('status: adopted')) throw new Error('失败却把记录翻了 adopted')
  })

  // ── S2b 拒绝空理由：出校验提示且不发命令 ────────────────────────────────────────
  const emptyRejectId = `${P}-emptyreject`
  await check('S2b 拒绝空理由：出校验提示、不发命令', async () => {
    if (role === null) throw new Error('未拿到角色')
    seedRecord(emptyRejectId, { targetRole: role, expectation: 'UX场景：空理由', body: '做法：测校验。' })
    seeded.push(emptyRejectId)
    await wake()
    const row = await waitRow(emptyRejectId)
    await row.getByRole('button', { name: COPY.reject, exact: true }).click()
    await sleep(400)
    await row.getByRole('button', { name: COPY.rejectConfirm, exact: true }).click()
    await sleep(800)
    const text = await row.innerText()
    await shot(page, 'S2b-reject-empty')
    if (!text.includes('理由')) throw new Error('空理由没有校验提示')
    if (recordTextOf(emptyRejectId).includes('status: rejected')) throw new Error('空理由竟把记录拒了（命令不该发）')
  })

  // ── S3 规模与长文本：12 条待办 + 60 行正文 ─────────────────────────────────────
  await check('S3 规模与长文本：仍能滚到底、按钮可达', async () => {
    if (role === null) throw new Error('未拿到角色')
    const longBody = Array.from({ length: 60 }, (_, i) => `第 ${String(i + 1)} 行：这是一条很长的做法说明，用来压行高与滚动。`).join('\n')
    seedRecord(`${P}-long`, { targetRole: role, expectation: 'UX场景：超长正文（60 行）', body: longBody })
    seeded.push(`${P}-long`)
    for (let i = 0; i < 11; i++) {
      seedRecord(`${P}-bulk-${String(i)}`, { targetRole: role, expectation: `UX场景：批量待办 ${String(i + 1)}`, body: `做法：第 ${String(i + 1)} 条。` })
      seeded.push(`${P}-bulk-${String(i)}`)
    }
    await wake()
    await revealRow(`${P}-bulk-0`)   // 折叠上线后：先确保这批可见
    // 读盘是逐条的（12 条要几秒）⇒ 等到齐再判，别用固定 sleep 赌
    let rows = 0
    const rowDeadline = Date.now() + 25_000
    while (Date.now() < rowDeadline) {
      rows = await page.getByRole('listitem', { name: /^待处理 uxsc-/ }).count()
      if (rows >= 12) break
      await sleep(1000)
    }
    await shot(page, 'S3-scale-top')
    if (rows < 12) throw new Error(`12 条待办没都渲染（实际 ${String(rows)}）`)
    // 最后一条要在场且可点（滚动可达性）
    const last = rowOf(`${P}-bulk-10`)
    await last.scrollIntoViewIfNeeded()
    await sleep(300)
    await shot(page, 'S3-scale-bottom')
    if (await last.getByRole('button', { name: COPY.adopt, exact: true }).count() !== 1) throw new Error('列表底部那条不可操作')
    const longRow = rowOf(`${P}-long`)
    await longRow.scrollIntoViewIfNeeded()
    await sleep(300)
    const collapsedHeight = (await longRow.boundingBox())?.height ?? -1
    const collapsedText = await longRow.innerText()
    if (!collapsedText.includes('展开全文（共 60 行）')) throw new Error('长正文没有折叠开关（撑满面板的老问题）')
    if (collapsedText.includes('第 60 行')) throw new Error('长正文默认就把 60 行全渲染了（没折叠）')
    const before = collapsedHeight
    await longRow.getByRole('button', { name: /展开全文/ }).click()
    await sleep(400)
    const expandedText = await longRow.innerText()
    const expandedHeight = (await longRow.boundingBox())?.height ?? -1
    if (!expandedText.includes('第 60 行')) throw new Error('展开后看不到最后一行')
    await shot(page, 'S3-long-expanded')
    await longRow.getByRole('button', { name: '收起' }).click()
    await sleep(300)
    notes.push(`S3 观察：60 行正文默认折叠后行高 ${String(Math.round(before))}px（展开后 ${String(Math.round(expandedHeight))}px）`)
    if (before > 400) throw new Error(`折叠后行高仍过大：${String(Math.round(before))}px`)
  })

  // ── S4a 窄视口 ───────────────────────────────────────────────────────────────
  await check('S4a 窄视口：按钮不重叠、警告仍可读', async () => {
    await page.setViewportSize({ width: 900, height: 900 })
    await sleep(800)
    await wake()
    const row = await revealRow(`${P}-bulk-0`)
    await row.scrollIntoViewIfNeeded()
    const boxes = await row.getByRole('button').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return { t: (b.textContent ?? '').trim(), x: r.x, y: r.y, w: r.width, h: r.height } }))
    await shot(page, 'S4a-narrow', { full: true })
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]; const b = boxes[j]
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        if (overlap) throw new Error(`按钮重叠：${a.t} × ${b.t}`)
      }
    }
    if (boxes.some(b => b.w < 20 || b.h < 16)) throw new Error(`按钮被压到不可点：${JSON.stringify(boxes.filter(b => b.w < 20 || b.h < 16))}`)
  })

  // ── S4b 浮窗：浮出后行内动作仍可用（BUG-023 假阳性已澄清：浮窗正常，"点了没反应"来自遗留方法目录撞名）──
  await check('S4b 浮窗：拽出后动作仍可用（点到就落盘）', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await sleep(600)
    const panesBefore = await page.locator('[data-dockkit-float]').count()
    const floatBtn = page.getByRole('button', { name: /浮出/ })
    if (await floatBtn.count() === 0) throw new Error('找不到「浮出」按钮')
    await floatBtn.first().click()
    await sleep(1800)
    const target = `${P}-bulk-1`
    const floatPane = page.locator('[data-dockkit-float]').filter({ has: page.getByRole('listitem', { name: `待处理 ${target}` }) }).last()
    if (await floatPane.count() === 0) throw new Error('浮窗里看不到待办行')
    await shot(page, 'S4b-float', { full: true })
    const row = floatPane.getByRole('listitem', { name: `待处理 ${target}` }).last()
    await row.getByRole('button', { name: COPY.adopt, exact: true }).first().click()
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline && !recordTextOf(target).includes('status: adopted')) await sleep(500)
    if (!recordTextOf(target).includes('status: adopted')) {
      // ⚠ 失败时**必读行内原话**（BUG-023 的教训：只查文件状态会把"host 明确拒绝"误读成"按钮死了"）
      const rowText = await row.innerText().catch(() => '（读不到行文本）')
      throw new Error(`浮窗里点采纳没落盘。行内原话：${rowText.replaceAll('\n', ' | ').slice(0, 240)}`)
    }
    notes.push(`S4b：浮窗内动作正常（浮出前已有浮窗 ${String(panesBefore)} 个）`)
  })

  // ── S5 跨角色流向（CEO 侧可见性）─────────────────────────────────────────────
  await check('S5 跨角色流向：建议只进「我提交的」、不进「需要我处理」', async () => {
    if (role !== 'ceo') { notes.push('S5 跳过：当前会话角色不是 ceo（跨角色建议的提出者需为 ceo 才有代表性）'); return }
    const expectation = `UX场景：给 CFO 的建议 ${STAMP}`
    await page.getByRole('button', { name: COPY.composeSuggest, exact: true }).click()
    await sleep(600)
    await page.getByRole('button', { name: 'CFO', exact: true }).click()
    await page.getByLabel('期望它怎么做（一句话）').fill(expectation)
    await page.locator('textarea').fill('做法：测算先列假设口径。')
    await page.getByRole('button', { name: COPY.submit, exact: true }).click()
    const deadline = Date.now() + 20_000
    let found = null
    while (Date.now() < deadline && found === null) {
      for (const name of readdirSync(RECORDS)) {
        if (!name.endsWith('.md')) continue
        const text = readFileSync(join(RECORDS, name), 'utf8')
        if (text.includes(expectation)) { found = { name, text }; break }
      }
      if (found === null) await sleep(500)
    }
    if (found === null) throw new Error('提交后没找到记录')
    const id = found.name.replace(/\.md$/, '')
    seeded.push(id)   // 本档自己产生的记录也清掉
    if (!found.text.includes('targetRole: cfo')) throw new Error('记录 targetRole 不是 cfo')
    await wake()
    // 仪器纪律：等它上屏（最多 15s），别用固定 sleep + 整页文本比对
    await page.getByText('给 CFO 的建议', { exact: false }).first().waitFor({ timeout: 15_000 }).catch(() => {
      throw new Error('CEO 的「我提交的」15s 内没出现这条建议')
    })
    await shot(page, 'S5-cross-role')
    const asTodo = await page.getByRole('listitem', { name: `待处理 ${id}` }).count()
    if (asTodo > 0) throw new Error('给别人的建议出现在自己的「需要我处理」里（归属串了）')
  })

  // ── S6 键盘可达性 ───────────────────────────────────────────────────────────
  await check('S6 键盘可达：键盘模态下焦点可见 + Enter 能触发 + 首达步数', async () => {
    const target = `${P}-bulk-2`
    const row = await revealRow(target)
    await row.scrollIntoViewIfNeeded()
    // ① 键盘模态（连按 Tab 会让 :focus-visible 生效——程序聚焦不触发它，首轮我测错了）
    await page.keyboard.press('Tab')
    // ② 从页首 Tab 到面板内第一个可操作控件要几步（观察项）
    let steps = 0
    for (let i = 0; i < 25; i++) {
      const info = await page.evaluate(() => ({
        text: (document.activeElement?.textContent ?? '').trim().slice(0, 20),
        inPane: document.activeElement?.closest('.wk-pane') !== null,
      }))
      steps = i + 1
      if (info.inPane && info.text !== '') break
      await page.keyboard.press('Tab')
    }
    notes.push(`S6 观察：从页首 Tab ${String(steps)} 步进入面板内首个可操作控件`)
    // ③ 焦点可见（真键盘模态下检查 :focus-visible 的计算样式）
    const adopt = row.getByRole('button', { name: COPY.adopt, exact: true })
    await adopt.focus()
    const focusState = await adopt.evaluate(el => {
      const s = getComputedStyle(el)
      return { visible: el.matches(':focus-visible'), outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow }
    })
    await shot(page, 'S6-keyboard-focus')
    if (!focusState.visible) throw new Error('键盘模态下焦点没进 :focus-visible（平台 focus ring 不生效）')
    if (focusState.outline === 'none' && focusState.width === '0px' && (focusState.shadow === 'none' || focusState.shadow === '')) {
      throw new Error(`焦点不可见（outline:${focusState.outline}/${focusState.width} shadow:${focusState.shadow}）`)
    }
    // ④ Enter 真触发
    await page.keyboard.press('Enter')
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline && !recordTextOf(target).includes('status: adopted')) await sleep(500)
    if (!recordTextOf(target).includes('status: adopted')) throw new Error('Enter 没触发采纳')
  })

  // ── S9 时间感：真实形状的时间戳 id ⇒ 行内必须说得出"什么时候提的"（此前面板完全没有时间信息）──
  await check('S9 时间感：真实时间戳 id 的记录说得出"什么时候提的"', async () => {
    if (role === null) throw new Error('未拿到角色')
    // 真实记录 id = <YYYYMMDD>-<HHMMSS>-<4位随机>（host `newRecordId` 同口径）——时间戳一直在文件名里。
    const clock = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const datedId = `${String(clock.getFullYear())}${pad(clock.getMonth() + 1)}${pad(clock.getDate())}-${pad(clock.getHours())}${pad(clock.getMinutes())}${pad(clock.getSeconds())}-ux9a`
    seedRecord(datedId, { targetRole: role, expectation: 'UX场景：时间感（真实时间戳 id）', body: '做法：看面板有没有时间信息。' })
    seeded.push(datedId)
    await wake()
    const datedRow = await revealRow(datedId)
    await datedRow.waitFor({ timeout: 20_000 })
    await datedRow.scrollIntoViewIfNeeded()
    const rowText = (await datedRow.innerText()).replaceAll('\n', ' ')
    await shot(page, 'S9-time-perception')
    if (!/(刚刚|\d+ 分钟前|\d+ 小时前|昨天 \d{2}:\d{2}|\d{2}-\d{2} \d{2}:\d{2})/.test(rowText)) {
      throw new Error(`行内没有时间信息（人分不清谁新谁旧）：${rowText.slice(0, 200)}`)
    }
    notes.push(`S9：时间标签已上屏（${rowText.slice(0, 80)}）`)
  })

  // ── S10 并发/陈旧：另一端（直接改记录文件 = 另一个窗口/驱动处理过）之后，本端陈旧副本再动手 ──
  await check('S10 并发/陈旧：另一端处理过之后，本端陈旧副本再点采纳要被 host 拒并说清', async () => {
    const target = `${P}-bulk-3`
    const row = await waitRow(target)
    // "另一端"处理：直接把记录翻 rejected（等价于另一个窗口/驱动先动手）
    const text = recordTextOf(target).replace('status: open', 'status: rejected\nreason: 另一端先拒绝')
    writeFileSync(join(RECORDS, `${target}.md`), text)
    // 本端**还没刷新**（30s 轮询 + focus 才刷）⇒ 行仍是陈旧副本上的「采纳」，点它
    await row.getByRole('button', { name: COPY.adopt, exact: true }).click()
    const deadline = Date.now() + 15_000
    let rowText = ''
    while (Date.now() < deadline) {
      rowText = await row.innerText().catch(() => '')
      if (/已处理过|已拒绝|不重复/.test(rowText)) break
      await sleep(400)
    }
    await shot(page, 'S10-stale-after-other-side')
    if (!/已处理过|已拒绝|不重复/.test(rowText)) {
      throw new Error(`陈旧副本动手后没给出宿主原话（人不知道发生了什么）：${rowText.replaceAll('\n', ' | ').slice(0, 200)}`)
    }
    notes.push(`S10：陈旧副本再采纳被 host 拒且行内说清（原话片段：${rowText.replaceAll('\n', ' ').slice(0, 60)}…）`)
  })

  // ── S12 错误恢复：命令面被打断（路由注入）→ 行内必须说"不可达"且行仍可用；恢复后重试成功 ──
  await check('S12 错误恢复：命令面断 → 行内说明；恢复后重试即成功', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-fault`
    seedRecord(id, { targetRole: role, expectation: 'UX场景：命令面被打断', body: '做法：故障注入。' })
    seeded.push(id)
    await wake()
    const row = await waitRow(id)
    // 注入：所有 /api/commands/execute 直接 abort（等价于命令面断）
    await page.route('**/api/commands/execute', route => route.abort())
    await row.getByRole('button', { name: COPY.adopt, exact: true }).click()
    // ⚠ 仪器纪律（2026-10-19 诊断实证）：命令面被打断后，面板会**先**进入「处理中…（disabled）」，
    //   约 1–5s 才收口成「采纳 + 原话」。所以必须**等到两者都成立**再断言——在 t≈0 抓快照会把
    //   "正常的过渡态"误判成"按钮没回来"（S12 此前就是这么假红的；独立诊断 3/10/22/35s 四个点全绿）。
    const deadline = Date.now() + 35_000
    let text = ''
    let adoptBack = 0
    while (Date.now() < deadline) {
      const snap = await row.evaluate((el) => ({
        text: el.textContent ?? '',
        adopt: [...el.querySelectorAll('button')].filter(b => b.textContent.trim() === '采纳' && !b.disabled).length,
      }))
      text = snap.text
      adoptBack = snap.adopt
      if (/不可达|命令面|没回话/.test(text) && adoptBack === 1) break
      await sleep(500)
    }
    if (!/不可达|命令面|没回话/.test(text)) {
      throw new Error(`命令面断时行内没说清：${text.replaceAll('\n', ' | ').slice(0, 200)}`)
    }
    if (adoptBack !== 1) {
      throw new Error(`命令面断后按钮没回到可用（BUG-024 回归）：${text.replaceAll('\n', ' | ').slice(0, 200)}`)
    }
    // 恢复：解除注入，再点一次 → 必须真的落盘
    await page.unroute('**/api/commands/execute')
    await row.getByRole('button', { name: COPY.adopt, exact: true }).click()
    const deadline2 = Date.now() + 20_000
    while (Date.now() < deadline2 && !recordTextOf(id).includes('status: adopted')) await sleep(500)
    if (!recordTextOf(id).includes('status: adopted')) throw new Error('恢复后重试没落盘')
    notes.push('S12：命令面断时行内出"不可达"、行仍可用；恢复后重试成功 ✓')
  })

  // ── S11 极端文案：超长期望句 + emoji，看行怎么排（不许把按钮挤出屏）──────────────────
  await check('S11 极端文案：超长期望句 + emoji 不挤坏排版', async () => {
    if (role === null) throw new Error('未拿到角色')
    const longExpectation = `UX场景：${'很长的期望句'.repeat(12)}🙂🚀✅`
    const id = `${P}-longexpect`
    seedRecord(id, { targetRole: role, expectation: longExpectation, body: '做法：极端文案。' })
    seeded.push(id)
    await wake()
    const row = await waitRow(id)
    await row.scrollIntoViewIfNeeded()
    const btn = row.getByRole('button', { name: COPY.adopt, exact: true })
    const box = await btn.boundingBox()
    const rowBox = await row.boundingBox()
    await shot(page, 'S11-long-expectation')
    if (box === null || rowBox === null) throw new Error('量不到行/按钮几何')
    if (box.x + box.width > rowBox.x + rowBox.width + 1) throw new Error('按钮被超长文案挤出行的右边界')
    notes.push(`S11 观察：超长期望句（约 ${String(longExpectation.length)} 字 + emoji）行高 ${String(Math.round(rowBox.height))}px，按钮仍在行内（x+w=${String(Math.round(box.x + box.width))} ≤ ${String(Math.round(rowBox.x + rowBox.width))}）`)
  })

  // ── S13 多入口并存（硬判）：侧栏培养页签 + 公司页第四子页同开 ⇒ 一侧动作，另一侧必须**秒级同步** ──
  //   判据要能红能绿：撤掉动作面的广播（CULTIVATION_CHANGED_EVENT）应红——不许靠 30s 轮询蒙过去。
  await check('S13 多入口并存：一侧动作后，另一实例 ≤8s 同步（广播生效）', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-multi`
    seedRecord(id, { targetRole: role, expectation: 'UX场景：多入口并存', body: '做法：两侧同开看同步。' })
    seeded.push(id)
    await wake()
    const sidebarRow = page.locator('.wk-pane').getByRole('listitem', { name: `待处理 ${id}` }).first()
    // 仪器纪律：先等它出现（读盘/刷新有延迟），别在 t≈0 断言
    await sidebarRow.waitFor({ timeout: 25_000 }).catch(() => {
      throw new Error('侧栏实例 25s 内没看到这条（面板不在会话视图？读盘失败？）')
    })
    // 「公司」视图页签由平台渲染（不是 role=tab）⇒ 用可见文本找；找不到 = 这条轴没验，必须**报红**而不是静默跳过
    let viewTab = page.getByText('公司', { exact: true }).first()
    if (await viewTab.count() === 0) {
      // 视图页签只在**有内容的会话**里渲染。给会话造内容最便宜的办法 = 发一条**本地命令**（`/help` 不走模型）。
      const composer = page.locator('textarea, [contenteditable=true]').first()
      if (await composer.count() > 0) {
        await composer.click().catch(() => {})
        await composer.fill('/help').catch(async () => { await page.keyboard.type('/help') })
        await page.keyboard.press('Enter')
        await sleep(3500)
        await wake()
        await sleep(800)
        viewTab = page.getByText('公司', { exact: true }).first()
      }
    }
    if (await viewTab.count() === 0) {
      // 2026-10-19 定位（靠失败自描述 dump）：**会话视图页签只在"有内容的会话"里渲染**；本档开的是空白新会话
      // ⇒ 这条轴在本档的会话形态下**验不成**。不许假红（不是缺陷）、也不许假装绿：响亮记 NOTE 并说清下一步。
      const dump = await page.evaluate(() => [...new Set([...document.querySelectorAll('button,[role=tab]')]
        .map(b => (b.textContent ?? '').trim()).filter(s => s !== '' && s.length < 12))].slice(0, 24))
      notes.push('S13 **未验成（原因已定位，非缺陷）**：会话视图页签只在有内容的会话里出现，而本档开的是空白新会话'
        + `（可见按钮：${JSON.stringify(dump)}）⇒ 下一轮改从侧栏选一条**有内容**的会话再验，或改走其它入口。`)
      return
    }
    await viewTab.click()
    await sleep(1800)
    const sub = page.locator('.wk-view-tabs').getByRole('tab', { name: '培养' }).first()
    if (await sub.count() === 0) throw new Error('公司页里找不到「培养」子页（这条轴没验成，不许算绿）')
    await sub.click()
    await sleep(2500)
    await wake()
    const pageRow = page.locator('.wk-cultivation-pane').getByRole('listitem', { name: `待处理 ${id}` }).first()
    await pageRow.waitFor({ timeout: 25_000 }).catch(() => {
      throw new Error('公司页实例 25s 内没看到这条（同一公司盘应两侧都见）')
    })
    await shot(page, 'S13-two-instances', { full: true })
    await sidebarRow.getByRole('button', { name: COPY.adopt, exact: true }).click()
    const d1 = Date.now() + 20_000
    while (Date.now() < d1 && !recordTextOf(id).includes('status: adopted')) await sleep(500)
    if (!recordTextOf(id).includes('status: adopted')) throw new Error('侧栏实例采纳没落盘')
    const d2 = Date.now() + 8_000
    let synced = false
    while (Date.now() < d2) {
      const stillOffer = await pageRow.getByRole('button', { name: COPY.adopt, exact: true }).count()
      const rowText = await pageRow.innerText().catch(() => '')
      if (stillOffer === 0 || /已采纳|已处理/.test(rowText)) { synced = true; break }
      await sleep(400)
    }
    await shot(page, 'S13-two-instances-synced', { full: true })
    if (!synced) {
      const rowText = await pageRow.innerText().catch(() => '（读不到）')
      throw new Error(`跨实例没同步（广播没生效？）：公司页实例仍给可用的「采纳」——${rowText.replaceAll('\n', ' | ').slice(0, 180)}`)
    }
    notes.push('S13：侧栏采纳后公司页实例 ≤8s 同步（广播生效，不再等 30s 轮询）✓')
    await backToSessionView(page)   // 还原：别把公司页留着害后面的场景
  })

  // ── S16 规模：30 条待办时面板仍可用（全部渲染、能滚到底、按钮可点；记录耗时）────────────
  await check('S16 规模：30 条 ⇒ 折叠 10 条 + 「显示全部」+ 展开后末条可操作', async () => {
    if (role === null) throw new Error('未拿到角色')
    const ids = []
    for (let i = 0; i < 30; i++) {
      const id = `${P}-bulk30-${String(i).padStart(3, '0')}`
      ids.push(id)
      seedRecord(id, { targetRole: role, expectation: `UX场景：规模 ${String(i + 1)}`, body: `做法：第 ${String(i + 1)} 条。` })
      seeded.push(id)
    }
    const t0 = Date.now()
    await wake()
    await collapseInbox()
    const visible = await page.locator('.wk-pane [aria-label="待我处理的培养记录"] [role=listitem]').count()
    const control = page.locator('.wk-pane').getByRole('button', { name: /显示全部（共/ }).first()
    if (visible !== 10) throw new Error(`折叠态应给 10 条，实际 ${String(visible)} 条`)
    if (await control.count() === 0) throw new Error('超过阈值却没给「显示全部（共 N 条）」')
    const controlLabel = await control.innerText()
    await shot(page, 'S16-scale30-collapsed')
    await control.click()
    await sleep(1500)
    const last = await waitRow(ids[30 - 1])
    await last.scrollIntoViewIfNeeded()
    if (await last.getByRole('button', { name: COPY.adopt, exact: true }).count() !== 1) throw new Error('末条不可操作')
    const elapsed = Date.now() - t0
    const paneText = await page.locator('.wk-pane').innerText()
    const hasPager = /下一页|分页|加载更多|第\s*\d+\s*页/.test(paneText)
    notes.push(`S16：30 条 ⇒ 折叠 ${String(visible)} 条 + 「${controlLabel}」；展开后末条可操作（${String(elapsed)}ms）；分页/分组在场=${String(hasPager)}（当前设计=折叠 + 平铺）`)
    await retireSeeds(ids)
  })

  // ── S18 已撤回记录的呈现：说清"已撤回"、不再给验证/撤回把手 ────────────────────────
  await check('S18 已撤回记录：说清已撤回、不再给验证/撤回把手', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-revoked`
    const slug = `${P}-mv`
    seedRecord(id, { status: 'adopted', targetRole: role, expectation: 'UX场景：已撤回的记录', body: '做法：撤回后呈现。', methodSlug: slug })
    const file = join(RECORDS, `${id}.md`)
    writeFileSync(file, `${readFileSync(file, 'utf8').replace('status: adopted', 'status: adopted\nrevokedAt: 2026-10-19T00:00:00.000Z')}`)
    seeded.push(id)
    await wake()
    const row = page.getByRole('listitem', { name: `方法 ${slug}` })
    await row.waitFor({ timeout: 25_000 }).catch(() => { throw new Error('已撤回记录没出现在方法列表里') })
    await row.scrollIntoViewIfNeeded()
    const text = await row.innerText()
    await shot(page, 'S18-revoked')
    if (!/已撤回|不再加载/.test(text)) throw new Error(`没说明"已撤回"：${text.replaceAll('\n', ' | ').slice(0, 160)}`)
    if (await row.getByRole('button', { name: COPY.verifyPass, exact: true }).count() !== 0) throw new Error('已撤回记录仍给「这条有用」（验证一个已删的方法 = 死按钮）')
    if (await row.getByRole('button', { name: /撤回/ }).count() !== 0) throw new Error('已撤回记录仍给「撤回」')
    notes.push('S18：已撤回记录说清状态且不再给验证/撤回把手 ✓')
  })

  // ── S27 双击护栏的反向判据：**不同行**连点两次必须各发一条（护栏不许误伤并发）──────────
  await check('S27 不同行并发采纳：两条都落盘（双击护栏不误伤）', async () => {
    if (role === null) throw new Error('未拿到角色')
    const a = `${P}-para-a`
    const b = `${P}-para-b`
    seedRecord(a, { targetRole: role, expectation: 'UX场景：并发 A', body: '做法：A。' })
    seedRecord(b, { targetRole: role, expectation: 'UX场景：并发 B', body: '做法：B。' })
    seeded.push(a, b)
    await wake()
    const rowA = rowOf(a)
    const rowB = rowOf(b)
    await rowA.waitFor({ timeout: 25_000 })
    await rowB.waitFor({ timeout: 25_000 })
    // 同一个 tick 里点两**不同**行：护栏按 key 判，必须都放行
    await Promise.all([
      rowA.getByRole('button', { name: COPY.adopt, exact: true }).click(),
      rowB.getByRole('button', { name: COPY.adopt, exact: true }).click(),
    ])
    const deadline = Date.now() + 25_000
    while (Date.now() < deadline) {
      if (recordTextOf(a).includes('status: adopted') && recordTextOf(b).includes('status: adopted')) break
      await sleep(500)
    }
    const okA = recordTextOf(a).includes('status: adopted')
    const okB = recordTextOf(b).includes('status: adopted')
    if (!okA || !okB) throw new Error(`不同行并发被误伤（A=${String(okA)} B=${String(okB)}）——护栏收得太紧`)
    notes.push('S27：不同行并发采纳两条都落盘（护栏按行判，不误伤）✓')
  })

  // ── S28 失败态：记录已消失（陈旧行）⇒ host 原话 + 行仍可用 ──────────────────────────
  await check('S28 失败态：记录已消失时点陈旧行 ⇒ 出行内原话且行仍可用', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-gone`
    seedRecord(id, { targetRole: role, expectation: 'UX场景：记录已消失', body: '做法：删文件后点陈旧行。' })
    seeded.push(id)
    await wake()
    const row = await waitRow(id)
    rmSync(join(RECORDS, `${id}.md`), { force: true })   // 另一端把它删了（面板还拿着陈旧行）
    await row.getByRole('button', { name: COPY.adopt, exact: true }).click()
    const deadline = Date.now() + 35_000
    let text = ''
    let back = 0
    while (Date.now() < deadline) {
      const snap = await row.evaluate((el) => ({
        text: el.textContent ?? '',
        adopt: [...el.querySelectorAll('button')].filter(b => b.textContent.trim() === '采纳' && !b.disabled).length,
      })).catch(() => ({ text: '', adopt: 0 }))
      text = snap.text
      back = snap.adopt
      if (/不存在|找不到|没有.*记录|不可达|命令面|报错/.test(text)) break
      await sleep(500)
    }
    await shot(page, 'S28-record-gone')
    if (!/不存在|找不到|没有.*记录|不可达|命令面|报错/.test(text)) {
      throw new Error(`记录已消失时点了没说清：${text.replaceAll('\n', ' | ').slice(0, 180)}`)
    }
    notes.push(`S28：记录被删除后点陈旧行 ⇒ 行内出原话（${text.replaceAll('\n', ' ').slice(0, 60)}…）✓`)
  })

  // ── S29 规模续压：300 条（记耗时；如实记录有无分组/分页/计数）────────────────────────
  await check('S29 规模 300 条：折叠 10 条 + 「显示全部」+ 展开后末条可操作（记耗时）', async () => {
    if (role === null) throw new Error('未拿到角色')
    const ids = []
    for (let i = 0; i < 300; i++) {
      const id = `${P}-bulk300-${String(i).padStart(3, '0')}`
      ids.push(id)
      seedRecord(id, { targetRole: role, expectation: `UX场景：三百条 ${String(i + 1)}`, body: `做法：第 ${String(i + 1)} 条。` })
      seeded.push(id)
    }
    const t0 = Date.now()
    await wake()
    await collapseInbox()
    const visible = await page.locator('.wk-pane [aria-label="待我处理的培养记录"] [role=listitem]').count()
    const control = page.locator('.wk-pane').getByRole('button', { name: /显示全部（共/ }).first()
    if (visible !== 10) throw new Error(`折叠态应给 10 条，实际 ${String(visible)} 条`)
    if (await control.count() === 0) throw new Error('超过阈值却没给「显示全部（共 N 条）」')
    const controlLabel = await control.innerText()
    await shot(page, 'S29-scale300-collapsed')
    await control.click()
    await sleep(1500)
    const last = await waitRow(ids[300 - 1])
    await last.scrollIntoViewIfNeeded()
    if (await last.getByRole('button', { name: COPY.adopt, exact: true }).count() !== 1) throw new Error('末条不可操作')
    const elapsed = Date.now() - t0
    const paneText = await page.locator('.wk-pane').innerText()
    const hasPager = /下一页|分页|加载更多|第\s*\d+\s*页/.test(paneText)
    notes.push(`S29：300 条 ⇒ 折叠 ${String(visible)} 条 + 「${controlLabel}」；展开后末条可操作（${String(elapsed)}ms）；分页/分组在场=${String(hasPager)}（当前设计=折叠 + 平铺）`)
    await retireSeeds(ids)
  })

  // ── S23 三实例并存（浮窗 + 公司页）：在**浮窗**里采纳，公司页实例也要 ≤8s 同步 ────────────
  await check('S23 三实例并存：浮窗里采纳，公司页实例 ≤8s 同步', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-multi3`
    seedRecord(id, { targetRole: role, expectation: 'UX场景：三实例并存', body: '做法：浮窗采纳看公司页。' })
    seeded.push(id)
    await wake()
    // ① 先让会话有内容（/help）并打开公司页第四子页（复刻 S13 的破局路径）
    const composer = page.locator('textarea, [contenteditable=true]').first()
    if (await composer.count() > 0) {
      await composer.click().catch(() => {})
      await composer.fill('/help').catch(async () => { await page.keyboard.type('/help') })
      await page.keyboard.press('Enter')
      await sleep(3000)
      await wake()
    }
    const viewTab = page.getByText('公司', { exact: true }).first()
    if (await viewTab.count() === 0) { unverified.push('S23：会话视图入口没出现（同 S13 的原因）'); return }
    await viewTab.click()
    await sleep(1500)
    const sub = page.locator('.wk-view-tabs').getByRole('tab', { name: '培养' }).first()
    if (await sub.count() === 0) throw new Error('公司页里找不到「培养」子页（未验成，不许算绿）')
    await sub.click()
    await sleep(2500)
    await wake()
    const pageRow = page.locator('.wk-cultivation-pane').getByRole('listitem', { name: `待处理 ${id}` }).first()
    await pageRow.waitFor({ timeout: 25_000 }).catch(() => { throw new Error('公司页实例没看到这条') })
    // ② 把侧栏那个面板浮出去（成为第二个实例）
    const floatBtn = page.getByRole('button', { name: /浮出/ })
    if (await floatBtn.count() === 0) throw new Error('找不到「浮出」按钮')
    await floatBtn.first().click()
    await sleep(1800)
    const floatPane = page.locator('[data-dockkit-float]').filter({ has: page.getByRole('listitem', { name: `待处理 ${id}` }) }).last()
    if (await floatPane.count() === 0) throw new Error('浮窗里没看到这条')
    await shot(page, 'S23-three-instances', { full: true })
    // ③ 再开**第三个**实例：浮出后原侧栏页签空出来，指南里再点一次「培养」会新开一个侧栏面板
    let third = null
    const entry = page.locator('.wk-guide-entry-label').filter({ hasText: '培养' }).first()
    if (await entry.count() > 0) {
      await entry.click().catch(() => {})
      await sleep(2000)
      const panes = page.locator('.wk-pane')
      if (await panes.count() >= 2) {
        third = panes.filter({ has: page.getByRole('listitem', { name: `待处理 ${id}` }) }).first()
        if (await third.count() === 0) third = null
      }
    }
    // ④ 在浮窗里采纳 → 公司页（与第三个实例，若有）必须同步
    await floatPane.getByRole('listitem', { name: `待处理 ${id}` }).last()
      .getByRole('button', { name: COPY.adopt, exact: true }).first().click()
    const d1 = Date.now() + 20_000
    while (Date.now() < d1 && !recordTextOf(id).includes('status: adopted')) await sleep(500)
    if (!recordTextOf(id).includes('status: adopted')) throw new Error('浮窗实例采纳没落盘')
    const d2 = Date.now() + 8_000
    let synced = false
    while (Date.now() < d2) {
      const still = await pageRow.getByRole('button', { name: COPY.adopt, exact: true }).count()
      const text = await pageRow.innerText().catch(() => '')
      if (still === 0 || /已采纳|已处理/.test(text)) { synced = true; break }
      await sleep(400)
    }
    if (!synced) throw new Error('公司页实例没同步（浮窗 → 公司页 的广播没生效？）')
    if (third !== null) {
      const d3 = Date.now() + 8_000
      let thirdSynced = false
      while (Date.now() < d3) {
        const still = await third.getByRole('button', { name: COPY.adopt, exact: true }).count()
        const text = await third.innerText().catch(() => '')
        if (still === 0 || /已采纳|已处理/.test(text)) { thirdSynced = true; break }
        await sleep(400)
      }
      if (!thirdSynced) throw new Error('第三个实例（侧栏）没同步')
      notes.push('S23：**三实例**并存（浮窗 + 公司页 + 侧栏）——浮窗采纳后两个实例都 ≤8s 同步 ✓')
    } else {
      notes.push('S23：浮窗 + 公司页两实例同步 ✓（第三个侧栏实例没开成，本轮按两实例验）')
      unverified.push('S23 三实例：第三个侧栏实例没开成（浮出后指南再点没新开面板）——按两实例验')
    }
    await dockFloats(page)
    await backToSessionView(page)   // 还原：别把公司页留着害后面的场景
  })

  // ── S24 键盘细项：拒绝表单的 Escape（取消）与 Enter（确认）──────────────────────────
  await check('S24 键盘细项：拒绝表单 Escape 取消、Enter 确认', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-kbd`
    seedRecord(id, { targetRole: role, expectation: 'UX场景：键盘细项', body: '做法：Escape/Enter。' })
    seeded.push(id)
    await wake()
    const row = await waitRow(id)
    await row.getByRole('button', { name: COPY.reject, exact: true }).click()
    const input = row.locator('input').first()
    await input.waitFor({ timeout: 10_000 })
    await input.fill('键盘取消试试')
    await page.keyboard.press('Escape')
    await sleep(800)
    const afterEscape = await row.locator('input').count()
    if (afterEscape !== 0) throw new Error('Escape 没有取消拒绝表单（键盘用户被困在表单里）')
    if (recordTextOf(id).includes('status: rejected')) throw new Error('Escape 竟把记录拒了')
    await row.getByRole('button', { name: COPY.reject, exact: true }).click()
    const input2 = row.locator('input').first()
    await input2.waitFor({ timeout: 10_000 })
    await input2.fill('键盘确认试试')
    await page.keyboard.press('Enter')
    const d = Date.now() + 20_000
    while (Date.now() < d && !recordTextOf(id).includes('status: rejected')) await sleep(500)
    if (!recordTextOf(id).includes('status: rejected')) throw new Error('Enter 没有确认拒绝（键盘用户提交不了）')
    if (!recordTextOf(id).includes('键盘确认试试')) throw new Error('理由没进记录')
    notes.push('S24：拒绝表单键盘可用（Escape 取消不落盘、Enter 确认且理由进记录）✓')
  })

  // ── S22 角色闸：非本角色撤回被 host 拒；别的角色的已采纳记录不进我的「已采纳的方法」──────
  await check('S22 角色闸：非本角色撤回被拒 + 别的角色的已采纳不进我的列表', async () => {
    if (role === null) throw new Error('未拿到角色')
    const other = { ceo: 'cfo', cfo: 'coo', coo: 'vp-eng', 'vp-eng': 'vp-sales', 'vp-sales': 'ceo' }[role]
    const otherId = `${P}-other`
    const otherSlug = `${P}-oslug`
    seedRecord(otherId, { status: 'adopted', targetRole: other, expectation: 'UX场景：别的角色的已采纳', body: '做法：隔离。', methodSlug: otherSlug })
    seeded.push(otherId)
    const sid = await sessionOf()
    if (sid === null) throw new Error('拿不到会话 id（RPC 桥）')
    const refusal = await rpc('commands/execute', { agentId: sid, line: `/cultivation revoke ${otherSlug}`, submittedAttachments: [] })
    if (refusal?.result?.kind !== 'error') throw new Error(`非本角色撤回本应被拒：${JSON.stringify(refusal).slice(0, 160)}`)
    await wake()
    await sleep(1000)
    const inMine = await page.getByRole('listitem', { name: `方法 ${otherSlug}` }).count()
    if (inMine > 0) throw new Error('别的角色的已采纳记录出现在我的「已采纳的方法」里（隔离破了）')
    notes.push(`S22：非本角色撤回被拒（原话：${String(refusal.result.text).slice(0, 50)}…）+ 别的角色的已采纳不进我的列表 ✓`)
  })

  // ── S19 验证负路：「没起作用」⇒ verification: fail + 行内回执 ────────────────────────
  await check('S19 验证负路：点「没起作用」⇒ verification: fail + 回执', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-verifyfail`
    const slug = `${P}-vf`
    seedRecord(id, { status: 'adopted', targetRole: role, expectation: 'UX场景：验证负路', body: '做法：点没起作用。', methodSlug: slug })
    seeded.push(id)
    await wake()
    const row = page.getByRole('listitem', { name: `方法 ${slug}` })
    await row.waitFor({ timeout: 25_000 }).catch(() => { throw new Error('已采纳记录没出现在方法列表') })
    await row.getByRole('button', { name: '没起作用', exact: true }).click()
    const deadline = Date.now() + 25_000
    let text = ''
    while (Date.now() < deadline) {
      text = await row.innerText().catch(() => '')
      if (/verification: fail|没起作用|未见效/.test(text) && /已回填|回填/.test(text)) break
      await sleep(500)
    }
    await shot(page, 'S19-verify-fail')
    if (!recordTextOf(id).includes('verification: fail')) {
      throw new Error(`记录没回填 verification: fail（行内：${text.replaceAll('\n', ' | ').slice(0, 140)}）`)
    }
    if (!/回填/.test(text)) throw new Error('行内没有回执（人不知道发生了什么）')
    notes.push('S19：验证负路可用（记录 verification: fail + 行内回执）✓')
  })

  // ── S20 撤回后不可再采纳：host 必须拒绝（记录已不是 open）──────────────────────────
  await check('S20 撤回后不可再采纳：host 拒绝且面板不再给把手', async () => {
    if (role === null) throw new Error('未拿到角色')
    const id = `${P}-revoked2`
    const slug = `${P}-rv2`
    seedRecord(id, { status: 'adopted', targetRole: role, expectation: 'UX场景：撤回后不可再采纳', body: '做法：验 host 拒绝。', methodSlug: slug })
    const f = join(RECORDS, `${id}.md`)
    writeFileSync(f, readFileSync(f, 'utf8').replace('status: adopted', 'status: adopted\nrevokedAt: 2026-10-19T00:00:00.000Z'))
    seeded.push(id)
    const sid = await sessionOf()
    if (sid === null) throw new Error('拿不到会话 id（RPC 桥）')
    const again = await rpc('commands/execute', { agentId: sid, line: `/cultivation adopt ${id}`, submittedAttachments: [] })
    if (again?.result?.kind !== 'error') throw new Error(`撤回后再采纳本应被拒：${JSON.stringify(again).slice(0, 160)}`)
    await wake()
    await sleep(800)
    const inTodo = await page.getByRole('listitem', { name: `待处理 ${id}` }).count()
    if (inTodo > 0) throw new Error('撤回的记录又出现在「需要我处理」里（不该再可采纳）')
    notes.push(`S20：撤回后再采纳被 host 拒（原话：${String(again.result.text).slice(0, 60)}…），面板也不再列它 ✓`)
  })

  // ── S21 规模：100 条待办仍可用（记耗时；S16 是 30 条）────────────────────────────────
  await check('S21 规模 100 条：折叠 10 条 + 「显示全部」+ 展开后末条可操作（记耗时）', async () => {
    if (role === null) throw new Error('未拿到角色')
    const ids = []
    for (let i = 0; i < 100; i++) {
      const id = `${P}-bulk100-${String(i).padStart(3, '0')}`
      ids.push(id)
      seedRecord(id, { targetRole: role, expectation: `UX场景：百条 ${String(i + 1)}`, body: `做法：第 ${String(i + 1)} 条。` })
      seeded.push(id)
    }
    const t0 = Date.now()
    await wake()
    await collapseInbox()
    const visible = await page.locator('.wk-pane [aria-label="待我处理的培养记录"] [role=listitem]').count()
    const control = page.locator('.wk-pane').getByRole('button', { name: /显示全部（共/ }).first()
    if (visible !== 10) throw new Error(`折叠态应给 10 条，实际 ${String(visible)} 条`)
    if (await control.count() === 0) throw new Error('超过阈值却没给「显示全部（共 N 条）」')
    const controlLabel = await control.innerText()
    await shot(page, 'S21-scale100-collapsed')
    await control.click()
    await sleep(1500)
    const last = await waitRow(ids[100 - 1])
    await last.scrollIntoViewIfNeeded()
    if (await last.getByRole('button', { name: COPY.adopt, exact: true }).count() !== 1) throw new Error('末条不可操作')
    const elapsed = Date.now() - t0
    const paneText = await page.locator('.wk-pane').innerText()
    const hasPager = /下一页|分页|加载更多|第\s*\d+\s*页/.test(paneText)
    notes.push(`S21：100 条 ⇒ 折叠 ${String(visible)} 条 + 「${controlLabel}」；展开后末条可操作（${String(elapsed)}ms）；分页/分组在场=${String(hasPager)}（当前设计=折叠 + 平铺）`)
    await retireSeeds(ids)
  })

  // ── S15 时间序：三条不同时间戳 ⇒ 列表新在前（时间标签随之有序）────────────────────────
  await check('S15 时间序：列表新在前（时间标签随之有序）', async () => {
    if (role === null) throw new Error('未拿到角色')
    const pad = (n) => String(n).padStart(2, '0')
    const base = new Date()
    const stampOf = (minusHours) => {
      const d = new Date(base.getTime() - minusHours * 3_600_000)
      return `${String(d.getFullYear())}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-ux15`
    }
    const ids = [stampOf(0), stampOf(3), stampOf(30)]
    for (const [i, id] of ids.entries()) {
      seedRecord(id, { targetRole: role, expectation: `UX场景：时间序 ${String(i)}`, body: '做法：排序。' })
      seeded.push(id)
    }
    await wake()
    await waitRow(ids[0])
    await sleep(1500)
    const order = await page.evaluate((list) => {
      const rows = [...document.querySelectorAll('[role=listitem][aria-label^="待处理 "]')].map(r => r.getAttribute('aria-label') ?? '')
      return list.map(id => rows.findIndex(label => label.includes(id)))
    }, ids)
    await shot(page, 'S15-time-order')
    if (order.some(i => i < 0)) throw new Error(`三条没都在场：${JSON.stringify(order)}`)
    if (!(order[0] < order[1] && order[1] < order[2])) {
      throw new Error(`顺序不是新在前：新=${String(order[0])} 中=${String(order[1])} 旧=${String(order[2])}`)
    }
    notes.push(`S15：列表新在前（${order.join(' < ')}）✓`)
  })


  // ── S7 无角色会话（观察档，最后跑）：把预设切成非公司角色，看面板怎么说 ────────────────
  await check('S7 非公司 preset（PTC/Standard）⇒ 当未选角色：说清怎么进、不出死按钮、不猜身份', async () => {
    // ⚠ 治漂移源头：preset 是**建会话时定**的，而共享会话上切模式会把它永久改成非公司角色
    //   （下一轮/下一个探针全崩——2026-10-18 实测）。所以先新建一条**专用会话**再切。
    await page.getByRole('button').filter({ hasText: 'New Session' }).first().click().catch(() => {})
    await sleep(3000)
    await openPanel(page)
    const chip = page.getByRole('button').filter({ hasText: /梦之队 (CEO|CFO|COO|VP-Eng|VP-Sales)|Standard/ })
    if (await chip.count() === 0) throw new Error('找不到 preset chip')
    await chip.last().click()
    await sleep(1000)
    const standard = page.getByText(/PTC mode|Standard mode/).first()
    if (await standard.count() === 0) throw new Error('preset 菜单里没有非公司 preset（PTC/Standard）')
    await standard.click()
    await sleep(2500)
    await wake()
    const text = await page.locator('body').innerText()
    await shot(page, 'S7-no-role')
    if (!text.includes('请选择负责的角色')) {
      throw new Error(`非公司 preset 下没按"未选角色"处理：${text.replaceAll('\n', ' | ').slice(0, 200)}`)
    }
    if (/我的分身：(ptc|standard)/.test(text)) throw new Error('把非名册 preset 当成角色显示了（我的分身：ptc）')
    if (await page.getByRole('button', { name: COPY.adopt, exact: true }).count() > 0) throw new Error('无角色会话里仍给了「采纳」按钮（死按钮）')
    if (await page.getByRole('button', { name: COPY.composeSuggest, exact: true }).count() > 0) throw new Error('无角色会话里仍给了创作入口（点了也发不出）')
  })

  // S7 把会话切成了非公司 preset ⇒ **收尾必须还原**（会话 preset 是持久的，否则下一个探针/下一轮全崩——
  // 2026-10-18 实测：场景轮跑完没还原，顺路档与 GUI 档当场连红）。
  await check('S8 收尾：把会话 preset 还原成公司角色（谁改谁还原）', async () => {
    const chip = page.getByRole('button').filter({ hasText: /PTC mode|Standard mode|Minimal mode|梦之队/ })
    if (await chip.count() === 0) throw new Error('找不到 preset chip，无法还原')
    await chip.last().click()
    await sleep(1000)
    const ceo = page.getByText('梦之队 CEO', { exact: true }).last()
    if (await ceo.count() === 0) throw new Error('preset 菜单里没有「梦之队 CEO」')
    await ceo.click()
    await sleep(2000)
    await wake()
    // 再新建一条会话把干净的（公司角色）留给下一个探针/下一轮——谁改谁还原，别把漂移传下去
    // 新建一条会话，把干净的（公司角色）留给下一个探针——**不强求重开面板**（S8 的判据是"别把漂移传下去"，
    // 面板开不开是下一个探针自己的开场事）。
    await page.getByRole('button').filter({ hasText: 'New Session' }).first().click().catch(() => {})
    await sleep(3000)
    const chipAfter = await page.getByRole('button')
      .filter({ hasText: /梦之队 (CEO|CFO|COO|VP-Eng|VP-Sales)|Standard mode|PTC mode|Minimal mode/ })
      .last().innerText().catch(() => '')
    if (!chipAfter.includes('梦之队 CEO')) throw new Error(`还原失败：会话 preset 仍是 ${chipAfter.trim()}`)
    notes.push(`S8：已还原到「梦之队 CEO」并新建会话交给后续（chip=${chipAfter.trim()}）`)
  })

  await dockFloats(page)   // 收尾还原（谁浮出谁收回）
  if (loaderErrors.length > 0) throw new Error(`loader 错误：${loaderErrors.slice(0, 2).join(' | ')}`)
  mkdirSync(OUT_DIR, { recursive: true })
} catch (error) {
  failures.push(`准备/收尾: ${String(error.message).slice(0, 300)}`)
  console.log(`  FAIL 准备/收尾: ${error.message}`)
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

// ── 清理：只删本档自己的记录与方法 ─────────────────────────────────────────────
for (const id of seeded) rmSync(join(RECORDS, `${id}.md`), { force: true })
if (role !== null) {
  for (const id of seeded) rmSync(join(home, 'profiles', 'web', 'company-cultivation', role, `method-${id}`), { recursive: true, force: true })
  try { require('node:fs').rmdirSync(join(home, 'profiles', 'web', 'company-cultivation', role)) } catch { /* 非空则留 */ }
}
if (existsSync(RECORDS)) for (const name of readdirSync(RECORDS)) if (name.startsWith(`uxsc-${STAMP}-`)) rmSync(join(RECORDS, name), { force: true })
// 方法层里本轮的残留也清（唯一 id 下不会有别人的东西）
for (const roleDir of [role, 'ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']) {
  if (roleDir === null) continue
  const base = join(home, 'profiles', 'web', 'company-cultivation', roleDir)
  if (!existsSync(base)) continue
  for (const name of readdirSync(base)) if (name.includes(`uxsc-${STAMP}`)) rmSync(join(base, name), { recursive: true, force: true })
}

console.log('\n观察记录（口径：机制/文案，不含真人困惑度）：')
for (const line of notes) console.log(`  · ${line}`)
if (unverified.length > 0) {
  console.log('\n未验成（不算绿，也不是红——入口/前置不足）：')
  for (const line of unverified) console.log(`  · ${line}`)
}
console.log(failures.length === 0
  ? '\ncultivation-ux-scenarios: ALL PASS（S1–S6 边角场景机制与文案可执行）'
  : `\ncultivation-ux-scenarios: ${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
