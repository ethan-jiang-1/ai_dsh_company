# 2026-11-01 · 插件即产品 v3：DSH-native 入口、`.dsh-company/` run bundle 与内容分家

状态：已交付（2026-11-01；用户授权「需要我review的, 授权给你 记得 做对最重要, 不需要兼容考虑, 安装需要尊重dsh」）

> 上游 = [插件即产品 v3 卡](../../_backlog/_archive/settled_issues/2026-11-01-plugin-as-product-v3.md)（已结，0.7.0 复核）、
> 研究题 [plugin-as-product-v3](../../_backlog/_archive/research/plugin-as-product-v3/README.md)（边界稿 + 失败复盘）。
> 取代 = [v2 manifest Note](./2026-11-01-plugin-as-product-v2-manifest.md) 的入口/workspace/内容边界三条、
> [run-bundle-install-unit](./2026-10-24-run-bundle-install-unit.md) 的 run bundle 物理单元位置（v3 收进 `.dsh-company/`）、
> [standalone-deployment](../archived/2026-10-25-standalone-deployment.md) 的独立启动器形状。
> 不改 = 方法层/账本留 host（D25/M2）、五角色内容、vendor pin。

## 决定

1. **产品单位 = bundle，不是 launcher。** 删除 packages/company-pack/bin/dsh-company.mjs（0.6.0 已删除）、`package.json`
   的 `bin`、`files` 的 `bin/**` 与 `workspace/**`；产品入口 = `dsh --profile company`。默认安装 =
   DSH **Plugins** 页（web/Desktop 同一句）；CLI `dsh plugin --profile company add <tgz>` 仅 `dsh web` 自动化。
2. **workspace 是启动输入，不是 home 绑定。** 优先级 = `DSH_COMPANY_HOME` → 启动 cwd（合理项目目录）→
   `<DSH_HOME>/company/settings.json` 最近选择（便利）→ DSH Workspace picker/产品 onboarding。没有
   `--workspace` flag、没有 TTY 询问；Host boot 不等用户。一个安装 = 一个公司，可顺序服务多个 workspace；
   不同公司 = 不同 home；并发多 workspace 后置。
3. **插件内容与 run bundle 分家。** 只读内容（手册/模板/默认章程/状态默认值）住 pack `content/`；
   run bundle 全部收进 `<workspace>/.dsh-company/`（`kb/`、`deliverables/`、`deliverables-archive/`、
   `cultivation/`、`logs/`、`exports/`、`overrides/`、`bundle.json` v3）。workspace 根不再出现
   `AGENTS.md`/`COMPANY.md`/`templates/`/`kb/`/`deliverables/`/`cultivation/`。
4. **手册注入用 system prompt section。** host 在 `agent/created` 时把 `content/AGENTS.md` 注册成
   `company:handbook` section（agent 作用域；`interpolate: false`）；不再依赖 `agent-instructions`
   的同目录候选，也不复制到 workspace。用户项目自己的 `AGENTS.md`/`CLAUDE.md` 仍按项目规则加载。
5. **startup/登记在 bundle 行里。** `company-client` 行 `inject` 增加 `workspaceRegistry`，`apply` 改为
   async，登记 `workspaceRegistry.create(workspace)` 在 Web readiness 前完成；不再写 profile patch，
   不再有 `register-workspace` 子路径。默认安装路径因此自带行为。
6. **身份 v3。** `bundle.json` 只记 `v/id/createdAt/pack/runBundle.schema`；不再有 `handbookTarget`
   或内容骨架哈希。v2 身份原地升 v3（保留 id/createdAt，旧文件 `bundle.v2.json`）；0.5.0 根目录布局
   **不自动迁移**，旧文件原样保留。
7. **presented 账本按 workspace 分区。** 新 domain `company_run_bundle_ledger` v1（`ledgers` 表按
   workspace hash key），storageDomain 缺席/失败回退 `<DSH_HOME>/company/ledger/<hash>.json`；仍不在
   workspace。旧 `company_deliverables` domain / workspace `kb/deliverables-presented.json` 不读不迁。
8. **dev 形状收口。** `pnpm bundle:init` 只建 `company-workspace/.dsh-company/` 状态（不复制内容）；
   `pnpm company` 是 repo-only wrapper（不写 profile patch/不问 workspace；2026-11-02 起默认
   pack + `plugin add file:`，见 [parity Note](./2026-11-02-dev-product-path-parity.md)）；删除 `pnpm standalone`。

## 输掉的方案

- **保留薄 launcher**：仍是第二入口/profile 写者，应用内安装不触发；否。
- **一 home 一 workspace**（0.5.0）：用限制产品范围回避账本分区；否。
- **把手册/模板复制到 workspace**：把只读内容变成 run bundle 副本，长出 consent/哈希升级/manifest v2；
  否。
- **profile patch registrar**：默认应用内安装不会写 profile patch；否。
- **全嵌套之外的“根目录 + .dsh-company 混合”**：仍污染用户项目；v3 直接全收 `.dsh-company/`。

## 验证（实跑）

- `pnpm typecheck`：通过（pack 两面 tsc -b）。
- `pnpm test`：121 个 spec、1022 pass / 3 skipped（domain 可选档）。
- `pnpm verify`：ALL PASS（含 dist-manual 0.6.0 + content + 无 bin/workspace、base-clean v3、
  company-skeleton v3、handbook-budget content）。
- `node checks/smoke/company-entry-smoke.mjs`：ALL PASS（干净 home + 真 tarball → roster → 直接
  `dsh --profile company` → v3 身份/`.dsh-company/kb`/根零产品文件/登记 → 同 home 第二 workspace 可起）。
- `node checks/smoke/release-smoke.mjs`：ALL PASS（plain Node built CLI → npm pack → 干净 profile 真安装 →
  RPC → 首启落盘/二启零变更）。
- `node checks/smoke/client-load-smoke.mjs`：ALL PASS（真浏览器零挂载失败 + 品牌槽）。
- `node checks/smoke/preset-smoke.mjs`：ALL PASS（五角色 + researcher 可挂载；排练场 v3 镜像）。
- `node checks/smoke/present-catalog-smoke.mjs`：ALL PASS（present 事件 → `.dsh-company/kb` catalog +
  host-only 账本；workspace 不写旧 W 账本）。
- `node tools/release.mjs --verify`：全绿（verify/test/release-smoke/client-load/preset/present-catalog）。
- `_dist/dsh-company-pack-0.6.0.tgz` + 安装手册：`node tools/export-dist.mjs` 生成；sha256 与 manifest 一致。

**红→绿证据（改造现场）**：
- `company-entry-smoke` 首版 workspace 登记偶发失败（banner 已出、登记未完成）→ 把 `apply` 改 async 并
  await `workspaceRegistry.create`，static `inject` 等待服务；重跑 ALL PASS。
- `foundation-safety` 的排练场旧断言（`kb/`、`workspace/AGENTS.md`）在 `.dsh-company/` 改造后红；重写
  mirror 为 v3 状态镜像 → 绿。
- `catalog`/`presented-domain`/`preset` 等 28 个 spec 在路径切换后红；按 `.dsh-company/`/新 store 更新 → 绿。
- `dist-manual` 在旧手册含 `--workspace`/`--profile desktop` 时红；模板去掉旧字面量并重导 → 绿。
- `company-skeleton`/`base-clean`/`security-scan` 在旧 `workspace/` 源上红；迁 `content/` 并重写门禁 → 绿。

## 0.7.0 复核（2026-11-02）

v3 的边界没有被 0.7.0 生命周期轮改动；本轮补了真模型与认证档证据，并把两处验收口径写实：

- **真模型 handbook 注入（T）**：dev home 的 `web` profile（0.7.0 源码 link）建 ceo 会话，问「引用系统
  指令里 `公司手册` 标题后的第一句」；模型原话 `本文件是公司级共识，由 host 在每个成员 agent 创建时注入
  system prompt。` + `HANDBOOK-OK`（`session-686d4c44-a6dc-4312-901f-6f52791611ba`）。证明 section 真到达模型，
  不是只注册在 host。
- **认证档（T）**：`company-entry-smoke`、`external-workspace-smoke`、`isolation-matrix-smoke` 均 ALL PASS
  （v3 布局/身份断言已从 v2 更新为 v3）；`release --verify` 六项全绿；`release --check` READY 0.7.0。
- **首屏口径**：首屏 = DSH 原生 Workspace picker；本包不自建 onboarding（见下「已知边界」）。README/手册/
  profile/runtime-map 原写「产品 onboarding / 本包 client 回答」，已改为「DSH Workspace picker（本包不自建
  onboarding）」。
- **迁移口径**：0.5 根目录不自动迁移（0.5/0.6 未发布，无外部用户；旧文件保留/手册手工搬）。v3 卡 D4 的
  「移未改副本」收窄为不自动迁移。
- **与生命周期卡不冲突**：D53（会话检索改 isolated 组）只换实现；D54（MIT/npm 身份）只换发布姿态；
  v3 的 bundle 入口、workspace 解析、内容/run bundle 分家、账本分区均未改。

## 已知边界 / 未做

- **0.5.0 → 0.6.0 不迁移**：旧根目录骨架/旧 manifest/旧账本原样保留；新 workspace 重新开始，或按手册手工搬。
- **无 workspace 首屏**：当前依赖 DSH Workspace picker（native/browse）+ Host 不阻塞；没有本包自建
  onboarding UI。文档说明从项目目录启动或设 `DSH_COMPANY_HOME`。
- **Desktop**：安装句与 client 组合矩阵覆盖；本机无 Desktop 壳，不冒充真机验证。
- **并发多 workspace**：顺序支持；并发/多 active 后置。
- **旧 standalone/生命周期 smoke**：随旧形状删除；生命周期由 release-smoke 二次 boot + 安装手册覆盖。

## 指针

- 研究/复盘：[plugin-as-product-v3](../../_backlog/_archive/research/plugin-as-product-v3/README.md)。
- 卡：[插件即产品 v3](../../_backlog/_archive/settled_issues/2026-11-01-plugin-as-product-v3.md)（已结）。
- 合同：[profile](../../docs/profile.md)、[runtime-map](../../docs/runtime-map.md)、[data-model](../../docs/data-model.md)、
  [release](../../docs/release.md)、[`_dist` 手册](../../_dist/安装手册.md)。
- 代码：`src/host/bootstrap.ts`、`workspace-resolution.ts`、`handbook.ts`、`run-bundle.ts`、
  `presented-domain.ts`、`src/index.ts`；`content/`；`tests/company/{bootstrap,bundle-manifest,handbook,presented-domain}.spec.ts`。
