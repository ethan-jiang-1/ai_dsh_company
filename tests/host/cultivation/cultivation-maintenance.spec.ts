/** 培养记录 CAS/回滚/archive/check 的 host 行为（R5-23 拆族；临时真实盘）。 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nodeCultivationStorage } from '../../../packages/company-pack/src/host/cultivation/cultivation-storage.ts'

import { cultivationRegistrations, invokeCultivation, withCultivationWorkspace } from '../../support/cultivation-harness.ts'

describe('培养记录 CAS（2026-10-27 G6）', () => {
  it('expectedText 不符 ⇒ false 且文件不变；相符才更新', () => {
    const root = mkdtempSync(join(tmpdir(), 'cultivation-cas-'))
    const records = join(root, 'cultivation/records')
    try {
      const id = nodeCultivationStorage.writeRecord(records, {
        kind: 'correction',
        targetRole: 'ceo',
        proposerRole: 'ceo',
        proposerKind: 'human',
        source: 'test',
        expectation: '先列未决项',
        body: '正文',
      })
      const before = nodeCultivationStorage.readRecord(records, id)?.text ?? ''
      expect(before).toContain('status: open')
      expect(nodeCultivationStorage.updateRecord(records, id, { status: 'rejected' }, `${before} `)).toBe(false)
      expect(nodeCultivationStorage.readRecord(records, id)?.text).toBe(before)
      expect(nodeCultivationStorage.updateRecord(records, id, { status: 'rejected' }, before)).toBe(true)
      expect(nodeCultivationStorage.readRecord(records, id)?.text).toContain('status: rejected')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})


describe('revoke 跨 store 失败回滚（2026-10-27 G6）', () => {
  it('方法删除抛错时，记录状态回滚为 adopted，方法文件仍在', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command, proposal } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const outcome = await proposal.execute({
        kind: 'correction',
        targetRole: 'ceo',
        expectation: '回滚测试',
        body: '方法正文',
      }, {
        agent: { session: { header: { agentPreset: 'ceo', cwd: workspace } } },
        signal: new AbortController().signal,
      } as never) as { id: string }
      expect((await invokeCultivation(command, 'ceo', workspace, `adopt ${outcome.id} as rollback-method`)).kind).toBe('success')
      const recordPath = join(workspace, '.dsh-company/cultivation/records', `${outcome.id}.md`)
      expect(readFileSync(recordPath, 'utf8')).toContain('status: adopted')
      expect(existsSync(join(methods, 'ceo/rollback-method/SKILL.md'))).toBe(true)

      const original = nodeCultivationStorage.removeMethod
      nodeCultivationStorage.removeMethod = () => { throw new Error('injected remove failure') }
      try {
        const denied = await invokeCultivation(command, 'ceo', workspace, 'revoke rollback-method')
        expect(denied.kind).toBe('error')
        expect(String((denied as { text: string }).text)).toContain('记录已回滚')
      } finally {
        nodeCultivationStorage.removeMethod = original
      }
      expect(readFileSync(recordPath, 'utf8')).toContain('status: adopted')
      expect(existsSync(join(methods, 'ceo/rollback-method/SKILL.md'))).toBe(true)
    })
  })
})


describe('/cultivation archive（2026-10-27 G8）', () => {
  it('只归档已处理且早于天数的记录；open 与坏记录不动', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const records = join(workspace, '.dsh-company/cultivation/records')
      const front = (status: string): string => `---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: old\nstatus: ${status}\n---\n\nbody\n`
      writeFileSync(join(records, '20200101-000000-old1.md'), front('rejected'))
      writeFileSync(join(records, '20200101-000000-old2.md'), front('open'))
      writeFileSync(join(records, 'broken.md'), 'not a record')
      const outcome = await invokeCultivation(command, 'ceo', workspace, 'archive 30')
      expect(outcome.kind).toBe('success')
      expect(existsSync(join(records, '20200101-000000-old1.md'))).toBe(false)
      expect(existsSync(join(workspace, '.dsh-company/cultivation/records-archive/20200101-000000-old1.md'))).toBe(true)
      expect(existsSync(join(records, '20200101-000000-old2.md'))).toBe(true)
      expect(existsSync(join(records, 'broken.md'))).toBe(true)
      expect(String((outcome as { text: string }).text)).toContain('1 条坏记录未动')
    })
  })

  it('purge 只删归档里早于天数的记录，live records 不动', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const records = join(workspace, '.dsh-company/cultivation/records')
      const archive = join(workspace, '.dsh-company/cultivation/records-archive')
      mkdirSync(archive, { recursive: true })
      const front = '---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: old\nstatus: rejected\n---\n\nbody\n'
      writeFileSync(join(archive, '20200101-000000-old.md'), front)
      writeFileSync(join(archive, '20990101-000000-new.md'), front)
      writeFileSync(join(records, '20200101-000000-live.md'), front)
      const outcome = await invokeCultivation(command, 'ceo', workspace, 'purge 30')
      expect(outcome.kind).toBe('success')
      expect(existsSync(join(archive, '20200101-000000-old.md'))).toBe(false)
      expect(existsSync(join(archive, '20990101-000000-new.md'))).toBe(true)
      expect(existsSync(join(records, '20200101-000000-live.md'))).toBe(true)
    })
  })
})


describe('/cultivation check 对账（2026-10-27 R5）', () => {
  it('报告记录缺方法与方法无记录，不自动改盘', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command, proposal } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const outcome = await proposal.execute({
        kind: 'correction', targetRole: 'ceo', expectation: '对账', body: '正文',
      }, {
        agent: { session: { header: { agentPreset: 'ceo', cwd: workspace } } },
        signal: new AbortController().signal,
      } as never) as { id: string }
      expect((await invokeCultivation(command, 'ceo', workspace, `adopt ${outcome.id} as check-method`)).kind).toBe('success')
      nodeCultivationStorage.removeMethod(methods, 'ceo', 'check-method')
      const missing = await invokeCultivation(command, 'ceo', workspace, 'check')
      expect(missing.kind).toBe('success')
      expect(String((missing as { text: string }).text)).toContain('记录缺方法')
      expect(existsSync(join(methods, 'ceo/check-method/SKILL.md'))).toBe(false)

      nodeCultivationStorage.installMethod(methods, 'ceo', 'orphan-method', 'orphan body')
      const orphan = await invokeCultivation(command, 'ceo', workspace, 'check')
      expect(String((orphan as { text: string }).text)).toContain('方法无记录')
      expect(existsSync(join(methods, 'ceo/orphan-method/SKILL.md'))).toBe(true)
    })
  })
})
