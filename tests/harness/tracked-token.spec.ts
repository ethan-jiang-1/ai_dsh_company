import { describe, expect, it } from 'vitest'
import { findTokenUrls } from '../../tools/lib/tracked-token.mjs'

// BUG-029 的 keyless 判据：真实 token URL 必须命中；动态参数与占位串不能假红。
// 负例留证 2026-10-20：BUG-013/029 —— 在 tracked 文件写合成 token URL → tracked-token 门禁红；
// 移除即绿（实跑见 notes/implemented/2026-10-20-tracked-token-guard.md）。
// ⚠ 测试源码里不要把 token 直接拼在 `?token=` 后面——门禁也会扫到本文件；用变量插值。
describe('tracked-token 纯逻辑', () => {
  it('命中带 token 的 URL，只回行号与长度，不回传 token 值', () => {
    const token = '0123456789abcdefghijABCDEFGHIJ'
    const text = [
      `dsh web: http://127.0.0.1:52382/?token=${token}`,
      'nothing here',
    ].join('\n')
    const hits = findTokenUrls(text)
    expect(hits).toEqual([{ line: 1, tokenLength: 30 }])
    expect(JSON.stringify(hits)).not.toContain(token)
  })

  it('忽略动态 token 参数与占位 secret（BUG-013/029 的已知假红）', () => {
    expect(findTokenUrls("token: url.searchParams.get('token')")).toEqual([])
    expect(findTokenUrls("const secret = 'never-render-this-placeholder'")).toEqual([])
    expect(findTokenUrls('http://127.0.0.1/?token=short')).toEqual([])
  })

  it('只在 URL 查询串里认 token；非 URL 的赋值、文档示例与短值不命中', () => {
    const token = '0123456789abcdefghij'
    expect(findTokenUrls(`const TOKEN = "${token}"`)).toEqual([])
    expect(findTokenUrls(`https://example.invalid/path?token=${token}`)).toEqual([
      { line: 1, tokenLength: 20 },
    ])
  })
})
