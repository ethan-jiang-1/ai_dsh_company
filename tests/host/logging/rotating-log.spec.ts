/**
 * 有界追加日志（2026-11-15，src↔tests 目录对齐卡：host 例外清零）。
 *
 * 判据：超过上限先把当前文件轮转为 `.1`（只留一份备份），再追加新行；轮转失败不挡本次写入；
 * 上限可注入（默认 256 KiB）。因此日志最多占 2 倍上限，且最新一行永远在主文件末尾。
 * 为什么这条 spec 住 `tests/host/logging/`：`rotating-log.ts` 被 run-bundle 与 commands 两组消费，
 * 搬家会制造跨组反向边；同名测试目录才是「改 src/host/logging → 去 tests/host/logging」。
 * 测试用普通临时目录（不走 `.dsh-company` 分支，避免依赖 run bundle 写闸）。
 * 不证明：多进程并发追加的原子性（append 是 O_APPEND，但轮转与追加之间没有锁）。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appendRotatingLine, DEFAULT_LOG_MAX_BYTES } from '../../../packages/company-pack/src/host/logging/rotating-log.ts'

let dir = ''
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'rotating-log-')) })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('有界追加日志', () => {
  it('目录不存在时自动建，首行落盘', () => {
    const file = join(dir, 'nested', 'client-errors.log')
    appendRotatingLine(file, 'first\n')
    expect(readFileSync(file, 'utf8')).toBe('first\n')
  })

  it('超过上限先轮转 .1，再追加新行', () => {
    const file = join(dir, 'upgrade.log')
    writeFileSync(file, '0123456789\n')
    appendRotatingLine(file, 'new\n', 5)
    expect(readFileSync(`${file}.1`, 'utf8')).toBe('0123456789\n')
    expect(readFileSync(file, 'utf8')).toBe('new\n')
  })

  it('未超上限只追加，不产生 .1', () => {
    const file = join(dir, 'a.log')
    writeFileSync(file, 'abc\n')
    appendRotatingLine(file, 'def\n', 1024)
    expect(existsSync(`${file}.1`)).toBe(false)
    expect(readFileSync(file, 'utf8')).toBe('abc\ndef\n')
  })

  it('第二次轮转覆盖旧备份（只留一份）', () => {
    const file = join(dir, 'b.log')
    writeFileSync(file, 'one\n')
    appendRotatingLine(file, 'two\n', 1)
    appendRotatingLine(file, 'three\n', 1)
    expect(readFileSync(`${file}.1`, 'utf8')).toBe('two\n')
    expect(readFileSync(file, 'utf8')).toBe('three\n')
  })

  it('默认上限真的生效：写满 256 KiB 后追加会轮转', () => {
    const file = join(dir, 'big.log')
    writeFileSync(file, 'x'.repeat(DEFAULT_LOG_MAX_BYTES))
    appendRotatingLine(file, 'tail\n')
    expect(existsSync(`${file}.1`)).toBe(true)
    expect(readFileSync(file, 'utf8')).toBe('tail\n')
  })

  it('轮转失败不挡本次写入（.1 被目录占住）', () => {
    const file = join(dir, 'blocked.log')
    writeFileSync(file, 'old\n')
    mkdirSync(`${file}.1`)
    expect(() => appendRotatingLine(file, 'new\n', 1)).not.toThrow()
    expect(readFileSync(file, 'utf8')).toBe('old\nnew\n')
  })
})
