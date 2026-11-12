/**
 * 参考资料 wiki 协议 skill（M1 落地卡 A2）的 keyless 判据。
 *
 * 判据：
 * ① skill 形状合法：frontmatter `name` 与目录同名、`description` 非空单行（目录只常驻这两个字段）；
 * ② body 含四节：index 先行 / 查询技术 / ingest / lint，以及只读分档的边界句；
 * ③ 六个角色 preset 都挂 `presets/_shared/wiki/skills/`——一处内容、全员可见（挂载面不靠人记）；
 * ④ 站点只此一份：没有在角色 `skills/` 下复制副本（复制 = 两份事实）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const SKILL_DIR = join(repositoryRoot, 'packages/company-pack/presets/_shared/wiki/skills/consulting-the-knowledge-map')
const PRESETS = ['ceo', 'cfo', 'cmo', 'coo', 'vp-eng', 'vp-sales']

function body(): string {
  return readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
}

describe('consulting-the-knowledge-map skill', () => {
  it('frontmatter：name 与目录同名、description 非空单行', () => {
    const text = body()
    const match = /^---\n([\s\S]*?)\n---\n/u.exec(text)
    expect(match, '缺 frontmatter').not.toBeNull()
    const head = match?.[1] ?? ''
    expect(head).toMatch(/^name: consulting-the-knowledge-map$/mu)
    const description = /^description: (.+)$/mu.exec(head)?.[1] ?? ''
    expect(description.length).toBeGreaterThan(20)
    expect(description.split('\n')).toHaveLength(1)
  })

  it('body 含 index 先行 / 查询技术 / ingest / lint / 只读边界', () => {
    const text = body()
    for (const needle of ['index.md', 'Decompose', 'Expand vocabulary', 'Ingest', 'Lint', 'read-only']) {
      expect(text, `缺 ${needle}`).toContain(needle)
    }
  })

  it('六个角色 preset 都挂 _shared/wiki/skills/', () => {
    for (const preset of PRESETS) {
      const yml = readFileSync(join(repositoryRoot, 'packages/company-pack/presets', preset, 'agent.cordis.yml'), 'utf8')
      expect(yml, `${preset} 未挂 _shared/wiki/skills/`).toContain('_shared/wiki/skills/')
    }
  })

  it('不在角色 skills/ 下留副本（一份事实）', () => {
    for (const preset of PRESETS) {
      const candidate = join(repositoryRoot, 'packages/company-pack/presets', preset, 'skills', 'consulting-the-knowledge-map')
      expect(existsSync(candidate), `${preset} 有重复副本`).toBe(false)
    }
    expect(existsSync(SKILL_DIR)).toBe(true)
    expect(readdirSync(SKILL_DIR)).toContain('SKILL.md')
  })
})
