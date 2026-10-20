import { describe, expect, it } from 'vitest'
import { extractInjectedHandbook, freshnessProblems, handbookDrift } from '../../tools/lib/replay-fixture-freshness.mjs'

const wrap = (handbook) =>
  `<system-reminder>\nThe following workspace instructions may be relevant…\n\nInstructions from: AGENTS.md\n\n${handbook}\n\n</system-reminder>`

describe('replay-fixture-freshness 纯逻辑', () => {
  it('提取 marker 到 </system-reminder> 之间的手册正文，去首尾空行', () => {
    expect(extractInjectedHandbook(wrap('# 手册\n\n- 条款一\n'))).toBe('# 手册\n\n- 条款一')
    expect(extractInjectedHandbook(wrap('# 手册'))).toBe('# 手册')
  })

  it('无 marker = undefined（普通 user/message 不误当空手册）', () => {
    expect(extractInjectedHandbook('动议：请出一版方案')).toBeUndefined()
    expect(extractInjectedHandbook(undefined)).toBeUndefined()
  })

  it('handbookDrift：一致 = null；不一致给首个差异行与双方内容（尾部空行差异不算漂移）', () => {
    expect(handbookDrift('# A\n- x\n', '# A\n- x\n\n')).toBe(null)
    const drift = handbookDrift('# A\n旧行\n- y\n', '# A\n新行\n- y\n')
    expect(drift).toEqual({ line: 2, recorded: '旧行', current: '新行' })
    const shorter = handbookDrift('# A\n- x\n- 多一行\n', '# A\n- x\n')
    expect(shorter).toEqual({ line: 3, recorded: '- 多一行', current: '(缺)' })
  })

  it('freshnessProblems：注入面与现行一致 = 无问题；漂移点名场景/文件/行号与三选一出路', () => {
    const handbook = '# 手册\n- 条款一'
    const fresh = freshnessProblems('r9', [{ file: 'session.v3.jsonl', injections: [wrap(handbook)] }], `${handbook}\n`)
    expect(fresh).toEqual([])
    const drifted = freshnessProblems('r9', [{ file: 'session.v3.jsonl', injections: [wrap('# 手册\n- 旧条款')] }], handbook)
    expect(drifted).toHaveLength(1)
    expect(drifted[0]).toContain('r9/session.v3.jsonl')
    expect(drifted[0]).toContain('第 2 行')
    expect(drifted[0]).toContain('重录')
  })

  it('freshnessProblems：runnable+full 却无任何注入面 = 形状异常 fail-loud，不静默跳过', () => {
    const problems = freshnessProblems('r9', [{ file: 'session.v3.jsonl', injections: [] }], '# 手册')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('未找到手册注入面')
  })
})
