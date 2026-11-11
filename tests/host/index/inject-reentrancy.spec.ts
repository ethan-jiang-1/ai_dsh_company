/**
 * BUG-074 的证伪与钉子：`ctx.inject` 的 callback 在 required service **re-provide**（provider
 * fiber 卸载、新 fiber 再 provide）时会 unload 再 re-run（vendor cordis `registry.ts:168`-`180`）。
 * 本 spec 用真 `Context` 做两件事：
 *
 * ① 证伪「Agent 级 WeakSet 会挡掉重装」——WeakSet 在位时，`systemPrompt`/`tools` 重挂仍会重装
 *    （WeakSet 只去重重复的 `agent/created`，不挡 fiber 重跑）。
 * ② 解释卡里的复现读数——`ctx.set(name, value)` 只覆盖同一 provider 的值，**不**通知依赖重跑；
 *    那不是 re-provide。新服务里为空是 set 的语义，不是 WeakSet 吞了安装。
 *
 * 不主张：真 systemPrompt/tools 服务的 effect 所有权细节（假件只记录调用）；真 profile 装配
 * （那归 preset-smoke / delegation-smoke）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '../../../vendor/dsh/vendor/cordis/src/index.ts'
import { registerDelegationContracts, DELEGATION_HEADER_SECTION } from '../../../packages/company-pack/src/host/prompt/delegation-contracts.ts'
import { registerWorkflowContract, WORKFLOW_CONTRACT_SECTION } from '../../../packages/company-pack/src/host/prompt/contracts.ts'
import { registerWorkflowRuns } from '../../../packages/company-pack/src/host/delegation/workflow-runs.ts'
import { registerDelegationControl } from '../../../packages/company-pack/src/host/delegation/delegation-control.ts'

// 负例留证 2026-11-11：把 delegation-contracts 的 WeakSet 从 `agent/created` 外层挪进 inject
// callback（即 BUG-074 原假设的形状）→ 本文件「delegation contracts」用例 1 failed / 5 passed；
// 还原 → 6 passed。证明本 spec 挡的是“把 Agent 键放进可重入 callback”，不是 `ctx.set` 读数。

const CHANNELS = ['spawn', 'fork', 'workflow', 'team', 'retry'] as const

interface Section {
  name: string
  order: number
  text: string
}

interface PromptService {
  sections: Section[]
  getSectionOrder: () => number
  section: (section: Section) => void
}

/** 假 systemPrompt：同名 section 重复注册直接抛（暴露重复安装，而不是静默覆盖）。 */
function promptService(): PromptService {
  const sections: Section[] = []
  return {
    sections,
    getSectionOrder: () => 2800,
    section: (section: Section) => {
      if (sections.some(existing => existing.name === section.name)) {
        throw new Error(`duplicate section ${section.name}`)
      }
      sections.push(section)
    },
  }
}

interface FakeTool {
  name: string
}

interface ToolsService {
  registered: Map<string, FakeTool>
  get: (name: string) => FakeTool | undefined
  register: (tool: FakeTool) => () => void
  guard: (guard: unknown) => () => void
}

/** 假 tools 面：固定工具名集合 + register/get，足够让三处注入与 control 面跑起来。 */
function toolsService(names: readonly string[]): ToolsService {
  const registered = new Map<string, FakeTool>()
  const fixed = new Set(names)
  return {
    registered,
    get: name => fixed.has(name) || registered.has(name) ? { name } : undefined,
    register: (tool) => {
      if (registered.has(tool.name)) throw new Error(`duplicate tool ${tool.name}`)
      registered.set(tool.name, tool)
      return () => { registered.delete(tool.name) }
    },
    guard: () => () => {},
  }
}

function contentDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'inject-reentrancy-'))
  mkdirSync(join(dir, 'contracts', 'delegation'), { recursive: true })
  for (const channel of CHANNELS) {
    writeFileSync(join(dir, 'contracts', 'delegation', `${channel}.md`), `SECTION-${channel}\n`)
  }
  writeFileSync(join(dir, 'contracts', 'workflow.md'), '# Workflow engine contract\n')
  return dir
}

const wait = (): Promise<void> => new Promise(resolve => { setImmediate(resolve) })

interface Mount {
  dispose(): Promise<void>
  /** `ctx.set` on the provider fiber: 覆盖值，不卸载/不重挂。 */
  set(value: unknown): void
}

/** 把一项服务挂到独立 provider fiber 上；dispose 即卸载（真的 re-provide 形状）。 */
async function mountService(ctx: Context, name: string, value: unknown): Promise<Mount> {
  let provider: Context | undefined
  const fiber = ctx.plugin({
    apply(child: Context) {
      provider = child
      child.provide(name, value as never)
    },
  })
  await fiber
  if (provider === undefined) throw new Error('provider did not mount')
  const owner = provider
  return {
    dispose: async () => { await fiber.dispose() },
    set: (next: unknown) => { owner.set(name, next as never) },
  }
}

interface Harness {
  ctx: Context
  agent: { ctx: Context; session: { header: Record<string, never> } }
  tools: ToolsService
  prompts: PromptService
  mounts: Record<'systemPrompt' | 'tools' | 'agentPresets' | 'agentTeams', Mount>
}

async function harness(): Promise<Harness> {
  const ctx = new Context()
  const prompts = promptService()
  const tools = toolsService(['workflow', 'subagent', 'subagent_fork', 'subagent_retry', 'spawn_teammate'])
  const mounts = {
    systemPrompt: await mountService(ctx, 'systemPrompt', prompts),
    tools: await mountService(ctx, 'tools', tools),
    agentPresets: await mountService(ctx, 'agentPresets', { composedPreset: () => 'vp-eng' }),
    agentTeams: await mountService(ctx, 'agentTeams', { tryMembership: () => ({ role: 'lead' }) }),
  }
  const agent = { ctx, session: { header: {} } }
  return { ctx, agent, tools, prompts, mounts }
}

describe('per-agent inject 生命周期：re-provide ≠ ctx.set（BUG-074）', () => {
  it('delegation contracts: systemPrompt re-provide 后 header/段重新注入（WeakSet 不挡）', async () => {
    const dir = contentDir()
    const h = await harness()
    try {
      registerDelegationContracts(h.ctx, dir)
      h.ctx.emit('agent/created', { agent: h.agent })
      await wait()
      expect(h.prompts.sections.map(section => section.name)).toContain(DELEGATION_HEADER_SECTION)

      await h.mounts.systemPrompt.dispose()
      await wait()
      const next = promptService()
      h.mounts.systemPrompt = await mountService(h.ctx, 'systemPrompt', next)
      await wait()
      const names = next.sections.map(section => section.name)
      expect(names).toContain(DELEGATION_HEADER_SECTION)
      expect(names).toContain('company:delegation-workflow')
    } finally {
      rmSync(dir, { recursive: true, force: true })
      await h.ctx.fiber.dispose()
    }
  })

  it('workflow contract: systemPrompt re-provide 后合同 section 重新注入', async () => {
    const dir = contentDir()
    const h = await harness()
    try {
      registerWorkflowContract(h.ctx, dir)
      h.ctx.emit('agent/created', { agent: h.agent })
      await wait()
      expect(h.prompts.sections.map(section => section.name)).toContain(WORKFLOW_CONTRACT_SECTION)

      await h.mounts.systemPrompt.dispose()
      await wait()
      const next = promptService()
      h.mounts.systemPrompt = await mountService(h.ctx, 'systemPrompt', next)
      await wait()
      expect(next.sections.map(section => section.name)).toContain(WORKFLOW_CONTRACT_SECTION)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      await h.ctx.fiber.dispose()
    }
  })

  it('workflow_runs: tools re-provide 后工具重新注册', async () => {
    const h = await harness()
    try {
      registerWorkflowRuns(h.ctx)
      h.ctx.emit('agent/created', { agent: h.agent })
      await wait()
      expect(h.tools.registered.has('workflow_runs')).toBe(true)

      await h.mounts.tools.dispose()
      await wait()
      const next = toolsService(['workflow', 'subagent', 'subagent_fork', 'subagent_retry', 'spawn_teammate'])
      h.mounts.tools = await mountService(h.ctx, 'tools', next)
      await wait()
      expect(next.registered.has('workflow_runs')).toBe(true)
    } finally {
      await h.ctx.fiber.dispose()
    }
  })

  it('delegation control: fibers map 不阻塞 tools re-provide 后的重装', async () => {
    const h = await harness()
    try {
      registerDelegationControl(h.ctx)
      h.ctx.emit('agent/created', { agent: h.agent })
      await wait()
      expect(h.tools.registered.has('list_subagents')).toBe(true)

      await h.mounts.tools.dispose()
      await wait()
      const next = toolsService(['workflow', 'subagent', 'subagent_fork', 'subagent_retry', 'spawn_teammate'])
      h.mounts.tools = await mountService(h.ctx, 'tools', next)
      await wait()
      expect(next.registered.has('list_subagents')).toBe(true)
      expect(next.registered.has('send_to_subagent')).toBe(true)
    } finally {
      await h.ctx.fiber.dispose()
    }
  })

  it('ctx.set 只换值、不通知依赖：新服务为空是 set 语义，不是安装被吞', async () => {
    const dir = contentDir()
    const h = await harness()
    try {
      registerWorkflowRuns(h.ctx)
      registerDelegationContracts(h.ctx, dir)
      h.ctx.emit('agent/created', { agent: h.agent })
      await wait()
      expect(h.tools.registered.has('workflow_runs')).toBe(true)

      const replacement = toolsService(['workflow'])
      h.mounts.tools.set(replacement)
      await wait()
      // set 不触发 inject callback：新 tools 里没有工具；旧面仍持有注册。
      expect(replacement.registered.size).toBe(0)
      expect(h.tools.registered.has('workflow_runs')).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      await h.ctx.fiber.dispose()
    }
  })

  it('重复 agent/created：WeakSet 保证只建一个 inject fiber（同名 section 不重复）', async () => {
    const dir = contentDir()
    const h = await harness()
    try {
      registerDelegationContracts(h.ctx, dir)
      h.ctx.emit('agent/created', { agent: h.agent })
      h.ctx.emit('agent/created', { agent: h.agent })
      await wait()
      const names = h.prompts.sections.map(section => section.name)
      expect(names.filter(name => name === DELEGATION_HEADER_SECTION)).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      await h.ctx.fiber.dispose()
    }
  })
})
