#!/usr/bin/env node
// 状态：常驻
// 何时跑：验证同fs-local实例的同版本竞写与败者重读合并；vendor升pin后复验。
// 成本/预算：零模型，2轮（互换先提交者），每轮2次初读+2次竞写+1次重读合并写；墙钟30秒。
// 依赖：tsx ESM hook加载钉住vendor的fs-local源码及已安装的Cordis。仅机制实验，不是会话入口或跨进程认证。
// 用法：node --import tsx/esm probes/fs-taskboard/observed-write-conflict-probe.mjs [--unguarded-control]
// 退出码：0所有必需检查通过；1行为判据失败；2环境/执行失败。
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const control = process.argv.includes('--unguarded-control')
const timer = setTimeout(() => { console.error('ERROR: 30秒预算到限'); process.exit(2) }, 30_000)
const evidence = { topology: 'one LocalFileSystem instance, two caller observations', control, rounds: [] }
let fiber
let dir
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
try {
  const home = join(ROOT, 'runtime', 'harness-home', 'write-conflict-evidence')
  await mkdir(home, { recursive: true })
  dir = await mkdtemp(join(home, 'run-'))
  const { Context } = await import(join(ROOT, 'vendor/dsh/packages/fs/fs-local/node_modules/@deepseek-ai/cordis/lib/index.js'))
  const { LocalFileSystem } = await import(join(ROOT, 'vendor/dsh/packages/fs/fs-local/src/index.ts'))
  const ctx = new Context()
  fiber = await ctx.plugin(LocalFileSystem, { cwd: dir })
  const fs = ctx.fs
  for (const order of [['A', 'B'], ['B', 'A']]) {
    const name = `first-${order[0]}.txt`
    await writeFile(join(dir, name), 'base\n')
    const target = await fs.resolve(name)
    const observations = await Promise.all(['A', 'B'].map(async label => {
      const before = await fs.stat(target)
      const text = await fs.readText(target)
      const after = await fs.stat(target)
      assert.equal(before.version, after.version, 'observation changed during read')
      return { label, version: after.version, text }
    }))
    assert.equal(observations[0].text, 'base\n')
    assert.equal(observations[1].text, observations[0].text)
    assert.equal(observations[1].version, observations[0].version)
    const staged = deferred()
    const release = deferred()
    let publicationCount = 0
    fs.internals.inspectTemp = async () => {
      publicationCount++
      if (publicationCount === 1) { staged.resolve(); await release.promise }
    }
    const attempt = async label => {
      const observed = observations.find(item => item.label === label)
      const payload = observed.text + `${label}\n`
      try {
        const outcome = await fs.writeText(target, payload, control ? undefined : { kind: 'replaceIfVersion', version: observed.version })
        return { label, payload, ok: true, version: outcome.version }
      } catch (error) {
        return { label, payload, ok: false, code: error.code }
      }
    }
    const first = attempt(order[0])
    await staged.promise // First writer owns the real provider lock; publication is paused.
    const second = attempt(order[1]) // Submit the competitor while the first is still staged.
    release.resolve()
    const outcomes = await Promise.all([first, second])
    fs.internals = {}
    const afterRace = await readFile(join(dir, name), 'utf8')
    const round = { order, observations, outcomes, publicationCount, afterRace }
    evidence.rounds.push(round)
    const winner = outcomes.filter(item => item.ok)
    const loser = outcomes.filter(item => !item.ok && item.code === 'FS_STALE_VERSION')
    assert.equal(winner.length, 1, 'exactly one successful guarded write required')
    assert.equal(loser.length, 1, 'exactly one actual FS_STALE_VERSION required')
    assert.equal(winner[0].label, order[0], 'first submitted writer wins the provider FIFO')
    assert.equal(loser[0].label, order[1], 'second submitted writer receives stale')
    assert.equal(publicationCount, 1, 'stale writer must not reach staging')
    assert.equal(afterRace, winner[0].payload, 'independent disk content must equal winner payload')
    const rereadVersion = (await fs.stat(target)).version
    const reread = await fs.readText(target)
    assert.equal((await fs.stat(target)).version, rereadVersion)
    assert.equal(reread, afterRace)
    assert.notEqual(rereadVersion, observations[0].version)
    const merged = reread + `${loser[0].label}\n`
    const mergeOutcome = await fs.writeText(target, merged, { kind: 'replaceIfVersion', version: rereadVersion })
    round.recovery = { loser: loser[0].label, rereadVersion, reread, merged, version: mergeOutcome.version,
      final: await readFile(join(dir, name), 'utf8') }
    assert.equal(round.recovery.final, `base\n${order[0]}\n${order[1]}\n`, 'both contributions exactly once, in commit order')
    console.log(`PASS first=${order[0]}: same-version reads; one winner/one stale; exact winner payload; loser reread+merge retains both`)
  }
  assert.equal(evidence.rounds.length, 2)
  evidence.verdict = 'PASS'
  process.exitCode = 0
} catch (error) {
  evidence.verdict = error.code === 'ERR_ASSERTION' ? 'FAIL' : 'ERROR'
  evidence.error = error.message
  console.error(`${evidence.verdict}: ${error.message}`)
  process.exitCode = evidence.verdict === 'FAIL' ? 1 : 2
} finally {
  clearTimeout(timer)
  if (fiber) await fiber.dispose()
  if (dir) {
    await writeFile(join(dir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
    console.log(`evidence: ${join(dir, 'evidence.json')}`)
  }
}
