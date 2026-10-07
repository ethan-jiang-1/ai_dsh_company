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
