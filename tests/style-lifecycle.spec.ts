import { Context } from '../vendor/dsh/vendor/cordis/src/index.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installStyles } from '../packages/company-pack/src/client/styles.ts'

// Small DOM fixture: exercise owned node disposal, not browser rendering.
function styleDocument() {
  const nodes: object[] = []
  return {
    nodes,
    head: { append: (node: object) => nodes.push(node) },
    createElement: () => {
      const node = { dataset: {}, textContent: '', remove: () => {
        const index = nodes.indexOf(node)
        if (index >= 0) nodes.splice(index, 1)
      } }
      return node
    },
  }
}
afterEach(() => vi.unstubAllGlobals())

describe('company CSS registration lifetime', () => {
  it('disposing the fiber removes its CSS and reapply uses a fresh node', async () => {
    const doc = styleDocument()
    vi.stubGlobal('document', doc)
    const ctx = new Context()
    const plugin = (scope: Context) => { scope.effect(installStyles) }
    const first = ctx.plugin(plugin)
    await first
    const old = doc.nodes[0]
    expect(doc.nodes).toHaveLength(1)
    await first.dispose()
    expect(doc.nodes).toHaveLength(0)
    const second = ctx.plugin(plugin)
    await second
    expect(doc.nodes).toHaveLength(1)
    expect(doc.nodes[0]).not.toBe(old)
    await second.dispose()
    expect(doc.nodes).toHaveLength(0)
  })

  it('disposing an older mount does not remove a newer mount', () => {
    const doc = styleDocument()
    vi.stubGlobal('document', doc)
    const first = installStyles()
    const second = installStyles()
    const latest = doc.nodes[1]
    first(); first()
    expect(doc.nodes).toEqual([latest])
    second()
    expect(doc.nodes).toEqual([])
  })

  it('non-browser registration returns a harmless disposer', () => {
    vi.stubGlobal('document', undefined)
    expect(() => installStyles()()).not.toThrow()
  })
})
