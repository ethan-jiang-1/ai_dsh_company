/**
 * 真 fs-sandbox + 真 sandboxPolicy 的写通道测试（2026-10-28 削洋葱轮）：证明
 * `writeRecordViaFs` 传入的 per-call policy 确实把写入限制在会话 workspace 根。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import SandboxPolicyService from '../../vendor/dsh/packages/sandbox/sandbox-policy/src/index.ts'
import SandboxedFileSystem from '../../vendor/dsh/packages/fs/fs-sandbox/src/index.ts'
import { writeRecordViaFs } from '../../packages/company-pack/src/host/cultivation-storage.ts'

let dir: string
let ctx: Context

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fs-record-sandbox-'))
  mkdirSync(join(dir, 'cultivation', 'records'), { recursive: true })
  ctx = new Context()
  ctx.provide('sessionProjections', { register: () => {}, stateOf: () => null } as never)
  ctx.provide('systemPrompt', { context: () => {}, getContextOrder: () => 0 } as never)
})
afterEach(async () => { await ctx.fiber.dispose(); rmSync(dir, { recursive: true, force: true }) })

describe('writeRecordViaFs 的真 fs-sandbox 行为', () => {
  it('policy 根内的记录可写；根外写入被拒（FS_SANDBOX_DENIED）', async () => {
    await ctx.plugin(SandboxPolicyService, { mode: 'workspace-write', workspaceRoot: dir })
    await ctx.plugin(SandboxedFileSystem, { cwd: dir })
    expect(ctx.fs.sandboxMode).toBe('workspace-write')
    const session = { id: 'session-test', header: { cwd: dir } } as never
    const policy = ctx.sandboxPolicy.resolve({ session })
    const recordsDir = join(dir, 'cultivation', 'records')
    const id = await writeRecordViaFs(ctx.fs as never, recordsDir, {
      kind: 'correction',
      targetRole: 'ceo',
      proposerRole: 'ceo',
      proposerKind: 'agent',
      source: 'test',
      expectation: 'sandbox 写',
      body: '正文',
    }, undefined, policy)
    expect(existsSync(join(recordsDir, `${id}.md`))).toBe(true)
    expect(readFileSync(join(recordsDir, `${id}.md`), 'utf8')).toContain('sandbox 写')

    // 平台 temp 本身是 writableRoots 允许面，不能拿 dir/.. 当反例；用仓库 cwd 外的路径。
    const deniedPath = join(process.cwd(), `.fs-sandbox-denied-${process.pid}.md`)
    const outside = await ctx.fs.resolve(deniedPath)
    await expect(
      ctx.fs.writeText(outside, 'x', { kind: 'createIfAbsent' }, undefined, policy),
    ).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(existsSync(deniedPath)).toBe(false)
  })
})
