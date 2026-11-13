// 状态：常驻
// 合同钉子（BUG-039 修复轮）：tool-workflow 的结果渲染上限是**配置**，不是常量。
//
// 钉什么：本仓 vp-eng preset 把 `maxResultChars` 抬到 200000，让 >50k 的返回值**不被工具
//   自己截断**，从而走引擎的 spill 设计（spill-policy 保留头尾 + 把全文写盘 + 给可读路径）。
//   若这层配置失效（preset 行丢了 config / 上游改了字段名），模型又会拿到
//   `… [truncated: N more characters]` 且 spill 文件也是截断副本（BUG-039 原症状）。
//
// 红配方（prove-it-red）：把 preset 行的 `maxResultChars` 删掉 → 第三条用例红；
//   把 `RAISED` 改成 50_000 → 第二条用例红（text 含 truncation 标记）。还原 → 绿。
//
// 证明不了什么：不证明"spill 文件确实完整"——那由 spill-policy 的 saveText 语义 +
//   真模型探针（溢出后读 spill）给出。本 spec 只钉"工具没截断 + preset 确实配了"。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../../vendor/dsh/packages/workflow/tool-workflow/src/index.ts'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

/** 86k 字符的合成返回值——R7 实测的溢出量级（完整渲染 ~85.9k）。 */
const bigValue = {
  rows: Array.from({ length: 6 }, (_, branch) => ({
    name: `m0${String(branch + 1)}`,
    lines: Array.from({ length: 400 }, (_, line) => `m0${String(branch + 1)}-line-${String(line + 1)}: xxxxxxxxxxxxxxxxxxxx`),
  })),
}
const renderedLength = JSON.stringify(bigValue, null, 2).length
const RAISED = 200_000

/** 只提供 apply() 在注册期真正触碰的成员；render 是纯函数，闭包住 maxResultChars。 */
function renderText(maxResultChars: number): string {
  const captured: Array<{ output: { render: (args: unknown, value: unknown) => Array<{ text: string }> } }> = []
  const ctx = {
    logger: { warn: () => {} },
    on: () => () => {},
    systemPrompt: { section: () => {}, getSectionOrder: () => 0 },
    tools: { register: (tool: unknown) => { captured.push(tool as (typeof captured)[number]) } },
    workflowEngine: {},
  } as unknown as Context
  // 直接给已解析的 Config（schemastery 的默认值填充属 loader 职责；这里钉的是渲染行为）。
  apply(ctx, { toolName: 'workflow', maxResultChars, enableRunInBackground: true })
  const tool = captured[0]
  if (tool === undefined) throw new Error('tool-workflow registered no tool')
  return tool.output.render({ meta: { name: 'spill-audit' } }, {
    kind: 'foreground',
    runId: 'run-1',
    agentsStarted: 6,
    result: bigValue,
  }).map(block => block.text).join('\n')
}

/** 取 preset YAML 里 `- id: tool-workflow` 这一行块（到下一个同级 `- id:` 为止）。 */
function workflowRowBlock(): string {
  const text = readFileSync(join(repositoryRoot, 'packages/company-pack/presets/vp-eng/agent.cordis.yml'), 'utf8')
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.trim() === '- id: tool-workflow')
  if (start === -1) throw new Error('vp-eng preset declares no tool-workflow row')
  const rest = lines.slice(start + 1)
  const end = rest.findIndex(line => /^\s*- id: /.test(line))
  return [lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join('\n')
}

describe('workflow result rendering is governed by maxResultChars', () => {
  it('the 50000 default clips the rendered value and marks it', () => {
    const text = renderText(50_000)
    expect(renderedLength).toBeGreaterThan(50_000)
    expect(text).toContain('… [truncated:')
    expect(text.length).toBeLessThan(renderedLength)
  })

  it('the raised cap renders the full value without a truncation marker', () => {
    const text = renderText(RAISED)
    expect(text).not.toContain('[truncated:')
    expect(text).toContain('m06-line-400:')
    expect(text.length).toBeGreaterThan(renderedLength)
  })

  it('the vp-eng preset actually ships the raised cap on its tool-workflow row', () => {
    expect(workflowRowBlock()).toContain(`maxResultChars: ${String(RAISED)}`)
  })
})
