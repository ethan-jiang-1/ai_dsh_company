/** startup 项目解析的危险落点判据（BUG-120）。 */
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { resolveStartupWorkspace } from '../../../packages/company-pack/src/host/startup/startup-workspace.ts'

const agent = (cwd: string) => ({ session: { header: { cwd } } })

describe('resolveStartupWorkspace', () => {
  it('会话 cwd 是 tmpdir/根/home → 回退 boot；子目录允许', () => {
    expect(resolveStartupWorkspace('/ws', agent(tmpdir()))).toBe('/ws')
    expect(resolveStartupWorkspace('/ws', agent('/'))).toBe('/ws')
    expect(resolveStartupWorkspace('/ws', agent('/ws/sub'))).toBe('/ws/sub')
  })

  it('boot 与 cwd 都危险 → 空（不写公司盘）', () => {
    expect(resolveStartupWorkspace(tmpdir(), agent(tmpdir()))).toBe('')
  })
})
