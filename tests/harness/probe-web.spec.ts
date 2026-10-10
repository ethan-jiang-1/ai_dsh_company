// Keyless 形状断言：探针 web 启动块的收成模块（2026-10-10 卡「两处重复收成模块」的实施顺序要求：
// 先写启动 spec（红，因为模块还不存在），再让帮助函数转绿，然后逐个换调用方）。
//
// 断言什么：`startWeb` / `companyCookie` / `companyRpc` 的**形状**——argv、环境、banner 解析、
//   cookie 拼接、请求 JSON。这是「调用方观察到行为不变」的机器判据：搬家中若自行推导 rpcId 前缀、
//   或默认给 RPC 加超时信号，本 spec 红。
// 不证明什么：真 web 进程仍打印这条 banner（那条要一次真实启动，见卡内验收第 5 行）；也不证明
//   探针在真模型下判对。
// 成本：零模型、零进程——spawn/fetch 都是注入的假件。
// 何时跑：改动 `tools/lib/probe-web.mjs` 或任何改用它的探针启动块后。
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'

import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'

/** 假 child：可写 stdout/stderr 的 EventEmitter，带 kill。 */
function fakeChild() {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.exitCode = null
  child.signalCode = null
  child.kill = vi.fn(() => { child.exitCode = 0; child.emit('exit', 0) })
  return child
}

/** 假 spawn：记录调用，返回一个可被手动喂 banner 的 child。 */
function fakeSpawn() {
  const calls = []
  const child = fakeChild()
  const spawn = vi.fn((...args) => { calls.push(args); return child })
  return { spawn, calls, child, emit: text => child.stdout.emit('data', text) }
}

const BANNER = 'dsh web: http://127.0.0.1:43219/?token=TOKEN-abc_123\n'

describe('startWeb：进程参数与 banner 解析', () => {
  it('argv 与 cwd 保持现有字面量（process.execPath / --import tsx/esm / bin.ts web / -- --port 0 --no-open）', async () => {
    const { spawn, calls, emit } = fakeSpawn()
    const started = startWeb({ spawn, root: '/repo', home: '/repo/runtime/harness-home' })
    emit(BANNER)
    const { port, token, base } = await started
    expect(calls).toHaveLength(1)
    const [program, argv, options] = calls[0]
    expect(program).toBe(process.execPath)
    expect(argv).toEqual([
      '--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open',
    ])
    expect(options.cwd).toBe('/repo')
    expect(port).toBe(43219)
    expect(token).toBe('TOKEN-abc_123')
    expect(base).toBe('http://127.0.0.1:43219')
  })

  it('给出 patch 时在 web 后插 --patch <path>，并在基础环境上叠加额外键与 DSH_HOME（team-concurrency 读屏障用例）', async () => {
    const { spawn, calls, emit } = fakeSpawn()
    const started = startWeb({
      spawn, root: '/repo', home: '/repo/h', patch: '/tmp/barrier.patch.yml',
      env: { KEEP: 'yes', DSH_PROBE_BARRIER_DIR: '/tmp/bd' },
    })
    emit(BANNER)
    await started
    const [program, argv, options] = calls[0]
    expect(program).toBe(process.execPath)
    expect(argv).toEqual([
      '--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web',
      '--patch', '/tmp/barrier.patch.yml', '--', '--port', '0', '--no-open',
    ])
    expect(options.env).toEqual({ KEEP: 'yes', DSH_PROBE_BARRIER_DIR: '/tmp/bd', DSH_HOME: '/repo/h' })
  })

  it('patch 接受数组：逐个插 --patch（replay-smoke 的场景 patch + PRESET_PATCHES 组合）', async () => {
    const { spawn, calls, emit } = fakeSpawn()
    const started = startWeb({ spawn, root: '/repo', patch: ['/p/scene.yml', '/p/cEO.yml', '/p/cfo.yml'], port: 43210 })
    emit(BANNER)
    await started
    expect(calls[0][1]).toEqual([
      '--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web',
      '--patch', '/p/scene.yml', '--patch', '/p/cEO.yml', '--patch', '/p/cfo.yml',
      '--', '--port', '43210', '--no-open',
    ])
  })

  it('环境在现有环境上只加 DSH_HOME，不改动权限档（后端探测归 env.sh）', async () => {
    const { spawn, calls, emit } = fakeSpawn()
    const started = startWeb({ spawn, root: '/repo', home: '/repo/h', env: { KEEP: 'yes' } })
    emit(BANNER)
    await started
    const options = calls[0][2]
    expect(options.env.KEEP).toBe('yes')
    expect(options.env.DSH_HOME).toBe('/repo/h')
    expect(options.env).not.toHaveProperty('DSH_PERMISSION_MODE')
  })

  it('banner 正则只认 token 那段：端口对但没有 token 的输出不算解析成功', async () => {
    const { spawn, emit } = fakeSpawn()
    const started = startWeb({ spawn, root: '/repo', home: '/repo/h', port: 0 })
    emit('dsh web: 在别处 http://127.0.0.1:1/\n')
    // 用竞态避免等到 120 秒 boot 超时：只断言「这一帧没被当成 banner」。
    const settled = await Promise.race([started.then(() => 'resolved', () => 'rejected'), Promise.resolve('pending')])
    expect(settled).toBe('pending')
  })

  it('child 提前退出时以失败告终且消息含退出码', async () => {
    const { spawn, child } = fakeSpawn()
    const started = startWeb({ spawn, root: '/repo', home: '/repo/h', port: 0 })
    child.emit('exit', 3)
    await expect(started).rejects.toThrow(/web 提前退出 3/)
  })
})

describe('companyCookie：token 交换', () => {
  it('15 秒超时；cookie 取每个 set-cookie 分号前一段再以 "; " 拼接', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe('http://127.0.0.1:43219/?token=T')
      expect(init.redirect).toBe('manual')
      return { headers: { getSetCookie: () => ['a=1; Path=/', 'b=2; HttpOnly'] } }
    })
    const cookie = await companyCookie({ base: 'http://127.0.0.1:43219', token: 'T', fetch: fetchImpl })
    expect(cookie).toBe('a=1; b=2')
  })

  it('默认空 cookie 拼出空串（探针面现状）；onEmptyCookie: throw 时立刻抛（四个 smoke 既有形态）', async () => {
    const empty = vi.fn(async () => ({ headers: { getSetCookie: () => [] } }))
    const joined = await companyCookie({ base: 'http://127.0.0.1:1', token: 'T', fetch: empty })
    expect(joined).toBe('')
    await expect(companyCookie({ base: 'http://127.0.0.1:1', token: 'T', fetch: empty, onEmptyCookie: 'throw' }))
      .rejects.toThrow('token 交换没有拿到 cookie')
  })
})

describe('companyRpc：请求形状', () => {
  it('请求体是 client-request，rpcId 前缀由调用方传入并自增', async () => {
    const bodies = []
    const fetchImpl = vi.fn(async (url, init) => {
      bodies.push({ url, body: JSON.parse(init.body) })
      return { json: async () => ({ result: { ok: true, value: { v: 1 } } }) }
    })
    const rpc = companyRpc({ base: 'http://127.0.0.1:43219', cookie: 'a=1', fetch: fetchImpl, prefix: 'mip-' })
    const value = await rpc('session/create', { cwd: '/repo' })
    await rpc('session/page', { sessionId: 's' })
    expect(value).toEqual({ v: 1 })
    expect(bodies[0].body).toEqual({
      type: 'client-request', rpcId: 'mip-1', method: 'session/create', payload: { args: { cwd: '/repo' } },
    })
    expect(bodies[1].body.rpcId).toBe('mip-2')
    expect(bodies[1].body.payload).toEqual({ args: { sessionId: 's' } })
  })

  it('默认不给请求加超时信号（调用方要就自己传）', async () => {
    const seen = []
    const fetchImpl = vi.fn(async (url, init) => {
      seen.push(init.signal)
      return { json: async () => ({ result: { ok: true, value: null } }) }
    })
    const rpc = companyRpc({ base: 'http://127.0.0.1:1', cookie: '', fetch: fetchImpl, prefix: 'tcp-' })
    await rpc('x', {})
    const signal = AbortSignal.timeout(30_000)
    await rpc('x', {}, { signal })
    expect(seen[0]).toBeUndefined()
    expect(seen[1]).toBe(signal)
  })

  it('result.ok 非 true 时抛错，消息含端点；回退文案由调用方传（既有两种写法都保留）', async () => {
    const mkFetch = () => vi.fn(async () => ({ json: async () => ({ result: { ok: false, error: {} } }) }))
    const withDefault = companyRpc({ base: 'http://127.0.0.1:1', cookie: '', fetch: mkFetch(), prefix: 'trp-' })
    await expect(withDefault('session/prompt', {})).rejects.toThrow('session/prompt: unknown')
    const withQuestion = companyRpc({ base: 'http://127.0.0.1:1', cookie: '', fetch: mkFetch(), prefix: 'trp-', errorFallback: '?' })
    await expect(withQuestion('session/prompt', {})).rejects.toThrow('session/prompt: ?')
    const withMessage = companyRpc({ base: 'http://127.0.0.1:1', cookie: '', fetch: vi.fn(async () => ({ json: async () => ({ result: { ok: false, error: { message: 'boom' } } }) })), prefix: 'trp-' })
    await expect(withMessage('session/prompt', {})).rejects.toThrow('session/prompt: boom')
  })

  it('共享 counter：两次造出的 rpc 沿用同一条编号序列（team-recovery 重启后不重置）', async () => {
    const ids = []
    const fetchImpl = vi.fn(async (url, init) => {
      ids.push(JSON.parse(init.body).rpcId)
      return { json: async () => ({ result: { ok: true, value: null } }) }
    })
    const counter = { n: 0 }
    const first = companyRpc({ base: 'http://127.0.0.1:1', cookie: '', fetch: fetchImpl, prefix: 'trp-', counter })
    await first('a', {})
    await first('b', {})
    // 模拟重启：新的 base/cookie，但同一个 counter。
    const second = companyRpc({ base: 'http://127.0.0.1:2', cookie: '', fetch: fetchImpl, prefix: 'trp-', counter })
    await second('c', {})
    expect(ids).toEqual(['trp-1', 'trp-2', 'trp-3'])
  })
})
