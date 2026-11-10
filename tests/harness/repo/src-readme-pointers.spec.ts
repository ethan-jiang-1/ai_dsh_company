// src/README 是“改 host/client 代码”的 owner 入口；2026-11-09 host 分组重排后
// 它仍指向旧扁平文件（host/bootstrap.ts / host/catalog.ts / host/cultivation.ts），
// 且 inject 清单漏了 workspaceRegistry。bare-path 只吃顶层目录前缀，抓不到这类相对路径。
// 证明：README 里每个 `host|client|lib/**/*.ts(x)` 反引号路径都在 src/ 下存在；
//       README 的 inject 清单与 src/index.ts 的 `export const inject` 相等。
// 不证明：README 的散文语义质量（人审兜）。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../../tools/lib/repository-layout.mjs'

const SRC = join(repositoryRoot, 'packages/company-pack/src')
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

describe('src/README owner pointers', () => {
  it('反引号里的 host/client/lib 相对路径都在场', () => {
    const paths = [...new Set(
      [...read('README.md').matchAll(/`((?:host|client|lib)\/[^`\s]+\.(?:ts|tsx))`/g)]
        .map(match => match[1]!),
    )]
    expect(paths.length).toBeGreaterThan(0)
    const missing = paths.filter(rel => !existsSync(join(SRC, rel)))
    expect(missing, `src/README 死指针：${missing.join('、')}`).toEqual([])
  })

  it('inject 清单与 src/index.ts 的公开声明相等', () => {
    const parse = (text: string) => [...text.matchAll(/'([^']+)'/g)].map(match => match[1]!).sort()
    const readme = /inject\s*=\s*\[([^\]]*)\]/.exec(read('README.md'))?.[1] ?? ''
    const code = /export const inject\s*=\s*\[([^\]]*)\]/.exec(read('index.ts'))?.[1] ?? ''
    expect(parse(readme)).toEqual(parse(code))
  })
})
