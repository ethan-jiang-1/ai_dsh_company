/**
 * 成品目录的纯函数（2026-11-15，src↔tests 目录对齐卡：src/lib/deliverables/ 的测试家）。
 *
 * 判据：`meta.md` 的 `字段: 值` 行（中英文冒号都认、首现优先、events 累加、坏行忽略）；
 * 目录名去日期前缀成 slug；路径归一成工作区相对正斜杠；文件地址段级 encode 且保留盘符冒号。
 * 为什么这条 spec 存在：`tests/lib/deliverables/` 要与 `src/lib/deliverables/` 同名——目录对齐
 * 不能靠 `.gitkeep` 占位，得有一条真断言。
 * 不证明：生成器 `tools/repo/deliverables-index.mjs` 的产物形状（那在 tests/tools）。
 */
import { describe, expect, it } from 'vitest'
import { parseMeta, slugFromDirName, normalizeRel } from '../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts'
import { sessionFileAddress } from '../../../packages/company-pack/src/lib/deliverables/deliverables-address.ts'

describe('成品目录：meta 解析与路径归一', () => {
  it('中英文冒号都认，首现优先，坏行忽略', () => {
    const meta = parseMeta('type: decision\ntype: production\n标题：周报\n这行没有冒号\n\n结果: accepted')
    expect(meta.fields.get('type')).toBe('decision')
    expect(meta.fields.get('标题')).toBe('周报')
    expect(meta.fields.get('结果')).toBe('accepted')
  })

  it('events 累加且不占字段位', () => {
    const meta = parseMeta('events: kickoff\nkicker: x\nevents: review\n')
    expect(meta.events).toEqual(['kickoff', 'review'])
    expect(meta.fields.has('events')).toBe(false)
  })

  it('目录名去日期前缀；无前缀原样保留', () => {
    expect(slugFromDirName('2026-10-24-coding-harness-v2')).toBe('coding-harness-v2')
    expect(slugFromDirName('adhoc')).toBe('adhoc')
  })

  it('路径归一：反斜杠、开头 ./、重复斜杠', () => {
    expect(normalizeRel('.\\drafts\\\\mrd.md')).toBe('drafts/mrd.md')
    expect(normalizeRel('./a//b.md')).toBe('a/b.md')
  })

  it('文件地址段级 encode，保留盘符冒号', () => {
    expect(sessionFileAddress('s1', 'drafts/a b#c.md')).toBe('dsh-resource://file/session/s1/drafts/a%20b%23c.md')
    expect(sessionFileAddress('s1', 'C:\\work\\x.md')).toBe('dsh-resource://file/session/s1/C:/work/x.md')
  })
})
