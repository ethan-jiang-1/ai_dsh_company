// 排练场（runtime/rehearsal-workspace/）的成型与守卫 —— 轮间待办②「练习场 ≠ 运行场」。
// 出处：notes/implemented/2026-09-22-workspace-hygiene.md 条目去向 #3；roadmap 轮间待办（R4 → R5a）②。
//
// 为什么：排练/探针跑在真盘时，过程稿不受三态判据约束（drafts/ 本就不需要 present），
// 产物会安静积进 company-workspace/ —— R4 W2 删掉的 15 份污染文件正是探针跑在真盘的产物。
// 机制：workspace 归属按 SessionHeader.cwd（vendor docs/subsystems/workspace.md），
// 会话 cwd 换到独立目录即完成隔离，不需要新功能。
//
// 镜像语义（ensure 幂等，可反复跑）：
//   - 参考输入每次都刷新：kb/<role>/CHARTER.md、kb/org.md、**kb/owners.md**、
//     **kb/motion-ledger.md**、templates/（后两件 2026-09-26 补：排练场里的角色此前**看不到
//     授权面与经营台账**——排练动议若要按 owners.md 路由、或要看台账，就会缺料）
//   - 排练产物永不触碰：kb/<role>/journal/（**不镜像**真实 journal——排练记忆不混真记忆）、
//     deliverables/、排练会话写出的任何文件
//   - AGENTS.md 是指向真盘手册的**符号链接**（相对目标）：手册即注入基线，单一事实家不搬家；
//     preset 的 projectRootMarkers: [] ⇒ 指令链只认 cwd，不会向上混入开发仓库 AGENTS.md
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { join, relative } from 'node:path'

export const REHEARSAL_REL = join('runtime', 'rehearsal-workspace')

/**
 * 公司参考镜像（幂等纯 fs）：AGENTS.md + kb 事实三件（org/owners/motion-ledger）+ 各角色
 * CHARTER + journal 目录骨架 + templates/。journal 真文件不镜像（记忆不混）、既有产物不触碰。
 * - BUG-006（2026-10-07）：录制临时工作区此前只拷 AGENTS.md ⇒ 角色看不到 templates/meta.md
 *   词表模板，meta 类型/结果字段自由发挥越审计词表。修法 = 录制工作区吃与排练场同源的镜像。
 * - agents 语义二分：'symlink' = 相对符号链接（排练场惯例——手册单一事实家、live 演进即见）；
 *   'copy' = 实拷贝（录制工作区必须用——workspace-oracle 拒符号链接，录后快照采集才走得通）。
 */
export function mirrorCompanyReference(workspace, companyRoot, { agents = 'copy' } = {}) {
  if (!existsSync(join(companyRoot, 'AGENTS.md'))) {
    throw new Error(`mirror: 找不到真盘手册 ${join(companyRoot, 'AGENTS.md')}——companyRoot 传对了吗？`)
  }
  mkdirSync(workspace, { recursive: true })
  if (agents === 'symlink') refreshSymlink(join(workspace, 'AGENTS.md'), relative(workspace, join(companyRoot, 'AGENTS.md')))
  else cpSync(join(companyRoot, 'AGENTS.md'), join(workspace, 'AGENTS.md'))

  mkdirSync(join(workspace, 'deliverables'), { recursive: true })
  mkdirSync(join(workspace, 'kb'), { recursive: true })
  const realKb = join(companyRoot, 'kb')
  // kb 根的**事实家三件**：编制 / 人侧授权面 / 经营台账。少镜像一件，场里就有一处事实缺料。
  for (const name of ['org.md', 'owners.md', 'motion-ledger.md']) {
    if (existsSync(join(realKb, name))) cpSync(join(realKb, name), join(workspace, 'kb', name))
  }
  for (const entry of existsSync(realKb) ? readdirSync(realKb, { withFileTypes: true }) : []) {
    if (!entry.isDirectory()) continue
    mkdirSync(join(workspace, 'kb', entry.name, 'journal'), { recursive: true })
    const charter = join(realKb, entry.name, 'CHARTER.md')
    if (existsSync(charter)) cpSync(charter, join(workspace, 'kb', entry.name, 'CHARTER.md'))
  }
  if (existsSync(join(companyRoot, 'templates'))) {
    cpSync(join(companyRoot, 'templates'), join(workspace, 'templates'), { recursive: true })
  }
  return workspace
}

/** 幂等成型排练场，返回其绝对路径。repoRoot = 仓库根（checks/ 的上一级）。 */
export function ensureRehearsalWorkspace(repoRoot) {
  const real = join(repoRoot, 'company-workspace')
  const rehearsal = mirrorCompanyReference(join(repoRoot, REHEARSAL_REL), real, { agents: 'symlink' })
  return rehearsal
}

/** 指向 target 的相对符号链接；已存在但指错、或是普通文件/目录则重建。 */
function refreshSymlink(linkPath, target) {
  try {
    if (lstatSync(linkPath).isSymbolicLink() && readlinkSync(linkPath) === target) return
  } catch {
    // 不存在：落到下面创建
  }
  rmSync(linkPath, { force: true, recursive: true })
  symlinkSync(target, linkPath, 'file')
}
