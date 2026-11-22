// 「声明的上限必须有人消费」的机械判据（BUG-306 的类级收口，2026-11-22）。
//
// 事故：`LIST_CAPS.mine = 5` 写在状态 hook 里、`capList`/`capControl` 也支持，但渲染面从不调用——
// 类型系统看不出「声明了但没人读」，20 条记录把面板整段铺开。
//
// 判据形状：**读声明方 + 读消费方**，两边必须对得上。不是行为断言（行为断言在
// `cultivation-board.spec.ts` / `cultivation-actions.spec.ts` 里各有一份），这条钉的是
// 「每个键都至少有一个 `capControl('<key>'` 消费点」——新增键却忘了接线时先在这里红。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../../tools/lib/core/repository-layout.mjs'

const HOOK = 'packages/company-pack/src/client/cultivation/use-cultivation-board.tsx'
const SECTIONS = 'packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx'
const INBOX = 'packages/company-pack/src/client/cultivation/CultivationInbox.tsx'

// 负例留证 2026-11-22：删掉 `{capControl('mine', …)}` 那一行后 `vitest run tests/client/cultivation/list-caps-consumed.spec.ts` 1 failed（「这些键声明了但渲染面从不消费：mine」）；还原后 1/1 绿。BUG-306
describe('LIST_CAPS：每个声明键都有渲染面消费点（BUG-306）', () => {
  it('声明键集合 == 渲染面 capControl 的键集合', () => {
    const hook = readFileSync(join(repositoryRoot, HOOK), 'utf8')
    const declared = /\/\*\*[^*]*\*\/\s*const LIST_CAPS = \{([^}]*)\}/.exec(hook)?.[1]
    expect(declared, 'LIST_CAPS 声明形状变了：本判据要跟着改').toBeDefined()
    const keys = [...(declared ?? '').matchAll(/(\w+)\s*:/g)].map(match => match[1]).sort()
    expect(keys.length).toBeGreaterThan(0)

    const consumers = [SECTIONS, INBOX]
      .map(path => readFileSync(join(repositoryRoot, path), 'utf8'))
      .join('\n')
    const used = [...consumers.matchAll(/capControl\('(\w+)'/g)].map(match => match[1])
    const missing = keys.filter(key => !used.includes(key))
    expect(missing, `这些键声明了但渲染面从不消费：${missing.join(', ')}`).toEqual([])
  })
})
