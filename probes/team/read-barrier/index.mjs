// 状态：常驻
// Experiment-only listener loaded by the concurrency probe overlay, never shipped in a profile.
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
export const name = 'probe-read-barrier'
export const inject = ['tools']
export function apply(ctx) {
  const directory = process.env.DSH_PROBE_BARRIER_DIR
  const target = process.env.DSH_PROBE_BARRIER_TARGET
  if (!target) throw new Error('DSH_PROBE_BARRIER_TARGET required')
  if (!directory) throw new Error('DSH_PROBE_BARRIER_DIR required for probe overlay')
  const seen = new Set()
  const controller = new AbortController()
  ctx.effect(() => () => controller.abort(new Error('read barrier disposed')))
  ctx.on('tools/post-execute', async (exec, result, next) => {
    const downstream = await next()
    const path = exec.arguments?.file_path
    const id = exec.agent?.session?.id
    if (exec.name !== 'read' || result.isError !== false || !id || typeof path !== 'string'
      || resolve(process.env.DSH_PROBE_BARRIER_CWD, path) !== target || seen.has(id)
      || downstream.kind !== 'accept' || Object.hasOwn(downstream, 'value')) return downstream
    seen.add(id)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, `${id}.ready.json`), JSON.stringify({ sessionId: id, callId: exec.callId, path: target }) + '\n')
    const signal = AbortSignal.any([exec.signal, controller.signal, AbortSignal.timeout(120_000)])
    while (true) {
      signal.throwIfAborted()
      try { await stat(join(directory, 'release')); break } catch (error) { if (error.code !== 'ENOENT') throw error }
      await new Promise((resolve, reject) => {
        const timer = setTimeout(done, 50)
        function done() { signal.removeEventListener('abort', abort); resolve() }
        function abort() { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason) }
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      })
    }
    await writeFile(join(directory, `${id}.released.json`), JSON.stringify({ sessionId: id, callId: exec.callId, path: target }) + '\n')
    return downstream
  })
}
