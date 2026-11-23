/** 公司手册注入 v3：只读内容来自 pack content/；override 优先；system prompt section 注册。 */
// 负例留证 2026-11-09：把 NON_ROLE_PRESETS 只留 ['worker'] ⇒「默认跳过整张非角色表」用例红；
// 还原 ⇒ 绿。BUG-047
// 负例留证 2026-11-23：把 readHandbook 改回 existsSync + readFileSync ⇒ BUG-342（外部 symlink 注入、中间段 symlink、目录 EISDIR）红；还原 ⇒ 绿。BUG-342
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readHandbook, registerHandbook, HANDBOOK_SECTION } from '../../../packages/company-pack/src/host/prompt/handbook.ts'
import { handbookSkipPresets } from '../../../tools/lib/company/delegation-model.mjs'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/shared/run-bundle-paths.ts'

function content(): string {
  const dir = mkdtempSync(join(tmpdir(), 'handbook-content-'))
  writeFileSync(join(dir, 'AGENTS.md'), '# 公司手册\n\n只认本手册的规则：先读再写。\n')
  return dir
}

describe('readHandbook', () => {
  it('默认读 pack content/AGENTS.md，并给出内容目录/override 规则', () => {
    const dir = content()
    try {
      const handbook = readHandbook(dir)
      expect(handbook.source).toBe(join(dir, 'AGENTS.md'))
      expect(handbook.text).toContain('只认本手册的规则')
      expect(handbook.text).toContain(`Company content (read-only): ${dir}`)
      expect(handbook.text).toContain('Pack-relative paths like `content/...`')
      expect(handbook.text).toContain('.dsh-company/overrides')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('workspace override 优先', () => {
    const dir = content()
    const workspace = mkdtempSync(join(tmpdir(), 'handbook-ws-'))
    try {
      mkdirSync(join(workspace, RUN_BUNDLE_PATHS.overrides), { recursive: true })
      writeFileSync(join(workspace, RUN_BUNDLE_PATHS.overrides, 'AGENTS.md'), '# 项目覆盖手册\n')
      const handbook = readHandbook(dir, workspace)
      expect(handbook.source).toContain('.dsh-company/overrides/AGENTS.md')
      expect(handbook.text).toContain('项目覆盖手册')
      expect(handbook.text).not.toContain('只认本手册的规则')
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true }) }
  })

  it('BUG-342：override 为外部 symlink、中间段 symlink 或目录时安全回退 pack 手册并附 warning', () => {
    const dir = content()
    const outside = mkdtempSync(join(tmpdir(), 'handbook-outside-'))
    const wsSymlink = mkdtempSync(join(tmpdir(), 'handbook-ws-sym-'))
    const wsParentSym = mkdtempSync(join(tmpdir(), 'handbook-ws-psym-'))
    const wsDir = mkdtempSync(join(tmpdir(), 'handbook-ws-dir-'))
    try {
      const secret = join(outside, 'secret.md')
      writeFileSync(secret, 'OUTSIDE_SECRET\n')
      mkdirSync(join(outside, 'dir'), { recursive: true })
      writeFileSync(join(outside, 'dir', 'AGENTS.md'), 'OUTSIDE_DIR_SECRET\n')

      // 1. 叶子 symlink 指向 workspace 外
      mkdirSync(join(wsSymlink, RUN_BUNDLE_PATHS.overrides), { recursive: true })
      symlinkSync(secret, join(wsSymlink, RUN_BUNDLE_PATHS.overrides, 'AGENTS.md'))
      const h1 = readHandbook(dir, wsSymlink)
      expect(h1.source).toBe(join(dir, 'AGENTS.md'))
      expect(h1.text).not.toContain('OUTSIDE_SECRET')
      expect(h1.text).toContain('只认本手册的规则')
      expect(h1.warning).toBeTruthy()

      // 2. 中间段 overrides 为 symlink 指向 workspace 外目录
      mkdirSync(join(wsParentSym, '.dsh-company'), { recursive: true })
      symlinkSync(join(outside, 'dir'), join(wsParentSym, RUN_BUNDLE_PATHS.overrides))
      const h2 = readHandbook(dir, wsParentSym)
      expect(h2.source).toBe(join(dir, 'AGENTS.md'))
      expect(h2.text).not.toContain('OUTSIDE_DIR_SECRET')
      expect(h2.warning).toBeTruthy()

      // 3. overrides/AGENTS.md 为目录：不抛 EISDIR，安全回退
      mkdirSync(join(wsDir, RUN_BUNDLE_PATHS.overrides, 'AGENTS.md'), { recursive: true })
      const h3 = readHandbook(dir, wsDir)
      expect(h3.source).toBe(join(dir, 'AGENTS.md'))
      expect(h3.text).toContain('只认本手册的规则')
      expect(h3.warning).toBeTruthy()
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
      rmSync(wsSymlink, { recursive: true, force: true })
      rmSync(wsParentSym, { recursive: true, force: true })
      rmSync(wsDir, { recursive: true, force: true })
    }
  })
})

describe('registerHandbook', () => {
  it('agent/created 时注册 systemPrompt section（agent 作用域）', () => {
    const dir = content()
    const sections: Array<{ name: string; text: () => string }> = []
    const listeners = new Map<string, ((payload: unknown) => void)[]>()
    const ctx = {
      logger: { warn: () => {} },
      on: (name: string, listener: (payload: unknown) => void) => {
        listeners.set(name, [...(listeners.get(name) ?? []), listener])
      },
    }
    const agent = {
      ctx: {
        inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
          callback({ systemPrompt: { section: (section: { name: string; text: () => string }) => {
            sections.push(section)
            return () => {}
          } } })
          return { dispose: async () => {} }
        },
      },
    }
    try {
      registerHandbook(ctx as never, dir)
      for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
      expect(sections).toHaveLength(1)
      expect(sections[0]?.name).toBe(HANDBOOK_SECTION)
      expect(sections[0]?.text()).toContain('只认本手册的规则')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('skipPresets：worker 不注册公司手册（执行手不是公司角色）', () => {
    const dir = content()
    const sections: Array<{ name: string }> = []
    const listeners = new Map<string, ((payload: unknown) => void)[]>()
    let injected = false
    const ctx = {
      logger: { warn: () => {} },
      on: (name: string, listener: (payload: unknown) => void) => {
        listeners.set(name, [...(listeners.get(name) ?? []), listener])
      },
    }
    const agent = {
      ctx: {
        get: (name: string) => name === 'agentPresets' ? { composedPreset: () => 'worker' } : undefined,
        inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
          injected = true
          callback({ systemPrompt: { section: (section: { name: string }) => {
            sections.push(section)
            return () => {}
          } } })
          return { dispose: async () => {} }
        },
      },
    }
    try {
      registerHandbook(ctx as never, dir, undefined, { skipPresets: ['worker'] })
      for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
      expect(injected).toBe(false)
      expect(sections).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('BUG-342：override 为目录或 symlink 时 registerHandbook 记录 warn 且不打崩注册', () => {
    const dir = content()
    const workspace = mkdtempSync(join(tmpdir(), 'handbook-reg-dir-'))
    const warnings: string[] = []
    const sections: Array<{ name: string; text: () => string }> = []
    const listeners = new Map<string, ((payload: unknown) => void)[]>()
    const ctx = {
      logger: { warn: (msg: string) => { warnings.push(msg) } },
      on: (name: string, listener: (payload: unknown) => void) => {
        listeners.set(name, [...(listeners.get(name) ?? []), listener])
      },
    }
    const agent = {
      ctx: {
        inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
          callback({ systemPrompt: { section: (section: { name: string; text: () => string }) => {
            sections.push(section)
            return () => {}
          } } })
          return { dispose: async () => {} }
        },
      },
    }
    try {
      mkdirSync(join(workspace, RUN_BUNDLE_PATHS.overrides, 'AGENTS.md'), { recursive: true })
      registerHandbook(ctx as never, dir, workspace)
      for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
      expect(warnings.some(w => w.includes('AGENTS.md') || w.includes('覆盖'))).toBe(true)
      expect(sections).toHaveLength(1)
      expect(sections[0]?.text()).toContain('只认本手册的规则')
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})

/** 注册一次 handbook，返回该 preset 被注册的 section（`agent/created` 触发）。 */
function sectionsFor(dir: string, preset: string, options?: { skipPresets?: readonly string[] }): Array<{ name: string }> {
  const sections: Array<{ name: string }> = []
  const listeners = new Map<string, ((payload: unknown) => void)[]>()
  const ctx = {
    logger: { warn: () => {} },
    on: (name: string, listener: (payload: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener])
    },
  }
  const agent = {
    ctx: {
      get: (name: string) => name === 'agentPresets' ? { composedPreset: () => preset } : undefined,
      inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
        callback({ systemPrompt: { section: (section: { name: string }) => {
          sections.push(section)
          return () => {}
        } } })
        return { dispose: async () => {} }
      },
    },
  }
  registerHandbook(ctx as never, dir, undefined, options)
  for (const listener of listeners.get('agent/created') ?? []) listener({ agent })
  return sections
}

describe('worker family 的 handbook 边界（BUG-047）', () => {
  it('默认跳过整张非角色表：worker family 与质量环能力档都不注入', () => {
    const dir = content()
    try {
      // 期望集合来自模型（不是被删窄的运行时表），这样“少跳一个 profile”会真红。
      expect([...handbookSkipPresets()]).toEqual(['worker', 'worker-researcher', 'worker-orchestrator', 'quality-loop-producer', 'quality-loop-verifier'])
      for (const preset of handbookSkipPresets()) {
        expect(sectionsFor(dir, preset), preset).toHaveLength(0)
      }
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('full role 仍注入；显式 skipPresets 仍是覆盖旋钮', () => {
    const dir = content()
    try {
      expect(sectionsFor(dir, 'vp-eng')).toHaveLength(1)
      expect(sectionsFor(dir, 'ceo', { skipPresets: ['ceo'] })).toHaveLength(0)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
