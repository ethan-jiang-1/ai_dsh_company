---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-129：`.dsh-company` 本身是 symlink 时，catalog/export/startup 等 host 写路径会写到 workspace 外

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（根 symlink）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3/C4 / 公司盘根）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company` 是 workspace 里的状态根；把它做成指向 workspace 外的 symlink：

```sh
ln -s /outside ws/.dsh-company
```

`regenerateCatalog(ws)`：

```
result written true
outside/kb/deliverables-index.json exists true
{ "schema":1, "generatedAt":…, "counts":{…} }
```

即：host 只在 `ws` 下看到 `.dsh-company`，实际把 catalog 写进了 `/outside/kb/`。同一条根还会影响：
- `exportGovernance` → `outside/exports/…`；
- `startup-settings` / `startup-options` → `outside/startup.json`；
- `ensureRunBundle` → `outside/bundle.json`；
- `bootstrap` 种子/补种 → `outside/kb/…`（BUG-128 是文件级，本条是**根级**）。

`companyHome` 直接是 `join(workspace, '.dsh-company')`，没有 `lstat`/realpath 校验；所有子模块各自 `mkdirSync`/`writeFileSync`，都跟随根 symlink。

## 根因（假设）

- `validateCompanyHome` 只校验 workspace 根，不校验 `.dsh-company` 子目录；`workspace` 的 canonical 化不覆盖子路径。
- 每个写模块（catalog/export/startup/bootstrap/bundle）自己拼 `join(workspace,'.dsh-company',…)`，没有共享的「公司盘根安全解析」。
- 读面的 `plainFileProblem` 会检查 realpath 在 company root 内，但 company root 本身已指向外部时，`realpath` 比较的 root 也是外部，仍相对内。

## 暴露的失败类

**「workspace 内路径」假设了 `.dsh-company` 是普通目录**：模型可写 workspace，可以把状态根换成 symlink；host 的写路径全部跟到外部。公司盘根需要一次 lstat/realpath 解析并在所有模块共享。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-company-dir-symlink.mts
```

2026-11-13 输出：

```
result {"written":true,…}
outside index exists true
{ "schema": 1, "generatedAt": … }
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `resolveCompanyRoot(workspace)`：`lstat(workspace/.dsh-company)`；缺失 → 允许创建；symlink → 拒绝（或 realpath 必须在 workspace 内）；非目录 → 拒绝。所有模块用它，不再各自 `join`。
- 写根先 `mkdir` 普通目录；随后所有子路径用 realpath 前缀检查（defense in depth）。
- 至少 `ensureRunBundle`/catalog/export/startup 四个写入口统一调用；`bootstrap` 的父 symlink 也走它。
- 加 spec：`.dsh-company` symlink→外部目录、symlink→内部目录（策略明确）、普通目录；catalog/bundle/startup/export 各断言外部字节不变。

## 修复关联

- 发现于 BUG-128（bootstrap 文件 symlink 写穿）后的根级检查；与 [BUG-128](BUG-128-bootstrap-replace-follows-symlink-write-outside.md) 同族，但本卡是**状态根**。
- 相关：`src/host/run-bundle/paths.ts`、`bootstrap.ts`、`ledger/catalog.ts`、`governance-export.ts`、`startup/startup-store.ts`。

## 已修判定

修成：新增 `ensureCompanyRoot/ensureCompanyRootAt`，根是 symlink/非目录/越界 → typed error；`writeCompanyAtomic`/catalog/export/startup/bootstrap 统一从安全根走，不再各自 `join` 后直写。
- keyless：`.dsh-company` symlink→外部 → write 拒绝、外部无文件；红证：去掉根 symlink 检查 → 1 failed。
