import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

/**
 * 复核独立性分层声明（BUG-012 的机械兜底，2026-10-11）。
 *
 * 病根：一个模型戴五顶帽子、同模异线程的复核被当成「异人复核」报出去；V4 的 final 全篇
 * grep 不到「独立性」或「边际」字样。手册已立规则（`packages/company-pack/workspace/AGENTS.md`），
 * 本 spec 把**产出侧**钉住：带「AI 使用声明」的模板必须齐两条声明栏位，否则下一份 final
 * 照旧不会写——这正是 V4 的实况。
 *
 * 红配方（实测）：删掉任一模板的「复核独立性层级」或「边际宽度」栏位 → 本 spec 转红。
 */
// 负例留证 2026-10-11：BUG-012 修前先跑本文件 —— 5 份模板都没那两栏 ⇒ 2 failed（第 1、2 条），
// 补栏位后 3 passed；今天再删任一栏位仍会红（判据落在产出侧，不靠人记得写）。
// 2026-10-24：模板是基部（随包分发），读 pack 的单源；dev bundle 的 company-workspace/templates
// 是指回它的符号链接，不再作为测试基准。
const TEMPLATES = join(ROOT, 'packages/company-pack/workspace/templates')
const templateFiles = readdirSync(TEMPLATES).filter(name => name.endsWith('.md'))
const textOf = name => readFileSync(join(TEMPLATES, name), 'utf8')
/** 复核声明的落点 = 带「AI 使用声明」的产出模板（meta.md 是户口件，不带）。 */
const reviewed = templateFiles.filter(name => textOf(name).includes('AI 使用声明'))

describe('复核独立性分层声明（BUG-012）', () => {
  it('带 AI 使用声明的模板必须齐「独立性层级」与「边际宽度」两条声明', () => {
    expect(reviewed.length, '没有任何模板带「AI 使用声明」？判据失去落点').toBeGreaterThan(0)
    for (const name of reviewed) {
      const text = textOf(name)
      expect(text, `${name} 缺「复核独立性层级」栏`).toContain('复核独立性层级')
      expect(text, `${name} 缺「边际宽度」栏`).toContain('边际宽度')
    }
  })

  it('分层声明必须区分机械重算与判断类复核，且不得报成「异人」', () => {
    for (const name of reviewed) {
      const text = textOf(name)
      expect(text, `${name} 必须点明机械全量重算这一层`).toContain('机械全量重算')
      expect(text, `${name} 必须写明同模复核不得报成「异人」`).toMatch(/不得[^\n]*异人/)
    }
  })

  it('meta.md 是户口件，不强制复核声明（判据不误伤它）', () => {
    expect(textOf('meta.md')).not.toContain('AI 使用声明')
  })
})
