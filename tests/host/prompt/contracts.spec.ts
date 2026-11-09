/** workflow 合同注入：只在有 workflow 工具（或 fallback preset）的 agent 里可见。 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerWorkflowContract, WORKFLOW_CONTRACT_SECTION } from '../../../packages/company-pack/src/host/prompt/contracts.ts'

function content(): string {
  const dir = mkdtempSync(join(tmpdir(), 'contracts-content-'))
  mkdirSync(join(dir, 'contracts'), { recursive: true })
  writeFileSync(join(dir, 'contracts', 'workflow.md'), '# Workflow engine contract\n\nTEST-CONTRACT\n')
  return dir
}

interface Harness {
  readonly ctx: unknown
  readonly fire: () => void
  readonly sections: Array<{ name: string; order: number; text: string }>
}

/**
 * 一个最小 agent/scope 夹具：`preset` 决定 agentPresets 的返回值，
 * `workflowTool` 决定工具面里是否有 workflow。
 */
function harness(preset: string | undefined, workflowTool: boolean): Harness {
  const sections: Array<{ name: string; order: number; text: string }> = []
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const ctx = {
    logger: { warn: () => {} },
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  }
  const presets = preset === undefined ? undefined : { composedPreset: () => preset }
  const tools = workflowTool ? { get: () => ({ name: 'workflow' }) } : undefined
  const scope = {
    get: (name: string) => name === 'agentPresets' ? presets : name === 'tools' ? tools : undefined,
    systemPrompt: {
      getSectionOrder: () => 100,
      section: (section: { name: string; order: number; text: string }) => {
        sections.push(section)
        return () => {}
      },
    },
  }
  const agent = {
    ctx: {
      get: (name: string) => name === 'agentPresets' ? presets : undefined,
      inject: (_deps: readonly string[], callback: (value: unknown) => void) => {
        callback(scope)
        return { dispose: async () => {} }
      },
    },
  }
  return {
    ctx,
    sections,
    fire: () => {
      for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
    },
  }
}

describe('registerWorkflowContract', () => {
  it('有 workflow 工具时注入 section（名字/顺序/正文）', () => {
    const dir = content()
    try {
      const h = harness('worker', true)
      registerWorkflowContract(h.ctx as never, dir, { workflowPresets: ['vp-eng'] })
      h.fire()
      expect(h.sections).toHaveLength(1)
      expect(h.sections[0]?.name).toBe(WORKFLOW_CONTRACT_SECTION)
      expect(h.sections[0]?.order).toBe(101)
      expect(h.sections[0]?.text).toContain('TEST-CONTRACT')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('没有 workflow 工具且不在 fallback 白名单 → 不注入', () => {
    const dir = content()
    try {
      const h = harness('worker', false)
      registerWorkflowContract(h.ctx as never, dir, { workflowPresets: ['vp-eng'] })
      h.fire()
      expect(h.sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('工具探测不可用但 preset 在 fallback 白名单 → 注入（vp-eng）', () => {
    const dir = content()
    try {
      const h = harness('vp-eng', false)
      registerWorkflowContract(h.ctx as never, dir, { workflowPresets: ['vp-eng'] })
      h.fire()
      expect(h.sections).toHaveLength(1)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('既无 workflow 工具也无 preset → 不注入', () => {
    const dir = content()
    try {
      const h = harness(undefined, false)
      registerWorkflowContract(h.ctx as never, dir, { workflowPresets: ['vp-eng'] })
      h.fire()
      expect(h.sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('合同文件缺失 → 告警且不注入（不炸 host）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'contracts-empty-'))
    try {
      const h = harness('vp-eng', true)
      registerWorkflowContract(h.ctx as never, dir, { workflowPresets: ['vp-eng'] })
      h.fire()
      expect(h.sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
