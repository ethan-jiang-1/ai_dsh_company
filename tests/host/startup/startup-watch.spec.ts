/**
 * wiki 指针新鲜度 watcher 的 keyless 判据（2026-11-12，新鲜度）。
 *
 * 判据：
 * ① 指针有效时派生文件带 `checkedAt`；重复 sync 在语义无变化时不重写（不喂自己的事件）；
 * ② 目标目录/index 被删 → 事件去抖后派生文件变成 `missing` / `no-index`，`checkedAt` 更新；
 * ③ watcher 布不上（权限/平台）时 sync 仍写派生文件，面板靠 `checkedAt` 退化为「上次检查」；
 * ④ 指针清空 → 派生文件回空检查。
 *
 * 红配方：把 `schedule` 里的 `this.sync(workspace)` 还原成空操作 → 删除事件后用例红；
 * 把 `sameOptions` 的比较去掉 → 第二次 sync 的 `checkedAt` 变新，`不重写` 用例红。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { StartupOptionsWatch, type WatchHandle, type WatchPort } from '../../../packages/company-pack/src/host/startup/startup-watch.ts'
import { readStartupOptions, writeStartupSettings } from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { EMPTY_STARTUP_SETTINGS } from '../../../packages/company-pack/src/lib/startup-settings.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function temp(): string {
  const root = mkdtempSync(join(tmpdir(), 'startup-watch-'))
  roots.push(root)
  return root
}

/** 假 watcher：记下每个路径当前的 listener，测试直接点火。 */
function fakePort(): { port: WatchPort, listeners: Map<string, (filename: string | null) => void>, watched: string[] } {
  const listeners = new Map<string, (filename: string | null) => void>()
  const watched: string[] = []
  return {
    port: {
      watch(path, listener): WatchHandle {
        watched.push(path)
        listeners.set(path, listener)
        return { close: () => { if (listeners.get(path) === listener) listeners.delete(path) } }
      },
    },
    listeners,
    watched,
  }
}

/** 让去抖 timer 跑完。 */
function settle(ms = 25): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function seed(root: string, wiki: string): void {
  writeStartupSettings(root, { ...EMPTY_STARTUP_SETTINGS, wiki, updatedAt: '2026-11-12T00:00:00.000Z' })
}

describe('StartupOptionsWatch', () => {
  it('有效指针：派生文件带 checkedAt；语义不变时重复 sync 不重写', () => {
    const root = temp()
    mkdirSync(join(root, 'wiki'), { recursive: true })
    writeFileSync(join(root, 'wiki', 'index.md'), '# i\n')
    seed(root, 'wiki')
    const fake = fakePort()
    const watch = new StartupOptionsWatch({ port: fake.port })
    try {
      const first = watch.sync(root)
      expect(first?.wikiCheck).toMatchObject({ value: 'wiki', ok: true, problem: null, location: 'inside' })
      expect(first?.wikiCheck.checkedAt).toEqual(expect.any(String))
      const before = readStartupOptions(root).wikiCheck.checkedAt
      watch.sync(root)
      expect(readStartupOptions(root).wikiCheck.checkedAt).toBe(before)
    } finally { watch.dispose() }
  })

  it('删 index.md → 事件后派生文件变 no-index，checkedAt 更新', async () => {
    const root = temp()
    const wiki = join(root, 'wiki')
    mkdirSync(wiki, { recursive: true })
    writeFileSync(join(wiki, 'index.md'), '# i\n')
    seed(root, 'wiki')
    const fake = fakePort()
    const watch = new StartupOptionsWatch({ port: fake.port, debounceMs: 1 })
    try {
      watch.sync(root)
      const before = readStartupOptions(root).wikiCheck.checkedAt
      await settle(5)
      rmSync(join(wiki, 'index.md'))
      fake.listeners.get(wiki)?.('index.md')
      await settle()
      const after = readStartupOptions(root).wikiCheck
      expect(after.ok).toBe(false)
      expect(after.problem).toBe('no-index')
      expect(after.checkedAt).not.toBe(before)
    } finally { watch.dispose() }
  })

  it('删整个 wiki 目录 → 事件后派生文件变 missing（父哨）', async () => {
    const root = temp()
    const wiki = join(root, 'wiki')
    mkdirSync(wiki, { recursive: true })
    writeFileSync(join(wiki, 'index.md'), '# i\n')
    seed(root, 'wiki')
    const fake = fakePort()
    const watch = new StartupOptionsWatch({ port: fake.port, debounceMs: 1 })
    try {
      watch.sync(root)
      rmSync(wiki, { recursive: true, force: true })
      fake.listeners.get(root)?.('wiki')
      await settle()
      expect(readStartupOptions(root).wikiCheck).toMatchObject({ ok: false, problem: 'missing' })
    } finally { watch.dispose() }
  })

  it('watcher 布不上时仍写派生文件（退化为时间戳，不挡主流程）', () => {
    const root = temp()
    mkdirSync(join(root, 'wiki'), { recursive: true })
    writeFileSync(join(root, 'wiki', 'index.md'), '# i\n')
    seed(root, 'wiki')
    const watch = new StartupOptionsWatch({
      port: { watch: () => { throw new Error('EPERM') } },
      logger: { warn: () => {} },
    })
    try {
      expect(watch.sync(root)?.wikiCheck.ok).toBe(true)
      expect(readStartupOptions(root).wikiCheck.checkedAt).toEqual(expect.any(String))
    } finally { watch.dispose() }
  })

  it('清空指针 → 派生检查回空，watcher 全关', () => {
    const root = temp()
    mkdirSync(join(root, 'wiki'), { recursive: true })
    writeFileSync(join(root, 'wiki', 'index.md'), '# i\n')
    seed(root, 'wiki')
    const fake = fakePort()
    const watch = new StartupOptionsWatch({ port: fake.port })
    try {
      watch.sync(root)
      // wiki 置空
      writeStartupSettings(root, { ...EMPTY_STARTUP_SETTINGS, wiki: null, updatedAt: '2026-11-12T00:00:00.000Z' })
      const next = watch.sync(root)
      expect(next?.wikiCheck.value).toBeNull()
      expect(readStartupOptions(root).wikiCheck.value).toBeNull()
      expect(fake.listeners.size).toBe(0)
    } finally { watch.dispose() }
  })
})
