// 负例留证 2026-11-13（P1 落地时补）：把 `readStartupSettingsState` 的 `fileProblem === 'unsafe'`
// 分支删掉 ⇒ root-symlink / leaf-symlink-out 用例把外部值读成 ok；还原即绿。
/**
 * startup 状态面的 Agreement 矩阵（P1，2026-11-13）。
 *
 * 判据：对每种盘上形状，`problem` 必须是合同规定的类——
 * 缺失 = auto（null）、坏 JSON/截断 = corrupt、v≠1 = unsupported、symlink/目录 = unsafe；
 * 且 unsafe/corrupt 时绝不采用外部/坏内容里的值。
 *
 * 证明不了：面板文案、写路径（写路径由 company-root-safety 的 startup.write 行覆盖）。
 */
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  readStartupOptionsState,
  readStartupSettingsState,
  startupOptionsPath,
  startupSettingsPath,
} from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { makeWorld, type World } from '../../support/world-shapes.ts'

const VALID = '{"v":1,"productType":"business-software","deliveryMode":null,"wiki":null,"updatedAt":null}\n'

function writeAt(world: World, path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

describe('startup settings：形状 → problem', () => {
  const cases: readonly { readonly id: string; readonly expected: 'corrupt' | 'unsupported' | 'unsafe' | null; readonly build: (world: World) => void }[] = [
    { id: 'missing', expected: null, build: () => {} },
    { id: 'valid', expected: null, build: (world) => { writeAt(world, startupSettingsPath(world.ws), VALID) } },
    { id: 'empty', expected: null, build: (world) => { writeAt(world, startupSettingsPath(world.ws), '') } },
    { id: 'corrupt', expected: 'corrupt', build: (world) => { writeAt(world, startupSettingsPath(world.ws), 'not json\n') } },
    { id: 'truncated', expected: 'corrupt', build: (world) => { writeAt(world, startupSettingsPath(world.ws), '{"v":1') } },
    {
      id: 'unsupported',
      expected: 'unsupported',
      build: (world) => { writeAt(world, startupSettingsPath(world.ws), '{"v":2,"productType":null}\n') },
    },
    { id: 'dir', expected: 'unsafe', build: (world) => { mkdirSync(startupSettingsPath(world.ws), { recursive: true }) } },
    {
      id: 'symlink-out',
      expected: 'unsafe',
      build: (world) => {
        const outside = join(world.outside, 'startup.json')
        writeFileSync(outside, VALID)
        mkdirSync(join(world.ws, '.dsh-company'), { recursive: true })
        symlinkSync(outside, startupSettingsPath(world.ws))
      },
    },
    {
      id: 'root-symlink',
      expected: 'unsafe',
      build: (world) => { symlinkSync(world.outside, join(world.ws, '.dsh-company')) },
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.id} → ${String(testCase.expected)}`, () => {
      const world = makeWorld()
      try {
        testCase.build(world)
        const state = readStartupSettingsState(world.ws)
        expect(state.problem).toBe(testCase.expected)
        if (testCase.expected !== null) {
          expect(state.settings.productType, 'unsafe/corrupt 时不得采用外部/坏内容的值').toBeNull()
        }
        if (testCase.id === 'valid') expect(state.settings.productType).toBe('business-software')
      } finally { world.cleanup() }
    })
  }
})

describe('startup options：形状 → problem', () => {
  const cases: readonly { readonly id: string; readonly expected: 'corrupt' | 'unsafe' | null; readonly build: (world: World) => void }[] = [
    { id: 'missing', expected: null, build: () => {} },
    { id: 'corrupt', expected: 'corrupt', build: (world) => { writeAt(world, startupOptionsPath(world.ws), 'not json\n') } },
    {
      id: 'symlink-out',
      expected: 'unsafe',
      build: (world) => {
        const outside = join(world.outside, 'options.json')
        writeFileSync(outside, '{"v":1}\n')
        mkdirSync(join(world.ws, '.dsh-company'), { recursive: true })
        symlinkSync(outside, startupOptionsPath(world.ws))
      },
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.id} → ${String(testCase.expected)}`, () => {
      const world = makeWorld()
      try {
        testCase.build(world)
        expect(readStartupOptionsState(world.ws).problem).toBe(testCase.expected)
      } finally { world.cleanup() }
    })
  }
})
