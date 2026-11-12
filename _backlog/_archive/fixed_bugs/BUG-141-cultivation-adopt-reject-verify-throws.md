---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-141：培养 `adopt` / `reject` / `verify` 在 records 根是文件/symlink 时抛 `UnsafeCultivationPathError`，没有可读回执

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（adopt/reject/verify 边界）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / 培养命令读边界）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/cultivation/records` 被普通文件/ symlink 替换后：

```
/cultivation adopt 20261113-000000-abc
/cultivation reject 20261113-000000-abc :: no
/cultivation verify 20261113-000000-abc pass :: x
→ 全部 THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
```

`commandAdopt` / `commandReject` / `commandVerify` 调 `storage.readRecord`，`recordsDirectoryState` 对非目录/ symlink 抛 typed error；三个命令都没有 catch。它们本应报「记录目录不是安全目录（文件/symlink），先修复」，而不是异常。

BUG-127 已记 check/archive，BUG-130 已记 correct/propose；本卡是 adopt/reject/verify 三个命令的读入口，同一根因、不同命令边界。

## 根因（假设）

- `readRecord` 的 `recordsDirectoryState` 在根坏时抛 `UnsafeCultivationPathError`（fail closed 正确）。
- `commandAdopt`/`Reject`/`Verify` 没有 `try/catch`；`commandRevoke` 有。
- 没有统一的 `withCultivationErrors` 包住命令族；每个命令自己处理，漏三个。

## 暴露的失败类

**typed error 只在部分命令边界收口**：同一存储异常，revoke 可读，check/archive 127、correct/propose 130、adopt/reject/verify 本卡都抛；修复要一次性统一，而不是逐命令打补丁。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-cultivation-readroot.mts
```

2026-11-13 输出：

```
adopt … THREW UnsafeCultivationPathError
reject … THREW UnsafeCultivationPathError
verify … THREW UnsafeCultivationPathError
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `cultivationCommandHandler` 在 dispatch 外层统一 catch `UnsafeCultivationPathError` → `{kind:'error', text:'培养记录目录不是安全目录（文件/symlink）：…，请修复后重试'}`；其余 Error 保留。
- 或给 `readRecord` 增加状态返回（`missing|unsafe|ok`），命令按状态给文案；但不要静默当 missing。
- 与 BUG-127/130 一次性改 + spec：records=文件/symlink、父 cultivation=symlink；adopt/reject/verify/check/archive/correct/propose/revoke 八命令一致可读。

## 修复关联

- 发现于 BUG-127/130 后的 C1 命令边界回归；与 [BUG-127](BUG-127-cultivation-records-file-throws.md)（check/archive）和 [BUG-130](BUG-130-cultivation-write-root-throws.md)（correct/propose）同根。
- 相关：`src/host/cultivation/cultivation.ts` 的 `commandAdopt` / `commandReject` / `commandVerify`。

## 已修判定

修成：adopt/reject/verify 与 check/archive/correct/propose 共用 `cultivationCommandHandler` 外层 catch；records 根是文件/symlink → 统一可读「不是安全目录」，不再抛 `UnsafeCultivationPathError`。
- keyless：records=文件时 adopt/reject/verify 均 error + 文案；红证：HEAD cultivation → 3 failed。
