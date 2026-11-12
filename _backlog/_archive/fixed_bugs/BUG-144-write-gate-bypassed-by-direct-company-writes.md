---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-144：write gate 只覆盖新的 company-root 助手；`cultivation`/bundle/export 直接写盘仍绕过 `blockCompanyWrites`

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（gate 覆盖面）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / lease 写 gate）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`write-gate.ts` 提供进程级 `blockCompanyWrites()`；新的 `company-root.ts` 写助手会 `assertCompanyWritesAllowed()`。但不少公司盘写路径仍直接 `writeFileSync`/`mkdir`：

```ts
blockCompanyWrites('lease lost/test')
nodeCultivationStorage.writeRecord(records, draft)
→ wrote 20261113-034830-3x4q true
```

即：lease 已被判失效的 host 仍能写培养记录（`installMethod` 同理）。同类未走 helper 的写面：
- `cultivation-storage.ts` 的 `writeRecord` / `updateRecord` / `archive` / `installMethod`；
- `run-bundle/bundle-manifest.ts` 的 `writeBundleManifest`；
- `ledger/governance-export.ts` 的 staging/swap；
- `revoke-journal.ts`。

修复 115 的 gate 只覆盖了 catalog/startup/presented/bootstrap 等新迁路径；旧模块没迁移就会绕。

## 根因（假设）

- write gate 是**进程级函数**，不是 fs 封装；每个写模块要自己调用 `assertCompanyWritesAllowed()`。
- A 的 2026-11-13 修复先迁了 company-root 助手消费方，cultivation/bundle/export 没接。
- 数据层模块把 `writeFileSync` 封装在自己的 atomic/write 函数里，没有共享 gate。

## 暴露的失败类

**安全开关靠调用点记得调用**：`blockCompanyWrites` 能挡住新助手，挡不住旧直写；接管/blocked host 仍能写。写 gate 要么下沉到 fs 层/公司盘 writer，要么一次性迁移所有写入口并加负例。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-write-gate-cultivation.mts
```

2026-11-13 输出：

```
wrote 20261113-034830-3x4q true
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 所有公司盘写入口接 `assertCompanyWritesAllowed()`；优先把 cultivation-storage 的 `writeNewFile`/`updateRecord`/`installMethod`、bundle manifest、governance export、revoke journal 迁到 `company-root.writeCompanyAtomic`。
- 或在 cultivation/storage 模块的 fs adapter 外层加 gate，但必须覆盖所有写方法。
- 负例 spec：`blockCompanyWrites` + writeRecord/installMethod/archive/bundle/export → `CompanyWriteBlockedError`；读仍可用；unblock 后恢复。
- 与 BUG-115 的 fencing 一起验收：旧 host heartbeat 失败后，所有写都拒绝，不只是 helper 消费方。

## 修复关联

- 发现于 BUG-115/119/121 写 gate 修复的回归；与 [BUG-115](BUG-115-lease-takeover-no-fencing-old-writer.md) 同面，但本卡是 gate 覆盖面。
- 相关：`src/host/run-bundle/write-gate.ts`、`src/host/cultivation/cultivation-storage.ts`、`bundle-manifest.ts`、`governance-export.ts`。

## 已修判定

修成：把 `assertCompanyWritesAllowed()` 接到 cultivation-storage 的 writeNewFile/updateRecord/archive/purge/installMethod、bundle manifest、governance export、revoke journal；gate 不再只覆盖 company-root 助手。
- keyless：blocked 时 `writeRecord`/`installMethod`/`exportGovernance` 都抛 `CompanyWriteBlockedError`，unblock 后 writeRecord 恢复；红证：HEAD 直写路径 → 不抛（本卡复现）。
