/**
 * wiki 模板（M1 落地卡 A1）的 keyless 判据。
 *
 * 判据：
 * ① 五件齐全：AGENTS.md / index.md / log.md / 概念页 / README；
 * ② 示例页是可学的样本——有 `type`（OKF 唯一必需键）与 `description`；
 * ③ index 真的指到示例页（链接目标在盘上），log 有日期标题；
 * ④ 协议本体（AGENTS.md）讲清 index/log 与 ingest/query/lint 四件事；
 * ⑤ 模板是「拷贝即可用」的：不含指向仓库内绝对路径的链接。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const DIR = join(repositoryRoot, 'packages/company-pack/content/wiki-template')

function text(rel: string): string {
  return readFileSync(join(DIR, rel), 'utf8')
}

/** 解析最简 YAML frontmatter（只认 `key: value`，够验 wiki 页形状）。 */
function frontmatter(rel: string): Record<string, string> {
  const body = text(rel)
  const match = /^---\n([\s\S]*?)\n---\n/u.exec(body)
  const head = match?.[1]
  if (head === undefined) return {}
  const out: Record<string, string> = {}
  for (const line of head.split('\n')) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/u.exec(line)
    const key = kv?.[1]
    if (key !== undefined) out[key] = (kv?.[2] ?? '').trim()
  }
  return out
}

describe('content/wiki-template', () => {
  it('五件齐全', () => {
    for (const rel of ['AGENTS.md', 'index.md', 'log.md', 'README.md', 'concepts/example-concept.md', 'sources/README.md']) {
      expect(existsSync(join(DIR, rel)), `缺 ${rel}`).toBe(true)
    }
  })

  it('示例页有 type 与 description（OKF 最小合规面）', () => {
    const head = frontmatter('concepts/example-concept.md')
    expect(head.type).toBeTruthy()
    expect(head.description).toBeTruthy()
  })

  it('index 指到示例页，且链接目标在盘上', () => {
    const index = text('index.md')
    expect(index).toContain('(./concepts/example-concept.md)')
    const target = /\]\(\.\/(concepts\/example-concept\.md)\)/u.exec(index)
    expect(target?.[1]).toBe('concepts/example-concept.md')
    expect(existsSync(join(DIR, target?.[1] ?? ''))).toBe(true)
  })

  it('log 以 ISO 日期标题开头（追加式历史的最小形状）', () => {
    expect(text('log.md')).toMatch(/^## \d{4}-\d{2}-\d{2}$/mu)
  })

  it('协议讲清 index / log / ingest / query / lint', () => {
    const protocol = text('AGENTS.md')
    for (const word of ['index.md', 'log.md', 'Ingest', 'Query', 'Lint']) {
      expect(protocol, `协议缺 ${word}`).toContain(word)
    }
  })

  it('模板自包含：不出现仓库内绝对路径（.dsh-company 只作边界反例被提，不作链接目标）', () => {
    const files = ['AGENTS.md', 'index.md', 'log.md', 'README.md', 'concepts/example-concept.md', 'sources/README.md']
    for (const rel of files) {
      expect(text(rel), `${rel} 含绝对 home 路径`).not.toMatch(/\/Users\/[a-z]/u)
    }
  })

  it('拷贝命令是安装视角可执行的，不再给仓库相对路径', () => {
    const readme = text('README.md')
    expect(readme).toContain('node_modules/dsh-company-pack/content/wiki-template')
    expect(readme).not.toContain('packages/company-pack/content/wiki-template')
    expect(existsSync(join(DIR, 'README.md'))).toBe(true)
  })
})
