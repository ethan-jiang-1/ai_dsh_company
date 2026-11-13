// owner 文档的相对路径守卫：src/README + host/README + pack README。
// 背景（2026-11-11）：host 分组重排后 src/README 仍指向旧扁平文件；只修一次会再漂。
// 证明：src 文档里的 `host|client/**/*.ts(x)`、pack README 里的 `content|presets/**` 都存在；
//       src/README 的 inject 与 src/index.ts 相等。
// 不证明：生成物 `lib/**`（fresh clone 未构建时不存在，不能当源文件断言）；也不证明散文语义。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const PACK = join(repositoryRoot, 'packages/company-pack')
const SRC = join(PACK, 'src')

/** 反引号里的相对源路径；跳过占位符/模板/构建产物。 */
function relativePaths(text: string, prefix: RegExp): string[] {
  return [...new Set(
    [...text.matchAll(/`([^`\n]+)`/g)]
      .map(match => match[1]!)
      .filter(rel => prefix.test(rel))
      .filter(rel => /\.(ts|tsx|js|mjs|md|json|yml)$/.test(rel))
      .filter(rel => !/[<*$]|\.\.\./.test(rel)),
  )]
}

function markdownFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) return markdownFiles(join(dir, entry.name), rel)
    return entry.name.endsWith('.md') ? [rel] : []
  })
}

describe('owner 文档相对路径', () => {
  it('src 下 host/client 源路径都在场（lib/ 是生成物，不在此断言）', () => {
    const missing: string[] = []
    for (const rel of markdownFiles(SRC)) {
      for (const path of relativePaths(readFileSync(join(SRC, rel), 'utf8'), /^(host|client)\//)) {
        if (!existsSync(join(SRC, path))) missing.push(`${rel}: ${path}`)
      }
    }
    expect(missing, `src owner 文档死指针：${missing.join('、')}`).toEqual([])
  })

  it('pack README 的 content/presets 路径都在包内', () => {
    const missing = relativePaths(readFileSync(join(PACK, 'README.md'), 'utf8'), /^(content|presets)\//)
      .filter(rel => !existsSync(join(PACK, rel)))
    expect(missing, `pack README 死指针：${missing.join('、')}`).toEqual([])
  })

  it('inject 清单与 src/index.ts 的公开声明相等', () => {
    const parse = (text: string) => [...text.matchAll(/'([^']+)'/g)].map(match => match[1]!).sort()
    const readme = /inject\s*=\s*\[([^\]]*)\]/.exec(readFileSync(join(SRC, 'README.md'), 'utf8'))?.[1] ?? ''
    const code = /export const inject\s*=\s*\[([^\]]*)\]/.exec(readFileSync(join(SRC, 'index.ts'), 'utf8'))?.[1] ?? ''
    expect(parse(readme)).toEqual(parse(code))
  })
})
