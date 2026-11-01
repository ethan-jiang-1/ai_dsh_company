// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c-bis. 公司手册注入预算（2026-10-02 立；2026-11-01 v3 改源）──────────────────
// v3 起手册住 pack `content/AGENTS.md`，由 host 作为 system prompt section 注入（不再复制到
// workspace、不再走 agent-instructions 的静默截断）。预算 = host `HANDBOOK_MAX_BYTES`（32768）。
// 判据：content 手册字节 + 1024B 包装余量 ≤ 32768；超限运行时只告警、构建门禁红。
export function run({ root, ok, fail }) {
  const HANDBOOK_MAX_BYTES = 32_768
  const handbookBytes = readFileSync(join(root, 'packages/company-pack/content/AGENTS.md')).length
  const budgets = readdirSync(join(root, 'packages/company-pack/presets')).flatMap(role =>
    [...readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
      .matchAll(/maxBytes:\s*(\d+)/g)].map(m => Number(m[1])))
  const maxBytes = Math.max(...budgets)
  new Set(budgets).size === 1
    ? ok(`handbook-budget 五 preset maxBytes 一致（${maxBytes}；这是用户项目指令面，不是公司手册面）`)
    : fail('handbook-budget', `五 preset 的 maxBytes 不一致：${budgets.join(', ')}（预算应同值）`)
  const margin = 1024
  handbookBytes + margin <= HANDBOOK_MAX_BYTES
    ? ok(`handbook-budget content/AGENTS.md ${handbookBytes}B + ${margin}B 余量 ≤ ${HANDBOOK_MAX_BYTES}`)
    : fail('handbook-budget', `content/AGENTS.md ${handbookBytes}B + ${margin}B > ${HANDBOOK_MAX_BYTES}——host 注入会超预算（先瘦身手册）`)
}
