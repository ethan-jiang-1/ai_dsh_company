import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { consumerCount } from '../../tools/lib/asset-consumers.mjs'

describe('consumerCount（census v2 消费者图：自动 lane + 显式文件引用）', () => {
  it('合并计入自动调度 lane 数与显式引用，且不把资产自身/README/generated 算作消费者', () => {
    const root = mkdtempSync(join(tmpdir(), 'asset-consumers-'))
    try {
      mkdirSync(join(root, 'tests/lib'), { recursive: true })
      mkdirSync(join(root, 'tests/node_modules'), { recursive: true })
      mkdirSync(join(root, 'checks/gates/lib'), { recursive: true })
      mkdirSync(join(root, 'tools/lib'), { recursive: true })
      mkdirSync(join(root, 'probes'), { recursive: true })
      writeFileSync(join(root, 'tests/a.spec.ts'), 'alpha.e2e.mjs\n')
      writeFileSync(join(root, 'tests/lib/helper.spec.ts'), "'beta'\n")
      writeFileSync(join(root, 'checks/gates/lib/sub.mjs'), '"beta"\n')
      writeFileSync(join(root, 'tools/lib/internal.mjs'), "'beta'\n")
      writeFileSync(join(root, 'tests/node_modules/pkg.js'), "'beta'\n")
      writeFileSync(join(root, 'checks/alpha.e2e.mjs'), 'alpha\n')
      writeFileSync(join(root, 'checks/INDEX.generated.md'), 'alpha beta gamma\n')
      writeFileSync(join(root, 'checks/README.md'), 'alpha beta gamma\n')
      writeFileSync(join(root, 'probes/alpha.mjs'), 'alpha\n')
      expect(
        consumerCount(root, [
          { name: 'alpha', lanes: ['fast', 'weekly'] },
          { name: 'beta', lanes: [] },
          { name: 'gamma', lanes: ['weekly'] },
        ]),
      ).toEqual({
        alpha: 3, // 2 自动 lane + 1 显式文件引用
        beta: 2, // tests/lib 与 checks/gates/lib 计入，tools/lib 与 node_modules 跳过
        gamma: 1, // 动态 lane 调度不再被误判为 0 消费者
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
