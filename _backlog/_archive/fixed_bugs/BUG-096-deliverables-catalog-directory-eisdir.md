---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-096：成品目录扫描把 `meta.md` / `kb/motion-ledger.md` 目录当文件读，`regenerateCatalog` 抛 EISDIR；`final.md` 是目录也算成品

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 成品目录）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`scanEntries` 只 `existsSync` 就 `readFileSync`，`final` 也只 `existsSync`。把交付物目录里的 `meta.md` 或 `<workspace>/.dsh-company/kb/motion-ledger.md` 换成**目录**：

```
meta-dir  -> THREW EISDIR: illegal operation on a directory, read
ledger-dir -> THREW EISDIR: illegal operation on a directory, read
final-dir -> regenerateCatalog 成功，`x` 进入目录（path = .dsh-company/deliverables/x/final.md，
             final 被当成 true；下游按文件读会 EISDIR）
```

`regenerateCatalog` 在 boot 时由 `void initializeCatalog(...)` 调用（`src/index.ts:213`），没有 try/catch；一个坏目录会在 boot 抛 unhandled rejection（Node 默认可终止进程），而正常路径应该只 warn 并跳过该条目。present/audit 路径同样会抛。

## 根因（假设）

- `scanEntries`（`src/host/ledger/catalog.ts:46-55`）用 `existsSync(join(dir,item.name,'final.md'))` / `existsSync(metaPath)` 判定，不检查 `statSync(...).isFile()`；`readFileSync(metaPath)` 对目录直接 EISDIR。
- `kb/motion-ledger.md` 同样 `existsSync` + `readFileSync`，目录即 EISDIR。
- `buildDeliverablesCatalog` 只看 `entry.final` 布尔；`final.md` 是目录时 `final=true`，目录被当成成品。
- `initializeCatalog` 的 boot 调用是 fire-and-forget（`void`），没有 catch；`regenerateCatalog` 的错误变成 unhandled rejection，而不是可见 warning。

## 暴露的失败类

**「存在」被当成「是可读文件」**：扫描/派生层用 `existsSync` 代替类型检查，坏形状从磁盘输入直接变成异常；boot 的 fire-and-forget 又让异常没有归属。同类：任何从用户可写目录扫 `*.md` 的地方都要先 `isFile()`，坏项计数/告警而不是抛。

## 复现

```sh
node --import tsx/esm runtime/tmp/c4-catalog-dirs.mts
node --import tsx/esm runtime/tmp/c4-catalog-finaldir.mts
```

2026-11-13 原始输出（节选）：

```
final-dir -> {"written":true,"entries":[{"slug":"x"}]}
meta-dir THREW -> EISDIR: illegal operation on a directory, read
ledger-dir THREW -> EISDIR: illegal operation on a directory, read
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `scanEntries`：`final`、`meta.md`、`motion-ledger.md` 都用 `lstatSync(...).isFile()`；非文件跳过并计数/warn，不 `readFileSync`。
- `buildDeliverablesCatalog` 的 `final` 由扫描层只在是文件时置 true；`final.md` 是目录时应作为坏形状报告（或在目录层忽略）。
- `initializeCatalog` 的 boot 调用加 try/catch（warn + 跳过本次目录生成），present/audit 调用同样收成可读错误。
- 加 keyless spec：`final.md` 目录、`meta.md` 目录、`motion-ledger.md` 目录 → 不抛、不产生假条目、有坏项计数；好文件仍正常。

## 修复关联

- 发现于 C4；与 [BUG-095](BUG-095-workspace-resolution-accepts-tmp-root.md) 同属「workspace 输入形状」边界。
- 合同：[`docs/contracts/data-model.md`](../../../docs/contracts/data-model.md) 的成品目录/目录派生；`/deliverables` 命令。

## 已修判定

修成：catalog 扫描的 `final.md` / `meta.md` / `kb/motion-ledger.md` 都先 `statSync().isFile()`；非文件跳过、不 `readFileSync`，进 `CatalogResult.warnings`；boot 的 `void initializeCatalog` 加 catch 并输出 warnings；`final.md` 是目录不产生假成品。

- keyless：final/meta 目录 → 不抛、无假条目、两条 warning；motion-ledger 目录 → 按空账本、有 warning；正常文件仍生成。
- 红证：`isRegularFile` 还原 existsSync → 2 failed；复原 19 passed。
