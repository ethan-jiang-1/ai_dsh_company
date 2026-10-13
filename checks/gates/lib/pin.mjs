// 钉住基线常量的唯一事实家（2026-10-14 拆分轮自 run-gates.mjs §0 原样搬入；无状态头——
// scriptEntries 排除 lib/ 目录，本文件不是脚本，是两道门禁共享的常量模块）。
// ── 0. 钉住基线（**唯一事实家**：vendor-pin 与 pin-* 两道门禁都用它）─────────────
// 为什么用 SHA 而不是 tag：tag 可被移动/别名，SHA 才是钉住的合同。
// ⚠ 升 pin 时改这里 + AGENTS.md §vendor 簿记 + package.json 兼容矩阵（pack-compat 会拦）。
export const expectedTag = 'dsh-v0.2.0-rc.2'
export const expectedSha = '639ed015397290b3745d163aafe02ffee4aa3f84'
