#!/usr/bin/env node
// 状态：常驻
// 何时跑：company-root 原子写 / lease 接管 / 同文件并发写改动后；发布前手动
// 成本：~5s keyless（4 个子进程；直接加载 src，不需要 tarball）
// 前置：已 pnpm install（tsx 可用）；不需要 DEEPSEEK_API_KEY
//
// 证明边界：
// - 同文件并发写：两个真进程同时 `writeCompanyAtomic`，最终文件必须是**某一次完整内容**，
//   不能是半份/交错；temp 不残留；company-root 外零写入。
// - 残留 temp：上一次崩溃留下的 `.tmp` 不影响下一次写，也不会被读成数据。
// - 根 symlink：子进程拒绝写，外部目录零写入（进程级复核 keyless 矩阵）。
// - lease：stale 锁（PID 活但 mtime 过期）可接管并警告；新鲜锁拒绝且不删别人的锁。
// 不证明：真 DSH host 的 web 启动/会话层（那归 concurrent-home-smoke）；断电级 durability。

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const BASE = join(ROOT, 'runtime/company-root-process-smoke')
const PROBE = join(ROOT, 'checks/lanes/lib/company-root-probe.mjs')
const LEASE_PROBE = join(ROOT, 'checks/lanes/lib/lease-probe.mjs')
const failures = []
const active = new Set()

const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `（${detail}）` : ''}`)
  if (!ok) failures.push(label)
}

function run(script, args, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx/esm', script, ...args], {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    active.add(child)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    const timer = setTimeout(() => { child.kill('SIGKILL') }, timeoutMs)
    child.once('close', (code, signal) => {
      clearTimeout(timer)
      active.delete(child)
      resolve({ code, signal, stdout, stderr })
    })
  })
}

function walk(dir, base = '') {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = base === '' ? entry.name : `${base}/${entry.name}`
    const path = join(dir, entry.name)
    return entry.isDirectory() ? [`${rel}/`, ...walk(path, rel)] : [rel]
  }).sort()
}

try {
  rmSync(BASE, { recursive: true, force: true })
  const ws = join(BASE, 'ws')
  const outside = join(BASE, 'outside')
  mkdirSync(ws, { recursive: true })
  mkdirSync(outside, { recursive: true })

  const rel = '.dsh-company/kb/x.json'
  const contentA = `${'A'.repeat(200_000)}\n`
  const contentB = `${'B'.repeat(200_000)}\n`
  const target = join(ws, rel)

  console.log('① 同文件并发写：两个进程同一目标')
  const [writeA, writeB] = await Promise.all([
    run(PROBE, ['write', ws, rel, contentA, '0']),
    run(PROBE, ['write', ws, rel, contentB, '10']),
  ])
  check('两个 writer 都退出 0', writeA.code === 0 && writeB.code === 0,
    `a=${String(writeA.code)} b=${String(writeB.code)}`)
  const finalText = readFileSync(target, 'utf8')
  check('最终内容 = 某一次完整写入（非交错/半份）',
    finalText === contentA || finalText === contentB,
    `len=${String(finalText.length)}`)
  const leftovers = readdirSync(join(ws, '.dsh-company/kb')).filter(name => name.includes('.tmp'))
  check('无 temp 残留', leftovers.length === 0, leftovers.join(','))
  check('company-root 外零写入', walk(outside).length === 0, walk(outside).join(','))

  console.log('② 残留 temp 不影响下一次写入')
  const staleTemp = join(ws, '.dsh-company/kb', 'x.json.999.dead.tmp')
  writeFileSync(staleTemp, 'stale\n')
  const contentC = `${'C'.repeat(1024)}\n`
  const writeC = await run(PROBE, ['write', ws, rel, contentC, '0'])
  check('带残留 temp 仍能写', writeC.code === 0, writeC.stderr.split('\n')[0])
  check('读到的是新内容，不是 temp', readFileSync(target, 'utf8') === contentC)
  check('残留 temp 不被当成数据删除/覆盖', readFileSync(staleTemp, 'utf8') === 'stale\n')

  console.log('③ 根 symlink：子进程拒绝，外部零写入')
  const wsLink = join(BASE, 'ws-link')
  const outsideLink = join(BASE, 'outside-link')
  mkdirSync(wsLink, { recursive: true })
  mkdirSync(outsideLink, { recursive: true })
  symlinkSync(outsideLink, join(wsLink, '.dsh-company'))
  const linked = await run(PROBE, ['write', wsLink, rel, 'x\n', '0'])
  check('根 symlink 写进程非 0 退出', linked.code !== 0, `code=${String(linked.code)}`)
  check('报 typed/unsafe，而非静默', /UnsafeCompanyPathError|symlink|不安全/.test(`${linked.stderr}${linked.stdout}`))
  check('symlink 目标零写入', walk(outsideLink).length === 0, walk(outsideLink).join(','))

  console.log('④ 进程重启后读回')
  const readBack = await run(PROBE, ['read', ws, rel])
  check('新进程读回完整内容', readBack.stdout === contentC, `len=${String(readBack.stdout.length)}`)

  console.log('⑤ lease：stale（PID 活、mtime 过期）可接管')
  const home = join(BASE, 'home')
  mkdirSync(home, { recursive: true })
  const lock = join(home, 'company-pack.lock')
  writeFileSync(lock, `${JSON.stringify({ schema: 1, pid: process.pid, token: 'stale-token', startedAt: '2020-01-01T00:00:00.000Z' })}\n`)
  utimesSync(lock, new Date(0), new Date(0))
  const stale = await run(LEASE_PROBE, [home])
  const staleJson = JSON.parse(stale.stdout.trim() || '{}')
  check('接管 stale 锁', staleJson.acquired === true, stale.stderr.split('\n')[0])
  check('接管有 warning', typeof staleJson.warning === 'string' && staleJson.warning.includes('接管'))
  check('接管后释放锁', !existsSync(lock))

  console.log('⑥ lease：新鲜锁拒绝且不删别人的锁')
  writeFileSync(lock, `${JSON.stringify({ schema: 1, pid: process.pid, token: 'live-token', startedAt: new Date().toISOString() })}\n`)
  const live = await run(LEASE_PROBE, [home])
  const liveJson = JSON.parse(live.stdout.trim() || '{}')
  check('新鲜锁拒绝', liveJson.acquired === false && String(liveJson.reason).includes('另一个 writer'), liveJson.reason)
  check('不删别人的锁', existsSync(lock))
} catch (error) {
  check('smoke 自身未抛异常', false, error?.message ?? String(error))
} finally {
  for (const child of active) { try { child.kill('SIGKILL') } catch { /* gone */ } }
  rmSync(BASE, { recursive: true, force: true })
}

console.log(failures.length === 0 ? '\ncompany-root-process-smoke: ALL PASS' : `\ncompany-root-process-smoke: ${String(failures.length)} FAILURE(S)`)
process.exit(failures.length === 0 ? 0 : 1)
