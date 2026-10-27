/**
 * `/company-diagnostics`：把浏览器错误环的一条诊断写入公司盘（2026-10-28 R4-D6）。
 *
 * 为什么：client 没有往 session 追加事件的合法通道；但 client 可以经 `remote.commands.execute`
 * 调一个**人可见的 host 命令**。命令只追加一行到 `cultivation/client-errors.log`，agent 用 read
 * 就能看到“用户那一页”的错误。它不写会话事件、不改公司数据，只做诊断落盘。
 *
 * 安全：只收 `client-error <uri-encoded JSON>`；按字段白名单归一（kind/message/stack/at/href），
 * 长度有界、token URL 脱敏。日志是用户/操作员可读的普通文件，不冒充审计账本。
 */
import type { Context } from '@deepseek-ai/cordis'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/** 诊断日志落点（公司盘内；agent 可直接 read）。 */
export const CLIENT_ERRORS_REL = 'cultivation/client-errors.log'

const MAX_INPUT_CHARS = 8_000

function redact(text: string): string {
  return text.replace(/([?&]token=)[^\s&"'<>]+/g, '$1<redacted>')
}

/** 注册 `/company-diagnostics client-error <encoded>`。 */
export function registerClientDiagnostics(ctx: Context, companyHome: string, dataBlocked = false): void {
  ctx.commands.register({
    name: 'company-diagnostics',
    description: '把一条浏览器侧诊断写入 cultivation/client-errors.log（Web 错误环内部用；人可读）',
    input: { hint: 'client-error <URI-encoded JSON>' },
    handler: async ({ rawInput }: { readonly rawInput: string }) => {
      if (dataBlocked) {
        return { kind: 'error' as const, text: '公司数据已停写（身份/落点/lease 问题）；先修复再记录诊断。' }
      }
      const prefix = 'client-error '
      if (!rawInput.startsWith(prefix)) {
        return { kind: 'error' as const, text: '用法：/company-diagnostics client-error <URI-encoded JSON>' }
      }
      const encoded = rawInput.slice(prefix.length).trim()
      if (encoded === '' || encoded.length > MAX_INPUT_CHARS) {
        return { kind: 'error' as const, text: `诊断载荷为空或超过 ${String(MAX_INPUT_CHARS)} 字符。` }
      }
      let raw: unknown
      try {
        raw = JSON.parse(decodeURIComponent(encoded))
      } catch {
        return { kind: 'error' as const, text: '诊断载荷不是合法的 URI-encoded JSON。' }
      }
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { kind: 'error' as const, text: '诊断载荷必须是对象。' }
      }
      const source = raw as Record<string, unknown>
      const kind = source.kind === 'error' || source.kind === 'rejection' || source.kind === 'console'
        ? source.kind
        : 'error'
      const message = typeof source.message === 'string' ? redact(source.message).slice(0, 1_000) : ''
      if (message === '') return { kind: 'error' as const, text: '诊断载荷缺 message。' }
      const entry = {
        kind,
        message,
        ...(typeof source.stack === 'string' ? { stack: redact(source.stack).slice(0, 2_000) } : {}),
        at: typeof source.at === 'number' ? source.at : Date.now(),
        ...(typeof source.href === 'string' ? { href: redact(source.href).slice(0, 500) } : {}),
      }
      const path = join(companyHome, CLIENT_ERRORS_REL)
      try {
        mkdirSync(join(companyHome, 'cultivation'), { recursive: true })
        appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), entry })}\n`, 'utf8')
      } catch (error) {
        return { kind: 'error' as const, text: `诊断写入失败：${(error as Error).message}` }
      }
      return { kind: 'success' as const, text: `已记录客户端错误（${CLIENT_ERRORS_REL}）。` }
    },
  })
}
