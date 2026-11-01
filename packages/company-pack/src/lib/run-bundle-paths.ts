/**
 * run bundle 相对路径（浏览器安全：只有字符串，不导入 node:path）。
 *
 * 唯一家：host 落盘、client 读盘、测试断言都从这里取，避免 `.dsh-company/` 前缀散落。
 */
export const RUN_BUNDLE_DIR = '.dsh-company'

export const RUN_BUNDLE_PATHS = {
  root: RUN_BUNDLE_DIR,
  manifest: `${RUN_BUNDLE_DIR}/bundle.json`,
  readme: `${RUN_BUNDLE_DIR}/README.md`,
  kb: `${RUN_BUNDLE_DIR}/kb`,
  ledger: `${RUN_BUNDLE_DIR}/kb/motion-ledger.md`,
  catalog: `${RUN_BUNDLE_DIR}/kb/deliverables-index.json`,
  presented: `${RUN_BUNDLE_DIR}/kb/deliverables-presented.json`,
  company: `${RUN_BUNDLE_DIR}/kb/company.md`,
  org: `${RUN_BUNDLE_DIR}/kb/org.md`,
  owners: `${RUN_BUNDLE_DIR}/kb/owners.md`,
  deliverables: `${RUN_BUNDLE_DIR}/deliverables`,
  archive: `${RUN_BUNDLE_DIR}/deliverables-archive`,
  cultivation: `${RUN_BUNDLE_DIR}/cultivation`,
  records: `${RUN_BUNDLE_DIR}/cultivation/records`,
  logs: `${RUN_BUNDLE_DIR}/logs`,
  exports: `${RUN_BUNDLE_DIR}/exports`,
  overrides: `${RUN_BUNDLE_DIR}/overrides`,
  legacy: `${RUN_BUNDLE_DIR}/legacy`,
} as const

/** 相对 workspace 的 POSIX 路径：`.dsh-company/<rel>`。 */
export const runBundleRel = (rel: string): string =>
  rel === '' ? RUN_BUNDLE_DIR : `${RUN_BUNDLE_DIR}/${rel}`
