import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

/** Drop inherited source loaders; children run the declared Node artifact, not tsx. */
export function plainNodeEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) =>
    !['NODE_OPTIONS', 'NODE_PATH'].includes(key) && !key.startsWith('TSX_')))
}

/** Bounded POSIX child groups, including descendants; close before removing their files. */
export function releaseProcesses({ cwd, env = plainNodeEnv() }) {
  if (process.platform === 'win32') throw new Error('release scripts require POSIX process-group cleanup')
  const active = new Set()
  let interrupted
  const onSignal = (signal) => {
    interrupted = new Error(`interrupted by ${signal}`)
    for (const job of active) job.terminate()
  }
  const onInt = () => onSignal('SIGINT')
  const onTerm = () => onSignal('SIGTERM')
  process.on('SIGINT', onInt)
  process.on('SIGTERM', onTerm)

  function start(command, args, { timeoutMs = 120_000, killGraceMs = 1000, ...options } = {}) {
    if (interrupted) throw interrupted
    const child = spawn(command, args, { cwd, env, ...options, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    let stdout = ''
    let outcome
    let timedOut = false
    let killTimer
    const signalGroup = (signal) => {
      if (!child.pid) return
      try { process.kill(-child.pid, signal) } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
    const groupAlive = () => {
      if (!child.pid) return false
      try { process.kill(-child.pid, 0); return true } catch (error) {
        if (error.code === 'ESRCH') return false
        throw new Error(`${command}: cannot confirm process group ${child.pid} exit (${error.code}); leave runtime files intact`, { cause: error })
      }
    }
    const terminate = () => {
      signalGroup('SIGTERM')
      killTimer ??= setTimeout(() => signalGroup('SIGKILL'), killGraceMs)
    }
    const append = chunk => { output = (output + String(chunk)).slice(-64_000) }
    child.stdout.on('data', chunk => { stdout = (stdout + String(chunk)).slice(-64_000); append(chunk) })
    child.stderr.on('data', append)
    const done = new Promise(resolveDone => {
      child.once('error', error => { outcome = { error }; resolveDone(outcome) })
      child.once('exit', (code, signal) => { outcome = { code, signal } })
      child.once('close', (code, signal) => { outcome ??= { code, signal }; resolveDone(outcome) })
    })
    const timer = setTimeout(() => { timedOut = true; terminate() }, timeoutMs)
    const job = {
      child, done, terminate,
      get output() { return output },
      async waitFor(pattern, waitMs) {
        const deadline = Date.now() + waitMs
        while (Date.now() < deadline) {
          if (interrupted) throw interrupted
          if (timedOut) throw new Error(`${command}: timeout after ${timeoutMs}ms\n${output.slice(-1500)}`)
          if (outcome) throw new Error(`${command}: exited before ready (${outcome.code ?? outcome.error ?? outcome.signal})\n${output.slice(-1500)}`)
          const match = pattern.exec(output)
          if (match) return match
          await delay(50)
        }
        throw new Error(`${command}: readiness timeout after ${waitMs}ms\n${output.slice(-1500)}`)
      },
      async result() {
        let waitTimer
        try {
          const result = await Promise.race([done, new Promise((_, reject) => {
            waitTimer = setTimeout(() => reject(new Error(`${command}: did not exit after timeout and kill`)), timeoutMs + killGraceMs + 2500)
          })])
          if (interrupted) throw interrupted
          if (timedOut || result.code !== 0 || result.error) {
            throw new Error(`${command} ${args.join(' ')}: code=${result.code ?? 'none'} signal=${result.signal ?? 'none'} timeout=${timedOut}${result.error ? ` ${result.error.message}` : ''}\n${output.slice(-3000)}`)
          }
          return stdout
        } finally { clearTimeout(waitTimer) }
      },
      async stop() {
        clearTimeout(timer)
        terminate()
        const deadline = Date.now() + killGraceMs + 2500
        while (groupAlive() && Date.now() < deadline) await delay(40)
        clearTimeout(killTimer)
        if (groupAlive()) throw new Error(`${command}: child group ${child.pid} did not stop; leave runtime files intact`)
        let closeTimer
        try {
          await Promise.race([done, new Promise((_, reject) => {
            closeTimer = setTimeout(() => reject(new Error(`${command}: child stdio did not close`)), 1000)
          })])
        } finally { clearTimeout(closeTimer) }
        active.delete(job)
      },
    }
    active.add(job)
    return job
  }

  return {
    start,
    async run(command, args, options) {
      const job = start(command, args, options)
      try { return await job.result() } finally { await job.stop() }
    },
    async close() {
      const results = await Promise.allSettled([...active].map(job => job.stop()))
      process.removeListener('SIGINT', onInt)
      process.removeListener('SIGTERM', onTerm)
      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason)
      if (errors.length) throw new AggregateError(errors, 'release child cleanup failed')
    },
  }
}
