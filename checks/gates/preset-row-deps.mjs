// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flattenCordisRows, loadCordisYaml } from '../../tools/lib/core/repo-markdown.mjs'

// ── 7. 依赖三向镜像门禁（R5a 起：preset/patch 行 ↔ pack peers ↔ 根 devDeps；src 导入 ↔ pack peers & devDeps）──
// 负例留证 2026-09-27：行引用未声明依赖的插件 → preset-dep 红。
// DSH 的 verify-cordis-config 同构门禁（AGENTS.md：cordis.yml 的裸插件必须出现在其解析清单的依赖声明）。
// R5a 起 runtime 依赖声明从 dependencies 改 peerDependencies（合同 = docs/contracts/release.md）；
// G8-1 扩（2026-11-16）：bundle cordis.patch.yml 的 insert 行（含 group 嵌套 config）同受此门禁，
// replace/disabled 行豁免（上游组合提供，如 disabled 的 ui-trajectory / ui-sidebar-terminal）。
// 维 2 扩（2026-11-28）：组合行插件同时须在根 package.json devDependencies 声明 workspace 链接（否则源码 CLI
// require.resolve 会断），且 packages/company-pack/src 导入的 @deepseek-ai/* 须同时在 pack peers 与 devDeps。
// 负例留证 2026-11-16：patch insert 行引用未声明依赖（@deepseek-ai/dsh-nonexistent-probe）→ patch-dep 红点名行 id；还原 → 绿。
// 负例留证 2026-11-28：从根 package.json devDependencies 删 @deepseek-ai/dsh-tool-bash → `FAIL root-row-dep: … 缺 workspace 链接：@deepseek-ai/dsh-tool-bash`；还原 → 绿。
const pkgName = spec => /^(@[^/]+\/[^/]+)/.exec(spec)?.[1] ?? spec

function walkSrc(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walkSrc(full)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

export function run({ root, ok, fail }) {
  let pack
  let rootPkg
  try {
    pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
    rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  } catch (error) {
    fail('preset-dep', `依赖清单缺失或不可解析：${error instanceof Error ? error.message : String(error)}`)
    return
  }
  const packDeps = new Set([...Object.keys(pack?.dependencies ?? {}), ...Object.keys(pack?.peerDependencies ?? {})])
  const packDevDeps = new Set(Object.keys(pack?.devDependencies ?? {}))
  const rootDevDeps = new Set(Object.keys(rootPkg?.devDependencies ?? {}))

  const presetsRoot = join(root, 'packages/company-pack/presets')
  const presetNames = existsSync(presetsRoot)
    ? readdirSync(presetsRoot).filter(name => existsSync(join(presetsRoot, name, 'agent.cordis.yml'))).sort()
    : []

  const rowPlugins = new Set()
  const missingRootRows = new Set()
  for (const role of presetNames) {
    const text = readFileSync(join(presetsRoot, role, 'agent.cordis.yml'), 'utf8')
    for (const m of text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)) {
      const spec = m[1]
      const pkg = pkgName(spec)
      rowPlugins.add(spec)
      if (!packDeps.has(pkg)) fail('preset-dep', `${role} 的行引用 ${spec}，但 pack 依赖声明（dependencies ∪ peerDependencies）里没有 ${pkg}（安装后解析不到 → preset broken）`)
      if (!rootDevDeps.has(pkg)) missingRootRows.add(pkg)
    }
  }

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
    const pkg = pkgName(row.name)
    patchPlugins.add(row.name)
    if (!packDeps.has(pkg)) {
      fail('patch-dep', `cordis.patch.yml insert 行 ${row.id ?? '(无 id)'} 引用 ${row.name}，但 pack 依赖声明（dependencies ∪ peerDependencies）里没有 ${pkg}（安装后 host 共享面解析不到 → broken）`)
    }
    if (!rootDevDeps.has(pkg)) missingRootRows.add(pkg)
  }

  if (missingRootRows.size > 0) {
    fail('root-row-dep', `组合行插件在根 package.json devDependencies 缺 workspace 链接（源码 CLI require.resolve 会断）：${[...missingRootRows].sort().join('、')}`)
  }

  const srcImports = new Set()
  for (const file of walkSrc(join(root, 'packages/company-pack/src'))) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/from\s+['"](@deepseek-ai\/[^/'"]+)/g)) srcImports.add(m[1])
  }
  const missingSrcPeers = [...srcImports].filter(pkg => !packDeps.has(pkg)).sort()
  const missingSrcDev = [...srcImports].filter(pkg => !packDevDeps.has(pkg)).sort()
  if (missingSrcPeers.length > 0 || missingSrcDev.length > 0) {
    const detail = [
      missingSrcPeers.length > 0 ? `pack peerDependencies 缺：${missingSrcPeers.join('、')}` : '',
      missingSrcDev.length > 0 ? `pack devDependencies 缺：${missingSrcDev.join('、')}` : '',
    ].filter(Boolean).join('；')
    fail('src-dep-mirror', `packages/company-pack/src 导入未双向声明（${detail}）`)
  }

  ok(`preset-row-deps ×${rowPlugins.size} + patch-insert ×${patchPlugins.size} + src-imports ×${srcImports.size}（三向对账一致）`)
}
