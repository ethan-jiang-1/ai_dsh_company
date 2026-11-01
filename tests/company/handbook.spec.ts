/** 公司手册注入 v3：只读内容来自 pack content/；override 优先；system prompt section 注册。 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readHandbook, registerHandbook, HANDBOOK_SECTION } from '../../packages/company-pack/src/host/handbook.ts'
import { RUN_BUNDLE_PATHS } from '../../packages/company-pack/src/lib/run-bundle-paths.ts'

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
})
