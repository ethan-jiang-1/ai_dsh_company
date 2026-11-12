---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-138：`kb/deliverables-presented.json` 是目录时 `writePresentedLedger` EISDIR；审计/账本写异常且无回执

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（账本写）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / presented 账本写路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/kb/deliverables-presented.json` 被目录占用：

```sh
mkdir -p ws/.dsh-company/kb/deliverables-presented.json
writePresentedLedger(ws, ledger)
→ THREW Error: EISDIR: illegal operation on a directory,
  rename '…deliverables-presented.json.<pid>.<time>.<uuid>.tmp' -> '…/deliverables-presented.json'
```

`readPresentedLedger` 会把目录读成 corrupt（catch），但写路径没有形状判据；`setPresentedAudit` / file fallback 会抛 EISDIR，调用方（audit handler / present 投影）拿不到「账本文件被目录占用，先修复」的结构化回执。domain store 正常时可能绕过文件；非 domain/旧部署仍会撞。

同族 BUG-132（catalog 输出目录）、133（startup 输出目录）、137（ledger symlink 读）都围绕「账本/派生文件形状」，本卡是 **presented 输出**。

## 根因（假设）

- `writePresentedLedger` 只 temp+rename，不 lstat 目标；目录使 rename EISDIR。
- `readPresentedLedger` 的 corrupt 状态没有被写路径复用；写前没有 `plainFileProblem`/输出形状检查。
- `setPresentedAudit`/`recordPresented` 不 catch 写失败为 warning；audit 可能「账本没写成功但命令抛」。

## 暴露的失败类

**权威账本写路径不检查目标形状**：读面已能识别目录/损坏，写面仍裸 rename；审计写入失败应可读、可回滚，不应抛 EISDIR。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-presented-dir-write.mts
```

2026-11-13 输出：

```
THREW Error: EISDIR: illegal operation on a directory, rename '…tmp' -> '…/deliverables-presented.json'
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `writePresentedLedger` 写前 `plainFileProblem(companyHome,path)`：目录/非普通 → 返回 `{warning}`/抛 typed error；调用方转可读回执。
- `/deliverables audit` 在账本写失败时明确「审计未落账本」；present 投影 warn 不吞。
- 若目录是坏形状，提供安全替换（改名 `.bad-…`）或明确让用户删除；不要静默删除用户数据。
- 加 spec：账本输出=目录、symlink、普通文件、缺失；audit/present 的回执。

## 修复关联

- 发现于 C4 presented 读写形状回归；与 [BUG-132](BUG-132-catalog-index-path-directory-eisdir.md) / [BUG-133](BUG-133-startup-json-directory-eisdir.md)（输出目录）和 [BUG-137](BUG-137-presented-ledger-symlink-read-outside.md)（账本 symlink 读）同族，本卡是**账本写**。
- 相关：`src/host/ledger/presented-ledger.ts` 的 `writePresentedLedger`；`presented-domain.ts` 的 audit。

## 已修判定

修成：`writePresentedLedger` 走 `writeCompanyAtomic`，目录占用 → typed error；`setPresentedAudit` 捕获为 warning「审计未写账本」，不抛 EISDIR。
- keyless：presented 路径是目录 → `setPresentedAudit` 返回 warning、无异常；红证：旧 temp+rename → EISDIR（修复前实测）。
