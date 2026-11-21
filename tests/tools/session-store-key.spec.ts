/**
 * session-store 键派生（唯一家）的 keyless 判据。
 *
 * 为什么单独立一条：这个形状（`-<cwd 去斜杠>--`）此前在三个脚本里各写一遍，门禁只能挡「新写一遍」；
 * 唯一家自己的正确性必须另有判据——否则门禁守着一个没人验过的实现。
 */
import { describe, expect, it } from 'vitest'
import { sessionStoreKey } from '../../tools/lib/session/session-store-key.mjs'

describe('sessionStoreKey（会话目录键唯一家）', () => {
  it('绝对路径 ⇒ 两端各一个 `-`、路径分隔符换成 `-`', () => {
    expect(sessionStoreKey('<repo>/company-workspace')).toBe('-<repo>-company-workspace--')
  })

  it('尾斜杠不额外产生分隔（调用方给什么就是什么，键只做字符替换）', () => {
    expect(sessionStoreKey('runtime/ws/')).toBe('-runtime-ws---')
  })

  it('相对路径同样成立（键的形状与绝对性无关）', () => {
    expect(sessionStoreKey('runtime/rehearsal-workspace')).toBe('-runtime-rehearsal-workspace--')
  })
})
