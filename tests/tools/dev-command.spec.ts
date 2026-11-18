import { describe, expect, it } from 'vitest'
import { DEV_DIRS, devCommandInText, scriptsFromManifest } from '../../tools/lib/core/dev-command.mjs'
// 负例留证 2026-11-19：`pnpm -s test` / `pnpm exec vitest` / `npm run test` / `npx vitest` 不在旧正则里 → 放行（BUG-271）。
// 负例留证 2026-11-19：`node probes/...` 不在旧正则的目录白名单里 → 放行（BUG-272）。


/**
 * dev 命令判据（2026-11-19，BUG-271/272）。
 */

const SCRIPTS = ['test', 'verify', 'typecheck', 'methods:init', 'release:prepare', 'coverage:ratchet']

describe('包管理器形式（BUG-271）', () => {
  it('裸脚本名 / 旗标后的脚本名都命中', () => {
    expect(devCommandInText('pnpm test', { scripts: SCRIPTS })).toBe('pnpm test')
    expect(devCommandInText('跑 `pnpm -s test` 再收尾', { scripts: SCRIPTS })).toBe('pnpm test')
    expect(devCommandInText('pnpm --silent verify', { scripts: SCRIPTS })).toBe('pnpm verify')
    expect(devCommandInText('pnpm -w --filter web test', { scripts: SCRIPTS })).toBe('pnpm test')
    expect(devCommandInText('pnpm coverage:ratchet', { scripts: SCRIPTS })).toBe('pnpm coverage:ratchet')
  })

  it('run/exec/dlx 子命令不看脚本表也命中', () => {
    expect(devCommandInText('pnpm exec vitest run', { scripts: [] })).toBe('pnpm exec vitest')
    expect(devCommandInText('npm run test', { scripts: [] })).toBe('npm run test')
    expect(devCommandInText('npx vitest', { scripts: [] })).toBe('npx vitest')
    expect(devCommandInText('pnpm dlx tsdown', { scripts: [] })).toBe('pnpm dlx tsdown')
    expect(devCommandInText('pnpm run types:check', { scripts: [] })).toBe('pnpm run types:check')
  })

  it('散文里的包管理器不算命令（不是白名单，是形状）', () => {
    expect(devCommandInText('The DSH plugin installer uses pnpm. DSH Desktop bundles pnpm;', { scripts: SCRIPTS })).toBeUndefined()
    expect(devCommandInText('dsh: pnpm was not found; install pnpm and make it available on PATH.', { scripts: SCRIPTS })).toBeUndefined()
    expect(devCommandInText('pnpm must be on PATH', { scripts: SCRIPTS })).toBeUndefined()
    expect(devCommandInText('pnpm install', { scripts: SCRIPTS })).toBeUndefined()
    expect(devCommandInText('dsh plugin add dsh-company-pack', { scripts: SCRIPTS })).toBeUndefined()
  })
})

describe('仓内 dev 入口（BUG-272）', () => {
  it('node/tsx 的四个 dev 目录都命中（含 probes）', () => {
    expect(DEV_DIRS).toEqual(['tools', 'checks', 'tests', 'probes'])
    for (const dir of DEV_DIRS) expect(devCommandInText(`node ${dir}/x.mjs`, { scripts: [] })).toBe(`node ${dir}/x.mjs`)
    expect(devCommandInText('node probes/browser-visual/cdp-probe.mjs', { scripts: [] })).toBe('node probes/browser-visual/cdp-probe.mjs')
    expect(devCommandInText('npx tsx checks/lanes/client-load.entry.mjs', { scripts: [] })).toBe('npx tsx')
  })

  it('run/env.sh 三种写法都命中', () => {
    expect(devCommandInText('run/env.sh', { scripts: [] })).toBe('run/env.sh')
    expect(devCommandInText('bash run/env.sh && pnpm orient', { scripts: [] })).toBe('run/env.sh')
    expect(devCommandInText('```sh\n./run/env.sh', { scripts: [] })).toBe('./run/env.sh')
  })

  it('非 dev 路径不误伤', () => {
    expect(devCommandInText('node --version', { scripts: [] })).toBeUndefined()
    expect(devCommandInText('node lib/index.js', { scripts: [] })).toBeUndefined()
    expect(devCommandInText('see content/AGENTS.md', { scripts: [] })).toBeUndefined()
  })
})

describe('脚本名从 package.json 派生', () => {
  it('scriptsFromManifest 取名、坏 JSON 返回空', () => {
    expect(scriptsFromManifest(JSON.stringify({ scripts: { test: 'vitest run' } }))).toEqual(['test'])
    expect(scriptsFromManifest('not json')).toEqual([])
    expect(scriptsFromManifest('{}')).toEqual([])
  })
})
