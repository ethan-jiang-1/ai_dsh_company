/**
 * workspace 可写目录里「可读普通文件」的判据（2026-11-15，src↔tests 目录对齐卡：host 例外清零）。
 *
 * 判据五态：`missing` / `symlink` / `not-file` / `outside` / `null`（= 可读普通文件）；
 * `isInside` 走 realpath，root 自身算内；`readTextInside` 对任一坏形状返回 undefined。
 * 为什么这条 spec 住 `tests/host/fs/`：`safe-file.ts` 被 ledger / run-bundle / commands 三组消费，
 * 搬家会制造跨组反向边；给它一个同名测试目录，才是「改 src/host/fs → 去 tests/host/fs 找证据」。
 * 不证明：TOCTOU（判据与读之间文件被换走），窗口由调用方自己收。
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isInside, isPlainFileInside, plainFileProblem, readTextInside } from '../../../packages/company-pack/src/host/fs/safe-file.ts'

const made: string[] = []
const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  made.push(dir)
  return dir
}
afterEach(() => {
  while (made.length > 0) rmSync(made.pop()!, { recursive: true, force: true })
})

describe('可读普通文件判据', () => {
  it('root 内的普通文件 = null，且可读', () => {
    const root = temp('safe-file-')
    const file = join(root, 'final.md')
    writeFileSync(file, '# ok')
    expect(plainFileProblem(root, file)).toBeNull()
    expect(isPlainFileInside(root, file)).toBe(true)
    expect(readTextInside(root, file)).toBe('# ok')
    expect(isInside(root, join(root, '..'))).toBe(false)
  })

  it('缺失标 missing（调用方当「没有」而不是坏形状）', () => {
    const root = temp('safe-file-')
    expect(plainFileProblem(root, join(root, 'nope.md'))).toBe('missing')
    expect(readTextInside(root, join(root, 'nope.md'))).toBeUndefined()
  })

  it('目录标 not-file', () => {
    const root = temp('safe-file-')
    mkdirSync(join(root, 'drafts'))
    expect(plainFileProblem(root, join(root, 'drafts'))).toBe('not-file')
  })

  it('symlink 一律标 symlink——即使它指向 root 内的真文件', () => {
    const root = temp('safe-file-')
    const real = join(root, 'real.md')
    writeFileSync(real, 'x')
    const inside = join(root, 'inside-link.md')
    symlinkSync(real, inside)
    const outsideLink = join(root, 'outside-link.md')
    symlinkSync(join(temp('safe-file-out-'), 'secret.md'), outsideLink)
    expect(plainFileProblem(root, inside)).toBe('symlink')
    expect(plainFileProblem(root, outsideLink)).toBe('symlink')
    expect(readTextInside(root, inside)).toBeUndefined()
  })

  it('root 外的普通文件标 outside', () => {
    const root = temp('safe-file-')
    const outside = join(temp('safe-file-out-'), 'outside.md')
    writeFileSync(outside, 'secret')
    expect(isInside(root, outside)).toBe(false)
    expect(plainFileProblem(root, outside)).toBe('outside')
    expect(readTextInside(root, outside)).toBeUndefined()
  })
})
