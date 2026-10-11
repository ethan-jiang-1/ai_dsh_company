import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DELEGATION_TOOL_KEYS } from '../../packages/company-pack/src/client/delegation-keys.ts'

const PACK = join(ROOT, 'packages/company-pack')
const PRESETS_DIR = join(PACK, 'presets')

describe('client 面（R3：委派工具卡）', () => {
  it('工具卡的 key 与 CEO preset 的命名委托工具逐字一致（keyed slot 拼错不报错，只是永不渲染）', () => {
    const ceo = readFileSync(join(PRESETS_DIR, 'ceo', 'agent.cordis.yml'), 'utf8')
    const toolNames = [...ceo.matchAll(/toolName: (vp_[a-z]+)$/gm)].map(m => m[1] as string).sort()
    expect(toolNames.length, 'CEO preset 里没找到命名委托工具').toBeGreaterThan(0)
    expect([...DELEGATION_TOOL_KEYS].sort(), 'key 与 preset 的 toolName 不一致 → 卡片永远不渲染').toEqual(toolNames)
  })

  it('LedgerTab 长摘要必须有非 hover 的键盘/触屏全文入口和稳定展示边界', () => {
    const ledger = readFileSync(join(PACK, 'src/client/LedgerTab.tsx'), 'utf8')
    const styles = readFileSync(join(PACK, 'src/client/styles.ts'), 'utf8')
    // ⚠ 2026-10-11 复核：此前「展开态」用 /summary/ 命中 `row.summary`、「展示边界」用 /height:/ 命中
    // `line-height:` ⇒ 两条恒绿的空转断言，已换成下面这些。除最后一条「不许开免裁口子」外，
    // 每条都在 6094d67 基线上转红（脚本核过 7/7）；最后一条是**防回潮守卫**——基线没有那个选择器，
    // 它只在有人把免裁口子加回来时才红，别把它算进「改造前必红」那批。
    expect(ledger, '长摘要不能只依赖 title hover').toContain("expanded ? '收起（收起完整结论）' : '全文（查看完整结论）'")
    expect(ledger, '可访问名必须包含可见标签（WCAG 2.5.3）').toMatch(/aria-label=\{expanded \? '收起（/)
    expect(ledger, '全文入口必须是可聚焦控件（不是 span/div 假按钮）').toMatch(/<Button|<button/)
    expect(ledger, '全文必须能在面板内展开（真状态位，不是 summary 字段名）').toMatch(/const \[expanded, setExpanded\] = useState\(false\)/)
    expect(ledger, '展开态要真的驱到样式类上（否则按钮点了没变化）').toMatch(/expanded \? ' is-expanded' : ''/)
    expect(styles, '摘要行必须有行数边界（line-clamp，不是任意 height:）').toMatch(/-webkit-line-clamp/)
    // 行高稳定 = 所有行都吃边界；不许留「短行免裁」的口子（那正是行高在 6–9 行间跳的成因）。
    expect(styles, '不许给短行开免裁的口子（否则窄栏里 80 字的行也会长到 3–4 行）')
      .not.toMatch(/\.wk-row-summary:not\(/)
    expect(ledger, '入口要按布局量出的溢出给（被裁必有入口），不能只按字符数')
      .toMatch(/scrollHeight > node\.clientHeight/)
    expect(ledger, '栏宽变化要重量（侧栏可拖宽/浮出）').toMatch(/ResizeObserver/)
    expect(ledger, '量溢出要在绘制前跑（否则首帧闪出「有裁切、没入口」）').toMatch(/useLayoutEffect/)
  })

  it('client 入口确实注册了 tool.call.toolview，且 key 走共享常量（不写死）', () => {
    const index = readFileSync(join(PACK, 'src/client/index.ts'), 'utf8')
    expect(index, 'client 入口没有注册 tool.call.toolview').toContain("'tool.call.toolview'")
    expect(index, '注册必须遍历 DELEGATION_TOOL_KEYS').toContain('DELEGATION_TOOL_KEYS')
    // 委派卡只依赖 slots，不该被 team remote 的缺席拖住（与品牌/任务板分开 inject）。
    expect(index, "委派卡应单独 ctx.inject(['slots'], …)").toMatch(/ctx\.inject\(\['slots'\]/)
  })

  it('tool.call.toolview 注册必须带 priority -1（同键同优先级 = 注册 throw）', () => {
    // rc.2 的 vendor details-toolview 也在 spawn_teammate / send_message / list_agents / team_task_* 上
    // 注册（priority 0）；keyed 槽"同键同优先级"直接 throw（vendor ui-slots：lowest renders）。
    // ⚠ 这条**只能靠源码钉**：2026-09-26 实测把 priority 去掉后 `client-load-smoke` 仍全绿
    //   （冲突要等该 key 的一次工具调用渲染才炸）⇒ 加载档不是这个虫类的防线。
    const index = readFileSync(join(PACK, 'src/client/index.ts'), 'utf8')
    const calls = [...index.matchAll(/slots\.register\(\{([^}]*)\}/g)].map(match => match[1]!)
    const toolviews = calls.filter(call => call.includes("'tool.call.toolview'"))
    expect(toolviews.length, 'tool.call.toolview 注册数变了，复核本断言').toBe(2)
    for (const call of toolviews) {
      expect(call, '缺 priority（或非负）= 与 vendor details-toolview 同键同优先级 ⇒ 注册 throw').toMatch(/priority:\s*-\d/)
    }
  })
})
