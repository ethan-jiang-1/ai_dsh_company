// 排练场（runtime/rehearsal-workspace/）的成型与守卫 —— 练习场 ≠ 运行场。
//
// 形状（2026-11-01 v3）：只读内容在 pack `content/`；排练场只建 `.dsh-company/` 状态/产物。
// 不再复制手册/模板到根，也不建根 AGENTS.md（host 注入 pack handbook）。
// 排练产物永不触碰真实 workspace 的 journal/deliverables；这里只做参考状态镜像。
// kb 文件清单 = seed.json 派生（不手抄第三份；BUG-054）。
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { KB_DIR, seedKbFiles } from './kb-seeds.mjs'

export const REHEARSAL_REL = join('runtime', 'rehearsal-workspace')
const ROLES = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales', 'cmo']

/**
 * 公司参考镜像（幂等纯 fs）：`.dsh-company/kb` 状态 + 角色章程 + 空产物目录。
 * @param {string} workspace - 目标排练/录制 workspace。
 * @param {string} companyRoot - dev workspace 根（用于推导 repo 根）。
 * @param {{ agents?: 'copy'|'symlink', contentRoot?: string }} [options] - agents 保留兼容但不再使用。
 * @returns {string} workspace
 */
export function mirrorCompanyReference(workspace, companyRoot, { contentRoot } = {}) {
  const repoRoot = dirname(companyRoot)
  const content = contentRoot ?? join(repoRoot, 'packages/company-pack/content')
  if (!existsSync(join(content, 'AGENTS.md'))) {
    throw new Error(`mirror: 找不到 pack content 手册 ${join(content, 'AGENTS.md')}——repo 布局变了吗？`)
  }
  const run = join(workspace, '.dsh-company')
  for (const dir of [run, join(workspace, KB_DIR), join(run, 'deliverables'), join(run, 'deliverables-archive'),
    join(run, 'cultivation'), join(run, 'cultivation/records'), join(run, 'logs'), join(run, 'exports')]) {
    mkdirSync(dir, { recursive: true })
  }
  // 公司事实 / 章程 / 编号合同都按 pack 的 seed.json 镜像；排练场刷新参考状态（覆盖），
  // 与生产首启"只补缺"不同——这是排练场语义，不是用户 workspace。
  seedKbFiles(content, workspace)
  for (const role of ROLES) mkdirSync(join(workspace, KB_DIR, role, 'journal'), { recursive: true })
  return workspace
}

/** 幂等成型排练场，返回其绝对路径。repoRoot = 仓库根（checks/ 的上一级）。 */
export function ensureRehearsalWorkspace(repoRoot) {
  const rehearsal = join(repoRoot, REHEARSAL_REL)
  rmSync(join(rehearsal, 'AGENTS.md'), { force: true })
  return mirrorCompanyReference(rehearsal, join(repoRoot, 'company-workspace'), {
    contentRoot: join(repoRoot, 'packages/company-pack/content'),
  })
}
