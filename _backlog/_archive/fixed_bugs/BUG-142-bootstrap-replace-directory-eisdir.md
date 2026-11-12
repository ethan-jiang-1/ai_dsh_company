---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-142：bootstrap `mode:'replace'` 目标被目录占用时写 `org.md` 抛 EISDIR；直接调用/补种路径未收成可读 warning

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（replace 目录）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / bootstrap 写路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

角色补种的 `org.md`/`owners.md` 是 `mode:'replace'` 文件。目标路径被目录占用：

```sh
mkdir -p ws/.dsh-company/kb/org.md
applyBootstrap({ entries:[{ rel:'.dsh-company/kb/org.md', mode:'replace', content:'x' }], … })
→ THREW Error: EISDIR: illegal operation on a directory,
  open '…/.dsh-company/kb/org.md'
```

`applyBootstrap` 的 catch 只处理 `EEXIST`（`skipped`）；`EISDIR` 直接冒泡。`ensureRunBundle` 有顶层 catch（真实 boot 只 warn），但 `applyBootstrap`/`applyRoleBackfill` 的直接调用/补种路径仍会以 EISDIR 异常结束，没有「种子目标被目录占用，先修复」的结构化回执。

BUG-128 是 `replace` 跟随 symlink 写到外部；本卡是**目标被目录占用**的 EISDIR。两者同属 `applyBootstrap` 没有写前形状判据。

## 根因（假设）

- `applyBootstrap` 只 `mkdirSync(dirname(target))` 后 `writeFileSync(target, ..., {flag:'w'/'wx'})`；没有 lstat 目标。
- `replace` 只适合普通文件；目录/ symlink 都被文件 API 以不同 errno 拒绝。
- 调用方只 catch 顶层错误成 warn/throw，缺少「哪个 seed 目标坏了」的可操作信息。

## 暴露的失败类

**自举写路径假设目标不存在或普通文件**：workspace 可写，目标可被目录/symlink 替换；写前必须 lstat 并分类（缺失/普通/symlink/目录），坏形状跳过 + warning，而不是 EISDIR 冒泡。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-bootstrap-dir-target.mts
```

2026-11-13 输出：

```
THREW Error: EISDIR: illegal operation on a directory, open '…/.dsh-company/kb/org.md'
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `applyBootstrap` 对每个 file entry：`lstat(target)`：
  * 缺失 → 写；
  * 普通文件 + `mode:'replace'` → 覆盖；
  * 普通文件 + `create` → skip/EEXIST；
  * symlink/目录/其它 → warning + skip（记 rel 与形状），不抛；
- 与 BUG-128 一起：父目录逐级 lstat/realpath 在 workspace 内；replace 用 temp+rename（但先验父目录）。
- 调用方把 warnings 输出到 boot 日志/角色补种回执；不要只 catch 顶层。
- 加 spec：org.md 目录、symlink、普通文件、缺失；kb 目录 symlink；补种结果 warnings 可读。

## 修复关联

- 发现于 BUG-128（bootstrap replace symlink）后的目标形状检查；与 [BUG-128](BUG-128-bootstrap-replace-follows-symlink-write-outside.md) 同函数，本卡是目录。
- 相关：`src/host/run-bundle/bootstrap.ts` 的 `applyBootstrap` / `applyRoleBackfill`。

## 已修判定

修成：`applyBootstrap` 对 replace 目标先 lstat，目录/非普通文件 → warning + skip；不再 EISDIR；warning 带 rel 与形状，调用方可读。
- keyless：org.md 是目录 → warning 含「目录」、不抛；红证：HEAD bootstrap → 2 failed。
