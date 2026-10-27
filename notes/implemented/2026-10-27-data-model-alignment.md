# 数据模型对齐（FAQ 26）：作用域、版本、换盘、presented 账本

状态：已交付（2026-10-27；P0 收口，P1/P2 显性留在 [Gap 卡](../../_backlog/issues/2026-10-27-data-model-gaps.md)）
上游 = [DSH 数据模型（FAQ 26）审计出的部署 Gap](../../_backlog/issues/2026-10-27-data-model-gaps.md)

## 问题

对照外部研究 FAQ 26（`_faq_on_digested/26_plugin-data-model`）审计本包，发现 12 个数据模型 Gap；其中 5 个是发布后部署的 P0：培养记录按 session cwd 写、换盘只能删 manifest、备份口径混用、`presented` 混在派生索引里、`bundle.json`/catalog 没有版本与原子写。旧实现把这些事实散在 README 平面表和会话里，没有一个可追踪的问题账，也没有逐项数据卡。

## 决定

1. **公司数据只写公司盘根**：`registerCultivation` 接收 host 解析出的 `companyHome`；`companyScopeOf` 对子目录/盘外会话返回可操作错误；host 对子目录会话也告警。`cultivation/records`、成品目录、方法层命令都以盘根为准。
2. **显式换盘而不是删 manifest**：新增 `DSH_COMPANY_REBIND=1`。旧盘必须已不存在、新盘形状正确时，先原字节备份 `bundle.json`（`bundle.json.bak-*`），再原子改写 workspace、写升级日志；旧盘仍在则拒绝。默认硬阻断保留。只迁 pack 数据，不迁 DSH session 的 `header.cwd`。
3. **`presented` 拆两层**：新增 `kb/deliverables-presented.json` 审计账本（`true` 来自会话事件，`false` 是操作员结论）；`kb/deliverables-index.json` 只做派生视图。账本缺失时从旧索引迁移，`true` 可从 `ctx.sessionQuery` 回扫；账本损坏/更高 schema 保留原文件并 fail loud。present 事件先写账本再重生成索引。
4. **版本与原子写**：`bundle.json` 校验 `v`/必填字段；v 更高 → `unsupported`，保留原文件并告警，不 cast 成 v1。catalog/账本 schema 更高同样告警。首建 manifest 改为临时文件 + hard link 发布；基部升级改临时文件 + rename；目标为符号链接/目录时 `keep`，绝不覆盖。
5. **备份合同拆两档**：安装手册写 `business`（公司盘 + `bundle.json` + 方法层；不含 sessions/密钥/搜索索引）与 `full`（整 home，加密限权），补恢复与显式换盘步骤；`dist-manual` 门禁检查关键句。
6. **N1 workspace 登记**：优先 `ctx.workspaceRegistry.list()`（`ctx.inject` 等就绪），旧 `storages/workspace.json` 只做无 registry 组合的诊断保底。
7. **事实级数据卡**：新增 [docs/data-model.md](../../docs/data-model.md)，README Data 保留平面摘要并链接；FAQ 26 登记进 [docs/external-research.md](../../docs/external-research.md)。

## 输掉的方案

- **把 `bundle.json` 迁 `ctx.storageDomain`**：它要在插件加载前存在、被人读、被 smoke/手册引用；迁过去是第二权威，还会破坏现有恢复路径与“身份文件”语义。
- **把 `presented=false` 留在索引里**：false 没有事件可推导，索引同时是派生和权威；删索引就丢审计结论。独立账本才是正确家。
- **换盘仍用“删 manifest 重建”**：会丢基部逐文件哈希，之后所有基部文件都会被当“改过/占用”，永久失去升级区分能力。
- **把方法层立即迁 home 级**：改动 presets 的 `customSkillDirs` 构造与 host config，风险大于本轮收益；先立“一公司一 web profile”边界，P1 再决定。
- **继续读 `storages/workspace.json` 当主路径**：持久化层内部形状不是合同，换后端会静默失效；N1 registry 才是。

## 后果

- 旧会话仍锚旧绝对 `header.cwd`；换盘后旧会话不可续，这是 DSH 上游限制，手册已写清。
- `presented=false` 仍只能由操作员改账本；没有 UI/命令，和旧行为一致，但不再藏在派生索引里。
- 方法层仍是 profile 级；同 home 多 profile 不共享，属于 P1 未决（G7）。
- P1/P2 未开工项（record CAS、records GC、坏记录可见、companyHome 危险值、localStorage 键名、降级 smoke）如实留在 Gap 卡。

## 验证

真跑过（本机 macOS，2026-10-27）：

| 命令 | 结果 |
|---|---|
| `pnpm test` | 94 files / 880 tests 全绿（含新增 manifest v2/rebind/scope/ledger/scan specs） |
| `node tools/export-dist.mjs` | ALL PASS：0.3.11、107 条目、手册重生成 |
| `node checks/smoke/release-smoke.mjs` | ALL PASS（真 tarball 安装 → 六角色 → 首启落盘/二启零变更；presented 账本随首启落盘） |
| `node checks/smoke/lifecycle-smoke.mjs` | ALL PASS（v1→v2、改基部保留、卸载、**business 恢复**、搬 home） |
| `node checks/smoke/isolation-matrix-smoke.mjs` | ALL PASS（含 **explicit rebind** 真启动：workspace 前移/备份/日志/sentinel） |
| `node checks/smoke/present-catalog-smoke.mjs` | ALL PASS（vendor present → 事件 → 索引 + 审计账本） |
| `node checks/smoke/upgrade-while-running-smoke.mjs` | ALL PASS（当前版运行中 remove/add 下一 patch；session/data 保留） |
| `node checks/smoke/concurrent-home-smoke.mjs` | ALL PASS（同 home 两进程首启后 bundle/catalog/数据可解析；不声明多 Host 支持） |
| `pnpm verify` | ALL PASS（含 `dist-manual` 新关键句：`DSH_COMPANY_REBIND` / `deliverables-presented` / business / full） |

红证（实跑，用于证明判据不是空断言）：

- 临时把 `companyScopeOf` 的子目录分支改成直接返回 `{ root }` → `pnpm exec vitest run tests/company/cultivation.spec.ts -t "公司数据只认盘根"` 红：`expected 'success' to match { kind: 'error' }`；还原 → 绿。
- `dist-manual` 新关键句删掉后 `pnpm verify` 红：`FAIL dist-manual: 手册缺安装形状/契约关键句：DSH_COMPANY_REBIND（run bundle / bundle.json / workspace 骨架 / sha256 / Node / DSH / 卸载 / 回退）`；还原原字节 → `PASS dist-manual（版本 0.3.11 + run bundle 安装形状 + sha256 + pin dsh-v0.2.1-rc.2）`，`verify: ALL PASS`。

## 范围 / 排除

- 范围：本包自造状态（`bundle.json`、`company-cultivation/`、`kb/deliverables-*`、`cultivation/records`）与 DSH 边界的部署合同。
- 排除：多租户、跨机器同步、session 删除 API、改 vendor、E1 依赖；P1/P2 见 Gap 卡。
