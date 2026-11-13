# 2026-11-02 · FAQ 26 Harness 发行版对齐：术语、发布证据链与 current docs 清理

状态：已交付（2026-11-02；0.7.1 发布字节与验证证据见下）
上游：[FAQ 26 Harness 发行版对齐卡](../../_backlog/_archive/settled_issues/2026-11-02-harness-release-alignment.md)
外部规范：`_faq_on_digested/26_harness-release`（研究材料，不是 DSH 合同；DSH 合同仍以 `vendor/dsh` 钉住 tag 为准）

## 决定

1. **读者面统一为 Harness 发行版框架**：`Harness 发行版 / 发行方 / 交付形态 / 公司状态（company state）/
   run trace`；`bundle` 只指 DSH 可安装发布单位，`pack` 只作 `dsh-company-pack` 简称；不再用
   「插件即产品 / 产品形状 / 产品安装 / 产品入口 / 产品 home / 产品文件 / 产品承诺」。
2. **代码/持久名 docs-first 保留**：用户选 `bundle.json`、`RUN_BUNDLE_*`、`bundle:init`、storage domain
   本轮不改；只在术语表与代码头注标 legacy。整体 v4 迁移留下一 minor。
3. **发布字节证据链机械化**：`_dist` tarball 就是认证档安装的字节；`release-smoke` 增加
   `--tarball/--expect-sha`；`release --verify` 传 `_dist` 并加 `company-entry-smoke`；`release --check/--stamp`
   增加 `sourceFingerprint`，源变而产物未重打时拒绝；`publish-handoff` 改为 `npm publish _dist/...tgz`。
4. **profile 初始化走官方路径**：干净 profile 用 `--from-default-profile web`；一次性 profile 用 `hmr`
   row 的 `disabled: true`；删除对已不存在 `patchReload` 的正向教学；恢复先建模板再 `plugin add`；
   不再教手写 `dsh.profile.bundles`。
5. **前置/元数据按面写**：Desktop 自带 Node/pnpm；npm CLI / `dsh web` 的 Plugins 页需 pnpm 在 PATH；
   包 README 加 `description`/`kind`、升级/排障；browser 两包标 `peerDependenciesMeta.optional`；
   `engines.node` 对齐 DSH；应用内安装接受 `applied` 或 `restart-required`。
6. **版本 0.7.1**：0.7.0 的 `_dist` 已实证早于 HEAD，不发布；0.7.1 重新 prepare/verify/check。

## 输掉的方案

- **继续「插件即产品」**：FAQ 26 明确讲不通；会把 bundle 当产品、把启动入口当产品资产。否决。
- **本轮整体改代码名 + `bundle.json` v4**：用户选 docs-first；持久数据迁移面大，先拉读者面信噪比。推迟。
- **保留 `patchReload`**：当前 vendor 代码零命中（删除 commit `abd765a600`，2026-09-15）；继续写就是教错排障。否决。
- **`npm publish` 从包目录发布**：会重新 `npm pack`，发布字节不再是 `_dist` 认证字节。否决。
- **只修 `--check` 文档、不换认证档 tarball**：仍会假绿；必须让认证档装 `_dist` 同一份。否决。
- **0.7.0 `--force` 重打**：`_dist` 内容已变（缺 HEAD 两行 `disabled: true`）；0.7.0 视为过期，改 0.7.1。
- **改 CHANGELOG / 归档 / 历史 decisions**：历史层不动；只清 current docs，D45/D48/D51/D52 保留历史行，新增 D55 路由。

## 后果

- 读者面只有一个「公司状态」概念；`bundle` 不再与 `bundle.json`/`run bundle` 混用。代码/持久名仍是
  legacy，**下个 minor 若做 v4 改名，需同时迁移 `bundle.json` 与 `company_run_bundle_ledger` domain**。
- 发布认证不再接受“源已变但 `_dist` 没重打”的树；`--check`/`--stamp` 会拒绝，必须重跑 `--prepare`。
- `release-smoke` 的默认无参模式仍可现场 build+pack（开发者手动调试）；`release --verify` 走 `_dist`。
- 历史层（CHANGELOG、`_backlog/_archive`、`notes/archived`、D45/D48/D51/D52）不改写；新 Note 单侧承载
  术语与证据链对齐，不宣称取代 v3 的入口/数据边界。

## 验证（真跑）

| # | 命令 | 结果 |
|---|---|---|
| 1 | `node tools/release.mjs --prepare --force` | `export-dist: ALL PASS`；0.7.1 tarball sha256 `bd77facf6ea1b86fbccb348ac4fffe8f5e83ec4c2ef9891d80947284079cd2de`；manifest 写 `sourceFingerprint` |
| 2 | 临时在 `packages/company-pack/cordis.patch.yml` 追加注释 → `node tools/release.mjs --check --allow-dirty` → 还原 | 红原话：`release: pack 源码面已变但 _dist 没重打；先重跑 --prepare`；还原后 fingerprint 通过（脏树检查按预期） |
| 3 | `source run/env.sh && node checks/lanes/release.entry.mjs --tarball _dist/dsh-company-pack-0.7.1.tgz --expect-sha bd77facf…` | `release-smoke: ALL PASS`；装的是 `_dist` 同一份，未重打 |
| 4 | `source run/env.sh && node checks/lanes/company-entry.entry.mjs` | `company-entry-smoke: ALL PASS`（含同 home 第二个 workspace） |
| 5 | `source run/env.sh && node checks/lanes/multi-install.entry.mjs` | `multi-install-smoke: ALL PASS`（官方 `--from-default-profile web` 重建、无手写 roster） |
| 6 | `source run/env.sh && node checks/lanes/revoke-recovery.entry.mjs` | `revoke-recovery-smoke: ALL PASS`（v3 `.dsh-company/cultivation/` 路径） |
| 7 | `pnpm verify` | `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）`；新退役词门禁、dist-manual 前置、optional peer、doc-budget 均绿 |
| 8 | `pnpm test` | `124 passed / 3 skipped`（1042 tests；release --verify 日志） |
| 9 | `pnpm release --verify` | 最终全绿（verify/test/release-smoke/company-entry/client-load/preset/present-catalog） |
| 10 | `node tools/release.mjs --check` | 0.7.1 READY（commit + `--stamp` 后；见发布回执） |

**红证（门禁/文档）**：

- 在 `README.md` 写回 `产品形状` → `dev-product-parity` 红（`current docs 仍有退役说法`）；还原即绿。
- 从 `package.json` 删 `peerDependenciesMeta` → `pack-files` 红（两个 browser peer 必须 optional）；还原即绿。
- 从 `_dist/安装手册.md` 删除 `pnpm` → `dist-manual` 红（`手册缺安装形状/契约关键句：pnpm`）；还原/重导即绿。
- **修复前实证**：`_dist/0.7.0.tgz` sha `abef80f4…`，当前树重打 `5fe5f189…`；`_dist` 的 `cordis.patch.yml`
  缺 HEAD 的 `ui-trajectory`/`ui-sidebar-terminal` 两行，而 `release --check` 仍 READY。该假绿由
  `sourceFingerprint` + 认证档装 `_dist` 关闭。

**未验证面**：

- 真实 `npm publish`（需凭据、不可逆；只做 `--dry-run` 设计，未执行）。
- market index 的 https 托管与 Discover 实机（发布人 handoff）。
- Desktop 真机（仅 docs/vendor 源码核对）、Windows/Linux/容器。
- 完整浏览器交互（`client-load-smoke` 只证模块表/品牌/零 loader 错误）。
- `bundle.json` v4 改名与 storage domain 迁移（本轮明确不做）。

## 指针

- 读者面：`README.md`、`AGENTS.md`、`docs/index.md`、`docs/contracts/profile.md`、`docs/contracts/release.md`、
  `docs/runtime-map.md`、`docs/contracts/data-model.md`、`docs/project-map.md`、`docs/orient.md`、
  `docs/reference/external-research.md`、`docs/reference/terminology.md`、`run/README.md`、`packages/company-pack/README.md`。
- 发布链：`tools/release.mjs`、`checks/lanes/release.entry.mjs`、`docs/guides/release-runbook.md`、
  `docs/guides/publish-handoff.md`、`checks/gates/dist-manual.mjs`、`checks/gates/pack-shape.mjs`。
- 门禁：`checks/gates/dev-product-parity.mjs`（退役词 + 市场 staged + optional peer 邻接）。
- 历史：D55 路由在 `docs/reference/decisions.md`；本 Note 不取代 v3 Note 的入口/数据边界。
