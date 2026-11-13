/**
 * setup 调用形：pnpm 有内置 `setup` 命令，`pnpm setup --check` 会被 pnpm 自己解析
 * （clean clone 实测 `[ERROR] Unknown option: 'check'`）；带参数的入口必须走 node 脚本。
 *
 * 为什么钉：`tools/setup.mjs` 的帮助文本、bootstrap 与 fresh-clone 都写过 `pnpm setup --...`；
 * 它在 warm 机器上可能碰巧走脚本，在 clean clone 上直接失败（2026-11-11 实测）。
 * 判据 = 受管文件不出现 `pnpm setup --...`，CI 用 `node tools/setup.mjs --check`。
 *
 * 证明不了：pnpm 未来版本是否仍保留该内置命令（归 pnpm 合同）；只钉本仓的调用形。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

describe('setup 调用形', () => {
  it('带参数的 setup 不走 pnpm setup --...', () => {
    for (const rel of ['tools/setup.mjs', 'docs/guides/bootstrap.md', '.github/workflows/fresh-clone.yml', 'README.md', 'CHANGELOG.md']) {
      expect(read(rel), `${rel} 不应出现 pnpm setup --...`).not.toMatch(/pnpm setup\s+--/)
    }
    expect(read('.github/workflows/fresh-clone.yml')).toContain('node tools/setup.mjs --check')
    expect(read('tools/setup.mjs')).toContain('node tools/setup.mjs')
  })
})
