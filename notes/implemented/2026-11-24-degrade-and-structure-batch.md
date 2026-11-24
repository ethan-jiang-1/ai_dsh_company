状态：implemented（2026-11-24）；批准：用户 2026-11-24 指令「修最新一批缺陷」并建批次 goal 推进｜上游 = [BUG-377](../../_backlog/_archive/fixed_bugs/BUG-377-gov-export-drops-ledger-snapshot-on-missing.md)、[BUG-378](../../_backlog/_archive/fixed_bugs/BUG-378-record-stamp-rollover-deletes-corrupt-archive.md)、[BUG-379](../../_backlog/_archive/fixed_bugs/BUG-379-load-records-throws-on-unreadable-file.md)

# BUG-377..383 批次收口：降级边界与结构判据

## 决定

1. **单源缺失/单文件失败只降级，不毁数据、不整盘抛（[BUG-377](../../_backlog/_archive/fixed_bugs/BUG-377-gov-export-drops-ledger-snapshot-on-missing.md) / [BUG-379](../../_backlog/_archive/fixed_bugs/BUG-379-load-records-throws-on-unreadable-file.md)）**：
   `exportGovernance` 的 `missing` 与 `corrupt/unsupported` 同处理——有旧 `ledger.json` 就带进 staging 并给一条 warning，
   真正从未导出过才静默；`loadRecords` 把 `readFileSync` 包 try，读失败计入 `broken` 继续，`/cultivation check|archive` 不再整条崩。
2. **日期合法性看往返（[BUG-378](../../_backlog/_archive/fixed_bugs/BUG-378-record-stamp-rollover-deletes-corrupt-archive.md)）**：
   `recordStampOf` 在 `new Date` 后回读 `getFullYear/getMonth/getDate/getHours/getMinutes/getSeconds`，任一分量不等即 `null`；
   `00 月/13 月/61 日/99 时` 这类「形状对、日期不存在」的文件名不再被 purge/archive 当成有效时间。

## 输掉的方案

- **把 missing 整段合并进 corrupt 分支**：corrupt 无旧快照也 warning，missing 无旧快照必须静默；两者共享「复制旧件」动作但告警条件不同，抽 `carryOldLedger()` 而不是合并整段。
- **recordStampOf 只加范围检查（月 1–12、日 1–31）**：`20260231` 仍在范围内却不存在；往返比较同时覆盖闰年与时分秒越界，和 `isCalendarDate` 同一判据思路。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 导出快照保留 | [`exportGovernance`](../../packages/company-pack/src/host/ledger/governance-export.ts) | `tests/host/ledger/governance-export.spec.ts` 五态组合 |
| 记录时间戳 | [`recordStampOf`](../../packages/company-pack/src/lib/cultivation/cultivation-record.ts) | purge/archive 消费；表驱动用例 |
| 记录目录读取 | [`loadRecords`](../../packages/company-pack/src/host/cultivation/cultivation-storage.ts) | `/cultivation check|archive` 消费；EACCES 用例 |

## 验证（真跑过）

- **U1**：`pnpm test tests/host/ledger/governance-export.spec.ts tests/lib/cultivation/cultivation.spec.ts tests/host/cultivation/cultivation-maintenance.spec.ts` —— 还原前 4 failed（旧快照丢失 / 坏日期删除 / EACCES 抛）；修复后 40/40 passed。
- `pnpm verify` ALL PASS。

## 未覆盖轴

- [covered] missing 有/无旧快照两态、bad stamp 表驱动、不可读记录 → 去向：[governance-export.spec.ts](../../tests/host/ledger/governance-export.spec.ts) / [cultivation.spec.ts](../../tests/lib/cultivation/cultivation.spec.ts) / [cultivation-maintenance.spec.ts](../../tests/host/cultivation/cultivation-maintenance.spec.ts)
- [policy] purge 对「不可读但时间戳合法」的文件仍计 failed 跳过（不删），不新增 unreadable 计数 → 去向：[cultivation-storage.ts](../../packages/company-pack/src/host/cultivation/cultivation-storage.ts)
