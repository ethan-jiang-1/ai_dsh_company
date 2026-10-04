/**
 * pack 导出形态守卫（2026-10-04，测试宪法 §2「pack 导出/注册面」行）。
 * 病类 = DSH postmortem 0001：一个多余的 `export default` 让 Loader 的 `unwrapExports` 把模块
 * 塌缩成裸函数、丢掉整个命名空间（inject/apply 消失）——挂载炸而冒烟仍可能绿。
 * 模板 = vendor `packages/lsp/tool-lsp/tests/load-path.spec.ts`；两侧入口都测（host 半 + client 半）。
 *
 * 前提：引 vendor src（源码平面，tsconfig paths）；vendored 依赖（cosmokit 等）经包入口解析，
 * 依赖 dev 树已构建 lib（guides/bootstrap）——与 tests/style-lifecycle.spec.ts 同前提；
 * CI 不跑 test（ci-test-lane Note），test 只跑在本地与 pre-push hook。
 */
import { describe, expect, it } from 'vitest'
// vendor loader 经相对路径直引 src（源码平面）——本仓 vitest 的 paths 不解析 extends 链的
// 包名映射（实测 `@deepseek-ai/cordis-plugin-loader` Cannot find package），
// 既有先例 = tests/style-lifecycle.spec.ts 同样相对路径引 cordis src。
import Loader from '../vendor/dsh/vendor/loader/src/index.ts'
import * as clientEntry from '../packages/company-pack/src/client/index.ts'
import * as hostEntry from '../packages/company-pack/src/index.ts'

const unwrap = (mod: Record<string, unknown>) =>
  (Object.create(Loader.prototype) as InstanceType<typeof Loader>)
    .unwrapExports(mod) as Record<string, unknown>

describe('pack 导出形态守卫（Loader unwrapExports round-trip）', () => {
  it('host 半：无 default export，inject/apply 穿过 unwrapExports 仍在', () => {
    expect('default' in hostEntry).toBe(false)
    const unwrapped = unwrap(hostEntry)
    expect(unwrapped).toBe(hostEntry)
    expect(unwrapped.inject).toEqual(['tools', 'approval'])
    expect(typeof unwrapped.apply).toBe('function')
  })

  it('client 半：无 default export，inject/apply 穿过 unwrapExports 仍在', () => {
    expect('default' in clientEntry).toBe(false)
    const unwrapped = unwrap(clientEntry)
    expect(unwrapped).toBe(clientEntry)
    expect(unwrapped.inject).toEqual(['slots', 'remote', 'sessions'])
    expect(typeof unwrapped.apply).toBe('function')
  })
})
