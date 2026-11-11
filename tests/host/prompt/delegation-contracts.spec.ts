/** 能力域委派政策注入：header + 通道 section，按 preset 能力 + 运行时座位选择（BUG-071/072/076/077）。 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DELEGATION_HEADER_SECTION, DELEGATION_SEAT_SECTION, DELEGATION_SECTION_PREFIX, registerDelegationContracts,
} from '../../../packages/company-pack/src/host/prompt/delegation-contracts.ts'

// 负例留证 2026-11-11：把 team 判据从 `seat.teamCollaborate` 改回 `seat.teamLead` ⇒「teammate: collaboration」
// 用例红（协作面被删）；还原 → 8 passed。BUG-077
// 负例留证 2026-11-11：把 spawn 门控从 `seat.canStartChild` 改回 `caps.spawn` ⇒「CEO teammate: no usable
// child channel」红（spawn section 回来）；还原 → 9 passed。BUG-079
// 负例留证 2026-11-11：删掉 support seat note 注入 ⇒「support root」用例红（vendor policy 无人纠正）；
// 还原 → 8 passed。BUG-076
// 负例留证 2026-11-11：把 team 只按 Lead 判（seat.teamLead）⇒ support root 会拿到 team 段；
// 与 072 的座位判据反向。还原 → 8 passed。BUG-072

const CHANNELS = ['spawn', 'fork', 'workflow', 'team', 'team-spawn', 'retry'] as const

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
  readonly depth?: number
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
    session: {
      header: {
        ...(options.parentSession === undefined ? {} : { parentSession: options.parentSession }),
        ...(options.depth === undefined ? {} : { delegationDepth: options.depth }),
      },
    },
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
  it('CEO root: collaboration + Lead-only spawn; no fork/workflow/retry', () => {
    const dir = content()
    try {
      const h = harness({ preset: 'ceo', tools: ['spawn_teammate', 'team_task_list'], role: 'lead' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([
        DELEGATION_HEADER_SECTION,
        `${DELEGATION_SECTION_PREFIX}spawn`,
        `${DELEGATION_SECTION_PREFIX}team`,
        `${DELEGATION_SECTION_PREFIX}team-spawn`,
      ])
      const header = h.sections[0]?.text ?? ''
      expect(header).toContain('spawn')
      expect(header).toContain('team collaboration')
      expect(header).toContain('team spawn (Lead only)')
      expect(header).not.toContain('workflow')
      // 安装 != 座位可用：header 不再说“未安装”，并说明工具可能仍在（BUG-071）。
      expect(header).toContain('not available to this seat')
      expect(header).not.toContain('not installed')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('COO root: spawn/fork/collaboration/Lead spawn/retry; no workflow section', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'coo',
        tools: ['subagent', 'subagent_fork', 'subagent_retry', 'spawn_teammate', 'team_task_list'],
        role: 'lead',
      })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([
        DELEGATION_HEADER_SECTION,
        `${DELEGATION_SECTION_PREFIX}spawn`,
        `${DELEGATION_SECTION_PREFIX}fork`,
        `${DELEGATION_SECTION_PREFIX}team`,
        `${DELEGATION_SECTION_PREFIX}team-spawn`,
        `${DELEGATION_SECTION_PREFIX}retry`,
      ])
      expect(h.sections.some(section => section.name.endsWith('workflow'))).toBe(false)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('vp-eng root: every channel, collaboration + Lead spawn', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'vp-eng',
        tools: ['subagent', 'subagent_fork', 'subagent_retry', 'workflow', 'spawn_teammate', 'team_task_list'],
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
        `${DELEGATION_SECTION_PREFIX}team-spawn`,
        `${DELEGATION_SECTION_PREFIX}retry`,
      ])
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('teammate: collaboration present, Lead-only spawn absent (BUG-077)', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'vp-eng',
        tools: ['subagent', 'subagent_fork', 'subagent_retry', 'workflow', 'spawn_teammate', 'team_task_list'],
        role: 'teammate',
        parentSession: 'parent',
        depth: 1,
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
      const header = h.sections[0]?.text ?? ''
      expect(header).toContain('team collaboration')
      expect(header).not.toContain('team spawn')
      // 成员版 section 的正文是协作规则，不是 Lead 的 spawn 规则。
      const teamSection = h.sections.find(section => section.name === `${DELEGATION_SECTION_PREFIX}team`)
      expect(teamSection?.text).toContain('SECTION-team')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('CEO teammate: no usable child channel ⇒ no spawn section/header (BUG-079)', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'ceo',
        tools: ['spawn_teammate', 'team_task_list', 'subagent_research', 'vp_eng'],
        role: 'teammate',
        parentSession: 'parent',
        depth: 1,
      })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([
        DELEGATION_HEADER_SECTION,
        `${DELEGATION_SECTION_PREFIX}team`,
      ])
      const header = h.sections[0]?.text ?? ''
      expect(header).toContain('team collaboration')
      expect(header).not.toContain('spawn')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('named child: no team surface (not in the roster), even with team tools on the face', () => {
    const dir = content()
    try {
      const h = harness({
        preset: 'vp-eng',
        tools: ['subagent', 'subagent_fork', 'subagent_retry', 'workflow', 'spawn_teammate', 'team_task_list'],
        role: 'none',
        parentSession: 'parent',
      })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).not.toContain(`${DELEGATION_SECTION_PREFIX}team`)
      expect(names(h)).not.toContain(`${DELEGATION_SECTION_PREFIX}team-spawn`)
      expect(names(h)).toContain(`${DELEGATION_SECTION_PREFIX}workflow`)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('support root: no header/sections except the seat correction (BUG-072/076)', () => {
    const dir = content()
    try {
      const h = harness({ preset: 'worker', tools: ['spawn_teammate', 'team_task_list'], role: 'lead' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(names(h)).toEqual([DELEGATION_SEAT_SECTION])
      const note = h.sections[0]?.text ?? ''
      expect(note).toContain('support capability seat')
      expect(note).toContain('worker')
      expect(note).toContain('team_task_*')
      expect(note).toContain('calls are refused')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('no available channel: no header/sections, no seat note for a support child', () => {
    const dir = content()
    try {
      const h = harness({ preset: 'worker', tools: [], role: 'teammate', parentSession: 'parent' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(h.sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('missing one content file: warn and inject nothing (fail-safe)', () => {
    const dir = content('team-spawn')
    try {
      const h = harness({ preset: 'vp-eng', tools: ['workflow', 'spawn_teammate'], role: 'lead' })
      registerDelegationContracts(h.ctx as never, dir)
      h.fire()
      expect(h.sections).toHaveLength(0)
      expect(h.warnings.join('\n')).toContain('delegation 政策段缺失')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
