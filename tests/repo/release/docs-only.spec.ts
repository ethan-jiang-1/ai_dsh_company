import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'
import { docsOnlyChangeProblem, docsOnlyOutputProblem, parseNameStatusZ } from '../../../tools/lib/release/docs-only.mjs'
// 负例留证 2026-11-19：`git diff --name-only` 对 rename 只给新路径，code→docs 改名被判 docs-only（BUG-281）。
// 负例留证 2026-11-19：`_dist/安装手册.md` 在 docs-only 集合里，生成的发布字节被当文档（BUG-280）。
// 负例留证 2026-11-19：`--stamp` 不比 dirty/checks，`--check` 比——同一棵树两入口结论不同（BUG-282）。

import { renderInstallManual } from '../../../tools/lib/release/install-manual.mjs'
import { manualProductProblem, readinessProblems } from '../../../tools/lib/release/readiness.mjs'

/**
 * release docs-only 边界与就绪判据（2026-11-19，BUG-280/281/282）。
 */

describe('name-status -z 解析（BUG-281）', () => {
  it('M/A/D 单路径与 R/C 双路径都解析', () => {
    expect(parseNameStatusZ('M\0a.md\0A\0b.md\0D\0c.md\0')).toEqual([
      { status: 'M', paths: ['a.md'] },
      { status: 'A', paths: ['b.md'] },
      { status: 'D', paths: ['c.md'] },
    ])
    expect(parseNameStatusZ('R100\0src/a.ts\0docs/a.md\0')).toEqual([{ status: 'R100', paths: ['src/a.ts', 'docs/a.md'] }])
    expect(parseNameStatusZ('C075\0src/a.ts\0docs/copy.ts\0')).toEqual([{ status: 'C075', paths: ['src/a.ts', 'docs/copy.ts'] }])
    expect(parseNameStatusZ('')).toEqual([])
    expect(parseNameStatusZ('garbage')).toEqual([])
  })
})

describe('docs-only 判据（BUG-280）', () => {
  it('docs/notes/_backlog 与根三件是 docs-only；空 diff 不是', () => {
    expect(docsOnlyOutputProblem('M\0docs/a.md\0M\0notes/b.md\0M\0_backlog/bugs/x.md\0M\0README.md\0')).toBeUndefined()
    expect(docsOnlyOutputProblem('')).toMatch(/没有文件变化/)
  })

  it('生成物不在 docs 集合内（手册必须重打/校验）', () => {
    expect(docsOnlyChangeProblem([{ status: 'M', paths: ['_dist/安装手册.md'] }])).toContain('非 docs')
    expect(docsOnlyChangeProblem([{ status: 'M', paths: ['src/host/x.ts'] }])).toContain('非 docs')
  })

  it('rename 两侧都判：code→docs 红，docs→notes 绿（BUG-281）', () => {
    expect(docsOnlyChangeProblem([{ status: 'R100', paths: ['src/a.ts', 'docs/a.md'] }])).toContain('src/a.ts')
    expect(docsOnlyChangeProblem([{ status: 'R100', paths: ['docs/a.md', 'notes/a.md'] }])).toBeUndefined()
  })

  it('真 git 输出：--name-only 丢掉 rename 的旧路径（旧判据的洞），--name-status 见得', () => {
    // 夹具 provenance = 2026-11-19 在临时仓库实测抓的两条输出（`git mv src/a.ts docs/a.md` + commit）：
    //   `git diff --name-only -z HEAD~1..HEAD`        → `docs/a.md\0`                    ← 旧路径缺席
    //   `git diff --name-status -z -M HEAD~1..HEAD`   → `R100\0src/a.ts\0docs/a.md\0`     ← 两侧都在
    // tests/ 不许起子进程（layering），所以这里钉实测输出本身；真跑配方写进 bug 卡。
    const nameOnly = 'docs/a.md\0'
    expect(nameOnly.split('\0').filter(Boolean)).toEqual(['docs/a.md'])
    expect(docsOnlyOutputProblem('R100\0src/a.ts\0docs/a.md\0')).toContain('src/a.ts')
  })
})

describe('就绪判据（BUG-282）', () => {
  const manifest = {
    version: '0.0.0',
    sourceFingerprint: 's',
    pipelineFingerprint: 'p',
    artifact: { sha256: 'a' },
    dirty: false,
    checks: { verify: 'pass', test: 'pass' },
  }
  const expected = { version: '0.0.0', sourceFingerprint: 's', pipelineFingerprint: 'p', artifactSha256: 'a' }

  it('全对齐零问题；任一维不一致都红', () => {
    expect(readinessProblems({ manifest, ...expected })).toEqual([])
    expect(readinessProblems({ manifest: { ...manifest, dirty: true }, ...expected }).join()).toContain('脏树')
    expect(readinessProblems({ manifest: { ...manifest, checks: { verify: 'fail', test: 'pass' } }, ...expected }).join()).toContain('verify/test')
    expect(readinessProblems({ manifest: { ...manifest, sourceFingerprint: 'x' }, ...expected }).join()).toContain('源码面')
    expect(readinessProblems({ manifest: { ...manifest, pipelineFingerprint: 'x' }, ...expected }).join()).toContain('发布管线')
    expect(readinessProblems({ manifest: { ...manifest, artifact: { sha256: 'x' } }, ...expected }).join()).toContain('sha256')
  })

  it('stamp/check 共用一份判据（BUG-282）', () => {
    const text = readFileSync(join(ROOT, 'tools/release/release.mjs'), 'utf8')
    expect(text.match(/sharedReadinessProblems\(/g)?.length).toBe(3)   // 定义 + stamp + check
    expect(text).not.toContain('manifest.dirty !== false')
    expect(text).not.toContain('checks.verify !== ')
  })
})

describe('手册同源判据（BUG-280）', () => {
  const cells = { version: '0.0.0', tarballName: 'dsh-company-pack-0.0.0.tgz', digest: 'a'.repeat(64), date: '2026-11-19' }
  const manual = renderInstallManual({ ...cells, expectedTag: 'dsh-v0.2.1-rc.5', entries: 0 })

  it('模板产物零问题；手改散文/表头版本都红', () => {
    expect(manualProductProblem({ manual, version: cells.version, expectedTag: 'dsh-v0.2.1-rc.5' })).toBeUndefined()
    expect(manualProductProblem({ manual: manual.replace('一个安装 = 一个公司', '一个安装 = 多个公司'), version: cells.version, expectedTag: 'dsh-v0.2.1-rc.5' })).toContain('不是当前模板的产物')
    expect(manualProductProblem({ manual, version: '9.9.9', expectedTag: 'dsh-v0.2.1-rc.5' })).toContain('手册版本')
    expect(manualProductProblem({ manual: '# 手写手册\n', version: cells.version, expectedTag: 'dsh-v0.2.1-rc.5' })).toContain('表头')
  })
})
