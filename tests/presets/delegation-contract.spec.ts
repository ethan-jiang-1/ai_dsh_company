import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { FULL_ROLE_IDS, SUPPORT_PRESET_IDS } from '../../tools/lib/delegation-model.mjs'

const PRESETS = join(ROOT, 'packages/company-pack/presets')
const POLICY = join(PRESETS, '_shared/delegation/skills/delegation-policy/SKILL.md')
const ROLE_YML = (role: string): string => readFileSync(join(PRESETS, role, 'agent.cordis.yml'), 'utf8')

describe('delegation-policy：共享委派政策（P2 单一政策家）', () => {
  it('skill 是 core：关键政策节齐全、通道细节交给 capability section、未超 8192 字符', () => {
    expect(existsSync(POLICY), '缺 delegation-policy/SKILL.md').toBe(true)
    const skill = readFileSync(POLICY, 'utf8')
    expect(skill).toContain('name: delegation-policy')
    for (const section of ['默认自己做', 'brief 四要素', 'effort 预算', '链设计', '结果可读性', '三条硬规则']) {
      expect(skill, `policy 缺「${section}」`).toContain(section)
    }
    expect(skill, 'core 必须指向 capability header').toContain('capability header')
    expect(skill, 'core 必须指向注入的 channel section').toContain('company:delegation-')
    expect(skill, '通道细节不该回 core（由 section 注入）').not.toMatch(/subagent_fork|spawn_teammate|subagent_retry/)
    expect(skill, 'core 不该复述引擎细节（schema/spill）').not.toMatch(/UNSUPPORTED_SCHEMA|maxResultChars|spill/)
    expect([...skill].length, '共享 skill 超过 pruner 8192 字符阈值').toBeLessThan(8192)
  })

  it('六个 full role 都挂 delegation 共享根，并在 persona 点名先加载', () => {
    for (const role of FULL_ROLE_IDS) {
      const yml = ROLE_YML(role)
      expect(yml, `${role} 没挂 delegation 共享根`).toContain('presets/_shared/delegation/skills/')
      const personaAt = yml.indexOf('prefix: |-')
      expect(personaAt, `${role} 缺 persona`).toBeGreaterThan(-1)
      expect(yml.slice(personaAt), `${role} persona 没点名 delegation-policy`).toContain('delegation-policy')
    }
  })

  it('worker 不挂 delegation 共享根（它们不委派）', () => {
    for (const preset of SUPPORT_PRESET_IDS) {
      expect(ROLE_YML(preset), `${preset} 不该挂 delegation 共享根`).not.toContain('presets/_shared/delegation/skills/')
    }
  })

  it('其他角色 skill 不被误放进 delegation 根（单一用途）', () => {
    const dir = join(PRESETS, '_shared/delegation/skills')
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
    expect(entries).toEqual(['delegation-policy'])
  })
})
