#!/usr/bin/env node
// 状态：常驻
// 何时跑：改交付物预览/文件动作/open-in-app 入口后；真实浏览器，不进入 pnpm test。
// 前置：已启动公司观察窗 URL、会话标题与目标交付物；用法：
//   node 本脚本 '<token-url>' '<session-title>' '<file-suffix>' ['<deliverable-dir>'] [--tree]
//   不带 --tree = 走会话里 present 的那份交付物（RFC 原文路径）；
//   带 --tree   = 走右栏工作区文件树挑（可挑应用里还没打开过的文件 ⇒ 前后翻转判据干净）。
// 断言面（RFC 批 3）：交付物在侧栏预览；预览上的控件把**目标文件绝对路径**交给 Host，且 Host 判启动成功，
//   并且**目标应用真的把它打开了**——后者由应用自己的热退出状态文件判定（macOS 上 `screencapture` 与
//   System Events 都被 TCC 权限挡着：实测 `could not create image from display` / privilege violation，
//   所以走文件级判据）：点击后该绝对路径必须出现在应用的 session 状态里（点击前不在册则构成前后翻转）。
// ⚠ 「成功」的强度（vendor host/open-in-app/src/index.ts:295-306 读代码确认）：`/open-in-app/open`
//   只在启动器 outcome=launched（spawn 成功 **且熬过 launchWatchMs 早失败观察窗**）时才回
//   `200 {"ok":true}`；启动失败回 `502 launch-failed`、目录不存在回 `404 not-found`。
//   ⇒ 断言 body.ok 才是「操作系统层面真启动了那个应用并带上那个路径」，不是「请求被收下」。
//   预览控件走的是 Session Remote `session/openWorkspacePath`（不是那条 HTTP 路由），它的判词 =
//   返回 `{opened:true}`（vendor api/session-controller/src/index.ts:347-356：原生打开器接受该路径
//   才返回，失败抛 RemoteError）⇒ 也要断言 `"opened":true`，不能只看 RPC 2xx。
import assert from 'node:assert/strict'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { dismissNotices, openSession } from '../../tools/lib/probe-window.mjs'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'

const useTree = process.argv.includes('--tree')
const cli = process.argv.slice(2).filter(a => !a.startsWith('--'))
const [url, title, suffix, treeDir] = cli
assert(url && title && suffix, '需要观察窗 URL、会话标题、目标文件后缀')
assert(!useTree || treeDir !== undefined, '--tree 需要第 4 个参数：交付物目录名（如 2026-10-10-ai-sprint-2026）')
/** 期望 Host 打开的绝对路径：树模式按目录名拼；默认模式 = 会话里 present 的那份（v4）。 */
const deliverablesRoot = join(repositoryRoot, 'company-workspace', 'deliverables')
const openedPathOf = (name, dir) => dir === undefined
  ? join(deliverablesRoot, '2026-10-10-ai-transformation-2026-v4', name)
  : join(deliverablesRoot, dir, name)
const outDir = join(repositoryRoot, 'runtime', 'human-exits-evidence')
const browser = await launchChromium(await loadChromium(process.cwd()))
try {
  const page = await browser.newPage()
  const calls = []
  page.on('response', async response => {
    const target = response.url()
    if (/openWorkspacePath|present\.open|open-in-app\/open/.test(target)) {
      calls.push({
        status: response.status(),
        route: target.replace(new URL(url).origin, '').split('?')[0],
        request: response.request().postData() ?? '',
        body: (await response.text().catch(() => '')).slice(0, 200),
      })
    }
  })
  await page.goto(url)
  await page.waitForTimeout(2500)
  await dismissNotices(page, ms => page.waitForTimeout(ms))
  if (useTree) {
    // 走右栏工作区文件树挑交付物：可以挑一个应用里**还没打开过**的文件 ⇒ 前后翻转判据才干净。
    await openSession(page, title, ms => page.waitForTimeout(ms))
    await page.getByText('Workspace files', { exact: true }).first().click()
    await page.waitForTimeout(1_500)
    for (const segment of ['deliverables', treeDir]) {
      const entry = page.getByText(segment, { exact: true })
      await entry.last().waitFor({ state: 'visible', timeout: 15_000 })
      await entry.last().click()
      await page.waitForTimeout(1_200)
    }
    const file = page.getByText(suffix, { exact: true })
    await file.last().waitFor({ state: 'visible', timeout: 15_000 })
    await file.last().click()
    await page.waitForTimeout(1_500)
  } else {
    await openSession(page, title, ms => page.waitForTimeout(ms))
    await page.getByRole('button', { name: /Preview deliverables.*in sidebar/ }).first().click()
    await page.waitForTimeout(1500)
  }

  // 侧栏文档预览自己的 open-in-app 控件住在 sidebar.right.tab.document.actions；
  // 同名的 deliverables.file.actions 控件走 present.open（同一交付物的另一条打开路径）。
  const control = page.locator('[data-slot="sidebar.right.tab.document.actions"] [data-open-path-open]').first()
  assert(await control.count(), '预览上没有 open-in-app 文件控件')

  /**
   * 目标应用的热退出状态文件（Sublime Text：Local/Auto Save Session.sublime_session）。
   * 判据 = 点击后目标绝对路径出现在其中 ⇒ 该文件进了某个窗口的缓冲区列表。
   * 为什么走这条：macOS 上 `screencapture` 与 System Events 都被 TCC 挡着（实测
   * `could not create image from display` / privilege violation），文件级判据是这里唯一可达的机器证据。
   */
  const stateFile = join(homedir(), 'Library', 'Application Support', 'Sublime Text', 'Local', 'Auto Save Session.sublime_session')
  const readState = async () => { try { return await readFile(stateFile, 'utf8') } catch { return '' } }
  const stateMtime = async () => { try { return (await stat(stateFile)).mtimeMs } catch { return 0 } }
  const targetPath = openedPathOf(suffix, treeDir)
  const wasOpenBefore = (await readState()).includes(targetPath)
  const mtimeBefore = await stateMtime()

  calls.length = 0
  await control.click()
  await page.waitForTimeout(3_000)

  const ok = calls.filter(c => c.status >= 200 && c.status < 300)
  assert(ok.length, `点击 open-in-app 控件没有成功请求：${JSON.stringify(calls)}`)
  // Host 自己的成功判词（熬过观察窗才给），不是「HTTP 通了」。
  const accepted = ok.filter(c => /"ok"\s*:\s*true/.test(c.body ?? '') || /"opened"\s*:\s*true/.test(c.body ?? ''))
  assert(accepted.length, `Host 未回成功判词（ok:true / opened:true）——拿到的 body：${JSON.stringify(ok.map(c => c.body))}`)
  // 请求体里**真正的目标路径**（不是"正文里出现过文件名"）：必须绝对路径且指向目标交付物。
  const paths = ok.map(c => {
    try { return JSON.parse(c.request).payload.args.request.path } catch { return undefined }
  }).filter(p => typeof p === 'string')
  const carried = paths.find(p => p.startsWith('/') && p.endsWith(suffix))
  assert(carried, `成功请求未携带目标文件的绝对路径（${suffix}）：请求里拿到 ${JSON.stringify(paths)}`)
  assert.equal(carried, targetPath, `Host 打开的路径与预期目标不一致：${String(carried)} vs ${targetPath}`)

  // 应用侧：状态文件里要出现该路径（点击前不在册则为干净翻转）。
  let openedInApp = wasOpenBefore
  for (let waited = 0; !openedInApp && waited < 90_000; waited += 3_000) {
    await page.waitForTimeout(3_000)
    openedInApp = (await readState()).includes(targetPath)
  }
  // 应用侧判据分两档，避免过度声称：
  //   ① 点击前**不在册** ⇒ 干净翻转：必须出现（强断言）——要这条就用 `--tree` 挑一个没打开过的文件；
  //   ② 点击前**已在册** ⇒ 本次点击的效果与既有状态无法区分，只如实标 `cleanFlip:false`，
  //      不拿它当"本次打开"的证据（Host 判词仍然在）。
  if (wasOpenBefore) {
    assert(openedInApp, `目标应用状态里原本有、点击后反而没了：${targetPath}`)
    console.log(`  ⚠ 该文件点击前就已在目标应用里打开（状态文件 mtime ${String(mtimeBefore)}）——本次点击的应用侧效果无法与既有状态区分；要干净翻转请用 --tree 挑一个没打开过的交付物`)
  } else {
    assert(openedInApp, `目标应用的状态文件里没有出现 ${targetPath} ⇒ 不能声称它真打开了文件`)
    assert((await stateMtime()) > mtimeBefore, '应用状态文件没有更新 ⇒ 无法证明是这次点击写进去的')
  }

  assert.equal(await page.locator('[role=alert]').count(), 0, 'open-in-app 出现错误提示')
  const verdict = {
    previewed: suffix,
    openedPath: carried,
    cleanFlip: !wasOpenBefore,
    appStateBefore: wasOpenBefore ? 'already open (effect not attributable to this click)' : 'not open (clean flip)',
    openedInApp: 'target app session state records the path',
    stateFile,
    calls: ok.map(c => ({ status: c.status, route: c.route, hostVerdict: c.body })),
    alerts: 0,
    verdict: '交付物进侧栏预览 → Host 判启动成功 → 目标应用状态文件登记该路径：PASS',
  }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'open-in-app-verdict.json'), JSON.stringify(verdict, null, 2) + '\n')
  console.log(JSON.stringify(verdict, null, 2))
} finally { await browser.close() }
