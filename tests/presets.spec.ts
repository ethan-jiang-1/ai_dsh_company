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

/** 一个 preset 目录里声明的行插件名（`name: '@deepseek-ai/...'`），按包名归一（去 subpath）。 */
function rowPlugins(role: string): string[] {
  const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
  // 行名可带 subpath（`@scope/pkg/sub`，如 tool-subagent-control/list-agents）；
  // dependencies 里登记的是包名，所以按 `@scope/name` 归一后再比对（R3 实证）。
  return [...text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)]
    .map(m => /^(@[^/]+\/[^/]+)/.exec(m[1] as string)?.[1] ?? (m[1] as string))
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

  it('CEO 汇报线（R3）：命名委托工具是 one-shot 前台；续驶控制行不得回填（team shadow 实证）', () => {
    const ceo = readFileSync(join(PRESETS_DIR, 'ceo', 'agent.cordis.yml'), 'utf8')
    // 每个直接汇报对象一个 distinct toolName（per-instance persona 教义）。
    for (const tool of ['vp_eng', 'vp_sales']) {
      const match = new RegExp(`toolName: ${tool}([\\s\\S]*?)(?=\\n\\s*- id: |$)`).exec(ceo)
      expect(match, `CEO 缺命名委托工具 ${tool}`).not.toBeNull()
      const block = (match as RegExpExecArray)[1] as string
      // R3 实证：CEO 会话从第一帧起就是 team-scoped，团队版 send_message/list_agents/
      // interrupt_agent 按成员**名字**寻址 ⇒ subagent child 无法被续驶。所以命名委托必须是
      // one-shot 前台（拿结果），不能是 continuable（会生出管不了的孤儿 child）。
      expect(block, `${tool} 必须 one-shot（continuable 的续驶在 CEO 会话里不可用）`).toContain('backgroundMode: one-shot')
      expect(block, `${tool} 必须关掉 run_in_background（没有 job_output 工具可收后台 one-shot）`).toContain('enableRunInBackground: false')
      expect(block, `${tool} 缺 per-instance persona`).toContain('persona: |-')
      expect(block, `${tool} 缺 maxDepth（禁止 VP→VP 平级派活）`).toContain('maxDepth: 1')
    }
    // 反向守卫：这两个控制行在 CEO 会话里会被团队版 shadow（是死行），别再"修"回来。
    expect(ceo, 'tool-subagent-control 在 CEO 会话被 team shadow，是死行（见 docs/delegation.md）')
      .not.toMatch(/^\s*- id: tool-subagent-control$/m)
    expect(ceo, 'list-agents 同理是死行')
      .not.toMatch(/^\s*- id: tool-subagent-list-agents$/m)
  })

  it('公司手册（模型可见）覆盖五角色职责边界、路由与升级规则——不随内容改动悄悄失效', () => {
    const handbook = readFileSync(join(ROOT, 'company-workspace/AGENTS.md'), 'utf8')
    for (const role of ['CEO', 'CFO', 'VP-Sales', 'VP-Eng', 'COO']) {
      expect(handbook, `手册缺 ${role} 的职责边界`).toContain(role)
    }
    for (const section of ['职责边界', '这事问谁', '冲突与升级', '承诺权']) {
      expect(handbook, `手册缺「${section}」节`).toContain(section)
    }
    // 路由必须回答高频冲突：数字口径（毛利/成本）与排期/交付日期该找谁
    expect(handbook).toMatch(/毛利/)
    expect(handbook).toMatch(/交付日期|排期/)
  })
})
