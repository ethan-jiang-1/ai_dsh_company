---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-149：cultivation / revoke-journal / upgrade log 仍直拼 `.dsh-company`；根 symlink 时 records/methods/log 写 workspace 外

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（cultivation/log 根）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3/C1 / 状态根 residency）
> **留痕**：Note [2026-11-13-last-direct-writers](../../../notes/implemented/2026-11-13-last-direct-writers.md)

## 症状

`.dsh-company` 指向 workspace 外，记录路径仍在根下：

```js
ws/.dsh-company -> outside
records = join(ws, '.dsh-company/cultivation/records')
nodeCultivationStorage.writeRecord(records, draft)
→ wrote 20261113-043137-bdi9
→ outside/cultivation/records/20261113-043137-bdi9.md exists true
```

`writeRecord` 有 write-gate（A 已加 `assertCompanyWritesAllowed`），但 `ensureRecordsDirectory`/`writeNewFile` 仍直接 `mkdir`/`writeFileSync`，跟随根 symlink；合法 host 上会把培养记录写进外部目录。同根：
- `installMethod` / `updateRecord` / `archiveRecord`（`cultivation-storage`）；
- `revoke-journal` 的 `.pending-revoke.json`；
- `appendUpgradeLog` 的 `workspace/.dsh-company/logs/company-pack-upgrade.log`。

BUG-129 的 company-root 修复覆盖 catalog/startup/presented/bootstrap；BUG-144 的 write-gate 覆盖 blocked；本卡是**未迁移的 cultivation/log 直写 + 根 symlink**。BUG-147/148 是 export/bundle 同族。

## 根因（假设）

- `cultivation-storage` 的路径是 `join(workspace,'.dsh-company',...)`；只做父目录 lstat（records 父）而不校验 `.dsh-company` 根本身。
- `revoke-journal`/`appendRotatingLine` 直接 `writeFileSync`/append，无 company-root。
- 写 gate 与 residency 仍是两套；旧模块只拿到 gate。

## 暴露的失败类

**根 residency 迁移按模块而非按写入口**：company-root 只改了「新 helper 消费方」，cultivation/log 仍用旧 join；根 symlink 时 gate 允许就写外。必须扫所有 `.dsh-company` join 并统一 root。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-cultivation-root-symlink.mts
```

2026-11-13 输出：

```
wrote 20261113-043137-bdi9 outside record true inside true
```

（inside 也是 symlink 目标，outside true 是实际落点。）

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `cultivation-storage` 的 `ensureRecordsDirectory`/`ensureMethodRoot`/write/update/archive 全部用 `ensureCompanyRoot(workspace)` + `ensureCompanyDir`；根 symlink → typed warning/error，不写。
- `revoke-journal`、`appendUpgradeLog` 同款；`appendUpgradeLog` 失败不应拖累 boot。
- 加 spec：根 symlink→外部/内部；writeRecord/installMethod/archive/revoke journal/log 外部字节不变；正常根仍写。
- 与 BUG-147/148 一起做最后一轮 `grep 'join(.*\\.dsh-company'` 全量迁移。

## 修复关联

- 发现于 BUG-148（bundle）后的 C1 cultivation 检查；与 [BUG-147](BUG-147-export-governance-symlink-root-writes-outside.md) / [BUG-148](BUG-148-bundle-manifest-root-symlink-writes-outside.md) 同族。
- 相关：`src/host/cultivation/cultivation-storage.ts`、`revoke-journal.ts`、`logging/rotating-log.ts`。

## 已修判定

修成：cultivation-storage 增加 `assertCompanyResidency`（`.dsh-company` 根/父目录逐级 lstat），在 `ensureRecordsDirectory` 的最早 mkdir 前就拒绝；write/update/archive/purge/installMethod 全接。`revoke-journal` 改 `readCompanyText/writeCompanyAtomic`；`appendRotatingLine` 对公司盘路径先 `ensureCompanyDir`。
- keyless：根 symlink→外部 → `writeRecord`/`writePendingRevoke`/`appendRotatingLine` 都抛 symlink、外部无 `cultivation/` 或 `logs/`；红证：删 `ensureRecordsDirectory` 的 residency → 1 failed。
