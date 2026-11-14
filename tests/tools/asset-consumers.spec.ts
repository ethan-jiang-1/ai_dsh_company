import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { consumerCount } from '../../tools/lib/asset-consumers.mjs'

describe('consumerCount（census v2 消费者图）', () => {
  it('计引用，但不把资产自己的文件、README、generated 索引算成消费者', () => {
    const root = mkdtempSync(join(tmpdir(), 'asset-consumers-'))
    try {
      mkdirSync(join(root, 'tests'), { recursive: true })
      mkdirSync(join(root, 'checks'), { recursive: true })
      mkdirSync(join(root, 'probes'), { recursive: true })
      writeFileSync(join(root, 'tests/a.spec.ts'), 'alpha\n')
      writeFileSync(join(root, 'checks/alpha.e2e.mjs'), 'alpha\n')
      writeFileSync(join(root, 'checks/INDEX.generated.md'), 'alpha beta\n')
      writeFileSync(join(root, 'checks/README.md'), 'alpha beta\n')
      writeFileSync(join(root, 'probes/alpha.mjs'), 'alpha\n')
      expect(consumerCount(root, [{ name: 'alpha' }, { name: 'beta' }])).toEqual({ alpha: 1, beta: 0 })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
