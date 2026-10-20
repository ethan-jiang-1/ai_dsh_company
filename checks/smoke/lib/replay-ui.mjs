// replay-smoke 的浏览器档（--ui / --refresh-ui）实现模块（2026-10-14 重构轮自主文件 589-830 段拆出：
// 该段只在 UI 旗标下运行，与默认重放档分文件后主文件 ≈590 行、vendored 转写被隔离在专属文件）。
// 由 checks/smoke/replay-smoke.mjs 独家 import；不单独运行（不是 smoke 入口）。
//
// ── 浏览器档（P1.3）：vendor apps/web/tests/{scaffold,support}.ts 管线的逐行转写 ──
// 出处：normalizeAria/captureStableAria = scaffold.ts:1385-1480；expandTurnProcesses =
// support.ts:41-53；工作区连接 = support.ts connectFreshWorkspace；搜索开会话 =
// navigation-panes.e2e.ts ensureSeedOpen。不能 import 原件（scaffold 顶部 import vitest）。
//
// env 合同（主文件注入，浏览器档不自带）：{ check, firstDiff, scenario, refreshUi, goldenUi, root }——
// check/firstDiff = 主文件的判分与差异诊断闭包；scenario/refreshUi/goldenUi/root = 旗标与路径事实。
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { sleep } from '../../../tools/lib/probe-kit.mjs'
import { launchChromium, loadChromium } from '../../../tools/drivers/playwright.mjs'
import { diagnosisDir } from '../../../tools/lib/diagnosis.mjs'

const ARIA_AGE =
  /(?:now|\d+min|\d+h|\d+d|\d+mo|\d+y|刚刚|\d+分钟|\d+小时|\d+天|\d+个月|\d+年)(?=")/g

function normalizeAria(snapshot, workspaceCwd, age) {
  // 会话抬头渲染的是工作区 basename 而非全路径，两种拼写都要坍缩进 token。
  const base = workspaceCwd.split('/').pop()
  return (age ? snapshot.replace(ARIA_AGE, '{{age}}') : snapshot)
    .split(workspaceCwd).join('{{cwd}}')
    .split(base).join('{{workspace}}')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{{uuid}}')
    // `\d+m ?\d+s` 的可选空格覆盖 stats 行的紧凑写法与 message-chrome 模板的带空格写法。
    .replace(
      /~\d+(?:y(?: \d+mo)?|mo(?: \d+d)?)|\b(?:\d+d(?: \d+h(?: \d+m \d+s)?)?|\d+h \d+m \d+s|\d+m ?\d+s|\d+(?:\.\d+)?s|\d+(?:\.\d+)?ms)\b/g,
      duration => duration.startsWith('~') ? duration : '{{duration}}',
    )
    .replace(/\b\d[\d,]*(?:\.\d+)? ms\b/g, '{{duration}}')
    .replace(
      /约\d+(?:年(?:\d+个月)?|个月(?:\d+天)?)|\d+(?:天(?:\d+小时(?:\d+分\d+秒)?)?|小时\d+分\d+秒|分\d+秒|(?:\.\d+)?秒)/g,
      duration => duration.startsWith('约') ? duration : '{{duration}}',
    )
    .replace(/\d+(?:\.\d+)?(?= tok\/s(?!\w))/g, '{{throughput}}')
    .replace(/(Compacted \d+ history items \(~)\d+( tokens\))/g, '$1{{tokens}}$2')
    // 会话摘要与消息操作的时钟会跨日历边界；所有形态都坍缩保证金样跨边界稳定。
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '{{timestamp}}')
    .replace(/\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}/g, '{{clock}}')
    .replace(/\d{1,2}月\d{1,2}日 \d{2}:\d{2}/g, '{{clock}}')
    .replace(/(?<!\d)\d{1,2}:\d{2}:\d{2}(?:\.\d+)?(?:\s*[AP]M)?(?!\d)/gi, '{{clock}}')
    .replace(/(?<!\d)\d{2}:\d{2}(?!\d)/g, '{{clock}}')
}

/** 轮询到两次连续归一化捕获相等（单发捕获会与最后一次 React commit 竞态）。 */
async function captureStableAria(page, selector, workspaceCwd) {
  const region = page.locator(selector).first()
  const normalize = (snapshot) => normalizeAria(snapshot, workspaceCwd, false)
  let previous = normalize(await region.ariaSnapshot())
  const deadline = Date.now() + 5000
  for (;;) {
    const current = normalize(await region.ariaSnapshot())
    if (current === previous) return current
    previous = current
    if (Date.now() > deadline) throw new Error(`aria snapshot 未稳定（${selector}）`)
    await sleep(400)
  }
}

/** 展开所有轮次过程组（工具卡默认折叠在 "N tool call" 组里，不展开不进 aria 树）。 */
async function expandTurnProcesses(page) {
  const controls = page.locator('[data-turn-process]')
  await controls.first().waitFor({ state: 'visible', timeout: 10_000 })
  // rc.2：过程计数来自会话读模型——**没有过程的轮次**其 toggle 带 `disabled`（点不动）。
  // 只点启用的；并给读模型一点时间把有过程的轮次变 enabled（重放会话首帧可能还没折完）。
  const enabled = page.locator('[data-turn-process]:not([disabled])')
  await enabled.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  const count = await enabled.count()
  for (let index = 0; index < count; index++) {
    const control = enabled.nth(index)
    if (await control.getAttribute('aria-expanded') !== 'true') await control.click()
  }
  // rc.2 新增一层：工具调用收进**步骤过程分组**（文案 `message.stepProcess.done.tools` = "Called tools"，
  // 旧 pin 无此层）——委派卡就在这个折叠组里，必须再点开它，否则卡在 DOM 里但 hidden。
  const calledTools = page.getByRole('button', { name: 'Called tools', exact: true })
  const groups = await calledTools.count()
  for (let index = 0; index < groups; index++) {
    const group = calledTools.nth(index)
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  }
}

/** 把 URL 的 token 查询串脱敏，避免诊断日志二次扩散。 */
function safeUrl(value) {
  try {
    const parsed = new URL(value)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return '(url)'
  }
}

/** 委派卡端到端（P1.3 主判据）：金样 + 双轨断言。 */
export async function uiPhase(env, { url, workspace }) {
  const chromiumApi = await loadChromium(env.root)
  const browser = await launchChromium(chromiumApi)
  try {
    // vendor newEnglishPage：英文锚点（可访问名/占位符都是英文文案）+ 固定视口时区。
    const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: 'en-US', timezoneId: 'Asia/Shanghai' })
    // console/pageerror/导航 全量留档（诊断 ui 断言失败的浏览器侧根因；正常跑不读它）。
    const consoleLog = []
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push(`[${m.type()}] ${m.text()}`) })
    page.on('pageerror', (e) => { consoleLog.push(`[pageerror] ${String(e)}`) })
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) consoleLog.push(`[navigated] ${safeUrl(f.url())}`) })
    let failed = false
    const originalCheck = env.check
    env.check = (label, ok, detail) => {
      originalCheck(label, ok, detail)
      if (!ok) failed = true
    }
    try {
      await runUiFlow(env, page, { url, workspace })
    } catch (error) {
      failed = true
      throw error
    } finally {
      if (failed) {
        // 失败现场保留（vendor support.ts saveFailureShot 先例）：截图 + 全页 aria + console，
        // 落 runtime/harness-home/diagnosis/（跨进程可回溯；不再覆盖 /tmp 固定名）。
        const dir = diagnosisDir(env.root, `replay-ui-${env.scenario}`)
        await page.screenshot({ path: join(dir, 'page.png'), fullPage: false }).catch(() => {})
        writeFileSync(join(dir, 'body.aria'), await page.locator('body').ariaSnapshot().catch(() => ''), 'utf8')
        writeFileSync(join(dir, 'console.log'), consoleLog.join('\n'), 'utf8')
        console.log(`  （ui 诊断）失败现场 = ${dir}`)
      }
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

/** 浏览器导航与断言（与 uiPhase 分层：uiPhase 管浏览器生命周期与现场保留）。 */
async function runUiFlow(env, page, { url, workspace }) {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    // 模态通告（fresh home 首访必弹）：Internal Testing Notice，挡住整页指针事件。
    // ⚠ 必须**等它出现**再关——goto 返回时它往往还没挂载完，条件检查会扑空（实证一次）。
    const notice = page.getByRole('dialog', { name: 'Internal Testing Notice' })
    await notice.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (await notice.isVisible()) {
      await notice.getByRole('button', { name: 'Continue' }).click()
      await notice.waitFor({ state: 'detached', timeout: 10_000 })
    }
    // 0.2.0 新增首启通告：Preview Notice（vendor ui-settings-models locales welcomeTitle，
    // 按钮同为 Continue；welcome-notice.client.spec 同款）——fresh home 首访必弹，同款等出现再关。
    const preview = page.getByRole('dialog', { name: 'Preview Notice' })
    await preview.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (await preview.isVisible()) {
      await preview.getByRole('button', { name: 'Continue' }).click()
      await preview.waitFor({ state: 'detached', timeout: 10_000 })
    }
    // 兜底：还有别的可见模态框就点名失败——别让它静默拦截后续 click 查半天才懂
    const otherDialogs = page.getByRole('dialog')
    if (await otherDialogs.count() > 0) {
      const names = []
      for (let i = 0; i < await otherDialogs.count(); i++) {
        if (await otherDialogs.nth(i).isVisible()) names.push((await otherDialogs.nth(i).innerText().catch(() => '')).split('\n')[0])
      }
      if (names.length > 0) throw new Error(`存在未处理的模态框：${names.join(' / ')}`)
    }
    // onboarding 覆盖层（vendor navigation-panes ensureSeedOpen 同款守卫；另一类首访浮层）
    const welcome = page.locator('[class*="onboardingOverlay"]')
    if (await welcome.count() > 0 && await welcome.isVisible()) {
      await welcome.getByRole('button').click()
      await welcome.waitFor({ state: 'detached', timeout: 15_000 })
    }
    // 连接工作区：空态 EmptyHero 的选择器流程（vendor support.ts connectFreshWorkspace），
    // 但连接的是**已承载会话的临时工作区**本身（vendor 版连接的是它新建的 workspace/ 子目录）。
    await page.getByRole('textbox', { name: 'Choose workspace' }).click()
    const dialog = page.getByRole('dialog', { name: 'Select Workspace Directory' })
    await dialog.waitFor({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Edit path' }).click()
    const pathInput = dialog.getByRole('textbox', { name: 'Edit path' })
    await pathInput.fill(workspace)
    await pathInput.press('Enter')
    await dialog.getByRole('button', { name: 'Open', exact: true }).click()
    await page.locator('[data-composer-input][contenteditable="true"][data-placeholder="Describe what you want to build, / commands, @ files or sessions"]')
      .waitFor({ timeout: 15_000 })
    // 搜索打开 lead 会话（title 是 title-llm 禁用后的截断回退 ⇒ 确定性文本）
    const searchText = env.scenario === 'r2-motion' ? '动议（R2 正式场）' : '只回复两个字'
    const searchButton = page.getByRole('button', { name: 'Search sessions' })
    if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
    // rc.2：`search.placeholder` 文案由 'Search sessions...' 改为 'Search session names'
    // （aria 标签 `search.sessions.aria` 未变，仍是 'Search sessions'）——按新占位符定位。
    const search = page.getByPlaceholder('Search session names')
    await search.fill(searchText)
    const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: searchText })
    await result.first().waitFor({ timeout: 15_000 })
    await result.first().click()
    await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
    if (env.scenario === 'r2-motion') {
      await runCockpitFlow(env, page)
      return
    }
    // 委派卡：先 DOM 在场（折叠组里也 attached），再展开轮次组，等可见
    const card = page.locator('[data-tool="vp_eng"]')
    await card.first().waitFor({ state: 'attached', timeout: 30_000 })
    await expandTurnProcesses(page)
    await card.first().waitFor({ state: 'visible', timeout: 15_000 })
    // 委派卡基数断言（可访问名口径——readiness P1.3 教义：aria 树里没有 data-*）：
    // ⚠ 不能用 [data-tool="vp_eng"] 判在不在——**通用工具行也渲染同款属性**（红证实证：
    // 摘掉 company-client 行后 locator 版仍绿、可访问名版正确红）。settled ok 的卡
    // expandable ⇒ header 是 role=button，名字以 "委派 VP-Eng（研发）" 开头。
    const genericRow = page.locator('[data-tool="vp_eng"]')
    const cardButton = page.getByRole('button', { name: /^委派 VP-Eng（研发）/ })
    const cardCount = await cardButton.count()
    env.check('委派卡渲染 ×1（可访问名 "委派 VP-Eng（研发）…"）', cardCount === 1, `${String(cardCount)} 张（DOM 里 vp_eng 行 ${String(await genericRow.count())} 处，含通用行）`)
    // 金样：centerCol（会话中列，vendor present.e2e 同款区域）；展开轮次组后捕获。
    // 场景自有归一化：①用量按钮数字随工具面大小漂（批1→批3 三刷金样的教训）；②Think 按钮
    // 文本 = 模型 reasoning 摘要，每次重录必然变（批4→批5 两连红实证）——均掩码成占位，
    // 写金样与比对同管道（webUrl 替换同款先例）；按钮在场性仍被金样断言。
    const aria = (await captureStableAria(page, '[class*="centerCol"]', workspace))
      .replace(/Usage [\d.]+[KM]? tok/g, 'Usage {{tokens}} tok')
      .replace(/- button "Think (?:[^"\\]|\\.)*"/g, '- button "Think {{reasoning}}"')
    env.check('委派卡节点在 aria 树（可访问名 "委派 VP-Eng（研发）…"）', aria.includes('委派 VP-Eng（研发）'))
    if (env.refreshUi) {
      writeFileSync(env.goldenUi, `${aria}\n`, 'utf8')
      console.log(`  （--refresh-ui：金样已写入 ${basename(env.goldenUi)}）`)
    } else {
      if (!existsSync(env.goldenUi)) {
        env.check('ui 金样在场', false, `缺 ${env.goldenUi}（先 --refresh-ui 生成）`)
      } else {
        const expected = readFileSync(env.goldenUi, 'utf8')
        const actual = `${aria}\n`
        env.check('ui 金样零 diff（centerCol aria）', expected === actual, expected === actual ? '' : env.firstDiff(expected, actual))
      }
    }
}

/**
 * 在场页签端到端（r2-motion 场景；原 R5b 驾驶舱，条目 ② 起升级为平台页签「在场」）：
 * 右栏打开 → guide 胶囊进「在场」页签 → 在场板 5 行（D-a：lead + 4 分身；D-c：团队内状态列头）
 * → 点 VP-Eng 行 → 断言当前会话切进该成员的空间（D-d；行可点 = 提案验收 5）。
 * 锚点（en 页面 + 本包中文文案）：'Open right sidebar' / guide '在场' /
 * list '组织在场板' / text '团队内状态' / 行 aria-label '梦之队 <角色>，…' /
 * 成员会话标记 = lineage tree 'Subagent sessions' 或 read-only composer。
 */
async function runCockpitFlow(env, page) {
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.click()
  const capsule = page.getByRole('button', { name: /^在场/ }).first()
  await capsule.waitFor({ state: 'visible', timeout: 15_000 })
  await capsule.click()
  const board = page.getByRole('list', { name: '组织在场板' })
  await board.waitFor({ state: 'visible', timeout: 15_000 })
  const rows = board.getByRole('listitem')
  const rowCount = await rows.count()
  env.check('「在场」页签打开且在场板渲染（平台页签形态，提案验收 2）', rowCount === 5, `${String(rowCount)} 行`)
  for (const role of ['梦之队 CEO', '梦之队 VP-Sales', '梦之队 VP-Eng', '梦之队 COO', '梦之队 CFO']) {
    const hit = await rows.filter({ has: page.getByText(role, { exact: false }) }).count()
    env.check(`在场板行：${role}`, hit === 1, `${String(hit)} 行命中`)
  }
  const columnHeader = await page.getByText('团队内状态', { exact: true }).count()
  env.check('状态列头带「团队内」限定（D-c 文案）', columnHeader === 1, `${String(columnHeader)} 处`)
  // D-d：点 VP-Eng 行 → 该成员会话成为当前会话。实证锚点（2026-09-23）：child 视图的
  // 会话头出现 "Session hierarchy" 面包屑，含 "Switch subagent: <成员 label>"——
  // 直接断言目标成员身份（不只断言"切走了"）。只读 composer 仅 persisted-only child 才有。
  const engRow = rows.filter({ has: page.getByText('梦之队 VP-Eng', { exact: false }) }).first()
  console.log(`  （ui 诊断）点击前 URL = ${safeUrl(page.url())}`)
  await engRow.click()
  await sleep(1_500)
  console.log(`  （ui 诊断）点击后 URL = ${safeUrl(page.url())}`)
  const memberMarker = page.getByRole('navigation', { name: 'Session hierarchy' })
    .or(page.getByRole('button', { name: /Switch subagent: VP-Eng/ }))
    .or(page.getByText('This subagent is read-only for now'))
  try {
    await memberMarker.first().waitFor({ state: 'visible', timeout: 15_000 })
    const hierarchy = await page.getByRole('button', { name: /Switch subagent: VP-Eng/ }).count()
    env.check('点行进成员空间：VP-Eng 会话成为当前会话（D-d，提案验收 5）', hierarchy >= 1, `面包屑 "Switch subagent: VP-Eng…" ×${String(hierarchy)}`)
  } catch {
    const dir = diagnosisDir(env.root, 'replay-ui-after-click')
    writeFileSync(join(dir, 'after-click.aria'), await page.locator('body').ariaSnapshot().catch(() => ''), 'utf8')
    console.log(`  （ui 诊断）失败现场 URL = ${safeUrl(page.url())}；aria 已落 ${dir}`)
    env.check('点行进成员空间：VP-Eng 会话成为当前会话（D-d，提案验收 5）', false, '15s 内未出现成员会话面包屑（Session hierarchy / Switch subagent）')
  }
}
