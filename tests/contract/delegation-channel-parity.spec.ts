/**
 * 通道能力 vendor-parity 钉子（Issue 1）：模型里的通道能力必须与 vendor 源码一致。
 *
 * 为什么读源码而不是 import provider 类：spawn/fork provider 只导出 `apply`，能力位在
 * 模块内部的 class 上；直接 import 会拉起 Cordis 依赖。这里用源码断言 + 固定路径，
 * 升级 pin 时若措辞/字段变了，本 spec 红，逼人重核。
 *
 * 证明什么：模型的硬能力声明（agentPreset / 上下文 / 控制面标签）与当前 pin 的 provider 契约一致。
 * 不证明：运行时会话真的拿到这些工具（那是真挂载/`request/header` 的证据）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { CHANNELS, COMPOSITIONS } from '../../tools/lib/delegation-model.mjs'

const vendor = (...parts: readonly string[]): string =>
  readFileSync(join(ROOT, 'vendor/dsh', ...parts), 'utf8')

describe('delegation channel parity with vendor providers', () => {
  it('spawn provider: agentPreset=true / fresh context', () => {
    const source = vendor('packages/subagent/subagent-spawn-in-process/src/index.ts')
    expect(source).toMatch(/agentPreset:\s*true/)
    expect(source).toMatch(/inheritsParentContext\s*=\s*false/)
    expect(CHANNELS.spawn.agentPreset).toBe(true)
    expect(CHANNELS.spawn.inheritsParentContext).toBe(false)
  })

  it('fork provider: agentPreset=false / completed-turn prefix', () => {
    const source = vendor('packages/subagent/subagent-fork-in-process/src/index.ts')
    expect(source).toMatch(/agentPreset:\s*false/)
    expect(source).toMatch(/inheritsParentContext\s*=\s*true/)
    expect(source).toMatch(/last `turn\/end`|last turn\/end|completed-turn prefix/i)
    expect(CHANNELS.fork.agentPreset).toBe(false)
    expect(CHANNELS.fork.inheritsParentContext).toBe(true)
  })

  it('team: no per-member preset; context is fresh|fork with fresh default', () => {
    const source = vendor('packages/experimental/tool-agent-team/src/index.ts')
    expect(source).toMatch(/enum:\s*\['fresh',\s*'fork'\]/)
    expect(source).toMatch(/args\.context\s*\?\?\s*'fresh'/)
    expect(CHANNELS.team.agentPreset).toBe(false)
    expect(CHANNELS.team.inheritsParentContext).toBe('optional')
    expect(CHANNELS.team.context).toBe('fresh | fork (default fresh)')
  })

  it('workflow agent() has no preset option', () => {
    const source = vendor('packages/workflow/workflow-ptc/src/runtime.ts')
    const supported = /SUPPORTED_AGENT_OPTIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(source)?.[1] ?? ''
    expect(supported).toContain("'provider'")
    expect(supported).not.toContain('agentPreset')
    expect(CHANNELS.workflow.agentPreset).toBe(false)
  })

  it('control names are labelled as native vs repo workarounds, not hard capability', () => {
    expect(CHANNELS.spawn.nativeControl).toEqual(['send_message', 'interrupt_agent'])
    expect(CHANNELS.spawn.repoControl).toEqual(['list_subagents', 'send_to_subagent'])
    expect(CHANNELS.workflow.repoControl).toEqual(['workflow_runs'])
    expect(CHANNELS.team.nativeControl).toEqual(['send_message', 'wait_agent', 'list_agents', 'interrupt_agent'])
    expect(CHANNELS.team.repoControl).toEqual([])
    expect('control' in CHANNELS.spawn).toBe(false)
  })

  it('teamLead is a preset-level expectation, named as root-only', () => {
    expect(COMPOSITIONS.ceo.teamLeadWhenRoot).toBe(true)
    expect(COMPOSITIONS.worker.teamLeadWhenRoot).toBe(false)
    expect('teamLead' in COMPOSITIONS.ceo).toBe(false)
  })
})
