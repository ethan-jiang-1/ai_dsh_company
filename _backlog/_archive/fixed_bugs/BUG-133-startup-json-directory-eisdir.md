---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-133：`startup.json` / `startup-options.json` 是目录时 `writeAtomic` EISDIR；`/company-settings set` 直接异常，无回执

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（startup 输出）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / startup 输出路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`startup.json` 被目录占用：

```sh
mkdir -p ws/.dsh-company/startup.json
writeStartupSettings(ws, …)
→ THREW Error: EISDIR: illegal operation on a directory,
  rename '…/startup.json.<pid>.<time>.tmp' -> '…/startup.json'
```

`/company-settings set` / `reset` 生产路径会 `writeStartupSettings` → `writeAtomic`，没有 try/catch；命令异常结束，用户拿不到「startup.json 是目录，先修复」的回执。`refreshOptions` 紧随其后，`startup-options.json` 是目录时同样 EISDIR（settings 命令抛；watcher 只 warn）。

同族 BUG-132（catalog 输出目录）已记；本卡是 startup 设置输出。

## 根因（假设）

- `writeAtomic` 只做 temp+rename，不检查目标形状；`rename` 不能覆盖目录。
- `writeStartupSettings` / `writeStartupOptionsFile` 不 catch；`settings-command` handler 没有结构化错误包装。
- 没有像 catalog 那样对「输出路径是目录/symlink」的统一判据；`startup-options` 的 watcher 有 catch，但命令没有。

## 暴露的失败类

**派生/设置写入不检查自己的目标形状**：输入校验、坏文件读取都做了，输出被目录占用时仍抛 EISDIR。写设置前应 lstat 目标：目录/非普通文件 → 可读错误（或改名坏形状再写），不能裸抛。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-startup-dir-write.mts
```

2026-11-13 输出：

```
THREW Error: EISDIR: illegal operation on a directory, rename '…tmp' -> '…/startup.json'
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `writeAtomic` 先 `lstat(path)`：缺失/普通文件 → 正常；symlink → rename 替换（当前语义）或拒绝；目录/其它 → 抛 typed error 或返回 false + problem。
- `settings-command` 包 try/catch：`startup.json`/`options` 坏形状 → `{kind:'error', text:'startup.json 被目录占用…'}`；`refreshOptions` 失败单独 warning，不回滚已写 settings。
- `startup-options` 由 watcher 写时继续 catch warning；命令面要可读。
- 加 spec：startup.json 目录、options 目录、symlink、普通文件；set/reset 回执。

## 修复关联

- 发现于 C3 startup 输出坏形状；与 [BUG-132](BUG-132-catalog-index-path-directory-eisdir.md)（catalog 输出目录）同族，但本卡是设置/派生文件。
- 相关：`src/host/startup/startup-store.ts` 的 `writeAtomic`；`settings-command.ts` 的 set/reset。

## 已修判定

修成：`writeStartupSettings/Options` 走 `writeCompanyAtomic`，目标被目录占用 → typed error；settings 命令捕获为可读 error，不再 EISDIR 冒泡。
- keyless：startup.json 是目录 → `set` 返回 error 含「目录占用」；红证：HEAD startup-store → 2 failed。
