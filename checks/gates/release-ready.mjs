// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 发布就绪的**源码面**判据（FAQ 24 §6/§9.2）：版本必须有 CHANGELOG 条目，且 package 不再携带
// DSH 不读的 `dsh.compatibility`。制品/手册/sha 的核对在 `node tools/release.mjs --check`（需要 _dist），
// 这里不依赖 _dist，所以每次 verify 都能跑。
// 负例留证 2026-10-26：删掉 `## 0.3.3` 整段 → release-changelog 红；还原 → 绿。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function run({ root, ok, fail }) {
  const packPath = join(root, 'packages/company-pack/package.json')
  const changelogPath = join(root, 'CHANGELOG.md')
  const pack = JSON.parse(readFileSync(packPath, 'utf8'))
  const version = pack?.version
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    fail('release-changelog', `${packPath} version 不是 x.y.z：${JSON.stringify(version)}`)
    return
  }
  if (!existsSync(changelogPath)) {
    fail('release-changelog', `缺 ${changelogPath}（版本 ${version} 没有用户可见变化记录）`)
    return
  }
  const changelog = readFileSync(changelogPath, 'utf8')
  const headings = [...changelog.matchAll(/^##\s+(\d+\.\d+\.\d+)\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/gm)]
  const top = headings[0]
  if (top === undefined || top[1] !== version) {
    const at = top === undefined ? 1 : changelog.slice(0, top.index).split('\n').length
    fail('release-changelog', `CHANGELOG.md:${String(at)} 顶部条目是 ${top?.[1] ?? '无'}，package version 是 ${version}（同版必须先写条目）`)
    return
  }
  const next = headings[1]
  const body = changelog.slice((top.index ?? 0) + top[0].length, next?.index ?? changelog.length)
  const bullet = body.split('\n').find(line => /^\s*-\s+\S+/.test(line) && !/\b(TODO|TBD)\b/i.test(line))
  if (bullet === undefined) {
    fail('release-changelog', `CHANGELOG.md:${String(changelog.slice(0, top.index).split('\n').length)} 的 ${version} 条目没有实际变化（TODO/空不算）`)
    return
  }
  const compat = pack?.dsh?.compatibility
  if (compat !== undefined) {
    fail('release-changelog', `${packPath} 仍携带 dsh.compatibility（DSH 不读；台账应在 checks/gates/lib/compat-tags.json）`)
    return
  }
  ok(`release-changelog（${version}；条目 ${top[2]}）`)
}
