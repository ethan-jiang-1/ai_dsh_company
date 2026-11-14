// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { CARRIERS, EXEMPT, KNOWN_GAP } from '../../tools/lib/carrier-registry.mjs'

// ── 公司盘载体门禁（company-root-carriers，2026-11-13 P0）────────────────────────
// 为什么：BUG-144 是「写 gate 靠调用点记得调」，BUG-119/121 是「新增写路径漏了」；
//   同一类病在 BUG-147/148/149/150 复发——写入口自拼 `.dsh-company` 绕过 company-root。
//   登记表（tools/lib/carrier-registry.mjs）是唯一地图；本门禁只做机械对账：
//   ① src/host 里同时出现「公司盘路径特征」与「写原语」的模块，必须在
//      CARRIERS / EXEMPT / KNOWN_GAP 三档之一；未登记 = 红，报 file:line。
//   ② 登记项自身必须可解析：module 存在、CARRIERS 的 symbol 在文件里出现、
//      KNOWN_GAP 的 bug 卡在 _backlog（活跃或归档）里存在。
//   ③ 缺失目录/文件报「缺失」，不抛异常中断 run-gates。
// 负例留证 2026-11-13（真树植入后删除，实跑原话）：
//   新建 `packages/company-pack/src/host/zz-probe-writer.ts`（writeFileSync + `.dsh-company`）→
//   `FAIL company-root-carriers: packages/company-pack/src/host/zz-probe-writer.ts:3 → 未登记的公司盘写入口`;
//   删文件 → PASS（写入口 5 / knownGap 7）。
// 边界：只扫写入口，不扫读载体（读面由 file-shape-agreement spec 判）；不做 AST/符号解析。

const HOST = 'packages/company-pack/src/host'
const COMPANY_REF = /\.dsh-company|companyHomeOf|companyFilePath|RUN_BUNDLE_PATHS/
const WRITE_REF = /writeFileSync|appendFileSync|renameSync|mkdirSync|rmSync|cpSync|unlinkSync|linkSync|writeCompanyAtomic/

/** 去掉块注释与整行注释；行内 `//` 保留（误报由「同时要有写原语」挡住）。 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (entry.name.endsWith('.ts')) out.push(path)
  }
  return out.sort()
}

function firstWriteLine(lines) {
  return lines.findIndex(line => WRITE_REF.test(line) && !/^\s*(import|\} from)/.test(line)) + 1
}

function bugCardExists(root, id) {
  const buckets = ['_backlog/bugs', '_backlog/_archive/fixed_bugs', '_backlog/_archive/suspended_bugs', '_backlog/_archive/settled_issues']
  for (const bucket of buckets) {
    const dir = join(root, bucket)
    if (!existsSync(dir)) continue
    if (readdirSync(dir).some(name => name.startsWith(`${id}-`) && name.endsWith('.md'))) return true
  }
  return false
}

export function run({ root, ok, fail, carriers = CARRIERS, exempt = EXEMPT, knownGap = KNOWN_GAP }) {
  const hostDir = join(root, HOST)
  if (!existsSync(hostDir)) {
    fail('company-root-carriers', `源码面缺失：${HOST}`)
    return
  }
  let files
  try { files = walk(hostDir) } catch {
    fail('company-root-carriers', `源码面不可读：${HOST}`)
    return
  }

  const registered = new Set([
    ...carriers.filter(entry => entry.kind === 'writer').map(entry => entry.module),
    ...exempt.map(entry => entry.module),
    ...knownGap.map(entry => entry.module),
  ])
  const problems = []
  let writers = 0

  for (const absolute of files) {
    const rel = absolute.slice(root.length + 1)
    const text = stripComments(readFileSync(absolute, 'utf8'))
    if (!COMPANY_REF.test(text) || !WRITE_REF.test(text)) continue
    writers += 1
    if (!registered.has(rel)) {
      const line = firstWriteLine(text.split('\n'))
      problems.push(`${rel}:${String(line)} → 未登记的公司盘写入口（登记到 tools/lib/carrier-registry.mjs 的 CARRIERS / EXEMPT / KNOWN_GAP）`)
    }
  }

  for (const entry of [...carriers, ...exempt, ...knownGap]) {
    const path = join(root, entry.module)
    if (!existsSync(path)) {
      problems.push(`${entry.module} → 登记项指向的模块不存在`)
      continue
    }
    if (entry.symbol !== undefined && !readFileSync(path, 'utf8').includes(entry.symbol)) {
      problems.push(`${entry.module} → 登记符号 ${entry.symbol} 不在文件里`)
    }
    if (entry.bug !== undefined && !bugCardExists(root, entry.bug)) {
      problems.push(`${entry.module} → KNOWN_GAP 指向的 ${entry.bug} 卡不存在（活跃/归档均无）`)
    }
  }

  const gaps = knownGap.map(entry => entry.bug).filter((bug, index, all) => all.indexOf(bug) === index)
  const gapText = knownGap.length === 0 ? 'knownGap 0' : `knownGap ${String(knownGap.length)}：${gaps.join('、')}`
  problems.length === 0
    ? ok(`company-root-carriers ×${String(files.length)} 文件（写面文件 ${String(writers)} / ${gapText}）`)
    : fail('company-root-carriers', problems.join('；'))
}
