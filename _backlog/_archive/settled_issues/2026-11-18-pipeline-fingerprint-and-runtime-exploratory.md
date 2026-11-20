---
status: 已结
opened: 2026-11-18
---

# 推敲：门禁管线的指纹边界 + 更低置信运行态（C16）

> 立卡：2026-11-18 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent（独立盲审）— 2026-11-20 独立只读子代理复核：20 张 BUG-243..262 已修且证据齐（`21ff3ee7`）、去向 Note 成立，无假交付；判决账按同日订正节改为「6 条直接判决/覆盖、4 条部分覆盖、10 条未跑」，不把未跑写成已覆盖；差额复核 approve-with-notes（0 阻断，文字 note 已处置）
>
> **结论/去向**：implementation — 本卡执行 C16 的探索与证据（缺陷另开 `_backlog/bugs/` 卡；编号唯一源 = [bugs/README](../../bugs/README.md) 的 Next，2026-11-18 = 243）；本卡不改产品代码。决策记忆 = [C16 修复批次 Note](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)；产出 20 张 BUG-243..262 全部已修并迁 [fixed_bugs](../fixed_bugs/)。
>
> **收口（2026-11-20）**：Round 105–107 跑完，20 张 P2 卡由 2026-11-18 修复轮修复（`21ff3ee7`）并迁 [fixed_bugs](../fixed_bugs/)（`29783733`）；`release:shape` PASS、`pnpm verify` ALL PASS、`pnpm test` 262/2281（修复批次实测）。判决账与未跑面见下方「判决账订正」：首轮 20 条假设中 6 条有直接判决/覆盖（1/2/3/5/13/19）、4 条部分覆盖（4/14/15/17）、10 条未跑（6..12/16/18/20；G5 cultivation、G6 命令层整轴未跑），owner = 下一轮探索卡/用户点名。Round 102 式真入口重跑未做，两 lane 由修复批次补跑（见 Note）。
>
> **授权边界**：静态 / tarball / 合成包 / 纯函数 / 临时 home 可自主；不修产品代码；不改 vendor；`_dist` 只读。
>
> **前序**：[C15 卡](2026-11-18-guard-closure-and-unreadable-inputs.md) 的 10 张（BUG-233..242）已由 2026-11-18 修复轮收口。C15 修复 Note 自己留了一个未修轴：**sanitizer/`export-dist` 本身决定 tarball 字节，但不在 `sourceFingerprint` 内；只改 sanitizer 时 `release:shape` 仍可能给旧包盖章**。本卡从这条「自认的洞」开始，扩到更低置信的运行态。

## 问题与期望结果

C14/C15 把「发布面」拆成 source shape（`shipped-links`/`checkSourceShape`）、真实 tarball（`release:shape`）、sanitizer（`export-dist`）三层。三层各有自己的输入指纹/判据，但**没有一层证明「tarball 由当前 sanitizer + 当前源构建」**：

- `sourceFingerprint` 只覆盖 pack 源（presets/content/locale/src/package.json/cordis/README.shipped…），不含 `tools/lib/release/shipped-shape.mjs`、`tools/release/export-dist.mjs`、`tools/lib/core/pack-source.mjs` 自身；
- `checkSourceShape` 只看源码树，不读 `_dist`；
- `checkShippedPackage` 只看 tarball 字节，不读源码。

这一轮还要打 **lease/run-bundle、cultivation/ledger、client/commands、content/presets** 里那些「类型/夹具假设完整输入」的读模型——它们比发布面更少被系统性对抗。

**期望结果：** 每条结论有「声明/输入 → 实盘/合成 → 负控」；对「门禁自己」的结论必须有反向样本；对运行态用最小纯函数/临时 home。至少 20 张，不写「已完备」。

**当前基线（2026-11-18 13:40）：** version 0.11.9；HEAD `40fa86dd`；`_dist` 137 entries；`pnpm release:shape` PASS；`pnpm test` 预期 262 files / 2252 tests（C15 修复 Note）；active BUG-212。

## C16 的七条轴

| ID | 轴 | 问题 | oracle |
|---|---|---|---|
| G1 | **管线指纹** | sanitizer/export-dist/pack-source 自身不在 sourceFingerprint；只改它们时 `_dist` 假新鲜 | 改 sanitizer → `release:shape` 仍 PASS；源码/tarball 对照 |
| G2 | **关键件/schema/组合** | REQUIRED_SHIPPED 43 条仍是策展集合；JSON 只 parse 不验 schema；EXPECTED_PATCH 12 条手写 | 真实 tarball 替换空 `{}` / 新文件；补源侧读取面 |
| G3 | **降级/CI** | `--allow-stale=理由` 的理由是否可任意；CI 分支是否真禁用 | CLI 实跑 + 代码分支 |
| G4 | **lease / run-bundle** | 坏 lease JSON/旧 PID/身份备份/id 校验/跨 workspace | 临时 home + `acquireCompanyLease`/`planBundleManifest` |
| G5 | **cultivation / ledger** | 坏记录/坏 journal/导出中断/账本降级/迁移 | 临时 companyHome + 纯函数/命令面 |
| G6 | **client / commands** | `/req`/`/prd`/`/delivery` 的 content 读取/路径/空值；读模型部分输入 | 临时 content + 纯函数；命令层 |
| G7 | **content / presets / 门禁** | 运行时技能/模板/命令引用；新门禁空扫/宽面/计数 | 静态扫描 + gate 负控 |

## 首轮假设（先写死，2026-11-18）

| ID | 假设 | oracle | 入口 |
|---|---|---|---|
| C16-1 | 只改 sanitizer/export-dist，`sourceFingerprint` 不变，`release:shape` 仍 PASS（旧 `_dist` 盖新章） | 改 `tools/lib/release/shipped-shape.mjs` 一行 → 指纹/CLI | `pack-source.mjs`、`release:shape` |
| C16-2 | `REQUIRED_SHIPPED` 的 JSON 只 `JSON.parse`，`{}` 也 PASS；运行时缺字段无人知 | 真实 tarball 替换 `delivery-rules.json` 为 `{}` | checker |
| C16-3 | `REQUIRED_SHIPPED` 仍漏 `src` 实际读取的某个 content 文件（新增读取点未同 diff 加 sentinel） | 源读取面 × REQUIRED 集合求差 | `src` grep + checker |
| C16-4 | `EXPECTED_PATCH` 12 条手写；新增/可选 preset 不被要求，或顺序/重复不判 | 合成 package patch 增加/重复 | checker |
| C16-5 | `--allow-stale=任意字符串` 即可通过；CI 只认 `process.env.CI` 的 truthiness | 临时改 README.shipped + flag | CLI |
| C16-6 | `lease` 对坏 JSON/非对象/缺 token/旧 PID 的降级有漏洞（挂起/误抢） | 临时 home + `acquireCompanyLease` | `lease.ts` |
| C16-7 | bundle v3 `id` 仍不校验，或 identityBackupPath 对坏 id 写穿 | 临时 home + `planBundleManifest` | `bundle-manifest.ts` |
| C16-8 | `bootstrap` 对 content seed/state 文件是目录/空/坏 JSON 的降级不完整 | 临时 content + `planBootstrap` | `bootstrap.ts` |
| C16-9 | cultivation `check/revoke/archive` 对坏 records/journal 的 warning/状态不一致 | 临时 home + lib/host | `cultivation.ts` |
| C16-10 | governance export/账本导出对中断/坏目录/symlink 的原子性漏洞 | 临时 home | `governance-export.ts` |
| C16-11 | `/req` `/prd` `/delivery` 对 content 目录/文件缺失/空 JSON 的报错不可读或误通过 | 临时 content + 命令函数 | `req-command.ts` 等 |
| C16-12 | client 读模型对 `ownerName` 重复/任务 revision 乱序/未知 status 仍有撒谎 | 纯函数最小输入 | `presence.ts`/`board.ts` |
| C16-13 | `content`/`presets` 的运行时技能仍引用不随包的命令/路径（新门禁漏面） | 静态扫描 + `shipped-links` | `content/**`、`presets/**` |
| C16-14 | 新 `shipped-links` 的 `checkSourceShape` 只判存在/parse，不判 schema/空目录/宽 glob | 合成源码树 | `checkSourceShape` |
| C16-15 | `REQUIRED_SHIPPED` 43 条与 `EXPECTED_PATCH` 12 条是两份手写清单，新增/迁移时漂移 | 源/盘/清单三方对账 | checker |
| C16-16 | 真实 tarball 的 `release:shape` 与源码侧 `checkSourceShape` 对同一文件可能给出不同结论 | 改源/改 tarball 的差异样本 | 两入口 |
| C16-17 | `catalog` 对 `catalog.json` 自身坏形状（symlink/目录/不可读）仍可能覆盖/静默 | 临时 home | `catalog-state.ts` |
| C16-18 | `presented-ledger` 对坏 JSON/重复 observation/超大文件的降级/内存边界 | 临时 home | `presented-ledger.ts` |
| C16-19 | `content/manifest.json` 与实际 content 文件不一致（清单少/多/坏）没有判据 | 源/清单对账 | `content/manifest.json` |
| C16-20 | 新门禁 `shipped-links`/`shipped-shape` 的扫描面仍有空扫/宽 glob/只扫顶层 | 负控 = 移走被扫对象 | `checks/gates/shipped-links.mjs` |

## 轮次与停止

| 轮 | 轴 | 内容 | 成本 |
|---|---|---|---|
| Round 105 | G1–G3 | 管线指纹、关键件/schema、降级/CI | keyless 静态 + CLI，90 分钟 |
| Round 106 | G4–G5 | lease/run-bundle、cultivation/ledger | 临时 home + 纯函数，120 分钟 |
| Round 107 | G6–G7 | 命令/content/presets/门禁 | keyless，90 分钟 |

**停止规则：** 至少 20 张或 3 轮无新材料；用户叫停优先。C12–C15 已收口的不重开。

## 方法（每轮固定）

0. **先审门禁自身**：C15 Note 的「未覆盖轴」与新 checker 的策展清单优先。
1. **合成/临时输入**：真实 tarball 优先；lease/ledger 用临时 home；client 用纯函数；命令用临时 content。
2. **负控**：每个「门禁已拒/未漂移」结论必须有反向样本；没有写 `unverified`。
3. **判决 + 证据**：每格 PASS/FAIL/未证；FAIL 开卡（BUG-243 起）；证据 `runtime/tmp/c16-*`（gitignored 一次性终端证据）。
4. **回填**：`## Round 105/106/107`；同步两张索引；`pnpm verify` ALL PASS。

## 验收标准

1. G1–G7 每轴至少一轮，或逐项写未跑 + owner；每轮有期望 vs 实测与证据坐标。
2. 每个门禁结论有反向样本；每个运行态结论有临时 home/纯函数最小输入；没有负控写 `unverified`。
3. 至少 20 张 BUG 卡（243 起），全部 `调查中`，不修产品代码。
4. 回填 `## Round 105/106/107`，更新两张索引；`pnpm verify` ALL PASS；`pnpm test` 绿。
5. 不把「新 spec 绿」写成「新门禁完备」；不把「当前 tarball PASS」写成「管线指纹已证」。

## 落地证据

- 本卡是探索/证据卡，不改产品代码；系统面 = 20 张 BUG 卡（`21ff3ee7` 修复，改动含 `tools/lib/release/shipped-shape.mjs`、`packages/company-pack/src/host/run-bundle/lease.ts`、`presence.ts`、`catalog.ts`）+ 批次 Note + 两张索引。
- 立卡基线：`pnpm test` 262 files / 2252 tests（C15 Note）；`pnpm release:shape` PASS；`_dist` 137 entries。
- 修复批次实测（见 Note）：`pnpm test` 262 files / 2281 tests；`pnpm verify` ALL PASS；`pnpm release:shape` PASS；`company-entry`/`client-load` ALL PASS（终端实跑，日志未留存）。
- 预检（实跑）：sanitizer 改动 vs sourceFingerprint；REQUIRED JSON `{}`；lease/catalog 坏形状；content manifest 三方对账。

## 关闭条件

- G1–G7 每轴至少一轮，或逐项写未跑原因；C16-1..C16-20 全部判决或未跑 + owner（见「判决账订正」）。
- 3 轮内无新材料 → 收口；未跑面保留并标 owner。
- 所有 finding 已分诊（BUG 卡/观察/deliberate）；不写「没有 bug」。
- `pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## Round 105（2026-11-18 · G1–G3 · 管线 / 关键件 / 降级）

**状态：** keyless 静态 + 真实 tarball + CLI；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C16-1 sanitizer 不在 sourceFingerprint | **confirmed** | 改 `tools/lib/release/shipped-shape.mjs` 注释后指纹仍 `f9eaef4dd008`，`release:shape` PASS → [BUG-243](../fixed_bugs/BUG-243-pipeline-fingerprint-sanitizer.md) |
| C16-2 JSON 只 parse | **confirmed** | delivery-rules `{}` / seed `{}` → checker `[]` → [BUG-248](../fixed_bugs/BUG-248-required-json-schema-only-parse.md)、[BUG-249](../fixed_bugs/BUG-249-seed-json-empty-object-passes.md) |
| C16-3 REQUIRED 漏运行时读取面 | **confirmed** | 过滤 generic/product document-map/delivery template/content templates → checker `[]` → [BUG-244](../fixed_bugs/BUG-244-required-shipped-misses-generic-content.md)、[BUG-245](../fixed_bugs/BUG-245-required-shipped-misses-product-docs.md)、[BUG-246](../fixed_bugs/BUG-246-required-shipped-misses-delivery-templates.md)、[BUG-247](../fixed_bugs/BUG-247-required-shipped-misses-content-templates.md) |
| C16-4 EXPECTED_PATCH/关键件只判存在/非空 | **confirmed** | 坏 YAML preset → checker `[]` → [BUG-250](../fixed_bugs/BUG-250-preset-yaml-not-parsed.md) |
| C16-5 --allow-stale 任意理由 | **confirmed** | 改 README.shipped + `--allow-stale=x` → WARN/PASS/exit 0；裸 flag exit 1 → [BUG-253](../fixed_bugs/BUG-253-allow-stale-arbitrary-reason.md) |
| 运行时 dev 命令 | **confirmed** | vp-eng persona 的 `pnpm methods:init`；`checkSourceShape` 返回 `[]` → [BUG-251](../fixed_bugs/BUG-251-persona-pnpm-methods-init.md)、[BUG-252](../fixed_bugs/BUG-252-source-shape-no-dev-command-scan.md) |

## Round 106（2026-11-18 · G4–G5 · lease / bundle / presence / catalog）

**状态：** 临时 home + 纯函数；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C16-6 不可读 live lease 被抢 | **confirmed** | chmod 000 live lock → `acquireCompanyLease` acquired true（删除锁） → [BUG-254](../fixed_bugs/BUG-254-lease-unreadable-lock-takeover.md) |
| C16-7 bundle createdAt/pack 只判存在 | **confirmed** | v3 `createdAt:'not-a-date'`/`pack:'other'` → status ok → [BUG-255](../fixed_bugs/BUG-255-bundle-created-at-invalid.md)、[BUG-256](../fixed_bugs/BUG-256-bundle-pack-mismatch.md) |
| C16-8 未知 task status 被丢弃 | **confirmed** | base pending + event `paused` → merged pending → [BUG-257](../fixed_bugs/BUG-257-presence-unknown-status-ignored.md) |
| C16-9 deleted 投影不可重开 | **confirmed** | base deleted + event pending → merged deleted → [BUG-258](../fixed_bugs/BUG-258-presence-deleted-no-reopen.md) |
| C16-10 catalog 空 final / catalog symlink | **confirmed** | 零字节 final → final:true；catalog.json symlink → 替换无 warning → [BUG-259](../fixed_bugs/BUG-259-catalog-empty-final.md)、[BUG-260](../fixed_bugs/BUG-260-catalog-json-symlink.md) |

## Round 107（2026-11-18 · G6–G7 · content manifest / 门禁面）

**状态：** 静态对账；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C16-11 content manifest 与盘面漂移 | **confirmed** | tiers 并集 50 vs 盘上 84；34 extra；无门禁 → [BUG-261](../fixed_bugs/BUG-261-content-manifest-extra-drift.md) |
| C16-12 manifest tiers 引用不校验 | **confirmed** | tiers 加 `generic/missing.md` → checker `[]` → [BUG-262](../fixed_bugs/BUG-262-content-manifest-refs-not-checked.md) |

## 判决汇总

| ID | 判决 | BUG |
|---|---|---|
| C16-1..5 | confirmed | 243..253 |
| C16-6..10 | confirmed | 254..260 |
| C16-11..12 | confirmed | 261..262 |

**判决账订正（2026-11-20 归档时）**：Round 106/107 的「C16-6..12」行与 `## 首轮假设` 表同号不同义——它们是**新发现**（lease 不可读、bundle `createdAt`/`pack`、presence 未知 status/deleted、catalog 空 final/symlink、content manifest 漂移、tiers 引用），对应 BUG-254..262，**不**构成首轮假设 C16-6..12 的判决。如实计数：C16-1/2/3/5 直接判决（Round 105）；C16-4 只测到「关键件存在/非空」（BUG-250），EXPECTED_PATCH 集合完整性未跑；C16-13 由 Round 105 未编号的「运行时 dev 命令」行覆盖（BUG-251/252）；C16-14 部分覆盖（dev-command 面 = BUG-252；schema/空目录/宽 glob 未跑）；C16-15/17 部分覆盖（BUG-244..247/260）；C16-19 由 BUG-261/262 覆盖；**C16-6..12、C16-16、C16-18、C16-20 未跑**（G5 cultivation、G6 命令层整轴未跑），owner = 下一轮探索卡/用户点名。原「20 条假设全部 confirmed」按本节更正为「20 张 BUG 卡全部成立；首轮假设 6 条有直接判决/覆盖、4 条部分覆盖、10 条未跑」。

**本轮共开 20 张 P2 卡（BUG-243..262）**，当轮全部 `调查中`、不修产品代码（2026-11-20 收口：20 张已全部修复并迁 [fixed_bugs](../fixed_bugs/)）；未跑面 = 真入口 `company-entry`/`client-load` 重跑（修复批次已补跑两 lane，见 Note）、真实 wire/UI、无 pnpm 安装环境、G5 cultivation 与 G6 命令层整轴（owner = 下一轮/用户点名）。没有「管线指纹/关键件完备」的结论。

## 执行记录

- 2026-11-18 ｜ 立卡（C16）｜ 本卡 + bugs/README + issues/README ｜ 20 条假设（管线指纹/关键件/lease/run-bundle/cultivation/ledger/commands/content/门禁）｜ `pnpm verify` ALL PASS ｜ Round 105–107 待跑。
- 2026-11-18 ｜ Round 105–107 ｜ `runtime/tmp/c16-*` ｜ 20 条假设全部 confirmed（管线指纹/4 类关键件/JSON-YAML/allow-stale/lease/bundle/presence/catalog/content manifest）（本条已被 2026-11-20 判决账订正节取代） ｜ 20 张 BUG-243..262（调查中，不修） ｜ `pnpm verify` ALL PASS；`pnpm test` 262/2252 ｜ 真入口未重跑。
- 2026-11-20 ｜ 收口归档 ｜ 判决账订正（同号不同义消歧 + 未跑 10 条列明）+ 落地证据换真实系统面 + 卡内/入链深度修正 ｜ 20 张 BUG-243..262 已修（`21ff3ee7`）并迁 fixed_bugs（`29783733`）；去向 = 批次 Note ｜ `pnpm verify` ALL PASS ｜ 审查：agent（独立盲审）。
