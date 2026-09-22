import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { discoverPresets } from '../vendor/dsh/packages/preset/agent-presets/src/discovery.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PACK = join(ROOT, 'packages/company-pack')
const PRESETS_DIR = join(PACK, 'presets')
// 与源码 CLI 同域的解析锚点：apps/cli 向上走到仓库根 node_modules（workspace 链接）。
const HARNESS_BASE = pathToFileURL(join(ROOT, 'vendor/dsh/apps/cli/')).href

/** 一个 preset 目录里声明的行插件名（`name: '@deepseek-ai/...'`）。 */
function rowPlugins(role: string): string[] {
  const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
  return [...text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)].map(m => m[1] as string)
}

describe('company roster（R1 回归：preset 必须可挂载）', () => {
  it('四个角色全部被扫到，且零 broken（行插件可解析）', async () => {
    const found = await discoverPresets([{ path: PRESETS_DIR, trust: 'system' }], HARNESS_BASE)
    expect(found.map(p => p.id).sort()).toEqual(['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales'])
    // 2026-09-22 实证的失败形态：扫描得到、名字对，但行插件缺依赖 → broken → UI 给不出角色
    expect(found.filter(p => p.broken !== undefined).map(p => `${p.id}: ${String(p.broken)}`)).toEqual([])
  })

  it('preset 行引用的插件都在 pack dependencies 里（DSH verify-cordis-config 同构）', () => {
    const deps = new Set(Object.keys(JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).dependencies ?? {}))
    const missing = [...new Set(['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'].flatMap(rowPlugins))].filter(name => !deps.has(name))
    expect(missing).toEqual([])
  })

  it('四角色文案定稿（R1 两角色守卫扩展），skill 目录名与 frontmatter 一致', () => {
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      expect(readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8'), `${role} persona 仍是占位`).not.toContain('占位')
      expect(readFileSync(join(PRESETS_DIR, role, 'preset.yml'), 'utf8'), `${role} preset.yml 仍是占位`).not.toContain('占位')
      const skills = readdirSync(join(PRESETS_DIR, role, 'skills'), { withFileTypes: true }).filter(e => e.isDirectory())
      expect(skills.length, `${role} 至少 1 个 skill`).toBeGreaterThan(0)
      for (const skill of skills) {
        expect(readFileSync(join(PRESETS_DIR, role, 'skills', skill.name, 'SKILL.md'), 'utf8')).toContain(`name: ${skill.name}`)
      }
    }
  })

  it('四角色必须声明基础工具行（preset 自包含；R1 首跑：无工具行 → 读不了文件、写不出交付物）', () => {
    const required = ['tool-fs', 'tool-fs-search', 'tool-skill', 'tool-todo', 'tool-present']
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const composition = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
      const declared = new Set([...composition.matchAll(/^- id:\s*([a-z0-9-]+)$/gm)].map(m => m[1] as string))
      const missing = required.filter(row => !declared.has(row))
      expect(missing, `${role} 缺工具行：${missing.join(', ')}（preset 是自包含组合，DSH 无 patch 继承）`).toEqual([])
      expect(composition, `${role} 必须挂 skill-filesystem`).toMatch(/^- id: skill-filesystem$/m)
      expect(composition, `${role} 必须挂 persona`).toMatch(/^- id: persona$/m)
    }
  })

  it('带必填 config 的工具行必须给出配置（R1 实证：抄行名不抄 config → preset 挂载失败、UI 静默）', () => {
    // 防线一：快、进 pnpm test。字段名来自 shipped standard preset（其 Config schema 无默认值）。
    const requiredConfig: Record<string, string[]> = {
      'tool-fs-search': ['sampleOverCapGlobResults'],
      'tool-todo': ['allowParallelInProgress'],
    }
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
      for (const [row, fields] of Object.entries(requiredConfig)) {
        if (!new RegExp(`^- id: ${row}$`, 'm').test(text)) continue
        for (const field of fields) {
          expect(text, `${role} 的 ${row} 缺必填 ${field}（preset 会挂载失败）`).toContain(field)
        }
      }
    }
  })

  it('四个角色显示名共用公司前缀（D14 系列命名，R2 补角色时不许忘）', () => {
    const names = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'].map(role => {
      const match = /^name:\s*(.+)$/m.exec(readFileSync(join(PRESETS_DIR, role, 'preset.yml'), 'utf8'))
      expect(match, `${role} preset.yml 缺 name`).not.toBeNull()
      return (match as RegExpExecArray)[1]!.trim()
    })
    expect(names.every(name => name.startsWith('wochen ')), `显示名未共用 wochen 前缀：${names.join(' / ')}`).toBe(true)
  })

  it('bundle 行：agent-presets 用替换语义（覆盖 web-app 出厂行），其余新增走 insert', () => {
    const patch = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8')
    expect(patch).toMatch(/^- id: agent-presets$/m)
    expect(patch).toMatch(/^- insert:$/m)
    for (const row of ['tool-present', 'agent-team', 'tool-agent-team']) {
      expect(patch).toMatch(new RegExp(`^\\s+- id: ${row}$`, 'm'))
    }
  })

  it('roots 是 profile 相对路径（baseUrl = profile 目录，写成 presets/ 会静默扫空）', () => {
    const patch = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8')
    const match = /path:\s*!!js\s*"([^"]+)"/.exec(patch)
    expect(match, 'roots path 应为 !!js 表达式').not.toBeNull()
    const expr = (match as RegExpExecArray)[1] as string
    const fakeProfile = 'file:///tmp/dsh-profile-fixture/'
    const resolved = new Function('baseUrl', `return ${expr}`)(fakeProfile) as string
    // 2026-09-22 实证：写成 `presets/` → <profile>/presets/（不存在）→ scanRoot 静默返回空 → UI 无角色
    expect(resolved).toBe(fileURLToPath(new URL('node_modules/dsh-company-pack/presets/', fakeProfile)))
    expect(resolved).toContain('node_modules/dsh-company-pack/presets')
  })
})
