/**
 * 角色计数声明（2026-11-11 接手审计）。
 *
 * 为什么：`cordis.patch.yml` 的注释仍写“五个角色”，而六公司角色 preset 都声明了
 * `preset-clock`；CMO 增设时清理了 AGENTS/market，补丁注释漏了。
 * 判据 = 六个公司角色都声明 `preset-clock`，且随包补丁注释不再出现“五个角色”。
 *
 * 证明不了：运行时真的挂上了六条 preset-clock——真挂载归 preset-smoke；
 * `session_search` 是 bundle 组工具，不在 preset 行里逐个声明，故本 spec 不数它。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const presetsDir = join(ROOT, 'packages/company-pack/presets')
const presets = readdirSync(presetsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join(presetsDir, entry.name, 'agent.cordis.yml')))
  .map(entry => entry.name)
const companyRoles = ['ceo', 'cfo', 'cmo', 'coo', 'vp-eng', 'vp-sales']
const declaredBy = (needle: string): string[] => presets
  .filter(name => readFileSync(join(presetsDir, name, 'agent.cordis.yml'), 'utf8').includes(needle))
  .sort()

describe('角色计数声明', () => {
  it('六个公司角色都声明 preset-clock', () => {
    expect(declaredBy('preset-clock')).toEqual(companyRoles)
  })

  it('随包补丁注释不再声称五个角色', () => {
    const patch = readFileSync(join(ROOT, 'packages/company-pack/cordis.patch.yml'), 'utf8')
    expect(patch).not.toMatch(/五个角色/)
  })
})
