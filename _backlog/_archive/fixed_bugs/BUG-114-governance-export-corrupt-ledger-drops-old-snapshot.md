---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-114：`exportGovernance` 在账本 corrupt/不可导出时仍整体替换 `exports/`，旧 `ledger.json` 被删；warning 却说「保留上次快照」

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（旧件保留）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 治理导出）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`exportGovernance` 现在把整个 `exports/` 在 staging 生成，成功后 `swapDirWithBackup` 替换。账本读取状态不是 `ok` 时：

```ts
warnings.push(`账本不可导出（${state.status}），保留上次快照`)
```

但 staging 里**没有复制旧 `ledger.json`**，随后整个 `exports/` 被替换：

```
result: {"methods":false,"ledger":false,"warnings":["账本不可导出（corrupt），保留上次快照"]}
ledger exists: false
```

旧账本快照实际被删。`ledger` 参数缺席（只导方法层）同样会把旧 `ledger.json` 删掉；`methodsSource` 暂时不可读时也会把旧 `methods/` 清掉。warning 与结果相反。

## 根因（假设）

- `swapDirWithBackup` 是整目录替换；staging 只放「本次成功生成的部分」，没有把「本次不能生成、但上一份仍可用」的旧件复制进 staging。
- corrupt/unsupported 分支只 push warning，没有 `cpSync` 旧 ledger；`ledger === undefined` 分支没有保留旧 ledger。
- 「保留上次快照」的承诺没有落到 staging 内容。

## 暴露的失败类

**整体替换 + 部分生成**：目录级原子替换要求 staging 是「完整的新快照」；当某一部分本次不可生成时，必须显式把旧件带进 staging（或用旧目录做基座），否则「原子替换」会原子地删掉旧数据。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-export-preserve.mts
```

2026-11-13 原始输出：

```
result {"methods":false,"ledger":false,"warnings":["账本不可导出（corrupt），保留上次快照"]}
ledger exists false content GONE
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- ledger 非 ok/undefined 时：若 `exportRoot/ledger.json` 存在且可读，复制进 staging（保持字节），warning 改成「本次不更新，沿用上次」。
- methodsSource 不存在/不可读时：复制旧 `exports/methods/` 或保留旧 methods；不要把「本次没读到」当「应删除」。
- 或不用整目录替换：以旧 exports 为基座生成 staging（保留未生成部分），只覆盖成功部分。
- 加 spec：corrupt ledger、ledger undefined、methodsSource 缺失 → 旧快照仍在；成功 → 新快照。

## 修复关联

- 发现于 S3 原子导出修复后的回归扫；与 [BUG-110](BUG-110-governance-export-rm-before-rename.md) 同面但不同根因（替换策略 vs staging 内容完整性）。
- 相关：`src/host/ledger/governance-export.ts` 的 `exportGovernance` / `swapDirWithBackup`。

## 已修判定

修成：`exportGovernance` 的 staging 在 ledger 非 ok/缺席、methods 源缺失时复制旧 `ledger.json` / `methods/`，warning 改「本次不更新，沿用上次」；整体替换不再原子地删旧快照。
- keyless：先导出 ok → 再 corrupt/缺席账本、删 methods 源 → 旧 ledger 字节不变、旧 methods 仍在；红证：去掉复制 → 1 failed。
