// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { importProblem, importSpecifiers, layerOf } from '../../tools/lib/src-layering.mjs'

// ── 3. pack 源码面分层门禁（src-layering，2026-10-27 立，R3-01）────────────────────
// 为什么：host/lib/client 的分层此前**只由 tsconfig include 保证**——`pnpm verify` 不跑 tsc、
//   `pnpm test` 是裸 vitest。往 client 面板 import 一个 host 模块，两个标准命令全绿，构建时才炸
//   （TS6307）。分层是地基，必须有默认回路守它。判据与层定义理由 = tools/lib/src-layering.mjs。
// 边界：只查相对 import 的目标层 + lib/client 的 node: 内建；不做符号解析、不做类型检查
//   （类型面仍归 tsc；本门禁在无构建的 fresh clone 上也必须能跑）。
// 负例留证 2026-10-27（破坏真文件，非构造夹具）：
//   在 packages/company-pack/src/client/Brand.tsx 顶部插入 `import '../host/catalog.ts'` →
//   `FAIL src-layering: packages/company-pack/src/client/Brand.tsx:1 → client → host 不在允许方向
//   （client 允许：client / lib）`；还原 → PASS src-layering ×N 文件。
export function run({ root, ok, fail }) {
  const srcRoot = join(root, 'packages/company-pack/src')
  let files
  try {
    files = walk(srcRoot)
  } catch {
    fail('src-layering', `源码面缺失：${srcRoot}`)   // 缺失报「缺失」，不抛异常中断整个 run-gates
    return
  }
  const problems = []
  let edgeCount = 0
  for (const absolute of files) {
    const relative = absolute.slice(srcRoot.length + 1)
    const fromLayer = layerOf(relative)
    const text = readFileSync(absolute, 'utf8')
    for (const { specifier, line } of importSpecifiers(text)) {
      if (specifier.startsWith('.')) edgeCount += 1
      const problem = importProblem({ fromLayer, relativePath: relative, specifier })
      if (problem !== null) problems.push(`packages/company-pack/src/${relative}:${String(line)} → ${problem}`)
    }
  }
  problems.length === 0
    ? ok(`src-layering ×${String(files.length)} 文件 / ${String(edgeCount)} 条相对引用（client→lib、host→lib、root→{host,lib}；反向零）`)
    : fail('src-layering', problems.join('；'))
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.tsx?$/.test(entry)) out.push(path)
  }
  return out.sort()
}
