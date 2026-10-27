// @vitest-environment happy-dom
/**
 * 跨实例刷新广播的**订阅侧**判据（2026-10-19）：发布侧（成功即 dispatch）已在交互档钉住；
 * 这里证明「事件到达 ⇒ 面板真的重读」。浏览器里的多实例路径（公司页第四子页）当前**未验成**
 * （视图页签只在有内容的会话里渲染，见场景档 S13 的 NOTE），所以订阅侧必须在 keyless 层钉死。
 */
import { createElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CULTIVATION_CHANGED_EVENT } from '../../packages/company-pack/src/client/cultivation-actions.ts'
import { FULL_RECORD_LIMIT, useCultivationPanelData, type CultivationPanelData } from '../../packages/company-pack/src/client/cultivation-data.ts'

const IS_REACT_ACT_ENVIRONMENT = true
void IS_REACT_ACT_ENVIRONMENT

/** 极简远程面：只实现面板读盘用到的两个方法，记录调用次数。 */
function stubFiles() {
  const calls = { journal: 0, records: 0, read: 0 }
  return {
    calls,
    files: {
      // 形状照 hook 真实用法：listJournal 给"名字数组"（hook 内部 slice/逐个读），listRecords 给记录数组。
      listJournal: async () => { calls.journal++; return [] },
      listRecords: async () => { calls.records++; return [] },
      readRecordHead: async (_role: string, name: string) => { calls.read++; void name; return null },
      readRecord: async (_role: string, name: string) => { calls.read++; void name; return null },
    },
  }
}

describe('跨实例刷新广播：订阅侧（事件 ⇒ 重读）', () => {
  let container: HTMLDivElement | null = null
  afterEach(() => { container?.remove(); container = null })

  it('收到 CULTIVATION_CHANGED_EVENT ⇒ 立刻重读一次（不等 30s 轮询）', async () => {
    const { calls, files } = stubFiles()
    const Probe = (): null => { useCultivationPanelData(files as never, 'session-1' as never); return null }
    container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => { root.render(createElement(Probe)) })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    const afterMount = calls.records
    expect(afterMount, '挂载时先读一次').toBeGreaterThan(0)
    await act(async () => {
      window.dispatchEvent(new Event(CULTIVATION_CHANGED_EVENT))
      await new Promise(resolve => setTimeout(resolve, 20))
    })
    expect(calls.records, '广播到达必须重读').toBeGreaterThan(afterMount)
    await act(async () => { root.unmount() })
  })
})


describe('records 摘要全扫 + open/最近 N 全文（2026-10-27 R1）', () => {
  it('open 全部读全文；非 open 只读最近 FULL_RECORD_LIMIT 条；未展开可见', async () => {
    const names: string[] = ['20200101-000000-open.md']
    for (let i = 0; i < FULL_RECORD_LIMIT + 30; i += 1) {
      names.push(`20261001-${String(i).padStart(6, '0')}-old.md`)
    }
    const head = (name: string): string => `---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: e\nstatus: ${name.includes('open') ? 'open' : 'rejected'}\n---\n\nbody\n`
    let full = 0
    let heads = 0
    const files = {
      listJournal: async () => [],
      listRecords: async () => names,
      readRecordHead: async (_role: string, path: string) => { heads += 1; return head(path) },
      readRecord: async (_role: string, path: string) => { full += 1; return head(path) },
    }
    let data: CultivationPanelData | undefined
    function Probe(): null {
      data = useCultivationPanelData(files as never, 'session-1' as never)
      return null
    }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => { root.render(createElement(Probe)) })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
    expect(heads).toBe(names.length)
    expect(full).toBe(1 + FULL_RECORD_LIMIT)
    expect(data?.records).toHaveLength(names.length)
    expect(data?.brokenRecords).toEqual([])
    expect(data?.unexpandedRecords).toBe(30)
    await act(async () => { root.unmount() })
    container.remove()
  })
})
