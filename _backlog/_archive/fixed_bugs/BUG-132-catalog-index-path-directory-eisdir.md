---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-132：`kb/deliverables-index.json` 是目录时 `regenerateCatalog` 抛 EISDIR；audit 可先写账本再失败

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（输出目录）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / catalog 输出路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

catalog 的输出路径被目录占用：

```sh
mkdir -p ws/.dsh-company/kb/deliverables-index.json
regenerateCatalog(ws)
→ THREW Error: EISDIR: illegal operation on a directory, rename '…/deliverables-index.json.<pid>.<time>.<uuid>.tmp' → '…/deliverables-index.json'
```

`regenerateCatalog` 只对 `final/meta` 叶子做 `plainFileProblem`，**没检查自己的输出路径**；`renameSync(temp, path)` 对目录失败，catch 只删 temp 后重新抛。

后果：
- boot 的 `initializeCatalog` catch → 只 warn，catalog 永远不更新；
- `/deliverables audit` 在 `auditLedger` 写账本成功后调用 `regenerateCatalog`，这里抛 → 命令异常结束，用户以为 audit 失败但账本已写；
- present 投影 catch 成 warning；每次 present 重复失败。

同形：输出路径是 symlink（rename 会替换 symlink，安全）；是目录/非空目录 → EISDIR/ENOTEMPTY。

## 根因（假设）

- `regenerateCatalog` 只保护输入（扫描叶子），不保护**输出** `catalogPath`；`writeFileSync(temp)` 成功后 `renameSync` 覆盖目录失败。
- 没有 `plainFileProblem(companyHome, path)` 或 lstat 输出路径的「普通文件/缺失」判据；坏形状没有 warning。
- `/deliverables audit` 的 `regenerate` 调用没有 catch，账本/索引两步不在一个可读回执里。

## 暴露的失败类

**派生写入不检查自己的目标形状**：扫描器保护输入，生成器不保护输出；输出被目录/链接占用时抛到调用方。写派生文件前也要证明目标可替换，坏形状要 warning 而非异常。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-catalog-index-dir.mts
```

2026-11-13 输出：

```
THREW Error: EISDIR: illegal operation on a directory, rename '…tmp' -> '…/deliverables-index.json'
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 写前 `lstat(catalogPath)`：缺失 → 正常写；symlink → 拒绝/警告（不跟随）；普通文件 → 替换；目录/其它 → warning + 不写，返回 `written:false`，不抛。
- 或安全替换：目录改名为 `.bak-…` 再 rename staging（但派生文件被目录占用通常意味着坏形状，report 更合适）。
- `/deliverables audit` 的 `regenerate` catch 成可读 warning，明确「账本已写、索引未更新」。
- 加 spec：输出=目录、输出=symlink→外部、输出=普通文件、缺失；audit 回执两步状态。

## 修复关联

- 发现于 C4 catalog 坏形状回归；与 [BUG-122](BUG-122-catalog-root-file-symlink-enotdir.md)（输入根）和 [BUG-131](BUG-131-kb-symlink-catalog-writes-outside.md)（父目录 symlink）同面，但本卡是**输出文件**。
- 相关：`src/host/ledger/catalog.ts` 的 `regenerateCatalog`；`src/host/commands/deliverables-command.ts` 的 `regenerate` 调用。

## 已修判定

修成：写 catalog 前 lstat 目标，目录 → warning + `written:false`；其余走 temp+rename；audit 回执可区分「账本已写、索引未更新」（warnings 计数）。
- keyless：catalog 路径是目录 → written:false + warning「目录占用」；红证：旧 rename 路径 → EISDIR（修复前实测）。
