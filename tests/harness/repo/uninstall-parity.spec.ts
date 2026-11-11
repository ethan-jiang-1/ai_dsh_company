/**
 * 卸载残留清单单一事实（2026-11-11 接手审计 Y2）。
 *
 * 为什么：pack README 是 npm 页面、`_dist/安装手册.md` 是收件人完整手册；两处各写一份
 * 「彻底删除」命令，README 曾只列 3 条而漏掉 lease/日志/检索索引（手册 6 条）。
 * 判据 = 两处 `rm` 路径集合相等且覆盖三类易漏残留；手册是生成物，唯一模板 = tools/lib/install-manual.mjs。
 *
 * 证明不了：命令在真实 home/workspace 上可执行（归 release-smoke 的卸载节）；
 * 只证明两处文档不再各说一套。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')
const rmPaths = (text: string): string[] =>
  [...text.matchAll(/^rm\s+-[a-z]+\s+(\S+)/gm)]
    .map(match => (match[1] ?? '').trim())
    .filter(Boolean)
    .sort()

describe('卸载清单 parity（pack README ↔ 安装手册 §八）', () => {
  it('两处 rm 路径集合一致，且覆盖 lease / 日志 / 派生索引', () => {
    const readmePath = 'packages/company-pack/README.md'
    const manualPath = '_dist/安装手册.md'
    expect(existsSync(join(ROOT, readmePath)), readmePath).toBe(true)
    expect(existsSync(join(ROOT, manualPath)), manualPath).toBe(true)

    const readme = rmPaths(read(readmePath))
    const manual = rmPaths(read(manualPath))
    expect(readme).toEqual(manual)
    expect(readme).toHaveLength(6)
    for (const suffix of ['company-pack.lock', 'company-client-errors.log', 'session-search-*.db']) {
      expect(readme.some(path => path.includes(suffix)), suffix).toBe(true)
    }
  })
})
