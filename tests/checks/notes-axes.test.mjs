// 状态：常驻
// 何时跑：改 notes-axes 门禁后；`pnpm test:checks`（pre-push 也跑）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { axisProblems } from '../../checks/gates/notes-axes.mjs'

const note = (body) => `状态：implemented\n\n## 决定\n做。\n\n## 未覆盖轴\n${body}\n`

test('每个顶层条目带 → 去向 → 绿', () => {
  assert.deepEqual(axisProblems(note('- 跨行 span 残余 → 决定：保守非结构\n- Windows 真机 → 卡：新建卡'), 'x.md'), [])
})

test('条目没有 → 去向 → 红', () => {
  assert.match(axisProblems(note('- 以后再说'), 'x.md').join(), /没有 → 去向/)
})

test('→ 后为空 → 红', () => {
  assert.match(axisProblems(note('- 无 →'), 'x.md').join(), /→ 后没有去向/)
})

test('没有条目 → 红（无轴也要显式写）', () => {
  assert.match(axisProblems(note(''), 'x.md').join(), /没有顶层条目/)
})

test('缺节 / 围栏里的假节 → 红', () => {
  assert.match(axisProblems('状态：implemented\n\n## 决定\n做。', 'x.md').join(), /缺「## 未覆盖轴」/)
  assert.match(axisProblems('```md\n## 未覆盖轴\n- x → y\n```\n', 'x.md').join(), /缺「## 未覆盖轴」/)
})
