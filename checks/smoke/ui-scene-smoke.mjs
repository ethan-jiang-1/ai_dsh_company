#!/usr/bin/env node
// 状态：常驻
// ui-scene 冒烟：**自起观察窗** → 真浏览器跑完整公司页签扫（含浏览器错误环）→ 成功/失败都留证。
// 何时跑：client 面改动后、呈现给用户前、或用户报「页面某个面板不对」要复现时。
//   成本 keyless（boot ~10–30s + cdp-probe ~15s）；前置 = dev home 已 onboarding + client/前端已构建。
//   `--keep` 保留实例（人工接着看）；`--ask` 透传给 cdp-probe（真模型一次调用，会建测试会话）。
//
// 为什么需要它（R3-04）：cdp-probe 只能在「你手动起好的实例 + 手抄 token URL」上跑；
//   replay-smoke --ui 的金样场景已随真实证据移出产品仓。结果是 agent 想「看一眼真页面」必须
//   先起服务、读横幅、拼 URL——一步漏了就是瞎猜。本脚本把**起实例 + 断言 + 证据**收成一条命令；
//   断言本体复用 cdp-probe（页签清单从注册源解析、错误环、失败截图），不另写第二套。
//
// 退出码：0 = 页面断言全绿；1 = 有断言失败（cdp-probe verdict）；2 = 环境未就绪（未登录/home/构建）。
// 证据：failure → runtime/harness-home/diagnosis/cdp-probe-<ts>/；success 带 --evidence 同样落盘。
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { diagnosisDir } from '../../tools/lib/diagnosis.mjs'

const args = process.argv.slice(2)
const KEEP = args.includes('--keep')
const askIndex = args.indexOf('--ask')
const ASK = askIndex === -1 ? undefined : (args[askIndex + 1] ?? '用一句话自报角色与职责。')

let home
try {
  home = requireDevHome('ui-scene-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const web = await startWeb({ spawn, root: ROOT, home, port: 0 }).catch(error => {
  console.error(`ui-scene-smoke: 起观察窗失败（${String(error?.message ?? error)}）——先按 docs/guides/bootstrap.md 构建。`)
  process.exit(2)
})
const url = `${web.base}/?token=${web.token}`
console.log(`ui-scene-smoke: 实例 ${web.base}（home = ${home}）`)

/** 跑 cdp-probe 子进程，逐行转发输出，返回 {code, output}。 */
function runProbe() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      join(ROOT, 'probes/browser-visual/cdp-probe.mjs'), url, '--evidence',
      ...(ASK === undefined ? [] : ['--ask', ASK]),
    ], { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const onData = (chunk) => {
      const text = String(chunk)
      output = `${output}${text}`.slice(-24_000)
      process.stderr.write(text)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', code => { resolve({ code: code ?? 1, output }) })
    child.once('error', error => { resolve({ code: 1, output: String(error) }) })
  })
}

function stopWeb() {
  if (KEEP) return
  try { web.child.kill('SIGTERM') } catch { /* 已退出 */ }
}

let code = 1
let output = ''
try {
  const result = await runProbe()
  code = result.code
  output = result.output
} finally {
  stopWeb()
}

// 把本次场景回执落在诊断区（与 cdp-probe 的证据目录相邻），供后续 agent 发现。
const dir = diagnosisDir(ROOT, 'ui-scene-smoke')
writeFileSync(join(dir, 'scene.json'), JSON.stringify({
  scene: 'company-shell',
  url: web.base,
  probeExit: code,
  at: new Date().toISOString(),
  evidence: /证据目录 = (.+)/.exec(output)?.[1]?.trim() ?? null,
}, null, 2), 'utf8')
console.log(`ui-scene-smoke: 场景回执 = ${dir}`)

if (code === 2) {
  console.error('ui-scene-smoke: 环境未就绪（cdp-probe exit 2——未登录/未配凭据/构建缺失），不是页面断言失败。')
  process.exit(2)
}
if (code !== 0) {
  const evidence = /证据目录 = (.+)/.exec(output)?.[1]?.trim()
  console.error(`ui-scene-smoke: FAIL（真实页面断言失败${evidence === undefined ? '' : `；证据 = ${evidence}`}）`)
  process.exit(1)
}
console.log('ui-scene-smoke: ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）')
if (KEEP && !existsSync(join(ROOT, 'runtime'))) process.exit(0)
