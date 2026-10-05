/**
 * 动效层的 keyless 守卫（S3）：**每个动画类都必须在 reduced-motion 块里被关掉**。
 *
 * 为什么需要它：官方惯例是尊重 `prefers-reduced-motion`（vendor 内 28 个样式表都这么做），
 * 而"加了新动画忘了加复位"是静默的——样式照样生效、无障碍要求悄悄破了。
 * 真页面的行为断言（`getComputedStyle().animationName === 'none'`）在认证档里，
 * 这条守卫保证**源码层面**不会漏。
 *
 * 反证：把 reduced-motion 块里的 `.wk-node` 删掉，本测试即红。
 */
import { repositoryRoot as ROOT } from '../../scripts/lib/repository-layout.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(ROOT, 'packages', 'company-pack', 'src', 'client', 'styles.ts'),
  'utf8',
)

/** 从 `@media (prefers-reduced-motion: reduce) { ... }` 块里取出选择器文本。 */
function reducedMotionBlock(): string {
  const start = source.indexOf('@media (prefers-reduced-motion: reduce)')
  expect(start, 'styles.ts 里没有 reduced-motion 块').toBeGreaterThan(-1)
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  throw new Error('reduced-motion 块没有闭合')
}

describe('动效 CSS 守卫（S3）', () => {
  it('keyframes 都在场（边画线 / 边流动 / 节点入场 / 条目滑入）', () => {
    for (const name of ['wk-edge-draw', 'wk-edge-flow', 'wk-node-in', 'wk-slide-in']) {
      expect(source.includes(`@keyframes ${name}`), `缺 keyframes ${name}`).toBe(true)
    }
  })

  it('每个动画类都被 reduced-motion 块点名关掉', () => {
    const block = reducedMotionBlock()
    for (const selector of ['.wk-edge', '.wk-node', '.wk-activity']) {
      expect(block.includes(selector), `reduced-motion 块没关 ${selector}`).toBe(true)
    }
    expect(block.includes('animation: none !important')).toBe(true)
  })

  it('动画只在 CSS 里声明（组件不写内联 animation，避免绕过复位）', () => {
    const panels = readFileSync(
      join(ROOT, 'packages', 'company-pack', 'src', 'client', 'company-panels.tsx'),
      'utf8',
    )
    expect(/animation\s*:/.test(panels), 'company-panels.tsx 里出现内联 animation（会绕过 reduced-motion 复位）').toBe(false)
  })
})
