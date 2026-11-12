---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-108：成品目录的 `final.md` / `meta.md` 指向 workspace 外的 symlink 仍被当成有效成品（`statSync` 跟随）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 成品目录）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`regenerateCatalog` 的 `isRegularFile` 用 `statSync`（跟随 symlink）；把 `deliverables/x/final.md` 做成指向 workspace 外普通文件的 symlink：

```
warnings: []
entries: [{ slug:'x', path:'.dsh-company/deliverables/x/final.md' }]
```

- 目录里出现一个「成品」；
- 下游打开/读取该 path 会跟随 symlink 到 workspace 外；
- `presented` / audit 路径 canonical 化之后可能对不上（present 事件 realpath 在外，被忽略），形成 UI 有成品但永远未核；
- 同形：`meta.md` symlink 到外部文件，catalog 会读外部内容当 meta。

这与刚修的「存在 ≠ 可读普通文件」同一失败类：类型检查用了跟随链接的 `stat`，没有拒绝 symlink 或报告。

## 根因（假设）

- `isRegularFile`（catalog.ts）用 `statSync(path).isFile()`；symlink→外部普通文件返回 true。
- 没有 `lstatSync(...).isSymbolicLink()` 的显式拒绝/warning；`existsSync` 分支也不区分。
- `meta.md` 的读取同样直接 `readFileSync`；symlink 目标被读。
- 修复方向（最小）：成品自身的 `final.md`/`meta.md` 用 `lstat` 拒绝 symlink（或解析后必须在 company root 内），非普通文件进 warnings。

## 暴露的失败类

**「是文件」用跟随 symlink 的 `stat` 判**：workspace 内可写目录中的 symlink 可以把「成品」指向 workspace 外；catalog/audit/UI 各自 canonical 化后语义分叉。凡是用户可写目录的「文件存在/类型」判据都要先决定 symlink 策略。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-2.mts
```

2026-11-13 输出：

```
catalog symlink -> {"warnings":[],"entries":[{"slug":"x","path":".dsh-company/deliverables/x/final.md"}]}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- `isRegularFile` 改为 `lstatSync(path)` 且 `isFile()` 且非 symlink；symlink → warning「成品 final/meta 是 symlink，不纳入」。
- 或允许 symlink 但要求 `realpath` 在 company root 内；外部目标拒绝并 warning。
- `meta.md` 读取同样走该判据；catalog warnings 在 boot/present/audit 输出。
- 加 spec：final symlink→外部文件、meta symlink→外部文件、symlink→内部文件（策略明确）、普通文件仍过。

## 修复关联

- 发现于 C4；与 [BUG-096](BUG-096-deliverables-catalog-directory-eisdir.md) 同属「存在 ≠ 可读普通文件」，但那条修的是目录，这条是 symlink。
- 相关：`src/host/ledger/catalog.ts` 的 `isRegularFile`；[BUG-099](BUG-099-deliverables-audit-nonexistent-final.md) 的 audit 目标检查。

## 已修判定

修成：catalog 的 `final.md` / `meta.md` / `kb/motion-ledger.md` 走 `plainFileProblem`（lstat 非 symlink + realpath 在 company root 内）；symlink/越界 → warning 且不纳入成品；boot 日志保留 warning。

- keyless：final/meta 指向 workspace 外的 symlink → 无成品条目 + warning 含 symlink。
- 红证：HEAD 版 catalog → 1 failed；复原全绿。
