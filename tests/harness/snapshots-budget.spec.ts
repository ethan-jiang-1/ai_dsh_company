import { describe, expect, it } from 'vitest'
import { convergenceSlices } from '../../tools/lib/converge-rules.mjs'

/**
 * 收敛切片「识别 + 计量」的覆盖守卫（2026-10-16 立，事故 = 预算门禁的过滤器只认旧命名）。
 *
 * 为什么需要它：`snapshots-budget` 门禁存在的理由 = 「收敛切片是唯一无界增长源」。实测
 * 2026-10-16——`converge.mjs` 现行 evName 是 `convergence-<日期>`，而门禁过滤器只认旧前缀
 * `memory-convergence-`，两个新命名切片（428K）**完全在预算外**。
 *
 * 判据（`convergenceSlices`）住 `tools/lib/converge-rules.mjs`：命名知识属收敛面，且
 * `checks/**` 不许被 `tests/` 导入（分层守卫）——住门禁里就测不到，故判据与门禁分家。
 */

/** 假场景：只给 name/path；bytesOf 按 path 长度查表（可精确断言字节）。 */
const scenes = [
  { name: 'memory-convergence-2026-10-04-5', path: 'legacy' },
  { name: 'convergence-2026-10-16', path: 'current' },
  { name: 'replay/r3-delegation', path: 'other' },
]
const bytesOf = p => ({ legacy: 65536, current: 65536, other: 999 })[p] ?? 0

describe('收敛切片识别与计量（两代命名都要覆盖）', () => {
  it('旧命名 memory-convergence-* 与新命名 convergence-* 都计入，非收敛场景不计', () => {
    const { scenes: hit, bytes } = convergenceSlices({ scenes, bytesOf })
    expect(hit.map(s => s.name)).toEqual(['memory-convergence-2026-10-04-5', 'convergence-2026-10-16'])
    // ⚠ 断言**精确字节**：64KiB 与 128KiB 在一位小数的 mb() 文案里都是 0.1M，
    // 拿文案断言会「因错的原因通过」（2026-10-16 实测踩过）。漏任一代 ⇒ 65536。
    expect(bytes).toBe(131072)
  })

  it('只旧命名 ⇒ 只计旧（防「把新代际当噪声剔掉」的过度净化）', () => {
    const { bytes } = convergenceSlices({ scenes: [scenes[0], scenes[2]], bytesOf })
    expect(bytes).toBe(65536)
  })

  it('只新命名 ⇒ 只计新（这条正是 2026-10-16 漏扫的那一类）', () => {
    const { bytes, scenes: hit } = convergenceSlices({ scenes: [scenes[1]], bytesOf })
    expect(hit).toHaveLength(1)
    expect(bytes).toBe(65536)
  })

  it('空面 ⇒ 0（新仓库/无收敛切片时不误报）', () => {
    expect(convergenceSlices({ scenes: [], bytesOf })).toEqual({ scenes: [], bytes: 0 })
  })
})
