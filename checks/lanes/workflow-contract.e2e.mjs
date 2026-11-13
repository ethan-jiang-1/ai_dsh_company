#!/usr/bin/env node
// 状态：常驻
// workflow 引擎机制档（keyless、fake SubagentProvider + 真 workflow 引擎）——BUG-038/040 修复轮的收割资产，
// 同时把探索轮 runtime/tmp 里的一次性脚本升格为常驻。
//
// 何时跑：改 workflow/subagent 组合、改 schema 分支语义、或升 pin 后（keyless ~2s；不进 pnpm test——
//   它要起真插件图，属机制档）。命令 = `node --import tsx/esm checks/lanes/workflow-contract.e2e.mjs`
//   （从仓库根；需 workspace 依赖已装，不需要模型凭据）。
//
// 钉什么（每条都是"父代理实际看到的行为"，不是引擎内部自述）：
//   1. 普通 child 失败（refusal）→ agent() 返回 null → 父脚本可重派一次，第二次 structured 返回对象；
//      一次 run 最多两次 start（没有自动无限重试）。
//   2. `AGENT_START` 是 fatal：parallel() 不把它折成 per-item null，脚本能 catch 到 code。
//   3. `AGENT_RESULT` 是 fatal：未捕获时整 run stopReason=error。
//   4. 两次失败后父脚本停在 2 starts，不启动第三次。
//   5. **BUG-040**：带 schema 的 child `completed` 但只回文本（无 structured）→ agent() 返回 null；
//      这是"父拿裸 null"的机制侧证据，与卡里的探针/技能规则配套。
//
// 证明不了什么：不证明模型会照 skill 派活（那是真模型探针）；不证明 spill 落盘（见
// `tests/contract/workflow-result-budget.spec.ts` 与 BUG-039 探针）。
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import { createInboxStub, provideWorkingDirectoryFixture } from '@deepseek-ai/dsh-agent-loop-testkit'
import FileSystem from '@deepseek-ai/dsh-fs-local'
import NodePtcRuntime from '@deepseek-ai/dsh-ptc-runtime-node'
import SandboxPolicy from '@deepseek-ai/dsh-sandbox-policy'
import Sandbox from '@deepseek-ai/dsh-sandbox-local'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SessionProjections from '@deepseek-ai/dsh-session-projection'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import Subprocess from '@deepseek-ai/dsh-subprocess-local'
import PtcWorkflowEngine from '@deepseek-ai/dsh-workflow-ptc'

const capabilities = { agentOptions: true, agentPreset: false, outputSchema: true, depthLimit: true }

class ScriptedProvider {
  requests = []
  constructor(name, outcomes) { this.name = name; this.outcomes = outcomes; this.capabilities = capabilities; this.inheritsParentContext = false }
  async start(request) {
    const index = this.requests.length
    this.requests.push(request)
    const outcome = this.outcomes[Math.min(index, this.outcomes.length - 1)]
    if (outcome === undefined) throw new Error('scripted provider: no outcome')
    return {
      id: SessionId(`scripted-${String(index)}-${randomUUID().slice(0, 8)}`),
      result: Promise.resolve(outcome(request, index)),
      dispose: () => Promise.resolve(),
    }
  }
}

class ResultRejectionProvider {
  starts = []
  constructor() { this.name = 'scripted'; this.capabilities = capabilities; this.inheritsParentContext = false }
  start(request) {
    this.starts.push(request)
    return Promise.resolve({
      id: SessionId(`reject-${randomUUID().slice(0, 8)}`),
      result: Promise.reject(new Error('child result rejected')),
      dispose: () => Promise.resolve(),
    })
  }
}

const text = value => ({ output: [{ type: 'text', text: value }], stopReason: 'completed' })
const textNoStructured = value => ({ output: [{ type: 'text', text: value }], stopReason: 'completed' })
const refused = () => ({ output: [], stopReason: 'refusal', diagnostic: 'scripted refusal' })
const meta = name => ({ name, description: 'workflow contract smoke' })
const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }

async function setup(provider) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workflow-contract-'))
  const cwd = join(root, 'workspace')
  await mkdir(cwd)
  const ctx = new Context()
  try {
    await ctx.plugin(SessionStore)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(SessionProjections)
    await ctx.plugin(FileSystem)
    await ctx.plugin(Subprocess)
    await ctx.plugin(Sandbox)
    await ctx.plugin(SandboxPolicy, { mode: 'danger-full-access', workspaceRoot: cwd })
    await ctx.plugin(NodePtcRuntime, { graceMs: 50, executionMode: 'per-call' })
    await ctx.plugin(JsonlSessionPersistence, { root: join(root, 'sessions') })
    provideWorkingDirectoryFixture(ctx, cwd)
    await ctx.plugin(SubagentRuntime)
    ctx.subagents.registerProvider(provider)
    await ctx.plugin(PtcWorkflowEngine, { provider: 'scripted', maxConcurrentAgents: 4 })
    const session = ctx.sessions.create(SessionId(randomUUID()), { meta: { cwd } })
    const inbox = createInboxStub()
    const parent = {
      id: session.id, session, ctx, options: {}, status: 'idle', inbox,
      send: (message, target) => { inbox.append(target, message) },
      followup: (message) => { inbox.append('next-turn', message) },
      steer: (message) => { inbox.append('next-step', message) },
      inject: (message) => { inbox.append('next-step', message) },
      cancel: () => { inbox.clear() },
      whenIdle: () => Promise.resolve(),
      runMaintenance: task => task(new AbortController().signal),
    }
    ctx.agents.register(parent)
    return { ctx, parent, root }
  } catch (error) {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

async function run(script, name, provider) {
  const { ctx, parent, root } = await setup(provider)
  const agentEnds = []
  ctx.on('workflow/agent-end', (_run, agent) => { agentEnds.push(agent) })
  try {
    const handle = ctx.workflowEngine.start({ script, meta: meta(name), parent })
    try {
      return { result: await handle.result, agentEnds }
    } finally {
      await handle.dispose()
    }
  } finally {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  }
}

const passes = []
const check = (name, fn) => {
  fn()
  passes.push(name)
  console.log(`PASS ${name}`)
}

// 1) ordinary child failure -> null -> parent retries exactly once
{
  const provider = new ScriptedProvider('scripted', [refused, () => ({ output: [], stopReason: 'completed', structured: { ok: true } })])
  const { result } = await run(`
    const schema = ${JSON.stringify(schema)}
    const first = await agent('attempt 1', { schema, label: 'audit-1' })
    let second = null
    if (first === null) second = await agent('attempt 2', { schema, label: 'audit-2' })
    return { firstIsNull: first === null, second }
  `, 'retry-once', provider)
  check('retry-once: refusal -> null -> second attempt structured; starts=2', () => {
    assert.equal(result.stopReason, 'completed', result.error)
    assert.equal(result.agentsStarted, 2)
    assert.deepEqual(result.value, { firstIsNull: true, second: { ok: true } })
    assert.equal(provider.requests.length, 2)
    assert.deepEqual(provider.requests[1]?.outputSchema, schema)
  })
}

// 2) AGENT_START fatal must not become a per-item null inside parallel
{
  const provider = new ScriptedProvider('scripted', [() => { throw new Error('backend unavailable') }])
  const { result } = await run(`
    try {
      const out = await parallel([() => agent('boom')])
      return { swallowed: true, out }
    } catch (error) {
      return { swallowed: false, code: error.code }
    }
  `, 'fatal-start', provider)
  check('fatal-start: AGENT_START propagated through parallel', () => {
    assert.equal(result.stopReason, 'completed', result.error)
    assert.deepEqual(result.value, { swallowed: false, code: 'AGENT_START' })
  })
}

// 3) AGENT_RESULT fatal unwinds an uncaught run as error
{
  const provider = new ResultRejectionProvider()
  const { result } = await run(`return await agent('boom')`, 'fatal-result', provider)
  check('fatal-result: uncaught result rejection -> run error', () => {
    assert.equal(result.stopReason, 'error')
    assert.match(String(result.error), /child agent run failed/)
    assert.equal(provider.starts.length, 1)
  })
}

// 4) three failures with a retry-once policy must stop at two attempts (no third start)
{
  const provider = new ScriptedProvider('scripted', [refused, refused, () => text('must not run')])
  const { result } = await run(`
    const first = await agent('attempt 1')
    let second = null
    if (first === null) second = await agent('attempt 2')
    return { first: first === null ? 'null' : 'value', second }
  `, 'exhausted', provider)
  check('exhausted: two refusals stop at two starts; no third activation', () => {
    assert.equal(result.stopReason, 'completed', result.error)
    assert.deepEqual(result.value, { first: 'null', second: null })
    assert.equal(provider.requests.length, 2)
  })
}

// 5) BUG-040: schema branch completed with text only -> null with a failed agent-end (no diagnostic for the parent)
{
  const provider = new ScriptedProvider('scripted', [() => textNoStructured('{"module":"m01","version":"1.0.0"}')])
  const { result, agentEnds } = await run(`
    const schema = ${JSON.stringify(schema)}
    const value = await agent('answer in text', { schema, label: 'm01' })
    return { isNull: value === null, value }
  `, 'schema-text-null', provider)
  check('schema-text-null: completed text without structured becomes null (BUG-040 mechanism)', () => {
    assert.equal(result.stopReason, 'completed', result.error)
    assert.deepEqual(result.value, { isNull: true, value: null })
    assert.equal(agentEnds.length, 1)
    assert.equal(agentEnds[0]?.outcome, 'failed')
  })
}

// 6) BUG-038: a non-schema branch value is the child's final text verbatim — receipts and结论 are not
// distinguished, so a nested delegation lands in the parent as one concatenated string.
{
  const provider = new ScriptedProvider('scripted', [() => ({
    output: [{ type: 'text', text: 'started subagent 07b2fca ' }, { type: 'text', text: '0.9.0' }],
    stopReason: 'completed',
  })])
  const { result } = await run(`return { value: await agent('nested receipt') }`, 'receipt-mixed', provider)
  check('receipt-mixed: non-schema branch returns concatenated text, not a structured conclusion (BUG-038 mechanism)', () => {
    assert.equal(result.stopReason, 'completed', result.error)
    assert.deepEqual(result.value, { value: 'started subagent 07b2fca 0.9.0' })
  })
}

// 7) BUG-040 的产品规避（2026-11-08）：分支**不传 schema** 时，child 的最终文本原样返回；
// 父脚本自己 JSON.parse 即可拿回结构化值——没有"要对象、没对象、文本被丢"这条路。
{
  const provider = new ScriptedProvider('scripted', [() => text('{"module":"m01","version":"1.0.0"}')])
  const { result } = await run(`
    const raw = await agent('reply with one JSON line only')
    let parsed = null
    try { parsed = JSON.parse(raw) } catch { parsed = { missing: true, raw } }
    return { parsed }
  `, 'json-line', provider)
  check('json-line: no-schema branch returns the JSON line verbatim and the parent parses it (BUG-040 avoidance)', () => {
    assert.equal(result.stopReason, 'completed', result.error)
    assert.deepEqual(result.value, { parsed: { module: 'm01', version: '1.0.0' } })
  })
}

console.log(`workflow-contract-smoke: ${String(passes.length)}/${String(passes.length)} PASS`)
