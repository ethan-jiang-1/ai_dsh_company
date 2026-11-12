---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-135：`kb/deliverables-index.json` 是 symlink 时 `readCatalog` 跟随读 workspace 外 JSON，UI 可显示伪造成品/已 present

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（索引读）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / catalog 读路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company/kb/deliverables-index.json` 指向 workspace 外 JSON：

```ts
symlinkSync(outsideCatalog, ws/.dsh-company/kb/deliverables-index.json)
readCatalog(ws)
→ { schema:1, entries:[{ path:'.dsh-company/deliverables/fake/final.md', slug:'fake', final:true, presented:true }] }
```

`readCatalogState` 只 `existsSync` + `readFileSync`，**跟随 symlink**；UI 的成品页签经 `workspaceFiles` 读同一路径，会显示外部 JSON 里的伪造交付物/`presented:true`。`regenerateCatalog` 的 `written` 分支用 rename 会替换 symlink（写安全），但**读路径**先把外部内容当索引。

同族：`readCatalogState` 的 corrupt 校验只校验 JSON 形状，不校验文件来源；S2 的 safe-file 没有覆盖这个 host 输出文件。

## 根因（假设）

- `catalog-state.ts` 的 `readCatalogState` 用 `existsSync`/`readFileSync`，没有 `plainFileProblem(companyHome, path)` 的 lstat 非 symlink/residency。
- `workspaceFiles` 读同一相对路径也跟随 symlink，客户端无法区分。
- 修复 S2 时只覆盖了交付物叶子（final/meta），没有覆盖 catalog 的**输出**。

## 暴露的失败类

**派生索引读路径不校验文件形状**：host 生成的文件被 workspace symlink 替换后，读模型直接信外部 JSON。读面 safe-file 必须覆盖 host 自己写的派生文件，不只是用户文档。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-catalog-index-symlink-read.mts
```

2026-11-13 输出：

```
{"schema":1,"generatedAt":"2026-01-01T00:00:00.000Z","entries":[{"path":".dsh-company/deliverables/fake/final.md","slug":"fake","final":true,"presented":true}],"counts":{"total":1}}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `readCatalogState` 对 `catalogPath` 用 `plainFileProblem(companyHome, path)`：symlink/outside → 返回 `corrupt`（或 `untrusted`），不读；boot 重建时 rename 替换。
- `workspaceFiles` 的 catalog path 用同一 safe reader；客户端显示「索引不可信，正在重建」。
- 加 spec：catalog symlink→外部、symlink→内部、普通文件、目录；`readCatalog` 不返回外部 entries。
- 与 BUG-132（输出目录）/131（父 symlink）/125（audit symlink）一起收口输出读/写的形状。

## 修复关联

- 发现于 C4 catalog 输出坏形状；与 [BUG-132](BUG-132-catalog-index-path-directory-eisdir.md)（输出目录）、[BUG-131](BUG-131-kb-symlink-catalog-writes-outside.md)（父 symlink）同面，但本卡是**读面**。
- 相关：`src/host/ledger/catalog-state.ts` 的 `readCatalogState`；`workspaceFiles` 的 `WORKSPACE_TEXT_PATHS`。

## 已修判定

修成：`readCatalogState` 用 `companyFileProblem`，索引 symlink/目录/越界 → `corrupt`，不读外部 JSON；boot 可告警并重建。
- keyless：索引 symlink→外部假 entries → status=corrupt，不返回 fake；红证：旧 readFileSync 直接读（修复前实测）。
