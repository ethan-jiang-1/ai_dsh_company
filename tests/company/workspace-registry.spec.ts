import { describe, expect, it } from 'vitest'
import { staleWorkspacePaths } from '../../packages/company-pack/src/host/workspace-registry.ts'

describe('DSH workspace 登记体检（搬 home 指针）', () => {
  it('只挑已不存在的绝对路径，去重并排序；相对路径/坏形状不冒充', () => {
    const doc = {
      tables: {
        workspaces: {
          a: { path: '/old/home/company-workspace' },
          b: { path: '/still/here' },
          c: { path: '/old/home/company-workspace' },
          d: { path: 'relative/path' },
          e: { path: 42 },
          f: {},
        },
      },
    }
    expect(staleWorkspacePaths(doc, path => path === '/still/here')).toEqual(['/old/home/company-workspace'])
    expect(staleWorkspacePaths({}, () => false)).toEqual([])
    expect(staleWorkspacePaths(null, () => false)).toEqual([])
    expect(staleWorkspacePaths({ tables: { workspaces: [] } }, () => false)).toEqual([])
  })
})
