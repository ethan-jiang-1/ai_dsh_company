---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-131：`.dsh-company/kb` 是 symlink 时，catalog 仍把 `deliverables-index.json` 写到 workspace 外（根级检查不够）

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（kb symlink）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3/C4 / 状态子目录 residency）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company` 是正常目录，但 `.dsh-company/kb` 是指向 workspace 外的 symlink：

```sh
ln -s /outside ws/.dsh-company/kb
```

`regenerateCatalog(ws)`：

```
written true
path ws/.dsh-company/kb/deliverables-index.json
outside/deliverables-index.json exists true
{ "schema":1, "generatedAt":…, "counts":{…} }
```

即 host 把 catalog 写进 `/outside`。BUG-129 已记 `.dsh-company` **根**是 symlink 的情况；本卡是**根正常、子目录 `kb` 是 symlink**，所以只校验根/只 realpath 一次不够，写路径的每一级父目录都要 residency。

同形：`startup` 的 `.dsh-company` 子路径、`bootstrap` 的 `kb/`、`exports/` 等；`catalog` 只是最容易实跑的一个。

## 根因（假设）

- `catalogPath`/`regenerateCatalog` 直接 `mkdirSync(join(companyHome,RUN_BUNDLE_PATHS.kb))`，`mkdirSync` 对已存在的 symlink 成功，`writeFileSync(temp)`/`renameSync` 落在链接目标。
- `plainFileProblem` 只检查**叶子文件**的 realpath；父目录 symlink 不被检查。
- `resolveCompanyRoot`（BUG-129 建议）若只 realpath 根，不逐级 lstat `kb`/`deliverables`/`exports`，仍会漏本条。

## 暴露的失败类

**residency 只查根、不查中间目录**：workspace 内任意可写目录都可以是 symlink；写路径必须从根到目标逐级 lstat/realpath（或打开目录 fd + `openat` 等价），不能只校验最终路径或根。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-kb-symlink.mts
```

2026-11-13 输出：

```
result {"written":true,"path":"…/ws/.dsh-company/kb/deliverables-index.json","warnings":[]}
outside index exists true
{ "schema":1, "generatedAt":… }
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 统一 `resolveInsideCompany(workspace, ...segments)`：从 `.dsh-company` 开始逐级 `lstat`，任何一段是 symlink → 拒绝/重建；父目录必须是普通目录；缺失时用 `mkdir` 后再次 lstat。
- catalog/startup/export/bundle/bootstrap 全部换这个函数；不能各自 `join`。
- 叶子写继续 temp+rename（替换 symlink，不跟随），但父目录已先验证。
- 加 spec：`kb` symlink→外部、`exports` symlink→外部、`deliverables` symlink→外部、普通子目录；断言外部字节不变。

## 修复关联

- 发现于 BUG-129 根级 symlink 后的子目录检查；与 [BUG-128](BUG-128-bootstrap-replace-follows-symlink-write-outside.md) / [BUG-129](BUG-129-dsh-company-symlink-root-writes-outside.md) 同族，但本卡是**中间目录**。
- 相关：`src/host/ledger/catalog-state.ts` 的 `catalogPath`；`catalog.ts` 的 `regenerateCatalog`。

## 已修判定

修成：catalog 写前 `ensureCompanyDir(workspace,'kb')` 逐级 lstat；kb 是 symlink → warning + `written:false`，外部目录不出现 index。
- keyless：kb symlink→外部 → 外部无 `deliverables-index.json`；红证：同组 A 根检查去除时 1 failed。
