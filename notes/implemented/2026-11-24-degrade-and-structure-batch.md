状态：implemented（2026-11-24）；批准：用户 2026-11-24 指令「修最新一批缺陷」并建批次 goal 推进｜上游 = [BUG-377](../../_backlog/_archive/fixed_bugs/BUG-377-gov-export-drops-ledger-snapshot-on-missing.md)、[BUG-378](../../_backlog/_archive/fixed_bugs/BUG-378-record-stamp-rollover-deletes-corrupt-archive.md)、[BUG-379](../../_backlog/_archive/fixed_bugs/BUG-379-load-records-throws-on-unreadable-file.md)

# BUG-377..383 批次收口：降级边界与结构判据

## 决定

1. **单源缺失/单文件失败只降级，不毁数据、不整盘抛（[BUG-377](../../_backlog/_archive/fixed_bugs/BUG-377-gov-export-drops-ledger-snapshot-on-missing.md) / [BUG-379](../../_backlog/_archive/fixed_bugs/BUG-379-load-records-throws-on-unreadable-file.md)）**：
   `exportGovernance` 的 `missing` 与 `corrupt/unsupported` 同处理——有旧 `ledger.json` 就带进 staging 并给一条 warning，
   真正从未导出过才静默；`loadRecords` 把 `readFileSync` 包 try，读失败计入 `broken` 继续，`/cultivation check|archive` 不再整条崩。
2. **日期合法性看往返（[BUG-378](../../_backlog/_archive/fixed_bugs/BUG-378-record-stamp-rollover-deletes-corrupt-archive.md)）**：
   `recordStampOf` 在 `new Date` 后回读 `getFullYear/getMonth/getDate/getHours/getMinutes/getSeconds`，任一分量不等即 `null`；
   `00 月/13 月/61 日/99 时` 这类「形状对、日期不存在」的文件名不再被 purge/archive 当成有效时间。
3. **标题层级与 tools/退役词结构一致（[BUG-380](../../_backlog/_archive/fixed_bugs/BUG-380-required-sections-heading-level-mismatch.md) / [BUG-381](../../_backlog/_archive/fixed_bugs/BUG-381-tools-meta-parsers-fence-blind.md) / [BUG-382](../../_backlog/_archive/fixed_bugs/BUG-382-retired-word-scan-fence-blind.md)）**：
   `sectionRange`/`sectionStructuralText` 增加 level（默认 2），delivery 按 needle 的 `#` 数量透传；
   tools 新增 `markdown-lines.mjs`（结构行孪生）+ `meta-fields.mjs`，`parseMeta`/`converge.metaField` 只读结构行，与 core 对拍；
   `checkRequirements` 的退役词/区间断言只扫结构行并剥行内代码，正文仍判红。
4. **人工 false 是一等结论（[BUG-383](../../_backlog/_archive/fixed_bugs/BUG-383-presented-false-overridden-by-slug-after-archive.md)）**：
   不写 `slugs[slug]=false`（会污染同 slug 的新成品，与既有契约冲突），改在账本加 `dirVeto[目录名]=false`；
   `presentedOf` 的顺序 = 精确 path → 目录否决 → slug 背书 → 旧目录名回退。目录名在 live→archive 迁移中稳定。

## 输掉的方案

- **把 missing 整段合并进 corrupt 分支**：corrupt 无旧快照也 warning，missing 无旧快照必须静默；两者共享「复制旧件」动作但告警条件不同，抽 `carryOldLedger()` 而不是合并整段。
- **recordStampOf 只加范围检查（月 1–12、日 1–31）**：`20260231` 仍在范围内却不存在；往返比较同时覆盖闰年与时分秒越界，和 `isCalendarDate` 同一判据思路。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 导出快照保留 | [`exportGovernance`](../../packages/company-pack/src/host/ledger/governance-export.ts) | `tests/host/ledger/governance-export.spec.ts` 五态组合 |
| 记录时间戳 | [`recordStampOf`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts) | purge/archive 消费；表驱动用例 |
| 记录目录读取 | [`loadRecords`](../../packages/company-pack/src/host/cultivation/cultivation-storage.ts) | `/cultivation check|archive` 消费；EACCES 用例 |
| 标题层级定位 | [`sectionStructuralText`](../../packages/company-pack/src/lib/docs/markdown-shape.ts) | delivery 按 needle 层级透传 |
| 审计否决延续 | [`dirVeto`](../../packages/company-pack/src/host/ledger/presented-ledger.ts) | `setPresentedAudit` 写入、`presentedOf` 读取 |
| tools 结构行 | [`structuralLines`](../../tools/lib/company/markdown-lines.mjs) | `parseMeta`/`metaFieldFromText` 消费；与 core 对拍 |

## 验证（真跑过）

- **U1**：`pnpm test tests/host/ledger/governance-export.spec.ts tests/lib/cultivation/cultivation.spec.ts tests/host/cultivation/cultivation-maintenance.spec.ts` —— 还原前 4 failed（旧快照丢失 / 坏日期删除 / EACCES 抛）；修复后 40/40 passed。
- **U2**：`pnpm test tests/host/commands/delivery-command.spec.ts tests/lib/docs/markdown-shape.property.spec.ts tests/tools/deliverables.spec.ts tests/tools/markdown-lines-parity.spec.ts tests/lib/docs/requirements-check.spec.ts` —— 还原层级透传/逐行首现/裸全文扫描时分别红；修复后 84/84、联动 tools+host+lib 617/617。
- **U3**：`pnpm test tests/host/ledger/catalog.spec.ts` —— 还原前 1 failed（归档后旧 true 翻案）；修复后 43/43 passed。
- **盲审复审**：`pnpm test tests/tools/markdown-lines-parity.spec.ts tests/host/ledger/catalog.spec.ts` —— 12/12 与 47/47；全量 `pnpm test` 2790/2790、`coverage-ratchet` PASS。
- `pnpm verify` ALL PASS。

## 独立只读盲审（378/381/383）

2026-11-24 由无本次历史上下文的只读子代理审 `db1fbb11` / `6dd7676c` / `b5a3ea4b`：**BLOCKING**（2 条），全部处置：
1. **阻断 · 383** `setPresentedAudit` 的 `next` 从零重建（只带 paths/slugs），每次写入丢掉 `base.dirVeto`/`dirSlugs`；连续否决两个目录后只剩最后一个，归档旧否决就消失 → 改为 `{ ...base, schema, updatedAt, paths, slugs }` 保留历史，并补「两次 false + 归档各保留」用例。
2. **阻断 · 381** tools 结构行孪生与 core 在「行内 `<!--` 开启块注释」与「孤立首行 `---`」两处不一致（实测 core `110011` vs 孪生 `111111`；`---\ntype` core `111` vs 孪生 `000`）→ 孪生改为「有闭合 `---` 才算 frontmatter」「整行以注释开头才非结构、行中开注释保留前文」，两条探针进对拍 DOCS。
3. 378 复审通过：00/13 月、32 日、24 时、<100 年均被往返拒绝；DST 春令缺失时刻会返回 null（记录不归档/不清理），秋令重复时刻取较早实例——已登记。

## 未覆盖轴

- [covered] missing 有/无旧快照两态、bad stamp 表驱动、不可读记录 → 去向：[governance-export.spec.ts](../../tests/host/ledger/governance-export.spec.ts) / [cultivation.spec.ts](../../tests/lib/cultivation/cultivation.spec.ts) / [cultivation-maintenance.spec.ts](../../tests/host/cultivation/cultivation-maintenance.spec.ts)
- [policy] purge 对「不可读但时间戳合法」的文件仍计 failed 跳过（不删），不新增 unreadable 计数 → 去向：[cultivation-storage.ts](../../packages/company-pack/src/host/cultivation/cultivation-storage.ts)
- [policy] recordStampOf 用本地时间往返：DST 春令缺失的 02:xx 返回 null（不归档/不清理），秋令重复的 01:xx 取较早实例（约 1h 偏差）→ 去向：[cultivation-record.ts](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts)
