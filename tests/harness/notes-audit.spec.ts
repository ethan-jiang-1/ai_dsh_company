import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  auditNotes,
  deadPaths,
  hasDecisionSection,
  lifecycleOf,
  noteDate,
  noteStatus,
  noteTitle,
  receiptReasons,
} from '../../tools/lib/notes-audit.mjs'

const TMP: string[] = []
afterAll(() => { for (const dir of TMP) rmSync(dir, { recursive: true, force: true }) })

/**
 * notes/ 机械审计的判据层（2026-10-30）。只测**可机械判**的部分：
 * 路径存在性、取代回链、收据特征、状态行。语义分诊不在本 spec 的范围。
 */
const note = (file, body) => ({ file, text: body })

describe('notes-audit · 解析', () => {
  const text = '# 2026-10-30 · 一个决定\n\n状态：implemented（2026-10-30；授权）\n\n## 决定\n\n做 A。\n'

  it('日期取文件名、标题取 H1、状态取首部行', () => {
    expect(noteDate('notes/implemented/2026-10-30-x.md')).toBe('2026-10-30')
    expect(noteTitle(text)).toBe('2026-10-30 · 一个决定')
    expect(noteStatus(text)).toBe('状态：implemented（2026-10-30；授权）')
    expect(lifecycleOf('notes/implemented/2026-10-30-x.md', noteStatus(text))).toBe('implemented')
  })

  it('状态词前有加粗也认', () => {
    const s = '状态：**已消化（2026-10-30）**'
    expect(lifecycleOf('notes/archived/2026-10-30-x.md', s)).toBe('archived')
    expect(lifecycleOf('notes/implemented/2026-10-30-x.md', s)).toBe('implemented')
  })

  it('有「## 决定 / ## 决策」才算决定形状', () => {
    expect(hasDecisionSection(text)).toBe(true)
    expect(hasDecisionSection('## 决策\n')).toBe(true)
    expect(hasDecisionSection('## 结果\n')).toBe(false)
  })
})

describe('notes-audit · 收据特征', () => {
  it('自述「不是新决定」是收据', () => {
    const text = '# 批次收尾\n\n状态：implemented（不是新决定，是句号与现状）\n'
    expect(receiptReasons(text)).toContain('自述「不是新决定」')
  })

  it('自述「只记测量结果」是收据', () => {
    const text = '# 基线\n\n状态：implemented（本 Note 只记测量结果）\n'
    expect(receiptReasons(text)).toContain('自述「只记测量/结果」')
  })

  it('正常决定不误报', () => {
    const text = '# 一个决定\n\n状态：implemented（2026-10-30）\n\n## 决定\n\n做 A。\n'
    expect(receiptReasons(text)).toEqual([])
  })

  it('有「## 决定」的走查不是收据（体裁与内容分开判）', () => {
    const text = '# 场景走查\n\n状态：已交付（2026-10-18）\n\n## 决定\n\n保留三条 UX 判据。\n'
    expect(receiptReasons(text)).toEqual([])
  })

  it('正文里的「基线」不单独判收据（只看标题/状态/前 4 行/性质行）', () => {
    const text = '# 一个决定\n\n状态：implemented（2026-10-30）\n\n## 决定\n\n基准 = 基线读数。\n'
    expect(receiptReasons(text)).toEqual([])
  })
})

describe('notes-audit · 路径', () => {
  it('死路径按 root 判；vendor/dsh 回落；示例/负例跳过', () => {
    const root = mkdtempSync(join(tmpdir(), 'notes-audit-'))
    TMP.push(root)
    mkdirSync(join(root, 'docs'), { recursive: true })
    mkdirSync(join(root, 'vendor/dsh/docs'), { recursive: true })
    writeFileSync(join(root, 'docs/real.md'), 'x')
    writeFileSync(join(root, 'vendor/dsh/docs/vendor.md'), 'x')
    mkdirSync(join(root, 'vendor/dsh/notes'), { recursive: true })
    writeFileSync(join(root, 'vendor/dsh/notes/only-vendor.md'), 'x')
    const text = '`docs/real.md` `docs/vendor.md` `docs/missing.md` `docs/zz-fake.md` `docs/<x>.md` `notes/only-vendor.md`'
    expect(deadPaths(root, text)).toEqual(['docs/missing.md', 'notes/only-vendor.md'])
  })
})

describe('notes-audit · 取代回链', () => {
  const oldNote = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n## 决定\n\n旧。\n')
  const newNote = note(
    'notes/implemented/2026-10-02-new.md',
    '# new\n\n状态：implemented（2026-10-02）\n\n> **部分取代**：[old](./2026-10-01-old.md)\n\n## 决定\n\n新。\n',
  )

  it('新文说取代、旧文没有回链 → 报缺回链', () => {
    const result = auditNotes([oldNote, newNote], { root: process.cwd() })
    expect(result.summary.missingBacklinks).toEqual([
      { file: 'notes/implemented/2026-10-02-new.md', links: [{ line: 5, target: 'notes/implemented/2026-10-01-old.md' }] },
    ])
  })

  it('旧文提到新文件名 → 不报', () => {
    const linked = note(
      'notes/implemented/2026-10-01-old.md',
      '# old\n\n状态：implemented（2026-10-01）\n\n> 被 [new](./2026-10-02-new.md) 部分取代。\n\n## 决定\n\n旧。\n',
    )
    const result = auditNotes([linked, newNote], { root: process.cwd() })
    expect(result.summary.missingBacklinks).toEqual([])
  })

  it('否定句（不取代/未取代）不算取代', () => {
    const target = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n## 决定\n\n旧。\n')
    const source = note(
      'notes/implemented/2026-10-02-new.md',
      '# new\n\n状态：implemented（2026-10-02）\n\n> 这次**不取代** [old](./2026-10-01-old.md)\n',
    )
    const result = auditNotes([target, source], { root: process.cwd() })
    expect(result.summary.missingBacklinks).toEqual([])
  })

  it('整词匹配：源文件名不能靠更长 slug 蒙混', () => {
    const target = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n见 2026-10-02-newer。\n')
    const source = note('notes/implemented/2026-10-02-new.md', '# new\n\n状态：implemented（2026-10-02）\n\n> **取代** [old](./2026-10-01-old.md)\n')
    expect(auditNotes([target, source], { root: process.cwd() }).summary.missingBacklinks).toHaveLength(1)
  })

  it('围栏代码里的提及不算回链', () => {
    const target = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n```\n2026-10-02-new\n```\n')
    const source = note('notes/implemented/2026-10-02-new.md', '# new\n\n状态：implemented（2026-10-02）\n\n> **取代** [old](./2026-10-01-old.md)\n')
    expect(auditNotes([target, source], { root: process.cwd() }).summary.missingBacklinks).toHaveLength(1)
  })

  it('不可取代 / 没有必要取代 不算取代', () => {
    const target = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n## 决定\n\n旧。\n')
    const source = note('notes/implemented/2026-10-02-new.md', '# new\n\n状态：implemented（2026-10-02）\n\n> 这**不可取代** [old](./2026-10-01-old.md)，也没有必要取代它。\n')
    expect(auditNotes([target, source], { root: process.cwd() }).summary.missingBacklinks).toEqual([])
  })

  it('同一行重复链接只报一次', () => {
    const target = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n## 决定\n\n旧。\n')
    const source = note('notes/implemented/2026-10-02-new.md', '# new\n\n状态：implemented（2026-10-02）\n\n> **取代** [old](./2026-10-01-old.md) 与 [old](./2026-10-01-old.md)\n')
    expect(auditNotes([target, source], { root: process.cwd() }).summary.missingBacklinks).toHaveLength(1)
  })

  it('旧文的「被…取代」banner 不反向要求新文提旧文', () => {
    const oldNote = note(
      'notes/implemented/2026-10-01-old.md',
      '# old\n\n状态：implemented（2026-10-01）\n\n> 被 [new](./2026-10-02-new.md) 取代。\n\n## 决定\n\n旧。\n',
    )
    const newNote = note('notes/implemented/2026-10-02-new.md', '# new\n\n状态：implemented（2026-10-02）\n\n## 决定\n\n新。\n')
    expect(auditNotes([oldNote, newNote], { root: process.cwd() }).summary.missingBacklinks).toEqual([])
  })

  it('archived 目标是冻结层，不回写也不报', () => {
    const archived = note('notes/archived/2026-09-01-old.md', '# old\n\n## 决定\n\n旧。\n')
    const source = note(
      'notes/implemented/2026-10-02-new.md',
      '# new\n\n状态：implemented（2026-10-02）\n\n> **取代**：[old](../archived/2026-09-01-old.md)\n',
    )
    const result = auditNotes([archived, source], { root: process.cwd() })
    expect(result.summary.missingBacklinks).toEqual([])
  })
})

describe('notes-audit · 活引用与状态', () => {
  const orphan = note('notes/implemented/2026-10-01-old.md', '# old\n\n状态：implemented（2026-10-01）\n\n## 决定\n\n旧。\n')

  it('implemented 零入链 → orphan 候选', () => {
    const result = auditNotes([orphan], { root: process.cwd() })
    expect(result.summary.orphans).toEqual(['notes/implemented/2026-10-01-old.md'])
  })

  it('被另一篇 Note 链接 → 不再 orphan', () => {
    const linker = note(
      'notes/implemented/2026-10-02-new.md',
      '# new\n\n状态：implemented（2026-10-02）\n\n见 [old](./2026-10-01-old.md)。\n\n## 决定\n\n新。\n',
    )
    const result = auditNotes([orphan, linker], { root: process.cwd() })
    expect(result.summary.orphans).toEqual(['notes/implemented/2026-10-02-new.md'])
  })

  it('implemented 缺状态行 → statusMismatch；无决定节 → noDecision', () => {
    const bad = note('notes/implemented/2026-10-03-bad.md', '# bad\n\n只有事实。\n')
    const result = auditNotes([bad], { root: process.cwd() })
    expect(result.summary.statusMismatch).toEqual(['notes/implemented/2026-10-03-bad.md'])
    expect(result.summary.noDecision).toEqual(['notes/implemented/2026-10-03-bad.md'])
  })

  it('收据不因缺决定节被报 noDecision', () => {
    const receipt = note('notes/implemented/2026-10-03-receipt.md', '# 批次收尾\n\n状态：implemented（不是新决定）\n')
    const result = auditNotes([receipt], { root: process.cwd() })
    expect(result.summary.noDecision).toEqual([])
  })
})
