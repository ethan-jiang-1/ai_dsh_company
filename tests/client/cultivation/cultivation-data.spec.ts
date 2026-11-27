// @vitest-environment happy-dom
// 负例留证 2026-11-27：document.visibilitychange 直接绑 wake() 不判 visibilityState === 'visible' ⇒ 切后台 hidden 时仍发整套 read/list 请求（BUG-400）；仅 visible 时唤醒后绿。BUG-400
/**
 * 跨实例刷新广播的**订阅侧**判据（2026-10-19）：发布侧（成功即 dispatch）已在交互档钉住；
 * 这里证明「事件到达 ⇒ 面板真的重读」。浏览器里的多实例路径（公司页第四子页）当前**未验成**
 * （视图页签只在有内容的会话里渲染，见场景档 S13 的 NOTE），所以订阅侧必须在 keyless 层钉死。
 */
import { createElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CULTIVATION_CHANGED_EVENT } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'
import { FULL_RECORD_LIMIT, useCultivationPanelData, type CultivationPanelData ,
  workspaceLabelOf,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'

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
      listRecords: async () => { calls.records++; return { ok: true, names: [] } },
      readRecordHead: async (_role: string, name: string) => { calls.read++; void name; return null },
      readRecord: async (_role: string, name: string) => { calls.read++; void name; return { ok: false as const, reason: 'unavailable' } },
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
      listRecords: async () => ({ ok: true, names }),
      readRecordHead: async (_role: string, path: string) => { heads += 1; return head(path) },
      readRecord: async (_role: string, path: string) => { full += 1; return { ok: true as const, eof: true, text: head(path) } },
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
    expect(data?.records?.find(record => record.id.includes('open'))?.bodyTruncated).toBe(false)
    expect(data?.records?.filter(record => record.bodyTruncated === true)).toHaveLength(30)
    await act(async () => { root.unmount() })
    container.remove()
  })
})

// 截断 ≠ 全文：`readRecord` 的 eof=false 必须让记录保持 bodyTruncated=true，
// 面板才会说「只加载了前 N 行」；此前 eof 被丢、bodyTruncated 被无条件写 false。
// 负例留证 2026-11-22：把 readRecord 的 bodyTruncated 写回 false 后 `vitest run tests/client/cultivation/cultivation-data.spec.ts` 1 failed；改回 !eof 后 5/5 绿。BUG-298
describe('record 截断（BUG-298）', () => {
  it('eof=false ⇒ 该记录 bodyTruncated 保持 true（不当全文）', async () => {
    const head = '---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: e\nstatus: open\n---\n\nbody\n'
    const files = {
      listJournal: async () => [],
      listRecords: async () => ({ ok: true as const, names: ['20261122-000000-long.md'] }),
      readRecordHead: async () => head,
      readRecord: async () => ({ ok: true as const, eof: false, text: head }),
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
    expect(data?.records?.[0]?.bodyTruncated).toBe(true)
    await act(async () => { root.unmount() })
    container.remove()
  })
})

// 作用域标签与失败原因（BUG-291 的 F2 合同）：`workspaceLabelOf` 是面板「点名哪个盘」的唯一来源，
// `recordsProblem` 是「读不到」与「空」分家的唯一依据——两者都必须有直接判据。
describe('workspaceLabelOf（作用域标签）', () => {
  it('取末段；尾斜杠/Windows 分隔符都能处理', () => {
    expect(workspaceLabelOf('<repo>/company-workspace')).toBe('company-workspace')
    expect(workspaceLabelOf('<repo>/company-workspace/')).toBe('company-workspace')
    expect(workspaceLabelOf('C:\\repo\\rehearsal-workspace')).toBe('rehearsal-workspace')
  })

  it('缺席/空串 ⇒ null（面板退回不点名，不编一个名字）', () => {
    expect(workspaceLabelOf(undefined)).toBeNull()
    expect(workspaceLabelOf(null)).toBeNull()
    expect(workspaceLabelOf('')).toBeNull()
    expect(workspaceLabelOf('/')).toBeNull()
  })
})

// 预览窗口不是格式判据（BUG-321/322）：
// ① 头窗口读不出闭合 --- 的合法记录，补读全文后必须按「合法记录」收，不能进坏记录；
// ② 预览窗口里没有 # 标题时，补读更大窗口拿标题，而不是静默退回文件名。
// 负例留证 2026-11-23：去掉「头窗口失败补读全文」后 `vitest run tests/client/cultivation/cultivation-data.spec.ts` 1 failed（合法长前置记录被判坏）。BUG-321
// 负例留证 2026-11-23：去掉「补读更大窗口」后同一命令 1 failed（标题退回文件名）。BUG-322
describe('头窗口不当作格式判据（BUG-321）', () => {
  it('frontmatter 超 60 行的合法记录 ⇒ 补读全文后算合法（不进坏记录）', async () => {
    const longHead = `---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: e\nstatus: open\n${Array.from({ length: 55 }, (_, i) => `# c${String(i)}`).join('\n')}\n---\n\nbody\n`
    const files = {
      listJournal: async () => [],
      listRecords: async () => ({ ok: true as const, names: ['20261122-000000-long.md'] }),
      readRecordHead: async () => longHead.slice(0, 200), // 头窗口：截在 frontmatter 中间
      readRecord: async () => ({ ok: true as const, eof: true, text: longHead }),
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
    expect(data?.brokenRecords).toEqual([])
    expect(data?.records).toHaveLength(1)
    await act(async () => { root.unmount() })
    container.remove()
  })

})

describe('journal 预览补读标题（BUG-322）', () => {
  it('预览没有 # 标题 ⇒ 补读更大窗口拿标题', async () => {
    const files = {
      listJournal: async () => ['2026-11-22-long.md'],
      readHead: async () => '一段没有标题的长前言……',
      readJournalMore: async () => '# 真正的标题\n\n正文',
      listRecords: async () => ({ ok: true as const, names: [] }),
      readRecordHead: async () => null,
      readRecord: async () => ({ ok: false as const, reason: 'x' }),
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
    const row = data?.journalRows?.find(entry => entry.role === 'ceo')
    expect(row?.entries?.[0]?.title).toContain('真正的标题')
    await act(async () => { root.unmount() })
    container.remove()
  })
})

describe('visibilitychange 后台过滤（BUG-400）', () => {
  it('document.visibilityState === hidden 时不触发重载，切回 visible 时触发', async () => {
    const { calls, files } = stubFiles()
    function Probe(): null {
      useCultivationPanelData(files as never, 'session-vis' as never)
      return null
    }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const desc = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    try {
      await act(async () => { root.render(createElement(Probe)) })
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
      const afterInit = calls.records

      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
      expect(calls.records).toBe(afterInit)

      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
      expect(calls.records).toBe(afterInit + 1)
    } finally {
      if (desc !== undefined) Object.defineProperty(document, 'visibilityState', desc)
      else delete (document as { visibilityState?: string }).visibilityState
      await act(async () => { root.unmount() })
      container.remove()
    }
  })
})
