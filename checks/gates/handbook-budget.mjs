// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c-bis. 手册注入字节预算（2026-10-02 立，消化对账轮）─────────────────────────
// 判据读 pack 的骨架（唯一真源）；dev bundle 的 company-workspace/AGENTS.md 是它的符号链接。
// 为什么：agent-instructions 的 maxBytes 超限时**静默截断**（vendor render.ts：先丢更宽的指令
// 文件、再截最具体的文件；负例 = 本门禁出生现场——preset 钉 16384 落地时手册仅 1.2KB，手册长到
// 17.4KB 后成员会话从「问询节流」中句起整段丢失，「工作纪律」节从未注入；行数栅栏管不到字节，
// 09-28 的 maxBytes 两端核对查了 overlay 层漏了 preset 层）。此门禁把字节对齐钉进执行面。
export function run({ root, ok, fail }) {
  const handbookBytes = readFileSync(join(root, 'packages/company-pack/workspace/AGENTS.md')).length
  const budgets = readdirSync(join(root, 'packages/company-pack/presets')).flatMap(role =>
    [...readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
      .matchAll(/maxBytes:\s*(\d+)/g)].map(m => Number(m[1])))
  const maxBytes = Math.max(...budgets)
  new Set(budgets).size === 1
    ? ok(`handbook-budget 五 preset maxBytes 一致（${maxBytes}）`)
    : fail('handbook-budget', `五 preset 的 maxBytes 不一致：${budgets.join(', ')}（预算应同值）`)
  const margin = 1024 // render 包装（intro/省略注记）开销余量
  handbookBytes + margin <= maxBytes
    ? ok(`handbook-budget 手册 ${handbookBytes}B + ${margin}B 余量 ≤ maxBytes ${maxBytes}`)
    : fail('handbook-budget', `手册 ${handbookBytes}B + ${margin}B > maxBytes ${maxBytes}——agent-instructions 正在静默截断手册尾部（升 preset maxBytes 或先瘦身手册）`)
}
