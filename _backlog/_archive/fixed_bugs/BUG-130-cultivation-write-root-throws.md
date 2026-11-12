---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-130：培养写入口（`correct`/`suggest`/`cultivation_propose`）在 `records/` 是文件/symlink 时抛 `UnsafeCultivationPathError`，模型工具直接失败

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（写入口/工具）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / 培养写路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/cultivation/records` 是普通文件（或 symlink）时：

```
/cultivation correct 要更稳 :: 证据
→ THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records

cultivation_propose.execute(...)
→ THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
```

`writeRecord` → `ensureRecordsDirectory` → `ensureDirectory` 对文件抛 typed error；命令 handler 与提案 tool `execute` 都没有 catch 成可读结果。人类命令直接异常；模型工具抛异常（vendor 包成 tool error），模型拿不到「记录目录坏了，先修复」的 note，也无法区分「工具坏了」与「目录坏了」。

同族：`records/` 是 symlink 到外部目录时也可能被 `ensureDirectory` 拒绝（fail closed 正确），但错误必须可读。BUG-127 已覆盖 `check`/`archive` 的读边界；本卡是写边界。

## 根因（假设）

- `cultivationCommandHandler` 只在 `revoke` 分支包了 Unsafe catch；`correct`/`suggest` 直接 `writeRecord`。
- `cultivation_propose` 的 `execute` 没有 try/catch；`writeRecordViaFs`/`writeRecord` 的 typed error 直接冒泡。
- 没有统一的 `toCultivationResult(error)` 包装。

## 暴露的失败类

**typed error 只在部分入口收口**：同一个存储异常，revoke 可读、check/archive 127、correct/propose 抛；坏形状的可操作性取决于调用点。写入口比读入口更应给结构化失败（模型要据此停手/求修）。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-cultivation-write-root.mts
```

2026-11-13 输出：

```
correct THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
propose THREW UnsafeCultivationPathError: 拒绝不安全的培养路径：…/records
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `cultivationCommandHandler` 包一层：捕获 `UnsafeCultivationPathError` → `{kind:'error', text:'培养记录目录不是安全目录（文件/symlink）：…，请修复后重试'}`。
- `cultivation_propose.execute` 同款：返回 `{ id:'', recorded:false, note:'记录目录不是安全目录…' }`，不抛。
- 统一 `withCultivationErrors`（读/写/工具三面），与 BUG-127 一起修。
- 加 spec：records=文件/symlink、父 cultivation=symlink、missing；correct/suggest/propose/check/archive/revoke 全可读。

## 修复关联

- 发现于 C1 存储写边界回归；与 [BUG-127](BUG-127-cultivation-records-file-throws.md) 同根（typed error 未全收口），本卡是写入口/工具面。
- 相关：`src/host/cultivation/cultivation.ts` 的 `commandCorrectOrSuggest` / `cultivation_propose.execute`；`cultivation-storage.ts` 的 `ensureRecordsDirectory`。

## 已修判定

修成：`correct`/`suggest` 由命令边界统一捕获；`cultivation_propose.execute` 对 `UnsafeCultivationPathError`/写 gate 返回 `recorded:false + note`，模型拿到「记录目录坏了，先修复」。
- keyless：records 文件 → correct error；propose 不抛；红证：HEAD cultivation → 3 failed。
