import { describe, expect, it } from 'vitest'
import { findSecretAssignments } from '../../tools/lib/tracked-secrets.mjs'

// 2026-10-25：补 BUG-013 的形状缺口——tracked-token 只认 `?token=`，不认 `const TOKEN = '...'`。
// 负例留证 2026-10-25：把本 spec 的实现退化成只认 URL 形状（BUG-013 回归）→ `pnpm test` 红；
// 还原纯逻辑 → 绿。真实 tracked 面的红/绿由 checks/gates/tracked-secrets.mjs 在 verify 里跑。
// 样本用拼接构造：避免把高熵字面量写进 tracked 源（否则 tracked-secrets 会按设计把自己人判红）。
const SAMPLE = ['Q7mN2pR8', 'sT4vW9xY', '3zA6bC1d', 'E5fG0hJk'].join('')

describe('tracked-secrets（硬编码凭据赋值）', () => {
  it('命中 const TOKEN = <高熵字面量>', () => {
    const hits = findSecretAssignments(`const TOKEN = '${SAMPLE}'`)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.key).toBe('TOKEN')
    expect(hits[0]?.line).toBe(1)
  })

  it('命中 api_key: "..." 等键名变体', () => {
    expect(findSecretAssignments(`api_key: "${SAMPLE}"`)).toHaveLength(1)
  })

  it('不命中动态取值（BUG-013 修复前的误报形状）', () => {
    expect(findSecretAssignments("token: url.searchParams.get('token')")).toEqual([])
  })

  it('不命中已知测试占位串与短值', () => {
    expect(findSecretAssignments("secret = 'never-render-this-placeholder'")).toEqual([])
    expect(findSecretAssignments("token = 'short'")).toEqual([])
  })

  it('不命中模板字面量（可能含插值）', () => {
    expect(findSecretAssignments(`token = \`${SAMPLE}\``)).toEqual([])
  })
})
