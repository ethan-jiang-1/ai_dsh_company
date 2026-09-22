import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DELEGATION_TOOL_KEYS } from '../packages/company-pack/src/client/delegation-keys.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
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
})
