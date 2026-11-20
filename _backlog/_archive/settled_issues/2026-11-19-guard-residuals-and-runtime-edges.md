---
status: 已结
opened: 2026-11-19
---

# 推敲：新门禁的残余面 + 运行态边界（C17）

> 立卡：2026-11-19 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent（独立盲审）— 两份独立只读盲审均 approve-with-notes，notes 已在 `4bc09e0c` 收口
>
> **结论/去向**：implementation — 本卡执行 C17 的探索与证据（缺陷另开 `_backlog/bugs/` 卡；编号唯一源 = [bugs/README](../../bugs/README.md) 的 Next，2026-11-19 = 263）；本卡不改产品代码。
>
> **收口（2026-11-19）**：I1–I7 七轴各至少一轮，产出 20 张 P2 卡（BUG-263..282），全部由同日修复轮修复并迁 [fixed_bugs](../fixed_bugs/)；C17-1..C17-20 全部判决（见 Round 108/109）。共享机制决定 = [批次 Note](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)。
>
> **授权边界**：静态 / tarball / 合成包 / 纯函数 / 临时 home 可自主；不修产品代码；不改 vendor；`_dist` 只读。
>
> **前序**：[C16 卡](2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md) 的 20 张（BUG-243..262）已由 2026-11-18 修复轮收口。C16 修复又造出新的策展面：`RELEASE_PIPELINE_FILES`、`content/manifest.json` 的 inventory/tiers、最小 JSON schema、`DEV_COMMAND`、`--allow-stale=<sha>:<reason>`、catalog/presence/bundle/lease 的降级分支。本轮继续打「新判据只闭了上一轮形状」的同一类。

## 问题与期望结果

C16 把发布面收拢为：content inventory（84 件）+ 最小 schema + preset YAML parse + pipeline fingerprint（5 个文件）+ dev-command 扫描 + lease/bundle/presence/catalog 的坏输入降级。每一项都是**手写/策展**的：inventory 由盘生成、schema 只挡空对象、dev-command 是正则白名单、pipeline 是 5 条路径、bundle 只对 name/version。新判据的**残余面**就是这一轮的目标。

**期望结果：** 每条结论有「门禁声明 → 合成/真实输入 → 负控」；对不可读/symlink/空/跨引用用临时盘面或合成包；至少 20 张；不写「已完备」。

**当前基线（2026-11-19 01:10）：** HEAD `fce7df81`；`pnpm test` 262 files / 2281 tests（C16 收口）；`pnpm verify` ALL PASS；`pnpm release:shape` PASS；active 0（BUG-212 挂起）。

## C17 的七条轴

| ID | 轴 | 问题 | oracle |
|---|---|---|---|
| I1 | **pipeline 文件集** | `RELEASE_PIPELINE_FILES` 只有 5 个；install-manual/market-index/其他构建输入缺 | 改一个未列入的管线文件 → 指纹不变/`release:shape` PASS |
| I2 | **content inventory 安全/完整性** | inventory 只判字符串/存在/非空；未判 version、反斜杠、symlink、目录必需、重复（gate/checker 差异） | 合成 content 树 + `checkSourceShape`/gate |
| I3 | **JSON schema 跨引用** | seed 只判 source/target 字符串，不判安全/存在；delivery-rules 的 documents 文件、check-rules 的 files 值未判 | 合成 JSON |
| I4 | **dev-command 正则** | 只认 `pnpm <白名单>`/`node tools|checks|tests`/`run/env.sh`；`pnpm -s`/`pnpm exec`/`npm`/`node probes`/`pnpm install` 缺 | 合成 persona |
| I5 | **catalog/presence** | final 空白、catalog.json 不可读、revisionGap 未进 UI/类型消费者、未知 status | 临时 home + 纯函数 |
| I6 | **bundle 升级** | v3 pack.version 升级不备份旧 manifest/identity；`currentPackMetadata` 路径 | 临时 home |
| I7 | **release docs-only 快速路径** | DOCS_ONLY_PATHS 含 `_dist/安装手册.md`；rename/merge 边界；stamp/check 差异 | 临时 git 仓库/代码 |

## 首轮假设（先写死，2026-11-19）

| ID | 假设 | oracle | 入口 |
|---|---|---|---|
| C17-1 | `RELEASE_PIPELINE_FILES` 漏 `tools/lib/release/install-manual.mjs`，只改它指纹不变 | 改 install-manual 前后 pipeline fingerprint；`release:shape` | `pack-source.mjs` |
| C17-2 | 漏 `tools/lib/release/market-index.mjs`，只改它同样 | 同上 | 同上 |
| C17-3 | `safeContentRel` 只按 `/` 切 `..`，Windows `..\evil` 可穿 | 合成 inventory 路径 | checker |
| C17-4 | `allFiles` 跳过 symlink 文件；symlink content 不进 inventory，gate 仍绿 | 临时 content + symlink | gate/checkSourceShape |
| C17-5 | `content/manifest.json` 的 `version` 无判据；v2/无 version 仍 PASS | 合成 manifest | checker |
| C17-6 | seed 的 target/source 不判安全/存在；`target:'../../evil'` 仍 PASS | 合成 seed | checker |
| C17-7 | delivery-rules 的 `documents` 不判每个文件存在；缺文件仍 PASS | 合成 rules | checker |
| C17-8 | check-rules 的 `files` 值不判形状；任意值仍 PASS | 合成 rules | checker |
| C17-9 | `DEV_COMMAND` 漏 `pnpm -s test`/`pnpm exec`/`npm run` | 合成 persona | checkSourceShape |
| C17-10 | `DEV_COMMAND` 漏 `node probes/...`（只列 tools/checks/tests） | 合成 persona | 同上 |
| C17-11 | content-manifest gate 的 `REQUIRED_DIRS` 不含 templates/methods/wiki/charters；删整目录仍 PASS | 临时 content | gate |
| C17-12 | inventory 重复项：gate 不判、checker 判，两门结论不一致 | 合成 inventory | gate/checkSourceShape |
| C17-13 | catalog 只判 size==0，纯空白 final 仍 present | 临时 home | catalog |
| C17-14 | catalog.json 不可读（EACCES）仍抛/静默 | 临时 home | catalog-state |
| C17-15 | `revisionGap` 只进 `TeamViewLike`，client 读模型/UI 不消费 | grep/纯函数 | presence |
| C17-16 | 未知 status 事件保留后，`rowsFromTeamView`/board 的 statusLabel 仍是 unknown 文案；语义未区分 revisionGap | 纯函数 | presence |
| C17-17 | bundle v3 version 升级不备份旧 manifest/identity；升级丢旧版本证据 | 临时 home | bundle |
| C17-18 | release docs-only 允许改 `_dist/安装手册.md`（生成物）不重打/不校验 | 临时 docs commit | release |
| C17-19 | release docs-only 的 rename（code→docs）在 `git diff --name-only` 只看到新路径，误判 docs-only | 临时 git 仓库 | release |
| C17-20 | `stamp` 与 `check` 的 docs-only 判据不一致（stamp 只查 manifest 后；check 也查 artifact） | 代码/临时 manifest | release |

## 轮次与停止

| 轮 | 轴 | 内容 | 成本 |
|---|---|---|---|
| Round 108 | I1–I4 | pipeline/inventory/schema/dev-command | keyless 合成，90 分钟 |
| Round 109 | I5–I7 | catalog/presence/bundle/release | 临时 home/git，90 分钟 |

**停止规则：** 至少 20 张或 2 轮无新材料；用户叫停优先。C12–C16 已收口的不重开。

## 方法（每轮固定）

0. **先审修复**：读 C16 Note/新代码，列出新判据的策展清单；找没覆盖的输入。
1. **合成/临时输入**：真实 tarball/源码优先；catalog/bundle 用临时 home；release 用临时 git 仓库。
2. **负控**：每个「checker 已拒」结论必须有反向样本；没有写 `unverified`。
3. **判决 + 证据**：FAIL 开卡（BUG-263 起）；证据 `runtime/tmp/c17/`。
4. **回填**：`## Round 108/109`；同步两张索引；`pnpm verify` ALL PASS。

## 验收标准

1. I1–I7 每轴至少一轮，或逐项写未跑 + owner；每轮有期望 vs 实测与证据坐标。
2. 每个门禁结论有反向样本；每个运行态结论有临时 home/纯函数；没有负控写 `unverified`。
3. 至少 20 张 BUG 卡（263 起），全部 `调查中`，不修产品代码。
4. 回填 `## Round 108/109`，更新两张索引；`pnpm verify` ALL PASS；`pnpm test` 绿。
5. 不把「新 spec 绿」写成「新门禁完备」；不把「当前 PASS」写成「策展清单已全」。

## 落地证据

- 本卡是 charter/证据卡，不改产品代码；系统面 = 本卡 + ≥20 张 BUG 卡 + 索引。
- 立卡基线：`pnpm test` 262 files / 2281 tests；`pnpm verify` ALL PASS；`pnpm release:shape` PASS。

## 关闭条件

- I1–I7 每轴至少一轮，或逐项写未跑原因；C17-1..C17-20 全部判决。
- 2 轮内无新材料 → 收口；未跑面保留并标 owner。
- 所有 finding 已分诊（BUG 卡/观察/deliberate）；不写「没有 bug」。
- `pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## Round 108（2026-11-19 · I1–I4 · pipeline / inventory / schema / dev 命令）

**状态：** keyless 静态 + 合成包/真实 tarball；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C17-1 install-manual 不在 pipeline | **confirmed** | 改它前后指纹都 `107c586152b7`；`release:shape` PASS → [BUG-263](../fixed_bugs/BUG-263-pipeline-install-manual.md) |
| C17-2 market-index 不在 pipeline | **confirmed** | 同上 → [BUG-264](../fixed_bugs/BUG-264-pipeline-market-index.md) |
| C17-3 inventory 反斜杠可穿 | **confirmed（静态）** | `safeContentRel` 只 split `/` → [BUG-265](../fixed_bugs/BUG-265-inventory-backslash-path.md) |
| C17-4 allFiles 跳过 symlink | **confirmed（静态）** | `entry.isFile()` 对 symlink false → [BUG-266](../fixed_bugs/BUG-266-inventory-symlink-file.md) |
| C17-5 manifest version 无判据 | **confirmed** | version=2 → checker `[]` → [BUG-267](../fixed_bugs/BUG-267-manifest-version-unvalidated.md) |
| C17-6 seed target 不安全 | **confirmed** | `target:'../../evil.md'` → `[]` → [BUG-268](../fixed_bugs/BUG-268-seed-target-unsafe.md) |
| C17-7 delivery documents 引用 | **confirmed** | `documents:{overview:'missing.md'}` → `[]` → [BUG-269](../fixed_bugs/BUG-269-delivery-documents-refs.md) |
| C17-8 check-rules values | **confirmed** | `files:{x:{}}` → `[]` → [BUG-270](../fixed_bugs/BUG-270-check-rules-values.md) |
| C17-9 DEV_COMMAND pnpm 形式 | **confirmed（静态）** | 正则只认 `pnpm <白名单>` → [BUG-271](../fixed_bugs/BUG-271-dev-command-pnpm-forms.md) |
| C17-10 DEV_COMMAND 漏 probes | **confirmed（静态）** | 只列 tools/checks/tests → [BUG-272](../fixed_bugs/BUG-272-dev-command-probes.md) |
| C17-11 REQUIRED_DIRS 少目录 | **confirmed（静态）** | 4 个目录 → [BUG-273](../fixed_bugs/BUG-273-content-required-dirs.md) |
| C17-12 inventory 重复两门不一致 | **confirmed（静态）** | gate Set vs checker 判重复 → [BUG-274](../fixed_bugs/BUG-274-inventory-duplicate-gate.md) |

## Round 109（2026-11-19 · I5–I7 · catalog / presence / bundle / release）

**状态：** 临时 home + 纯函数 + 代码对读；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C17-13 纯空白 final | **confirmed** | `'   \n'` final → entry 进、warnings `[]` → [BUG-275](../fixed_bugs/BUG-275-catalog-whitespace-final.md) |
| C17-14 catalog.json 不可读静默 | **confirmed** | chmod 000 → written true、warnings `[]` → [BUG-276](../fixed_bugs/BUG-276-catalog-json-unreadable-silent.md) |
| C17-15 revisionGap 未消费 | **confirmed（静态）** | 字段只在 presence.ts/类型 → [BUG-277](../fixed_bugs/BUG-277-presence-revision-gap-not-consumed.md) |
| C17-16 unknown status 文案不区分 | **confirmed（静态）** | statusLabel unknown 共用 → [BUG-278](../fixed_bugs/BUG-278-presence-unknown-status-label.md) |
| C17-17 bundle v3 升级无备份 | **confirmed（静态）** | `legacyPath` 只 v2 → [BUG-279](../fixed_bugs/BUG-279-bundle-upgrade-no-backup.md) |
| C17-18 docs-only 含生成手册 | **confirmed（静态）** | `DOCS_ONLY_PATHS` 含 `_dist/安装手册.md` → [BUG-280](../fixed_bugs/BUG-280-release-docs-only-manual.md) |
| C17-19 docs-only rename 误判 | **unverified（需临时 git 实验）** | name-only rename 输出未实跑 → [BUG-281](../fixed_bugs/BUG-281-release-docs-only-rename.md) |
| C17-20 stamp/check 不对称 | **confirmed（静态）** | 两分支判据不同 → [BUG-282](../fixed_bugs/BUG-282-release-stamp-check-asymmetry.md) |

## 判决汇总

| ID | 判决 | BUG |
|---|---|---|
| C17-1..12 | confirmed（含静态） | 263..274 |
| C17-13..18/20 | confirmed（含静态） | 275..280/282 |
| C17-19 | unverified | 281 |

**本轮共开 20 张 P2 卡（BUG-263..282）**，全部 `调查中`，不修产品代码；C17-19 保留 unverified，需临时 git
rename 实验。未跑面 = 真入口 `company-entry`/`client-load` 重跑、真实 wire/UI、无 pnpm 安装环境。

## 执行记录

- 2026-11-19 ｜ 立卡（C17）｜ 本卡 + bugs/README + issues/README ｜ 20 条假设（pipeline/inventory/schema/dev-command/catalog/presence/bundle/release）｜ `pnpm verify` ALL PASS ｜ Round 108–109 待跑。
- 2026-11-19 ｜ Round 108–109 ｜ `runtime/tmp/c17-*` ｜ pipeline 2/inventory 5/schema+dev 5/catalog+presence+bundle 5/release 3 共 20 项（19 confirmed + 1 unverified） ｜ 20 张 BUG-263..282（调查中，不修） ｜ `pnpm verify` ALL PASS；`pnpm test` 262/2281 ｜ 真入口未重跑。
