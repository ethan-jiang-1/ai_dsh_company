// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flattenCordisRows, loadCordisYaml } from '../../tools/lib/repo-markdown.mjs'
import { pack } from './pack-shape.mjs'
import { roles } from './presets.mjs'

// ── 7. preset 行 + bundle patch insert 行引用的插件必须在 pack 依赖声明里（R5a 起：dependencies ∪ peerDependencies）──
// 负例留证 2026-09-27：行引用未声明依赖的插件 → preset-dep 红。
// DSH 的 verify-cordis-config 同构门禁（AGENTS.md：cordis.yml 的裸插件必须出现在
// 其解析清单的 dependencies）。漏了 → profile 安装后行解析不到 → preset 标记 broken，
// UI 里给不出可用角色（R1 实证：persona / skill-filesystem 缺依赖）。
// R5a 起 runtime 依赖声明从 dependencies 精确钉改 peerDependencies（合同 = docs/contracts/release.md：
// pre-stable API 拒绝钉死；profile 模板自带 autoInstallPeers: false，行解析走安装锚
// 兜底）——本门禁按包名归一，两种声明都算"在列"。
// G8-1 扩（2026-11-16）：bundle cordis.patch.yml 的 **insert 行**（含 group 嵌套 config）同受此门禁。
//   insert = 本包新增的行，安装后按安装域解析，缺 peer/deps → host 共享面 broken（静默，影响全会话）。
//   replace 行（顶层 `- id:`）豁免：它替换 base/web-app 已有行，包由上游组合提供——如 disabled 的
//   ui-trajectory / ui-sidebar-terminal 不在本包 peers，是有意只 disable 不引入。disabled 行亦豁免。
//   cordis.patch.yml 带 !!js 表达式：用 js-yaml 扩展 !!js scalar type 解析（消费 vendor 原语，
//   不手搓裸正则）；preset 面沿用既有 name 正则（!!js 同样存在，regex 只取单引号包名不受影响）。
// 负例留证 2026-11-16：patch insert 行引用未声明依赖（@deepseek-ai/dsh-nonexistent-probe）→ patch-dep 红点名行 id；还原 → 绿。

// 行名可带 subpath（如 `@deepseek-ai/dsh-tool-subagent-control/list-agents`）；依赖存在性按包名归一。
const pkgName = spec => /^(@[^/]+\/[^/]+)/.exec(spec)?.[1] ?? spec

export function run({ root, ok, fail }) {
const packDeps = new Set([...Object.keys(pack?.dependencies ?? {}), ...Object.keys(pack?.peerDependencies ?? {})])
const rowPlugins = new Set()
for (const role of roles) {
  const text = readFileSync(join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml'), 'utf8')
  for (const m of text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)) {
    const spec = m[1]
    rowPlugins.add(spec)
    if (!packDeps.has(pkgName(spec))) fail('preset-dep', `${role} 的行引用 ${spec}，但 pack 依赖声明（dependencies ∪ peerDependencies）里没有 ${pkgName(spec)}（安装后解析不到 → preset broken）`)
  }
}
// bundle patch insert 行（G8-1）：只查本包新增行；replace/disabled 豁免（上游提供）。
const patchPath = join(root, 'packages/company-pack/cordis.patch.yml')
let patchOps = []
try {
  patchOps = loadCordisYaml(readFileSync(patchPath, 'utf8'))
} catch (error) {
  fail('patch-dep', `cordis.patch.yml 缺失或解析失败：${error instanceof Error ? error.message : String(error)}（门禁不能静默通过）`)
}
const patchPlugins = new Set()
for (const row of flattenCordisRows(patchOps)) {
  if (row?.disabled === true) continue
  if (typeof row?.name !== 'string' || !row.name.startsWith('@')) continue
  patchPlugins.add(row.name)
  if (!packDeps.has(pkgName(row.name))) {
    fail('patch-dep', `cordis.patch.yml insert 行 ${row.id ?? '(无 id)'} 引用 ${row.name}，但 pack 依赖声明（dependencies ∪ peerDependencies）里没有 ${pkgName(row.name)}（安装后 host 共享面解析不到 → broken）`)
  }
}
ok(`preset-row-deps ×${rowPlugins.size} + patch-insert ×${patchPlugins.size}`)
}