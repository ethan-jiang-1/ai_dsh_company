import type { Context } from '@deepseek-ai/cordis'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CACHE_COMPANY_REL,
  CLIENT_ERRORS_REL,
  registerClientDiagnostics,
  type ClientDiagnosticsOptions,
} from '../../../packages/company-pack/src/host/commands/client-diagnostics.ts'
import { createCompanyLanguageState } from '../../../packages/company-pack/src/host/language/company-language.ts'
import { assertEnglishUiClean } from '../../support/i18n-assertions.ts'

interface RegisteredCommand {
  readonly name: string
  readonly description: string
  readonly input: { readonly hint: string }
  readonly handler: (input: { readonly rawInput: string }) => Promise<{ readonly kind: 'success' | 'error', readonly text: string }>
}

const tempDirs: string[] = []
function makeHome(): string {
  const dir = mkdtempSync(join(tmpdir(), 'client-diagnostics-spec-'))
  tempDirs.push(dir)
  return dir
}
afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

function mountDiagnostics(dshHome: string, options: ClientDiagnosticsOptions = {}): RegisteredCommand {
  let current: RegisteredCommand | undefined
  const ctx = {
    commands: {
      register: (def: RegisteredCommand) => {
        current = def
        return () => {}
      },
    },
  }
  registerClientDiagnostics(ctx as unknown as Context, dshHome, options)
  return current!
}

describe('registerClientDiagnostics (/company-diagnostics)', () => {
  it('无参或 status 返回中文运行态自检摘要（含 workspace、可写态、健康 preset、索引体积、最近错误）', async () => {
    const home = makeHome()
    mkdirSync(join(home, CACHE_COMPANY_REL), { recursive: true })
    writeFileSync(join(home, CACHE_COMPANY_REL, 'session-search-company.db'), Buffer.alloc(2048))
    writeFileSync(join(home, CACHE_COMPANY_REL, 'session-search-company.db-wal'), Buffer.alloc(512))
    const cmd = mountDiagnostics(home, {
      workspace: '/repo/company-workspace',
      dataBlocked: false,
      presetHealth: { report: async () => ({ ready: true, broken: [] }) },
    })

    const writeRes = await cmd.handler({
      rawInput: ` client-error ${encodeURIComponent(JSON.stringify({
        kind: 'error',
        message: 'boom at http://localhost:3000/?token=secret123',
      }))}`,
    })
    expect(writeRes.kind).toBe('success')

    for (const rawInput of ['', '   ', ' status ']) {
      const res = await cmd.handler({ rawInput })
      expect(res.kind).toBe('success')
      expect(res.text).toContain('/repo/company-workspace')
      expect(res.text).toContain('正常可写')
      expect(res.text).toContain('全部正常（0 broken）')
      expect(res.text).toContain('2.5 KiB')
      expect(res.text).toContain('共 2 个文件')
      expect(res.text).toContain('boom at http://localhost:3000/?token=<redacted>')
      expect(res.text).not.toContain('secret123')
    }
  })

  it('en 模式下无参/status 与停写 + broken preset 摘要完全零中文', async () => {
    const home = makeHome()
    mkdirSync(join(home, CACHE_COMPANY_REL), { recursive: true })
    writeFileSync(join(home, CACHE_COMPANY_REL, 'big.db'), Buffer.alloc(2 * 1024 * 1024))
    const language = createCompanyLanguageState('en')
    const cmd = mountDiagnostics(home, {
      language,
      workspace: '',
      dataBlocked: true,
      blockedReason: '中文原因',
      blockedReasonEn: 'No workspace configured',
      presetHealth: {
        report: async () => ({ ready: true, broken: ['ceo: missing tool config'] }),
      },
    })

    const res = await cmd.handler({ rawInput: 'status' })
    expect(res.kind).toBe('success')
    assertEnglishUiClean(res.text, '/company-diagnostics status en')
    expect(res.text).toContain('(unset)')
    expect(res.text).toContain('blocked (No workspace configured)')
    expect(res.text).toContain('BROKEN (1): ceo: missing tool config')
    expect(res.text).toContain('2.00 MiB')
    expect(res.text).toContain(`0 entries (${CLIENT_ERRORS_REL})`)
  })

  it('presetHealth 未就绪与日志损坏回退时不崩；非法参数与坏载荷精准报错', async () => {
    const home = makeHome()
    mkdirSync(join(home, 'logs'), { recursive: true })
    writeFileSync(join(home, CLIENT_ERRORS_REL), '{not-valid-json\n', 'utf8')
    const cmd = mountDiagnostics(home)

    const statusRes = await cmd.handler({ rawInput: '' })
    expect(statusRes.kind).toBe('success')
    expect(statusRes.text).toContain('未就绪')
    expect(statusRes.text).toContain('0 B')

    expect((await cmd.handler({ rawInput: 'unknown-sub' })).kind).toBe('error')
    expect((await cmd.handler({ rawInput: 'client-error   ' })).kind).toBe('error')
    expect((await cmd.handler({ rawInput: 'client-error %E0%A4%A' })).kind).toBe('error')
    expect((await cmd.handler({ rawInput: `client-error ${encodeURIComponent('[]')}` })).kind).toBe('error')
    expect((await cmd.handler({ rawInput: `client-error ${encodeURIComponent('{"kind":"console","message":""}')}` })).kind).toBe('error')
  })
})
