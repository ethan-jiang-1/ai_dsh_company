---
status: 已结
opened: 2026-11-18
---

# 推敲：修复后门禁的新面 + 不可读/部分输入（C15）

> 立卡：2026-11-18 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：implementation — C15-1..10 全部 confirmed；10 张 BUG-233..242 已于 2026-11-18 修复（`56e4f986`）并归档（`40fa86dd`），决策记忆 = [Note](../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)。本卡只作证据历史，不再承接轮次。
>
> 审查：agent（独立盲审）— 修复轮 B1/B2 已修，S1–S5 原始清单未在仓内留档（仅 S2 见 Note 未覆盖轴）；归档复核 2026-11-18 由独立只读子代理执行：0 BLOCKER、3 条非阻塞建议，见 `## 落地证据`。
>
> **授权边界**：静态 / 合成包 / tarball / 纯函数 / 临时 companyHome 可自主；不修产品代码；不改 vendor；`_dist` 只读。
>
> **前序**：[C14 低置信卡](../../issues/2026-11-18-low-confidence-runtime-exploratory.md) 的 10 张（BUG-223..232）已由 2026-11-18 修复轮收口；本轮继续打「修复后的新判据」与「坏输入不被当坏形状」的同一类。用户点名的方向：**心里发虚的地方**——新 checker 只闭了上一轮的形状、不可读文件没被当坏形状、部分 wire 与 live 读模型不同义。

## 问题与期望结果

C14 修复把 shipped-shape 的判据从「上次出事的样本」扩到 files glob/content/patch/目录级 dev 路径；把 `release:shape` 加上 sourceFingerprint 新鲜度；把 presence/catalog 的四个最小输入修好。但同一轮又引入了新的声明面：

- `REQUIRED_SHIPPED` 是 12 个手写路径——比「glob 非空」强，但比「运行时真需要的全集」弱；
- `dsh.bundle.patch` 逐个目标校验，但**集合的完整性**（六角色 + 五 support）没有断言；
- `sourceFingerprint` 把 `README.md`（dev 文档，不随包）算进指纹；
- `--allow-stale` 明确降级，但不要求理由；
- catalog 的不可读文件（meta/ledger/final）仍不在坏形状判据里；
- presence 的未知 phase/缺 content 仍按「类型必填」假设。

**期望结果：** 每条结论有「声明面 × 真实/合成输入 × 负控」；新 checker 的缺口用真实 tarball 或合成包直接证；不可读/坏形状用临时盘面证；部分 wire 用纯函数最小输入证。不写「新门禁完备」；不把「当前 tarball PASS」当「完整集合已证」。

**当前基线（2026-11-18 11:30）：** version 0.11.9；HEAD `a77d193e`；`_dist` 137 entries / 303 KB；`_dist` manifest `sourceFingerprint 28a0649c…`、`gitSha c2eef3a3…`；`pnpm release:shape` PASS；`pnpm test` 262 files / 2237 tests（C14 修复 Note）；active BUG-212（收尾验证链成本）不在本卡。

## C15 的六条轴

| ID | 轴 | 问题 | oracle |
|---|---|---|---|
| H1 | **shipped 关键件完整性** | `REQUIRED_SHIPPED` 只列 12 个路径，templates/contracts/methods 等运行时内容缺了仍 PASS；存在性不查非空 | 真实 tarball 删 entry / 空文件 → checker |
| H2 | **组合集合完整性** | `dsh.bundle.patch` 逐个目标在，但 patch 数组可裁剪到 6 条、preset 目录可只剩 1 个仍 PASS；没有「六角色 + 五 support」集合断言 | 真实 tarball 裁剪 patch/preset → checker |
| H3 | **源码指纹边界** | `sourceFingerprint` 含 `README.md`（dev 文档，不随包）；改 dev README 会让 `_dist` 假过期 | 前/后 `sourceFingerprint`；`release:shape` |
| H4 | **降级/空文件** | `--allow-stale` 不要求理由且仍 exit 0；`REQUIRED` 只查存在性，空 charter 仍 PASS | `release:shape --allow-stale`；空文件合成包 |
| H5 | **catalog 不可读** | meta/ledger 不可读抛 EACCES；final 不可读仍算 present，warnings 空 | 临时 companyHome + chmod |
| H6 | **presence 部分 wire** | 未知 member phase 在事件板落 inactive、live 落 unknown；message.content 缺失抛 `content is not iterable`；缺 revision 的 in_progress 仍可被打回 pending | 纯函数最小输入 |

## 首轮假设（先写死，2026-11-18）

| ID | 假设 | oracle | 入口 |
|---|---|---|---|
| C15-1 | `REQUIRED_SHIPPED` 只列 12 个 content 关键件，删 templates/contracts/methods 仍 PASS | 真实 tarball 过滤 entries → checker | `checkShippedPackage` |
| C15-2 | patch 目标逐个校验，但「六角色 + 五 support」集合没断言；裁剪 patch 到 6 条仍 PASS | 真实 tarball 裁剪 patch/preset → checker | 同上 |
| C15-3 | `sourceFingerprint` 含 dev `README.md`；改 dev README 让指纹变、`_dist` 假过期 | `sourceFingerprint` 前/后；`release:shape` | `pack-source.mjs` |
| C15-4 | `--allow-stale` 不要求理由，warn 后仍 PASS | 临时改 `README.shipped` → `release:shape --allow-stale` | `tools/release/shipped-shape.mjs` |
| C15-5 | `REQUIRED_SHIPPED` 只查存在性，不查非空/可解析；空 `content/charters/ceo.md` 仍 PASS | 合成 entries + 空 read | `checkShippedPackage` |
| C15-6 | catalog 对不可读 meta/ledger 抛 EACCES（不 warning） | 临时 home + chmod 000 | `regenerateCatalog` |
| C15-7 | catalog 对不可读 final 仍算 `final:true`，warnings 空 | 临时 home + chmod 000 | 同上 |
| C15-8 | 缺 revision 时只保护 completed/deleted；旧 pending 仍可把 in_progress 打回 pending | 纯函数最小输入 | `teamWithEventTasks` |
| C15-9 | 未知 member phase 事件板落 inactive、live 落 unknown | 纯函数对照 | `presenceFromEvents`/`rowsFromTeamView` |
| C15-10 | message.content 缺失（部分事件）抛 `content is not iterable` | 纯函数最小事件 | `presenceFromEvents` |

## 预检坐标（只读，2026-11-18；起点，不是结论）

| # | 载体 | 预检看到什么 | 轴 | 首轮怎么证伪 |
|---|---|---|---|---|
| 1 | tarball `content/` | 过滤 `content/templates/prd.md` 后 checker 仍 `[]` | H1 | 真实 tarball 过滤 entry；[BUG-233](../fixed_bugs/BUG-233-required-shipped-misses-runtime-content.md) |
| 2 | tarball `presets` + `package.json` | patch/preset 裁到 6 条仍 `[]` | H2 | 裁剪 patch + entries；[BUG-234](../fixed_bugs/BUG-234-preset-set-completeness-unchecked.md) |
| 3 | `pack-source.mjs` | `README.md` 在 `PACKAGE_SOURCE_FILES`；改 dev README 指纹 `28a0649c→267257dd` | H3 | 前后指纹；[BUG-235](../fixed_bugs/BUG-235-source-fingerprint-includes-dev-readme.md) |
| 4 | `release:shape` | `--allow-stale` 无理由仍 PASS（WARN + exit 0） | H4 | 临时改 README.shipped；[BUG-236](../fixed_bugs/BUG-236-allow-stale-no-reason.md) |
| 5 | `checkShippedPackage` | 空 `content/charters/ceo.md` 仍 `[]`（只查 entry 存在） | H1/H4 | 合成 entries；[BUG-237](../fixed_bugs/BUG-237-required-shipped-empty-file.md) |
| 6 | `catalog.ts` | chmod 000 meta.md → EACCES；ledger 同 | H5 | 临时 home；[BUG-238](../fixed_bugs/BUG-238-catalog-unreadable-throws.md) |
| 7 | `catalog.ts` | chmod 000 final.md → entry final true，warnings `[]` | H5 | 临时 home；[BUG-239](../fixed_bugs/BUG-239-catalog-unreadable-final-silent.md) |
| 8 | `presence.ts` | in_progress 无 revision + 旧 pending → merged pending | H6 | 纯函数；[BUG-240](../fixed_bugs/BUG-240-team-event-reopens-in-progress.md) |
| 9 | `presence.ts` | 未知 phase 事件板 inactive vs live unknown | H6 | 纯函数；[BUG-241](../fixed_bugs/BUG-241-presence-unknown-phase-diverges.md) |
| 10 | `presence.ts` | `content` 缺失 → `content is not iterable` | H6 | 纯函数；[BUG-242](../fixed_bugs/BUG-242-presence-message-content-missing.md) |

## 方法（每轮固定）

0. **先审修复**：读 C14 修复 commit/Note/新 spec，列「新判据声称的拒绝分支」；逐条找它没覆盖的输入形状。
1. **真实 tarball 优先**：H1/H2 用 `readTarball` 的 entries 过滤/裁剪，不用合成包；合成包只用于 H4/H5 的边界。
2. **不可读形状**：chmod 000 的 meta/ledger/final；退出码/warnings/entries 三面判；不把抛异常当「安全」。
3. **部分 wire**：纯函数最小事件/视图；与 live 读模型对照（同输入两语义）。
4. **判决 + 证据**：每格 PASS/FAIL/未证；FAIL 开卡（BUG-233 起）；证据落 `runtime/tmp/c15/`（gitignored）。
5. **回填**：本卡 `## Round 103/104`；同步两张索引；`pnpm verify` ALL PASS。

## 轮次与停止

| 轮 | 轴 | 内容 | 成本 |
|---|---|---|---|
| Round 103 | H1 / H2 / H3 / H4 | 真实 tarball 关键件/组合集合/指纹/降级；空文件 | keyless 静态，90 分钟 |
| Round 104 | H5 / H6 | catalog 不可读；presence 部分 wire | keyless 临时 home + 纯函数，90 分钟 |

**停止规则：** 至少 10 张或 2 轮无新材料；用户叫停优先。C12–C14 已收口的不重开。

## 证据、判据与处置

- **oracle 阶梯**：真实 tarball 字节 > 源码指纹/源码树 > 临时 companyHome 的派生 > 纯函数最小输入 > 仓库内 `pnpm test`（底线）。
- **载体分类**：shipped（tarball/manifest/README.shipped）、source（pack 源码/内容）、disk（companyHome）、runtime-wire（TeamView/事件）。只有 shipped/disk/runtime-wire 可判运行面缺陷；source 只作构造输入。
- **三种误判**：① 把「当前 tarball PASS」当「完整集合已证」；② 把「抛异常」当「已拒绝」；③ 把「类型必填」当「真实 wire 必填」。
- **处置**：材料性 → BUG 卡；非材料性 → 观察 + owner；不修产品代码。

## 验收标准

1. H1–H6 每轴至少一轮，或逐项写未跑 + owner；每轮有期望 vs 实测与证据坐标。
2. 每个 checker 结论有真实 tarball/合成包的反向样本；每个 disk 结论有退出码/warnings；每个 wire 结论有 live 对照。
3. 至少 10 张 BUG 卡（233 起），全部 `调查中`，不修产品代码。
4. 回填 `## Round 103/104`，更新两张索引；`pnpm verify` ALL PASS；`pnpm test` 绿。
5. 不把「新 spec 绿」写成「新门禁完备」；不把「当前 tarball 137 entries」写成「运行时全集已证」。

> 阶段限定：第 3 条是立卡时的研究阶段判据（只开卡、不修）；修复轮由用户另行授权，落点见 `## 落地证据`。

## 落地证据

- C15-1..10 的修复落点：`tools/lib/release/shipped-shape.mjs`、`tools/lib/core/pack-source.mjs`、`packages/company-pack/src/host/ledger/catalog.ts`、`packages/company-pack/src/lib/presence/presence.ts`、`packages/company-pack/src/lib/shared/text.ts` + 三份 spec；提交 `56e4f986`；10 张 BUG 卡迁 [fixed_bugs](../fixed_bugs/README.md)（`40fa86dd`）。
- 决策记忆 = [C15 批次 Note](../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)。
- 归档复核（2026-11-18 实跑）：10 项负控逐一复验——缺 `content/templates/prd.md` → `manifest: 缺关键运行时件`；patch 裁 6 条 → 4 条组合目标缺失；空 charter → `关键运行时件为空`；dev README 改后指纹不变、`README.shipped.md` 改后指纹变化；`--allow-stale` 裸旗标 exit 1；`pnpm release:shape` PASS（137 entries）；三份 C15 spec 98 passed。
- 归档复核（2026-11-18，独立只读子代理）：0 BLOCKER；建议 = S1/S3–S5 原始清单未在仓内留档、复核日志在 gitignored `runtime/tmp`、验收标准 3 需阶段限定。
- 立卡基线（实跑）：`pnpm test` 262 files / 2237 tests（C14 修复 Note）；`pnpm verify` ALL PASS；`pnpm release:shape` PASS；`_dist` 137 entries。
- 立卡时预检（修复前，实跑）：过滤 template 后 checker `[]`；patch 裁 6 条后 `[]`；dev README 指纹变化；allow-stale 无理由 PASS；catalog chmod 000 三例；presence 三例。

## 关闭条件

- H1–H6 每轴至少一轮，或逐项写未跑原因；C15-1..C15-10 全部判决。
- 2 轮内无新材料 → 收口；未跑面保留并标 owner。
- 所有 finding 已分诊（BUG 卡/观察/deliberate）；不写「没有 bug」。
- `pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## Round 103（2026-11-18 · H1–H4 · 关键件 / 集合 / 指纹 / 降级）

**状态：** keyless 静态 + 真实 tarball；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C15-1 REQUIRED 缺 templates/contracts/methods | **confirmed** | 真实 tarball 过滤 `content/templates/prd.md` → checker `[]` → [BUG-233](../fixed_bugs/BUG-233-required-shipped-misses-runtime-content.md) |
| C15-2 patch/preset 集合不完整 | **confirmed** | patch 裁到 6 条 + 只留对应 preset → checker `[]` → [BUG-234](../fixed_bugs/BUG-234-preset-set-completeness-unchecked.md) |
| C15-3 sourceFingerprint 含 dev README.md | **confirmed** | 改 dev `README.md`：指纹 `28a0649c63b6 → 267257dd3ac8`；`_dist` 未变 → [BUG-235](../fixed_bugs/BUG-235-source-fingerprint-includes-dev-readme.md) |
| C15-4 --allow-stale 无理由仍 PASS | **confirmed** | 临时改 `README.shipped.md` → `WARN …（--allow-stale 未给理由）` + `PASS` + exit 0 → [BUG-236](../fixed_bugs/BUG-236-allow-stale-no-reason.md) |
| C15-5 REQUIRED 只查存在性 | **confirmed** | 空 `content/charters/ceo.md` + 满 entries → checker `[]` → [BUG-237](../fixed_bugs/BUG-237-required-shipped-empty-file.md) |

**负控/实跑：** 真实 tarball `readTarball` 过滤/裁剪；`release:shape` 临时改 README.shipped 后 `--allow-stale`。

## Round 104（2026-11-18 · H5–H6 · catalog 不可读 / presence 部分 wire）

**状态：** keyless 临时 companyHome + 纯函数；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C15-6 catalog 不可读 meta/ledger 抛 EACCES | **confirmed** | chmod 000 meta.md → `THREW EACCES`；ledger 同 → [BUG-238](../fixed_bugs/BUG-238-catalog-unreadable-throws.md) |
| C15-7 catalog 不可读 final 静默 present | **confirmed** | chmod 000 final.md → entry 仍进、warnings `[]` → [BUG-239](../fixed_bugs/BUG-239-catalog-unreadable-final-silent.md) |
| C15-8 缺 revision 的 in_progress 可被打回 pending | **confirmed** | `teamWithEventTasks` 输出 `status:'pending'` → [BUG-240](../fixed_bugs/BUG-240-team-event-reopens-in-progress.md) |
| C15-9 未知 phase 两读模型分叉 | **confirmed** | 事件板 `inactive` vs live `unknown` → [BUG-241](../fixed_bugs/BUG-241-presence-unknown-phase-diverges.md) |
| C15-10 message.content 缺失抛 | **confirmed** | `THREW content is not iterable` → [BUG-242](../fixed_bugs/BUG-242-presence-message-content-missing.md) |

**证据坐标：** `runtime/tmp/c15-*.test.mjs`、`runtime/tmp/c15-allow-stale.log`、`runtime/tmp/c15-verify-*.log`。

## 判决汇总

| ID | 判决 | BUG |
|---|---|---|
| C15-1..5 | confirmed | 233..237 |
| C15-6..10 | confirmed | 238..242 |

**本轮共开 10 张 P2 卡（BUG-233..242）**，已全部修复并迁 [fixed_bugs](../fixed_bugs/README.md)（`56e4f986` / `40fa86dd`）。未跑面 = 真入口
`company-entry`/`client-load` 重跑、真实 wire/UI、无 pnpm 安装环境；没有「新门禁完备」的结论。

## 执行记录

- 2026-11-18 ｜ 立卡（C15）｜ 本卡 + bugs/README + issues/README ｜ 预检 10 条（关键件/组合集合/指纹/allow-stale/空文件/catalog×2/presence×3）｜ `pnpm verify` ALL PASS ｜ Round 103–104 待跑。
- 2026-11-18 ｜ Round 103–104 ｜ `runtime/tmp/c15-*` ｜ 关键件缺失/组合裁半/指纹含 dev README/allow-stale 无理由/空关键件/catalog 不可读×2/in_progress 回退/phase 分叉/缺 content 共 10 项 confirmed ｜ 10 张 BUG-233..242（调查中，不修） ｜ `pnpm verify` ALL PASS；`pnpm test` 262/2237 ｜ 真入口未重跑。
- 2026-11-18 ｜ 修复与归档 ｜ 10 张 BUG 全部修复（`56e4f986`）并迁 fixed_bugs（`40fa86dd`）；本卡复核 10 项负控仍绿 ｜ `pnpm release:shape` PASS；三份 C15 spec 98 passed；`pnpm verify` ALL PASS ｜ 审查：agent（独立盲审）。
