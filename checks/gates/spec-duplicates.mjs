// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 测试文件重复门禁（spec-duplicates，2026-11-03 第六轮立）──────────────────────
// 为什么：2026-11-03 `d6d1f92`（tests/company 进 tsc）把 `tests/company/dag.spec.ts` **整文件覆盖**
// 成 `tests/company/cultivation-lib.spec.ts` 的字节副本（md5 同为 3255b4ce…）：DAG 布局算法
// （`src/lib/dag.ts`，261 行）失去唯一单测，套件多出 21 条重复用例，而 `pnpm test` 全绿、`verify`
// 全绿、复核轮也全绿——**没有任何门禁看"两份 spec 是同一份内容"**。这不是过期，是内容被顶替：
// 旧文还在被引用、新文看起来合理，正是本仓最怕的腐化形态。
// 判据（机械、窄）：`tests/**/*.spec.ts` 的**归一化正文**（去行尾空白与首尾空行）做 sha256；
//   同一哈希出现两次 = 红，点名两份文件与共同哈希前缀。只查字节同一/仅差行尾空白的复制——
//   不判"语义相似"（那会误伤平行的跨面守卫，见 tasks-table / board-panel 的 BUG-027 双守卫）。
// 不查的反面（明说）：① 从别处粘贴的**片段**（不是整文件）不红；② 生成式 fixture 内容相同但
//   文件名不同仍红——真要两份相同内容，抽共享 helper 而不是复制文件。
// 负例留证 2026-11-03（实地造红→还原→绿）：`cp tests/company/dag.spec.ts tests/company/zz-copy.spec.ts`
//   → `FAIL spec-duplicates: 2 份 spec 内容完全相同（sha256:fdbe9b51…）：tests/company/dag.spec.ts；
//   tests/company/zz-copy.spec.ts`；删除副本 → 绿 ×139。
export function run({ root, ok, fail }) {
  const testsDir = join(root, 'tests')
  if (!existsSync(testsDir) || !lstatSync(testsDir).isDirectory()) {
    fail('spec-duplicates', 'tests/ 不在盘上——测试文件重复检查无从谈起（目录缺失即红，不静默跳过）')
    return
  }
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(path)
    return entry.name.endsWith('.spec.ts') ? [path] : []
  })
  const files = walk(testsDir).sort()
  const byHash = new Map()
  for (const file of files) {
    const normalized = readFileSync(file, 'utf8')
      .split('\n')
      .map(line => line.replace(/\s+$/, ''))
      .join('\n')
      .replace(/^\n+|\n+$/g, '')
    const hash = createHash('sha256').update(normalized).digest('hex')
    byHash.set(hash, [...(byHash.get(hash) ?? []), file.slice(root.length + 1)])
  }
  const duplicates = [...byHash.entries()].filter(([, paths]) => paths.length > 1)
  duplicates.length === 0
    ? ok(`spec-duplicates ×${String(files.length)}（测试文件正文唯一；复制即红）`)
    : fail('spec-duplicates', duplicates
      .map(([hash, paths]) => `${String(paths.length)} 份 spec 内容完全相同（sha256:${hash.slice(0, 8)}…）：${paths.join('；')}`)
      .join(' / ') + '——抽共享 helper 或删掉被顶替的那份，不许留重复副本')
}
