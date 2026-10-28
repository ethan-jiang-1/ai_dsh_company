/**
 * 模型发起记录写通道的真 fs 测试（2026-10-28 二轮）：真 Cordis + fs-local 的
 * `resolve` / `writeText({createIfAbsent})`，不是假 handle。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import LocalFileSystem from '../../vendor/dsh/packages/fs/fs-local/src/index.ts'
import { writeRecordViaFs } from '../../packages/company-pack/src/host/cultivation-storage.ts'

let dir: string
let ctx: Context

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fs-record-write-'))
  mkdirSync(join(dir, 'cultivation', 'records'), { recursive: true })
  ctx = new Context()
})
afterEach(async () => { await ctx.fiber.dispose(); rmSync(dir, { recursive: true, force: true }) })

describe('writeRecordViaFs 的真 fs-local 行为', () => {
  it('createIfAbsent 写出一条真实记录；既有文件再 createIfAbsent 报 FS_NOT_OBSERVED', async () => {
    await ctx.plugin(LocalFileSystem, { cwd: dir })
    const fs = ctx.fs
    const recordsDir = join(dir, 'cultivation', 'records')
    const id = await writeRecordViaFs(fs as never, recordsDir, {
      kind: 'correction',
      targetRole: 'ceo',
      proposerRole: 'ceo',
      proposerKind: 'agent',
      source: 'test',
      expectation: '真 fs 写',
      body: '正文',
    })
    const path = join(recordsDir, `${id}.md`)
    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, 'utf8')).toContain('schema: 1')
    expect(readdirSync(recordsDir)).toEqual([`${id}.md`])

    const target = await fs.resolve(path)
    await expect(
      fs.writeText(target, 'again', { kind: 'createIfAbsent' }),
    ).rejects.toMatchObject({ code: 'FS_NOT_OBSERVED' })
  })
})
