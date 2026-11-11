/** 能力域委派政策注入：header + 五段 section，按 preset 能力 + Lead 座位选择。 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DELEGATION_HEADER_SECTION, DELEGATION_SECTION_PREFIX, registerDelegationContracts,
} from '../../../packages/company-pack/src/host/prompt/delegation-contracts.ts'

const CHANNELS = ['spawn', 'fork', 'workflow', 'team', 'retry'] as const

function content(missing?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'delegation-contracts-'))
  mkdirSync(join(dir, 'contracts', 'delegation'), { recursive: true })
  for (const channel of CHANNELS) {
    if (channel === missing) continue
    writeFileSync(join(dir, 'contracts', 'delegation', `${channel}.md`), `SECTION-${channel}\n`)
  }
  return dir
}

interface HarnessOptions {
  readonly preset?: string
  readonly tools?: readonly string[]
  readonly role?: 'lead' | 'teammate' | 'none'
  readonly parentSession?: string
}

interface Harness {
  readonly ctx: unknown
  readonly fire: () => void
  readonly sections: Array<{ name: string; order: number; text: string }>
  readonly warnings: string[]
}

function harness(options: HarnessOptions): Harness {
  const sections: Array<{ name: string; order: number; text: string }> = []
  const warnings: string[] = []
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const tools = new Set(options.tools ?? [])
  const ctx = {
    logger: { warn: (message: string) => { warnings.push(message) } },
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  }
  const presets = options.preset === undefined ? undefined : { composedPreset: () => options.preset }
  const scope = {
    get: (name: string) => {
      if (name === 'agentPresets') return presets
      if (name === 'tools') return { get: (toolName: string) => tools.has(toolName) ? { name: toolName } : undefined }
      return undefined
    },
    systemPrompt: {
      getSectionOrder: () => 2800,
      section: (section: { name: string; order: number; text: string }) => {
        sections.push(section)
        return () => {}
      },
    },
    effect: (callback: () => () => unknown) => { callback() },
  }
  const agent = {
    ctx: {
      get: (name: string) => {
        if (name === 'agentPresets') return presets
        if (name === 'agentTeams') {
          return { tryMembership: () => options.role === 'none' ? undefined : { role: options.role ?? 'lead' } }
        }
        return undefined
      },
      inject: (_deps: readonly string[], callback: (value: unknown) => void) => { callback(scope) },
    },
    session: { header: options.parentSession === undefined ? {} : { parentSession: options.parentSession } },
  }
  return {
    ctx,
    sections,
    warnings,
    fire: () => {
      for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
    },
  }
}

const names = (h: Harness): string[] => h.sections.map(section => section.name)

describe('registerDelegationContracts', () => {
  it('CEO root: header + spawn + team; no fork/workflow/retry', () => {
    const dir = content()
    try {
      const h = harness({ preset: 'ceo', tools: ['spawn_teammate'], role: 'lead' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([
        DELEGATION_HEADER_SECTION,
        `${DELEGATION_SECTION_PREFIX}spawn`,
        `${DELEGATION_SECTION_PREFIX}team`,
      ])
      expect(h.sections[0]?.text).toContain('spawn')
      expect(h.sections[0]?.text).toContain('team (Lead only)')
      expect(h.sections[0]?.text).not.toContain('workflow')
      // 安装 != 座位可用：header 不再说“未安装”，并说明工具可能仍在（BUG-071）。
      expect(h.sections[0]?.text).toContain('not available to this seat')
      expect(h.sections[0]?.text).not.toContain('not installed')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('COO root: header + spawn/fork/team/retry; no workflow section', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'coo', tools: ['subagent', 'subagent_fork', 'subagent_retry', 'spawn_teammate'], role: 'lead',
      })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([
        DELEGATION_HEADER_SECTION,
        `${DELEGATION_SECTION_PREFIX}spawn`,
        `${DELEGATION_SECTION_PREFIX}fork`,
        `${DELEGATION_SECTION_PREFIX}team`,
        `${DELEGATION_SECTION_PREFIX}retry`,
      ])
      expect(h.sections.some(section => section.name.endsWith('workflow'))).toBe(false)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('vp-eng root: all five channels', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'vp-eng',
        tools: ['subagent', 'subagent_fork', 'subagent_retry', 'workflow', 'spawn_teammate'],
        role: 'lead',
      })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([
        DELEGATION_HEADER_SECTION,
        `${DELEGATION_SECTION_PREFIX}spawn`,
        `${DELEGATION_SECTION_PREFIX}fork`,
        `${DELEGATION_SECTION_PREFIX}workflow`,
        `${DELEGATION_SECTION_PREFIX}team`,
        `${DELEGATION_SECTION_PREFIX}retry`,
      ])
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('named child vp-eng: no team section (not Lead), even with spawn_teammate tool', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'vp-eng',
        tools: ['subagent', 'subagent_fork', 'subagent_retry', 'workflow', 'spawn_teammate'],
        role: 'teammate',
        parentSession: 'parent',
      })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).not.toContain(`${DELEGATION_SECTION_PREFIX}team`)
      expect(names(h)).toContain(`${DELEGATION_SECTION_PREFIX}workflow`)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('worker root: no header/sections (support seat, not a team seat)', () => {
    const dir = content()
    try {
      const h = harness({ preset: 'worker', tools: ['spawn_teammate'], role: 'lead' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      // 引擎 root=Lead、团队工具也在场，但 support preset 不是 team 座位（BUG-072）。
      expect(h.sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('no available channel: no header/sections', () => {
    const dir = content()
    try {
      const h = harness({ preset: 'worker', tools: [], role: 'teammate', parentSession: 'parent' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(h.sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('missing one content file: warn and inject nothing (fail-safe)', () => {
    const dir = content('team')
    try {
      const h = harness({ preset: 'vp-eng', tools: ['workflow', 'spawn_teammate'], role: 'lead' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(h.sections).toHaveLength(0)
      expect(h.warnings.join('\n')).toContain('delegation 政策段缺失')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
