/**
 * 事实/假设标签的英文 canonical 棘轮（I1b）。
 *
 * 为什么：`【事实】/【假设】` 是跨模板/章程/共享 skill 的证据约定，不是单点文案；
 * 中文标签回潮会让新内容重新分叉。这里只扫固定的内容面，不扫全仓。
 * 不证明：模型是否真的按标签写；语义审/回放另做。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const ROOT = repositoryRoot
const FILES = [
  'packages/company-pack/content/templates/mrd.md',
  'packages/company-pack/content/templates/prd.md',
  'packages/company-pack/content/templates/decision-memo.md',
  'packages/company-pack/content/templates/meta.md',
  'packages/company-pack/content/charters/cmo.md',
  'packages/company-pack/presets/_shared/skills/product-definition/SKILL.md',
  'packages/company-pack/presets/_shared/skills/product-definition/references/hardware-software.md',
]
const OLD = /【事实】|【假设】|【事实\/假设】/

describe('fact/assumption 标签 canonical', () => {
  it('固定内容面不再出现中文标签', () => {
    const offenders = FILES.filter(file => OLD.test(readFileSync(join(ROOT, file), 'utf8')))
    expect(offenders, `以下文件仍用中文事实/假设标签：\n${offenders.join('\n')}`).toEqual([])
  })

  it('至少一处英文 canonical 标签在场（防止只删不补）', () => {
    const text = FILES.map(file => readFileSync(join(ROOT, file), 'utf8')).join('\n')
    expect(text).toContain('[fact]')
    expect(text).toContain('[assumption]')
  })
})
