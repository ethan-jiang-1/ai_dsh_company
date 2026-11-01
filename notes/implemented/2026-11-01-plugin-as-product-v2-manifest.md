# 2026-11-01 · 插件即产品：独立 company profile、workspace 自持身份（manifest v2）与 boot 登记

状态：已交付（2026-11-01；用户当轮授权——「我们这个项目其实是要 Develop plug in as a product …… 先给出 plan …
利用 backlog 结构把事情打磨好」，先出研究与卡、再落第一批切片）

> 上游 = [_backlog/issues/2026-11-01-plugin-as-product.md](../../_backlog/_archive/settled_issues/2026-11-01-plugin-as-product.md)
> （已结；Q1–Q7 已按用户授权落地）、
> [落地顺序卡](../../_backlog/_archive/settled_issues/2026-11-01-landing-plan.md)（P0–P6）、
> 研究题 [plugin-as-product](../../_backlog/_archive/research/plugin-as-product/README.md)（4 份材料）。
> 取代 = [run-bundle-install-unit](./2026-10-24-run-bundle-install-unit.md) 的 §决定 1/2/5（身份落点与
> manifest 形状）与 [multi-profile-contract](./2026-10-26-multi-profile-contract.md) 的「产品入口 = 通用 `web`」
> 一条；manifests v1 的 home 形状仍作为迁移来源保留。

## 决定

1. **产品入口 = 独立 `company` profile**：`dsh-company` 启动器（`packages/company-pack/bin/dsh-company.mjs`，
   pack `bin` 字段 → 安装后落在 profile 的 `node_modules/.bin`）与 repo 形态转发器
   （`tools/company.mjs` → `pnpm company`）。形状 = 解析/询问 workspace → 建/验 profile → 装/修 pack →
   写 seed consent → 设 `DSH_HOME`/`DSH_COMPANY_HOME` → spawn `dsh --profile company`。
2. **workspace 必须显式**：取消默认 `<DSH_HOME>/company-workspace`。来源顺序 = `--workspace` /
   `DSH_COMPANY_HOME` / 最近一次 / TTY 询问；无值且非交互 ⇒ 退出码 2 + 两条可执行命令。`--print` 只打印解析结果。
3. **身份与业务产物跟盘走**：`bundle.json` 移到 `<workspace>/.dsh-company/bundle.json`，
   **v2** 去掉 `workspace` 字段、新增 `handbookTarget`；基部升级日志住
   `<workspace>/.dsh-company/logs/company-pack-upgrade.log`；home 只留 DSH 运行时 + host 治理
   （sessions / 凭据 / workspace 登记 / lease / 方法层 / 审计账本）**和一份身份备份**
   （`<DSH_HOME>/company/identity/<id>.json`）。方法层/账本**不搬**进模型可写区（守 D25/M2）。
4. **seed 要同意**：新 workspace 只有 `.dsh-company/.seed-consent`（v1；记录 workspace + pack 版本）匹配、
   或盘上已有公司标记时才补骨架/写身份；无同意只告警、零写。`DSH_COMPANY_BOOTSTRAP=if-missing` 显式放行。
5. **手册碰撞感知**：骨架源仍只有一个 `AGENTS.md`；目标被占用时写 `COMPANY.md`
   （`HANDBOOK_SOURCE` / `HANDBOOK_FALLBACK` + `chooseHandbookTarget`），角色 `agent-instructions`
   候选同步 `['AGENTS.md', 'COMPANY.md', 'CLAUDE.md']`。
6. **boot 登记走独立 host row**：`register-workspace` 子路径导出（`exports` + tsdown entry + `files`）+
   `inject: ['workspaceRegistry']` + async apply，在 Web readiness 前把 `DSH_COMPANY_HOME` 登记进 DSH Workspace。
   只登记，不建目录、不 seed、不授权；失败只 warn。
7. **`DSH_COMPANY_REBIND` 退役**：设置时只告警+点名新做法，不执行旧改盘逻辑。
8. **启动器安全边界**：只在 profile 缺失时 `--from-default-profile web`（已存在只验证，不 reset）；
   不猜 workspace；不静默建目录（`--yes` 才建）；`--reset` 只删带 `.company-home` 标记的 home，不动 workspace。

## 输掉的方案

| 方案 | 为什么不选 |
|---|---|
| boot 仍在主 `company-client` apply 里用 `ctx.inject` 登记 workspace | Client 可能在登记前请求 workspace 列表；2026-11-01 探针证明独立 row 的 async apply 稳定早于 `dsh web:` readiness |
| 方法层/审计账本一起搬进 workspace | 会把 governance 状态放进模型可写区，反转 D25/M2 的保护；业务产物进盘、治理留 home + 只读导出 |
| 手册全量改名 `COMPANY.md` | 对已有项目是不必要的 churn；只做「AGENTS.md 被占时回退」 |
| 一安装多 workspace（Client 里切换器 + per-workspace 治理） | 当前公司/lease/选中态/方法作用域全复杂化；v1 定“一安装一 workspace”，多盘留后续 |
| 保留默认 `<DSH_HOME>/company-workspace` 作为兜底 | 正是要拆的东西：盘在心里就永远猜；没有 workspace 就应停写并点名原因 |
| profile 已存在时 `--from-default-profile` 修一遍 | 会静默重置用户 profile；启动器只建缺失 |

## 实现与落点

- `packages/company-pack/bin/dsh-company.mjs`（唯一启动器实现）+ `tools/company.mjs`（repo 形态转发，`pnpm company`）。
- `packages/company-pack/src/host/bootstrap.ts`：`planBootstrap` / `applyBootstrap` / `seedAllowed` /
  `validateCompanyHome` / `chooseHandbookTarget` / consent 读写。
- `packages/company-pack/src/host/bundle-manifest.ts`：`BUNDLE_MANIFEST_VERSION = 2`、`bundleManifestPath(workspace)`、
  `identityBackupPath`、`migrateLegacyManifest`、`planBundleManifest({ handbookTarget })`。
- `packages/company-pack/src/host/runtime-guard.ts`：`prepareCompanyRuntime` 返回 `CompanyRuntime`
  （`dshHome` / `companyHome` / `dataBlocked` / `bundleState` / `handbookTarget` / `hasWorkspace`），
  lease 失败与坏 manifest 走 `dataBlocked` 停写。
- `packages/company-pack/src/host/register-workspace.ts`（新）：boot 登记 row；**不放进 pack bundle**（会被
  Client 组合加载），由启动器写进 profile 的 `cordis.patch.yml`（`company-workspace-register`）。
- `presets/*/agent.cordis.yml`：`instructionFileCandidates` 五角色同加。
- 门禁/索引：`checks/README.md` 增 `pnpm company` 入口行；`tools/company.mjs` 补「状态：常驻」头注。

## 验证（真跑过的命令与形态）

| 检查 | 结果 |
|---|---|
| `pnpm verify` | 结构面全绿（含 dist-manual/dist-freshness/script-index） |
| `pnpm test` | 123 files / 1051 tests 全绿（含 bootstrap/bundle-manifest/seed-handbook/register-workspace/governance-export/apply-rebind） |
| `release-smoke` | ALL PASS（真 tarball + company profile + 外部 workspace + 登记 + v2 + 二启稳定） |
| `lifecycle-smoke` | ALL PASS（v1 真装 → 改基部 → v2 → 启动 → 降级 → 卸载 → business 恢复 → 搬 home） |
| `external-workspace-smoke` / `isolation-matrix-smoke` / `multi-install-smoke` / `company-entry-smoke` | ALL PASS |
| `client-load-smoke` | ALL PASS（真浏览器零挂载失败/品牌） |
| `release --verify` | ALL PASS（构建 → tarball → 真装 → roster/RPC → preset/present/standalone） |
| `interrupted-install-smoke` | ALL PASS（坏 tarball/缺文件/坏 profile 后数据不丢、re-add 恢复） |
| `upgrade-while-running-smoke` | ALL PASS（旧实例运行中 remove/add 0.5.1，旧 session/数据在，重启前移） |
| `handbook-smoke --cwd <temp with COMPANY.md>` | ALL PASS（`COMPANY.md` 注入，不混开发仓库 AGENTS） |
| 真实旧 home v1 迁移演练 | PASS（v2 id/createdAt 保留；旧文件 `.migrated-*`） |
| `tests/company/untrusted-project.spec.ts` | 5/5 PASS（恶意 AGENTS 不覆盖、symlink 不写穿、伪造 consent/危险落点拒绝） |

**红证（本 Note 覆盖的机械面）**
- `script-index`：`tools/company.mjs` 未进 `checks/README.md` ⇒
  `FAIL script-index: 未入索引的公开入口：tools/company.mjs`；补索引行后
  `PASS script-index ×108`。
- `script-status`：`tools/company.mjs` 缺状态头注 ⇒ `FAIL script-status: … 缺 = tools/company.mjs`；补
  `// 状态：常驻` 后 `PASS script-status ×163`。
- `release-ready`：pack 版本 0.5.0 而 CHANGELOG 顶部仍 0.4.6 ⇒ `FAIL release-ready: CHANGELOG.md:5 顶部条目是 0.4.6`；
  补 0.5.0 条目后 `PASS release-ready（0.5.0；条目 2026-11-01）`。

## 新门禁红→还原→绿（原话）

- `dist-manual`：把手册唯一合同句 `一次安装 = 一个 DSH home` 改成 `多个` → `FAIL dist-manual: 手册缺「一次安装 = 一个 home + 一个用户 workspace」合同`；还原 → `verify: ALL PASS`。
- `doc-budget`：`docs/data-model.md` 临时加 2 行 → `FAIL doc-budget: docs/data-model.md 78 行超上限 76`；还原 → `verify: ALL PASS`。
- `script-index`：从 `checks/README.md` 删掉 `company-entry-smoke` 行 → `FAIL script-index: 未入索引的公开入口：checks/smoke/company-entry-smoke.mjs`；还原 → `verify: ALL PASS`。
- `tracked-portability`（push 前实际红）：研究稿 `$T/home` 命中 `/home/<name>/` 绝对路径规则 → `FAIL tracked-portability`；改 `$T/h` → 全绿。
- `dist-freshness`（重导前实际红）：手册/tarball sha 与 manifest 不同代 → `FAIL dist-freshness`；`release --prepare --force` → 全绿。

## v1 明确边界（已与卡上结论对齐）

- **`_dist` 已重导**（0.5.0；sha/手册/manifest 同步）；`dist-manual`/`dist-freshness` 绿。
- **README / docs 合同已换形状**（根 README、pack/workspace README、profile/runtime-map/data-model/release/
  project-map/decisions/external-research/demo/bootstrap/environments 等）；`doc-budget` 在预算内。
- **v1 → v2 迁移**：keyless spec + **真实旧 home 演练 T**（id/createdAt 保留、旧文件 `.migrated-*`）。
- **Web onboarding** 不做（终端启动器询问/`--workspace` 为 v1 主路径）。
- **Windows / 容器 / registry** 不验证/不启用；**不可信项目**不承诺消除 prompt injection，只做边界测试。
- 四张产品化卡 + 发布/文档卡已结归档；研究题随迁 `_backlog/_archive/research/plugin-as-product/`。
