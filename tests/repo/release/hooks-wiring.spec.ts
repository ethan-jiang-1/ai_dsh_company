/**
 * pre-push 接线一处实现（2026-11-11 接手审计 Y5）。
 *
 * 为什么：core.hooksPath 只在 `source run/env.sh` 里设置；clean clone 不 source 就 push 时
 * verify/test 静默跳过。prepare 把接线前移到 `pnpm install`，run/env.sh 复用同一实现。
 * 判据 = 根 package.json 的 prepare 指向 tools/hooks-install.mjs，run/env.sh 不再自己写
 * `git config core.hooksPath`。
 *
 * 证明不了：git 配置真的写入（行为证据 = 手动跑 `node tools/hooks-install.mjs` 后
 * `git config --get core.hooksPath`）；只证明接线入口没有第二份实现。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

describe('pre-push hook 接线', () => {
  it('pnpm install 的 prepare 与 run/env.sh 都走 tools/hooks-install.mjs', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.prepare).toBe('node tools/hooks-install.mjs')
    expect(read('run/env.sh')).toContain('tools/hooks-install.mjs')
    expect(read('run/env.sh')).not.toContain('config core.hooksPath')
  })

  it('hooks-install 把 core.hooksPath 设到 .githooks', () => {
    const text = read('tools/hooks-install.mjs')
    expect(text).toContain('core.hooksPath')
    expect(text).toContain("join(repositoryRoot, '.githooks')")
  })
})
