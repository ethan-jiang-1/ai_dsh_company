/**
 * 编制漂移补种（2026-11-06 事故）：旧 workspace 的 `.dsh-company` 缺角色时，按 pack 补
 * 角色章程 + `org.md` 部门节 + `owners.md` 归属行——只补缺，不覆盖用户内容。
 *
 * 负例留证（红→还原→绿）：把 `planRoleBackfill` 里 `mergeOrgSection`/`mergeOwnersRow` 的调用
 * 短路成 `const merged = undefined` ⇒ 本文件「缺 CMO 的旧盘…」两条红；还原后全绿。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { backfillWorkspaceRoles, planRoleBackfill } from '../../packages/company-pack/src/host/bootstrap.ts'

const CONTENT = join(ROOT, 'packages/company-pack/content')
const created: string[] = []
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** 造一块「CMO 出现之前」的旧盘：org/owners 都是 canonical 去掉 CMO 之后的样子。 */
function staleDisk(): { workspace: string; kb: string } {
  const workspace = mkdtempSync(join(tmpdir(), 'company-roster-'))
  created.push(workspace)
  const kb = join(workspace, '.dsh-company/kb')
  mkdirSync(kb, { recursive: true })
  const org = readFileSync(join(CONTENT, 'state/org.md'), 'utf8')
    .replace(/### 市场与产品（CMO，3）[\s\S]*?(?=### )/, '')
    .replace('## 六条线', '## 五条线')
  const owners = readFileSync(join(CONTENT, 'state/owners.md'), 'utf8')
    .split('\n').filter(line => !line.startsWith('| CMO |')).join('\n')
  writeFileSync(join(kb, 'org.md'), org)
  writeFileSync(join(kb, 'owners.md'), owners)
  return { workspace, kb }
}

describe('编制漂移补种（旧盘缺角色）', () => {
  it('缺 CMO 的旧盘：漂移点名 cmo，补章程 + org 部门节 + owners 归属行', () => {
    const { workspace, kb } = staleDisk()
    const plan = planRoleBackfill(CONTENT, workspace)
    expect(plan.drift.missingOrg).toEqual(['cmo'])
    expect(plan.drift.missingOwners).toEqual(['cmo'])
    expect(plan.drift.missingCharter).toContain('cmo')
    const { result } = backfillWorkspaceRoles(CONTENT, workspace)
    expect(result.created).toEqual(expect.arrayContaining([expect.stringContaining('kb/cmo/CHARTER.md')]))
    const org = readFileSync(join(kb, 'org.md'), 'utf8')
    expect(org, 'org.md 补回 CMO 部门节').toContain('### 市场与产品（CMO，3）')
    expect(org, '部门计数五条线→六条线').toContain('## 六条线')
    expect(org, 'CMO 节插在 VP-Eng 之前（canonical 顺序）').toMatch(/（CMO，3）[\s\S]*（VP-Eng，16）/)
    const owners = readFileSync(join(kb, 'owners.md'), 'utf8')
    expect(owners, 'owners.md 补 CMO 行').toMatch(/^\| CMO \|/m)
    expect(readFileSync(join(kb, 'cmo/CHARTER.md'), 'utf8')).toContain('CMO')
  })

  it('幂等：补过之后第二次零改动', () => {
    const { workspace } = staleDisk()
    backfillWorkspaceRoles(CONTENT, workspace)
    const second = planRoleBackfill(CONTENT, workspace)
    expect(second.drift).toEqual({ missingCharter: [], missingOrg: [], missingOwners: [] })
    expect(second.entries).toHaveLength(0)
  })

  it('不覆盖用户内容：自定义行保留', () => {
    const { workspace, kb } = staleDisk()
    const orgPath = join(kb, 'org.md')
    writeFileSync(orgPath, `${readFileSync(orgPath, 'utf8')}\n> 我们的编制是自定的（用户手写）。\n`)
    backfillWorkspaceRoles(CONTENT, workspace)
    expect(readFileSync(orgPath, 'utf8')).toContain('我们的编制是自定的')
  })

  it('非公司盘（没有 .dsh-company/kb）不动手', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'company-roster-plain-'))
    created.push(workspace)
    const plan = planRoleBackfill(CONTENT, workspace)
    expect(plan.entries).toHaveLength(0)
    expect(plan.error).toBeUndefined()
  })
})
