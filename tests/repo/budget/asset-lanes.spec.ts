// 负例留证 2026-11-16：删掉 SURFACE_RULES 的 `src/lib/** → replay` 规则 → 「每个改动面都有证据（BUG-186）」与「src/lib 搬移会触发 replay」红，dry-run 退回「未分类」；还原 → 绿。
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import {
  ASSETS, FAST, KINDS, LANES, SURFACE_RULES, UNCONDITIONAL_STEPS,
  assetByName, selectSurfaces, selectWeeklyAssets, suffixOf,
} from '../../../tools/lib/asset-lanes.mjs'

/**
 * 「空间完备」的机械门（DSH M1 的本仓形状）。
 *
 * 判据：`checks/lanes/*.e2e.mjs|*.entry.mjs` 与 `tools/lib/asset-lanes.mjs` 的 ASSETS **双向一致**：
 *   盘上有文件 → 必须登记；登记了 → 盘上必须有文件；手动条目必须写明理由。
 * 这个 spec 是唯一能挡住"新资产生下来就没人跑"的地方；runner 只消费注册表，不复判。
 *
 * 2026-11-16（BUG-186）：surface 规则的**覆盖面**也在这里判——每个改动面要么命中 surface
 * asset，要么用 `coveredBy` 显式申报由哪条无条件步骤覆盖；两者都没有 = 静默空集，判红。
 * 为什么：选择器对未命中返回空，三批搬移后 src/lib / tools 零命中而没人发现（replay 的坏
 * import 因此活到手工跑）。词表 = UNCONDITIONAL_STEPS；spec 读 hook 原文核对，防止申报
 * 一条 hook 根本不跑的步骤。
 */

function smokeNames() {
  return readdirSync(join(ROOT, 'checks/lanes'), { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(e2e|entry)\.mjs$/.test(entry.name))
    .map(entry => entry.name.replace(/\.(e2e|entry)\.mjs$/, ''))
}

/** 每个改动面的代表路径（真实存在的路径；覆盖 = 规则命中或 coveredBy 申报）。 */
const SURFACE_SAMPLES = [
  'AGENTS.md',
  'README.md',
  '.agents/skills/close-out-definition/SKILL.md',
  '_backlog/bugs/README.md',
  'checks/pre-push-surfaces.mjs',
  'docs/testing.md',
  'notes/implemented/README.md',
  'packages/company-pack/README.md',
  'packages/company-pack/cordis.patch.yml',
  'packages/company-pack/content/AGENTS.md',
  'packages/company-pack/presets/ceo/persona.md',
  'packages/company-pack/src/client/index.ts',
  'packages/company-pack/src/host/run-bundle/runtime-guard.ts',
  'packages/company-pack/src/index.ts',
  'packages/company-pack/src/lib/presence/presence.ts',
  'probes/browser-visual/cdp-probe.mjs',
  'run/env.sh',
  'snapshots/README.md',
  'tests/repo/budget/asset-lanes.spec.ts',
  'tools/lib/asset-lanes.mjs',
  'vitest.config.ts',
]

describe('资产 lane 注册表（空间完备）', () => {
  it('每个冒烟都登记，且只登记一次', () => {
    const files = smokeNames().sort()
    const registered = ASSETS.map(asset => asset.name).sort()
    const unregistered = files.filter(name => !registered.includes(name))
    const ghosts = registered.filter(name => !files.includes(name))
    expect(unregistered, '这些 checks/lanes/*.e2e|entry.mjs 没进 tools/lib/asset-lanes.mjs——新资产必须选 lane（或写 manualReason）').toEqual([])
    expect(ghosts, '注册表里有名字但盘上没有文件——删资产要同 diff 退登记').toEqual([])
    expect(new Set(registered).size, '同一个资产只能登记一次').toBe(registered.length)
  })

  it('kind / lane 只用封闭词表；手动条目必须写理由', () => {
    for (const asset of ASSETS) {
      expect(KINDS, `${asset.name} 的 kind 非法`).toContain(asset.kind)
      for (const lane of asset.lanes) expect(LANES, `${asset.name} 的 lane 非法`).toContain(lane)
      if (asset.lanes.length === 0) {
        expect(asset.manualReason, `${asset.name} 没有 lane 就必须写 manualReason`).toBeTruthy()
      }
      if (asset.kind === 'classic') expect(typeof asset.ciSafe, `${asset.name} 缺 ciSafe`).toBe('boolean')
    }
  })

  it('fast lane 保持 4 条且都在注册表里（变长要走评审，不许悄悄膨胀；门禁自测走 test:checks）', () => {
    expect(FAST.length, 'fast lane 是 push 的成本预算：新增先量成本并改本断言').toBe(4)
    for (const name of FAST) expect(assetByName(name), `fast 指向未登记资产 ${name}`).toBeTruthy()
  })

  it('每个资产的文件名 = <name>.<suffix>.mjs，且后缀在注册表里', () => {
    for (const asset of ASSETS) {
      expect(['e2e', 'entry'], `${asset.name} 的 suffix 非法`).toContain(suffixOf(asset.name))
    }
  })

  it('后缀映射是封闭的：未登记名字必须报错，不猜', () => {
    expect(() => suffixOf('zz-unknown')).toThrow(/没有登记后缀/)
  })

  it('surface 规则只引用已登记资产，并且每条都写清为什么', () => {
    for (const rule of SURFACE_RULES) {
      expect(rule.globs.length, 'surface 规则要有 globs').toBeGreaterThan(0)
      const assets = rule.assets ?? []
      const coveredBy = rule.coveredBy ?? []
      expect(assets.length + coveredBy.length, `${rule.globs.join(',')} 既没有 assets 也没有 coveredBy（空规则 = 静默）`).toBeGreaterThan(0)
      expect(rule.why, `${rule.globs.join(',')} 缺 why`).toBeTruthy()
      for (const name of assets) expect(assetByName(name), `surface 规则引用未登记资产 ${name}`).toBeTruthy()
    }
  })

  it('每个改动面都有证据：surface lane 或显式无条件覆盖（选择器不再静默返回空，BUG-186）', () => {
    const unclassified = SURFACE_SAMPLES.filter(sample => {
      const { assets, covered } = selectSurfaces([sample])
      return assets.length === 0 && covered.length === 0
    })
    expect(unclassified, '这些面既没有 surface 规则也没有 coveredBy：改到它们时 pre-push 静默无动作——登记规则或写清由哪条无条件步骤覆盖').toEqual([])
  })

  it('src/lib 搬移会触发 replay（读模型构建产物由 replay import；2026-11-15 的真实缺失面）', () => {
    expect(selectSurfaces(['packages/company-pack/src/lib/presence/presence.ts']).assets).toEqual(['replay'])
  })

  it('仓库顶层目录与 src 分组都在登记面内（新目录不许静默出界）', () => {
    const notSurfaces = new Set(['vendor', 'node_modules', 'runtime', '_dist', 'company-workspace', 'coverage'])
    const rootSamples = readdirSync(ROOT, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !notSurfaces.has(entry.name))
      .map(entry => (entry.name === 'packages' ? 'packages/company-pack/src/index.ts' : `${entry.name}/README.md`))
    const srcSamples = readdirSync(join(ROOT, 'packages/company-pack/src'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => `packages/company-pack/src/${entry.name}/index.ts`)
    const unclassified = [...rootSamples, ...srcSamples].filter(sample => {
      const { assets, covered } = selectSurfaces([sample])
      return assets.length === 0 && covered.length === 0
    })
    expect(unclassified, '新顶层目录 / src 分组没有证据映射——先登记 SURFACE_RULES（assets 或 coveredBy+why）').toEqual([])
  })

  it('coveredBy 只引用 hook 真跑的无条件步骤（申报一条不存在的步骤 = 假豁免）', () => {
    const hook = readFileSync(join(ROOT, '.githooks/pre-push'), 'utf8')
    const executed = hook.split('\n').filter(line => !/^\s*#/.test(line)).join('\n')
    const command: Record<string, string> = {
      verify: 'node checks/run-gates.mjs',
      typecheck: 'tsc -p tsconfig.test-harness.json',
      lint: 'pnpm -s lint',
      dup: 'pnpm -s dup',
      'smoke:fast': 'pnpm -s smoke:fast',
      'test:checks': 'pnpm -s test:checks',
      'coverage-ratchet': 'node checks/audit/coverage-ratchet.mjs',
    }
    // 词表与 hook 一一对应：不只查被引用的步骤，否则删掉 hook 里的 lint/dup 也不会红。
    for (const step of UNCONDITIONAL_STEPS) {
      const expected = command[step]
      expect(expected, `UNCONDITIONAL_STEPS 里的「${step}」缺 hook 命令映射`).toBeTruthy()
      expect(executed, `「${step}」在 .githooks/pre-push 的可执行行里找不到——词表与 hook 已漂`).toContain(expected)
    }
    for (const rule of SURFACE_RULES) {
      for (const step of rule.coveredBy ?? []) {
        expect(UNCONDITIONAL_STEPS, `${rule.globs.join(',')} 的 coveredBy「${step}」不在词表`).toContain(step)
      }
    }
  })

  it('未知路径落 unseen（选择器不静默吞掉未登记面）', () => {
    expect(selectSurfaces(['zz-new-surface/file.txt']).unseen).toEqual(['zz-new-surface/file.txt'])
  })

  it('fast 的每条都真的在 fast lane 里（注册表与派生列表一致）', () => {
    const derived = ASSETS.filter(asset => asset.lanes.includes('fast')).map(asset => asset.name)
    expect(derived).toEqual(FAST)
  })

  it('weekly 筛选：正常命中 classic weekly 资产，支持浏览器/后缀过滤，不存在的 filter 返回空集供 runner 判非零', () => {
    const defaults = selectWeeklyAssets()
    expect(defaults.length).toBeGreaterThan(0)
    const normal = selectWeeklyAssets(ASSETS, { ci: true })
    expect(normal.length).toBeGreaterThan(0)
    const withBrowser = selectWeeklyAssets(ASSETS, { withBrowser: true, suffix: 'entry' })
    expect(withBrowser.some(asset => asset.kind === 'browser')).toBe(true)
    expect(selectWeeklyAssets(ASSETS, { filter: 'zz-none' })).toEqual([])
  })
})
