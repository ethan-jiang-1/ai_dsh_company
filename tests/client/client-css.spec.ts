/**
 * 客户端 CSS 源码守卫（2026-09-26 立，起因 = code-review 抓到的两类静默失败）：
 *
 * ① **令牌存在性**：`var(--dsw-xxx)` 写错名字（或令牌被上游改名）时，CSS **不报错**——
 *    有 fallback 就用 fallback、没 fallback 就整条声明失效。真实事故：`.wk-dag-wait` 写了
 *    `--dsw-alias-state-warning-primary`（真名 `state-warn-primary`）+ 硬编码 `#b8860b` 兜底
 *    ⇒ 徽章永远不跟主题。判据 = 我方引用的每个 `--dsw-*` 都必须在 **vendor client 面源码 CSS**
 *    里有定义（构建产物 `lib/` 不算事实源）。
 * ② **动画元素纯度**：带 `animation` 的元素上**不许再声明动画会动的属性**——CSS 级联里
 *    animation 声明高于普通作者声明，动画结束态会把作者值吃掉。这个坑已咬过两次：
 *    transform 覆盖 SVG 定位（2026-09-25 堆叠事故）、opacity 覆盖"完成态降透明"。
 * ③ **行首座位的尺寸上限**（2026-10-13 立）：官方行首座位是 16px 格（vendor `Rows.module.css`
 *    的 `.slot`），占用者声明宽度超过它就会两侧溢出——3 字药丸（32.45px）实际把标记推出行框、
 *    压到标题首字上（真几何判据 = `probes/browser-visual/sidebar-role-mark-probe.mjs`）。
 *
 * 反证：把 `styles.ts` 里的 `state-warn-primary` 改回 `state-warning-primary` ⇒ ① 红；
 *       把完成态降透明写回 `.wk-node { opacity: .55 }` ⇒ ② 红；
 *       把 `.wk-role-badge` 的 `width` 改成 32px ⇒ ③ 红。
 */
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CLIENT_SRC = join(ROOT, 'packages', 'company-pack', 'src', 'client')
const STYLES = readFileSync(join(CLIENT_SRC, 'styles.ts'), 'utf8')

/** 递归收集文件（只认后缀；跳过 node_modules 与构建产物 lib/）。 */
function collect(dir: string, suffix: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lib') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) collect(path, suffix, out)
    else if (entry.name.endsWith(suffix)) out.push(path)
  }
  return out
}

/** vendor client 面**源码** CSS 里定义过的全部 `--dsw-*` 令牌。 */
function vendorTokens(): Set<string> {
  const tokens = new Set<string>()
  for (const file of collect(join(ROOT, 'vendor', 'dsh', 'packages', 'client'), '.css')) {
    for (const match of readFileSync(file, 'utf8').matchAll(/(--dsw-[a-z0-9-]+)\s*:/g)) tokens.add(match[1]!)
  }
  return tokens
}

/** 我方 client 源码里 `var(--dsw-*)` 引用的全部令牌。 */
function ourTokens(): Map<string, string[]> {
  const used = new Map<string, string[]>()
  for (const file of collect(CLIENT_SRC, '.ts').concat(collect(CLIENT_SRC, '.tsx'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/var\((--dsw-[a-z0-9-]+)/g)) {
      const list = used.get(match[1]!) ?? []
      if (!list.includes(file)) list.push(file)
      used.set(match[1]!, list)
    }
  }
  return used
}

/** 去掉注释后切出顶层规则（够用即可：只关心选择器文本与声明块）。 */
function rules(source: string): { selector: string; full: string; body: string }[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(match => ({
      selector: match[1]!.trim().split('\n').pop()!.trim(),
      full: match[1]!.trim(),
      body: match[2]!,
    }))
    .filter(rule => !rule.selector.startsWith('@') && !rule.selector.startsWith('from') && !rule.selector.startsWith('to'))
}

describe('客户端 CSS：令牌存在性', () => {
  it('我方引用的每个 --dsw-* 都在 vendor 源码 CSS 里有定义（写错名 = 静默失效）', () => {
    const defined = vendorTokens()
    expect(defined.size).toBeGreaterThan(100)
    const missing = [...ourTokens().entries()].filter(([token]) => !defined.has(token))
    expect(missing, `未定义的令牌：${missing.map(([t, f]) => `${t}（${f.join(',')}）`).join('；')}`).toEqual([])
  })

  it('令牌引用不写硬编码颜色兜底（兜底会掩盖名字写错）', () => {
    const withFallback = [...STYLES.matchAll(/var\(--dsw-[a-z0-9-]+,\s*(#[0-9a-fA-F]{3,8}|rgba?\()/g)].map(m => m[0])
    expect(withFallback).toEqual([])
  })
})

describe('客户端 CSS：动画元素纯度（animation 声明高于作者声明）', () => {
  const animated = ['.wk-node', '.wk-edge']

  it('带动画的元素自身不声明 opacity / transform（会被动画结束态吃掉）', () => {
    const offenders: string[] = []
    for (const rule of rules(STYLES)) {
      if (!animated.includes(rule.selector)) continue
      for (const property of ['opacity', 'transform']) {
        if (new RegExp(`(^|;|\\s)${property}\\s*:`).test(rule.body)) offenders.push(`${rule.selector} { ${property} }`)
      }
    }
    expect(offenders, `动画元素上出现会被覆盖的属性：${offenders.join('；')}`).toEqual([])
  })

  it('完成态降透明落在**不被动画的子元素**上（结构性钉子）', () => {
    const dim = rules(STYLES).find(rule => /^\.wk-node\[data-status='completed'\]\s+\./.test(rule.full))
    expect(dim, '找不到"完成态降透明"规则，或它没落在子元素上').toBeDefined()
    expect(dim!.body).toContain('opacity')
    expect(dim!.full).toContain('.wk-dag-card')
  })
})

describe('客户端 CSS：行首座位的尺寸上限（2026-10-13 立）', () => {
  /**
   * 起因：`.wk-role-badge` 首版是 3 字药丸（32.45px），而官方座位是 **16px** 格且
   * `justify-content:center` ⇒ 居中后两侧各溢出一半。真 DOM 实测（真 web app 侧栏）：
   * 左溢 8.22px（标记被推出行框，窄窗里被容器边界切掉字母）、右溢 8.23px（吃掉 4px
   * 标题间隙、压到标题首字盒上）。修法 = 标记按 12px 设计（同格的计划任务时钟图标尺寸）。
   * 反证：把 `width: 12px` 改回 32px ⇒ 本门禁红（真几何判据 = probes/browser-visual/
   * sidebar-role-mark-probe.mjs，那档查真渲染盒）。
   */
  const seatCeiling = 16

  it(`座位占用者的声明宽度 ≤ ${String(seatCeiling)}px 且 box-sizing 为 border-box（内边距不许把盒子撑过座位）`, () => {
    const badge = rules(STYLES).find(rule => rule.selector === '.wk-role-badge')
    expect(badge, '找不到 .wk-role-badge 规则').toBeDefined()
    const width = /(^|;|\s)width:\s*([\d.]+)px/.exec(badge!.body)
    expect(width, '.wk-role-badge 没声明 px 宽度（无法核对座位上限）').not.toBeNull()
    expect(Number(width![2])).toBeLessThanOrEqual(seatCeiling)
    expect(badge!.body, 'box-sizing 不是 border-box：padding 会把渲染盒撑过座位').toContain('box-sizing: border-box')
  })
})
