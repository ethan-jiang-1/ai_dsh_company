import { describe, expect, it } from 'vitest'
import { ALLOWED_EDGES, edgeProblem, importProblem, importSpecifiers, isNodeBuiltinSpecifier, layerOf } from '../../tools/lib/src-layering.mjs'

// 2026-10-27 R3-01：分层判据的纯逻辑（门禁消费它；真树的反向红证见 checks/gates/src-layering.mjs 头注）。
describe('pack 源码面分层判据', () => {
  it('相对路径 → 层（root 只有 src 顶层文件）', () => {
    expect(layerOf('index.ts')).toBe('root')
    expect(layerOf('host/catalog.ts')).toBe('host')
    expect(layerOf('lib/board.ts')).toBe('lib')
    expect(layerOf('client/Brand.tsx')).toBe('client')
    expect(layerOf('')).toBeNull()
  })

  it('允许方向与禁止方向（client/host 互不相见，lib 是叶）', () => {
    expect(ALLOWED_EDGES.client).toEqual(['client', 'lib'])
    expect(edgeProblem('client', 'lib')).toBeNull()
    expect(edgeProblem('client', 'host')).toContain('client → host')
    expect(edgeProblem('host', 'client')).toContain('host → client')
    expect(edgeProblem('lib', 'host')).toContain('lib → host')
    expect(edgeProblem('root', 'host')).toBeNull()
    expect(edgeProblem('root', 'client')).toContain('root → client')
    expect(edgeProblem('client', null)).toBeNull()
  })

  it('取引用：from / 动态 import / 裸 import，行号可用', () => {
    const text = [
      "import type { Context } from '@deepseek-ai/cordis'",
      "import { a } from './a.ts'",
      "const b = await import('./b.ts')",
      "import './side-effect.css'",
      "export * from './c.ts'",
    ].join('\n')
    const found = importSpecifiers(text)
    expect(found.map(item => item.specifier)).toEqual(['@deepseek-ai/cordis', './a.ts', './b.ts', './side-effect.css', './c.ts'])
    expect(found.map(item => item.line)).toEqual([1, 2, 3, 4, 5])
  })

  it('node: 内建在 lib/client 判红，在 host/root 放行', () => {
    expect(isNodeBuiltinSpecifier('node:fs')).toBe(true)
    expect(importProblem({ fromLayer: 'lib', relativePath: 'lib/x.ts', specifier: 'node:fs' })).toContain('node:fs')
    expect(importProblem({ fromLayer: 'client', relativePath: 'client/x.ts', specifier: 'node:path' })).toContain('node:path')
    expect(importProblem({ fromLayer: 'host', relativePath: 'host/x.ts', specifier: 'node:fs' })).toBeNull()
    expect(importProblem({ fromLayer: 'lib', relativePath: 'lib/x.ts', specifier: '@deepseek-ai/cordis' })).toBeNull()
  })

  it('相对引用按 from 的目录解析；越出 src/ 判红', () => {
    expect(importProblem({ fromLayer: 'client', relativePath: 'client/Brand.tsx', specifier: './tab-icons.tsx' })).toBeNull()
    expect(importProblem({ fromLayer: 'client', relativePath: 'client/Brand.tsx', specifier: '../lib/text.ts' })).toBeNull()
    expect(importProblem({ fromLayer: 'client', relativePath: 'client/Brand.tsx', specifier: '../host/catalog.ts' })).toContain('client → host')
    expect(importProblem({ fromLayer: 'client', relativePath: 'client/x.ts', specifier: '../../outside.ts' })).toContain('越出 src/')
  })
})
