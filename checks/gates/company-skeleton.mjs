// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c-ter. 公司盘骨架单源（company-skeleton-single-source，2026-10-13 立）────────────
// 为什么：插件是要给**不同人安装**的，而角色跑起来读的全是"公司盘里的文件"——手册（agent-instructions
// 从会话 cwd 注入）、岗位章程、编制、模板。此前这些只活在本仓 `company-workspace/`（一个部署的运行盘），
// pack 的 `files` 不带 ⇒ 第三方装完插件**没有手册与章程**（角色裸跑）。修法 = 制度件搬进
// `packages/company-pack/workspace/`（出厂骨架、随包分发、唯一真源），运行盘用**符号链接**指回来。
// 本门禁钉三件事：①骨架件是 pack 里的真实文件；②运行盘对应路径是解析到它们的符号链接（不是副本——
// 副本 = 第二本账，第三方拿到的手册与我们改的会漂）；③`files` 真带 `workspace/**`（否则分发了个空）。
// 另钉"起动件在场"（org/owners/ledger/空目录），缺了第三方落盘就是残盘。
// 负例留证（实跑，红→还原→绿）：① 把 company-workspace/AGENTS.md 换成真文件副本 → 红（"不是符号链接"）；
// ② 从 package.json 的 files 里删掉 workspace/** → 红；③ 删 packages/company-pack/workspace/kb/owners.md → 红。
export function run({ root, ok, fail }) {
  const SKELETON = 'packages/company-pack/workspace'
  const LINKS = [
    ['company-workspace/AGENTS.md', `${SKELETON}/AGENTS.md`],
    ['company-workspace/templates', `${SKELETON}/templates`],
    ['company-workspace/kb/org.md', `${SKELETON}/kb/org.md`],
    ...[...['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']].map(role => [
      `company-workspace/kb/${role}/CHARTER.md`, `${SKELETON}/kb/${role}/CHARTER.md`,
    ]),
  ]
  const STARTERS = [
    `${SKELETON}/kb/owners.md`, `${SKELETON}/kb/motion-ledger.md`,
    `${SKELETON}/deliverables/.gitkeep`, `${SKELETON}/deliverables-archive/.gitkeep`,
    ...['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales'].map(role => `${SKELETON}/kb/${role}/journal/.gitkeep`),
  ]
  const problems = []
  const shipped = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).files ?? []
  shipped.includes('workspace/**')
    ? ok('company-skeleton 随包分发（files 含 workspace/**）')
    : problems.push('packages/company-pack/package.json 的 files 缺 workspace/**——第三方装了插件却没有公司盘骨架')
  for (const [, target] of LINKS) {
    const targetPath = join(root, target)
    if (!existsSync(targetPath)) problems.push(`${target} 缺失（骨架件不在盘上）`)
    else if (lstatSync(targetPath).isSymbolicLink()) problems.push(`${target} 是符号链接——骨架件必须是 pack 里的真实文件`)
  }
  // 2026-10-24：dev 的 company-workspace 是 run bundle 的 workspace，整树已去 tracked。
  // fresh clone 没有它 ⇒ 只校验 pack 单源；在场时才校验运行盘链接（dev bundle 自管盘的符号链接）。
  const hasWorkspace = existsSync(join(root, 'company-workspace'))
  if (hasWorkspace) {
    for (const [live, target] of LINKS) {
      const livePath = join(root, live)
      const targetPath = join(root, target)
      let stat
      try { stat = lstatSync(livePath) } catch { problems.push(`${live} 缺失（运行盘少了制度件入口）`); continue }
      if (!stat.isSymbolicLink()) problems.push(`${live} 不是符号链接（副本 = 第二本账；运行盘该指回 ${target}）`)
      else if (realpathSync(livePath) !== realpathSync(targetPath)) problems.push(`${live} → ${readlinkSync(livePath)}（应指回 ${target}）`)
    }
  }
  for (const starter of STARTERS) {
    if (!existsSync(join(root, starter))) problems.push(`${starter} 缺失（出厂起动件/空目录骨架）`)
  }
  problems.length === 0
    ? ok(`company-skeleton 单源 ×${LINKS.length} + 起动件 ×${STARTERS.length}（制度件住 pack${hasWorkspace ? '，运行盘符号链接指回' : '；dev bundle 未初始化，跳过运行盘链接'}）`)
    : fail('company-skeleton', problems.join('；'))
}
