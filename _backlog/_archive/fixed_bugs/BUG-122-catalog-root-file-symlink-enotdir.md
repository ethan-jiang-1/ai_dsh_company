---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-122：`deliverables` / `deliverables-archive` **根本身是文件或 symlink** 时 `regenerateCatalog` 直接 ENOTDIR 抛错；审计命令可先写账本再失败

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（扫描根）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 成品目录）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`scanEntries` 对两个根只做 `existsSync(dir)`，然后直接 `readdirSync`：

```ts
const dir = join(companyHome, root)
if (!existsSync(dir)) continue
for (const item of readdirSync(dir, { withFileTypes: true })) { ... }
```

把 `.dsh-company/deliverables` 做成普通文件：

```
regenerateCatalog(ws)
→ THREW Error: ENOTDIR: not a directory, scandir '…/.dsh-company/deliverables'
```

同形：`deliverables` 是 **symlink 到目录** 时，`readdirSync` 会跟随并扫描 workspace 外目录（文件名进入内存，后续 `plainFileProblem` 才按 outside 跳过）；根目录类型/链接没有判据。

后果：
- boot 的 `initializeCatalog` 有 catch，只 warn，不崩；
- `/deliverables audit` 在 `auditLedger` 写账本成功后调用 `regenerateCatalog`，这里抛错 → 命令以异常结束，用户看到失败但账本已写；
- present 投影路径 catch 成 warning，但每次 present 都会重复失败。

## 根因（假设）

- G2 修复只覆盖了 `final.md` / `meta.md`（`plainFileProblem`），没有覆盖 **两个扫描根** 的类型。
- `existsSync` 对文件也 true；`readdirSync` 抛 ENOTDIR；`scanEntries` 没有 try/catch。
- 根是 symlink 时 `readdirSync` 跟随；没有 lstat/realpath 前缀检查。

## 暴露的失败类

**「文件类型检查」只做了叶子，没做根**：扫描器假设根是目录；一旦根被文件/链接替换，抛出未捕获错误。凡是 `readdirSync` 前都必须先证明目标是目录，且按策略拒绝 symlink。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-catalog-root-file.mts
```

2026-11-13 输出：

```
THREW Error: ENOTDIR: not a directory, scandir '…/.dsh-company/deliverables'
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 根用 `lstatSync`：缺失 → skip；symlink → warning「不跟随」并 skip；非目录 → warning「不是目录」并 skip；普通目录才 `readdirSync`。
- `scanEntries` 的 readdir 包 try/catch，坏根返回 warning，不抛。
- `/deliverables audit` 的 `regenerate` 调用 catch：账本写成功但索引失败要回执区分，不能只让命令抛。
- 加 spec：根=文件、根=symlink→外部目录、根=symlink→内部目录、正常目录；audit 在坏根下的回执。

## 修复关联

- 发现于 C4 扫描器坏形状回归；与 [BUG-096](BUG-096-deliverables-catalog-directory-eisdir.md)（叶子目录冒充文件）和 [BUG-108](BUG-108-catalog-symlink-final-outside.md)（叶子 symlink）同族，但本卡是**根**。
- 相关：`src/host/ledger/catalog.ts` 的 `scanEntries`；`src/host/commands/deliverables-command.ts` 的 `regenerate` 调用。

## 已修判定

修成：`scanEntries` 两个根先 lstat：缺失 skip、symlink warning 不跟随、非目录 warning 不 readdir；readdir 异常也 warning，不抛。audit 的 regenerate 已有顶层回执。
- keyless：deliverables 是文件 → warning 含「不是目录」；红证：catalog 旧实现 prefix 错时 1 failed（同组 A）。
