/**
 * run bundle 布局（2026-11-01 v3）：用户 workspace 里只出现一个 `.dsh-company/`。
 *
 * 设计边界：
 * - **插件内容**（persona / skills / handbook / templates / default charters）住 pack 的 `content/`；
 * - **run bundle**（公司身份、kb、交付物、培养、日志、导出、身份 manifest）住 workspace 的
 *   `<workspace>/.dsh-company/`；
 * - 根目录不再出现 `AGENTS.md` / `COMPANY.md` / `kb/` / `templates/` / `deliverables/` / `cultivation/`。
 *
 * 路径一律**相对 workspace 的 POSIX 字符串**给模型/remote 用；host 落盘再用 `join`。
 * 字符串常量唯一家 = `src/lib/run-bundle-paths.ts`（client 也读同一份）。
 */
import { join } from 'node:path'
import { RUN_BUNDLE_DIR, RUN_BUNDLE_PATHS, runBundleRel } from '../lib/run-bundle-paths.ts'

export { RUN_BUNDLE_DIR, runBundleRel }
export const RUN_BUNDLE_REL = {
  root: RUN_BUNDLE_PATHS.root,
  manifest: RUN_BUNDLE_PATHS.manifest,
  readme: RUN_BUNDLE_PATHS.readme,
  kb: RUN_BUNDLE_PATHS.kb,
  ledger: RUN_BUNDLE_PATHS.ledger,
  catalog: RUN_BUNDLE_PATHS.catalog,
  presented: RUN_BUNDLE_PATHS.presented,
  company: RUN_BUNDLE_PATHS.company,
  org: RUN_BUNDLE_PATHS.org,
  owners: RUN_BUNDLE_PATHS.owners,
  deliverables: RUN_BUNDLE_PATHS.deliverables,
  archive: RUN_BUNDLE_PATHS.archive,
  cultivation: RUN_BUNDLE_PATHS.cultivation,
  records: RUN_BUNDLE_PATHS.records,
  logs: RUN_BUNDLE_PATHS.logs,
  exports: RUN_BUNDLE_PATHS.exports,
  overrides: RUN_BUNDLE_PATHS.overrides,
  legacy: RUN_BUNDLE_PATHS.legacy,
} as const

/** 绝对路径：`<workspace>/.dsh-company/<rel>`。 */
export const runBundlePath = (workspace: string, rel = ''): string =>
  join(workspace, RUN_BUNDLE_DIR, rel)
