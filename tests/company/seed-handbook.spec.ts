/**
 * seed / handbook 碰撞的 keyless 完成定义（2026-11-01 产品化）。
 *
 * 判据：
 * - 无 consent、无公司标记 ⇒ seedAllowed=false（不写）；
 * - consent 的 workspace/packVersion 匹配 ⇒ true；pack 版本不匹配 ⇒ false；
 * - 已有公司标记（AGENTS/COMPANY/kb/company.md）⇒ true（老盘升级不要求再同意）；
 * - `DSH_COMPANY_BOOTSTRAP=off` ⇒ false；
 * - 手册目标：无 AGENTS ⇒ AGENTS；已有 AGENTS ⇒ COMPANY；两者都在 ⇒ COMPANY；
 * - plan/apply 只补缺：已有 AGENTS 不被覆盖，COMPANY 从骨架 AGENTS 复制。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyBootstrap,
  chooseHandbookTarget,
  planBootstrap,
  readSeedConsent,
  seedAllowed,
  writeSeedConsent,
} from '../../packages/company-pack/src/host/bootstrap.ts'

const roots: string[] = []
const saved = { ...process.env }
afterEach(() => {
  for (const key of ['DSH_COMPANY_BOOTSTRAP', 'DSH_COMPANY_HOME']) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function skeleton(): string {
  const dir = mkdtempSync(join(tmpdir(), 'seed-skel-'))
  roots.push(dir)
  mkdirSync(join(dir, 'kb'), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 公司手册\n')
  writeFileSync(join(dir, 'kb/org.md'), '# org\n')
  return dir
}

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'seed-ws-'))
  roots.push(dir)
  return dir
}

describe('seed consent', () => {
  it('无 consent/无标记 ⇒ false；consent 匹配 ⇒ true；版本不匹配 ⇒ false；off ⇒ false', () => {
    const ws = workspace()
    try {
      delete process.env.DSH_COMPANY_BOOTSTRAP
      expect(seedAllowed(ws, '0.5.0')).toBe(false)
      writeSeedConsent(ws, '0.5.0')
      expect(readSeedConsent(ws)?.packVersion).toBe('0.5.0')
      expect(seedAllowed(ws, '0.5.0')).toBe(true)
      expect(seedAllowed(ws, '0.5.1')).toBe(false)
      process.env.DSH_COMPANY_BOOTSTRAP = 'off'
      expect(seedAllowed(ws, '0.5.0')).toBe(false)
    } finally {
      rmSync(ws, { recursive: true, force: true })
    }
  })

  it('已有公司标记 ⇒ 不再要求 consent', () => {
    const ws = workspace()
    try {
      delete process.env.DSH_COMPANY_BOOTSTRAP
      writeFileSync(join(ws, 'AGENTS.md'), '# user\n')
      expect(seedAllowed(ws, '9.9.9')).toBe(true)
    } finally {
      rmSync(ws, { recursive: true, force: true })
    }
  })
})

describe('handbook target 碰撞', () => {
  it('无 AGENTS ⇒ AGENTS；已有 AGENTS ⇒ COMPANY；两者都在 ⇒ COMPANY', () => {
    const ws = workspace()
    try {
      expect(chooseHandbookTarget(ws)).toBe('AGENTS.md')
      writeFileSync(join(ws, 'AGENTS.md'), '# user\n')
      expect(chooseHandbookTarget(ws)).toBe('COMPANY.md')
      writeFileSync(join(ws, 'COMPANY.md'), '# company\n')
      expect(chooseHandbookTarget(ws)).toBe('COMPANY.md')
    } finally {
      rmSync(ws, { recursive: true, force: true })
    }
  })

  it('plan/apply：已有 AGENTS 不被覆盖，COMPANY 从骨架 AGENTS 复制', () => {
    const skel = skeleton()
    const ws = workspace()
    try {
      writeFileSync(join(ws, 'AGENTS.md'), '# 用户项目手册\n')
      const plan = planBootstrap(skel, ws)
      expect(plan.handbookTarget).toBe('COMPANY.md')
      const entry = plan.entries.find(item => item.rel === 'COMPANY.md')
      expect(entry).toMatchObject({ sourceRel: 'AGENTS.md', action: 'create' })
      applyBootstrap(plan)
      expect(readFileSync(join(ws, 'AGENTS.md'), 'utf8')).toBe('# 用户项目手册\n')
      expect(readFileSync(join(ws, 'COMPANY.md'), 'utf8')).toBe('# 公司手册\n')
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })

  it('plan/apply：无碰撞时 AGENTS 直接落盘；重复调用全 skip', () => {
    const skel = skeleton()
    const ws = workspace()
    try {
      const first = planBootstrap(skel, ws)
      expect(first.handbookTarget).toBe('AGENTS.md')
      const result = applyBootstrap(first)
      expect(result.created).toContain('AGENTS.md')
      const second = planBootstrap(skel, ws, 'AGENTS.md')
      expect(second.creates).toBe(0)
      expect(second.entries.every(entry => entry.action === 'skip')).toBe(true)
    } finally {
      rmSync(skel, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true })
    }
  })
})
