---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-143：bootstrap 的目录条目目标被文件占用时 `mkdir` 抛 EEXIST，`.dsh-company` 是文件会直接打断自举/启动

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（dir 条目）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / bootstrap 目录条目）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company` 被普通文件占用：

```sh
writeFile ws/.dsh-company
applyBootstrap({ entries:[{ rel:'.dsh-company', kind:'dir', action:'create' }], … })
→ THREW Error: EEXIST: file already exists, mkdir '…/.dsh-company'
```

`applyBootstrap` 对 `kind:'dir'` 直接 `mkdirSync(target,{recursive:true})`，没有 try/catch/形状判据；`EEXIST` 冒泡。`ensureRunBundle` 有顶层 catch（2026-11-13 实测 `.dsh-company` 文件仍能 boot，只 warn 后跳过自举），但 `applyBootstrap`/`applyRoleBackfill` 的直接调用/补种路径仍会以 EEXIST 异常结束，没有「公司盘根被文件占用，先修复」的结构化回执。

同族：`.dsh-company/kb` 是文件、任何目录条目被文件/symlink 占用；BUG-128/142 是 file 条目，本卡是 dir 条目。

## 根因（假设）

- `applyBootstrap` 只对 file 条目包 try/catch（且只处理 EEXIST），dir 条目无包装。
- 没有写前 lstat 分类（缺失/普通文件/目录/symlink）；`mkdirSync` 对文件抛 EEXIST。
- 调用方 `ensureRunBundle`/`applyRoleBackfill` 没有把自举异常收成 dataBlocked/警告。

## 暴露的失败类

**自举的目录骨架假设目标缺失或目录**：workspace 可写，`.dsh-company`/`kb` 可被文件占用；`mkdir` 的 EEXIST/ENOTDIR 冒泡会打断启动。目录条目也要 lstat + warning/skip，不能裸 mkdir。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-bootstrap-dir-entry.mts
```

2026-11-13 输出：

```
THREW Error: EEXIST: file already exists, mkdir '…/.dsh-company'
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- dir 条目：`lstat(target)`：缺失 → mkdir；目录 → skip；symlink → 拒绝/warning；普通文件/其它 → warning「目录骨架被文件占用」+ skip。
- 父目录逐级 lstat/realpath；与 BUG-128/129/131/142 的 `resolveCompanyRoot` 合并。
- `ensureRunBundle` 把 bootstrap 异常收成 dataBlocked + 可读 warning（或至少 logger/stderr），不要 throw 到 apply。
- 加 spec：`.dsh-company` 文件、`kb` 文件、目录条目 symlink、正常目录；boot 不抛、给出 warning。

## 修复关联

- 发现于 BUG-142（file 条目目录）后的 dir 条目检查；与 [BUG-128](BUG-128-bootstrap-replace-follows-symlink-write-outside.md) / [BUG-142](BUG-142-bootstrap-replace-directory-eisdir.md) 同函数，本卡是目录骨架。
- 相关：`src/host/run-bundle/bootstrap.ts` 的 `applyBootstrap`；`ensureRunBundle` 调用点。

## 已修判定

修成：dir 条目先 lstat 父目录与目标；目标被文件占用 → warning「不是目录」+ skip；父目录 symlink/文件 → warning；不再 EEXIST 冒泡。
- keyless：`.dsh-company` 是文件 + dir 条目 → warning、不抛；红证：HEAD bootstrap → 2 failed。
