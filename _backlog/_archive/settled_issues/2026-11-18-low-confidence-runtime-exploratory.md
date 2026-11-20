---
status: 待落地
opened: 2026-11-18
---

# 推敲：修复后的新守卫面 + 低置信运行态（C14）

> 立卡：2026-11-18 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 本卡执行 C14 的探索与证据（缺陷另开 `_backlog/bugs/` 卡；编号唯一源 = [bugs/README](../bugs/README.md) 的 Next，2026-11-18 = 223）；本卡不改产品代码。
>
> **授权边界**：静态 / 合成包 / tarball / 纯函数 / 真入口可自主；不修产品代码；不改 vendor；`_dist` 只读。
>
> **前序**：[C13 运行时/发布面卡](2026-11-17-runtime-shipped-boundary-exploratory.md) 的 10 张（BUG-213..222）已由 2026-11-17 修复轮收口；本轮先审**修复自身造出的新守卫面**，再打**测试最难证明的运行态**。这是用户点名的「心里发虚」方向：新门禁的拒绝分支、`release:shape` 的新鲜度、client 读模型的部分视图、catalog 的静默跳过。

## 问题与期望结果

C13 的修法不是十个补丁：`export-dist` 现在先 **sanitize** 再从 sanitized 目录重打，判据住 [shipped-shape.mjs](../../tools/lib/release/shipped-shape.mjs)，spec 住 [shipped-shape.spec.ts](../../tests/repo/release/shipped-shape.spec.ts)。这是**修复当天新写的门禁**——最典型的「判据名 > 判据面」风险：它只拒绝了 C13 当时见过的形状，没证明 `files` 的 glob、content/presets 的存在、`dsh.bundle.patch` 的目标、`release:shape` 的输入新鲜度、以及真实 tarball 是否在 pre-push/verify 的射程。

第二类是**低置信运行态**：C5/C1/C4 里那些「只在固定夹具上绿」的读模型——`diffActivity` 的部分视图、`teamWithEventTasks` 的新旧覆盖、`catalog` 的坏形状。它们的共同点是：类型/夹具假设了完整输入，真实 wire/盘面可以缺字段或给 symlink。

**期望结果：** 每条结论有「声明面 × 实盘/合成输入 × 负控」；新守卫的缺口用 checker 的合成包直接证；读模型用最小纯函数输入证。不写「新门禁已完备」；不把仓库内 `pnpm test` 绿当发布面/真实 wire 已证。

**当前基线（2026-11-18 09:30）：** version 0.11.9；HEAD `ba0afd61`；`_dist/dsh-company-pack-0.11.9.tgz` 303 KB / 137 entries；`pnpm release:shape` 预期 PASS；`pnpm test` 262 files / 2218 tests（修复轮 Note）；`pnpm verify` ALL PASS；active BUG-212（收尾验证链成本）不在本卡。

## C14 的六条轴

| ID | 轴 | 问题 | oracle |
|---|---|---|---|
| G1 | **shipped-shape 判据面** | checker 的 `files`/`TEXT_FACE`/`DEV_PATH`/`dsh.bundle.patch`/类型闭包是否只覆盖「上次出事」的形状；空集/少文件是否绿 | 合成 package 逐条植入 → `checkShippedPackage()`；负控 = 去掉 content/presets/组合行 |
| G2 | **发布新鲜度 / 接线** | `release:shape` 只读 `_dist`；`_dist` 与当前源码不同步时仍 PASS；真实 tarball 检查不在 `verify`/pre-push | `release-manifest` 的 gitSha/sourceFingerprint × HEAD；`release:shape` 跑旧 `_dist`；pre-push 面 |
| G3 | **client 读模型** | `diffActivity`/`teamWithEventTasks` 对部分视图、缺 revision、未知 phase/status 的行为 | 纯函数最小输入；类型之外的真实 wire 形状 |
| G4 | **catalog 派生** | 子目录 symlink、空 `slug`、坏 meta/final、catalog 自身的坏形状是否静默/撒谎 | 临时 companyHomes + `regenerateCatalog`；warnings 契约 |
| G5 | **event 折算** | `presenceFromEvents` 的 active/未知 phase、task 修订、ownerId 缺省是否与 live 读模型同义 | 事件序 + live view 对照 |
| G6 | **修复回归** | sanitizer 的 strip/scrub、hardcoded files/type closure、README.shipped 是否引入新静默 | 源码/产物对照 + 最小负控 |

## 首轮假设（先写死，2026-11-18）

| ID | 假设 | oracle | 入口 |
|---|---|---|---|
| C14-1 | `checkShippedPackage` 不验证 `files` 的 glob（`content/**`/`presets/**`）是否真有条目；没有 content/presets 的包仍 PASS | 合成 package：删掉 content/presets entries → checker | `tools/lib/release/shipped-shape.mjs` |
| C14-2 | `TEXT_FACE` 不含 `content/**`；content 里的 dev 路径不判 | 合成 content dev 路径 → checker | 同上 |
| C14-3 | `DEV_PATH`/`REL_DEV_PATH` 要求文件扩展名；目录级 dev 引用（`tests/host/cultivation/`）不判 | 合成 cordis 目录引用 → checker | 同上 |
| C14-4 | checker 不验证 `dsh.bundle.patch` 的目标文件存在；缺 preset 行仍 PASS | 合成 pkg 的 patch 目标缺失 → checker | 同上 |
| C14-5 | `release:shape` 只读 `_dist`，不比对源码指纹/HEAD；旧 tarball + 新源码仍 PASS | 旧 `_dist`/manifest gitSha × HEAD；`pnpm release:shape` | `tools/release/shipped-shape.mjs`、`_dist/release-manifest.json` |
| C14-6 | 真实 tarball 的 shipped-shape 检查不在 `pnpm verify`/pre-push；source 变更只到 release 才红 | `pre-push` 面规则 × `release:shape` 调用点；合成源改动 | `checks/pre-push-surfaces.mjs`、`package.json` |
| C14-7 | `diffActivity` 对缺 `members`/`tasks` 的部分 `TeamView` 抛异常（同 BUG-145 的部分视图形状） | 纯函数最小输入：`{}`/缺字段 | `presence.ts` |
| C14-8 | `teamWithEventTasks` 在投影任务缺 `revision` 时无法判新旧，旧事件可把 completed 覆盖成 pending | 纯函数：base 无 revision + 旧事件 | `presence.ts` |
| C14-9 | `catalog` 对 deliverables 子目录 symlink 静默跳过，不产生 warning；数据不诚实 | 临时 companyHome + symlink slug dir | `catalog.ts` |
| C14-10 | `meta.md` 的 `slug:` 空值被当成 slug `''`，不回退目录名、不告警 | 临时 companyHome + 空 slug | `catalog.ts` |

## 预检坐标（只读，2026-11-18；是起点，不是结论）

| # | 载体 | 预检看到什么 | 轴 | 首轮怎么证伪 |
|---|---|---|---|---|
| 1 | [shipped-shape.mjs](../../tools/lib/release/shipped-shape.mjs) | 合成包无 `content/`/`presets/` entries → `[]`；`files` 的 `/**` glob 被跳过 | G1 | 删 entries → checker；[BUG-223](../_archive/fixed_bugs/BUG-223-shipped-shape-globs-unchecked.md) |
| 2 | 同上 | `content/AGENTS.md` 里 tests/x.spec.ts → `[]`；`TEXT_FACE` 无 content | G1 | 合成 content → checker；[BUG-224](../_archive/fixed_bugs/BUG-224-shipped-shape-text-face-misses-content.md) |
| 3 | 同上 | cordis 里 `tests/host/cultivation/`（目录级）→ `[]`；`DEV_PATH` 要扩展名 | G1 | 合成目录引用 → checker；[BUG-225](../_archive/fixed_bugs/BUG-225-shipped-shape-extensionless-dev-paths.md) |
| 4 | 同上 | `dsh.bundle.patch` 指向不存在的 preset → `[]`；checker 不读 patch | G1 | 合成 patch → checker；[BUG-226](../_archive/fixed_bugs/BUG-226-shipped-shape-bundle-patch-unchecked.md) |
| 5 | 同上 | `release:shape` 只 read tarball；manifest gitSha/sourceFingerprint 不参与 | G2 | 旧 `_dist` + 新源码；[BUG-227](../_archive/fixed_bugs/BUG-227-release-shape-stale-dist.md) |
| 6 | pre-push/verify | 真实 tarball 检查只在 `pnpm release --prepare`/`release:shape`；`verify`/pre-push 不调用 | G2 | 改 `README.shipped`/preset dev 路径 → verify 仍绿；[BUG-228](../_archive/fixed_bugs/BUG-228-shipped-shape-not-in-verify.md) |
| 7 | [presence.ts](../../packages/company-pack/src/lib/presence/presence.ts) | `diffActivity({}, {members:[],tasks:[]})` → `Cannot read properties of undefined (reading 'map')` | G3 | 纯函数最小输入；[BUG-229](../_archive/fixed_bugs/BUG-229-diff-activity-partial-view.md) |
| 8 | 同上 | base completed 任务无 `revision` + 旧事件 revision 1 pending → 覆盖成 pending | G3 | 纯函数最小输入；[BUG-230](../_archive/fixed_bugs/BUG-230-team-event-overrides-missing-revision.md) |
| 9 | [catalog.ts](../../packages/company-pack/src/host/ledger/catalog.ts) | deliverables 子目录 symlink 被 `item.isDirectory()` 过滤，entries 少一条、warnings 空 | G4 | 临时 home + symlink；[BUG-231](../_archive/fixed_bugs/BUG-231-catalog-silent-symlink-dir.md) |
| 10 | 同上 | `slug:` 空值 → catalog slug `''`，不告警 | G4 | 临时 home + 空 slug；[BUG-232](../_archive/fixed_bugs/BUG-232-catalog-empty-slug.md) |

## 方法（每轮固定）

0. **先审修复**：读本波修复 commit/Note/新 spec，列出「新判据声称的拒绝分支」；逐条找它没覆盖的输入形状，不重跑 C13 的旧证据。
1. **合成输入**：shipped-shape 用最小 `pkg/entries/read`（同 spec 的 fixture 形态）；读模型用纯函数最小对象；catalog 用临时 companyHome。输入形状要来自真实 wire/模板，不凭想象。
2. **负控**：每个「checker 已拒/已覆盖」结论必须有一个**反向样本**让它红；没有反向样本写 `unverified`。每个「纯函数不崩」结论至少一个缺字段/未知值样本。
3. **真入口补充**：`pnpm release:shape`、`pnpm company`/`company-entry`/`client-load` 只在需要时跑；`release:shape` 的输入新鲜度优先静态/文件对账。
4. **判决 + 证据**：每格 PASS/FAIL/未证；FAIL 开卡（BUG-223 起）；证据落 `runtime/tmp/c14/`（gitignored）。
5. **回填**：本卡 `## Round 100/101`；同步两张索引；`pnpm verify` 保持 ALL PASS。

## 轮次与停止

| 轮 | 轴 | 内容 | 成本 |
|---|---|---|---|
| Round 100 | G1 / G2 / G6 | shipped-shape 合成负控（glob/content/目录引用/patch）、release:shape 新鲜度、real-check 接线 | keyless 静态，90 分钟 |
| Round 101 | G3 / G4 / G5 | diffActivity/teamWithEventTasks 部分视图；catalog symlink/空 slug；event 折算对照 | keyless 纯函数 + 临时 home，90 分钟 |
| Round 102 | 真入口 | `release:shape`、company-entry/client-load（若需要） | 真入口，60 分钟 |

**停止规则：** 至少 10 张或 3 轮无新材料；用户叫停优先。C12/C13 已收口的不重开。

## 证据、判据与处置

- **oracle 阶梯**：真实 tarball/源码对账 > 合成 package 的 checker > 临时 companyHome 的派生 > 纯函数最小输入 > 仓库内 `pnpm test`（底线）。
- **载体分类**：shipped（tarball/README.shipped/manifest）、source（`presets`/`content`/`src`）、runtime-wire（TeamView/事件）、disk（companyHome/catalog）。只有 shipped/runtime-wire/disk 可判运行面缺陷；source 只作为构造输入。
- **三种误判**：① 把 spec 的合成正例当真实 tarball；② 把类型必填当真实 wire 必填；③ 把「warning 为空」当「输入干净」。
- **处置**：材料性 → BUG 卡；非材料性 → 观察 + owner；不修产品代码。

## 验收标准

1. G1–G6 每轴至少一轮，或逐项写未跑 + owner；每轮有期望 vs 实测与证据坐标。
2. 每个新 checker 结论有反向样本；每个读模型结论有缺字段/未知值样本；没有负控写 `unverified`。
3. 至少 10 张 BUG 卡（223 起），全部 `调查中`，不修产品代码。
4. 回填 `## Round 100/101`，更新两张索引；`pnpm verify` ALL PASS；`pnpm test` 绿。
5. 不把「新 spec 绿」写成「新门禁完备」；不把「仓库内能跑」写成「真实 wire/发布面已证」。

## 落地证据

- 本卡是 charter/证据卡，不改产品代码；系统面 = 本卡 + 10 张 BUG 卡 + 索引。
- 立卡基线（实跑）：`pnpm test` 262 files / 2218 tests（修复轮 Note）；`pnpm verify` ALL PASS；`pnpm release:shape` PASS；tarball 137 entries。
- 预检（实跑）：合成 package 四类缺口全 `[]`；`diffActivity` 部分视图抛错；`teamWithEventTasks` 无 revision 覆盖；catalog symlink/空 slug 两例。

## 关闭条件

- G1–G6 每轴至少一轮，或逐项写未跑原因；C14-1..C14-10 全部判决。
- 3 轮内无新材料 → 收口；未跑面保留并标 owner。
- 所有 finding 已分诊（BUG 卡/观察/deliberate）；不写「没有 bug」。
- `pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## Round 100（2026-11-18 · G1 / G2 · 新 checker 与发布新鲜度）

**状态：** keyless 静态 + 合成 package；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C14-1 files glob 未验证 | **confirmed** | 合成 entries 删掉 content/presets → `checkShippedPackage` 返回 `[]` → [BUG-223](../_archive/fixed_bugs/BUG-223-shipped-shape-globs-unchecked.md) |
| C14-2 TEXT_FACE 不含 content | **confirmed** | `content/AGENTS.md` 写未限定 tests/x.spec.ts → `[]`；同文本进 cordis → 红 → [BUG-224](../_archive/fixed_bugs/BUG-224-shipped-shape-text-face-misses-content.md) |
| C14-3 目录级 dev 路径不判 | **confirmed** | cordis 写 `tests/host/cultivation/` → `[]`；带扩展名 → 红 → [BUG-225](../_archive/fixed_bugs/BUG-225-shipped-shape-extensionless-dev-paths.md) |
| C14-4 dsh.bundle.patch 未验证 | **confirmed** | patch 指向不存在的 preset → `[]` → [BUG-226](../_archive/fixed_bugs/BUG-226-shipped-shape-bundle-patch-unchecked.md) |
| C14-5 release:shape 不比对源码 | **confirmed** | manifest gitSha `a692bf58…` ≠ HEAD `ba0afd61`，`pnpm release:shape` 仍 PASS（137 entries） → [BUG-227](../_archive/fixed_bugs/BUG-227-release-shape-stale-dist.md) |
| C14-6 真实 tarball 检查不在 verify/pre-push | **confirmed** | `README.shipped.md` → `coveredBy: ['verify']`；pre-push 无 `release:shape`；只有 package.json 手动脚本 → [BUG-228](../_archive/fixed_bugs/BUG-228-shipped-shape-not-in-verify.md) |

**负控：** 四个 checker 缺口都是「合成 package → `[]`」；同一形状放进已覆盖面（cordis 带扩展名路径）→ 红。

## Round 101（2026-11-18 · G3 / G4 · 读模型与 catalog）

**状态：** keyless 纯函数 + 临时 companyHome；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C14-7 diffActivity 部分视图抛错 | **confirmed** | `diffActivity({}, {members:[],tasks:[]},0)` → `Cannot read properties of undefined (reading 'map')`；缺 tasks/缺 members 同 → [BUG-229](../_archive/fixed_bugs/BUG-229-diff-activity-partial-view.md) |
| C14-8 teamWithEventTasks 缺 revision 被旧事件覆盖 | **confirmed** | base completed 无 revision + 事件 revision 1 pending → merged pending → [BUG-230](../_archive/fixed_bugs/BUG-230-team-event-overrides-missing-revision.md) |
| C14-9 catalog 静默跳过子目录 symlink | **confirmed** | 临时 home：entries 只有 real、warnings `[]`，linked 消失 → [BUG-231](../_archive/fixed_bugs/BUG-231-catalog-silent-symlink-dir.md) |
| C14-10 meta 空 slug 被当 `''` | **confirmed** | `slug:` 空 → entry `{dir:'2026-10-25-empty', slug:''}`、warnings `[]` → [BUG-232](../_archive/fixed_bugs/BUG-232-catalog-empty-slug.md) |

**证据坐标：** `runtime/tmp/c14-*.test.mjs`、`runtime/tmp/c14-dist/`、`runtime/tmp/c14-release-shape.log`。

## 判决汇总

| ID | 判决 | BUG |
|---|---|---|
| C14-1..6 | confirmed | 223..228 |
| C14-7..10 | confirmed | 229..232 |

**本轮共开 10 张 P2 卡（BUG-223..232）**，全部 `调查中`，不修产品代码。未跑面 = Round 102 真入口重跑
（`company-entry`/`client-load`）、真实模块表/真实 wire 端到端；没有「新门禁完备」的结论。

## 执行记录

- 2026-11-18 ｜ 立卡（C14）｜ 本卡 + bugs/README + issues/README ｜ 预检 10 条（4 checker 缺口 / release 新鲜度 / 2 读模型 / 2 catalog）｜ `pnpm verify` ALL PASS ｜ Round 100–102 待跑。
- 2026-11-18 ｜ Round 100–101 ｜ `runtime/tmp/c14-*` ｜ 4 个 checker 缺口 + release:shape stale + 2 读模型 + 2 catalog 全部 confirmed ｜ 10 张 BUG-223..232（调查中，不修） ｜ `pnpm verify` ALL PASS；`pnpm test` 262/2218 ｜ 真入口/真实 wire 未跑。
