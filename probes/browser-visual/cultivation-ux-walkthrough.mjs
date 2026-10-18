#!/usr/bin/env node
// 状态：常驻
// 培养面板 UX 走查（2026-10-17 培养卡「体验协议」T1–T6 的**自动化替身**）：真浏览器把六个任务走一遍，
// 逐任务量「几步、多久、关键文案在不在场」，出 JSON + 截图；`--protocol` 另印一页**给人跑**的协议卡。
//
// 何时跑：改培养面板的交互/文案（CultivationBoard / CultivationCompose / cultivation-actions）之后；
//   或要复核「判据 ①②③」（输入进得去 / 没有看不懂的条目 / 不熟悉的人能上手）时。
// 成本：keyless（boot ~20–60s + chromium，零模型调用）。前置：source run/env.sh + pack 与前端已构建。
// 用法：source run/env.sh && node probes/browser-visual/cultivation-ux-walkthrough.mjs [--protocol] [--shots]
//   --shots 每步截图到 runtime/human-exits-evidence/ux-shots/（我逐张读图做"第一次用"的观察；也给真人档留现场）
//
// ⚠ 边界（诚实口径）：本档证明的是**机制与文案可执行**——按钮在哪、点了发什么、关键说明在不在场、几步能完成。
//   **证明不了"新人会不会困惑"**：那要真人（协议卡 `--protocol` 就是给这一步用的）。别拿本档冒充体验结论。
//
// 判据（T1–T6；任一红即 exit 1）：
//   T1 找出「需要我处理」并说出其中一条在讲什么（期望行为 + 正文就地可见）
//   T2 采纳一条（点击 → 记录翻 adopted + 行移到「已采纳的方法」）
//   T3 说出"什么时候生效"（新会话带着它 + 运行中会话随目录刷新看到它——2026-10-19 按实测修正）
//   T4 拒绝一条并写理由（理由进记录、行给回执）
//   T5 回填验证（「这条有用」→ 记录 verification: pass）
//   T6 撤回（先看到后果说明**再**确认 → 方法目录被删 + 记录标 revokedAt）
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { dismissNotices } from '../../tools/lib/probe-window.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const PROTOCOL = process.argv.includes('--protocol')
/** 每步截图（我逐张读图做"第一次用"的观察；也给真人档留现场）。 */
const SHOTS = process.argv.includes('--shots')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const STAMP = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const WORKSPACE = join(ROOT, 'company-workspace')
const RECORDS = join(WORKSPACE, 'cultivation', 'records')
const OUT_DIR = join(ROOT, 'runtime', 'human-exits-evidence')
const SHOT_DIR = join(OUT_DIR, 'ux-shots')
const IDS = { reject: `uxwalk-${STAMP}-reject`, adopt: `uxwalk-${STAMP}-adopt`, verify: `uxwalk-${STAMP}-verify`, revoke: `uxwalk-${STAMP}-revoke` }
const SLUG = { verify: `uxwalk-${STAMP}-mv`, revoke: `uxwalk-${STAMP}-mr` }
const COPY = { adopt: '采纳', reject: '拒绝', rejectConfirm: '确认拒绝', verifyPass: '这条有用', revoke: '撤回…', revokeConfirm: '确认撤回', compose: '给你的角色留一条方法' }

let home
try {
  home = requireDevHome('cultivation-ux-walkthrough')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
ensureRehearsalWorkspace(ROOT)

/** 一页"给人跑"的协议卡（观察者用；打印 + 落 runtime/，不落仓库文档树）。 */
function protocolSheet() {
  return `# 培养面板 · 体验协议卡（给人跑）

观察者：____　体验者：____（建议 ≥1 位没用过培养面板的人）　日期：____
规则：只给任务，不教操作；卡住 60 秒才提示；观察者不插话。

| # | 任务（照读） | 记录：耗时 / 卡点 / 原话 | 完成? |
|---|---|---|---|
| T1 | 找出「要你处理」的，并说说其中一条在讲什么 | | ☐ |
| T2 | 把它采纳掉 | | ☐ |
| T3 | 它什么时候生效？（不许翻文档） | | ☐ |
| T4 | 拒绝另一条，并写下你的理由 | | ☐ |
| T5 | 刚才那个活儿用上了这条方法吗？回填一下 | | ☐ |
| T6 | 撤回一条方法——先说说会发生什么，再点 | | ☐ |

看完请回答（不提示）：
1. 你刚才点「采纳」改的是**这段对话**还是**以后的会话**？
2. 面板上有没有"看到了却不知道去哪操作"的东西？在哪一行？
3. 三个你希望它更清楚的措辞（原话记下）。

回执口径：把本表 + 原话交回维护者；据此排下一轮改动（先改文案/入口，机制一般不用动）。
`
}
if (PROTOCOL) {
  mkdirSync(OUT_DIR, { recursive: true })
  const path = join(OUT_DIR, 'cultivation-ux-protocol.md')
  writeFileSync(path, protocolSheet())
  console.log(protocolSheet())
  console.log(`（协议卡已落 ${path}）`)
  process.exit(0)
}

const results = []
/** 截一张（`--shots` 才动）：面板局部优先（小、聚焦），必要时全页。 */
async function shot(page, name, { full = false } = {}) {
  if (!SHOTS) return
  mkdirSync(SHOT_DIR, { recursive: true })
  const target = full ? page : (page.locator('.wk-pane').first())
  try {
    await target.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: false, timeout: 10_000 })
  } catch { /* 面板不在场（如空态前期）就跳过，不因截图失败判红 */ }
}
const failures = []
/** 记录一个任务的观察（步数/耗时/关键文案/结论）。 */
async function task(id, what, fn) {
  const started = Date.now()
  let steps = 0
  const step = () => { steps++ }
  try {
    await fn(step)
    const ms = Date.now() - started
    results.push({ id, what, ok: true, steps, ms })
    console.log(`  PASS ${id} ${what}（${String(steps)} 步 / ${String((ms / 1000).toFixed(1))}s）`)
  } catch (error) {
    const ms = Date.now() - started
    results.push({ id, what, ok: false, steps, ms, error: String(error.message).slice(0, 300) })
    failures.push(`${id}: ${error.message}`)
    console.log(`  FAIL ${id} ${what}: ${error.message}`)
  }
}
/** 种一条记录（手写 frontmatter，同 host 的 recordText 形状）。 */
function seedRecord(id, { status = 'open', targetRole, expectation, body, methodSlug, verification }) {
  mkdirSync(RECORDS, { recursive: true })
  writeFileSync(join(RECORDS, `${id}.md`), [
    '---', 'kind: correction', `targetRole: ${targetRole}`, `proposerRole: ${targetRole}`, 'proposerKind: agent',
    'source: （会话内提交）', `expectation: ${expectation}`, `status: ${status}`,
    ...(methodSlug === undefined ? [] : [`methodSlug: ${methodSlug}`]),
    ...(verification === undefined ? [] : [`verification: ${verification}`]),
    '---', '', body, '',
  ].join('\n'))
}
const recordTextOf = (id) => existsSync(join(RECORDS, `${id}.md`)) ? readFileSync(join(RECORDS, `${id}.md`), 'utf8') : ''

const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
const browser = await launchChromium(await loadChromium(ROOT))
let role = null
try {
  const page = await browser.newPage()
  const loaderErrors = []
  page.on('console', (m) => { if (m.type() === 'error' && m.text().includes('failed to apply loader entry')) loaderErrors.push(m.text()) })
  await page.goto(`http://127.0.0.1:${String(port)}/?token=${token}`, { waitUntil: 'load', timeout: 60_000 })
  await sleep(4500)
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
  // 开场自愈：会话 preset 是**持久**的（别的探针/人可能把它切成 PTC/Standard）⇒ 先归位到公司角色。
  await (async () => {
    const chip = page.getByRole('button').filter({ hasText: /梦之队 (CEO|CFO|COO|VP-Eng|VP-Sales)|Standard mode|PTC mode|Minimal mode/ })
    if (await chip.count() === 0) return
    if (/我的分身：CEO/.test(await page.locator('body').innerText())) return
    await chip.last().click()
    await sleep(1000)
    const ceo = page.getByText('梦之队 CEO', { exact: true }).last()
    if (await ceo.count() > 0) { await ceo.click(); await sleep(1800) }
  })()

  // 落公司盘 → 新建会话 → 开右栏点「培养」（带重试）：没会话时指南条目根本不渲染（实测连红两轮）
  for (let attempt = 0; attempt < 3; attempt++) {
    const chooser = page.getByRole('button').filter({ hasText: /Choose workspace|company-workspace|ai_dsh_company|harness-home|rehearsal-workspace/ })
    if (await chooser.count() > 0 && attempt === 0) {
      await chooser.last().click().catch(() => {})
      await sleep(1200)
      const drive = page.getByText('company-workspace', { exact: true }).last()
      if (await drive.count() > 0) { await drive.click().catch(() => {}); await sleep(2500) }
    }
    await page.getByRole('button').filter({ hasText: 'New Session' }).first().click().catch(() => {})
    await sleep(3000)
    const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
    if (await opener.count() > 0) { await opener.first().click().catch(() => {}); await sleep(900) }
    const entry = page.locator('.wk-guide-entry-label').filter({ hasText: '培养' }).first()
    if (await entry.count() > 0) {
      await entry.click().catch(() => {})
      await sleep(2200)
      if (await page.locator('.wk-pane').count() > 0) break
    }
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(800)
  }

  await shot(page, '00-first-view', { full: true })
  const short = /我的分身：([^\n|]+)/.exec(await page.locator('body').innerText())?.[1]?.trim() ?? null
  role = { CEO: 'ceo', 'VP-Eng': 'vp-eng', 'VP-Sales': 'vp-sales', COO: 'coo', CFO: 'cfo' }[short] ?? null
  if (role === null) throw new Error(`面板没报出会话角色（我的分身 = ${String(short)}）`)

  // 预置四条：T2 采纳 / T4 拒绝 / T5 验证 / T6 撤回（后者带方法目录，撤回才有的删）
  seedRecord(IDS.adopt, { targetRole: role, expectation: 'UX走查：收口前逐项列出未决项', body: '做法：先列未决清单，按 owner 分行。\n证据：probes/browser-visual/cultivation-ux-walkthrough.mjs。' })
  seedRecord(IDS.reject, { targetRole: role, expectation: 'UX走查：口径不符的建议', body: '做法：测试拒绝回执。' })
  seedRecord(IDS.verify, { status: 'adopted', targetRole: role, expectation: 'UX走查：验证某条已采纳方法', body: '做法：测试回填验证。', methodSlug: SLUG.verify })
  seedRecord(IDS.revoke, { status: 'adopted', targetRole: role, expectation: 'UX走查：撤掉一条方法', body: '做法：测试撤回。', methodSlug: SLUG.revoke })
  for (const slug of [SLUG.verify, SLUG.revoke]) {
    const dir = join(home, 'profiles', 'web', 'company-cultivation', role, slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${slug}\ndescription: UX 走查占位方法\n---\n\n占位。\n`)
  }

  await shot(page, '01-empty-and-compose')   // 还没种数据：空态 + 创作入口长什么样
  const rowOf = (id) => page.getByRole('listitem', { name: `待处理 ${id}` })
  const button = (scope, label) => scope.getByRole('button', { name: label, exact: true })

  await task('T1', '找出待办并看懂一条（期望行为 + 正文就地可见；回到窗口即刷新）', async (step) => {
    const row = rowOf(IDS.adopt)
    // 种子是"外部"写进来的（模拟队友刚提案）⇒ 打一次 focus，面板应**秒级**刷出来，而不是等 30s 轮询。
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')) })
    step()
    await row.waitFor({ timeout: 5_000 })
    step()
    const text = await row.innerText()
    if (!text.includes('收口前逐项列出未决项')) throw new Error('待办行没显示期望行为（一句话）')
    if (await row.locator('.wk-cultivation-body').count() !== 1) throw new Error('待办行没有就地显示正文（判断无材料）')
    step()
    await shot(page, '02-t1-todo')
  })

  await task('T2', '采纳一条（点一下 → 记录翻 adopted + 行移到已采纳）', async (step) => {
    const row = rowOf(IDS.adopt)
    await button(row, COPY.adopt).click()
    step()
    const deadline = Date.now() + 25_000
    while (Date.now() < deadline && !recordTextOf(IDS.adopt).includes('status: adopted')) await sleep(500)
    if (!recordTextOf(IDS.adopt).includes('status: adopted')) throw new Error('记录未翻 adopted')
    await page.getByRole('listitem', { name: `方法 method-${IDS.adopt}` }).waitFor({ timeout: 15_000 })
    step()
    await shot(page, '03-t2-adopted')
  })

  await task('T3', '能说出"什么时候生效"（边界文案在场，不用翻文档）', async (step) => {
    const text = await page.locator('body').innerText()
    step()
    // 2026-10-19 修正：原来断言"新开…才加载"，但实测**运行中会话也会随目录刷新看到**（方法层档 ⑧）
    // ⇒ 现在断言**两半**：新会话带着它开工 + 运行中会话随目录刷新看到它。
    if (!/新开的[^\n]*会话[^\n]*(带着它|加载)/.test(text)) throw new Error('面板没说清新会话会带着这条方法')
    if (!/已经在跑的会话[^\n]*(看到它|用上)/.test(text)) throw new Error('面板没说清"运行中会话会随目录刷新看到它"（这是实测行为）')
    step()
  })

  await task('T3b', '新鲜度文案说真话（培养数据 30s 轮询，不许写 5 秒）', async (step) => {
    const head = await page.locator('.wk-pane-head, .wk-tabstrip-meta').first().innerText()
    step()
    if (!head.includes('30 秒')) throw new Error(`页签头没写真实间隔（写成"5 秒"就是骗人）：${head.replaceAll('\n', ' ').slice(0, 120)}`)
    step()
  })

  await task('T4', '拒绝一条并写理由（理由进记录 + 回执可见）', async (step) => {
    const row = rowOf(IDS.reject)
    await button(row, COPY.reject).click()
    step()
    await shot(page, '04-t4-reject-form')
    await row.locator('input').fill('UX走查：口径不符')
    step()
    await button(row, COPY.rejectConfirm).click()
    step()
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline && !recordTextOf(IDS.reject).includes('status: rejected')) await sleep(500)
    const text = recordTextOf(IDS.reject)
    if (!text.includes('status: rejected')) throw new Error('记录未翻 rejected')
    if (!text.includes('UX走查：口径不符')) throw new Error('理由没进记录（回执丢证据）')
    step()
  })

  await task('T5', '回填验证（这条有用 → verification: pass）', async (step) => {
    const row = page.getByRole('listitem', { name: `方法 ${SLUG.verify}` })
    await button(row, COPY.verifyPass).click()
    step()
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline && !recordTextOf(IDS.verify).includes('verification: pass')) await sleep(500)
    if (!recordTextOf(IDS.verify).includes('verification: pass')) throw new Error('记录没回填 verification: pass')
    step()
  })

  await task('T6', '撤回（先讲后果再确认 → 方法目录被删 + 记录标 revokedAt）', async (step) => {
    const row = page.getByRole('listitem', { name: `方法 ${SLUG.revoke}` })
    await button(row, COPY.revoke).click()
    step()
    const panel = await page.locator('body').innerText()
    if (!panel.includes('不能再被采纳')) throw new Error('撤回前没讲后果（"不能再被采纳"缺席）')
    step()
    await shot(page, '05-t6-revoke-consequence')
    await button(row, COPY.revokeConfirm).click()
    step()
    const methodDir = join(home, 'profiles', 'web', 'company-cultivation', role, SLUG.revoke)
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline && existsSync(methodDir)) await sleep(500)
    if (existsSync(methodDir)) throw new Error('方法目录没被删（撤回没生效）')
    if (!recordTextOf(IDS.revoke).includes('revokedAt')) throw new Error('记录没标 revokedAt')
    step()
  })

  // 创作面（判据 ① 的另一半）：点开看一眼表单长什么样（不提交，只看可发现性）
  await page.getByRole('button', { name: COPY.compose, exact: true }).click()
  await sleep(600)
  await shot(page, '06-compose-form')
  await page.keyboard.press('Escape')

  if (loaderErrors.length > 0) throw new Error(`loader 错误：${loaderErrors.slice(0, 2).join(' | ')}`)
  mkdirSync(OUT_DIR, { recursive: true })
  await page.screenshot({ path: join(OUT_DIR, 'cultivation-ux-walkthrough.png'), fullPage: false })
} catch (error) {
  failures.push(`准备/收尾: ${String(error.message).slice(0, 300)}`)
  console.log(`  FAIL 准备/收尾: ${error.message}`)
} finally {
  await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

// 清理：只删本档自己的记录与方法
for (const id of Object.values(IDS)) rmSync(join(RECORDS, `${id}.md`), { force: true })
if (role !== null) {
  rmSync(join(home, 'profiles', 'web', 'company-cultivation', role, `method-${IDS.adopt}`), { recursive: true, force: true })
  for (const slug of Object.values(SLUG)) rmSync(join(home, 'profiles', 'web', 'company-cultivation', role, slug), { recursive: true, force: true })
  try { require('node:fs').rmdirSync(join(home, 'profiles', 'web', 'company-cultivation', role)) } catch { /* 非空则留 */ }
}
if (existsSync(RECORDS)) for (const name of readdirSync(RECORDS)) if (name.startsWith(`uxwalk-${STAMP}-`)) rmSync(join(RECORDS, name), { force: true })

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'cultivation-ux-walkthrough.json'), `${JSON.stringify({ role, results }, null, 2)}\n`)
console.log('\n任务表（步数 / 耗时）：')
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.id}  ${String(r.steps)} 步  ${String((r.ms / 1000).toFixed(1))}s  ${r.what}`)
console.log(failures.length === 0
  ? '\ncultivation-ux-walkthrough: ALL PASS（T1–T6 机制与文案可执行）⚠ 新人困惑度需真人（--protocol 出协议卡）'
  : `\ncultivation-ux-walkthrough: ${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
