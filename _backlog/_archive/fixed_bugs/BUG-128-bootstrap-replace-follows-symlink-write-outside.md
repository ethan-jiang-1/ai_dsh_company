---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-128：bootstrap 的 `mode:'replace'` 会跟随 workspace 内 symlink，把 `org.md`/`owners.md` 写到 workspace 外

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（bootstrap symlink）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / run-bundle 自举写路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`applyBootstrap` 对 `mode:'replace'` 的文件用：

```ts
writeFileSync(target, entry.content, { flag: 'w' })
```

`flag:'w'` 会**跟随 symlink**。角色补种（`org.md` / `owners.md`）正是 `mode:'replace'`：

```ts
symlinkSync(outsideFile, ws/.dsh-company/kb/org.md)
applyBootstrap({ entries:[{ rel:'.dsh-company/kb/org.md', mode:'replace', content:'REPLACED…' }], … })
→ result created ['…/org.md']
→ outsideFile 内容变成 'REPLACED…'
```

实测（2026-11-13）：`outside "REPLACED BY BOOTSTRAP\n"`。

即：模型/用户在 `.dsh-company/kb/` 里预置一个 symlink，下一次启动/角色补种时 host 会**覆盖 workspace 外任意可写文件**。`meta`/`final` 的读路径已按 symlink 拒绝（BUG-108/113），但 bootstrap 的写路径没有。

## 根因（假设）

- `applyBootstrap` 只 `mkdirSync` 后直接 `writeFileSync`；没有 `lstat` 目标、没有父路径 symlink 检查。
- `mode:'replace'` 为覆盖写设计，天然会跟随；`create` 的 `wx` 至少不会覆盖，但仍会 `mkdir` 跟随父 symlink。
- 写路径没有复用 `plainFileProblem`/`safe-file`；S2 只覆盖读面。

## 暴露的失败类

**自举写路径只判「要写」，不判「写到哪里」**：workspace 是模型可写面，预置 symlink 可以把 host 的种子/补种写到任何位置。写路径必须 lstat 目标 + realpath 父目录在 workspace 内；覆盖写优先同目录 temp+rename（替换 symlink 而不是跟随）。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-bootstrap-symlink-write.mts
```

2026-11-13 输出：

```
result {"created":[".dsh-company/kb/org.md"],"skipped":[]}
outside "REPLACED BY BOOTSTRAP\n"
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 写前 `lstat(target)`：symlink → 拒绝并 warning「种子目标是 symlink，未覆盖」；普通文件才 replace。
- 父目录逐级 lstat/realpath，必须在 `plan.workspace` 内；`mkdirSync` 不跟随 symlink。
- replace 用同目录 temp + `rename`（rename 会替换 symlink 而不是跟随），但 rename 前仍要防父目录 symlink。
- 加 spec：`kb/org.md` symlink→外部文件、`kb` symlink→外部目录、普通 replace、create 的 EEXIST；断言外部字节不变。

## 修复关联

- 发现于 C3 自举写路径；与 [BUG-108](BUG-108-catalog-symlink-final-outside.md) / [BUG-113](BUG-113-command-doc-symlink-outside-workspace.md)（读面 symlink）同族，但本卡是**host 写面**。
- 相关：`src/host/run-bundle/bootstrap.ts` 的 `applyBootstrap` / `applyRoleBackfill`。

## 已修判定

修成：`applyBootstrap` 写前逐级 lstat 父目录、lstat 目标；symlink/目录/文件占目录 → warning + skip；replace 用同目录 temp+rename（替换 symlink 而非跟随），外部字节不动。
- keyless：org.md symlink→外部 → warning + 外部不变；红证：HEAD bootstrap → 2 failed。
