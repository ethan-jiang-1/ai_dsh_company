// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { NOW_FILES } from './bare-path.mjs'

// ── 2d-ter. 退役路径门禁（retired-path，2026-10-10 立）────────────────────────────
// 为什么：目录改名后，旧前缀会在 bare-path 三个盲区里全绿存活——① TOP_DIRS 曾漏 `_backlog/`（同轮补）；
// ② glob/占位内容被 `[*<>…{}]` 过滤跳过（`BUG-nnn-*.md` 类）；③ `.agents/skills/`、checks/README、
// run/README 不在 NOW_FILES 扫描面。实测 2026-10-10 一轮清出五处改名残留（agent-note-definition skill 的
// 旧 plans 池、guard-red-record 与 pack README 的旧 _done 池、runtime README 的 dev/ 字面量、
// currency Note 表行旧池名），门禁全绿通过——错误类复发过（2026-10-09 backlog 大改名一轮即产）、
// 可机械判定，符合门禁升格判据（dev-loop §9）。
// 规则：**活跃面**（= NOW_FILES ∪ `.agents/skills/**` ∪ checks/README.md ∪ run/README.md）的反引号内容
// 命中退役前缀 → 红，失败信息点名文件:行与现行家。**退役前缀清单唯一家 = 下面的数组**（D28：枚举的家 =
// 实现自己；Note 与文档描述本门禁时不逐字复述清单）。归档树（postmortem / _backlog/_archive /
// notes/archived）不扫——记录当时事实的档案，判红即逼篡改记录（与 bare-path 一样不扫 archived）。
// 负例留证 2026-10-10（实跑原话）：docs/orient.md 临时插负例A（反引号内旧 plans 池前缀路径）→
//   `FAIL retired-path: docs/orient.md:61 → \`_backlog/plans/zz-demo.md\` 用了退役路径——改指现行家 \`_backlog/issues/\``；
//   还原即绿。豁免方向：同一行放进 notes/archived/ 临时文件 → retired-path 不红（不在扫描面；探针文件已删）。
// 同轮 TOP_DIRS 补 `'_backlog/'` 的红证：负例B（反引号内不存在路径）→
//   `FAIL bare-path: docs/orient.md:62 → \`_backlog/issues/2026-99-99-nonexistent.md\` 不存在（双树均无……）`；还原即绿。
export function run({ root, ok, fail }) {
  const walkMd3 = (dir) => !existsSync(dir) || !lstatSync(dir).isDirectory() ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', '.git', 'lib'].includes(entry.name) ? [] : walkMd3(p)
    return entry.name.endsWith('.md') ? [p.slice(root.length + 1)] : []
  })
  const RETIRED_PATH_PREFIXES = [
    ['_backlog/_done', '_backlog/_archive'],
    ['_backlog/plans/', '_backlog/issues/'],
  ]
  const retiredScanFiles = [...new Set([
    ...NOW_FILES, ...walkMd3(join(root, '.agents/skills')), 'checks/README.md', 'run/README.md',
  ])].filter(f => existsSync(join(root, f)))
  let retiredBad = false
  for (const rel of retiredScanFiles) {
    const lines = readFileSync(join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/`([^`\n]+)`/g)) {
        for (const [retired, current] of RETIRED_PATH_PREFIXES) {
          if (m[1].includes(retired)) {
            retiredBad = true
            fail('retired-path', `${rel}:${i + 1} → \`${m[1]}\` 用了退役路径——改指现行家 \`${current}\``)
          }
        }
      }
    })
  }
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
      lines.forEach((line, i) => {
        if (!/^\s*(\/\/|\*|\/\*)/.test(line)) return
        for (const [retired, current] of RETIRED_PATH_PREFIXES) {
          if (line.includes(retired)) {
            retiredBad = true
            fail('retired-path', `${rel}:${i + 1} → 注释引用退役路径 \`${retired}\`——改指现行家 \`${current}\``)
          }
        }
      })
      retiredScriptCount++
    }
  }
  if (!retiredBad) ok(`retired-path ×${retiredScanFiles.length} 文件 + ${retiredScriptCount} 脚本注释面（退役目录前缀扫描：活跃面零残留）`)
}
