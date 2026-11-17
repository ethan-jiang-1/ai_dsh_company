// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { NOW_FILES, RETIRED_PATHS } from './bare-path.mjs'
import { parseNameStatus, retiredDirectoryPrefixes } from '../lib/retired-paths.mjs'

// ── 2d-ter. 退役路径门禁（retired-path，2026-10-10 立；2026-11-17 加自动推导）─────────────
// 为什么：目录改名后，旧前缀会在 bare-path 三个盲区里全绿存活——① TOP_DIRS 曾漏 `_backlog/`（同轮补）；
// ② glob/占位内容被 `[*<>…{}]` 过滤跳过（`BUG-nnn-*.md` 类）；③ `.agents/skills/`、checks/README、
// run/README 不在 NOW_FILES 扫描面。实测 2026-10-10 一轮清出五处改名残留（agent-note-definition skill 的
// 旧 plans 池、guard-red-record 与 pack README 的旧 _done 池、runtime README 的 dev/ 字面量、
// currency Note 表行旧池名），门禁全绿通过——错误类复发过（2026-10-09 backlog 大改名一轮即产）、
// 可机械判定，符合门禁升格判据（dev-loop §9）。
//
// 规则：
//   A. **手工表**（`RETIRED_PATH_PREFIXES`，唯一家 = 本文件）：活跃 Markdown 的反引号内容 + 脚本注释行
//      命中退役前缀 → 红，失败信息点名文件:行与现行家。表有自检：`from` 不得仍存在，`to` 必须是
//      现行路径（描述性括注允许）。
//   B. **自动推导**（2026-11-17 BUG-207）：`git log -n 300 --diff-filter=RD -M --name-status`
//      取近期 rename/delete 的旧路径，扫**脚本注释行**的路径 token。为什么：退役前缀表是手写数组，
//      2026-11-16/17 的 77 renames 一个都没进表，脚本注释里的旧家仍「零残留」（`tools/observe/…`
//      正是本波刚退役的位置）。近期历史是现成的唯一事实源，不该再抄一遍。浅克隆（CI 常态）跳过
//      B 并在 PASS 行点名——不静默；`RETIRED_PATHS` 与 `AUTO_ALLOW` 是对历史引文的显式豁免。
//
// 不扫：`_backlog/**`（活跃卡/研究材料是**证据与推敲**，不是导航指针；其中的裸路径存在性仍由
// bare-path 判）、`notes/archived/**`、`snapshots/**`（冻结/归档证据载荷）。脚本里的 `负例留证`
// 块对 B 豁免（那是红配方，不是活指针）；含 `FAIL ` 的引文行对手工表豁免（引用门禁原话的历史证据）。
//
// 负例留证 2026-10-10（实跑原话）：docs/orient.md 临时插负例A（反引号内旧 plans 池前缀路径）→
//   `FAIL retired-path: docs/orient.md:61 → \`_backlog/plans/zz-demo.md\` 用了退役路径——改指现行家 \`_backlog/issues/\``；
//   还原即绿。豁免方向：同一行放进 notes/archived/ 临时文件 → retired-path 不红（不在扫描面；探针文件已删）。
// 负例留证 2026-11-17（BUG-207）：向 `tools/lib/core/asset-lanes.mjs` 注释注入
//   `// probe: 旧家 tools/observe/ask-latency.mjs 已迁 probes/analyze` → 自动推导红（手工表也覆盖）；
//   删除 → 绿。另一方向：同上旧路径放进 `_backlog/research/` → 不红（历史材料）。
const RETIRED_PATH_PREFIXES = [
  ['_backlog/_done', '_backlog/_archive'],
  ['_backlog/plans/', '_backlog/issues/'],
  // 2026-11-03（R5-11/R5-01）：v3 把出厂内容从 workspace/ 搬到 content/、删除了独立启动器；
  // 两类残留曾靠人工扫出来。前缀入表后，活跃文档/脚本注释再写旧家即红。
  ['packages/company-pack/workspace', 'packages/company-pack/content'],
  ['tools/standalone.mjs', 'checks/lanes/ui-scene.entry.mjs（产品入口 = dsh --profile company）'],
  // 2026-11-17（C12 归属波次，BUG-207）：本波 63 lib + 77 renames 的目录/文件退役家。
  ['tools/observe/', 'probes/analyze/'],
  ['tools/repo/refactor-drift.mjs', 'checks/audit/refactor-drift-audit.mjs'],
  ['checks/lib/delegation-model.mjs', 'tools/lib/company/delegation-model.mjs'],
  ['checks/lib/candidate-scan.mjs', 'tools/lib/company/candidate-scan.mjs'],
  ['checks/gates/lib/pin.mjs', 'tools/lib/core/pin.mjs'],
  ['checks/lanes/lib/mutation.mjs', 'tests/support/mutation.mjs'],
  ['tests/support/coverage-baseline.json', 'checks/lib/coverage-baseline.json'],
  ['tools/lib/coverage-baseline.mjs', 'checks/lib/coverage-baseline.mjs'],
  ['tools/lib/coverage-baseline.json', 'checks/lib/coverage-baseline.json'],
]

// 自动推导面的显式豁免：历史引文/事故原话，不是活指针。键 = `${脚本相对路径}\0${旧路径 token}`。
const AUTO_ALLOW = new Set([
  // postmortem 0001 的原话里点名一个已不存在的旧守卫。
  'checks/gates/preset-required-config.mjs\0scripts/verify.mjs',
  // 2026-11-03 的事故原话：当时那份文档已重构，不是现行落点。
  'checks/gates/retired-claims.mjs\0docs/design/architecture.md',
  // 2026-11-03 的覆盖事故原话：当时的 tests/company/dag.spec.ts 已被顶替。
  'checks/gates/spec-duplicates.mjs\0tests/company/dag.spec.ts',
  // bare-path 头注里列举的是历史扫描面（当时这些目录还在），不是现行落点。
  'checks/gates/bare-path.mjs\0docs/design',
  'checks/gates/bare-path.mjs\0notes/research',
  'checks/gates/bare-path.mjs\0notes/postmortem',
  // 2026-11-03 的事故原话里点名的旧文档（docs/design/architecture.md 已并入 docs/architecture.md）。
  'checks/gates/retired-claims.mjs\0docs/design/architecture.md',
  // postmortem 0001 的原话：当时的 scripts/verify.mjs 已不存在。
  'checks/gates/preset-required-config.mjs\0scripts/verify.mjs',
  // doc-taxonomy 立门时的事故现场（docs/design 子树已退役）。
  'checks/gates/doc-taxonomy.mjs\0docs/design',
])

/** Markdown 扫描的冻结前缀（证据/历史层，不是导航）。 */
const FROZEN_MD = /^(?:_backlog\/|notes\/archived\/|snapshots\/)/
/** 脚本注释行的路径 token（只认带 `/` 的相对/仓库路径；不含空白与标点）。 */
const TOKEN = /[A-Za-z0-9_.@+-]+(?:\/[A-Za-z0-9_.@+-]+)+/g
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/
const NEGATIVE_START = /^\s*(?:\/\/|\*|\/\*)\s*负例留证/

/** 从近期 git 历史推导 retire/delete 的旧路径；浅克隆返回 shallow=true（不判 B）。 */
function autoRetired(root) {
  const shallow = spawnSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' })
  if (shallow.status !== 0) return { map: new Map(), dirs: new Map(), shallow: false, error: 'git 不可用' }
  if (shallow.stdout.trim() === 'true') return { map: new Map(), dirs: new Map(), shallow: true, error: undefined }
  const log = spawnSync('git', ['log', '-n', '300', '--diff-filter=RD', '-M', '--name-status', '--format=COMMIT-%h'], {
    cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  })
  if (log.status !== 0) return { map: new Map(), dirs: new Map(), shallow: false, error: (log.stderr || '').trim().split('\n')[0] || 'git log 失败' }
  const map = parseNameStatus(log.stdout)
  for (const oldPath of [...map.keys()]) {
    if (existsSync(join(root, oldPath))) map.delete(oldPath) // 旧路径又回来了，不算退役
  }
  const dirs = retiredDirectoryPrefixes(map, dir => existsSync(join(root, dir)))
  return { map, dirs, shallow: false, error: undefined }
}

export function run({ root, ok, fail }) {
  const walkMd3 = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd3(p)
    return entry.name.endsWith('.md') ? [p.slice(root.length + 1)] : []
  })
  // 负例留证 2026-11-03（R5-11/R5-01）：docs/orient.md 临时插 `packages/company-pack/workspace` →
  //   `FAIL retired-path: docs/orient.md:79 → … 用了退役路径——改指现行家 packages/company-pack/content`；
  //   还原 → `OK ×177 文件 + 352 脚本注释面`。
  const retiredScanFiles = [...new Set([
    ...NOW_FILES, ...walkMd3(join(root, '.agents/skills')), 'checks/README.md', 'run/README.md',
  ])].filter(f => existsSync(join(root, f)) && !FROZEN_MD.test(f))
  const problems = []
  let retiredBad = false
  const report = (message) => {
    retiredBad = true
    problems.push(message)
  }

  for (const [retired, current] of RETIRED_PATH_PREFIXES) {
    if (existsSync(join(root, retired))) {
      report(`退役表登记了仍然存在的路径 ${retired}——它不是退役家；删掉这条或改认真正的旧路径`)
      continue
    }
    const currentPath = current.split('（')[0].trim()
    if (currentPath !== '' && !existsSync(join(root, currentPath))) {
      report(`退役表指向的现行家不存在：${retired} → ${currentPath}（改到盘上真实路径）`)
    }
  }

  for (const rel of retiredScanFiles) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (line.includes('FAIL ')) return // 引文里的门禁原话，不是活指针
      for (const m of line.matchAll(/`([^`\n]+)`/g)) {
        for (const [retired, current] of RETIRED_PATH_PREFIXES) {
          if (m[1].includes(retired)) report(`retired-path ${rel}:${i + 1} → \`${m[1]}\` 用了退役路径——改指现行家 \`${current}\``)
        }
      }
    })
  }

  const auto = autoRetired(root)
  if (auto.error) report(`自动退役面没有对象：${auto.error}——判据失败，不许当成无残留`)
  if (!auto.shallow && auto.map.size === 0 && auto.error === undefined) report('git 近期历史没有推导出任何 rename/delete——判据没有对象，不许当成通过')

  // 2026-10-10 扩第四盲区（entry-probe 语义审 C2 实证）：checks|probes|tools|tests 的脚本**注释行**
  // 也运载指针（头注「研究卡 <路径>」），且不在任何 .md 扫描面——cross-process-fs-probe 头注引用
  // 已迁 `_backlog/_archive/settled_issues/` 的旧 plans 卡，三门禁全绿存活。只扫注释行（// 或块注释行），
  // 不扫代码体：模板字符串/映射表是逻辑不是指针（本门禁自己的退役前缀映射表就在单引号字符串里）。
  const walkScripts = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git'].includes(entry.name) ? [] : walkScripts(p)
    return /\.(mjs|ts)$/.test(entry.name) ? [p.slice(root.length + 1)] : []
  })
  let retiredScriptCount = 0
  for (const dir of ['checks', 'probes', 'tools', 'tests']) {
    for (const rel of walkScripts(join(root, dir))) {
      if (rel === 'checks/gates/retired-path.mjs') continue // 退役前缀映射表 = 本文件（清单唯一家）
      const lines = readFileSync(join(root, rel), 'utf8').split('\n')
      let negativeBlock = false
      lines.forEach((line, i) => {
        if (!COMMENT_LINE.test(line)) {
          negativeBlock = false
          return
        }
        if (NEGATIVE_START.test(line)) negativeBlock = true
        if (negativeBlock) return // 红配方不是活指针；手工表也放行
        let manualHit = false
        for (const [retired, current] of RETIRED_PATH_PREFIXES) {
          if (line.includes(retired)) {
            manualHit = true
            report(`retired-path ${rel}:${i + 1} → 注释引用退役路径 \`${retired}\`——改指现行家 \`${current}\``)
          }
        }
        if (manualHit || negativeBlock) return
        for (const match of line.matchAll(TOKEN)) {
          const token = match[0].replace(/[.,;:]+$/, '')
          if (RETIRED_PATHS.has(token)) continue
          if (AUTO_ALLOW.has(`${rel}\0${token}`)) continue
          if (auto.map.has(token)) {
            const next = auto.map.get(token)
            report(`retired-path ${rel}:${i + 1} → 注释引用近期已退役路径 \`${token}\`（git 记为 ${next === '' ? '删除；无现家' : `→ ${next}`}）`)
            continue
          }
          for (const [dirPrefix, next] of auto.dirs) {
            if (token === dirPrefix.slice(0, -1) || token.startsWith(dirPrefix)) {
              report(`retired-path ${rel}:${i + 1} → 注释引用近期已退役目录 \`${dirPrefix}\`（${next === '' ? 'git 记为删除' : `现家示例 ${next}`}）`)
              break
            }
          }
        }
      })
      retiredScriptCount++
    }
  }

  if (retiredBad) {
    fail('retired-path', `${String(problems.length)} 处（退役表自检 + 活跃 Markdown + 脚本注释自动面）：${problems.slice(0, 20).join('；')}${problems.length > 20 ? ` …共 ${String(problems.length)} 处` : ''}`)
    return
  }
  const autoNote = auto.shallow
    ? '浅克隆：git 自动退役面跳过（只查手工表）'
    : `git 自动推导 ${String(auto.map.size)} 条旧路径 / ${String(auto.dirs.size)} 个退役目录（最近 300 个含 rename/delete 的提交）`
  ok(`retired-path ×${String(retiredScanFiles.length)} 文件 + ${String(retiredScriptCount)} 脚本注释面（手工前缀 ${String(RETIRED_PATH_PREFIXES.length)} 条；${autoNote}；活跃面零残留）`)
}
