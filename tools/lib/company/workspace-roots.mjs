/**
 * 工作区双根解析（BUG-353）：v3 run-bundle 把公司数据搬进 `<workspace>/.dsh-company/`，
 * 但维护/审计脚本仍要按**外层 workspace** 找会话与仓库相对路径。
 *
 * 为什么单独成件：`converge.mjs` 与 `journal-audit.mjs` 各自拼根会再次漂移；判据是
 * 「有没有 bundle 目录」，文件操作走 `companyRoot`，会话/仓库相对路径走 `workspaceRoot`。
 */
import { join } from 'node:path'

/** v3 run-bundle 目录名（与 checks/lib/deliverables-audit.mjs 的 RUN_BUNDLE_DIRNAME 同值）。 */
export const COMPANY_BUNDLE_DIRNAME = '.dsh-company'

/**
 * 解析工作区双根。
 * @param {string} workspace 外层 workspace（绝对或仓库相对已由调用方解析）。
 * @param {boolean} hasBundle 是否存在 `<workspace>/.dsh-company/`。
 * @returns {{ workspaceRoot: string, companyRoot: string, bundleRel: string }}
 */
export function resolveCompanyRoots(workspace, hasBundle) {
  return {
    workspaceRoot: workspace,
    companyRoot: hasBundle ? join(workspace, COMPANY_BUNDLE_DIRNAME) : workspace,
    bundleRel: hasBundle ? COMPANY_BUNDLE_DIRNAME : '',
  }
}
