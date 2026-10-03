#!/usr/bin/env node
// 跨进程文件并发探针（研究卡 E2，2026-09-30 立）：真 fs-local 服务、零模型、秒级。
// 何时跑：讨论"多进程/多 home 同盘写作并发"时取证（研究卡 _backlog/plans/2026-09-29-collab-mechanism-evidence.md E2）；
//   vendor 升 pin 后复跑一次（fs 语义变了要知道）。成本：零模型（不起会话），纯进程编排，秒级。
//
// 三段判据：
//   T1 进程内基线（对齐官方测试 filesystem.spec.ts:641-653）：同实例两路并发守卫写 ⇒ 一胜一 FS_STALE_VERSION。
//       （复现不了 ⇒ 本探针环境有问题，后面两段不作数。）
//   T2 跨进程无守卫：两进程各自挂 fs-local，对同一目标 writeText(intent=undefined) ⇒ 双双成功、
//       终态 = 后写者载荷（静默互踩），且目录里**无锁/租约工件**。
//   T3 跨进程守卫竞态窗（尽力而为，不计红绿）：两进程同版本 replaceIfVersion 同时放行 ×20 轮 ⇒
//       出现"双双成功"即实证检测与发布之间存在窗口（源码论断 fs-local/index.ts:214-243 的活体版）。
// 用法：node scripts/cross-process-fs-probe.mjs
// 退出码：0 = T1 过且 T2 实证互踩；1 = 任一判据翻车；2 = 环境失败。
import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CORDIS = join(ROOT, 'vendor/dsh/packages/fs/fs-local/node_modules/@deepseek-ai/cordis/lib/index.js')
const FS_LOCAL = join(ROOT, 'vendor/dsh/packages/fs/fs-local/lib/index.js')

const WORKER_SRC = `
const { Context } = await import(${JSON.stringify(CORDIS)});
const { LocalFileSystem } = await import(${JSON.stringify(FS_LOCAL)});
const [dir, label, mode, target] = process.argv.slice(1); // --eval 模式：argv[1] 起才是参数（无脚本文件位）
const ctx = new Context();
const fiber = await ctx.plugin(LocalFileSystem, { cwd: dir });
const fs = ctx.fs;
const t = await fs.resolve(target);
if (mode === 'unguarded') {
  const payload = label + '-payload-' + Date.now();
  const out = await fs.writeText(t, payload, undefined);
  console.log(JSON.stringify({ phase: 'done', ok: true, payload, operation: out.operation }));
} else {
  const info = await fs.stat(t);
  console.log(JSON.stringify({ phase: 'ready', version: info.version }));
  await new Promise(r => { const on = d => { if (String(d).includes('GO')) { process.stdin.off('data', on); r() } }; process.stdin.on('data', on) });
  try {
    const payload = label + '-guarded-' + Date.now();
    const out = await fs.writeText(t, payload, { kind: 'replaceIfVersion', version: info.version });
    console.log(JSON.stringify({ phase: 'done', ok: true, payload }));
  } catch (error) {
    console.log(JSON.stringify({ phase: 'done', ok: false, code: error?.code ?? String(error) }));
  }
}
await fiber.dispose();
process.exit(0);
`

/** 起一个 worker 并（可选）在 ready 后放行。返回其 stdout 收齐的 JSON 行。 */
function runWorker(dir, label, mode, target, { go = false, timeoutMs = 30_000 } = {}) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', WORKER_SRC, dir, label, mode, target],
      { stdio: ['pipe', 'pipe', 'inherit'] })
    const lines = []
    const timer = setTimeout(() => { child.kill('SIGKILL'); rej(new Error(`worker ${label} 超时`)) }, timeoutMs)
    child.stdout.on('data', chunk => {
      for (const line of String(chunk).trim().split('\n')) {
        if (line === '') continue
        try { lines.push(JSON.parse(line)) } catch { /* 非 JSON 行忽略 */ }
      }
      if (go) {
        const ready = lines.some(l => l.phase === 'ready')
        if (ready && !child.stdin.writableEnded) child.stdin.write('GO\n')
      }
      if (lines.some(l => l.phase === 'done')) { clearTimeout(timer); child.stdin.end(); }
    })
    child.on('exit', () => { clearTimeout(timer); res(lines) })
    child.on('error', error => { clearTimeout(timer); rej(error) })
  })
}

// ── T1 进程内基线 ─────────────────────────────────────────────────────────────
const dir = await mkdtemp(join(tmpdir(), 'e2-cross-'))
const TARGET = 'shared.txt'
await writeFile(join(dir, TARGET), 'base')
const { Context } = await import(CORDIS)
const { LocalFileSystem } = await import(FS_LOCAL)
const ctx = new Context()
const fiber = await ctx.plugin(LocalFileSystem, { cwd: dir })
const fsSvc = ctx.fs
const t1 = await fsSvc.resolve(TARGET)
const v1 = (await fsSvc.stat(t1)).version
const t1results = await Promise.allSettled([
  fsSvc.writeText(t1, 'inproc-A', { kind: 'replaceIfVersion', version: v1 }),
  fsSvc.writeText(t1, 'inproc-B', { kind: 'replaceIfVersion', version: v1 }),
])
const t1ok = t1results.filter(r => r.status === 'fulfilled')
const t1stale = t1results.filter(r => r.status === 'rejected' && r.reason?.code === 'FS_STALE_VERSION')
console.log(`T1 进程内基线: ${String(t1ok.length)} 胜 / ${String(t1stale.length)} stale —— ${t1ok.length === 1 && t1stale.length === 1 ? '符合官方测试' : '不符合（环境存疑）'}`)
await fiber.dispose()

// ── T2 跨进程无守卫 ───────────────────────────────────────────────────────────
await writeFile(join(dir, TARGET), 'base')
const [wa, wb] = await Promise.all([
  runWorker(dir, 'writer-A', 'unguarded', TARGET),
  runWorker(dir, 'writer-B', 'unguarded', TARGET),
])
const okA = wa.find(l => l.phase === 'done')?.ok === true
const okB = wb.find(l => l.phase === 'done')?.ok === true
const final = await readFile(join(dir, TARGET), 'utf8')
const artifacts = (await readdir(dir)).filter(name => name !== TARGET && name !== '.DS_Store')
const t2clobber = okA && okB && (final.includes('writer-A') || final.includes('writer-B'))
console.log(`T2 跨进程无守卫: A=${String(okA)} B=${String(okB)}｜终态=${final.slice(0, 40)}｜锁/租约工件=${artifacts.length === 0 ? '无' : artifacts.join(',')} —— ${t2clobber && artifacts.length === 0 ? '双双成功·静默互踩·无互斥工件' : '见上'}`)

// ── T3 跨进程守卫竞态窗（×20 尽力而为）──────────────────────────────────────
let bothOk = 0; let oneStale = 0; let other = 0
for (let round = 0; round < 20; round++) {
  await writeFile(join(dir, TARGET), 'base-r' + String(round))
  const [ga, gb] = await Promise.all([
    runWorker(dir, 'guard-A', 'guarded', TARGET, { go: true }),
    runWorker(dir, 'guard-B', 'guarded', TARGET, { go: true }),
  ])
  const da = ga.find(l => l.phase === 'done')
  const db = gb.find(l => l.phase === 'done')
  if (da?.ok === true && db?.ok === true) bothOk++
  else if ((da?.ok === true) !== (db?.ok === true) && (da?.code === 'FS_STALE_VERSION' || db?.code === 'FS_STALE_VERSION')) oneStale++
  else other++
}
console.log(`T3 跨进程同版本守卫 ×20: 双双成功(互踩)=${String(bothOk)}｜一胜一 stale=${String(oneStale)}｜其他=${String(other)}${bothOk > 0 ? ' —— 检测与发布之间的窗口被活体命中（守卫跨进程不闭合）' : ' —— 20 轮未命中窗口（窗口存在但时序没排上，源码论断仍立）'}`)

await rm(dir, { recursive: true, force: true })
const verdict = (t1ok.length === 1 && t1stale.length === 1) && t2clobber && artifacts.length === 0
  ? 'PASS' : 'FAIL'
console.log(`cross-process-fs-probe: ${verdict}`)
process.exit(verdict === 'PASS' ? 0 : 1)
