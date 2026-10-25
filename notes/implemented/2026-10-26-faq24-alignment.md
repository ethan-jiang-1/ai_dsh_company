# FAQ 24 对齐：发布形态、数据平面与发布内化

状态：已消化（2026-10-26）

## 问题

对照外部研究 `_faq_on_digested/24_plugin-publish-and-agent-data-planes`（DSH rc.3 基线），我们的发布形态与数据平面总体对齐，但有四处要修正：
① preset 定义层携带公司数据（梦之队/高科技/三类业务/50 人），不同公司必须改包源码；
② 包 README 缺 Data / Compatibility / Uninstall，locale/icon 缺失；
③ `dsh.compatibility` 是 DSH 不读的旧字段，却仍被本地门禁当契约；
④ 发布仍依赖口耳相传的步骤，没有一条可执行 runbook / manifest。

## 决定

1. **`dsh.compatibility` 退役**：从 package manifest 移除；已验证 tag 迁到仓库内 `checks/gates/lib/compat-tags.json`，`pack-compat` / `sync-dsh` / release-smoke 改为读这份本地台账。运行时硬门只保留 `engines.dsh`（FAQ 06 §9.2）。
2. **公司盘根保持 bundle workspace**：`<DSH_HOME>/company-workspace`（或 `DSH_COMPANY_HOME`）是产品定义的部署根；catalog 以它为准，session cwd 不同则显示“非公司盘/未配置”，不静默读错盘。此项写进 README Data。
3. **catalog 的 node:fs 是显式例外**：bootstrap/catalog 是部署 provisioning 与 UI 派生索引，不是模型文件访问；模型文件访问仍走 `ctx.fs`。README Data 写明；若未来要进 model 可见面，另立 RFC 迁 `ctx.fs`。
4. **preset 文件名保留 `agent.cordis.yml`**：它由 `dsh.bundle.patch` 显式引用，不是旧 `.agent-presets/` 目录扫描；改名到 `preset.patch.yml` 只影响可读性、会牵动大量历史指针，本轮不做，README 说明。
5. **locale/icon 补上**：`locale/en.json`、`zh.json` 与原创 `icon.svg`，`exports`/`files` 同步；Config 本轮不引入（只有一个可选 `cultivationRoot`，引入 schemastery peer 会扩大依赖面，记录为显式例外）。
6. **发布知识内化**：`docs/release.md` 收敛为合同；[发布 runbook](../../docs/guides/release-runbook.md)、[CHANGELOG](../../CHANGELOG.md)、[release.mjs](../../tools/release.mjs)、`_dist/release-manifest.json`、[release-ready](../../checks/gates/release-ready.mjs) 与 `pnpm release` 已落树。
7. **FAQ 24 登记**：`docs/external-research.md` 增加一行，指向该目录与吸收落点。

## 验收

- 6 个 preset 的 persona 不再出现 `梦之队`（作为公司事实时）/`高科技`/`三类业务`/`50 人`；改为引用 `kb/company.md`/`kb/org.md`。keyless 断言在 `tests/presets`。
- README 有 Install / What it contributes / Configuration / Data / Compatibility / Uninstall 六节；Data 节写明 D/C/W/U/S/H/X 边界。
- `locale/en.json`、`locale/zh.json`、`icon.svg` 进 `files` 与 tarball；`export-dist` 清单断言在场。
- package manifest 无 `dsh.compatibility`；`pack-compat` 读 `checks/gates/lib/compat-tags.json`；`sync-dsh` 检查模式通过。
- `pnpm release --check` 只读通过；`--prepare` 产出 tgz/manual/sha/manifest；`--verify` 跑完全套 keyless smoke。发布 runbook 能按步复现。
- 0.3.4 产物重导，`pnpm verify` / `pnpm test` / release/lifecycle/standalone/client-load 全绿；Note 与 commit/push 完成。

## 输掉的方案

- 把公司事实留 preset、让用户改包源码：违反 D 平面，且每次部署都要发版。
- 把 `dsh.compatibility` 当运行时门：DSH 不读，第三方会误判。
- 为 catalog 引入 `ctx.fs` 异步重构：本轮风险大于收益；先记录例外，model 面另立。
- 把 `agent.cordis.yml` 全仓改名：机制已对，历史指针成本高。

## 范围 / 排除

- 范围：preset 内容、README、locale/icon、compat 台账迁移、release runbook/脚本/manifest、测试补强。
- 排除：npm publish、market、预构建离线、Windows、真容器、完整 `deliverables-check` 平移；不改 `vendor/dsh`。

## 实施与证据（2026-10-26）

已落树：
- 6 个 preset 的 persona 去掉梦之队/高科技/三类业务/50 人，改为引用 `kb/company.md` 与 `kb/org.md`；`tests/presets` 新增 keyless 断言。
- README 六节（Install / What / Configuration / Data / Compatibility / Uninstall）；Data 节写明 D/C/W/U/S/H/X 边界与 node:fs 例外。
- `locale/en.json`、`locale/zh.json`、`icon.svg`；`pack-meta` 门禁 + `export-dist` 清单 + `pack-metadata` 测试。
- `dsh.compatibility` 从 package 移除；[checks/gates/lib/compat-tags.json](../../checks/gates/lib/compat-tags.json) 成为唯一台账；`pack-compat` / `sync-dsh` / release-smoke 同步。
- `CHANGELOG.md`、[release-ready](../../checks/gates/release-ready.mjs)、[release.mjs](../../tools/release.mjs)、[runbook](../../docs/guides/release-runbook.md)；`pnpm release` 的 bump/prepare/verify/check 已实跑。
- 0.3.4 tarball 272 条目、sha256 `41a20619b7f8fe0b828eb0108ecb0d90a1490d6c4b8e1a74a784792ea5217e1f`；手册 0.3.4；`_dist/release-manifest.json` 记录 gitSha/各级检查。
- 0.3.6 补齐：真 vendor `present` → session event → catalog 的 [present-catalog-smoke](../../checks/smoke/present-catalog-smoke.mjs)（并修 `/var`→`/private/var` symlink 匹配 bug）；host cwd guard；lifecycle 单字节篡改拒绝；standalone 缺 pnpm doctor 负例；T4/T6 断言 + T8 runbook。0.3.6 tarball 272 条目、sha256 `b734e9c6fc0c3a047ae9c0a7ab2664fe1b4c13b54da3d1bcee845ecf7f37785a`。

红/绿：
- 红：临时把 `全员 50 人` 写回 CFO persona → `FAIL tests/presets > preset 定义不携带公司数据`；还原 → 绿。
- 红：从 `files` 删 `icon.svg` → `FAIL pack-meta: files 缺 icon.svg`；还原 → 绿。
- 红：删 `CHANGELOG.md` 的 `## 0.3.3` 段 → `FAIL release-ready: 顶部条目是 0.3.2`；还原 → 绿。
- 绿：`pnpm verify` ALL PASS（47 gates）；`pnpm test` 91 files / 858 tests；`preset-smoke` ALL PASS。
- 绿：`pnpm release --prepare`、`pnpm release --verify`（release/lifecycle/standalone/client-load/preset 全 pass）、`pnpm release --check` → `READY 0.3.4`，0.3.6 再跑 `READY 0.3.6`。

未验 / 边界：真实多 DSH 版本安装矩阵（T6 只验窗口语义 + 坏 engines 真装拒绝）、真两会话并发/secret 日志（当前只有两盘隔离 + tracked-secrets/security-scan）、真实仓库搬迁（当前只有外部 workspace 保留 + doctor 负例）；npm/market/预构建/Windows/容器仍排除。`agent.cordis.yml` 文件名保留（显式 bundle patch，不是旧目录扫描）；Config schema 保留为显式例外。

## 实施顺序

1. P0：本 RFC + FAQ 登记 + 决定落卡。
2. P1：preset 去公司数据 + keyless 断言 + README 六节 + locale/icon。
3. P2：compat 迁移、数据/发布门禁、测试补强。
4. P3：release runbook / changelog / release.mjs / manifest / gate。
5. P4：0.3.4 发布验收。
