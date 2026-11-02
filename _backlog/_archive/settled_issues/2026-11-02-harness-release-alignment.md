---
status: 已结
opened: 2026-11-02
---

# 推敲：FAQ 26 Harness 发行版对齐——术语、发布证据链与 current docs 清理

> 立卡：2026-11-02 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：已交付（0.7.1）。用户拍板「公司状态（company state）+ docs-first legacy 名 + 0.7.1」；
> G1–G8 / P0-0 已落进 current docs、门禁、smoke 与 release 证据链；发布字节证据链已机械化
> （`_dist` 同一 tarball + `sourceFingerprint`）。去向 = [distribution-alignment Note](../../../notes/implemented/2026-11-02-distribution-alignment.md)。
>
> **用户原话（2026-11-02）**：「历史上整理过一下围绕 插件发布 的内容……现在有个更加规整的说法
> `/Users/bowhead/deepseek-harness/_faq_on_digested/26_harness-release`……1) 对齐规整的说法，尤其术语和做法
> 2) 背后的思路/技术尽量一致用 DSH 推荐的 3) 历史上和这个没有对齐的要清理掉，让整个 REPO 维持高的信噪比……
> 先挖掘挖掘，看看 GAP 在哪里，回头 GAP 找到后再拟订 PLAN」；「好的，开工 setup goal 记得所有发现的都要
> 落地啊，记得要有证据证明你的落地啊」；「你记得你干的事情需要显性化到 issue 里面去」。
>
> **外部规范（只读）**：`/Users/bowhead/deepseek-harness/_faq_on_digested/26_harness-release`（实际目录；
> `26_plugin-data-model` / `26_plugin-as-product` 已不存在）。FAQ 是研究材料，不是 DSH 合同；DSH 合同
> 仍以 `vendor/dsh` 钉住 tag 为准。

## 问题与期望结果

**问题**：v3 已把入口/内容/数据边界改成 DSH-native（named profile、无 launcher、内容在包、状态在
workspace），但 current docs 仍停在「插件即产品 / 产品形状 / 产品入口」框架；`run bundle` 与 DSH
`bundle` 同名不同物，`run trace` 又被叫成「run bundle 四件套」；发布认证档安装的是临时重打的 tarball，
不是 `_dist` 发布字节，`--check` 仍对早于 HEAD 的产物打印 READY；安装前置、profile 初始化、恢复路径、
README 元数据与门禁也有事实漂移。

**期望结果**：

1. 读者面统一为 **Harness 发行版 / 发行方 / 交付形态 / 公司状态（company state）/ run trace**；不再用
   「插件即产品」「产品 + 对象名」框架。代码/文件名按用户拍板保留 legacy，只在术语表与代码头注标注。
2. `_dist` tarball 就是认证档安装的字节；`release --check`/`--stamp` 在 pack 源指纹变化时拒绝；
   `publish-handoff` 发布 `_dist` tarball，不再从包目录重打。
3. 干净 profile 用官方 `--from-default-profile web` 初始化；`patchReload` 从 docs/smokes 删除；
   Node/pnpm 前置按 Desktop / npm CLI 分开写；恢复路径先建模板再 add；不再教手写 roster。
4. README 补 `description`/`kind`、升级/排障；browser 两包标 optional；数据卡字段补齐或明确指针。
5. current docs 只写现在时；历史/未来/失效指针清掉；门禁与 doc-budget 同步，历史层
   （CHANGELOG / `_backlog/_archive` / `notes/archived`）不动。
6. 版本 0.7.1；用 `pnpm verify` / `pnpm test` / `pnpm typecheck` / 真实 smoke / `release --check` 留证。

## 已确认 GAP（审计账本）

| ID | 严重度 | GAP | 代表证据 | 落地动作 |
|---|---|---|---|---|
| G1 | P0 | 「插件即产品 / 产品形状 / 产品安装 / 产品入口 / 产品 home / 产品文件 / 产品承诺 / 产品设置」仍在首屏与合同 | `README.md` 3/14/58/74-75；`docs/profile.md` 6/13/19/28/52；`docs/release.md` 1/4；`docs/index.md` 25/29/40；`docs/data-model.md` 25 | 改词：Harness 发行版/交付形态/应用内安装/启动入口/Harness home/本包写出的文件/本包承诺/便利设置 |
| G2 | P0 | `bundle` 五义（DSH bundle / run bundle / dev bundle / `bundle.json` / pack）；`run bundle` 与 `run trace` 混用；`run/README.md` 仍 v2 一 home 一 workspace + 启动器 + 产品 `--workspace`；`orient` 同病 | `run/README.md` 12-15/27/32；`docs/orient.md` 56-57/69/76；`docs/runtime-map.md` 42-45；`docs/data-model.md` 4/15/20 | 用户面统一「公司状态」；`run trace` 只指四件套；`run/README.md` 重写 v3；代码/文件 legacy 名保留并登记 |
| G3 | P0 | 发布字节 ≠ 认证档字节：`release-smoke` 另打临时 tarball；`_dist` 未被 `release --verify` 安装；`--stamp` 可把旧产物钉到新 HEAD；`publish-handoff` 从包目录 publish 重打 | `_dist` 0.7.0 tarball sha `abef80f4…` vs 当前树重打 `5fe5f189…`；`_dist` 缺 HEAD 的 `ui-trajectory`/`ui-sidebar-terminal` 两行；`tools/release.mjs` 245-249；`checks/smoke/release-smoke.mjs` 98-103；`docs/guides/publish-handoff.md` 24/29-30 | `release-smoke --tarball/--expect-sha` 装 `_dist`；`release --check/--stamp` 加 `sourceFingerprint`；`--verify` 加 `company-entry-smoke`；handoff 发 tarball |
| G4 | P0 | 「不需要用户安装 Node/pnpm」过宽；`dist-manual` 门禁强制这句话；CLI/Web-on-CLI 需要 pnpm 在 PATH | `README.md` 34-35；`packages/company-pack/README.md` 5/22；`tools/lib/install-manual.mjs` 9/42/223；`checks/gates/dist-manual.mjs` 35；FAQ 20:60；vendor CLI `plugin.ts` 98 | 按 Desktop 自带 / npm CLI 需 pnpm 分开写；门禁改判据；smoke 加 `pnpm --version` 前置 |
| G5 | P1 | profile 初始化手写 `package.json`/`pnpm-workspace`；`patchReload` 已从 vendor 删除，docs 与 4 个 smoke 仍当有效字段 | `checks/smoke/release-smoke.mjs` 107-119/154-165；`docs/guides/debugging.md` 11；`docs/guides/bootstrap.md` 123；`docs/release.md` 93；`rg patchReload vendor` = 0 | 用官方 `--from-default-profile web`；删 `patchReload`；一次性 profile 用 `hmr disabled`；smoke 断言 dependencies 对象且无 `patchReload` |
| G6 | P1 | 恢复/演示把 `plugin add` 当第一步，新 home 建 base-only，起不了 Web；`docs/profile.md` 教手写 `dsh.profile.bundles`；multi-install 直接赋 roster | `packages/company-pack/README.md` 93-94；`docs/design/ui-demo.md` 18；`docs/profile.md` 57-58；`checks/smoke/multi-install-smoke.mjs` 174-177 | 恢复先 `--from-default-profile web` 再 add；删手写 roster 建议；smoke 走官方 add |
| G7 | P1/P2 | 包 README 缺 `description`/`kind`、缺升级/排障；browser peer 未标 optional；`engines.node` 比 DSH 宽；数据卡缺 source/scope/readers/rebuildability | `packages/company-pack/README.md` 1-6/111；`packages/company-pack/package.json` 25/58-78；`docs/data-model.md` 11 | 加 front matter、两节；加 `peerDependenciesMeta.optional`；对齐 node range；补数据卡字段/指针 |
| G8 | P1/P2 | current docs 混历史/未来/失效指针；门禁钉旧文案；预算顶格 | `docs/release.md` 9/105/140/148/160-162；`docs/guides/release-runbook.md` 1/30；`docs/guides/publish-handoff.md` 87；`docs/profile.md` 52；`README.md` 80-86；`docs/runtime-map.md` 70-71；`docs/project-map.md` 94；`docs/external-research.md` 23-24 | 删除/搬迁；更新指针；门禁/预算同步；历史层不动 |
| P0-0 | P0 | 当前 0.7.0 `_dist` 已实证早于 HEAD，`release --check` 仍 READY | 同上 G3 实测 | 0.7.1 重新 prepare/verify/check；旧 0.7.0 不发布 |
| P1-a | P1 | 把 `application: applied` 写成唯一成功态；`restart-required` 是合法结果 | `packages/company-pack/README.md` 29；`docs/guides/publish-handoff.md` 73；FAQ 18:61 | 改成 applied 或 restart-required 后重启；failed 才是失败 |
| P1-b | P1 | 市场 staged 生命周期没进 handoff；手册未发布期仍教加源；门禁只查字面量 `market-index.json` | `docs/guides/publish-handoff.md` 38-57；`_dist/安装手册.md` 63-67；`checks/gates/dev-product-parity.mjs` 80-83 | handoff 写 staged → 发布 → 刷新 → 删 staged；门禁语义检测；手册未发布期写“无源可加” |
| P1-c | P1 | 两个 browser 包是必装 peer，违反离线/零 runtime 依赖姿态 | `packages/company-pack/package.json` 65/78；无 `peerDependenciesMeta` | 加 optional + `pack-shape` 断言 |
| P2-a | P2 | tarball/git 安装版本门是“装后判定 + 回滚”，手册未写；`npm pack` mtime 理由不成立 | vendor plugin-manager README 69；`tools/release.mjs` 195-196 | 手册补差异；删 mtime 解释，改“lib/ 陈旧或树已变” |
| P2-b | P2 | `checks/README.md` 计数过期（28→26、13→12、52→53）；`external-research` 破指针不被 `bare-path` 扫；`run/README.md` 退役词无门禁 | `checks/README.md` 30/51/58；`docs/external-research.md` 23-24；`run/README.md` 12-15 | 改计数；加 external-research 人工/门禁核验；`retired-path` 加退役词判据 |

## 噪声退休表（插件分发 / 安装 / 初始化）

这不是“再写一份新文档”，而是把同一件事的旧说法**退休/删除**。处置分三档：**删/改写**（current docs、脚本、门禁、
测试夹具）、**标 legacy 保留**（代码标识符、持久文件名、历史 Note）、**冻结不动**（CHANGELOG、归档、历史 decisions）。

| 噪声类 | 代表残留 | 处置 | 边界 |
|---|---|---|---|
| 旧交付框架词 | README.md:3「插件即产品」；docs/profile.md:13/19「产品安装/产品形状」；docs/release.md:1/4「发布形状/产品形状」；docs/index.md:25/29；docs/data-model.md:25「产品设置」；pack README/手册同族 | 全部改写为 Harness 发行版 / 交付形态 / 应用内安装 / 启动入口 / Harness home / 本包写出的文件 / 便利设置 | 历史层与 demo 业务动议原文不改 |
| `bundle` 五义 | 同一段里 DSH bundle、run bundle、dev bundle、bundle.json、pack 混用；run/README.md 12-15 还写 v2 | 用户面只用「公司状态（company state）」；`run trace` 只指四件套；`bundle` 只指 DSH 发布单位；`pack` 只作包简称；`bundle.json` 标 legacy 文件名 | 代码标识符 `RUN_BUNDLE_*`、storage domain 保留；不批量改名 |
| 已退役形状 | 一 home 一 workspace、启动器强制、产品 `--workspace`、seed-consent、profile patch registrar、`DSH_COMPANY_REBIND`、`patchReload`、Update 按钮、删整个 `DSH_HOME` | current docs/脚本/测试里删或改写；负面断言（如“无 seed-consent”）保留作现状守卫 | 历史卡与归档保留原文 |
| 重复的发布/安装叙事 | README、release.md、release-runbook、publish-handoff、pack README、`_dist/安装手册.md` 各写一份安装/升级/卸载；release.md 里还有冒烟程序与升 pin 程序 | 定 owner：release.md = 发行版合同；runbook = 操作步骤；handoff = 字节离开仓库；手册 = 收件人唯一安装路径；README/pack README = 首屏 + 指针。删重复段 | 版本史归 CHANGELOG；脚本步骤归脚本头注 |
| 过期指针/版本 | 26_plugin-data-model / 26_plugin-as-product 两个不存在的目录；release-runbook 1「0.3.x」/30「0.3.4」；publish-handoff 87 指向归档卡；README 0.6.0/0.5.0 版本说明；release.md 0.6.0/OpenSpec/旧 FAQ 13 | 修正/删除；发布回执改落当轮 Note + manifest | 归档卡不改内容；历史 decisions 只加 D55 |
| 门禁钉旧文案 | `dist-manual` 强制「不需要 Node」；`dev-product-parity` 固定旧指南名/旧词；`pack-shape`/`company-skeleton` 消息写「产品入口」；`run-bundle-clean` 名称 | 改判据/消息；新增 optional peer、发布源指纹、run/README 退役词等断言 | 门禁红证与历史注释可保留，但要标“负例留证” |
| 代码/工具/测试注释 | `tools/company.mjs`、`tools/bundle-init.mjs`、`tools/lib/install-manual.mjs`、`tools/orient.mjs`、`checks/smoke/*`、`tests/company/*` 的 run bundle/产品/launcher 字样 | 读者面注释与测试标题改新词；纯标识符/路径保留并标 legacy | 不改测试断言语义来“凑绿” |
| 计数/清单第二份 | checks/README.md:30/51/58 28/13/52（实为 26/12/53）；`docs/profile.md` 行清单；`docs/release.md` 手册 required 词表 | 改成“清单 = 目录本身”或实测值；required 词表归门禁 | D28：枚举型事实的家 = 实现自己 |
| 历史/未来混入合同 | release.md 0.6.0 史、OpenSpec 触发、日期实证；profile.md 0.5.0 registrar；runtime-map REBIND/0.5.0；project-map 目录整理结论；demo 实测回执 | 删除/搬 notes 或 CHANGELOG；合同只写 now | 不把历史层本身当噪声删除 |

**执行顺序**：本卡（噪声清单）→ `notes/implemented/2026-11-02-distribution-alignment.md`（方案/验收）→ 逐 Phase 落地
→ 收口 `notes/implemented/` + 归档本卡。任何“删除”先确认不是 current owner；不确定则标 legacy，不硬删。

## 已拍板

| # | 决定 | 选择 |
|---|---|---|
| D1 | `run bundle` 用户面替代词 | **公司状态（company state）**；`run trace` 保持四件套 |
| D2 | `bundle.json` / `RUN_BUNDLE_*` / `bundle:init` | **docs-first + legacy 标注**；代码/持久名本轮不改，下个 minor 再议 v4 迁移 |
| D3 | 版本 | **0.7.1**；0.7.0 的 `_dist` 已过期，不发布 |
| D4 | 历史层 | **CHANGELOG / `_backlog/_archive` / `notes/archived` 不动**；current docs 清历史/未来 |

## 落地计划

### Phase 0 · 术语与登记

- `docs/terminology.md`：bundle/profile/pack、公司状态/run trace/发布物/发行版。
- `docs/external-research.md`：合并为 `26_harness-release/`；删两个不存在的 26 目录。
- 收口 Note + D55（发行版六轴与术语对齐）。

### Phase 0.5 · 发布证据链（P0）

- `tools/release.mjs`：`sourceFingerprint`；`--check/--stamp` 拒绝源变；`--verify` 传 `_dist` tarball +
  sha + `company-entry-smoke`。
- `checks/smoke/release-smoke.mjs`：`--tarball/--expect-sha`；装 `_dist`；官方 profile 初始化。
- `docs/guides/publish-handoff.md`：发 `_dist` tarball；staged 生命周期；回执落 Note。
- `docs/release.md`：发布字节措辞与 0.7.1 版本行。

### Phase 1 · current docs / 合同

- `README.md`、`AGENTS.md`、`docs/index.md`、`docs/profile.md`、`docs/release.md`、`docs/runtime-map.md`、
  `docs/data-model.md`、`docs/project-map.md`、`docs/orient.md`、`docs/guides/environments.md`、
  `docs/guides/dev-product-parity.md`、`docs/guides/release-runbook.md`、`checks/README.md`、`tests/README.md`。
- `run/README.md` 重写 v3；`packages/company-pack/README.md` 加 front matter/升级/排障并改词。
- `tools/lib/install-manual.mjs` + `_dist/安装手册.md` 重生成；`dist-manual` 门禁同步。
- 六轴 owner 表进 `docs/release.md`；删历史/未来/重复程序，守 172 行预算。

### Phase 2 · practice

- profile 初始化统一官方路径（release/revoke/multi-install/replay 按需）；删 `patchReload`。
- Node/pnpm 前置按面写；smoke 加 `pnpm --version`。
- `application: applied` → applied/restart-required；市场 staged；optional peer；数据卡字段。
- 可选：`pack-shape` 增 optional peer/engines 断言；`retired-path` 增 run/README.md 退役词；
  `dev-product-parity` 市场门禁语义化。

### Phase 3 · 历史/指针/预算

- 删/搬 release.md:9/105/148、profile.md:52、README.md:80-86、runtime-map.md:70-71 等。
- 修 release-runbook:1/30、publish-handoff:87、external-research:23-24、`checks/README.md` 计数。
- 按 `doc-budget` 棘轮下调或搬出；不碰历史层。

### Phase 4 · release

- bump 0.7.1（package/CHANGELOG/release.md/market index）。
- `pnpm release --prepare` → `--verify` → commit → `--stamp` → `--check`。
- 证据：verify/test/typecheck、release-smoke（装 `_dist`）、company-entry/preset/client-load/present-catalog、
  `npm publish --dry-run <tgz>`；未发布不执行真实 publish。

## 验收标准

1. **术语**：current docs 的 `rg '产品形状|产品安装|产品入口|产品 home|产品文件|产品承诺|插件即产品'` = 0
   （历史层与业务 demo 原文除外）；run/README.md、`orient` 不再出现 v2/一 home 一 workspace/launcher/
   产品 `--workspace`；`run bundle` 只在 legacy 标注与代码标识符出现。
2. **发布证据**：`_dist/0.7.1.tgz` 的 `cordis.patch.yml` 含 HEAD 全部行；`release-smoke --tarball _dist/...`
   ALL PASS；`release --check` READY；在 pack 源改动后 `--check` 必红（先 red 后还原绿）。
3. **profile**：release/revoke/multi-install 不再手写 `package.json`/roster；`rg patchReload` 在 docs/checks = 0；
   干净 profile 走 `--from-default-profile web`；`application: applied` 或 `restart-required` 都被文档接受。
4. **前置/README**：Desktop 与 npm CLI 的 Node/pnpm 前置分开写；`dist-manual` 门禁不再强制错误句；
   pack README 有 front matter + 升级/排障；browser peers optional；`engines.node` 与 DSH 对齐。
5. **历史/预算**：current docs 无 0.6.0/0.5.0 版本史、OpenSpec 未触发项、归档卡收件箱指针；
   `pnpm verify` 的 doc-budget 全绿（必要时按规则下调上限）。
6. **证据链**：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `release --verify` 全绿；Note 记录真跑命令与
   red/green；六行回执发出；未跑项显式标「未执行」。

## 范围与排除项

- 不改 `vendor/dsh`、不升 pin、不真实 `npm publish`、不托管 market index。
- 不做代码/文件名全量重命名（用户选 docs-first）；`bundle.json`、`RUN_BUNDLE_*`、storage domain 保留。
- 不改 CHANGELOG / `_backlog/_archive` / `notes/archived` 的历史正文；不改 decisions 的 D45/D48/D51/D52
  历史行（只加 D55）。
- 不改五角色 persona/skill 内容语义；不改 demo 业务动议原文。

## 关闭条件

- 上述验收 1–6 有实跑证据；`release --check` READY；本卡归档并更新 `_backlog/issues/README.md`。
- 若某项被阻断：在卡顶写「阻断 + 原因」，不得把未跑写成绿；由用户决定是否降级或延期。
