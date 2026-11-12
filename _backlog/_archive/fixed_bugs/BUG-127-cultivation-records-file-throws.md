---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-127：培养 `records/` 是文件或 symlink 时，`/cultivation check` 与 `archive` 直接抛 `UnsafeCultivationPathError`，没有可读回执

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（check/archive 边界）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / 培养存储坏形状）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/cultivation/records` 被文件/链接替换（不是目录）时：

```
/cultivation check
→ THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records

/cultivation archive 30
→ THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
```

`commandCheck` / `commandArchive` 调 `storage.loadRecords(recordsDir)`，没有把 `UnsafeCultivationPathError` 收成 `{kind:'error',text}`；只有 `commandRevoke` 有 catch。命令以异常结束，用户拿不到「记录目录不是目录 / 是 symlink，请修复」的可操作回执，也没有 `check` 的 revoked/broken 计数。

同族：`records/` 是 symlink 时同样抛；`/cultivation propose` 的 `writeRecord` 也会抛（工具边界可能变成 generic 错误）。

## 根因（假设）

- 存储层 `recordsDirectoryState` 对「父/records 是 symlink/非目录」抛 `UnsafeCultivationPathError`（设计正确，fail closed）。
- `commandCheck` / `commandArchive` 没有在命令边界 catch 这个 typed error；`commandRevoke` 有。
- `commandCheck` 的注释说「不可达 → 错误」，只覆盖 missing，不覆盖 unsafe shape。

## 暴露的失败类

**typed 错误只在部分命令边界收口**：同一个存储异常，revoke 可读、check/archive 抛；坏形状的「可操作性」取决于调用点是否记得 catch。命令族应共享一个 `toCommandError` 包装。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-cultivation-records-file.mts
```

2026-11-13 输出：

```
check THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
archive 30 THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `commandCheck` / `commandArchive` 包 try/catch：`UnsafeCultivationPathError` → `{kind:'error', text:'记录目录不是安全目录（文件/symlink）：…，请修复后重试'}`；其他 Error 按现有边界处理。
- 抽 `withCultivationErrors(fn)` 统一命令边界；`propose` 工具也返回 `recorded:false + note`，不抛。
- 加 spec：records=文件、records=symlink、父 cultivation=symlink、missing；check/archive/revoke/propose 四种命令一致可读。

## 修复关联

- 发现于 C1 存储坏形状回归；与 [BUG-091](BUG-091-cultivation-check-revoked-broken-unsafe.md)（check 对非法 methodSlug 抛错已修）同面，但本卡是 records 根形状。
- 相关：`src/host/cultivation/cultivation.ts` 的 `commandCheck` / `commandArchive`；`cultivation-storage.ts` 的 `recordsDirectoryState`。

## 已修判定

修成：命令 handler 外层统一捕获 `UnsafeCultivationPathError`（以及写 gate），`check`/`archive` 在 records 是文件/symlink 时返回可读「不是安全目录」，不抛。
- keyless：records 文件 → check/archive 都 error + 文案；红证：HEAD cultivation → 3 failed。
