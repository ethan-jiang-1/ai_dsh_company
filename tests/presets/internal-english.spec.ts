/**
 * Preset skill 正文的英文单份棘轮（I1，keyless）。
 *
 * 为什么：内部全英文是目标，但内容量大，不能一口翻完。这里维护一份
 * **待翻译 allowlist**：allowlist 之外的 SKILL.md 正文不得含中文；每翻完一个就从
 * allowlist 删除，最终 allowlist 为空 = 硬门禁。新增中文 skill 会立刻红。
 *
 * 不检查：persona/agent.cordis.yml（下一步单独棘轮）、content/**（独立文件）、
 * 翻译语义质量（需人工/回放审，grep 不能代替）。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const CJK = /[\u3400-\u9fff]/u
const ROOT = repositoryRoot
const PILOT = 'packages/company-pack/presets/vp-sales/skills/customer-voice/SKILL.md'

/** 待翻译的 preset skill（相对仓库根）；每翻完一个就删一行。 */
const PENDING = new Set([
  'packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md',
  'packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md',
])


/** 递归找 presets 下所有 SKILL.md（相对仓库根，posix 分隔）。 */
function skillFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...skillFiles(full))
    else if (entry.name === 'SKILL.md') out.push(relative(ROOT, full).split('\\').join('/'))
  }
  return out
}

describe('preset skill 正文英文棘轮（I1）', () => {
  it('pilot 已翻成英文，且 allowlist 不把它算作待翻译', () => {
    const text = readFileSync(join(ROOT, PILOT), 'utf8')
    expect(text).not.toMatch(CJK)
    expect(PENDING.has(PILOT)).toBe(false)
  })

  it('allowlist 之外不得出现中文 skill；allowlist 内文件仍存在', () => {
    const all = skillFiles(join(ROOT, 'packages/company-pack/presets'))
    const missing: string[] = []
    for (const file of PENDING) {
      if (!all.includes(file)) missing.push(file)
    }
    expect(missing, `allowlist 指向不存在的文件：\n${missing.join('\n')}`).toEqual([])

    const offenders: string[] = []
    for (const file of all) {
      if (PENDING.has(file)) continue
      if (CJK.test(readFileSync(join(ROOT, file), 'utf8'))) offenders.push(file)
    }
    expect(offenders, `以下 skill 不在待翻译 allowlist，但正文仍有中文：\n${offenders.join('\n')}`).toEqual([])
  })
})
