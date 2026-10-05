#!/usr/bin/env node
// 状态：常驻
// Keyless CLI integration check for snapshot-motion. Kept outside vitest because it starts child processes.
// 何时跑：snapshot-motion CLI 或 workspace capture 接线改动时（keyless CLI 集成，需子进程）
// Usage: node scripts/smoke/snapshot-motion-smoke.mjs
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const { load } = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const temp = mkdtempSync(join(ROOT, 'dev/harness-home/snapshot-motion-smoke-'))

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} exited ${String(result.status)}\n${result.stderr || result.stdout}`)
  }
  return result
}

function writeTreeFile(root, relativePath, text) {
  const path = join(root, relativePath)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

try {
  const cwd = join(temp, 'live')
  const out = join(temp, 'scenario')
  const home = join(temp, 'home')
  const sessionId = 'session-fixture'
  writeTreeFile(cwd, 'nested/file.txt', 'live')
  writeTreeFile(out, 'workspace.expected/nested/file.txt', 'independent')

  const slug = `-${cwd.replaceAll('/', '-')}--`
  const sessionDir = join(home, 'sessions', slug, sessionId)
  mkdirSync(sessionDir, { recursive: true })
  const compressed = run('zstd', ['-q', '-c'], { input: '{"type":"session","version":3,"agentPreset":"ceo"}\n', encoding: undefined })
  writeFileSync(join(sessionDir, 'session.v3.jsonl.zstd'), compressed.stdout)

  const cli = join(ROOT, 'scripts/tools/snapshot-motion.mjs')
  const cliArgs = ['--session', sessionId, '--cwd', cwd, '--out', out]
  const env = { ...process.env, DSH_HOME: home }
  run(process.execPath, [cli, ...cliArgs], { cwd: ROOT, env })

  assert.equal(readFileSync(join(out, 'workspace.actual/nested/file.txt'), 'utf8'), 'live')
  assert.deepEqual(load(readFileSync(join(out, 'snapshot.yml'), 'utf8')).workspace, {
    final: false,
    actual: 'workspace.actual/',
  })

  run(process.execPath, [cli, ...cliArgs, '--no-workspace'], { cwd: ROOT, env })
  assert.equal(readFileSync(join(out, 'workspace.expected/nested/file.txt'), 'utf8'), 'independent')
  console.log('snapshot-motion-smoke: PASS (actual captured; independent expected preserved on rerun)')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
