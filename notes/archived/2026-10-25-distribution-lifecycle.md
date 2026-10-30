# RFC：distribution-lifecycle（分发契约与安装生命周期）

状态：已消化（2026-10-25 实施；批准：用户 2026-10-25；goal 授权按 2026-10-25 收尾计划自主推进）

> **体裁说明（2026-10-30）**：本文是 2026-10-25 RFC 的毕业正文；§问题/§当前事实/§方案/§实施顺序 是**当时快照**，
> 其中“无 engines/license/repository”“peers 才是安装拦截”“手册无 sha256/回退”均已不成立。
> 现行合同 = [release](../../docs/release.md) + [data-model](../../docs/data-model.md)；决定（engines 窗口/手册 sha/生命周期证据）仍有效。

## 问题

陌生人拿到 `_dist` 的 tgz + 手册时，无法回答“要哪个 DSH/Node、怎么核对字节、装错怎么退”；手册承诺的升级/卸载/迁移也没有真安装证据。对应问题卡：[分发契约](../../_backlog/_archive/settled_issues/2026-10-25-distribution-contract.md) 与 [安装生命周期证据](../../_backlog/_archive/settled_issues/2026-10-25-install-lifecycle-evidence.md)。

## 当前事实

- 包声明 [package.json](../../packages/company-pack/package.json) 有 `private: true`，无 `engines`、`license`、`repository`；DSH 运行时不读 `dsh.compatibility.dshReleases`，真正拦安装的是 peers。
- 手册 [_dist/安装手册.md](../../_dist/安装手册.md) 由 [tools/export-dist.mjs](../../tools/export-dist.mjs) 生成，没有 sha256/前置/回退。
- [release-smoke.mjs](../../checks/smoke/release-smoke.mjs) 只覆盖首启/二启；升级只有 [bundle-manifest.spec.ts](../../tests/company/bundle-manifest.spec.ts) 的单测。
- 门禁 [pack-shape.mjs](../../checks/gates/pack-shape.mjs) 只查 patch 与台账；[dist-manual.mjs](../../checks/gates/dist-manual.mjs) 只查版本/keywords/pin。

## 方案

### 1. 契约（manifest + 手册）

- manifest 增加：`engines.node >=22.19.0`、`engines.dsh >=0.2.1-rc.2 <0.3.0`、`license: UNLICENSED`（内部交付；发布时再定）、`repository`（monorepo + directory）。`private: true` 保留到 publish。
- `dsh.compatibility.dshReleases` 曾是“已认证 tag 台账”；2026-10-26 按 FAQ 24 §9.2 已迁到 [checks/gates/lib/compat-tags.json](../../checks/gates/lib/compat-tags.json) 并从 package manifest 移除。`engines.dsh` 是唯一运行时窗口；门禁只强制当前 pin 在台账内且在 engines 窗口内。
- 手册生成器：算 tgz sha256，写同目录 `*.tgz.sha256`，把 hash、Node/DSH 前置、获取方式、校验命令、安装失败/卸载/回退、许可与支持窗口注入手册。
- 包内 README 顶部加“给收件人”的 5 行入口（版本/前置/手册位置/许可），维护者 owner 表留在下面。

### 2. 生命周期证据

- 新增 keyless 冒烟 checks/smoke/lifecycle-smoke.mjs（可复用 release-smoke 的启动/清理设施）：
  1. 用当前 pack 打 v1 tarball；装进干净 home；启动一次后停。
  2. 改 `AGENTS.md` + `kb/org.md`；加 `kb/ceo/journal/` 与 `deliverables/<date>-<slug>/final.md` + `meta.md`。
  3. 复制 pack 到 `runtime` 临时区，bump 版本、改一个未改过的骨架文件（`templates/weekly-report.md`），打 v2 tarball；`plugin remove` + `add v2`；启动。
  4. 断言：v2 骨架文件被替换；两个改过的文件保留；journal/交付物逐字节不变；`bundle.json` 的 pack/skeleton 版本前移；二启零变更。
  5. `plugin remove`：profile 无该 bundle，home/workspace 数据仍在；再装可恢复。
  6. 迁移：把 home 目录整体改名/搬到新路径，按手册的迁移步骤启动；断言 `bundle.json.workspace` 可解析、workspace/sessions 可见。若 pnpm `node_modules` 不可直接搬，手册写成“搬 home 后重装 profile 包”，冒烟按该步骤验。
- 失败面：v2 安装/启动失败时不静默半套；至少断言 `bundle.json` 不领先于实际骨架，下一次启动可重跑。

## 输掉的方案

- 只做单测：不满足“真安装”的证明边界。
- 只扩 release-smoke：脚本会过长且首启/升级职责混杂；拆独立 smoke，共享 lib。
- 直接把 `engines.dsh` 写成精确版本：每个 DSH patch 都要发版；与 DSH 生态的 range 用法冲突。

## 验收

命令（全部实跑，红→绿收据进 Note）：

```sh
pnpm verify
pnpm test
node checks/smoke/release-smoke.mjs
node checks/smoke/lifecycle-smoke.mjs
```

断言：

- `pack-shape`：manifest 有 `engines.node` / `engines.dsh` / `license` / `repository`；当前 pin 在台账且在 engines 窗口内。
- `dist-manual`：手册含 sha256、Node/DSH 前置、校验、卸载/回退；sha256 与 tgz 本体一致；缺一项即红。
- 不兼容安装：临时复制 pack，把 `engines.dsh` 改成 `>=99.0.0`，打包后 `plugin add` 必须非零并报 `incompatible-version`；未改的包必须安装成功。
- `lifecycle-smoke`：升级保留/替换/扩张不动、卸载数据仍在、迁移可启动；负例（改过的基部被覆盖）必须红。
- 红样：先加门禁断言、不补 manifest/手册 → `pnpm verify` 红；补齐后绿。

## 范围 / 排除

- 范围：manifest、手册生成器、`pack-shape` / `dist-manual`、`release-smoke` 复用、新 lifecycle smoke、`docs/release.md`。
- 排除：npm publish、market、代码签名、离线预构建、跨 OS 升级、降级。

## 实施顺序

1. manifest + 门禁（红）→ 补 manifest（绿）。
2. export-dist sha256 + 手册内容（红→绿）。
3. lifecycle smoke（先写失败断言，再实现支撑）。
4. 同 diff 更新 release.md / 手册 / Note；跑全量证据。

## 实施与证据（2026-10-25）

已落树：

- manifest：`engines.node >=22.19.0`、`engines.dsh >=0.2.1-rc.2 <0.3.0`、`license: UNLICENSED`、`repository`；`private: true` 保留。`pack-shape` 新增 `pack-engines`（semver 从 vendor app-boot 解析；窗口不覆盖当前 pin 即红）。
- 手册生成器 [tools/export-dist.mjs](../../tools/export-dist.mjs)：算 tgz sha256、写 `*.tgz.sha256`、注入前置/校验/卸载/失败与回退/许可；[dist-manual](../../checks/gates/dist-manual.mjs) 在本体在场时逐字节核对。
- [lifecycle-smoke.mjs](../../checks/smoke/lifecycle-smoke.mjs)：v1 真装 → 改 `AGENTS.md`/`kb/org.md` + 加 journal/交付物 → v2 真装 → 启动；断言保留/替换/扩张不动/`bundle.json` 前移/二启零变更；卸载后数据仍在；搬 home 后重装启动。另含“bad engines.dsh 真装被拒绝”与 profile 未被污染。
- 合同：[docs/release.md](../../docs/release.md) 写明 engines 是运行时窗口、台账是认证记录、sha256 是产物身份；[checks/README.md](../../checks/README.md) 登记新 smoke；pack README 顶部给收件人入口。

红/绿收据（实跑）：

- 红：只加 `pack-engines` 断言、未补 manifest → `FAIL pack-engines: engines.node 缺失；engines.dsh 缺失；license 缺失；repository 缺失`；补 manifest 后 `PASS pack-engines`。
- 红：只加 `dist-manual` 断言、未重导手册 → `FAIL dist-manual: … 缺 sha256 / 回退 …`；`node tools/export-dist.mjs` 后 `PASS dist-manual（… sha256 …）`。
- 绿：`pnpm verify` → `ALL PASS`（含 `pack-engines`、`dist-manual`、`script-index ×90`）。
- 绿：`node checks/smoke/release-smoke.mjs` → `ALL PASS`（真 tarball 安装、五角色 + researcher 零 broken、首启骨架 + `bundle.json`、二启零变更）。
- 绿：`node checks/smoke/lifecycle-smoke.mjs` → `ALL PASS`（含 `不兼容 DSH 真拒绝`、`改过的 AGENTS.md 保留`、`未改过的模板随 v2 替换`、`扩张面逐字节不变`、`卸载后数据仍在`、`迁移后 boot 成功`）。
- 绿：`node tools/export-dist.mjs` → `ALL PASS`（0.3.1 当时 `sha256 — a89f0ee5…`、260 entries；0.3.2 重导 `3c33dcd…`/269，0.3.3 审查重导见收尾回执）。

环境前提（不是产品 diff）：本机 vendor 的 host/client 产物不完整时，首启会报 `client bundles not found` / `ERR_MODULE_NOT_FOUND`；本次按 bootstrap 重建了 vendor host（`tsdown --env.DSH_BUILD_FACE host`）与 `client/ui-tool` 的 client bundle。产物在 vendor 的 ignore 面，不产生 tracked 改动。

审查加固（2026-10-25，同轮补）：`writeUpgradedManifest` 改为临时文件 + rename（原子替换）；`readBundleManifestState` 区分 missing/corrupt，host 对损坏的 `bundle.json` 保留原文件并 warn（不再把损坏当首启静默跳过）；升级追加 `<DSH_HOME>/logs/company-pack-upgrade.log` 点名保留清单；lifecycle-smoke 改为轮询落盘（去固定 sleep）、fingerprint 用 sha256 内容哈希、增加 CHARTER 历史保留与升级日志断言；release-smoke 的指纹也改用内容哈希。

未验证面：断电/半截写入的故障注入（有 corrupt 单测与 host 告警，但没做真实 kill 注入）；registry/npm 安装、降级、并发升级、跨 OS；真实 npm 版 DSH 的安装（本轮用 built CLI）。
