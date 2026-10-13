// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pack } from './pack-shape.mjs'
import { roles } from './presets.mjs'

// ── 7. preset 行引用的插件必须在 pack 依赖声明里（R5a 起：dependencies ∪ peerDependencies）──
// 负例留证 2026-09-27：行引用未声明依赖的插件 → preset-dep 红。
// DSH 的 verify-cordis-config 同构门禁（AGENTS.md：cordis.yml 的裸插件必须出现在
// 其解析清单的 dependencies）。漏了 → profile 安装后行解析不到 → preset 标记 broken，
// UI 里给不出可用角色（R1 实证：persona / skill-filesystem 缺依赖）。
// R5a 起 runtime 依赖声明从 dependencies 精确钉改 peerDependencies（合同 = docs/release.md：
// pre-stable API 拒绝钉死；profile 模板自带 autoInstallPeers: false，行解析走安装锚
// 兜底）——本门禁按包名归一，两种声明都算"在列"。
export function run({ root, ok, fail }) {
const packDeps = new Set([...Object.keys(pack?.dependencies ?? {}), ...Object.keys(pack?.peerDependencies ?? {})])
const rowPlugins = new Set()
for (const role of roles) {
  const text = readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
  for (const m of text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)) {
    // 行名可带 subpath（如 `@deepseek-ai/dsh-tool-subagent-control/list-agents`，shipped
    // standard preset 就这么写）；依赖存在性按**包名** `@scope/name` 归一（R3 实证：
    // 不归一 → 把合法的 subpath 行误判成缺依赖）。
    const spec = m[1]
    const pkg = /^(@[^/]+\/[^/]+)/.exec(spec)?.[1] ?? spec
    rowPlugins.add(spec)
    if (!packDeps.has(pkg)) fail('preset-dep', `${role} 的行引用 ${spec}，但 pack 依赖声明（dependencies ∪ peerDependencies）里没有 ${pkg}（安装后解析不到 → preset broken）`)
  }
}
ok(`preset-row-deps ×${rowPlugins.size}`)
}
