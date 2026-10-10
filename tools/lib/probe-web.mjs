// 探针 web 启动块的收成模块（2026-10-10 卡「两处重复收成模块，调用方行为不变」）。
// 状态：常驻
// 何时跑：改本文件或任何改用它的探针启动块后 → `npx vitest run tests/harness/probe-web.spec.ts`（keyless）；
//   本模块**不被** checks/smoke 直接跑，它是被 25 个真模型探针（probes/ 下所有起 web 的文件）import 的启动面。
//
// 为什么收成模块：每个探针各抄一份「起 web → 等 banner → 取 cookie → 发 client-request」，
//   同一段启动代码在 24 个文件里漂移（改一处 banner 正则要爬 24 遍）。
//
// **为什么 spawn/fetch 一律注入、本模块零 import**：`tests/harness/layering.spec.ts` 把
//   `tools/lib/` 定为 keyless 纯逻辑缝（禁 child_process/http 等 builtin、禁 spawn/fetch 调用）。
//   本模块只造参数、解析 banner、拼请求体——真进程/真网络由调用方（probes/，本来就是驱动层）注入。
//   这不是妥协：spec 因此能直接 import 本模块做形状断言（卡内验收第 3 行）。
//
// 收成的边界（卡内「已知」列的既有差异——**全部当参数留下，不收成默认值**）：
//   - `rpcId` 前缀由调用方传入：`mip-` 同时用于 member-inquiry/member-interrupt，`tcp-` 同时用于
//     time-context/team-concurrency。按文件名推导会改掉现有 id（那是在改调用方可观察的行为）。
//   - 取 cookie 的 fetch 固定 15 秒超时（现有全部探针一致）；**RPC 默认不加**超时信号——只有
//     member-stale-write 后续 RPC 另有 30 秒，那是它的调用方自己传。
//   - 成功路径的 `console.log`（如 `web up`）留在调用方，本模块不新增输出。
//   - 进程参数/banner 正则/cookie 拼接/请求体形状逐字照抄现有探针，不"顺手改进"。
//
// 分层：`startWeb` 只起进程 + 解析 banner（dag-visual 到此为止，不取 cookie）；
//   `companyCookie` 做 token 交换；`companyRpc` 发请求。要用哪层调哪层，避免让调用方多走一步。

/** banner 行里唯一要认的那段：`http://127.0.0.1:<port>/?token=<token>`。 */
const BANNER_RE = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/
const BOOT_TIMEOUT_MS = 120_000
const COOKIE_TIMEOUT_MS = 15_000

/**
 * 起一个 web 实例并等它的启动 banner。（进程启动器 `spawn` 由调用方注入——见文件头。）
 *
 * @param {object} options
 * @param {Function} options.spawn - 进程启动器（调用方从 `node:child_process` 拿真件）。
 * @param {string} options.root - 仓库根（cwd + `vendor/dsh` 相对路径的基准）。
 * @param {string} [options.home] - 开发 DSH home；给出时在现有环境上**只加** `DSH_HOME`
 *   （不动权限档——那归 run/env.sh 的探测）。
 * @param {object} [options.env] - 基础环境（默认 `process.env`）。要加额外键（如 team-concurrency 的
 *   `DSH_PROBE_BARRIER_*`）就传展开后的基础环境，`home` 会再叠加 `DSH_HOME`。
 * @param {string} [options.patch] - Cordis patch overlay 路径；给出时在 `web` 后插 `--patch <path>`
 *   （team-concurrency 的读屏障实验 overlay 是唯一既有用例；不给出则 argv 与其余探针逐字一致）。
 * @param {number} [options.port] - 传给 `--port` 的值；默认 0（端口是环境状态，交系统分配）。
 * @returns {Promise<{child: object, port: number, token: string, base: string}>}
 */
export function startWeb({ spawn: spawnProcess, root, home, env = process.env, patch, port = 0 } = {}) {
  const child = spawnProcess(process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web',
      ...(patch === undefined ? [] : ['--patch', patch]),
      '--', '--port', String(port), '--no-open'],
    { cwd: root, env: home === undefined ? { ...env } : { ...env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  return new Promise((res, rej) => {
    const on = chunk => {
      output += String(chunk)
      const match = BANNER_RE.exec(output)
      if (match) res({ child, port: Number(match[1]), token: match[2], base: `http://127.0.0.1:${match[1]}` })
    }
    child.stdout.on('data', on)
    child.stderr.on('data', on)
    child.on('exit', code => rej(new Error(`web 提前退出 ${String(code)}`)))
    setTimeout(() => rej(new Error('boot 超时：未在输出里读到 banner')), BOOT_TIMEOUT_MS)
  })
}

/**
 * token 交换：用 banner 里的 token 换一个 cookie 串。（`fetch` 由调用方注入。）
 *
 * @param {object} options
 * @param {Function} options.fetch - fetch 实现（调用方传全局 fetch）。
 * @param {string} options.base - `startWeb` 返回的 base。
 * @param {string} options.token - `startWeb` 返回的 token。
 * @returns {Promise<string>} 每个 set-cookie 取分号前一段、以 `"; "` 拼接。
 */
export async function companyCookie({ fetch: fetchImpl, base, token } = {}) {
  const auth = await fetchImpl(`${base}/?token=${token}`, { redirect: 'manual', signal: AbortSignal.timeout(COOKIE_TIMEOUT_MS) })
  return auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
}

/**
 * 造一个 RPC 发送函数。（`fetch` 由调用方注入。）
 *
 * @param {object} options
 * @param {Function} options.fetch - fetch 实现（调用方传全局 fetch）。
 * @param {string} options.base - `startWeb` 返回的 base。
 * @param {string} options.cookie - `companyCookie` 的产物。
 * @param {string} options.prefix - rpcId 前缀（`mip-` / `tcp-` / `trp-` …）——由调用方传入，不推导。
 * @param {string} [options.errorFallback] - `result.error.message` 缺失时的回退文案；
 *   既有探针两种写法（`'unknown'` 多数 / `'?'` 8 个）都当参数保留，默认 `'unknown'`。
 * @param {{n: number}} [options.counter] - rpcId 计数器。默认每个实例自持一个（从 1 开始）；
 *   **起两次 web 且要沿用同一条编号序列的调用方**（team-recovery：重启后 rpcId 继续往下数，
 *   不重置）传同一个对象共享。
 * @returns {(endpoint: string, args: object, options?: {signal?: AbortSignal}) => Promise<any>}
 *   默认**不加**超时信号；要超时的调用方自己传 `{ signal }`。
 */
export function companyRpc({ fetch: fetchImpl, base, cookie, prefix, errorFallback = 'unknown', counter = { n: 0 } } = {}) {
  return async (endpoint, args, { signal } = {}) => {
    const response = await fetchImpl(`${base}/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `${prefix}${String(++counter.n)}`, method: endpoint, payload: { args } }),
      ...(signal === undefined ? {} : { signal }),
    })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? errorFallback}`)
    return body.result.value
  }
}
