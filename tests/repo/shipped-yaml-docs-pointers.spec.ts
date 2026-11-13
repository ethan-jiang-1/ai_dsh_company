/**
 * 随包 YAML 注释里的仓库文档指针必须存在（2026-11-11 接手审计 Y4）。
 *
 * 为什么：`cordis.patch.yml` 是 tarball 里的文件，注释指向 `docs/release.md`，但该文件已搬到
 * `docs/contracts/release.md`；`bare-path` 只扫 Markdown，注释里的死指针一直看不见。
 * 判据 = pack 内 `.yml/.yaml` 注释里的 `docs/...` 路径逐个存在；只查 docs（vendor 相对路径
 * 如 `vendor packages/...` 不在此列，避免把上游相对路径误判成仓库根路径）。
 *
 * 证明不了：注释在安装后的 tarball 里是否可达（注释不是运行时面）；只证明维护者手边有该文件。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const yamlFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const child = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...yamlFiles(child))
    else if (/\.ya?ml$/.test(entry.name)) out.push(child)
  }
  return out
}

const DOC_PATH = /docs\/[A-Za-z0-9_./-]+/g

describe('随包 YAML 注释的 docs 指针', () => {
  it('每个 docs/... 指针都能在仓库里解析', () => {
    const problems: string[] = []
    for (const file of yamlFiles(join(ROOT, 'packages/company-pack'))) {
      const rel = relative(ROOT, file)
      readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        if (!line.trimStart().startsWith('#')) return
        for (const match of line.matchAll(DOC_PATH)) {
          const target = match[0].replace(/[.,;:]+$/, '')
          if (!existsSync(join(ROOT, target))) problems.push(`${rel}:${String(index + 1)} → ${target}`)
        }
      })
    }
    expect(problems).toEqual([])
  })
})
