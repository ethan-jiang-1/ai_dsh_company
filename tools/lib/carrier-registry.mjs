/**
 * 公司盘载体登记（2026-11-13，P0 对抗性边界矩阵）。
 *
 * 一个事实（`.dsh-company` 形状/安全）有 N 个载体；登记表是「谁解释了这个事实」的唯一地图。
 * `checks/gates/company-root-carriers.mjs` 拿它做机械门禁：新写入口不登记 → `pnpm verify` 红。
 *
 * 三档：
 * - `CARRIERS`：已收口、由矩阵覆盖的载体；`coveredBy` 必须能对上 spec 标题。
 * - `EXEMPT`：不写 workspace 公司盘的载体（home 锁/设置/日志等），带理由。
 * - `KNOWN_GAP`：已知未收口的公司盘写入口，带缺陷卡号；门禁不判红但必须在 PASS 行列出。
 *
 * 路径相对仓库根；`symbol` 必须在该文件里出现（门禁粗验，不做 AST）。
 */

/** 形状矩阵覆盖的事实；`contract` 指向当前合同，`spec` 指向矩阵 spec。 */
export const FACTS = [
  {
    id: 'company-root-safety',
    contract: 'docs/contracts/data-model.md',
    spec: 'company-root-safety',
    invariant: '任意形状下，公司盘写入口只写根内，或抛 typed refusal；外部字节不变',
  },
  {
    id: 'company-file-shape',
    contract: 'docs/contracts/data-model.md',
    spec: 'file-shape-agreement',
    invariant: '同一形状下，所有读载体归一后 ok / not-ok 一致；允许的偏离必须声明',
  },
]

/** 已收口载体：写入口与读载体共用一张表，`kind` 区分。 */
export const CARRIERS = [
  {
    id: 'company.root',
    module: 'packages/company-pack/src/host/run-bundle/company-root.ts',
    symbol: 'writeCompanyAtomic',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'catalog.regenerate',
    module: 'packages/company-pack/src/host/ledger/catalog.ts',
    symbol: 'regenerateCatalog',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'presented.write',
    module: 'packages/company-pack/src/host/ledger/presented-ledger.ts',
    symbol: 'writePresentedLedger',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'startup.write',
    module: 'packages/company-pack/src/host/startup/startup-store.ts',
    symbol: 'writeStartupSettings',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'bootstrap.apply',
    module: 'packages/company-pack/src/host/run-bundle/bootstrap.ts',
    symbol: 'applyBootstrap',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'export.governance',
    module: 'packages/company-pack/src/host/ledger/governance-export.ts',
    symbol: 'exportGovernance',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'bundle.write',
    module: 'packages/company-pack/src/host/run-bundle/bundle-manifest.ts',
    symbol: 'writeBundleManifest',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'log.rotating',
    module: 'packages/company-pack/src/host/logging/rotating-log.ts',
    symbol: 'appendRotatingLine',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'log.append',
    module: 'packages/company-pack/src/host/run-bundle/bundle-manifest.ts',
    symbol: 'appendUpgradeLog',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'cultivation.writeRecord',
    module: 'packages/company-pack/src/host/cultivation/cultivation-storage.ts',
    symbol: 'nodeCultivationStorage',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'cultivation.pendingRevoke',
    module: 'packages/company-pack/src/host/cultivation/revoke-journal.ts',
    symbol: 'writePendingRevoke',
    kind: 'writer',
    companyRoot: true,
    coveredBy: 'company-root-safety',
  },
  {
    id: 'company.fileProblem',
    module: 'packages/company-pack/src/host/run-bundle/company-root.ts',
    symbol: 'companyFileProblem',
    kind: 'reader',
    companyRoot: true,
    coveredBy: 'file-shape-agreement',
  },
  {
    id: 'company.fileProblemAt',
    module: 'packages/company-pack/src/host/run-bundle/company-root.ts',
    symbol: 'companyFileProblemAt',
    kind: 'reader',
    companyRoot: true,
    coveredBy: 'file-shape-agreement',
  },
  {
    id: 'safe.plainFileProblem',
    module: 'packages/company-pack/src/host/fs/safe-file.ts',
    symbol: 'plainFileProblem',
    kind: 'reader',
    companyRoot: true,
    coveredBy: 'file-shape-agreement',
  },
  {
    id: 'company.readText',
    module: 'packages/company-pack/src/host/run-bundle/company-root.ts',
    symbol: 'readCompanyText',
    kind: 'reader',
    companyRoot: true,
    coveredBy: 'file-shape-agreement',
  },
  {
    id: 'company.readFileAt',
    module: 'packages/company-pack/src/host/run-bundle/company-root.ts',
    symbol: 'readCompanyFileAt',
    kind: 'reader',
    companyRoot: true,
    coveredBy: 'file-shape-agreement',
  },
]

/** 不写 workspace 公司盘的载体；`reason` 是豁免的唯一凭据。 */
export const EXEMPT = [
  {
    module: 'packages/company-pack/src/host/ledger/presented-domain.ts',
    reason: '写 <DSH_HOME>/storages 的 presented 域，不在 workspace 公司盘',
  },
  {
    module: 'packages/company-pack/src/host/run-bundle/lease.ts',
    reason: '写 <DSH_HOME>/company-pack.lock，不在 workspace 公司盘',
  },
  {
    module: 'packages/company-pack/src/host/workspace/workspace-resolution.ts',
    reason: '写 <DSH_HOME>/company/settings.json 的 saved workspace，不在 workspace 公司盘',
  },
]

/** 矩阵未覆盖的已知入口；每条的 `bug` 必须是 _backlog（活跃或归档）里真实存在的卡。 */
export const KNOWN_GAP = []

