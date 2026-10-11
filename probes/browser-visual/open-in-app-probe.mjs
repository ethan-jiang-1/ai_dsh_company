#!/usr/bin/env node
// 状态：常驻
// 何时跑：改交付物预览/文件动作/open-in-app 入口后；真实浏览器，不进入 pnpm test。
// 前置：已启动公司观察窗 URL、会话标题与目标交付物路径；用法：node 本脚本 '<token-url>' '<session-title>' '<file-suffix>'。
// 断言面（RFC 批 3）：交付物在侧栏预览；预览上的控件把**目标文件绝对路径**交给 Host，且 Host 判启动成功。
// ⚠ 「成功」的强度（vendor host/open-in-app/src/index.ts:295-306 读代码确认）：`/open-in-app/open`
//   只在启动器 outcome=launched（spawn 成功 **且熬过 launchWatchMs 早失败观察窗**）时才回
//   `200 {"ok":true}`；启动失败回 `502 launch-failed`、目录不存在回 `404 not-found`。
//   ⇒ 断言 body.ok 才是「操作系统层面真启动了那个应用并带上那个路径」，不是「请求被收下」。
//   预览控件走的是 Session Remote `session/openWorkspacePath`（不是那条 HTTP 路由），它的判词 =
//   返回 `{opened:true}`（vendor api/session-controller/src/index.ts:347-356：原生打开器接受该路径
//   才返回，失败抛 RemoteError）⇒ 也要断言 `"opened":true`，不能只看 RPC 2xx。
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { dismissNotices, openSession } from '../../tools/lib/probe-window.mjs'
import { loadChromium, launchChromium } from '../../tools/drivers/playwright.mjs'

const [url, title, suffix] = process.argv.slice(2)
assert(url && title && suffix, '需要观察窗 URL、会话标题、目标文件后缀')
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
  await openSession(page, title, ms => page.waitForTimeout(ms))
  await page.getByRole('button', { name: /Preview deliverables.*in sidebar/ }).first().click()
  await page.waitForTimeout(1500)
  // 侧栏文档预览自己的 open-in-app 控件住在 sidebar.right.tab.document.actions；
  // 同名的 deliverables.file.actions 控件走 present.open（同一交付物的另一条打开路径）。
  const control = page.locator('[data-slot="sidebar.right.tab.document.actions"] [data-open-path-open]').first()
  assert(await control.count(), '预览上没有 open-in-app 文件控件')
  calls.length = 0
  await control.click()
  await page.waitForTimeout(3000)
  const ok = calls.filter(c => c.status >= 200 && c.status < 300)
  assert(ok.length, `点击 open-in-app 控件没有成功请求：${JSON.stringify(calls)}`)
  // Host 自己的成功判词（熬过观察窗才给），不是「HTTP 通了」。
  const accepted = ok.filter(c => /"ok"\s*:\s*true/.test(c.body ?? '') || /"opened"\s*:\s*true/.test(c.body ?? ''))
  assert(accepted.length, `Host 未回成功判词（ok:true / opened:true）——拿到的 body：${JSON.stringify(ok.map(c => c.body))}`)
  // 取请求体里**真正的目标路径**（不是"正文里出现过文件名"）：必须是绝对路径且指向目标交付物。
  const paths = ok.map(c => {
    try { return JSON.parse(c.request).payload.args.request.path } catch { return undefined }
  }).filter(p => typeof p === 'string')
  const carried = paths.find(p => p.startsWith('/') && p.endsWith(suffix))
  assert(carried, `成功请求未携带目标文件的绝对路径（${suffix}）：请求里拿到 ${JSON.stringify(paths)}`)
  assert.equal(await page.locator('[role=alert]').count(), 0, 'open-in-app 出现错误提示')
  const verdict = {
    previewed: suffix,
    openedPath: carried,
    calls: ok.map(c => ({ status: c.status, route: c.route, hostVerdict: c.body })),
    alerts: 0,
    verdict: '目标文件进入侧栏预览、open-in-app 请求携带其绝对路径且成功：PASS',
  }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'open-in-app-verdict.json'), JSON.stringify(verdict, null, 2) + '\n')
  console.log(JSON.stringify(verdict, null, 2))
} finally { await browser.close() }
